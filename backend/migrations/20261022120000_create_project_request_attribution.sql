-- +goose Up
-- Where a project request came from, kept with the request for as long as
-- the request itself (the visit analytics are deleted after
-- ANALYTICS_RETENTION_DAYS, this summary is not). One row per request,
-- written in the same transaction as the request, and only when the
-- browser had consented to analytics (the form sends nothing otherwise).
-- Earlier requests and requests without consent have no row: their source
-- is unknown and is never filled in afterwards.
--
-- Only paths (no query strings), host names and UTM values are stored —
-- no full URLs, no IP address, no contacts, no ad click id values (only
-- which kind of click id was present). The values were reported by the
-- browser; channel and source are derived by the backend
-- (internal/attribution), never taken from the client.
CREATE TABLE project_request_attribution (
    project_request_id  UUID PRIMARY KEY REFERENCES project_requests(id) ON DELETE CASCADE,
    channel             TEXT NOT NULL,
    source              TEXT NOT NULL,   -- utm_source, search engine / network name, referring host, (direct), (unknown)
    source_page         TEXT,            -- page the form was sent from
    previous_page       TEXT,            -- page viewed right before it (e.g. a service page before /contact)
    landing_page        TEXT,            -- first page of the visit
    referrer_host       TEXT,
    utm_source          TEXT,
    utm_medium          TEXT,
    utm_campaign        TEXT,
    utm_content         TEXT,
    utm_term            TEXT,
    click_id_type       TEXT,            -- gclid / gbraid / wbraid: present, value not kept
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT project_request_attribution_channel_check CHECK (channel IN (
        'organic_search', 'paid_search', 'social', 'paid_social', 'referral',
        'direct', 'email', 'other', 'unknown'
    )),
    CONSTRAINT project_request_attribution_click_id_check
        CHECK (click_id_type IS NULL OR click_id_type IN ('gclid', 'gbraid', 'wbraid')),
    CONSTRAINT project_request_attribution_lengths_check CHECK (
        char_length(source) <= 253
        AND (source_page IS NULL OR char_length(source_page) <= 300)
        AND (previous_page IS NULL OR char_length(previous_page) <= 300)
        AND (landing_page IS NULL OR char_length(landing_page) <= 300)
        AND (referrer_host IS NULL OR char_length(referrer_host) <= 253)
        AND (utm_source IS NULL OR char_length(utm_source) <= 100)
        AND (utm_medium IS NULL OR char_length(utm_medium) <= 100)
        AND (utm_campaign IS NULL OR char_length(utm_campaign) <= 100)
        AND (utm_content IS NULL OR char_length(utm_content) <= 100)
        AND (utm_term IS NULL OR char_length(utm_term) <= 100)
    )
);

-- Report filters; the period itself is filtered on project_requests.created_at.
CREATE INDEX idx_project_request_attribution_channel ON project_request_attribution (channel);
CREATE INDEX idx_project_request_attribution_source_page ON project_request_attribution (source_page);

-- +goose Down
-- Rolling back deletes the stored request sources (the requests stay).
DROP TABLE IF EXISTS project_request_attribution;
