package handler

import (
	"context"
	"errors"
	"log"
	"math"
	"net/http"
	"net/url"
	"sync"
	"time"

	"github.com/coder/websocket"
	"github.com/gin-gonic/gin"

	"github.com/almukha/compnet-backend/internal/apperr"
	"github.com/almukha/compnet-backend/internal/domain/chat"
	"github.com/almukha/compnet-backend/internal/domain/staff"
	"github.com/almukha/compnet-backend/internal/http/apierr"
	"github.com/almukha/compnet-backend/internal/http/dto"
	"github.com/almukha/compnet-backend/internal/http/middleware"
	"github.com/almukha/compnet-backend/internal/http/response"
	"github.com/almukha/compnet-backend/internal/realtime"
	"github.com/almukha/compnet-backend/internal/security"
	chatsvc "github.com/almukha/compnet-backend/internal/service/chat"
	"github.com/almukha/compnet-backend/internal/service/managerchat"
)

// frameTimeout bounds the work done for one client frame.
const frameTimeout = 10 * time.Second

// VisitorRealtimeService is what the visitor socket needs.
type VisitorRealtimeService interface {
	GetConversation(ctx context.Context, token string) (chat.Conversation, bool, error)
	SendMessage(ctx context.Context, in chatsvc.SendMessageInput) (chatsvc.SendMessageResult, error)
	MarkRead(ctx context.Context, token string, req dto.MarkChatReadRequest) (chat.Conversation, error)
}

// ManagerRealtimeService is what the manager socket needs.
type ManagerRealtimeService interface {
	SendMessage(ctx context.Context, author staff.User, conversationID string, req dto.ManagerSendMessageRequest) (managerchat.SendMessageResult, error)
	MarkRead(ctx context.Context, conversationID string, req dto.MarkChatReadRequest) (chat.Conversation, error)
}

// RealtimeHandler upgrades /api/v1/chat/ws (visitor) and
// /api/v1/manager/ws (manager) to WebSockets. Both are authenticated by the
// existing HttpOnly cookies — the browser sends them with the handshake —
// so no token ever appears in a URL.
type RealtimeHandler struct {
	hub         *realtime.Hub
	visitor     VisitorRealtimeService
	manager     ManagerRealtimeService
	auth        middleware.Authenticator
	allowed     map[string]bool
	originHosts []string
}

// NewRealtimeHandler wires the handler. allowedOrigins is the same explicit
// list as CORS_ALLOWED_ORIGINS (production domains and, locally, the dev
// frontend).
func NewRealtimeHandler(hub *realtime.Hub, visitor VisitorRealtimeService, manager ManagerRealtimeService, auth middleware.Authenticator, allowedOrigins []string) *RealtimeHandler {
	h := &RealtimeHandler{hub: hub, visitor: visitor, manager: manager, auth: auth, allowed: map[string]bool{}}
	for _, origin := range allowedOrigins {
		h.allowed[origin] = true
		if u, err := url.Parse(origin); err == nil && u.Host != "" {
			h.originHosts = append(h.originHosts, u.Host)
		}
	}
	return h
}

// checkOrigin refuses cross-site WebSocket hijacking: the handshake is a
// GET with cookies, so the Origin must be one of ours, exactly.
func (h *RealtimeHandler) checkOrigin(c *gin.Context) bool {
	if !h.allowed[c.GetHeader("Origin")] {
		response.Error(c, http.StatusForbidden, "forbidden", "request origin is not allowed")
		return false
	}
	return true
}

func (h *RealtimeHandler) admit(c *gin.Context, role realtime.Role, staffID string) bool {
	err := h.hub.CanAccept(role, c.ClientIP(), staffID)
	switch {
	case err == nil:
		return true
	case errors.Is(err, realtime.ErrTooManyConnections):
		apierr.WriteRateLimited(c, 10*time.Second)
	default:
		response.Error(c, http.StatusServiceUnavailable, "unavailable", "realtime is unavailable")
	}
	return false
}

func (h *RealtimeHandler) accept(c *gin.Context) (*websocket.Conn, bool) {
	conn, err := websocket.Accept(c.Writer, c.Request, &websocket.AcceptOptions{
		// The exact origin was checked above; this repeats it at host level.
		OriginPatterns:  h.originHosts,
		CompressionMode: websocket.CompressionDisabled,
	})
	if err != nil {
		return nil, false // Accept has written the response
	}
	return conn, true
}

