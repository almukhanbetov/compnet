package handler

import (
	"context"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/almukha/compnet-backend/internal/apperr"
	"github.com/almukha/compnet-backend/internal/domain/chat"
	"github.com/almukha/compnet-backend/internal/domain/staff"
	"github.com/almukha/compnet-backend/internal/http/apierr"
	"github.com/almukha/compnet-backend/internal/http/dto"
	"github.com/almukha/compnet-backend/internal/http/middleware"
	"github.com/almukha/compnet-backend/internal/http/response"
	"github.com/almukha/compnet-backend/internal/service/managerchat"
)

// ManagerChatService is what this handler needs from the service layer.
type ManagerChatService interface {
	ListConversations(ctx context.Context, q managerchat.InboxQuery) (managerchat.InboxPage, error)
	ListMessages(ctx context.Context, conversationID string, q managerchat.MessagesQuery) (managerchat.MessagesPage, error)
	SendMessage(ctx context.Context, author staff.User, conversationID string, req dto.ManagerSendMessageRequest) (managerchat.SendMessageResult, error)
	MarkRead(ctx context.Context, conversationID string, req dto.MarkChatReadRequest) (chat.Conversation, error)
	UpdateConversation(ctx context.Context, conversationID string, req dto.UpdateConversationRequest) (chat.Conversation, error)
	UnreadCount(ctx context.Context) (conversations, messages int, err error)
}

// ManagerChatHandler serves the manager inbox and conversation endpoints.
// Every route sits behind middleware.RequireStaff.
type ManagerChatHandler struct {
	service ManagerChatService
}

// NewManagerChatHandler wires the handler.
func NewManagerChatHandler(service ManagerChatService) *ManagerChatHandler {
	return &ManagerChatHandler{service: service}
}

// ListConversations handles GET /api/v1/manager/conversations?status=&cursor=&limit=.
func (h *ManagerChatHandler) ListConversations(c *gin.Context) {
	page, err := h.service.ListConversations(c.Request.Context(), managerchat.InboxQuery{
		Status: c.Query("status"),
		Cursor: c.Query("cursor"),
		Limit:  c.Query("limit"),
	})
	if err != nil {
		apierr.Write(c, err)
		return
	}
	response.OKWithMeta(c, dto.NewManagerInboxResponse(page.Items), gin.H{
		"next_cursor": page.NextCursor,
		"has_more":    page.NextCursor != "",
	})
}

// ListMessages handles GET /api/v1/manager/conversations/:id/messages?after=|before=&limit=.
func (h *ManagerChatHandler) ListMessages(c *gin.Context) {
	after, okAfter := queryID(c, "after")
	before, okBefore := queryID(c, "before")
	if !okAfter || !okBefore {
		apierr.Write(c, apperr.Validation("проверьте параметры запроса", map[string]string{
			"after": "after и before — целые числа",
		}))
		return
	}

	page, err := h.service.ListMessages(c.Request.Context(), c.Param("id"), managerchat.MessagesQuery{
		After: after, Before: before, Limit: c.Query("limit"),
	})
	if err != nil {
		apierr.Write(c, err)
		return
	}
	response.OKWithMeta(c, dto.NewManagerMessageListResponse(page.Messages), gin.H{
		"has_more":     page.HasMore,
		"conversation": dto.NewManagerConversationResponse(page.Conversation),
	})
}

// SendMessage handles POST /api/v1/manager/conversations/:id/messages:
// 201 for a new reply, 200 for an idempotent retry.
func (h *ManagerChatHandler) SendMessage(c *gin.Context) {
	var req dto.ManagerSendMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		apierr.Write(c, apperr.BadRequest("invalid JSON body"))
		return
	}
	user, ok := middleware.StaffFromContext(c)
	if !ok {
		apierr.Write(c, apperr.Unauthorized("требуется вход"))
		return
	}

	result, err := h.service.SendMessage(c.Request.Context(), user, c.Param("id"), req)
	if err != nil {
		apierr.Write(c, err)
		return
	}
	body := dto.NewManagerMessageResponse(result.Message)
	if result.Created {
		response.Created(c, body)
		return
	}
	response.OK(c, body)
}

// MarkRead handles POST /api/v1/manager/conversations/:id/read.
func (h *ManagerChatHandler) MarkRead(c *gin.Context) {
	var req dto.MarkChatReadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		apierr.Write(c, apperr.BadRequest("invalid JSON body"))
		return
	}
	conv, err := h.service.MarkRead(c.Request.Context(), c.Param("id"), req)
	if err != nil {
		apierr.Write(c, err)
		return
	}
	response.OK(c, dto.NewManagerConversationResponse(conv))
}

// UpdateConversation handles PATCH /api/v1/manager/conversations/:id.
func (h *ManagerChatHandler) UpdateConversation(c *gin.Context) {
	var req dto.UpdateConversationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		apierr.Write(c, apperr.BadRequest("invalid JSON body"))
		return
	}
	conv, err := h.service.UpdateConversation(c.Request.Context(), c.Param("id"), req)
	if err != nil {
		apierr.Write(c, err)
		return
	}
	response.OK(c, dto.NewManagerConversationResponse(conv))
}

// UnreadCount handles GET /api/v1/manager/unread-count.
func (h *ManagerChatHandler) UnreadCount(c *gin.Context) {
	conversations, messages, err := h.service.UnreadCount(c.Request.Context())
	if err != nil {
		apierr.Write(c, err)
		return
	}
	response.OK(c, gin.H{"conversations": conversations, "messages": messages})
}

// queryID parses an optional non-negative integer query parameter.
func queryID(c *gin.Context, name string) (int64, bool) {
	raw := c.Query(name)
	if raw == "" {
		return 0, true
	}
	value, err := strconv.ParseInt(raw, 10, 64)
	return value, err == nil
}
