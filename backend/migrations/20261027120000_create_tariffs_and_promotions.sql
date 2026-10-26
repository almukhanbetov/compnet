-- +goose Up
-- Tariffs: fixed-scope packages sold next to the individual calculator,
-- whose rules stay in the Go catalog (internal/pricing). A tariff's price is
-- kept here, in immutable versions; extra modules are priced from the Go
-- catalog. Everything starts inactive: nothing is shown or sold until an
-- administrator activates it.
CREATE TABLE tariffs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug        TEXT NOT NULL UNIQUE,
    title       TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    sort_order  INTEGER NOT NULL DEFAULT 0,
    is_active   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT tariffs_slug_check CHECK (slug ~ '^[a-z][a-z0-9-]{1,40}$'),
    CONSTRAINT tariffs_title_check CHECK (char_length(title) BETWEEN 1 AND 100),
    CONSTRAINT tariffs_description_check CHECK (char_length(description) <= 1000)
);

-- A price change is a new version, never an edit: a request keeps pointing
-- at the version it was quoted with, and the versions are the price history.
-- project_type is a Go catalog project type (reports, estimate labels).
CREATE TABLE tariff_versions (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tariff_id          UUID NOT NULL REFERENCES tariffs(id) ON DELETE RESTRICT,
    version            INTEGER NOT NULL,
    price_tenge        BIGINT NOT NULL,
    price_kind         TEXT NOT NULL,
    project_type       TEXT NOT NULL,
    features           TEXT[] NOT NULL DEFAULT '{}',
    allowed_module_ids TEXT[] NOT NULL DEFAULT '{}',
    duration_label     TEXT NOT NULL,
    is_current         BOOLEAN NOT NULL DEFAULT FALSE,
    created_by         UUID REFERENCES staff_users(id) ON DELETE SET NULL,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT tariff_versions_unique UNIQUE (tariff_id, version),
    CONSTRAINT tariff_versions_version_check CHECK (version > 0),
    CONSTRAINT tariff_versions_price_check CHECK (price_tenge > 0),
    -- fixed: the price; from: the lower bound, the final price follows the brief.
    CONSTRAINT tariff_versions_kind_check CHECK (price_kind IN ('fixed', 'from')),
    CONSTRAINT tariff_versions_features_check CHECK (cardinality(features) <= 20),
    CONSTRAINT tariff_versions_modules_check CHECK (cardinality(allowed_module_ids) <= 50)
);
CREATE UNIQUE INDEX tariff_versions_one_current ON tariff_versions (tariff_id) WHERE is_current;

-- Internal cost of a version, for the margin check. A separate table that no
-- public query reads; administrators only.
CREATE TABLE tariff_version_costs (
    tariff_version_id UUID PRIMARY KEY REFERENCES tariff_versions(id) ON DELETE CASCADE,
    cost_tenge        BIGINT NOT NULL,
    updated_by        UUID REFERENCES staff_users(id) ON DELETE SET NULL,
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT tariff_version_costs_check CHECK (cost_tenge >= 0)
);

-- A discount on a tariff's price for a period and a number of orders. Only
-- an active promotion with both dates, inside its period, applies.
CREATE TABLE promotions (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug           TEXT NOT NULL UNIQUE,
    title          TEXT NOT NULL,
    tariff_id      UUID NOT NULL REFERENCES tariffs(id) ON DELETE RESTRICT,
    discount_tenge BIGINT NOT NULL,
    starts_at      TIMESTAMPTZ,
    ends_at        TIMESTAMPTZ,
    max_orders     INTEGER NOT NULL,
    is_active      BOOLEAN NOT NULL DEFAULT FALSE,
    version        INTEGER NOT NULL DEFAULT 1, -- raised on every change
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT promotions_slug_check CHECK (slug ~ '^[a-z][a-z0-9-]{1,40}$'),
    CONSTRAINT promotions_title_check CHECK (char_length(title) BETWEEN 1 AND 100),
    CONSTRAINT promotions_discount_check CHECK (discount_tenge > 0),
    CONSTRAINT promotions_max_orders_check CHECK (max_orders > 0),
    CONSTRAINT promotions_period_check CHECK (starts_at IS NULL OR ends_at IS NULL OR ends_at > starts_at),
    CONSTRAINT promotions_active_dates_check CHECK (NOT is_active OR (starts_at IS NOT NULL AND ends_at IS NOT NULL))
);
-- At most one active promotion per tariff: the discount is never ambiguous.
CREATE UNIQUE INDEX promotions_one_active ON promotions (tariff_id) WHERE is_active;

-- A promotional place held by a request. reserved: taken when the request is
-- saved; confirmed: the manager took the order into work; released: the
-- request was rejected or archived, or stayed unconfirmed past the deadline.
-- Taken places (reserved + confirmed) never exceed max_orders: they are
-- counted under a lock on the promotion row.
CREATE TABLE promotion_reservations (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promotion_id       UUID NOT NULL REFERENCES promotions(id) ON DELETE RESTRICT,
    project_request_id UUID NOT NULL UNIQUE REFERENCES project_requests(id) ON DELETE CASCADE,
    status             TEXT NOT NULL DEFAULT 'reserved',
    release_reason     TEXT,
    reserved_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    confirmed_at       TIMESTAMPTZ,
    released_at        TIMESTAMPTZ,

    CONSTRAINT promotion_reservations_status_check CHECK (status IN ('reserved', 'confirmed', 'released')),
    CONSTRAINT promotion_reservations_reason_check CHECK (release_reason IS NULL OR release_reason IN ('rejected', 'archived', 'expired')),
    CONSTRAINT promotion_reservations_released_check CHECK ((status = 'released') = (released_at IS NOT NULL AND release_reason IS NOT NULL))
);
CREATE INDEX promotion_reservations_taken ON promotion_reservations (promotion_id, status) WHERE status <> 'released';

