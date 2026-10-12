// Package chatevents turns committed chat changes into realtime events.
// Services call it only after their transaction has committed; it re-reads
// the conversation (fresh counters, status) and sends each side the view it
// is allowed to see: visitors get the visitor DTOs of their own
// conversation, managers the manager DTOs plus the inbox totals.
//
// Publishing is best effort. If it fails, or the process dies between the
// commit and the publish, nothing is lost: clients re-read the HTTP API
// after every reconnect and from their fallback polling.
package chatevents

import (
	"context"
	"log"
	"time"

	"github.com/almukha/compnet-backend/internal/domain/chat"
	"github.com/almukha/compnet-backend/internal/http/dto"
	"github.com/almukha/compnet-backend/internal/realtime"
)

// Repository is what the publisher reads after a commit.
type Repository interface {
	FindByID(ctx context.Context, id string) (chat.Conversation, error)
	ManagerUnread(ctx context.Context) (conversations, messages int, err error)
}

// Hub delivers events (implemented by *realtime.Hub).
type Hub interface {
	ToConversation(conversationID string, ev realtime.Event)
	ToManagers(ev realtime.Event)
}

// Publisher implements the Publisher interfaces of the chat services.
type Publisher struct {
	repo Repository
	hub  Hub
}

// New builds a Publisher.
func New(repo Repository, hub Hub) *Publisher {
	return &Publisher{repo: repo, hub: hub}
}

// publishTimeout bounds the reads done for one event. The request context
// is detached from: a visitor closing the tab right after sending must not
// stop the manager from being notified.
const publishTimeout = 3 * time.Second

// UnreadTotal is the managers' unread badge.
type UnreadTotal struct {
	Conversations int `json:"conversations"`
	Messages      int `json:"messages"`
}

// VisitorMessageData is new_message as a visitor receives it.
type VisitorMessageData struct {
	Message     dto.ChatMessageResponse `json:"message"`
	UnreadCount int                     `json:"unread_count"`
}

// ManagerMessageData is new_message as managers receive it: the message and
// the conversation's inbox row, so a new conversation can be inserted into
// the list without another request.
type ManagerMessageData struct {
	Message      dto.ManagerMessageResponse   `json:"message"`
	Conversation dto.ManagerInboxItemResponse `json:"conversation"`
	UnreadTotal  UnreadTotal                  `json:"unread_total"`
}

// VisitorReadData is messages_read for a visitor. Reader "manager" lets the
// widget mark own messages as read; reader "visitor" syncs other tabs.
type VisitorReadData struct {
	Reader      string `json:"reader"`
	LastReadID  int64  `json:"last_read_id"`
	UnreadCount int    `json:"unread_count"`
}

// ManagerReadData is messages_read for managers.
type ManagerReadData struct {
	Reader       string                          `json:"reader"`
	LastReadID   int64                           `json:"last_read_id"`
	Conversation dto.ManagerConversationResponse `json:"conversation"`
	UnreadTotal  UnreadTotal                     `json:"unread_total"`
}

// VisitorConversationData is conversation_updated for a visitor.
type VisitorConversationData struct {
	Conversation dto.ChatConversationResponse `json:"conversation"`
}

// ManagerConversationData is conversation_updated for managers.
type ManagerConversationData struct {
	Conversation dto.ManagerConversationResponse `json:"conversation"`
	UnreadTotal  UnreadTotal                     `json:"unread_total"`
}

// MessageStored announces a committed message (also on an idempotent retry,
// in case the first publish was lost; clients drop the repeat by id).
func (p *Publisher) MessageStored(ctx context.Context, msg chat.Message) {
	ctx, cancel := detached(ctx)
	defer cancel()
	conv, total, ok := p.load(ctx, msg.ConversationID)
	if !ok {
		return
	}
	p.hub.ToConversation(conv.ID, realtime.NewEvent(realtime.EventNewMessage, "", VisitorMessageData{
		Message:     dto.NewChatMessageResponse(msg),
		UnreadCount: conv.UnreadForVisitor,
	}))
	row := dto.NewManagerInboxResponse([]chat.ConversationSummary{{Conversation: conv, LastMessage: &msg}})[0]
	p.hub.ToManagers(realtime.NewEvent(realtime.EventNewMessage, conv.ID, ManagerMessageData{
		Message:      dto.NewManagerMessageResponse(msg),
		Conversation: row,
		UnreadTotal:  total,
	}))
}

// ReadMarked announces that one side moved its read marker.
func (p *Publisher) ReadMarked(ctx context.Context, conversationID string, reader chat.Author) {
	ctx, cancel := detached(ctx)
	defer cancel()
	conv, total, ok := p.load(ctx, conversationID)
	if !ok {
		return
	}
	lastRead := conv.VisitorLastReadID
	if reader == chat.AuthorManager {
		lastRead = conv.ManagerLastReadID
	}
	p.hub.ToConversation(conv.ID, realtime.NewEvent(realtime.EventMessagesRead, "", VisitorReadData{
		Reader:      string(reader),
		LastReadID:  lastRead,
		UnreadCount: conv.UnreadForVisitor,
	}))
	p.hub.ToManagers(realtime.NewEvent(realtime.EventMessagesRead, conv.ID, ManagerReadData{
		Reader:       string(reader),
		LastReadID:   lastRead,
		Conversation: dto.NewManagerConversationResponse(conv),
		UnreadTotal:  total,
	}))
}

// ConversationChanged announces a status or contact change.
func (p *Publisher) ConversationChanged(ctx context.Context, conversationID string) {
	ctx, cancel := detached(ctx)
	defer cancel()
	conv, total, ok := p.load(ctx, conversationID)
	if !ok {
		return
	}
	p.hub.ToConversation(conv.ID, realtime.NewEvent(realtime.EventConversationUpdated, "", VisitorConversationData{
		Conversation: dto.NewChatConversationResponse(conv),
	}))
	p.hub.ToManagers(realtime.NewEvent(realtime.EventConversationUpdated, conv.ID, ManagerConversationData{
		Conversation: dto.NewManagerConversationResponse(conv),
		UnreadTotal:  total,
	}))
}

func (p *Publisher) load(ctx context.Context, conversationID string) (chat.Conversation, UnreadTotal, bool) {
	conv, err := p.repo.FindByID(ctx, conversationID)
	if err != nil {
		log.Printf("chatevents: load conversation: %v", err) // no ids or content in logs
		return chat.Conversation{}, UnreadTotal{}, false
	}
	convs, msgs, err := p.repo.ManagerUnread(ctx)
	if err != nil {
		log.Printf("chatevents: unread totals: %v", err)
		return chat.Conversation{}, UnreadTotal{}, false
	}
	return conv, UnreadTotal{Conversations: convs, Messages: msgs}, true
}

func detached(ctx context.Context) (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.WithoutCancel(ctx), publishTimeout)
}
