-- +goose Up
-- Base prices of the project types (internal/pricing): kept here, in
-- immutable versions, and changed by administrators in /manager/pricing.
-- Scale tiers, modules, coefficients and rounding stay in the Go catalog.
-- A change is a new version, never an edit: estimates keep pointing at the
-- version they were calculated with. Individual-only types ("other") have
-- no price and no row.
CREATE TABLE project_type_prices (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_type     TEXT NOT NULL, -- a Go catalog project type
    version          INTEGER NOT NULL,
    base_price_tenge BIGINT NOT NULL,
    change_reason    TEXT NOT NULL DEFAULT '',
    is_current       BOOLEAN NOT NULL DEFAULT FALSE,
    created_by       UUID REFERENCES staff_users(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT project_type_prices_unique UNIQUE (project_type, version),
    CONSTRAINT project_type_prices_type_check CHECK (project_type ~ '^[a-z][a-z0-9-]{1,40}$'),
    CONSTRAINT project_type_prices_version_check CHECK (version > 0),
    CONSTRAINT project_type_prices_price_check CHECK (base_price_tenge > 0 AND base_price_tenge <= 100000000),
    CONSTRAINT project_type_prices_reason_check CHECK (char_length(change_reason) <= 500)
);
CREATE UNIQUE INDEX project_type_prices_one_current ON project_type_prices (project_type) WHERE is_current;

-- The prices in force until now (the Go catalog's), unchanged: version 1.
INSERT INTO project_type_prices (project_type, version, base_price_tenge, is_current) VALUES
    ('landing',       1, 120000, TRUE),
    ('business-card', 1, 180000, TRUE),
    ('corporate',     1, 300000, TRUE),
    ('catalog',       1, 400000, TRUE),
    ('online-store',  1, 500000, TRUE),
    ('web-app',       1, 700000, TRUE),
    ('crm',           1, 800000, TRUE),
    ('mobile-app',    1, 900000, TRUE),
    ('ai-solution',   1, 500000, TRUE),
    ('backend-api',   1, 450000, TRUE),
    ('devops-vps',    1, 150000, TRUE);

-- The base price version an estimate was calculated with (individual
-- estimates of priced types; NULL for older estimates, tariffs and
-- individual-only types). Nullable without a default: no table rewrite.
ALTER TABLE project_estimates
    ADD COLUMN base_price_version_id UUID REFERENCES project_type_prices(id) ON DELETE RESTRICT;
CREATE INDEX idx_project_estimates_base_price_version ON project_estimates (base_price_version_id)
    WHERE base_price_version_id IS NOT NULL;

-- Base price changes join the pricing audit log.
ALTER TABLE pricing_audit_log DROP CONSTRAINT pricing_audit_log_entity_check;
ALTER TABLE pricing_audit_log ADD CONSTRAINT pricing_audit_log_entity_check
    CHECK (entity IN ('tariff', 'tariff_version', 'tariff_cost', 'promotion', 'base_price'));

-- +goose Down
DELETE FROM pricing_audit_log WHERE entity = 'base_price';
ALTER TABLE pricing_audit_log DROP CONSTRAINT pricing_audit_log_entity_check;
ALTER TABLE pricing_audit_log ADD CONSTRAINT pricing_audit_log_entity_check
    CHECK (entity IN ('tariff', 'tariff_version', 'tariff_cost', 'promotion'));
DROP INDEX idx_project_estimates_base_price_version;
ALTER TABLE project_estimates DROP COLUMN base_price_version_id;
DROP TABLE project_type_prices;
