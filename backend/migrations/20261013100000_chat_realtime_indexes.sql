-- +goose Up
-- Indexes for the realtime chat. Every event and every reconnect re-reads
-- unread counters and the inbox, so the queries behind them should not scan
-- whole conversations. Data is not touched.

-- Unread for managers: visitor messages after manager_last_read_id
-- (per conversation and the global total).
CREATE INDEX idx_chat_messages_unread_for_manager
    ON chat_messages (conversation_id, id)
    WHERE author = 'visitor';

-- Unread for the visitor: manager/system messages after visitor_last_read_id.
CREATE INDEX idx_chat_messages_unread_for_visitor
    ON chat_messages (conversation_id, id)
    WHERE author <> 'visitor';

-- Inbox with the "all" filter, ordered by (last_message_at, id) — the
-- existing (status, last_message_at) index serves the open/closed filters.
CREATE INDEX idx_chat_conversations_inbox_all
    ON chat_conversations (last_message_at DESC, id DESC)
    WHERE last_message_at IS NOT NULL;

-- +goose Down
DROP INDEX IF EXISTS idx_chat_conversations_inbox_all;
DROP INDEX IF EXISTS idx_chat_messages_unread_for_visitor;
DROP INDEX IF EXISTS idx_chat_messages_unread_for_manager;
