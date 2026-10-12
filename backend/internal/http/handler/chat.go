package handler

import (
	"context"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/almukha/compnet-backend/internal/apperr"
	"github.com/almukha/compnet-backend/internal/domain/chat"
	"github.com/almukha/compnet-backend/internal/http/apierr"
	"github.com/almukha/compnet-backend/internal/http/dto"
	"github.com/almukha/compnet-backend/internal/http/response"
	chatsvc "github.com/almukha/compnet-backend/internal/service/chat"
)

const (
	// ChatCookieName holds the visitor's opaque chat token.
	ChatCookieName = "compnet_chat"
	// chatCookiePath limits the cookie to the visitor chat API, so it is
	// never sent with any other request.
	chatCookiePath = "/api/v1/chat"
)

// ChatService is what this handler needs from the service layer.
type ChatService interface {
	GetConversation(ctx context.Context, token string) (chat.Conversation, bool, error)
	ListMessages(ctx context.Context, token string, afterID int64) (chatsvc.MessagePage, error)
	ListHistory(ctx context.Context, token string, beforeID int64, limit int) (chatsvc.MessagePage, error)
	StartSession(ctx context.Context, in chatsvc.StartSessionInput) (chatsvc.StartSessionResult, error)
	SendMessage(ctx context.Context, in chatsvc.SendMessageInput) (chatsvc.SendMessageResult, error)
	MarkRead(ctx context.Context, token string, req dto.MarkChatReadRequest) (chat.Conversation, error)
	UpdateContact(ctx context.Context, token string, req dto.UpdateChatContactRequest) (chat.Conversation, error)
}

// ChatCookieSettings are the configurable attributes of the visitor cookie.
type ChatCookieSettings struct {
	Secure   bool
	SameSite http.SameSite
	TTL      time.Duration
}

// ChatHandler serves the anonymous visitor chat endpoints. The visitor is
// identified only by the HttpOnly cookie; no request carries a
// conversation id.
type ChatHandler struct {
	service  ChatService
	cookie   ChatCookieSettings
	presence Presence
}

// Presence reports whether a manager is connected right now (the realtime
// hub). Without it, managers_online is always false.
type Presence interface {
	ManagersOnline() bool
}

// SetPresence enables managers_online in GET /api/v1/chat.
func (h *ChatHandler) SetPresence(p Presence) { h.presence = p }

func (h *ChatHandler) managersOnline() bool {
	return h.presence != nil && h.presence.ManagersOnline()
}

// NewChatHandler wires the handler with its service and cookie settings.
func NewChatHandler(service ChatService, cookie ChatCookieSettings) *ChatHandler {
	return &ChatHandler{service: service, cookie: cookie}
}

// Get handles GET /api/v1/chat: the visitor's conversation summary, or
// data=null when they have not written yet. meta.managers_online is true
// only while a manager has a live, authenticated realtime connection.
func (h *ChatHandler) Get(c *gin.Context) {
	token := h.token(c)
	conv, exists, err := h.service.GetConversation(c.Request.Context(), token)
	if err != nil {
		apierr.Write(c, err)
		return
	}
	meta := gin.H{"managers_online": h.managersOnline()}
	if !exists {
		response.OKWithMeta(c, nil, meta)
		return
	}

	h.setCookie(c, token) // sliding expiry while the visitor is active
	response.OKWithMeta(c, dto.NewChatConversationResponse(conv), meta)
}

// ListMessages handles GET /api/v1/chat/messages:
//
//	?after=<id>             messages newer than id (reconciliation), oldest first
//	?tail=1[&limit=n]       the newest n messages
//	?before=<id>[&limit=n]  the n messages before id (older history)
//
// meta.has_more means more newer messages (after) or older ones (tail/before).
func (h *ChatHandler) ListMessages(c *gin.Context) {
	after, ok := queryInt(c, "after")
	if !ok {
		return
	}
	before, ok := queryInt(c, "before")
	if !ok {
		return
	}
	limit, ok := queryInt(c, "limit")
	if !ok {
		return
	}

	var (
		page chatsvc.MessagePage
		err  error
	)
	if before > 0 || c.Query("tail") == "1" {
		page, err = h.service.ListHistory(c.Request.Context(), h.token(c), before, int(limit))
	} else {
		page, err = h.service.ListMessages(c.Request.Context(), h.token(c), after)
	}
	if err != nil {
		apierr.Write(c, err)
		return
	}

	response.OKWithMeta(c, dto.NewChatMessageListResponse(page.Messages), gin.H{
		"has_more":             page.HasMore,
		"unread_count":         page.Conversation.UnreadForVisitor,
		"last_read_id":         page.Conversation.VisitorLastReadID,
		"manager_last_read_id": page.Conversation.ManagerLastReadID,
		"status":               string(page.Conversation.Status),
	})
}

