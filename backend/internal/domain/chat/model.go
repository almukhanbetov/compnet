// Package chat holds the domain model for the visitor ↔ manager chat: a
// conversation owned by an anonymous visitor and its ordered messages.
// Nothing here imports Gin or database drivers.
package chat

import (
	"errors"
	"time"
)

// ErrNotFound is returned by the repository when a conversation (or a
// message inside it) does not exist or does not belong to the caller.
var ErrNotFound = errors.New("chat: not found")

// ErrConversationClosed is returned when a manager replies to a closed
// conversation.
var ErrConversationClosed = errors.New("chat: conversation closed")

// Status is the lifecycle state of a conversation.
type Status string

const (
	StatusOpen   Status = "open"
	StatusClosed Status = "closed"
)

// Author is who wrote a message.
type Author string

const (
	AuthorVisitor Author = "visitor"
	AuthorManager Author = "manager"
	AuthorSystem  Author = "system"
)

// Limits shared by validation and the database CHECK constraints.
const (
	MaxBodyLength        = 2000
	MaxVisitorNameLength = 100
	MaxContactLength     = 200
	MaxPageURLLength     = 500
	MaxUserAgentLength   = 500
)

// Conversation is one visitor's chat thread. VisitorTokenHash is the SHA-256
// of the cookie token; the raw token is never stored.
type Conversation struct {
	ID                string
	VisitorTokenHash  []byte
	VisitorName       string
	VisitorContact    string
	Status            Status
	VisitorLastReadID int64
	ManagerLastReadID int64
	PageURL           string
	UserAgent         string
	LastMessageAt     *time.Time // nil until the first message
	CreatedAt         time.Time
	UpdatedAt         time.Time
	LastMessageID     int64 // derived: newest message id, 0 if none
	UnreadForVisitor  int   // derived: non-visitor messages after VisitorLastReadID
	UnreadForManager  int   // derived: visitor messages after ManagerLastReadID
}

// ConversationSummary is one row of the manager inbox.
type ConversationSummary struct {
	Conversation
	LastMessage *Message // nil only for conversations without messages (never listed)
}

// ConversationCursor marks a position in the inbox, which is ordered by
// last_message_at DESC, id DESC.
type ConversationCursor struct {
	LastMessageAt time.Time
	ID            string
}

// InboxFilter selects and pages the manager inbox. Status "" means all.
type InboxFilter struct {
	Status Status
	After  *ConversationCursor
	Limit  int
}

// MessagePage selects a window of a conversation's history: AfterID > 0
// pages forward (polling for new messages), BeforeID > 0 pages backward
// (older history), neither returns the newest messages.
type MessagePage struct {
	AfterID  int64
	BeforeID int64
	Limit    int
}

// Message is one chat message. ID is monotonically increasing across all
// conversations, which makes it usable as a polling cursor.
type Message struct {
	ID             int64
	ConversationID string
	Author         Author
	StaffUserID    string
	// StaffDisplayName is the author's name for manager messages (derived;
	// only filled where the query joins staff_users).
	StaffDisplayName string
	ClientMessageID  string
	Body             string
	CreatedAt        time.Time
}
