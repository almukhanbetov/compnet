// Package dto holds HTTP request/response shapes, kept separate from domain
// and database models so the wire format can evolve independently.
package dto

import (
	"regexp"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/almukha/compnet-backend/internal/domain/projectrequest"
)

var (
	emailPattern      = regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)
	phoneStripPattern = regexp.MustCompile(`[^\d+]`)
)

// Length limits are counted in characters (runes), not bytes: a Cyrillic or
// Kazakh letter is two bytes of UTF-8. The site form's maxLength mirrors
// them (frontend/data/contactPage.ts).
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

// TariffSelectionInput is a tariff with its extra modules, and the final
// price the visitor was shown (the server's quote): never used as the price,
// only compared with the server's — a request whose price changed meanwhile
// is refused (409) instead of being saved at an amount nobody saw.
type TariffSelectionInput struct {
	Slug                    string   `json:"slug"`
	ModuleIDs               []string `json:"module_ids"`
	ExternalApiCount        int      `json:"external_api_count"`
	ExpectedFinalPriceTenge int64    `json:"expected_final_price_tenge"`
}

// Validate checks the shape only; the tariff service checks the content.
func (t TariffSelectionInput) Validate(fields map[string]string) {
	if !tariffSlug.MatchString(t.Slug) {
		fields["tariff.slug"] = "выберите тариф"
	}
	if len(t.ModuleIDs) > 20 {
		fields["tariff.module_ids"] = "не больше 20 модулей"
	}
	if t.ExternalApiCount < 0 || t.ExternalApiCount > 50 {
		fields["tariff.external_api_count"] = "от 0 до 50"
	}
}

var tariffSlug = regexp.MustCompile(`^[a-z][a-z0-9-]{1,40}$`)

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
	// Tariff: a request for a tariff instead of an individual estimate
	// (optional). Only the tariff and its extra modules are taken from the
	// client; the price, the promotion and the project type are the server's.
	Tariff *TariffSelectionInput `json:"tariff,omitempty"`
	// AnalyticsSessionID links the saved request to the visit (only sent
	// after analytics consent; optional, ignored when unknown).
	AnalyticsSessionID string `json:"analytics_session_id,omitempty"`
	// Attribution is what a browser with analytics consent knows about
	// its visit. Optional and never a reason to reject a request: invalid
	// values are dropped, not reported (see service/projectrequest).
	Attribution *AttributionInput `json:"attribution,omitempty"`
	// Website is a honeypot: the site form renders it hidden from people, so
	// only bots fill it in. Optional; see IsBot.
	Website string `json:"website,omitempty"`
}

// AttributionInput is the visit's source as the browser reports it. Paths
// only (the server drops query strings and absolute URLs), a host name,
// UTM values and which ad click id was present — never its value.
type AttributionInput struct {
	SourcePage   string `json:"source_page"`
	PreviousPage string `json:"previous_page"`
	LandingPage  string `json:"landing_page"`
	ReferrerHost string `json:"referrer_host"`
	UTMSource    string `json:"utm_source"`
	UTMMedium    string `json:"utm_medium"`
	UTMCampaign  string `json:"utm_campaign"`
	UTMContent   string `json:"utm_content"`
	UTMTerm      string `json:"utm_term"`
	ClickID      string `json:"click_id"`
	// InternalNavigation: the browser's session began on a page reached by
	// a link inside the site (e.g. after 30 minutes of inactivity), so it
	// has no external referrer of its own.
	InternalNavigation bool `json:"internal_navigation"`
}

// IsBot reports whether the honeypot field was filled in.
func (r CreateProjectRequestRequest) IsBot() bool {
	return strings.TrimSpace(r.Website) != ""
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
	case utf8.RuneCountInString(name) > maxNameLength:
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

	if utf8.RuneCountInString(strings.TrimSpace(r.Company)) > maxCompanyLength {
		fields["company"] = "слишком длинное название компании"
	}

	if r.Tariff != nil {
		r.Tariff.Validate(fields)
	} else if strings.TrimSpace(r.ProjectType) == "" {
		fields["project_type"] = "выберите тип проекта"
	}

	description := strings.TrimSpace(r.Description)
	switch {
	case description == "":
		fields["description"] = "кратко опишите задачу"
	case utf8.RuneCountInString(description) > maxDescriptionLength:
		fields["description"] = "слишком длинное описание"
	}

	if utf8.RuneCountInString(strings.TrimSpace(r.BudgetRange)) > maxFreeTextLength {
		fields["budget_range"] = "слишком длинное значение"
	}
	if utf8.RuneCountInString(strings.TrimSpace(r.DesiredTimeline)) > maxFreeTextLength {
		fields["desired_timeline"] = "слишком длинное значение"
	}

	if !validContactMethods[strings.ToLower(strings.TrimSpace(r.ContactMethod))] {
		fields["contact_method"] = "укажите способ связи: phone, whatsapp, telegram или email"
	}

	if !r.Consent {
		fields["consent"] = "нужно согласие на обработку данных"
	}

	// A tariff request carries no individual calculator selection.
	if r.Tariff != nil {
		if r.Tariff.ExternalApiCount < 1 && containsString(r.Tariff.ModuleIDs, "external-api") {
			fields["tariff.external_api_count"] = "укажите количество вызовов внешнего API"
		}
		return fields
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

// TariffResponse: the tariff terms the request was saved with (requests
// sent with a tariff). PromotionApplied is false when the promotion had no
// place left (or had ended) by the time the request was saved.
type TariffResponse struct {
	Slug             string `json:"slug"`
	Version          int    `json:"version"`
	PriceKind        string `json:"price_kind"`
	BasePriceTenge   int64  `json:"base_price_tenge"`
	DiscountTenge    int64  `json:"discount_tenge"`
	PromotionApplied bool   `json:"promotion_applied"`
	FinalPriceTenge  int64  `json:"final_price_tenge"`
}

// ProjectRequestResponse is the 201 response body.
type ProjectRequestResponse struct {
	ID        string           `json:"id"`
	Status    string           `json:"status"`
	Estimate  EstimateResponse `json:"estimate"`
	Tariff    *TariffResponse  `json:"tariff,omitempty"`
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
		Tariff:    newTariffResponse(e.Breakdown.Tariff),
		CreatedAt: r.CreatedAt,
	}
}

func newTariffResponse(t *projectrequest.TariffBreakdown) *TariffResponse {
	if t == nil {
		return nil
	}
	return &TariffResponse{
		Slug: t.Slug, Version: t.Version, PriceKind: t.PriceKind, BasePriceTenge: t.BasePriceTenge,
		DiscountTenge: t.DiscountTenge, PromotionApplied: t.PromotionApplied, FinalPriceTenge: t.FinalPriceTenge,
	}
}