// queryInt parses an optional non-negative integer query parameter. On a
// malformed value it writes 422 and returns ok=false.
func queryInt(c *gin.Context, name string) (int64, bool) {
	raw := c.Query(name)
	if raw == "" {
		return 0, true
	}
	value, err := strconv.ParseInt(raw, 10, 64)
	if err != nil {
		apierr.Write(c, apperr.Validation("проверьте параметры запроса", map[string]string{
			name: "нужно целое число",
		}))
		return 0, false
	}
	return value, true
}

// StartSession handles POST /api/v1/chat/session: it returns the visitor's
// conversation, creating an empty one and setting the cookie if there is
// none yet (201), or 200 for an existing one. Safe to retry.
func (h *ChatHandler) StartSession(c *gin.Context) {
	var req dto.StartChatSessionRequest
	if c.Request.ContentLength != 0 {
		if err := c.ShouldBindJSON(&req); err != nil {
			apierr.Write(c, apperr.BadRequest("invalid JSON body"))
			return
		}
	}

	token := h.token(c)
	result, err := h.service.StartSession(c.Request.Context(), chatsvc.StartSessionInput{
		Token:     token,
		ClientIP:  c.ClientIP(),
		UserAgent: c.Request.UserAgent(),
		PageURL:   req.PageURL,
	})
	if err != nil {
		apierr.Write(c, err)
		return
	}

	body := dto.NewChatConversationResponse(result.Conversation)
	if result.NewToken != "" {
		h.setCookie(c, result.NewToken)
		c.JSON(http.StatusCreated, response.Envelope{Data: body})
		return
	}
	h.setCookie(c, token)
	response.OK(c, body)
}

// SendMessage handles POST /api/v1/chat/messages. It answers 201 for a new
// message, 200 when the same client_message_id was already stored, and 404
// when there is no session yet (the client starts one and retries).
func (h *ChatHandler) SendMessage(c *gin.Context) {
	var req dto.SendChatMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		apierr.Write(c, apperr.BadRequest("invalid JSON body"))
		return
	}

	token := h.token(c)
	result, err := h.service.SendMessage(c.Request.Context(), chatsvc.SendMessageInput{
		Token:   token,
		Request: req,
	})
	if err != nil {
		apierr.Write(c, err)
		return
	}

	h.setCookie(c, token) // sliding expiry while the visitor is active

	body := dto.NewChatMessageResponse(result.Message)
	if result.Created {
		response.Created(c, body)
		return
	}
	response.OK(c, body)
}

// MarkRead handles POST /api/v1/chat/read.
func (h *ChatHandler) MarkRead(c *gin.Context) {
	var req dto.MarkChatReadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		apierr.Write(c, apperr.BadRequest("invalid JSON body"))
		return
	}

	conv, err := h.service.MarkRead(c.Request.Context(), h.token(c), req)
	if err != nil {
		apierr.Write(c, err)
		return
	}
	response.OK(c, dto.NewChatConversationResponse(conv))
}

// UpdateContact handles PUT /api/v1/chat/contact.
func (h *ChatHandler) UpdateContact(c *gin.Context) {
	var req dto.UpdateChatContactRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		apierr.Write(c, apperr.BadRequest("invalid JSON body"))
		return
	}

	conv, err := h.service.UpdateContact(c.Request.Context(), h.token(c), req)
	if err != nil {
		apierr.Write(c, err)
		return
	}
	response.OK(c, dto.NewChatConversationResponse(conv))
}

func (h *ChatHandler) token(c *gin.Context) string {
	value, err := c.Cookie(ChatCookieName)
	if err != nil {
		return ""
	}
	return value
}

func (h *ChatHandler) setCookie(c *gin.Context, token string) {
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     ChatCookieName,
		Value:    token,
		Path:     chatCookiePath,
		MaxAge:   int(h.cookie.TTL.Seconds()),
		Expires:  time.Now().Add(h.cookie.TTL),
		Secure:   h.cookie.Secure,
		HttpOnly: true,
		SameSite: h.cookie.SameSite,
	})
}
