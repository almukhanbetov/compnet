package dto

import (
	"time"

	"github.com/almukha/compnet-backend/internal/domain/chat"
	"github.com/almukha/compnet-backend/internal/domain/staff"
)

// previewLength caps the last-message preview in the inbox.
const previewLength = 140

// ManagerLoginRequest is the POST /api/v1/manager/auth/login body.
type ManagerLoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// ManagerSendMessageRequest is the POST .../conversations/:id/messages body.
// The author is taken from the session, never from the body.
type ManagerSendMessageRequest struct {
	ClientMessageID string `json:"client_message_id"`
	Body            string `json:"body"`
}

// Validate applies the same rules as visitor messages.
func (r ManagerSendMessageRequest) Validate() map[string]string {
	return SendChatMessageRequest{ClientMessageID: r.ClientMessageID, Body: r.Body}.Validate()
}

// UpdateConversationRequest is the PATCH .../conversations/:id body.
type UpdateConversationRequest struct {
	Status string `json:"status"`
}

// Validate accepts only the known statuses.
func (r UpdateConversationRequest) Validate() map[string]string {
	switch chat.Status(r.Status) {
	case chat.StatusOpen, chat.StatusClosed:
		return map[string]string{}
	default:
		return map[string]string{"status": "допустимо: open или closed"}
	}
}

// StaffUserResponse is the public view of a staff account.
type StaffUserResponse struct {
	ID          string `json:"id"`
	Email       string `json:"email"`
	DisplayName string `json:"display_name"`
	Role        string `json:"role"`
}

// NewStaffUserResponse never exposes the password hash.
func NewStaffUserResponse(u staff.User) StaffUserResponse {
	return StaffUserResponse{ID: u.ID, Email: u.Email, DisplayName: u.DisplayName, Role: string(u.Role)}
}

// ManagerSessionResponse is returned by login.
type ManagerSessionResponse struct {
	User      StaffUserResponse `json:"user"`
	ExpiresAt time.Time         `json:"expires_at"`
}

// ManagerMessageResponse is a message as managers see it.
type ManagerMessageResponse struct {
	ID              int64     `json:"id"`
	Author          string    `json:"author"`
	Body            string    `json:"body"`
	ClientMessageID string    `json:"client_message_id"`
	StaffUserID     string    `json:"staff_user_id,omitempty"`
	StaffName       string    `json:"staff_name,omitempty"`
	CreatedAt       time.Time `json:"created_at"`
}

// NewManagerMessageResponse builds the manager view of a message.
func NewManagerMessageResponse(m chat.Message) ManagerMessageResponse {
	return ManagerMessageResponse{
		ID:              m.ID,
		Author:          string(m.Author),
		Body:            m.Body,
		ClientMessageID: m.ClientMessageID,
		StaffUserID:     m.StaffUserID,
		StaffName:       m.StaffDisplayName,
		CreatedAt:       m.CreatedAt,
	}
}

// NewManagerMessageListResponse maps a slice, never returning null.
func NewManagerMessageListResponse(items []chat.Message) []ManagerMessageResponse {
	result := make([]ManagerMessageResponse, 0, len(items))
	for _, item := range items {
		result = append(result, NewManagerMessageResponse(item))
	}
	return result
}

// ManagerConversationResponse is a conversation as managers see it. Both
// read markers are real server state, not inferred statuses.
type ManagerConversationResponse struct {
	ID                string     `json:"id"`
	Status            string     `json:"status"`
	VisitorName       string     `json:"visitor_name"`
	VisitorContact    string     `json:"visitor_contact"`
	PageURL           string     `json:"page_url"`
	UnreadCount       int        `json:"unread_count"`
	ManagerLastReadID int64      `json:"manager_last_read_id"`
	VisitorLastReadID int64      `json:"visitor_last_read_id"`
	LastMessageID     int64      `json:"last_message_id"`
	LastMessageAt     *time.Time `json:"last_message_at"`
	CreatedAt         time.Time  `json:"created_at"`
}

// NewManagerConversationResponse builds the manager view of a conversation.
func NewManagerConversationResponse(c chat.Conversation) ManagerConversationResponse {
	return ManagerConversationResponse{
		ID:                c.ID,
		Status:            string(c.Status),
		VisitorName:       c.VisitorName,
		VisitorContact:    c.VisitorContact,
		PageURL:           c.PageURL,
		UnreadCount:       c.UnreadForManager,
		ManagerLastReadID: c.ManagerLastReadID,
		VisitorLastReadID: c.VisitorLastReadID,
		LastMessageID:     c.LastMessageID,
		LastMessageAt:     c.LastMessageAt,
		CreatedAt:         c.CreatedAt,
	}
}

// LastMessagePreview is the inbox's shortened last message.
type LastMessagePreview struct {
	ID        int64     `json:"id"`
	Author    string    `json:"author"`
	Body      string    `json:"body"`
	CreatedAt time.Time `json:"created_at"`
}

// ManagerInboxItemResponse is one inbox row.
type ManagerInboxItemResponse struct {
	ManagerConversationResponse
	LastMessage *LastMessagePreview `json:"last_message"`
}

// NewManagerInboxResponse maps inbox rows, never returning null.
func NewManagerInboxResponse(items []chat.ConversationSummary) []ManagerInboxItemResponse {
	result := make([]ManagerInboxItemResponse, 0, len(items))
	for _, item := range items {
		row := ManagerInboxItemResponse{ManagerConversationResponse: NewManagerConversationResponse(item.Conversation)}
		if item.LastMessage != nil {
			body := []rune(item.LastMessage.Body)
			preview := string(body)
			if len(body) > previewLength {
				preview = string(body[:previewLength]) + "…"
			}
			row.LastMessage = &LastMessagePreview{
				ID:        item.LastMessage.ID,
				Author:    string(item.LastMessage.Author),
				Body:      preview,
				CreatedAt: item.LastMessage.CreatedAt,
			}
		}
		result = append(result, row)
	}
	return result
}
