package dto

import (
	"strings"
	"testing"
)

func TestWhatsAppNumber(t *testing.T) {
	cases := []struct {
		phone, want string
	}{
		{"+77011234567", "77011234567"},   // country code written by the client
		{"+491711234567", "491711234567"}, // any country with '+'
		{"77011234567", "77011234567"},    // +7 zone without '+'
		{"87011234567", "77011234567"},    // Kazakh mobile, trunk prefix 8
		{"89161234567", "79161234567"},    // Russian mobile, trunk prefix 8
		{"7011234567", ""},                // no country code: never guessed
		{"81234567890", ""},               // 8 + other digit: could be Japan (+81)
		{"1234567", ""},                   // too short
		{"+0123456789", ""},               // country codes never start with 0
		{"+123", ""},                      // too short with '+'
		{"", ""},
		{"+7701abc4567", ""},
	}
	for _, c := range cases {
		if got := WhatsAppNumber(c.phone); got != c.want {
			t.Errorf("WhatsAppNumber(%q) = %q, want %q", c.phone, got, c.want)
		}
	}
}

func TestUpdateProjectRequestValidate(t *testing.T) {
	str := func(s string) *string { return &s }
	if f := (UpdateProjectRequestRequest{}).Validate(); f["status"] == "" {
		t.Error("an empty patch must be refused")
	}
	for _, s := range []string{"new", "in_progress", "completed", "rejected"} {
		if f := (UpdateProjectRequestRequest{Status: str(s)}).Validate(); len(f) != 0 {
			t.Errorf("status %q refused: %v", s, f)
		}
	}
	// Earlier database values are not offered to managers.
	for _, s := range []string{"contacted", "archived", "", "NEW"} {
		if f := (UpdateProjectRequestRequest{Status: str(s)}).Validate(); f["status"] == "" {
			t.Errorf("status %q accepted", s)
		}
	}
	if f := (UpdateProjectRequestRequest{Note: str("")}).Validate(); len(f) != 0 {
		t.Errorf("clearing the note refused: %v", f)
	}
	if f := (UpdateProjectRequestRequest{Note: str(strings.Repeat("я", 4000))}).Validate(); len(f) != 0 {
		t.Errorf("4000 characters refused: %v", f)
	}
	if f := (UpdateProjectRequestRequest{Note: str(strings.Repeat("я", 4001))}).Validate(); f["note"] == "" {
		t.Error("4001 characters accepted")
	}
}
