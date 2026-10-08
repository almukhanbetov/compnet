// Package managerchat implements the manager side of the visitor chat:
// the inbox, conversation history, replies, the managers' read marker and
// opening/closing conversations. The acting staff user always comes from
// the authenticated session, never from the request body.
package managerchat

import (
	"context"
	"encoding/base64"
	"errors"
	"regexp"
	"strings"
	"time"

	"github.com/almukha/compnet-backend/internal/apperr"
	"github.com/almukha/compnet-backend/internal/domain/chat"
	"github.com/almukha/compnet-backend/internal/domain/staff"
	"github.com/almukha/compnet-backend/internal/http/dto"
)

const (
	DefaultPageSize = 30
	MaxPageSize     = 100
)

var uuidPattern = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)

// Repository is the subset of the chat repository the manager side uses.
type Repository interface {
	FindByID(ctx context.Context, id string) (chat.Conversation, error)
	ListInbox(ctx context.Context, filter chat.InboxFilter) ([]chat.ConversationSummary, error)
	ListMessagePage(ctx context.Context, conversationID string, page chat.MessagePage) ([]chat.Message, error)
	AddManagerMessage(ctx context.Context, conversationID string, msg chat.Message) (chat.Message, bool, error)
	MarkManagerRead(ctx context.Context, conversationID string, messageID int64) error
	SetStatus(ctx context.Context, conversationID string, status chat.Status) error
	ManagerUnread(ctx context.Context) (conversations, messages int, err error)
}

// Service implements the manager chat use cases.
type Service struct {
	repo Repository
}

// NewService builds a Service backed by the given Repository.
func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

// InboxQuery is the raw list query: status=open|closed|all, cursor, limit.
type InboxQuery struct {
	Status string
	Cursor string
	Limit  string
}

// InboxPage is one page of the inbox. NextCursor is "" on the last page.
type InboxPage struct {
	Items      []chat.ConversationSummary
	NextCursor string
}

// ListConversations returns a page of conversations that have messages,
// most recently active first. Default filter: open.
func (s *Service) ListConversations(ctx context.Context, q InboxQuery) (InboxPage, error) {
	fields := map[string]string{}

	filter := chat.InboxFilter{Status: chat.StatusOpen}
	switch strings.TrimSpace(q.Status) {
	case "", "open":
	case "closed":
		filter.Status = chat.StatusClosed
	case "all":
		filter.Status = ""
	default:
		fields["status"] = "допустимо: open, closed, all"
	}

	limit, ok := parseLimit(q.Limit)
	if !ok {
		fields["limit"] = "число от 1 до 100"
	}
	filter.Limit = limit + 1

	if q.Cursor != "" {
		cursor, err := decodeCursor(q.Cursor)
		if err != nil {
			fields["cursor"] = "некорректный курсор"
		} else {
			filter.After = &cursor
		}
	}
	if len(fields) > 0 {
		return InboxPage{}, apperr.Validation("проверьте параметры запроса", fields)
	}

	items, err := s.repo.ListInbox(ctx, filter)
	if err != nil {
		return InboxPage{}, apperr.Internal(err)
	}

	page := InboxPage{Items: items}
	if len(items) > limit {
		page.Items = items[:limit]
		last := page.Items[limit-1]
		page.NextCursor = encodeCursor(chat.ConversationCursor{LastMessageAt: *last.LastMessageAt, ID: last.ID})
	}
	return page, nil
}

// MessagesQuery is the raw history query: after or before (message ids), limit.
type MessagesQuery struct {
	After  int64
	Before int64
	Limit  string
}

// MessagesPage is one window of history plus the conversation it belongs to.
// HasMore means newer messages exist (when paging with After) or older ones
// (otherwise).
type MessagesPage struct {
	Conversation chat.Conversation
	Messages     []chat.Message
	HasMore      bool
}

