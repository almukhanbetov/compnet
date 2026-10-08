package postgres

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"

	"github.com/almukha/compnet-backend/internal/domain/chat"
)

// Queries for the manager side of the chat. They live on ChatRepository so
// both sides share one implementation of the tables.

const conversationColumns = `
	c.id, c.visitor_name, c.visitor_contact, c.status,
	c.visitor_last_read_id, c.manager_last_read_id,
	c.page_url, c.user_agent,
	c.last_message_at, c.created_at, c.updated_at,
	COALESCE((SELECT max(m.id) FROM chat_messages m WHERE m.conversation_id = c.id), 0),
	(SELECT count(*) FROM chat_messages m
	  WHERE m.conversation_id = c.id AND m.author <> 'visitor' AND m.id > c.visitor_last_read_id),
	(SELECT count(*) FROM chat_messages m
	  WHERE m.conversation_id = c.id AND m.author = 'visitor' AND m.id > c.manager_last_read_id)`

func conversationScanTargets(conv *chat.Conversation, name, contact, pageURL, userAgent **string) []any {
	return []any{
		&conv.ID, name, contact, &conv.Status,
		&conv.VisitorLastReadID, &conv.ManagerLastReadID,
		pageURL, userAgent,
		&conv.LastMessageAt, &conv.CreatedAt, &conv.UpdatedAt,
		&conv.LastMessageID, &conv.UnreadForVisitor, &conv.UnreadForManager,
	}
}

func fillOptional(conv *chat.Conversation, name, contact, pageURL, userAgent *string) {
	conv.VisitorName = derefString(name)
	conv.VisitorContact = derefString(contact)
	conv.PageURL = derefString(pageURL)
	conv.UserAgent = derefString(userAgent)
}

// FindByID returns a conversation by id with both unread counters, or
// chat.ErrNotFound.
func (r *ChatRepository) FindByID(ctx context.Context, id string) (chat.Conversation, error) {
	var (
		conv                              chat.Conversation
		name, contact, pageURL, userAgent *string
	)
	err := r.pool.QueryRow(ctx, `SELECT `+conversationColumns+` FROM chat_conversations c WHERE c.id = $1`, id).
		Scan(conversationScanTargets(&conv, &name, &contact, &pageURL, &userAgent)...)
	if errors.Is(err, pgx.ErrNoRows) {
		return chat.Conversation{}, chat.ErrNotFound
	}
	if err != nil {
		return chat.Conversation{}, err
	}
	fillOptional(&conv, name, contact, pageURL, userAgent)
	return conv, nil
}

// ListInbox returns conversations that have at least one message, newest
// activity first, with their last message. It fetches up to filter.Limit
// rows after filter.After.
func (r *ChatRepository) ListInbox(ctx context.Context, filter chat.InboxFilter) ([]chat.ConversationSummary, error) {
	const query = `
		SELECT ` + conversationColumns + `,
		       lm.id, lm.author, lm.body, lm.created_at
		FROM chat_conversations c
		JOIN LATERAL (
			SELECT m.id, m.author, m.body, m.created_at
			FROM chat_messages m
			WHERE m.conversation_id = c.id
			ORDER BY m.id DESC
			LIMIT 1
		) lm ON TRUE
		WHERE c.last_message_at IS NOT NULL
		  AND ($1 = '' OR c.status = $1)
		  AND ($2::timestamptz IS NULL OR (c.last_message_at, c.id) < ($2::timestamptz, $3::uuid))
		ORDER BY c.last_message_at DESC, c.id DESC
		LIMIT $4`

	var (
		cursorAt any
		cursorID any
	)
	if filter.After != nil {
		cursorAt, cursorID = filter.After.LastMessageAt, filter.After.ID
	}

	rows, err := r.pool.Query(ctx, query, string(filter.Status), cursorAt, cursorID, filter.Limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]chat.ConversationSummary, 0)
	for rows.Next() {
		var (
			item                              chat.ConversationSummary
			last                              chat.Message
			name, contact, pageURL, userAgent *string
		)
		targets := append(conversationScanTargets(&item.Conversation, &name, &contact, &pageURL, &userAgent),
			&last.ID, &last.Author, &last.Body, &last.CreatedAt)
		if err := rows.Scan(targets...); err != nil {
			return nil, err
		}
		fillOptional(&item.Conversation, name, contact, pageURL, userAgent)
		last.ConversationID = item.ID
		item.LastMessage = &last
		items = append(items, item)
	}
	return items, rows.Err()
}

