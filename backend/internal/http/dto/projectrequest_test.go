package dto

import (
	"strings"
	"testing"
)

func validProjectRequest() CreateProjectRequestRequest {
	return CreateProjectRequestRequest{
		Name:          "Айгерим",
		Phone:         "+7 701 123 45 67",
		ProjectType:   "mobile-app",
		Description:   "Приложение для доставки",
		ContactMethod: "phone",
		Consent:       true,
		Calculator: CalculatorSelectionInput{
			DesignLevelID: "basic",
			ComplexityID:  "standard",
			UrgencyID:     "normal",
		},
	}
}

// Limits are counted in characters: Cyrillic, Kazakh letters and emoji take
// 2–4 bytes each in UTF-8 but count once.
func TestCreateProjectRequestRequest_ValidateUnicodeLengths(t *testing.T) {
	tests := []struct {
		name    string
		mutate  func(*CreateProjectRequestRequest)
		field   string
		invalid bool
	}{
		{"cyrillic name at limit", func(r *CreateProjectRequestRequest) { r.Name = strings.Repeat("Ж", 200) }, "name", false},
		{"cyrillic name over limit", func(r *CreateProjectRequestRequest) { r.Name = strings.Repeat("Ж", 201) }, "name", true},
		{"kazakh company at limit", func(r *CreateProjectRequestRequest) { r.Company = strings.Repeat("ұ", 200) }, "company", false},
		{"kazakh company over limit", func(r *CreateProjectRequestRequest) { r.Company = strings.Repeat("ұ", 201) }, "company", true},
		{"cyrillic description at limit", func(r *CreateProjectRequestRequest) { r.Description = strings.Repeat("д", 2000) }, "description", false},
		{"cyrillic description over limit", func(r *CreateProjectRequestRequest) { r.Description = strings.Repeat("д", 2001) }, "description", true},
		{"emoji description at limit", func(r *CreateProjectRequestRequest) { r.Description = strings.Repeat("🚀", 2000) }, "description", false},
		{"ascii description over limit", func(r *CreateProjectRequestRequest) { r.Description = strings.Repeat("a", 2001) }, "description", true},
		{"surrounding spaces not counted", func(r *CreateProjectRequestRequest) { r.Description = "  " + strings.Repeat("д", 2000) + "\n" }, "description", false},
		{"budget with tenge sign at limit", func(r *CreateProjectRequestRequest) { r.BudgetRange = strings.Repeat("₸", 100) }, "budget_range", false},
		{"budget over limit", func(r *CreateProjectRequestRequest) { r.BudgetRange = strings.Repeat("₸", 101) }, "budget_range", true},
		{"timeline at limit", func(r *CreateProjectRequestRequest) { r.DesiredTimeline = strings.Repeat("м", 100) }, "desired_timeline", false},
		{"timeline over limit", func(r *CreateProjectRequestRequest) { r.DesiredTimeline = strings.Repeat("м", 101) }, "desired_timeline", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := validProjectRequest()
			tt.mutate(&req)
			fields := req.Validate()
			if _, got := fields[tt.field]; got != tt.invalid {
				t.Fatalf("%s invalid = %v, want %v (fields %v)", tt.field, got, tt.invalid, fields)
			}
			if !tt.invalid && len(fields) != 0 {
				t.Fatalf("unexpected errors: %v", fields)
			}
		})
	}
}

func TestCreateProjectRequestRequest_IsBot(t *testing.T) {
	for _, tt := range []struct {
		website string
		want    bool
	}{
		{"", false},
		{"   ", false},
		{"https://spam.example", true},
		{"x", true},
	} {
		req := validProjectRequest()
		req.Website = tt.website
		if got := req.IsBot(); got != tt.want {
			t.Errorf("IsBot(%q) = %v, want %v", tt.website, got, tt.want)
		}
	}
}
