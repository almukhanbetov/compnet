-- +goose Up
CREATE TABLE project_requests (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name              TEXT NOT NULL,
    phone             TEXT,
    email             TEXT,
    company           TEXT,
    project_type      TEXT NOT NULL,
    description       TEXT NOT NULL,
    budget_range      TEXT,
    desired_timeline  TEXT,
    contact_method    TEXT NOT NULL,
    consent           BOOLEAN NOT NULL DEFAULT FALSE,
    status            TEXT NOT NULL DEFAULT 'new',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT project_requests_status_check
        CHECK (status IN ('new','contacted','qualified','proposal_sent','accepted','rejected','archived')),
    CONSTRAINT project_requests_contact_method_check
        CHECK (contact_method IN ('phone','whatsapp','telegram','email')),
    CONSTRAINT project_requests_consent_check
        CHECK (consent = TRUE),
    CONSTRAINT project_requests_contact_present_check
        CHECK (phone IS NOT NULL OR email IS NOT NULL)
);

CREATE INDEX idx_project_requests_status ON project_requests (status);
CREATE INDEX idx_project_requests_created_at ON project_requests (created_at DESC);
CREATE INDEX idx_project_requests_project_type ON project_requests (project_type);

CREATE TABLE project_request_features (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_request_id  UUID NOT NULL REFERENCES project_requests(id) ON DELETE CASCADE,
    module_id            TEXT NOT NULL,
    quantity              INTEGER NOT NULL DEFAULT 1,
    unit_price_tenge      BIGINT NOT NULL,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT project_request_features_unique UNIQUE (project_request_id, module_id),
    CONSTRAINT project_request_features_quantity_check CHECK (quantity > 0)
);

CREATE INDEX idx_project_request_features_request_id
    ON project_request_features (project_request_id);

CREATE TABLE project_estimates (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_request_id   UUID NOT NULL REFERENCES project_requests(id) ON DELETE CASCADE,
    pricing_version        TEXT NOT NULL,
    is_individual            BOOLEAN NOT NULL DEFAULT FALSE,
    minimum_tenge              BIGINT,
    maximum_tenge                BIGINT,
    duration_label                TEXT NOT NULL,
    breakdown                       JSONB NOT NULL,
    created_at                        TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT project_estimates_bounds_check
        CHECK (minimum_tenge IS NULL OR maximum_tenge IS NULL OR maximum_tenge >= minimum_tenge)
);

CREATE INDEX idx_project_estimates_request_id ON project_estimates (project_request_id);

-- +goose Down
DROP TABLE IF EXISTS project_estimates;
DROP TABLE IF EXISTS project_request_features;
DROP TABLE IF EXISTS project_requests;
