-- +goose Up
-- Staff accounts for the manager section. There is no public registration:
-- accounts are created with `api create-staff`. Access is granted to the
-- roles the application allows (manager, admin); the column itself accepts
-- other lowercase role names so future roles need no schema change and are
-- denied by default.
CREATE TABLE staff_users (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email          TEXT NOT NULL,
    password_hash  TEXT NOT NULL,
    display_name   TEXT NOT NULL,
    role           TEXT NOT NULL,
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT staff_users_email_unique UNIQUE (email),
    CONSTRAINT staff_users_email_format_check
        CHECK (email = lower(btrim(email)) AND char_length(email) BETWEEN 3 AND 254 AND position('@' IN email) > 1),
    CONSTRAINT staff_users_display_name_check
        CHECK (char_length(btrim(display_name)) BETWEEN 1 AND 100),
    CONSTRAINT staff_users_role_format_check
        CHECK (role ~ '^[a-z_]{1,32}$'),
    CONSTRAINT staff_users_password_hash_check
        CHECK (char_length(password_hash) >= 50)
);

-- Server-side sessions. Only the SHA-256 of the cookie token is stored.
-- A session is valid while revoked_at IS NULL and expires_at > now(); the
-- owner's is_active flag is re-checked on every request.
CREATE TABLE staff_sessions (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash     BYTEA NOT NULL,
    staff_user_id  UUID NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
    expires_at     TIMESTAMPTZ NOT NULL,
    revoked_at     TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT staff_sessions_token_hash_unique UNIQUE (token_hash),
    CONSTRAINT staff_sessions_token_hash_length_check
        CHECK (octet_length(token_hash) = 32),
    CONSTRAINT staff_sessions_expiry_check
        CHECK (expires_at > created_at)
);

CREATE INDEX idx_staff_sessions_staff_user_id ON staff_sessions (staff_user_id);

-- Link manager messages to their author. Staff accounts are deactivated,
-- never deleted, once they have written messages (RESTRICT keeps history).
-- Until now no code path wrote staff_user_id, so every existing value is
-- NULL; the FK is validated against existing rows and would fail loudly
-- otherwise rather than silently dropping data.
ALTER TABLE chat_messages
    ADD CONSTRAINT chat_messages_staff_user_fk
    FOREIGN KEY (staff_user_id) REFERENCES staff_users(id) ON DELETE RESTRICT;

-- From now on a manager message must name its author. NOT VALID: rows
-- written before this migration (manager messages without an author, e.g.
-- inserted by hand while testing stage 1–2) are left as they are; new and
-- updated rows are checked.
ALTER TABLE chat_messages
    ADD CONSTRAINT chat_messages_manager_author_check
    CHECK (author <> 'manager' OR staff_user_id IS NOT NULL) NOT VALID;

CREATE INDEX idx_chat_messages_staff_user_id
    ON chat_messages (staff_user_id) WHERE staff_user_id IS NOT NULL;

-- +goose Down
-- Rolling back drops staff accounts, so manager messages lose their author
-- link (the messages themselves are kept). Without this, a later Up would
-- fail validating the FK against ids that no longer exist.
DROP INDEX IF EXISTS idx_chat_messages_staff_user_id;
ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_manager_author_check;
ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_staff_user_fk;
UPDATE chat_messages SET staff_user_id = NULL WHERE staff_user_id IS NOT NULL;
DROP TABLE IF EXISTS staff_sessions;
DROP TABLE IF EXISTS staff_users;
