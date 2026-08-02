package pricing

import (
	"errors"
	"testing"
)

func TestCalculate_StandardProject(t *testing.T) {
	input := CalculateInput{
		ProjectTypeID:     "online-store",
		ScaleTierID:       "site-m",
		SelectedModuleIDs: []string{"online-payment", "search-filters", "external-api"},
		ExternalApiCount:  2,
		Multilingual:      false,
		DesignLevelID:     "custom",
		ComplexityID:      "medium",
		UrgencyID:         "normal",
	}

	got, err := Calculate(input)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if got.IsIndividual {
		t.Fatalf("expected a concrete estimate, got individual")
	}

	// base 500000 + scale 80000 + modules (120000+80000+200000=400000) = 980000
	if *got.SubtotalTenge != 980000 {
		t.Errorf("subtotal = %d, want 980000", *got.SubtotalTenge)
	}
	// design custom 15% of 980000 = 147000
	if got.DesignAmountTenge != 147000 {
		t.Errorf("design amount = %d, want 147000", got.DesignAmountTenge)
	}
	// (980000+147000) * 1.1 (medium) * 1.0 (normal) = 1239700 -> rounded to 1240000
	if *got.MinimumTenge != 1240000 {
		t.Errorf("minimum = %d, want 1240000", *got.MinimumTenge)
	}
	// 1240000 * 1.2 = 1488000 -> rounded to 1490000
	if *got.MaximumTenge != 1490000 {
		t.Errorf("maximum = %d, want 1490000", *got.MaximumTenge)
	}
	if got.DurationLabel != "6–10 недель" {
		t.Errorf("duration label = %q, want %q", got.DurationLabel, "6–10 недель")
	}
}

func TestCalculate_MultilingualSurcharge(t *testing.T) {
	input := CalculateInput{
		ProjectTypeID:     "landing",
		ScaleTierID:       "site-s",
		SelectedModuleIDs: nil,
		Multilingual:      true,
		DesignLevelID:     "basic",
		ComplexityID:      "standard",
		UrgencyID:         "normal",
	}

	got, err := Calculate(input)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// base 120000 + scale 0 = 120000; +10% multilingual = 132000; x1x1 -> round to 10k = 130000
	if *got.MinimumTenge != 130000 {
		t.Errorf("minimum = %d, want 130000", *got.MinimumTenge)
	}
}

func TestCalculate_NoScaleCategorySkipsTier(t *testing.T) {
	input := CalculateInput{
		ProjectTypeID: "backend-api",
		ScaleTierID:   "", // must be ignored for category "none"
		DesignLevelID: "basic",
		ComplexityID:  "standard",
		UrgencyID:     "normal",
	}

	got, err := Calculate(input)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.IsIndividual {
		t.Fatalf("expected concrete estimate for backend-api")
	}
	if *got.ScalePriceTenge != 0 {
		t.Errorf("scale price = %d, want 0", *got.ScalePriceTenge)
	}
}

func TestCalculate_IndividualProjectType(t *testing.T) {
	input := CalculateInput{
		ProjectTypeID: "other",
		DesignLevelID: "basic",
		ComplexityID:  "standard",
		UrgencyID:     "normal",
	}

	got, err := Calculate(input)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !got.IsIndividual {
		t.Fatalf("expected individual estimate for project type 'other'")
	}
	if got.MinimumTenge != nil || got.MaximumTenge != nil {
		t.Errorf("expected nil min/max for individual estimate, got %v/%v", got.MinimumTenge, got.MaximumTenge)
	}
}

func TestCalculate_IndividualScaleTier(t *testing.T) {
	input := CalculateInput{
		ProjectTypeID: "online-store",
		ScaleTierID:   "site-xl",
		DesignLevelID: "basic",
		ComplexityID:  "standard",
		UrgencyID:     "normal",
	}

	got, err := Calculate(input)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !got.IsIndividual {
		t.Fatalf("expected individual estimate for oversized scale tier")
	}
}

func TestCalculate_PerUnitModuleClampedAtZero(t *testing.T) {
	input := CalculateInput{
		ProjectTypeID:     "landing",
		ScaleTierID:       "site-s",
		SelectedModuleIDs: []string{"external-api"},
		ExternalApiCount:  -5,
		DesignLevelID:     "basic",
		ComplexityID:      "standard",
		UrgencyID:         "normal",
	}

	got, err := Calculate(input)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.Modules[0].Quantity != 0 || got.Modules[0].TotalTenge != 0 {
		t.Errorf("expected clamped zero quantity, got %+v", got.Modules[0])
	}
}

func TestCalculate_Errors(t *testing.T) {
	base := func() CalculateInput {
		return CalculateInput{
			ProjectTypeID: "landing",
			ScaleTierID:   "site-s",
			DesignLevelID: "basic",
			ComplexityID:  "standard",
			UrgencyID:     "normal",
		}
	}

	tests := []struct {
		name    string
		mutate  func(CalculateInput) CalculateInput
		wantErr error
	}{
		{"unknown project type", func(i CalculateInput) CalculateInput { i.ProjectTypeID = "does-not-exist"; return i }, ErrUnknownProjectType},
		{"unknown scale tier", func(i CalculateInput) CalculateInput { i.ScaleTierID = "does-not-exist"; return i }, ErrUnknownScaleTier},
		{"mismatched scale tier category", func(i CalculateInput) CalculateInput { i.ScaleTierID = "app-s"; return i }, ErrUnknownScaleTier},
		{"unknown module", func(i CalculateInput) CalculateInput { i.SelectedModuleIDs = []string{"does-not-exist"}; return i }, ErrUnknownModule},
		{"duplicate module", func(i CalculateInput) CalculateInput { i.SelectedModuleIDs = []string{"auth", "auth"}; return i }, ErrDuplicateModule},
		{"unknown design level", func(i CalculateInput) CalculateInput { i.DesignLevelID = "does-not-exist"; return i }, ErrUnknownDesignLevel},
		{"unknown complexity", func(i CalculateInput) CalculateInput { i.ComplexityID = "does-not-exist"; return i }, ErrUnknownComplexity},
		{"unknown urgency", func(i CalculateInput) CalculateInput { i.UrgencyID = "does-not-exist"; return i }, ErrUnknownUrgency},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := Calculate(tt.mutate(base()))
			if !errors.Is(err, tt.wantErr) {
				t.Errorf("got err %v, want %v", err, tt.wantErr)
			}
		})
	}
}
