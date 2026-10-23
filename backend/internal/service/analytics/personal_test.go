package analytics

import (
	"strings"
	"testing"
)

// makeIIN completes 11 digits with the official check digit (synthetic
// numbers only; no real person's IIN is used in tests).
func makeIIN(t *testing.T, first11 string) string {
	t.Helper()
	for c := '0'; c <= '9'; c++ {
		if candidate := first11 + string(c); validIIN(candidate) {
			return candidate
		}
	}
	t.Fatalf("no valid check digit for %s", first11)
	return ""
}

func TestLooksPersonal(t *testing.T) {
	iin := makeIIN(t, "90010130000")
	personal := []string{
		"ivan.petrov@example.test",
		"Ivan@Example.COM",
		"newsletter-ivan@example.com-oct",
		"+7 700 000 00 01",
		"+77000000001",
		"+44 20 7946 0958",
		"8 (700) 000-00-01",
		"8-700-000-00-01",
		"700 000 00 01",
		"87000000001",
		"77000000001",
		"79000000001",
		"call 7 700 000 0001 now",
		iin,
		"iin-" + iin,
		"4111111111111111",
		"https://evil.example/?token=abc",
		"www.example.com/path",
	}
	for _, v := range personal {
		if !LooksPersonal(v) {
			t.Errorf("LooksPersonal(%q) = false, want true", v)
		}
	}

	ordinary := []string{
		"google", "cpc", "instagram", "brand-kz", "reels", "email", "newsletter",
		"sale_2026-10-22", "2026-10-22-1530", "20261022", "{campaignid}", "{adgroupid}",
		"21345678901",  // Google Ads campaign id (11 digits, not a mobile pattern)
		"1234567890",   // 10-digit id without separators
		"123456789012", // 12 digits that are not a valid IIN
		"4111111111111112",
		"Осень 2026 — скидки 20%",
		"kz_almaty_7days", "q4-2026", "utm-test-100", "v1.2.3",
	}
	for _, v := range ordinary {
		if LooksPersonal(v) {
			t.Errorf("LooksPersonal(%q) = true, want false", v)
		}
	}
}

func TestCleanTextDropsPersonalValues(t *testing.T) {
	if got := CleanText("  ivan@example.com "); got != "" {
		t.Errorf("email kept: %q", got)
	}
	if got := CleanText("+7 (700) 000-00-01"); got != "" {
		t.Errorf("phone kept: %q", got)
	}
	// Checked before truncation: an email after 100 characters still counts.
	if got := CleanText(strings.Repeat("a", 120) + " ivan@example.com"); got != "" {
		t.Errorf("long value with an email kept: %q", got)
	}
	if got := CleanText(" Brand-KZ "); got != "Brand-KZ" {
		t.Errorf("ordinary value changed: %q", got)
	}
	if got := CleanText(strings.Repeat("т", 150)); len([]rune(got)) != 100 {
		t.Errorf("not truncated to 100 characters: %d", len([]rune(got)))
	}
}

// A visit tagged with personal data keeps its channel but not the value.
func TestAttributeDropsPersonalUTM(t *testing.T) {
	a := Attribute(UTM{Source: "ivan@example.com", Medium: "email", Campaign: "+7 700 000 00 01", Term: "brand"}, "", "compnet.kz", false)
	if a.Source != "(not set)" || a.Medium != "email" || a.Campaign != "" || a.Term != "brand" {
		t.Fatalf("attribution: %+v", a)
	}
}
