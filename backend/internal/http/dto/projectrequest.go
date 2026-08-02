// Package dto holds HTTP request/response shapes, kept separate from domain
// and database models so the wire format can evolve independently.
package dto

import (
	"regexp"
	"strings"
	"time"

	"github.com/almukha/compnet-backend/internal/domain/projectrequest"
)

var (
	emailPattern      = regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)
	phoneStripPattern = regexp.MustCompile(`[^\d+]`)
)

const (
	maxNameLength        = 200
	maxCompanyLength     = 200
	maxDescriptionLength = 2000
	maxFreeTextLength    = 100
	minPhoneDigits       = 7
)

var validContactMethods = map[string]bool{
	"phone":    true,
	"whatsapp": true,
	"telegram": true,
	"email":    true,
}

// CalculatorSelectionInput is the client's choice of catalog entries. It
// never carries a price — see internal/pricing for server-side lookup.
type CalculatorSelectionInput struct {
	ScaleTierID       string   `json:"scale_tier_id"`
	SelectedModuleIDs []string `json:"selected_module_ids"`
	ExternalApiCount  int      `json:"external_api_count"`
	Multilingual      bool     `json:"multilingual"`
	DesignLevelID     string   `json:"design_level_id"`
	ComplexityID      string   `json:"complexity_id"`
	UrgencyID         string   `json:"urgency_id"`
}

// CreateProjectRequestRequest is the POST /api/v1/project-requests body.
type CreateProjectRequestRequest struct {
	Name            string                   `json:"name"`
	Phone           string                   `json:"phone"`
	Email           string                   `json:"email"`
	Company         string                   `json:"company"`
	ProjectType     string                   `json:"project_type"`
	Description     string                   `json:"description"`
	BudgetRange     string                   `json:"budget_range"`
	DesiredTimeline string                   `json:"desired_timeline"`
	ContactMethod   string                   `json:"contact_method"`
	Consent         bool                     `json:"consent"`
	Calculator      CalculatorSelectionInput `json:"calculator"`
}

// NormalizedPhone strips everything except digits and a leading '+', the
// same normalization applied client-side before this milestone existed.
func NormalizedPhone(raw string) string {
	return phoneStripPattern.ReplaceAllString(strings.TrimSpace(raw), "")
}

// NormalizedEmail lowercases and trims the email for storage/matching.
func NormalizedEmail(raw string) string {
	return strings.ToLower(strings.TrimSpace(raw))
}

// Validate checks structural rules (required fields, formats, lengths) and
// returns per-field error messages. It does NOT check catalog membership
// (unknown project_type/module/etc.) — that only pricing.Calculate can
// resolve, and the service layer merges those errors into the same map.
func (r CreateProjectRequestRequest) Validate() map[string]string {
	fields := map[string]string{}

	name := strings.TrimSpace(r.Name)
	switch {
	case name == "":
		fields["name"] = "укажите имя"
	case len(name) > maxNameLength:
		fields["name"] = "слишком длинное имя"
	}

	phone := NormalizedPhone(r.Phone)
	email := NormalizedEmail(r.Email)

	if phone == "" && email == "" {
		fields["phone"] = "укажите телефон или email"
		fields["email"] = "укажите телефон или email"
	} else {
		if phone != "" && len(phone) < minPhoneDigits {
			fields["phone"] = "проверьте номер телефона"
		}
		if email != "" && !emailPattern.MatchString(email) {
			fields["email"] = "проверьте email"
		}
	}

	if len(strings.TrimSpace(r.Company)) > maxCompanyLength {
		fields["company"] = "слишком длинное название компании"
	}

	if strings.TrimSpace(r.ProjectType) == "" {
		fields["project_type"] = "выберите тип проекта"
	}

	description := strings.TrimSpace(r.Description)
	switch {
	case description == "":
		fields["description"] = "кратко опишите задачу"
	case len(description) > maxDescriptionLength:
		fields["description"] = "слишком длинное описание"
	}

	if len(strings.TrimSpace(r.BudgetRange)) > maxFreeTextLength {
		fields["budget_range"] = "слишком длинное значение"
	}
	if len(strings.TrimSpace(r.DesiredTimeline)) > maxFreeTextLength {
		fields["desired_timeline"] = "слишком длинное значение"
	}

	if !validContactMethods[strings.ToLower(strings.TrimSpace(r.ContactMethod))] {
		fields["contact_method"] = "укажите способ связи: phone, whatsapp, telegram или email"
	}

	if !r.Consent {
		fields["consent"] = "нужно согласие на обработку данных"
	}

	if strings.TrimSpace(r.Calculator.DesignLevelID) == "" {
		fields["calculator.design_level_id"] = "обязательное поле"
	}
	if strings.TrimSpace(r.Calculator.ComplexityID) == "" {
		fields["calculator.complexity_id"] = "обязательное поле"
	}
	if strings.TrimSpace(r.Calculator.UrgencyID) == "" {
		fields["calculator.urgency_id"] = "обязательное поле"
	}
	if r.Calculator.ExternalApiCount < 0 {
		fields["calculator.external_api_count"] = "должно быть не меньше 0"
	}
	if containsString(r.Calculator.SelectedModuleIDs, "external-api") && r.Calculator.ExternalApiCount < 1 {
		fields["calculator.external_api_count"] = "укажите количество вызовов внешнего API"
	}

	return fields
}

func containsString(list []string, target string) bool {
	for _, v := range list {
		if v == target {
			return true
		}
	}
	return false
}

// EstimateResponse is the server-computed estimate returned to the client.
type EstimateResponse struct {
	IsIndividual        bool   `json:"is_individual"`
	MinimumTenge        *int64 `json:"minimum_tenge"`
	MaximumTenge        *int64 `json:"maximum_tenge"`
	DurationLabel       string `json:"duration_label"`
	PricingRulesVersion string `json:"pricing_rules_version"`
}

// ProjectRequestResponse is the 201 response body.
type ProjectRequestResponse struct {
	ID        string           `json:"id"`
	Status    string           `json:"status"`
	Estimate  EstimateResponse `json:"estimate"`
	CreatedAt time.Time        `json:"created_at"`
}

// NewProjectRequestResponse builds the response DTO from domain models.
func NewProjectRequestResponse(r projectrequest.ProjectRequest, e projectrequest.Estimate) ProjectRequestResponse {
	return ProjectRequestResponse{
		ID:     r.ID,
		Status: string(r.Status),
		Estimate: EstimateResponse{
			IsIndividual:        e.IsIndividual,
			MinimumTenge:        e.MinimumTenge,
			MaximumTenge:        e.MaximumTenge,
			DurationLabel:       e.DurationLabel,
			PricingRulesVersion: e.PricingVersion,
		},
		CreatedAt: r.CreatedAt,
	}
}
