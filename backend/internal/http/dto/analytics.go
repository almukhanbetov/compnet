package dto

import (
	"regexp"
	"strings"

	"github.com/almukha/compnet-backend/internal/domain/analytics"
)

var analyticsUUID = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)

// AnalyticsUTM is the campaign tagging the browser read from the landing URL.
type AnalyticsUTM struct {
	Source   string `json:"source"`
	Medium   string `json:"medium"`
	Campaign string `json:"campaign"`
	Term     string `json:"term"`
	Content  string `json:"content"`
}

// AnalyticsTouch is how a session (or the visitor's first visit) started.
// Only the referrer's host is sent, never its path or query.
type AnalyticsTouch struct {
	UTM          AnalyticsUTM `json:"utm"`
	ReferrerHost string       `json:"referrer_host"`
	LandingPath  string       `json:"landing_path"`
}

// AnalyticsEventInput is one event from the browser. Only the type and the
// page path: no form values, no text, no contacts.
type AnalyticsEventInput struct {
	ID   string `json:"id"`
	Type string `json:"type"`
	Path string `json:"path"`
}

// AnalyticsBatchRequest is POST /api/v1/analytics/events. The session
// context is sent with every batch and used only when the session is first
// seen.
type AnalyticsBatchRequest struct {
	VisitorID  string                `json:"visitor_id"`
	SessionID  string                `json:"session_id"`
	Language   string                `json:"language"`
	Session    AnalyticsTouch        `json:"session"`
	FirstTouch AnalyticsTouch        `json:"first_touch"`
	Events     []AnalyticsEventInput `json:"events"`
}

// Validate checks ids, the batch size and that every type is one a browser
// may send (conversions are recorded by the backend only).
func (r AnalyticsBatchRequest) Validate() map[string]string {
	fields := map[string]string{}
	if !analyticsUUID.MatchString(r.VisitorID) {
		fields["visitor_id"] = "нужен UUID"
	}
	if !analyticsUUID.MatchString(r.SessionID) {
		fields["session_id"] = "нужен UUID"
	}
	if len(r.Events) == 0 || len(r.Events) > analytics.MaxBatchEvents {
		fields["events"] = "от 1 до 20 событий"
		return fields
	}
	seen := map[string]bool{}
	for _, e := range r.Events {
		id := strings.ToLower(e.ID)
		if !analyticsUUID.MatchString(e.ID) || seen[id] {
			fields["events.id"] = "нужен уникальный UUID"
		}
		seen[id] = true
		if !analytics.ClientEventTypes[analytics.EventType(e.Type)] {
			fields["events.type"] = "недопустимый тип события"
		}
	}
	return fields
}
