-- +goose Up
-- First-party visit analytics. Only browsers whose user accepted analytics
-- send anything; identifiers are random UUIDs kept in that browser
-- (localStorage), never derived from the device ("visitors" are browsers,
-- not people). No IP address, no form content, no chat text, no contacts
-- are stored here. Rows older than ANALYTICS_RETENTION_DAYS (default 90)
-- are deleted by the backend's cleanup task.

CREATE TABLE analytics_sessions (
    id              UUID PRIMARY KEY,          -- random, created by the browser
    visitor_id      UUID NOT NULL,             -- random, created by the browser
    started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    landing_path    TEXT NOT NULL,
    -- Source of this session: utm_source, else the referrer's site, else
    -- "(direct)". first_* is the visitor's first known source, never
    -- overwritten by later (direct) visits.
    source          TEXT NOT NULL,
    medium          TEXT NOT NULL,
    campaign        TEXT,
    term            TEXT,
    content         TEXT,
    referrer_host   TEXT,
    first_source    TEXT NOT NULL,
    first_medium    TEXT NOT NULL,
    first_campaign  TEXT,
    device          TEXT NOT NULL,
    language        TEXT,
    event_count     INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT analytics_sessions_device_check CHECK (device IN ('desktop', 'mobile', 'tablet')),
    CONSTRAINT analytics_sessions_language_check CHECK (language IS NULL OR language IN ('ru', 'kk', 'en')),
    CONSTRAINT analytics_sessions_lengths_check CHECK (
        char_length(landing_path) <= 300
        AND char_length(source) <= 100 AND char_length(medium) <= 100
        AND char_length(first_source) <= 100 AND char_length(first_medium) <= 100
        AND (campaign IS NULL OR char_length(campaign) <= 100)
        AND (first_campaign IS NULL OR char_length(first_campaign) <= 100)
        AND (term IS NULL OR char_length(term) <= 100)
        AND (content IS NULL OR char_length(content) <= 100)
        AND (referrer_host IS NULL OR char_length(referrer_host) <= 253)
    ),
    CONSTRAINT analytics_sessions_event_count_check CHECK (event_count >= 0)
);

CREATE INDEX idx_analytics_sessions_started_at ON analytics_sessions (started_at);
CREATE INDEX idx_analytics_sessions_source ON analytics_sessions (source, medium, started_at);
CREATE INDEX idx_analytics_sessions_visitor ON analytics_sessions (visitor_id);
CREATE INDEX idx_analytics_sessions_last_seen ON analytics_sessions (last_seen_at);

CREATE TABLE analytics_events (
    id                  UUID PRIMARY KEY,      -- event_id from the browser (dedup) or generated
    session_id          UUID NOT NULL REFERENCES analytics_sessions(id) ON DELETE CASCADE,
    visitor_id          UUID NOT NULL,
    type                TEXT NOT NULL,
    occurred_at         TIMESTAMPTZ NOT NULL DEFAULT now(),  -- server time, UTC
    path                TEXT NOT NULL DEFAULT '',
    -- Set only by the backend, after the request / first message was saved.
    project_request_id  UUID REFERENCES project_requests(id) ON DELETE SET NULL,
    conversation_id     UUID REFERENCES chat_conversations(id) ON DELETE SET NULL,

    CONSTRAINT analytics_events_type_check CHECK (type IN (
        'page_view', 'promo_view', 'promo_click', 'whatsapp_click', 'phone_click',
        'chat_open', 'chat_first_message', 'lead_submit'
    )),
    CONSTRAINT analytics_events_path_check CHECK (char_length(path) <= 300),
    -- Only server-recorded conversions carry links to requests/conversations.
    CONSTRAINT analytics_events_links_check CHECK (
        type IN ('lead_submit', 'chat_first_message')
        OR (project_request_id IS NULL AND conversation_id IS NULL)
    )
);

CREATE INDEX idx_analytics_events_occurred_at ON analytics_events (occurred_at);
CREATE INDEX idx_analytics_events_type ON analytics_events (type, occurred_at);
CREATE INDEX idx_analytics_events_session ON analytics_events (session_id, occurred_at);
-- One conversion event per request and per conversation, whatever retries happen.
CREATE UNIQUE INDEX idx_analytics_events_lead_once
    ON analytics_events (project_request_id) WHERE type = 'lead_submit' AND project_request_id IS NOT NULL;
CREATE UNIQUE INDEX idx_analytics_events_chat_once
    ON analytics_events (conversation_id) WHERE type = 'chat_first_message' AND conversation_id IS NOT NULL;

-- +goose Down
DROP TABLE IF EXISTS analytics_events;
DROP TABLE IF EXISTS analytics_sessions;
