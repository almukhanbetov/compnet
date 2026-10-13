-- +goose Up
-- Request handling in the manager section: a readable number, the working
-- statuses, an internal note and the history of status changes. Existing
-- requests are kept as they are; nothing is deleted.

-- Readable request number ("№ 17"). Existing rows are numbered in the order
-- they were received; new rows take the next value of the sequence.
ALTER TABLE project_requests ADD COLUMN number BIGINT;

UPDATE project_requests p
SET number = n.rn
FROM (SELECT id, row_number() OVER (ORDER BY created_at, id) AS rn FROM project_requests) n
WHERE p.id = n.id;

CREATE SEQUENCE project_requests_number_seq OWNED BY project_requests.number;
SELECT setval('project_requests_number_seq', COALESCE((SELECT max(number) FROM project_requests), 0) + 1, false);

ALTER TABLE project_requests
    ALTER COLUMN number SET DEFAULT nextval('project_requests_number_seq'),
    ALTER COLUMN number SET NOT NULL,
    ADD CONSTRAINT project_requests_number_unique UNIQUE (number);

-- Working statuses. 'new' and 'rejected' already existed; 'in_progress' and
-- 'completed' are added. The earlier values stay valid so rows that may
-- carry them are not touched; the manager UI shows them with their own
-- labels but only offers the four working statuses.
ALTER TABLE project_requests DROP CONSTRAINT project_requests_status_check;
ALTER TABLE project_requests ADD CONSTRAINT project_requests_status_check
    CHECK (status IN ('new', 'in_progress', 'completed', 'rejected',
                      'contacted', 'qualified', 'proposal_sent', 'accepted', 'archived'));

-- The manager's internal note: never shown to the client, never sent to
-- analytics. Who wrote it last and when.
ALTER TABLE project_requests
    ADD COLUMN manager_note TEXT,
    ADD COLUMN manager_note_updated_at TIMESTAMPTZ,
    ADD COLUMN manager_note_updated_by UUID REFERENCES staff_users(id) ON DELETE RESTRICT,
    ADD CONSTRAINT project_requests_manager_note_length_check
        CHECK (manager_note IS NULL OR char_length(manager_note) <= 4000);

-- Who changed a status, when, from what to what. Staff accounts are
-- deactivated, never deleted, so the author is kept (RESTRICT).
CREATE TABLE project_request_status_changes (
    id                  BIGSERIAL PRIMARY KEY,
    project_request_id  UUID NOT NULL REFERENCES project_requests(id) ON DELETE CASCADE,
    old_status          TEXT NOT NULL,
    new_status          TEXT NOT NULL,
    staff_user_id       UUID NOT NULL REFERENCES staff_users(id) ON DELETE RESTRICT,
    changed_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT project_request_status_changes_differs_check CHECK (old_status <> new_status)
);

CREATE INDEX idx_project_request_status_changes_request
    ON project_request_status_changes (project_request_id, changed_at);

-- +goose Down
-- Rolling back drops the notes and the status history, and maps the two
-- new statuses to the closest earlier ones so the old CHECK can be restored.
DROP TABLE IF EXISTS project_request_status_changes;
ALTER TABLE project_requests
    DROP CONSTRAINT IF EXISTS project_requests_manager_note_length_check,
    DROP COLUMN IF EXISTS manager_note_updated_by,
    DROP COLUMN IF EXISTS manager_note_updated_at,
    DROP COLUMN IF EXISTS manager_note;
UPDATE project_requests SET status = 'contacted' WHERE status = 'in_progress';
UPDATE project_requests SET status = 'accepted' WHERE status = 'completed';
ALTER TABLE project_requests DROP CONSTRAINT project_requests_status_check;
ALTER TABLE project_requests ADD CONSTRAINT project_requests_status_check
    CHECK (status IN ('new','contacted','qualified','proposal_sent','accepted','rejected','archived'));
ALTER TABLE project_requests DROP CONSTRAINT IF EXISTS project_requests_number_unique;
ALTER TABLE project_requests DROP COLUMN IF EXISTS number;
