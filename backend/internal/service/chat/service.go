// Package chat implements the visitor side of the visitor ↔ manager chat:
// resolving the visitor's conversation from their cookie token, sending
// messages idempotently, read markers and contact details, and anti-spam
// limits. Handlers stay thin; this is where the business rules live.
package chat

import (
	"context"
	"errors"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/almukha/compnet-backend/internal/apperr"
	"github.com/almukha/compnet-backend/internal/domain/chat"
	"github.com/almukha/compnet-backend/internal/http/dto"
	"github.com/almukha/compnet-backend/internal/security"
)

// PageSize is the maximum number of messages returned per poll.
const PageSize = 100

// Repository persists conversations and messages.
type Repository interface {
	FindByTokenHash(ctx context.Context, tokenHash []byte) (chat.Conversation, error)
	Create(ctx context.Context, conv chat.Conversation) (chat.Conversation, error)
	AddMessage(ctx context.Context, conversationID string, msg chat.Message) (chat.Message, bool, error)
	ListMessages(ctx context.Context, conversationID string, afterID int64, limit int) ([]chat.Message, error)
	MarkVisitorRead(ctx context.Context, conversationID string, messageID int64) error
	UpdateVisitorContact(ctx context.Context, conversationID, name, contact string) error
}

// Limiter is a per-key rate limiter (see internal/ratelimit).
type Limiter interface {
	Allow(key string) (bool, time.Duration)
}

// Limits groups the anti-spam limiters the service enforces.
type Limits struct {
	// NewConversation is keyed by client IP: how many chat sessions
	// (conversations) one address may start.
	NewConversation Limiter
	// Messages is keyed by conversation: how fast one visitor may send.
	Messages Limiter
}

// Service implements the visitor chat use cases.
type Service struct {
	repo   Repository
	limits Limits
}

// NewService builds a Service backed by the given Repository and limiters.
func NewService(repo Repository, limits Limits) *Service {
	return &Service{repo: repo, limits: limits}
}

// StartSessionInput is the raw cookie token (may be empty) and request
// metadata stored with a new conversation.
type StartSessionInput struct {
	Token     string
	ClientIP  string
	UserAgent string
	PageURL   string
}

// StartSessionResult is the visitor's conversation. NewToken is set only
// when a new conversation was created and the caller must hand this token to
// the visitor.
type StartSessionResult struct {
	Conversation chat.Conversation
	NewToken     string
}

// SendMessageInput is the raw cookie token and the message to store.
type SendMessageInput struct {
	Token   string
	Request dto.SendChatMessageRequest
}

// SendMessageResult is the stored message. Created is false when the same
// client_message_id was already stored (idempotent retry).
type SendMessageResult struct {
	Message chat.Message
	Created bool
}

// MessagePage is one poll result.
type MessagePage struct {
	Messages     []chat.Message
	HasMore      bool
	Conversation chat.Conversation
	Exists       bool
}

// GetConversation returns the visitor's conversation; exists is false when
// the token is missing, malformed or unknown.
func (s *Service) GetConversation(ctx context.Context, token string) (chat.Conversation, bool, error) {
	conv, err := s.lookup(ctx, token)
	if errors.Is(err, chat.ErrNotFound) {
		return chat.Conversation{}, false, nil
	}
	if err != nil {
		return chat.Conversation{}, false, apperr.Internal(err)
	}
	return conv, true, nil
}

// ListMessages returns the visitor's messages with id > afterID. A visitor
// without a conversation simply gets an empty page.
func (s *Service) ListMessages(ctx context.Context, token string, afterID int64) (MessagePage, error) {
	if afterID < 0 {
		return MessagePage{}, apperr.Validation("проверьте параметры запроса", map[string]string{
			"after": "должно быть не меньше 0",
		})
	}

	conv, err := s.lookup(ctx, token)
	if errors.Is(err, chat.ErrNotFound) {
		return MessagePage{Messages: []chat.Message{}}, nil
	}
	if err != nil {
		return MessagePage{}, apperr.Internal(err)
	}

	items, err := s.repo.ListMessages(ctx, conv.ID, afterID, PageSize+1)
	if err != nil {
		return MessagePage{}, apperr.Internal(err)
	}

	hasMore := len(items) > PageSize
	if hasMore {
		items = items[:PageSize]
	}
	return MessagePage{Messages: items, HasMore: hasMore, Conversation: conv, Exists: true}, nil
}

// StartSession returns the visitor's existing conversation, or creates an
// empty one (subject to a per-IP limit) and a fresh token for it.
//
// The widget calls this before the first message. Messages are only ever
// sent with an established token, so if the response to a message is lost,
// the retry lands in the same conversation and is deduplicated by its
// client_message_id. A lost response to this call only leaves an empty,
// never-shown conversation behind.
func (s *Service) StartSession(ctx context.Context, in StartSessionInput) (StartSessionResult, error) {
	conv, err := s.lookup(ctx, in.Token)
	if err == nil {
		return StartSessionResult{Conversation: conv}, nil
	}
	if !errors.Is(err, chat.ErrNotFound) {
		return StartSessionResult{}, apperr.Internal(err)
	}

	if ok, wait := s.limits.NewConversation.Allow("ip:" + in.ClientIP); !ok {
		return StartSessionResult{}, apperr.RateLimited(wait)
	}

	token, hash, err := security.NewToken()
	if err != nil {
		return StartSessionResult{}, apperr.Internal(err)
	}

	conv, err = s.repo.Create(ctx, chat.Conversation{
		VisitorTokenHash: hash,
		PageURL:          sanitizePageURL(in.PageURL),
		UserAgent:        truncateRunes(strings.TrimSpace(in.UserAgent), chat.MaxUserAgentLength),
	})
	if err != nil {
		return StartSessionResult{}, apperr.Internal(err)
	}
	return StartSessionResult{Conversation: conv, NewToken: token}, nil
}

