package dto

import "github.com/almukha/compnet-backend/internal/pricing"

// PricingCatalogResponse is GET /api/v1/pricing/catalog: the server-side
// pricing catalog (internal/pricing) as the browser's calculator and
// estimate preview need it — every price and parameter the estimate
// formula uses, read straight from the catalog the server calculates
// requests with. Read-only; requests are still recalculated on the server.
type PricingCatalogResponse struct {
	Version             string  `json:"version"` // pricing.RulesVersion, stored with each estimate
	Currency            string  `json:"currency"`
	RoundStepTenge      int64   `json:"round_step_tenge"`
	MultilingualPercent float64 `json:"multilingual_percent"`
	MaximumRatio        float64 `json:"maximum_ratio"`

	ProjectTypes     []CatalogProjectType     `json:"project_types"`
	ScaleTiers       []CatalogScaleTier       `json:"scale_tiers"`
	Modules          []CatalogModule          `json:"modules"`
	DesignLevels     []CatalogPercentLevel    `json:"design_levels"`
	ComplexityLevels []CatalogMultiplierLevel `json:"complexity_levels"`
	UrgencyLevels    []CatalogMultiplierLevel `json:"urgency_levels"`
	DurationBrackets []CatalogDurationBracket `json:"duration_brackets"`
}

// CatalogProjectType: a nil base price means an individual estimate only.
type CatalogProjectType struct {
	ID              string `json:"id"`
	Label           string `json:"label"`
	BasePriceTenge  *int64 `json:"base_price_tenge"`
	Category        string `json:"category"` // site, app or none (no scale tiers)
	DefaultDuration string `json:"default_duration"`
}

// CatalogScaleTier: a nil add price forces an individual estimate.
type CatalogScaleTier struct {
	ID            string `json:"id"`
	Category      string `json:"category"`
	Label         string `json:"label"`
	AddPriceTenge *int64 `json:"add_price_tenge"`
}

type CatalogModule struct {
	ID         string `json:"id"`
	Label      string `json:"label"`
	PriceTenge int64  `json:"price_tenge"`
	PerUnit    bool   `json:"per_unit"` // multiplied by the number of integrations
}

type CatalogPercentLevel struct {
	ID      string  `json:"id"`
	Percent float64 `json:"percent"`
}

type CatalogMultiplierLevel struct {
	ID         string  `json:"id"`
	Multiplier float64 `json:"multiplier"`
}

// CatalogDurationBracket: ascending; a nil ceiling is the catch-all last one.
type CatalogDurationBracket struct {
	MaxAmountTenge *int64 `json:"max_amount_tenge"`
	Label          string `json:"label"`
}

// NewPricingCatalogResponse copies the catalog, in its order.
func NewPricingCatalogResponse() PricingCatalogResponse {
	out := PricingCatalogResponse{
		Version:             pricing.RulesVersion,
		Currency:            "KZT",
		RoundStepTenge:      pricing.RoundStepTenge,
		MultilingualPercent: pricing.MultilingualPercent,
		MaximumRatio:        pricing.MaximumRatio,
	}
	for _, p := range pricing.ProjectTypes {
		out.ProjectTypes = append(out.ProjectTypes, CatalogProjectType{p.ID, p.Label, p.BasePriceTenge, string(p.Category), p.DefaultDuration})
	}
	for _, t := range pricing.ScaleTiers {
		out.ScaleTiers = append(out.ScaleTiers, CatalogScaleTier{t.ID, string(t.Category), t.Label, t.AddPriceTenge})
	}
	for _, m := range pricing.Modules {
		out.Modules = append(out.Modules, CatalogModule{m.ID, m.Label, m.PriceTenge, m.PerUnit})
	}
	for _, d := range pricing.DesignLevels {
		out.DesignLevels = append(out.DesignLevels, CatalogPercentLevel{d.ID, d.Percent})
	}
	for _, c := range pricing.ComplexityLevels {
		out.ComplexityLevels = append(out.ComplexityLevels, CatalogMultiplierLevel{c.ID, c.Multiplier})
	}
	for _, u := range pricing.UrgencyLevels {
		out.UrgencyLevels = append(out.UrgencyLevels, CatalogMultiplierLevel{u.ID, u.Multiplier})
	}
	for _, b := range pricing.DurationBrackets {
		out.DurationBrackets = append(out.DurationBrackets, CatalogDurationBracket{b.MaxAmountTenge, b.Label})
	}
	return out
}
