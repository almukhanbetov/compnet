// Package projectrequest holds the domain model for development project
// requests: the request itself, the selected calculator add-ons, and the
// server-computed price estimate. Nothing here imports Gin or database
// drivers.
package projectrequest

import (
	"errors"
	"time"

	"github.com/almukha/compnet-backend/internal/domain/tariff"
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
	// BasePriceVersionID: the base price version (project_type_prices) the
	// estimate was calculated with; "" for tariffs, individual-only types and
	// older estimates. Checked to be still current when the request is saved.
	BasePriceVersionID string
	CreatedAt          time.Time
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
	BasePriceVersion        int               `json:"base_price_version,omitempty"` // 0: seed (no stored version)
	ScalePriceTenge         *int64            `json:"scale_price_tenge"`
	Modules                 []BreakdownModule `json:"modules"`
	ModulesTotalTenge       int64             `json:"modules_total_tenge"`
	DesignAmountTenge       int64             `json:"design_amount_tenge"`
	MultilingualAmountTenge int64             `json:"multilingual_amount_tenge"`
	SubtotalTenge           *int64            `json:"subtotal_tenge"`
	EstimatedRawTenge       *int64            `json:"estimated_raw_tenge"`
	// Tariff: set for a request sent with a tariff; its amounts are the
	// estimate (minimum = maximum = the final price).
	Tariff *TariffBreakdown `json:"tariff,omitempty"`
}

// TariffBreakdown is the tariff part of an estimate, as the server priced it
// when the request was saved.
type TariffBreakdown struct {
	Slug             string `json:"slug"`
	Version          int    `json:"version"`
	PriceKind        string `json:"price_kind"`
	BasePriceTenge   int64  `json:"base_price_tenge"`
	DiscountTenge    int64  `json:"discount_tenge"`
	PromotionSlug    string `json:"promotion_slug,omitempty"`
	PromotionApplied bool   `json:"promotion_applied"`
	FinalPriceTenge  int64  `json:"final_price_tenge"`
}

// TariffOrder is the tariff part of a request to save: the server's quote,
// the final price the visitor was shown (the request is refused when the
// server's differs) and how long an unconfirmed promotional place is held.
type TariffOrder struct {
	Quote              tariff.Quote
	ExpectedFinalTenge int64
	ReservationTTL     time.Duration
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
	// PromotionPlace: the promotional place the request holds or held
	// (requests sent with a tariff on a promotion); nil otherwise.
	PromotionPlace *PromotionPlace
}

// PromotionPlace is a request's promotional place: reserved when saved,
// confirmed when taken into work, released when rejected, archived or not
// confirmed in time.
type PromotionPlace struct {
	PromotionSlug  string
	PromotionTitle string
	Status         string // reserved, confirmed or released
	ReleaseReason  string // rejected, archived or expired
	ReservedAt     time.Time
	ConfirmedAt    *time.Time
	ReleasedAt     *time.Time
}

// Update is a manager's change to a request; nil fields stay as they are.
// An empty Note clears it.
type Update struct {
	Status *Status
	Note   *string
}