// ListMessagePage returns a window of the conversation's messages, oldest
// first, including manager authors' display names. See chat.MessagePage.
func (r *ChatRepository) ListMessagePage(ctx context.Context, conversationID string, page chat.MessagePage) ([]chat.Message, error) {
	const columns = `
		SELECT m.id, m.conversation_id, m.author, m.staff_user_id, m.client_message_id, m.body, m.created_at,
		       COALESCE(s.display_name, '')
		FROM chat_messages m
		LEFT JOIN staff_users s ON s.id = m.staff_user_id
		WHERE m.conversation_id = $1`

	var (
		query string
		args  = []any{conversationID, page.Limit}
	)
	switch {
	case page.AfterID > 0:
		query = columns + ` AND m.id > $3 ORDER BY m.id ASC LIMIT $2`
		args = append(args, page.AfterID)
	case page.BeforeID > 0:
		query = columns + ` AND m.id < $3 ORDER BY m.id DESC LIMIT $2`
		args = append(args, page.BeforeID)
	default:
		query = columns + ` ORDER BY m.id DESC LIMIT $2`
	}

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]chat.Message, 0)
	for rows.Next() {
		var (
			msg     chat.Message
			staffID *string
		)
		if err := rows.Scan(&msg.ID, &msg.ConversationID, &msg.Author, &staffID, &msg.ClientMessageID, &msg.Body, &msg.CreatedAt, &msg.StaffDisplayName); err != nil {
			return nil, err
		}
		msg.StaffUserID = derefString(staffID)
		items = append(items, msg)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	if page.AfterID <= 0 {
		// Fetched newest-first; return oldest-first like every other page.
		for i, j := 0, len(items)-1; i < j; i, j = i+1, j-1 {
			items[i], items[j] = items[j], items[i]
		}
	}
	return items, nil
}

// MarkManagerRead moves the managers' read marker forward to messageID,
// which must belong to the conversation (otherwise chat.ErrNotFound). It
// never touches the visitor's marker.
func (r *ChatRepository) MarkManagerRead(ctx context.Context, conversationID string, messageID int64) error {
	const query = `
		UPDATE chat_conversations c
		SET manager_last_read_id = GREATEST(c.manager_last_read_id, $2),
		    updated_at = now()
		WHERE c.id = $1
		  AND EXISTS (SELECT 1 FROM chat_messages m
		              WHERE m.id = $2 AND m.conversation_id = $1)`

	tag, err := r.pool.Exec(ctx, query, conversationID, messageID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return chat.ErrNotFound
	}
	return nil
}

// SetStatus opens or closes a conversation.
func (r *ChatRepository) SetStatus(ctx context.Context, conversationID string, status chat.Status) error {
	tag, err := r.pool.Exec(ctx,
		`UPDATE chat_conversations SET status = $2, updated_at = now() WHERE id = $1`,
		conversationID, string(status))
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return chat.ErrNotFound
	}
	return nil
}

// ManagerUnread counts visitor messages the managers have not read, and the
// conversations they are in.
func (r *ChatRepository) ManagerUnread(ctx context.Context) (conversations, messages int, err error) {
	const query = `
		SELECT count(DISTINCT m.conversation_id), count(*)
		FROM chat_messages m
		JOIN chat_conversations c ON c.id = m.conversation_id
		WHERE m.author = 'visitor' AND m.id > c.manager_last_read_id`
	err = r.pool.QueryRow(ctx, query).Scan(&conversations, &messages)
	return conversations, messages, err
}

// AddManagerMessage stores a manager reply atomically with respect to
// closing the conversation. In one transaction it locks the conversation
// row (SELECT ... FOR UPDATE — SetStatus's UPDATE takes the same row lock,
// so the two serialize), then:
//   - returns an existing message with the same client_message_id
//     (created=false), whatever the status, so a retry never duplicates;
//   - refuses with chat.ErrConversationClosed if the conversation is closed;
//   - otherwise inserts the reply. The status is left unchanged: only a
//     visitor message reopens a conversation.
//
// A close that commits first is therefore always seen, and a close that
// arrives during the send waits until the reply is stored.
func (r *ChatRepository) AddManagerMessage(ctx context.Context, conversationID string, msg chat.Message) (chat.Message, bool, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return chat.Message{}, false, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var status chat.Status
	err = tx.QueryRow(ctx, `SELECT status FROM chat_conversations WHERE id = $1 FOR UPDATE`, conversationID).Scan(&status)
	if errors.Is(err, pgx.ErrNoRows) {
		return chat.Message{}, false, chat.ErrNotFound
	}
	if err != nil {
		return chat.Message{}, false, err
	}

	existing, err := findByClientID(ctx, tx, conversationID, msg.ClientMessageID)
	switch {
	case err == nil:
		return existing, false, tx.Commit(ctx)
	case !errors.Is(err, pgx.ErrNoRows):
		return chat.Message{}, false, err
	}

	if status == chat.StatusClosed {
		return chat.Message{}, false, chat.ErrConversationClosed
	}

	const insert = `
		INSERT INTO chat_messages (conversation_id, author, staff_user_id, client_message_id, body)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at`
	msg.ConversationID = conversationID
	err = tx.QueryRow(ctx, insert, conversationID, string(msg.Author), nullableString(msg.StaffUserID), msg.ClientMessageID, msg.Body).
		Scan(&msg.ID, &msg.CreatedAt)
	if err != nil {
		return chat.Message{}, false, err
	}

	if _, err := tx.Exec(ctx,
		`UPDATE chat_conversations SET last_message_at = $2, updated_at = now() WHERE id = $1`,
		conversationID, msg.CreatedAt); err != nil {
		return chat.Message{}, false, err
	}

	if err := tx.Commit(ctx); err != nil {
		return chat.Message{}, false, err
	}
	return msg, true, nil
}
