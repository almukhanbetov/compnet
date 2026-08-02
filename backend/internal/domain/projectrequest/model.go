// Package projectrequest holds the domain model for development project
// requests: the request itself, the selected calculator add-ons, and the
// server-computed price estimate. Nothing here imports Gin or database
// drivers.
package projectrequest

import "time"

// Status is the lifecycle state of a project request.
type Status string

const (
	StatusNew          Status = "new"
	StatusContacted    Status = "contacted"
	StatusQualified    Status = "qualified"
	StatusProposalSent Status = "proposal_sent"
	StatusAccepted     Status = "accepted"
	StatusRejected     Status = "rejected"
	StatusArchived     Status = "archived"
)

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
