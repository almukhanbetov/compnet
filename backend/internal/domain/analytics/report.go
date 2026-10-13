package analytics

import "time"

// Totals are the dashboard cards for a period.
type Totals struct {
	Visitors       int // distinct browser ids with a session started in the period
	Sessions       int
	PageViews      int
	WhatsAppClicks int
	PhoneClicks    int
	// Requests and NewChats come from the operational tables, so they count
	// every request / new conversation, with or without analytics consent.
	Requests int
	NewChats int
	// Linked*: conversions recorded for sessions (consented browsers only).
	LinkedRequests int
	LinkedChats    int
	// ConvertedSessions: sessions started in the period with at least one
	// request or first chat message — a session with both counts once.
	ConvertedSessions int
}

// DayPoint is one Asia/Almaty day of the chart.
type DayPoint struct {
	Day               string // YYYY-MM-DD, Asia/Almaty
	Sessions          int
	PageViews         int
	Requests          int
	NewChats          int
	ConvertedSessions int
}

// SourceRow groups sessions by source/medium (and campaign for campaigns).
type SourceRow struct {
	Source            string
	Medium            string
	Campaign          string
	Sessions          int
	Visitors          int
	ConvertedSessions int
}

// PageRow is a page's views.
type PageRow struct {
	Path     string
	Views    int
	Sessions int
}

// CountRow is a simple breakdown (device, language).
type CountRow struct {
	Key      string
	Sessions int
}

// SessionRow is one session of the recent list.
type SessionRow struct {
	Session
	PageViews       int
	PromoViews      int
	PromoClicks     int
	WhatsAppClicks  int
	PhoneClicks     int
	ChatOpens       int
	RequestIDs      []string
	ConversationIDs []string
}

// Report is everything the dashboard shows for a period.
type Report struct {
	Totals       Totals
	Days         []DayPoint
	Sources      []SourceRow
	FirstSources []SourceRow
	Campaigns    []SourceRow
	Pages        []PageRow
	Devices      []CountRow
	Languages    []CountRow
	Recent       []SessionRow
}

// LinkedRequest is a request linked to a session. Only what the manager
// needs to recognise it; contacts stay in the request itself.
type LinkedRequest struct {
	ID          string
	Number      int64
	ProjectType string
	Status      string
	CreatedAt   time.Time
}

// LinkedConversation is a conversation linked to a session, with what the
// visitor chose to leave in it (visible to managers in /manager anyway).
type LinkedConversation struct {
	ID             string
	Status         string
	VisitorName    string
	VisitorContact string
}

// SessionDetail is one session with its event history and conversions.
type SessionDetail struct {
	Session       SessionRow
	Events        []Event
	Requests      []LinkedRequest
	Conversations []LinkedConversation
}

// Visits is the visit counter at the top of the statistics. A visit is a
// session; a visitor an anonymous browser id; a page view one opened page.
// Today is Asia/Almaty; all time includes days whose details were already
// deleted (stored as daily totals). Since is the first day counted, nil
// before the first visit.
type Visits struct {
	TodaySessions  int
	TodayVisitors  int
	TodayPageViews int
	AllSessions    int64
	AllPageViews   int64
	Since          *time.Time
}
