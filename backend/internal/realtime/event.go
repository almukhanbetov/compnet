// Package realtime delivers chat events to connected browsers over
// WebSocket. PostgreSQL stays the source of truth: an event is only ever
// published after the change it describes has been committed, and clients
// re-read the HTTP API after every (re)connect, so a lost event costs a
// delay, never a message. The hub is in-memory and serves one backend
// process (see docs/CHAT_REALTIME.md for running several).
package realtime

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"time"
)

// ProtocolVersion is sent as "v" in every event. Bump it on a breaking
// change of the envelope or of a payload.
const ProtocolVersion = 1

// EventType names a server → client event.
type EventType string

const (
	// EventNewMessage: a message was stored in a conversation.
	EventNewMessage EventType = "new_message"
	// EventMessageAck: answer to the sender's send_message frame, after commit.
	EventMessageAck EventType = "message_ack"
	// EventMessagesRead: one side moved its read marker.
	EventMessagesRead EventType = "messages_read"
	// EventConversationUpdated: status, contact or counters changed.
	EventConversationUpdated EventType = "conversation_updated"
	// EventTyping: the other side is typing (not stored).
	EventTyping EventType = "typing"
	// EventPresence: who is connected right now (not stored).
	EventPresence EventType = "presence"
	// EventError: a client frame was refused.
	EventError EventType = "error"
	// EventPong: answer to the client's application-level ping.
	EventPong EventType = "pong"
)

// Event is the envelope of every server → client message.
type Event struct {
	V    int       `json:"v"`
	Type EventType `json:"type"`
	// EventID is unique per event; clients may use it to drop repeats.
	EventID string `json:"event_id"`
	// TS is the server time the event was created, UTC.
	TS time.Time `json:"ts"`
	// ConversationID is set on manager-side events about one conversation.
	// Visitors never see conversation ids: their cookie is the only handle.
	ConversationID string `json:"conversation_id,omitempty"`
	// RequestID echoes the client frame an ack/error/pong answers.
	RequestID string `json:"request_id,omitempty"`
	Data      any    `json:"data,omitempty"`
}

// NewEvent builds an event stamped with a fresh id and the current UTC time.
func NewEvent(typ EventType, conversationID string, data any) Event {
	return Event{
		V:              ProtocolVersion,
		Type:           typ,
		EventID:        newEventID(),
		TS:             time.Now().UTC(),
		ConversationID: conversationID,
		Data:           data,
	}
}

// Reply builds an event answering the client frame with the given request id.
func Reply(typ EventType, requestID string, data any) Event {
	ev := NewEvent(typ, "", data)
	ev.RequestID = requestID
	return ev
}

// ErrorData is the payload of an "error" event. Code is one of the apperr
// codes (validation_error, rate_limited, not_found, conflict, unauthorized,
// forbidden, bad_request, internal_error); clients translate codes, never
// show Message as is.
type ErrorData struct {
	Code              string            `json:"code"`
	Message           string            `json:"message,omitempty"`
	Fields            map[string]string `json:"fields,omitempty"`
	RetryAfterSeconds int               `json:"retry_after_seconds,omitempty"`
	ClientMessageID   string            `json:"client_message_id,omitempty"`
}

// Frame is a client → server message. Which fields apply depends on Type:
//
//	send_message: client_message_id, body (+ conversation_id for managers)
//	mark_read:    last_message_id (+ conversation_id for managers)
//	typing:       is_typing (+ conversation_id for managers)
//	ping:         —
//
// request_id is echoed in the matching ack/error/pong.
type Frame struct {
	Type            string `json:"type"`
	RequestID       string `json:"request_id"`
	ConversationID  string `json:"conversation_id"`
	ClientMessageID string `json:"client_message_id"`
	Body            string `json:"body"`
	LastMessageID   int64  `json:"last_message_id"`
	IsTyping        bool   `json:"is_typing"`
}

// encode marshals an event once, so a broadcast to many clients does not
// repeat the work.
func encode(ev Event) ([]byte, error) {
	return json.Marshal(ev)
}

func newEventID() string {
	var b [12]byte
	_, _ = rand.Read(b[:])
	return hex.EncodeToString(b[:])
}