// ListMessages returns a window of a conversation's history.
func (s *Service) ListMessages(ctx context.Context, conversationID string, q MessagesQuery) (MessagesPage, error) {
	fields := map[string]string{}
	limit, ok := parseLimit(q.Limit)
	if !ok {
		fields["limit"] = "число от 1 до 100"
	}
	if q.After < 0 || q.Before < 0 {
		fields["after"] = "должно быть не меньше 0"
	}
	if q.After > 0 && q.Before > 0 {
		fields["before"] = "используйте after или before, не оба"
	}
	if len(fields) > 0 {
		return MessagesPage{}, apperr.Validation("проверьте параметры запроса", fields)
	}

	conv, err := s.conversation(ctx, conversationID)
	if err != nil {
		return MessagesPage{}, err
	}

	items, err := s.repo.ListMessagePage(ctx, conv.ID, chat.MessagePage{AfterID: q.After, BeforeID: q.Before, Limit: limit + 1})
	if err != nil {
		return MessagesPage{}, apperr.Internal(err)
	}

	hasMore := len(items) > limit
	if hasMore {
		if q.After > 0 {
			items = items[:limit] // oldest-first: drop the extra newest
		} else {
			items = items[1:] // drop the extra oldest
		}
	}
	return MessagesPage{Conversation: conv, Messages: items, HasMore: hasMore}, nil
}

// SendMessageResult is the stored reply; Created is false for an
// idempotent retry with the same client_message_id.
type SendMessageResult struct {
	Message chat.Message
	Created bool
}

// SendMessage stores a manager reply authored by the session's staff user.
// Replying to a closed conversation is refused: a manager reopens it
// explicitly first. (A visitor message, in contrast, reopens it by itself.)
// Closing and replying are serialized by a row lock, so a reply can never
// be stored after a close has been committed.
func (s *Service) SendMessage(ctx context.Context, author staff.User, conversationID string, req dto.ManagerSendMessageRequest) (SendMessageResult, error) {
	if fields := req.Validate(); len(fields) > 0 {
		return SendMessageResult{}, apperr.Validation("проверьте сообщение", fields)
	}

	conv, err := s.conversation(ctx, conversationID)
	if err != nil {
		return SendMessageResult{}, err
	}

	msg := chat.Message{
		Author:          chat.AuthorManager,
		StaffUserID:     author.ID,
		ClientMessageID: strings.ToLower(strings.TrimSpace(req.ClientMessageID)),
		Body:            dto.NormalizedChatBody(req.Body),
	}

	// The status check and the insert happen in one locked transaction (see
	// ChatRepository.AddManagerMessage): a retry of a reply sent before the
	// conversation was closed still succeeds, any new reply to a closed
	// conversation is refused without writing anything.
	saved, created, err := s.repo.AddManagerMessage(ctx, conv.ID, msg)
	switch {
	case errors.Is(err, chat.ErrConversationClosed):
		return SendMessageResult{}, apperr.Conflict("диалог закрыт — откройте его, чтобы ответить")
	case errors.Is(err, chat.ErrNotFound):
		return SendMessageResult{}, apperr.NotFound("диалог не найден")
	case err != nil:
		return SendMessageResult{}, apperr.Internal(err)
	}
	if !created {
		return s.idempotent(saved, msg, author)
	}
	saved.StaffDisplayName = author.DisplayName
	return SendMessageResult{Message: saved, Created: true}, nil
}

// idempotent answers a resend of an already stored client_message_id: the
// stored message if it is the same reply, Conflict if the id was reused for
// different content or by someone else.
func (s *Service) idempotent(stored, sent chat.Message, author staff.User) (SendMessageResult, error) {
	if stored.Author != sent.Author || stored.StaffUserID != sent.StaffUserID || stored.Body != sent.Body {
		return SendMessageResult{}, apperr.Conflict("client_message_id уже использован для другого сообщения")
	}
	stored.StaffDisplayName = author.DisplayName
	return SendMessageResult{Message: stored}, nil
}