-- The tariff terms a request was saved with, as the server priced them.
-- No contacts. final = base - discount + modules.
CREATE TABLE project_request_tariffs (
    project_request_id    UUID PRIMARY KEY REFERENCES project_requests(id) ON DELETE CASCADE,
    tariff_id             UUID NOT NULL REFERENCES tariffs(id) ON DELETE RESTRICT,
    tariff_version_id     UUID NOT NULL REFERENCES tariff_versions(id) ON DELETE RESTRICT,
    tariff_slug           TEXT NOT NULL,
    tariff_version        INTEGER NOT NULL,
    price_kind            TEXT NOT NULL,
    base_price_tenge      BIGINT NOT NULL,
    discount_tenge        BIGINT NOT NULL DEFAULT 0,
    promotion_id          UUID REFERENCES promotions(id) ON DELETE RESTRICT,
    promotion_version     INTEGER,
    modules_total_tenge   BIGINT NOT NULL DEFAULT 0,
    final_price_tenge     BIGINT NOT NULL,
    pricing_rules_version TEXT NOT NULL, -- Go catalog version of the module prices
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT project_request_tariffs_amounts_check CHECK (
        base_price_tenge > 0 AND discount_tenge >= 0 AND modules_total_tenge >= 0
        AND final_price_tenge = base_price_tenge - discount_tenge + modules_total_tenge),
    CONSTRAINT project_request_tariffs_promotion_check CHECK (
        (promotion_id IS NULL) = (discount_tenge = 0) AND (promotion_id IS NULL) = (promotion_version IS NULL))
);
CREATE INDEX idx_project_request_tariffs_slug ON project_request_tariffs (tariff_slug);

-- Who changed which price and when (tariffs, versions, costs, promotions).
CREATE TABLE pricing_audit_log (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_user_id UUID REFERENCES staff_users(id) ON DELETE SET NULL,
    entity        TEXT NOT NULL,
    entity_id     UUID NOT NULL,
    action        TEXT NOT NULL,
    details       JSONB NOT NULL DEFAULT '{}',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT pricing_audit_log_entity_check CHECK (entity IN ('tariff', 'tariff_version', 'tariff_cost', 'promotion'))
);
CREATE INDEX idx_pricing_audit_log_entity ON pricing_audit_log (entity, entity_id, created_at DESC);

-- Drafts of the proposed tariffs and the launch promotion, all inactive and
-- the promotion without dates: activation needs approved prices, contents,
-- dates and costs. Extra modules and project types are drafts as well.
INSERT INTO tariffs (slug, title, description, sort_order) VALUES
    ('start', 'Старт', 'Одностраничный сайт по готовому шаблону для быстрого запуска.', 10),
    ('business', 'Бизнес', 'Небольшой сайт компании: до 5 страниц, форма заявки и базовая SEO-подготовка.', 20),
    ('pro', 'PRO', 'Сайт с индивидуальным дизайном и расширенным функционалом.', 30);

INSERT INTO tariff_versions (tariff_id, version, price_tenge, price_kind, project_type, features, allowed_module_ids, duration_label, is_current)
SELECT t.id, 1, v.price, v.kind, v.project_type, v.features, v.modules, v.duration, TRUE
FROM tariffs t JOIN (VALUES
    ('start', 59000::bigint, 'fixed', 'landing',
     ARRAY['Одностраничный сайт по готовому шаблону', 'Адаптивный дизайн', 'Кнопка WhatsApp', 'До 2 раундов правок', 'Дополнительные услуги оплачиваются отдельно'],
     ARRAY[]::text[], '1–2 недели'),
    ('business', 99000::bigint, 'fixed', 'business-card',
     ARRAY['До 5 страниц', 'Адаптивный дизайн', 'Форма заявки', 'Базовая SEO-подготовка', 'Дополнительные интеграции оплачиваются отдельно'],
     ARRAY['crm-integration', 'erp-integration', 'external-api'], '1–2 недели'),
    ('pro', 199000::bigint, 'from', 'corporate',
     ARRAY['Индивидуальный дизайн', 'Расширенный функционал', 'Подключение модулей и интеграций', 'Финальная стоимость — по выбранному составу и ТЗ'],
     ARRAY['auth', 'roles', 'cabinet', 'admin-panel', 'online-payment', 'search-filters', 'notifications', 'file-upload', 'maps-geo',
           'chat', 'realtime', 'crm-integration', 'erp-integration', 'external-api', 'ai-chatbot', 'rag-ai', 'analytics-dashboard'],
     '3–5 недель')
) AS v(slug, price, kind, project_type, features, modules, duration) ON v.slug = t.slug;

INSERT INTO promotions (slug, title, tariff_id, discount_tenge, max_orders)
SELECT 'start-launch', 'Старт по акции', id, 10000, 10 FROM tariffs WHERE slug = 'start';

-- +goose Down
-- Removes the tariffs and promotions with their history; requests stay
-- (their tariff terms are dropped with project_request_tariffs).
DROP TABLE pricing_audit_log;
DROP TABLE project_request_tariffs;
DROP TABLE promotion_reservations;
DROP TABLE promotions;
DROP TABLE tariff_version_costs;
DROP TABLE tariff_versions;
DROP TABLE tariffs;
