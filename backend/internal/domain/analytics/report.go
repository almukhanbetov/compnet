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

// LeadFilter narrows the requests report; empty fields mean "any".
// Channel "unknown" also matches requests without a stored source.
type LeadFilter struct {
	Channel     string
	Page        string // the page the form was sent from
	ProjectType string
}

// IsEmpty reports a report over all requests of the period.
func (f LeadFilter) IsEmpty() bool {
	return f.Channel == "" && f.Page == "" && f.ProjectType == ""
}

// LeadStatusCounts groups request statuses for the cards. Earlier status
// values count with their working successor (contacted, qualified and
// proposal_sent are in progress, accepted is completed).
type LeadStatusCounts struct {
	New        int
	InProgress int
	Completed  int
	Rejected   int
	Archived   int
}

// LeadCount is one row of a breakdown (channel, page, project type, day).
type LeadCount struct {
	Key   string
	Count int
}

// LeadSourceRow is a channel with its source (google, instagram, a host…).
type LeadSourceRow struct {
	Channel string
	Source  string
	Count   int
}

// LeadConversion compares like with like: sessions of consenting browsers
// started in the period, and how many of them sent a request. Only
// computed for the unfiltered report (a page or project type filter has
// no matching number of sessions); Available is false then.
type LeadConversion struct {
	Available           bool
	Sessions            int
	SessionsWithRequest int
}

// LeadsReport is the requests part of the statistics: counted from the
// requests themselves (every request, with or without consent), broken
// down by their stored source. Counts only — no contacts or texts.
type LeadsReport struct {
	Total         int
	Tracked       int // requests with a stored source
	Status        LeadStatusCounts
	GoogleOrganic int // organic search from Google
	Paid          int // paid search + paid social
	Social        int // social + paid social
	Channels      []LeadCount
	Sources       []LeadSourceRow
	Pages         []LeadCount // "" = unknown page
	ServicePages  []LeadCount // pages under /services/
	ProjectTypes  []LeadCount
	Days          []LeadCount // YYYY-MM-DD, Asia/Almaty, every day of the period
	Conversion    LeadConversion
}
