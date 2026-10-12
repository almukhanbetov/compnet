package analytics

import (
	"strings"
	"testing"
	"time"
)

func TestCleanPath(t *testing.T) {
	cases := map[string]string{
		"/pricing":                           "/pricing",
		"/contact?email=a@b.kz&token=secret": "/contact",
		"/portfolio/x#section":               "/portfolio/x",
		"/?utm_source=google":                "/",
		"https://evil.example/x":             "",
		"//evil.example/x":                   "",
		"/manager":                           "",
		"/manager/analytics":                 "",
		"/api/v1/chat":                       "",
		"/a\x00b\nc":                         "/abc",
		"/" + strings.Repeat("я", 400):       "/" + strings.Repeat("я", 299),
		"":                                   "",
	}
	for in, want := range cases {
		if got := CleanPath(in); got != want {
			t.Errorf("CleanPath(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestCleanHost(t *testing.T) {
	cases := map[string]string{
		"www.Google.com":                  "google.com",
		"https://t.me/some/path?x=1":      "t.me",
		"instagram.com.":                  "instagram.com",
		"localhost":                       "",
		"evil host.com":                   "",
		"a.b":                             "a.b",
		strings.Repeat("a", 300) + ".com": "",
	}
	for in, want := range cases {
		if got := CleanHost(in); got != want {
			t.Errorf("CleanHost(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestAttribute(t *testing.T) {
	cases := []struct {
		name                   string
		utm                    UTM
		ref, own               string
		source, medium, campgn string
	}{
		{"utm wins over referrer", UTM{Source: "Instagram", Medium: "CPC", Campaign: "digital-start"}, "google.com", "compnet.kz", "instagram", "cpc", "digital-start"},
		{"utm without medium", UTM{Source: "newsletter"}, "", "compnet.kz", "newsletter", "(not set)", ""},
		{"search engine", UTM{}, "www.google.kz", "compnet.kz", "google", "organic", ""},
		{"yandex", UTM{}, "yandex.kz", "compnet.kz", "yandex", "organic", ""},
		{"social", UTM{}, "l.instagram.com", "compnet.kz", "instagram", "social", ""},
		{"telegram", UTM{}, "t.me", "compnet.kz", "telegram", "social", ""},
		{"referral", UTM{}, "partner.kz", "compnet.kz", "partner.kz", "referral", ""},
		{"own site is direct", UTM{}, "www.compnet.kz", "compnet.kz", "(direct)", "(none)", ""},
		{"no referrer", UTM{}, "", "compnet.kz", "(direct)", "(none)", ""},
		{"utm too long is cut", UTM{Source: strings.Repeat("x", 150)}, "", "", strings.Repeat("x", 100), "(not set)", ""},
	}
	for _, c := range cases {
		a := Attribute(c.utm, c.ref, c.own)
		if a.Source != c.source || a.Medium != c.medium || a.Campaign != c.campgn {
			t.Errorf("%s: got %s/%s/%s", c.name, a.Source, a.Medium, a.Campaign)
		}
	}
}

func TestDeviceAndBots(t *testing.T) {
	const (
		iphone  = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1"
		android = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36"
		tablet  = "Mozilla/5.0 (Linux; Android 13; SM-X200) AppleWebKit/537.36 Chrome/126.0 Safari/537.36"
		ipad    = "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1"
		desktop = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36"
	)
	for ua, want := range map[string]string{iphone: "mobile", android: "mobile", tablet: "tablet", ipad: "tablet", desktop: "desktop"} {
		if got := DeviceCategory(ua); got != want {
			t.Errorf("DeviceCategory(%q) = %s, want %s", ua, got, want)
		}
		if IsBot(ua) {
			t.Errorf("browser treated as bot: %q", ua)
		}
	}
	for _, ua := range []string{
		"", "Googlebot/2.1 (+http://www.google.com/bot.html)", "Mozilla/5.0 (compatible; YandexBot/3.0)",
		"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 HeadlessChrome/126.0 Safari/537.36",
		"curl/8.5.0", "python-requests/2.31", "Go-http-client/1.1", "Mozilla/5.0 Chrome-Lighthouse",
		"facebookexternalhit/1.1", "TelegramBot (like TwitterBot)",
	} {
		if !IsBot(ua) {
			t.Errorf("not detected as bot: %q", ua)
		}
	}
}

func TestIsLocalOrigin(t *testing.T) {
	for origin, want := range map[string]bool{
		"http://localhost:3001": true, "http://127.0.0.1:8080": true, "http://[::1]:3000": true,
		"http://compnet.local": true, "https://compnet.kz": false, "https://www.compnet.kz": false,
	} {
		if got := IsLocalOrigin(origin); got != want {
			t.Errorf("IsLocalOrigin(%q) = %v", origin, got)
		}
	}
}

// Days start at 00:00 in Asia/Almaty (UTC+5 since 1 March 2024); storage is UTC.
func TestParsePeriod_AlmatyBoundaries(t *testing.T) {
	p, ok := ParsePeriod("2026-10-13", "2026-10-13")
	if !ok {
		t.Fatal("valid period refused")
	}
	if want := time.Date(2026, 10, 12, 19, 0, 0, 0, time.UTC); !p.From.Equal(want) {
		t.Fatalf("from = %v, want %v", p.From, want)
	}
	if want := time.Date(2026, 10, 13, 19, 0, 0, 0, time.UTC); !p.To.Equal(want) {
		t.Fatalf("to = %v, want %v", p.To, want)
	}
	if p.From.Location() != time.UTC {
		t.Fatal("bounds must be UTC")
	}
	month, ok := ParsePeriod("2026-10-01", "2026-10-31")
	if !ok || month.To.Sub(month.From) != 31*24*time.Hour {
		t.Fatalf("month: %+v", month)
	}
	for _, bad := range [][2]string{{"2026-10-14", "2026-10-13"}, {"2026-13-01", "2026-13-02"}, {"2025-01-01", "2026-10-13"}, {"", ""}} {
		if _, ok := ParsePeriod(bad[0], bad[1]); ok {
			t.Errorf("accepted %v", bad)
		}
	}
}
