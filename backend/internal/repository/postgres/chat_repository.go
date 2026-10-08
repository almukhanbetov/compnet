package postgres

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/almukha/compnet-backend/internal/domain/chat"
)

// ChatRepository persists chat conversations and messages against
// PostgreSQL. Every query that touches messages is scoped by conversation
// id, so a caller can never reach another conversation's data.
type ChatRepository struct {
	pool *pgxpool.Pool
}

// NewChatRepository builds a repository backed by the given pool.
func NewChatRepository(pool *pgxpool.Pool) *ChatRepository {
	return &ChatRepository{pool: pool}
}

// FindByTokenHash returns the conversation owned by the visitor token with
// the given hash, including its newest message id and the visitor's unread
// count. It returns chat.ErrNotFound if there is none.
func (r *ChatRepository) FindByTokenHash(ctx context.Context, tokenHash []byte) (chat.Conversation, error) {
	const query = `
		SELECT c.id, c.visitor_name, c.visitor_contact, c.status,
		       c.visitor_last_read_id, c.manager_last_read_id,
		       c.page_url, c.user_agent,
		       c.last_message_at, c.created_at, c.updated_at,
		       COALESCE((SELECT max(m.id) FROM chat_messages m
		                 WHERE m.conversation_id = c.id), 0),
		       (SELECT count(*) FROM chat_messages m
		         WHERE m.conversation_id = c.id
		           AND m.author <> 'visitor'
		           AND m.id > c.visitor_last_read_id)
		FROM chat_conversations c
		WHERE c.visitor_token_hash = $1`

	var (
		conv                              chat.Conversation
		name, contact, pageURL, userAgent *string
	)
	err := r.pool.QueryRow(ctx, query, tokenHash).Scan(
		&conv.ID, &name, &contact, &conv.Status,
		&conv.VisitorLastReadID, &conv.ManagerLastReadID,
		&pageURL, &userAgent,
		&conv.LastMessageAt, &conv.CreatedAt, &conv.UpdatedAt,
		&conv.LastMessageID, &conv.UnreadForVisitor,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return chat.Conversation{}, chat.ErrNotFound
	}
	if err != nil {
		return chat.Conversation{}, err
	}

	conv.VisitorTokenHash = tokenHash
	conv.VisitorName = derefString(name)
	conv.VisitorContact = derefString(contact)
	conv.PageURL = derefString(pageURL)
	conv.UserAgent = derefString(userAgent)
	return conv, nil
}

// Create inserts a new, still empty conversation for a visitor session.
func (r *ChatRepository) Create(ctx context.Context, conv chat.Conversation) (chat.Conversation, error) {
	const query = `
		INSERT INTO chat_conversations (visitor_token_hash, page_url, user_agent)
		VALUES ($1, $2, $3)
		RETURNING id, status, last_message_at, created_at, updated_at`

	err := r.pool.QueryRow(ctx, query,
		conv.VisitorTokenHash,
		nullableString(conv.PageURL),
		nullableString(conv.UserAgent),
	).Scan(&conv.ID, &conv.Status, &conv.LastMessageAt, &conv.CreatedAt, &conv.UpdatedAt)
	if err != nil {
		return chat.Conversation{}, err
	}
	return conv, nil
}

// AddMessage appends a message to an existing conversation. If a message
// with the same client_message_id already exists in this conversation, it
// is returned unchanged with created=false instead of inserting a duplicate.
// A new message sets the conversation's status to open: a visitor writing
// into a closed conversation reopens it (managers may only write into open
// ones, which the manager service enforces).
func (r *ChatRepository) AddMessage(
	ctx context.Context,
	conversationID string,
	msg chat.Message,
) (chat.Message, bool, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return chat.Message{}, false, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	const insert = `
		INSERT INTO chat_messages (conversation_id, author, staff_user_id, client_message_id, body)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (conversation_id, client_message_id) DO NOTHING
		RETURNING id, created_at`

	msg.ConversationID = conversationID
	err = tx.QueryRow(ctx, insert, conversationID, string(msg.Author), nullableString(msg.StaffUserID), msg.ClientMessageID, msg.Body).
		Scan(&msg.ID, &msg.CreatedAt)

	if errors.Is(err, pgx.ErrNoRows) {
		// Conflict: a concurrent or earlier request already stored it.
		existing, err := findByClientID(ctx, tx, conversationID, msg.ClientMessageID)
		if err != nil {
			return chat.Message{}, false, err
		}
		return existing, false, tx.Commit(ctx)
	}
	if err != nil {
		return chat.Message{}, false, err
	}

	const touch = `
		UPDATE chat_conversations
		SET last_message_at = $2, status = 'open', updated_at = now()
		WHERE id = $1`
	if _, err := tx.Exec(ctx, touch, conversationID, msg.CreatedAt); err != nil {
		return chat.Message{}, false, err
	}

	if err := tx.Commit(ctx); err != nil {
		return chat.Message{}, false, err
	}
	return msg, true, nil
}

// ListMessages returns up to limit messages of the conversation with
// id > afterID, oldest first.
func (r *ChatRepository) ListMessages(
	ctx context.Context,
	conversationID string,
	afterID int64,
	limit int,
) ([]chat.Message, error) {
	const query = `
		SELECT id, conversation_id, author, staff_user_id, client_message_id, body, created_at
		FROM chat_messages
		WHERE conversation_id = $1 AND id > $2
		ORDER BY id
		LIMIT $3`

	rows, err := r.pool.Query(ctx, query, conversationID, afterID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]chat.Message, 0)
	for rows.Next() {
		msg, err := scanMessage(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, msg)
	}
	return items, rows.Err()
}

// MarkVisitorRead moves the visitor's read marker forward to messageID. The
// update only happens if that message belongs to this conversation;
// otherwise chat.ErrNotFound is returned. The marker never moves backwards.
func (r *ChatRepository) MarkVisitorRead(ctx context.Context, conversationID string, messageID int64) error {
	const query = `
		UPDATE chat_conversations c
		SET visitor_last_read_id = GREATEST(c.visitor_last_read_id, $2),
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

// UpdateVisitorContact stores the name/contact a visitor left for a
// callback. An empty name is stored as NULL.
func (r *ChatRepository) UpdateVisitorContact(ctx context.Context, conversationID, name, contact string) error {
	const query = `
		UPDATE chat_conversations
		SET visitor_name = $2, visitor_contact = $3, updated_at = now()
		WHERE id = $1`

	tag, err := r.pool.Exec(ctx, query, conversationID, nullableString(name), nullableString(contact))
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return chat.ErrNotFound
	}
	return nil
}

func findByClientID(ctx context.Context, tx pgx.Tx, conversationID, clientMessageID string) (chat.Message, error) {
	const query = `
		SELECT id, conversation_id, author, staff_user_id, client_message_id, body, created_at
		FROM chat_messages
		WHERE conversation_id = $1 AND client_message_id = $2`
	return scanMessage(tx.QueryRow(ctx, query, conversationID, clientMessageID))
}

func scanMessage(row pgx.Row) (chat.Message, error) {
	var (
		msg     chat.Message
		staffID *string
	)
	if err := row.Scan(&msg.ID, &msg.ConversationID, &msg.Author, &staffID, &msg.ClientMessageID, &msg.Body, &msg.CreatedAt); err != nil {
		return chat.Message{}, err
	}
	msg.StaffUserID = derefString(staffID)
	return msg, nil
}

func derefString(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
