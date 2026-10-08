-- +goose Up
-- Visitor ↔ manager chat. A visitor is anonymous: they are identified only
-- by a random token kept in an HttpOnly cookie, and only its SHA-256 hash is
-- stored here, so a database leak never exposes a usable cookie value.
--
-- A conversation is created by POST /api/v1/chat/session before the first
-- message, so a lost response to a message can be retried within the same
-- conversation. Until the first message, last_message_at is NULL; such empty
-- conversations are not shown to managers.
CREATE TABLE chat_conversations (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visitor_token_hash    BYTEA NOT NULL,
    visitor_name          TEXT,
    visitor_contact       TEXT,
    status                TEXT NOT NULL DEFAULT 'open',
    visitor_last_read_id  BIGINT NOT NULL DEFAULT 0,
    manager_last_read_id  BIGINT NOT NULL DEFAULT 0,
    page_url              TEXT,
    user_agent            TEXT,
    last_message_at       TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chat_conversations_token_hash_unique UNIQUE (visitor_token_hash),
    CONSTRAINT chat_conversations_token_hash_length_check
        CHECK (octet_length(visitor_token_hash) = 32),
    CONSTRAINT chat_conversations_status_check
        CHECK (status IN ('open','closed')),
    CONSTRAINT chat_conversations_last_read_check
        CHECK (visitor_last_read_id >= 0 AND manager_last_read_id >= 0),
    CONSTRAINT chat_conversations_visitor_name_length_check
        CHECK (visitor_name IS NULL OR char_length(visitor_name) <= 100),
    CONSTRAINT chat_conversations_visitor_contact_length_check
        CHECK (visitor_contact IS NULL OR char_length(visitor_contact) <= 200),
    CONSTRAINT chat_conversations_page_url_length_check
        CHECK (page_url IS NULL OR char_length(page_url) <= 500),
    CONSTRAINT chat_conversations_user_agent_length_check
        CHECK (user_agent IS NULL OR char_length(user_agent) <= 500)
);

-- Manager inbox: open conversations, most recently active first.
CREATE INDEX idx_chat_conversations_status_last_message
    ON chat_conversations (status, last_message_at DESC);

-- id is a monotonically increasing BIGINT so clients can poll with
-- ?after=<last seen id> and unread counts reduce to "id > last_read_id".
CREATE TABLE chat_messages (
    id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    conversation_id    UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    author             TEXT NOT NULL,
    -- References staff_users(id); the foreign key is added together with the
    -- staff_users table in the manager-authentication migration.
    staff_user_id      UUID,
    client_message_id  UUID NOT NULL DEFAULT gen_random_uuid(),
    body               TEXT NOT NULL,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- A retried send with the same client_message_id never creates a duplicate.
    CONSTRAINT chat_messages_client_message_unique UNIQUE (conversation_id, client_message_id),
    CONSTRAINT chat_messages_author_check
        CHECK (author IN ('visitor','manager','system')),
    CONSTRAINT chat_messages_staff_author_check
        CHECK (staff_user_id IS NULL OR author = 'manager'),
    CONSTRAINT chat_messages_body_length_check
        CHECK (char_length(btrim(body)) BETWEEN 1 AND 2000)
);

CREATE INDEX idx_chat_messages_conversation_id
    ON chat_messages (conversation_id, id);

-- +goose Down
DROP TABLE IF EXISTS chat_messages;
DROP TABLE IF EXISTS chat_conversations;
