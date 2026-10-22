// Package projectrequest holds the domain model for development project
// requests: the request itself, the selected calculator add-ons, and the
// server-computed price estimate. Nothing here imports Gin or database
// drivers.
package projectrequest

import (
	"errors"
	"time"
)

// ErrNotFound is returned when a request does not exist.
var ErrNotFound = errors.New("projectrequest: not found")

// Status is the lifecycle state of a project request.
type Status string

const (
	// The working statuses managers set.
	StatusNew        Status = "new"
	StatusInProgress Status = "in_progress"
	StatusCompleted  Status = "completed"
	StatusRejected   Status = "rejected"

	// Earlier values still accepted by the database. No code path sets them;
	// rows carrying them are shown with their own labels.
	StatusContacted    Status = "contacted"
	StatusQualified    Status = "qualified"
	StatusProposalSent Status = "proposal_sent"
	StatusAccepted     Status = "accepted"
	StatusArchived     Status = "archived"
)

// ManagerStatuses are the statuses a manager can set and filter by.
var ManagerStatuses = map[Status]bool{
	StatusNew: true, StatusInProgress: true, StatusCompleted: true, StatusRejected: true,
}

// ContactMethod is how the client prefers to be reached back.
type ContactMethod string

const (
	ContactMethodPhone    ContactMethod = "phone"
	ContactMethodWhatsApp ContactMethod = "whatsapp"
	ContactMethodTelegram ContactMethod = "telegram"
	ContactMethodEmail    ContactMethod = "email"
)

// ProjectRequest is a lead submitted through the public estimate form.
type ProjectRequest struct {
	ID              string
	Number          int64
	Name            string
	Phone           string
	Email           string
	Company         string
	ProjectType     string
	Description     string
	BudgetRange     string
	DesiredTimeline string
	ContactMethod   ContactMethod
	Consent         bool
	Status          Status
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

// Feature is one calculator add-on module selected for a request, with its
// price snapshot at submission time.
type Feature struct {
	ID               string
	ProjectRequestID string
	ModuleID         string
	Quantity         int
	UnitPriceTenge   int64
}

// Estimate is the server-computed price snapshot for a request.
type Estimate struct {
	ID               string
	ProjectRequestID string
	PricingVersion   string
	IsIndividual     bool
	MinimumTenge     *int64
	MaximumTenge     *int64
	DurationLabel    string
	Breakdown        EstimateBreakdown
	CreatedAt        time.Time
}

// EstimateBreakdown captures every input and intermediate amount that went
// into the estimate, stored as JSONB so the calculation stays auditable even
// after pricing rules change.
type EstimateBreakdown struct {
	ProjectType             string            `json:"project_type"`
	ScaleTierID             string            `json:"scale_tier_id,omitempty"`
	DesignLevelID           string            `json:"design_level_id"`
	ComplexityID            string            `json:"complexity_id"`
	UrgencyID               string            `json:"urgency_id"`
	Multilingual            bool              `json:"multilingual"`
	BasePriceTenge          *int64            `json:"base_price_tenge"`
	ScalePriceTenge         *int64            `json:"scale_price_tenge"`
	Modules                 []BreakdownModule `json:"modules"`
	ModulesTotalTenge       int64             `json:"modules_total_tenge"`
	DesignAmountTenge       int64             `json:"design_amount_tenge"`
	MultilingualAmountTenge int64             `json:"multilingual_amount_tenge"`
	SubtotalTenge           *int64            `json:"subtotal_tenge"`
	EstimatedRawTenge       *int64            `json:"estimated_raw_tenge"`
}

// BreakdownModule is one line item inside EstimateBreakdown.Modules.
type BreakdownModule struct {
	ModuleID       string `json:"module_id"`
	Quantity       int    `json:"quantity"`
	UnitPriceTenge int64  `json:"unit_price_tenge"`
	TotalTenge     int64  `json:"total_tenge"`
}

// MaxNoteLength is the limit of the manager's note, in characters (the
// database CHECK uses the same value).
const MaxNoteLength = 4000

// ListFilter selects requests for the manager list. Zero values mean "any".
type ListFilter struct {
	Query  string    // matched against number, name, contacts, company, description
	Status Status    // one status, or "" for all
	From   time.Time // created_at >= From
	To     time.Time // created_at < To
	Limit  int
	Offset int
}

// StaffRef names the staff member who did something.
type StaffRef struct {
	ID   string
	Name string
}

// Note is the manager's internal note on a request.
type Note struct {
	Text      string
	UpdatedAt *time.Time
	UpdatedBy *StaffRef
}

// StatusChange is one entry of a request's status history.
type StatusChange struct {
	ID        int64
	OldStatus Status
	NewStatus Status
	Staff     StaffRef
	ChangedAt time.Time
}

// AnalyticsLink is the visit a request was sent from — only when the
// browser had accepted analytics and the session is still kept.
type AnalyticsLink struct {
	SessionID     string
	LinkedAt      time.Time
	LandingPath   string
	Source        string
	Medium        string
	Campaign      string
	Term          string
	Content       string
	ReferrerHost  string
	FirstSource   string
	FirstMedium   string
	FirstCampaign string
	Device        string
	Language      string
}

// Attribution is where a request came from, stored with the request (see
// migrations/…_create_project_request_attribution.sql). Values were
// reported by a consenting browser and sanitized; Channel and Source are
// derived by the backend. Empty strings mean "not reported".
type Attribution struct {
	Channel      string
	Source       string
	SourcePage   string
	PreviousPage string
	LandingPage  string
	ReferrerHost string
	UTMSource    string
	UTMMedium    string
	UTMCampaign  string
	UTMContent   string
	UTMTerm      string
	ClickIDType  string
}

// Detail is everything the manager sees on one request.
type Detail struct {
	Request   ProjectRequest
	Note      Note
	Estimate  *Estimate
	History   []StatusChange
	Analytics *AnalyticsLink
	// Attribution is nil for requests sent without analytics consent and
	// for those received before the source was recorded.
	Attribution *Attribution
}

// Update is a manager's change to a request; nil fields stay as they are.
// An empty Note clears it.
type Update struct {
	Status *Status
	Note   *string
}