// Visitor handles GET /api/v1/chat/ws. A visitor without a conversation yet
// may connect too: they receive presence only, and reconnect once their
// first message has created the conversation.
func (h *RealtimeHandler) Visitor(c *gin.Context) {
	if !h.checkOrigin(c) {
		return
	}
	token, _ := c.Cookie(ChatCookieName)
	conv, exists, err := h.visitor.GetConversation(c.Request.Context(), token)
	if err != nil {
		apierr.Write(c, err)
		return
	}
	if !h.admit(c, realtime.RoleVisitor, "") {
		return
	}
	conn, ok := h.accept(c)
	if !ok {
		return
	}
	info := realtime.ClientInfo{Role: realtime.RoleVisitor, IP: c.ClientIP()}
	if exists {
		info.ConversationID = conv.ID
	}
	h.hub.Attach(conn, info).Run(h.visitorFrames(token), nil)
}

func (h *RealtimeHandler) visitorFrames(token string) realtime.FrameHandler {
	return func(ctx context.Context, cl *realtime.Client, f realtime.Frame) {
		ctx, cancel := context.WithTimeout(ctx, frameTimeout)
		defer cancel()
		switch f.Type {
		case "send_message":
			res, err := h.visitor.SendMessage(ctx, chatsvc.SendMessageInput{
				Token:   token,
				Request: dto.SendChatMessageRequest{ClientMessageID: f.ClientMessageID, Body: f.Body, AnalyticsSessionID: f.AnalyticsSessionID},
			})
			if err != nil {
				cl.SendEvent(errorEvent(f, err))
				return
			}
			cl.SendEvent(realtime.Reply(realtime.EventMessageAck, f.RequestID, AckData{
				ClientMessageID: res.Message.ClientMessageID,
				Created:         res.Created,
				Message:         dto.NewChatMessageResponse(res.Message),
			}))
		case "mark_read":
			if _, err := h.visitor.MarkRead(ctx, token, dto.MarkChatReadRequest{LastMessageID: f.LastMessageID}); err != nil {
				cl.SendEvent(errorEvent(f, err))
			}
		case "typing":
			if cl.ConversationID() == "" || !cl.TypingAllowed() {
				return
			}
			h.hub.ToManagers(realtime.NewEvent(realtime.EventTyping, cl.ConversationID(), TypingData{From: "visitor", IsTyping: f.IsTyping}))
		default:
			cl.SendEvent(realtime.Reply(realtime.EventError, f.RequestID, realtime.ErrorData{Code: string(apperr.CodeBadRequest)}))
		}
	}
}

// Manager handles GET /api/v1/manager/ws. RequireStaff has already
// authenticated the session cookie; the connection re-checks it on every
// write and periodically, and logout closes it at once (CloseSession).
func (h *RealtimeHandler) Manager(c *gin.Context) {
	if !h.checkOrigin(c) {
		return
	}
	user, ok := middleware.StaffFromContext(c)
	if !ok {
		apierr.Write(c, apperr.Unauthorized("требуется вход"))
		return
	}
	token, _ := c.Cookie(middleware.ManagerCookieName)
	if !h.admit(c, realtime.RoleManager, user.ID) {
		return
	}
	conn, accepted := h.accept(c)
	if !accepted {
		return
	}
	session := &managerSession{auth: h.auth, token: token, user: user}
	h.hub.Attach(conn, realtime.ClientInfo{
		Role:        realtime.RoleManager,
		IP:          c.ClientIP(),
		StaffID:     user.ID,
		SessionHash: security.HashToken(token),
	}).Run(h.managerFrames(session), session.revalidate)
}

// managerSession re-authenticates the cookie token captured at handshake.
// The token stays in memory only and is never logged.
// It is used from the read goroutine and the keep-alive goroutine.
type managerSession struct {
	auth  middleware.Authenticator
	token string

	mu   sync.Mutex
	user staff.User
}

func (s *managerSession) current() staff.User {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.user
}

