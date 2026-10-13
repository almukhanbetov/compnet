-- +goose Up
-- A request (or first chat message) can be saved before the browser's first
-- event batch has created its analytics session: the tracker sends events
-- every few seconds, a quick visitor submits sooner. Such a conversion waits
-- here and becomes a lead_submit / chat_first_message event as soon as that
-- session arrives. Only the random session id is kept — no contacts. Rows
-- whose session never arrives (consent withdrawn before the flush, bot
-- filtered, analytics off) are deleted by the cleanup task after a day.
CREATE TABLE analytics_pending_conversions (
    id                  BIGSERIAL PRIMARY KEY,
    session_id          UUID NOT NULL,             -- no FK: the session does not exist yet
    type                TEXT NOT NULL,
    project_request_id  UUID REFERENCES project_requests(id) ON DELETE CASCADE,
    conversation_id     UUID REFERENCES chat_conversations(id) ON DELETE CASCADE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),  -- when the conversion happened

    CONSTRAINT analytics_pending_conversions_link_check CHECK (
        (type = 'lead_submit' AND project_request_id IS NOT NULL AND conversation_id IS NULL)
        OR (type = 'chat_first_message' AND conversation_id IS NOT NULL AND project_request_id IS NULL)
    )
);

CREATE INDEX idx_analytics_pending_conversions_session ON analytics_pending_conversions (session_id);
CREATE INDEX idx_analytics_pending_conversions_created_at ON analytics_pending_conversions (created_at);
CREATE UNIQUE INDEX idx_analytics_pending_conversions_request
    ON analytics_pending_conversions (project_request_id) WHERE project_request_id IS NOT NULL;
CREATE UNIQUE INDEX idx_analytics_pending_conversions_conversation
    ON analytics_pending_conversions (conversation_id) WHERE conversation_id IS NOT NULL;

-- +goose Down
-- Conversions still waiting for their session are dropped: those requests
-- and conversations stay, only without an analytics source.
DROP TABLE IF EXISTS analytics_pending_conversions;
