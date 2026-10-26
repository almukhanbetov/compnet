package handler

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"

	"github.com/almukha/compnet-backend/internal/pricing"
)

// The published catalog is the server's catalog, value for value, under
// the field names the frontend reads.
func TestPricingCatalog_MirrorsServerCatalog(t *testing.T) {
	gin.SetMode(gin.TestMode)
	engine := gin.New()
	engine.GET("/pricing/catalog", NewContentHandler(nil).PricingCatalog)
	rec := httptest.NewRecorder()
	engine.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/pricing/catalog", nil))
	if rec.Code != http.StatusOK || rec.Header().Get("Cache-Control") != "public, max-age=300" {
		t.Fatalf("status %d, cache %q", rec.Code, rec.Header().Get("Cache-Control"))
	}
	var body struct {
		Data struct {
			Version             string  `json:"version"`
			Currency            string  `json:"currency"`
			RoundStepTenge      int64   `json:"round_step_tenge"`
			MultilingualPercent float64 `json:"multilingual_percent"`
			MaximumRatio        float64 `json:"maximum_ratio"`
			ProjectTypes        []struct {
				ID             string `json:"id"`
				BasePriceTenge *int64 `json:"base_price_tenge"`
				Category       string `json:"category"`
			} `json:"project_types"`
			ScaleTiers []struct {
				ID            string `json:"id"`
				Category      string `json:"category"`
				AddPriceTenge *int64 `json:"add_price_tenge"`
			} `json:"scale_tiers"`
			Modules []struct {
				ID         string `json:"id"`
				PriceTenge int64  `json:"price_tenge"`
				PerUnit    bool   `json:"per_unit"`
			} `json:"modules"`
			DesignLevels []struct {
				ID      string  `json:"id"`
				Percent float64 `json:"percent"`
			} `json:"design_levels"`
			ComplexityLevels []struct {
				ID         string  `json:"id"`
				Multiplier float64 `json:"multiplier"`
			} `json:"complexity_levels"`
			UrgencyLevels []struct {
				ID         string  `json:"id"`
				Multiplier float64 `json:"multiplier"`
			} `json:"urgency_levels"`
			DurationBrackets []struct {
				MaxAmountTenge *int64 `json:"max_amount_tenge"`
				Label          string `json:"label"`
			} `json:"duration_brackets"`
		} `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	d := body.Data
	if d.Version != pricing.RulesVersion || d.Currency != "KZT" || d.RoundStepTenge != pricing.RoundStepTenge ||
		d.MultilingualPercent != pricing.MultilingualPercent || d.MaximumRatio != pricing.MaximumRatio {
		t.Errorf("parameters: %+v", d)
	}
	eqPtr := func(a, b *int64) bool { return (a == nil) == (b == nil) && (a == nil || *a == *b) }
	if len(d.ProjectTypes) != len(pricing.ProjectTypes) {
		t.Fatalf("project types: %d", len(d.ProjectTypes))
	}
	for i, p := range pricing.ProjectTypes {
		got := d.ProjectTypes[i]
		if got.ID != p.ID || !eqPtr(got.BasePriceTenge, p.BasePriceTenge) || got.Category != string(p.Category) {
			t.Errorf("project type %d: %+v, want %+v", i, got, p)
		}
	}
	if len(d.ScaleTiers) != len(pricing.ScaleTiers) {
		t.Fatalf("scale tiers: %d", len(d.ScaleTiers))
	}
	for i, s := range pricing.ScaleTiers {
		got := d.ScaleTiers[i]
		if got.ID != s.ID || got.Category != string(s.Category) || !eqPtr(got.AddPriceTenge, s.AddPriceTenge) {
			t.Errorf("scale tier %d: %+v", i, got)
		}
	}
	if len(d.Modules) != len(pricing.Modules) {
		t.Fatalf("modules: %d", len(d.Modules))
	}
	for i, m := range pricing.Modules {
		got := d.Modules[i]
		if got.ID != m.ID || got.PriceTenge != m.PriceTenge || got.PerUnit != m.PerUnit {
			t.Errorf("module %d: %+v", i, got)
		}
	}
	for i, l := range pricing.DesignLevels {
		if d.DesignLevels[i].ID != l.ID || d.DesignLevels[i].Percent != l.Percent {
			t.Errorf("design %d", i)
		}
	}
	for i, l := range pricing.ComplexityLevels {
		if d.ComplexityLevels[i].ID != l.ID || d.ComplexityLevels[i].Multiplier != l.Multiplier {
			t.Errorf("complexity %d", i)
		}
	}
	for i, l := range pricing.UrgencyLevels {
		if d.UrgencyLevels[i].ID != l.ID || d.UrgencyLevels[i].Multiplier != l.Multiplier {
			t.Errorf("urgency %d", i)
		}
	}
	for i, b := range pricing.DurationBrackets {
		if !eqPtr(d.DurationBrackets[i].MaxAmountTenge, b.MaxAmountTenge) || d.DurationBrackets[i].Label != b.Label {
			t.Errorf("duration bracket %d", i)
		}
	}
}