// SendMessage stores a visitor message in the conversation identified by
// the token. Without a valid token it returns NotFound: the client must
// start a session first and then retry with the same client_message_id.
func (s *Service) SendMessage(ctx context.Context, in SendMessageInput) (SendMessageResult, error) {
	req := in.Request

	// Honeypot: the widget never fills this field. Reply with a generic
	// error that does not reveal why the request was rejected.
	if strings.TrimSpace(req.Website) != "" {
		return SendMessageResult{}, apperr.BadRequest("invalid request")
	}

	if fields := req.Validate(); len(fields) > 0 {
		return SendMessageResult{}, apperr.Validation("проверьте сообщение", fields)
	}

	msg := chat.Message{
		Author:          chat.AuthorVisitor,
		ClientMessageID: strings.ToLower(strings.TrimSpace(req.ClientMessageID)),
		Body:            dto.NormalizedChatBody(req.Body),
	}

	conv, err := s.requireConversation(ctx, in.Token)
	if err != nil {
		return SendMessageResult{}, err
	}

	if ok, wait := s.limits.Messages.Allow("conv:" + conv.ID); !ok {
		return SendMessageResult{}, apperr.RateLimited(wait)
	}

	saved, created, err := s.repo.AddMessage(ctx, conv.ID, msg)
	if err != nil {
		return SendMessageResult{}, apperr.Internal(err)
	}
	if !created && (saved.Author != msg.Author || saved.Body != msg.Body) {
		// Same id reused for different content: refuse rather than silently
		// returning the old message.
		return SendMessageResult{}, apperr.Conflict("client_message_id уже использован для другого сообщения")
	}
	return SendMessageResult{Message: saved, Created: created}, nil
}

// MarkRead moves the visitor's read marker to the given message, which
// must belong to the visitor's own conversation, and returns the updated
// conversation (with its new unread count).
func (s *Service) MarkRead(ctx context.Context, token string, req dto.MarkChatReadRequest) (chat.Conversation, error) {
	if fields := req.Validate(); len(fields) > 0 {
		return chat.Conversation{}, apperr.Validation("проверьте введённые данные", fields)
	}

	conv, err := s.requireConversation(ctx, token)
	if err != nil {
		return chat.Conversation{}, err
	}

	err = s.repo.MarkVisitorRead(ctx, conv.ID, req.LastMessageID)
	if errors.Is(err, chat.ErrNotFound) {
		return chat.Conversation{}, apperr.Validation("проверьте введённые данные", map[string]string{
			"last_message_id": "сообщение не найдено в этом диалоге",
		})
	}
	if err != nil {
		return chat.Conversation{}, apperr.Internal(err)
	}

	return s.reload(ctx, token)
}

// UpdateContact stores the visitor's name and contact for a callback.
func (s *Service) UpdateContact(ctx context.Context, token string, req dto.UpdateChatContactRequest) (chat.Conversation, error) {
	if fields := req.Validate(); len(fields) > 0 {
		return chat.Conversation{}, apperr.Validation("проверьте введённые данные", fields)
	}

	conv, err := s.requireConversation(ctx, token)
	if err != nil {
		return chat.Conversation{}, err
	}

	if err := s.repo.UpdateVisitorContact(ctx, conv.ID, strings.TrimSpace(req.Name), strings.TrimSpace(req.Contact)); err != nil {
		return chat.Conversation{}, apperr.Internal(err)
	}

	return s.reload(ctx, token)
}

// lookup resolves the conversation strictly from the token: the client
// never supplies a conversation id, so it cannot address someone else's.
func (s *Service) lookup(ctx context.Context, token string) (chat.Conversation, error) {
	if !security.ValidTokenFormat(token) {
		return chat.Conversation{}, chat.ErrNotFound
	}
	return s.repo.FindByTokenHash(ctx, security.HashToken(token))
}

func (s *Service) requireConversation(ctx context.Context, token string) (chat.Conversation, error) {
	conv, err := s.lookup(ctx, token)
	if errors.Is(err, chat.ErrNotFound) {
		return chat.Conversation{}, apperr.NotFound("диалог не найден")
	}
	if err != nil {
		return chat.Conversation{}, apperr.Internal(err)
	}
	return conv, nil
}

func (s *Service) reload(ctx context.Context, token string) (chat.Conversation, error) {
	conv, err := s.lookup(ctx, token)
	if err != nil {
		return chat.Conversation{}, apperr.Internal(err)
	}
	return conv, nil
}

// sanitizePageURL keeps only http(s) URLs, truncated to the column limit.
func sanitizePageURL(raw string) string {
	url := strings.TrimSpace(raw)
	if !strings.HasPrefix(url, "https://") && !strings.HasPrefix(url, "http://") {
		return ""
	}
	if !utf8.ValidString(url) || strings.ContainsRune(url, 0) {
		return ""
	}
	return truncateRunes(url, chat.MaxPageURLLength)
}

func truncateRunes(s string, limit int) string {
	if !utf8.ValidString(s) || strings.ContainsRune(s, 0) {
		return ""
	}
	if utf8.RuneCountInString(s) <= limit {
		return s
	}
	return string([]rune(s)[:limit])
}
