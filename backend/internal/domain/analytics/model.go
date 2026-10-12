// Package analytics holds the domain model of the first-party visit
// analytics: anonymous browser sessions, their events, and the conversions
// (requests, first chat messages) the backend links to them.
package analytics

import (
	"errors"
	"time"
)

// EventType names an analytics event.
type EventType string

const (
	EventPageView     EventType = "page_view"
	EventPromoView    EventType = "promo_view"
	EventPromoClick   EventType = "promo_click"
	EventWhatsApp     EventType = "whatsapp_click"
	EventPhone        EventType = "phone_click"
	EventChatOpen     EventType = "chat_open"
	EventChatFirstMsg EventType = "chat_first_message" // backend only, after the message is stored
	EventLeadSubmit   EventType = "lead_submit"        // backend only, after the request is stored
)

// ClientEventTypes are the only types a browser may send. Conversions are
// never accepted from the client: the backend records them itself after
// the data was saved.
var ClientEventTypes = map[EventType]bool{
	EventPageView:   true,
	EventPromoView:  true,
	EventPromoClick: true,
	EventWhatsApp:   true,
	EventPhone:      true,
	EventChatOpen:   true,
}

// Limits.
const (
	MaxBatchEvents      = 20   // events per request
	MaxEventsPerSession = 1000 // further events of a session are dropped
	MaxPathLength       = 300
	MaxUTMLength        = 100
	MaxHostLength       = 253
	MaxPeriodDays       = 366
	RecentSessionsLimit = 50
	TopListLimit        = 20
)

// ErrSessionMismatch: the session id exists but belongs to another visitor.
var ErrSessionMismatch = errors.New("analytics: session belongs to another visitor")

// ErrNotFound: no such session.
var ErrNotFound = errors.New("analytics: not found")

// Attribution is where a session (or a visitor, first touch) came from.
type Attribution struct {
	Source       string // utm_source, a referrer site, or "(direct)"
	Medium       string // utm_medium, organic/social/referral, or "(none)"
	Campaign     string
	Term         string
	Content      string
	ReferrerHost string
}

// Session is one browser visit; a new one starts after 30 minutes without
// activity (decided by the browser, which keeps the id).
type Session struct {
	ID          string
	VisitorID   string
	StartedAt   time.Time
	LastSeenAt  time.Time
	LandingPath string
	Attribution
	First    Attribution // only Source, Medium, Campaign are kept
	Device   string      // desktop, mobile, tablet
	Language string      // ru, kk, en or ""
}

// Event is one stored event. OccurredAt is server time (UTC).
type Event struct {
	ID               string
	SessionID        string
	VisitorID        string
	Type             EventType
	OccurredAt       time.Time
	Path             string
	ProjectRequestID string
	ConversationID   string
}