// MarkRead moves the managers' read marker to a message of this
// conversation and returns the updated conversation.
func (s *Service) MarkRead(ctx context.Context, conversationID string, req dto.MarkChatReadRequest) (chat.Conversation, error) {
	if fields := req.Validate(); len(fields) > 0 {
		return chat.Conversation{}, apperr.Validation("проверьте введённые данные", fields)
	}
	conv, err := s.conversation(ctx, conversationID)
	if err != nil {
		return chat.Conversation{}, err
	}

	err = s.repo.MarkManagerRead(ctx, conv.ID, req.LastMessageID)
	if errors.Is(err, chat.ErrNotFound) {
		return chat.Conversation{}, apperr.Validation("проверьте введённые данные", map[string]string{
			"last_message_id": "сообщение не найдено в этом диалоге",
		})
	}
	if err != nil {
		return chat.Conversation{}, apperr.Internal(err)
	}
	return s.conversation(ctx, conv.ID)
}

// UpdateConversation changes a conversation's status (open/closed).
func (s *Service) UpdateConversation(ctx context.Context, conversationID string, req dto.UpdateConversationRequest) (chat.Conversation, error) {
	if fields := req.Validate(); len(fields) > 0 {
		return chat.Conversation{}, apperr.Validation("проверьте введённые данные", fields)
	}
	conv, err := s.conversation(ctx, conversationID)
	if err != nil {
		return chat.Conversation{}, err
	}
	if err := s.repo.SetStatus(ctx, conv.ID, chat.Status(req.Status)); err != nil {
		return chat.Conversation{}, apperr.Internal(err)
	}
	return s.conversation(ctx, conv.ID)
}

// UnreadCount returns how many visitor messages, in how many
// conversations, the managers have not read yet.
func (s *Service) UnreadCount(ctx context.Context) (conversations, messages int, err error) {
	conversations, messages, err = s.repo.ManagerUnread(ctx)
	if err != nil {
		return 0, 0, apperr.Internal(err)
	}
	return conversations, messages, nil
}

func (s *Service) conversation(ctx context.Context, id string) (chat.Conversation, error) {
	if !uuidPattern.MatchString(id) {
		return chat.Conversation{}, apperr.NotFound("диалог не найден")
	}
	conv, err := s.repo.FindByID(ctx, strings.ToLower(id))
	if errors.Is(err, chat.ErrNotFound) {
		return chat.Conversation{}, apperr.NotFound("диалог не найден")
	}
	if err != nil {
		return chat.Conversation{}, apperr.Internal(err)
	}
	return conv, nil
}

func parseLimit(raw string) (int, bool) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return DefaultPageSize, true
	}
	n := 0
	for _, r := range raw {
		if r < '0' || r > '9' || n > MaxPageSize {
			return 0, false
		}
		n = n*10 + int(r-'0')
	}
	if n < 1 || n > MaxPageSize {
		return 0, false
	}
	return n, true
}

// Cursors are opaque to clients: base64url("<RFC3339Nano>|<uuid>").
func encodeCursor(c chat.ConversationCursor) string {
	return base64.RawURLEncoding.EncodeToString([]byte(c.LastMessageAt.UTC().Format(time.RFC3339Nano) + "|" + c.ID))
}

func decodeCursor(raw string) (chat.ConversationCursor, error) {
	decoded, err := base64.RawURLEncoding.DecodeString(raw)
	if err != nil {
		return chat.ConversationCursor{}, err
	}
	at, id, found := strings.Cut(string(decoded), "|")
	if !found || !uuidPattern.MatchString(id) {
		return chat.ConversationCursor{}, errors.New("malformed cursor")
	}
	ts, err := time.Parse(time.RFC3339Nano, at)
	if err != nil {
		return chat.ConversationCursor{}, err
	}
	return chat.ConversationCursor{LastMessageAt: ts, ID: id}, nil
}