func (s *managerSession) revalidate(ctx context.Context) error {
	user, err := s.auth.Authenticate(ctx, s.token)
	var appErr *apperr.Error
	if errors.As(err, &appErr) && (appErr.Code == apperr.CodeUnauthorized || appErr.Code == apperr.CodeForbidden) {
		return realtime.ErrSessionEnded
	}
	if err != nil {
		return err // transient: keep the connection, check again later
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if user.ID != s.user.ID {
		return realtime.ErrSessionEnded
	}
	s.user = user
	return nil
}

func (h *RealtimeHandler) managerFrames(session *managerSession) realtime.FrameHandler {
	return func(ctx context.Context, cl *realtime.Client, f realtime.Frame) {
		ctx, cancel := context.WithTimeout(ctx, frameTimeout)
		defer cancel()

		if f.Type == "send_message" || f.Type == "mark_read" {
			if err := session.revalidate(ctx); err != nil {
				if errors.Is(err, realtime.ErrSessionEnded) {
					cl.SendEvent(realtime.Reply(realtime.EventError, f.RequestID, realtime.ErrorData{Code: string(apperr.CodeUnauthorized), ClientMessageID: f.ClientMessageID}))
					cl.Close(realtime.CloseSessionEnded, "session ended")
					return
				}
				cl.SendEvent(errorEvent(f, apperr.Internal(err)))
				return
			}
		}

		switch f.Type {
		case "send_message":
			res, err := h.manager.SendMessage(ctx, session.current(), f.ConversationID, dto.ManagerSendMessageRequest{ClientMessageID: f.ClientMessageID, Body: f.Body})
			if err != nil {
				cl.SendEvent(errorEvent(f, err))
				return
			}
			ack := realtime.Reply(realtime.EventMessageAck, f.RequestID, AckData{
				ClientMessageID: res.Message.ClientMessageID,
				Created:         res.Created,
				Message:         dto.NewManagerMessageResponse(res.Message),
			})
			ack.ConversationID = res.Message.ConversationID
			cl.SendEvent(ack)
		case "mark_read":
			if _, err := h.manager.MarkRead(ctx, f.ConversationID, dto.MarkChatReadRequest{LastMessageID: f.LastMessageID}); err != nil {
				cl.SendEvent(errorEvent(f, err))
			}
		case "typing":
			if !validConversationID(f.ConversationID) || !cl.TypingAllowed() {
				return
			}
			h.hub.ToConversation(f.ConversationID, realtime.NewEvent(realtime.EventTyping, "", TypingData{From: "manager", IsTyping: f.IsTyping}))
			h.hub.ToManagers(realtime.NewEvent(realtime.EventTyping, f.ConversationID, TypingData{
				From: "manager", IsTyping: f.IsTyping, StaffUserID: session.current().ID, StaffName: session.current().DisplayName,
			}))
		default:
			cl.SendEvent(realtime.Reply(realtime.EventError, f.RequestID, realtime.ErrorData{Code: string(apperr.CodeBadRequest)}))
		}
	}
}

// AckData is the payload of message_ack: the stored message, sent only
// after the transaction committed. Created is false for a retry of an
// already stored client_message_id.
type AckData struct {
	ClientMessageID string `json:"client_message_id"`
	Created         bool   `json:"created"`
	Message         any    `json:"message"`
}

// TypingData is the payload of typing events. Staff identity is only sent
// to managers.
type TypingData struct {
	From        string `json:"from"`
	IsTyping    bool   `json:"is_typing"`
	StaffUserID string `json:"staff_user_id,omitempty"`
	StaffName   string `json:"staff_name,omitempty"`
}

// errorEvent maps a service error to an "error" event answering frame f.
// Internal causes are logged without content and never sent.
func errorEvent(f realtime.Frame, err error) realtime.Event {
	data := realtime.ErrorData{Code: string(apperr.CodeInternal), ClientMessageID: f.ClientMessageID}
	var appErr *apperr.Error
	if errors.As(err, &appErr) {
		data.Code = string(appErr.Code)
		if appErr.Code != apperr.CodeInternal {
			data.Message = appErr.Message
			data.Fields = appErr.Fields
		}
		if appErr.Code == apperr.CodeRateLimit {
			data.RetryAfterSeconds = int(math.Max(1, math.Ceil(appErr.RetryAfter.Seconds())))
		}
	}
	if data.Code == string(apperr.CodeInternal) {
		log.Printf("realtime: %s frame failed: %v", f.Type, err)
	}
	return realtime.Reply(realtime.EventError, f.RequestID, data)
}

func validConversationID(id string) bool {
	if len(id) != 36 {
		return false
	}
	for i, r := range id {
		switch i {
		case 8, 13, 18, 23:
			if r != '-' {
				return false
			}
		default:
			if !(r >= '0' && r <= '9' || r >= 'a' && r <= 'f' || r >= 'A' && r <= 'F') {
				return false
			}
		}
	}
	return true
}
