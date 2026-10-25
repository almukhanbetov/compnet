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
		adClick                bool
	}{
		{"utm wins over referrer", UTM{Source: "Instagram", Medium: "CPC", Campaign: "digital-start"}, "google.com", "compnet.kz", "instagram", "cpc", "digital-start", false},
		{"utm without medium", UTM{Source: "newsletter"}, "", "compnet.kz", "newsletter", "(not set)", "", false},
		{"search engine", UTM{}, "www.google.kz", "compnet.kz", "google", "organic", "", false},
		{"yandex", UTM{}, "yandex.kz", "compnet.kz", "yandex", "organic", "", false},
		{"social", UTM{}, "l.instagram.com", "compnet.kz", "instagram", "social", "", false},
		{"telegram", UTM{}, "t.me", "compnet.kz", "telegram", "social", "", false},
		{"referral", UTM{}, "partner.kz", "compnet.kz", "partner.kz", "referral", "", false},
		{"own site is direct", UTM{}, "www.compnet.kz", "compnet.kz", "(direct)", "(none)", "", false},
		{"no referrer", UTM{}, "", "compnet.kz", "(direct)", "(none)", "", false},
		{"utm too long is cut", UTM{Source: strings.Repeat("x", 150)}, "", "", strings.Repeat("x", 100), "(not set)", "", false},
		// Google Ads auto-tagging (click id, no UTM) is paid search, not organic (Stage 8.6D).
		{"ad click without utm", UTM{}, "www.google.com", "compnet.kz", "google", "cpc", "", true},
		{"ad click without referrer", UTM{}, "", "compnet.kz", "google", "cpc", "", true},
		{"ad click with tags keeps the tags", UTM{Source: "google", Medium: "cpc", Campaign: "mobile_apps_almaty"}, "www.google.com", "compnet.kz", "google", "cpc", "mobile_apps_almaty", true},
		{"no ad click from google is organic", UTM{}, "www.google.com", "compnet.kz", "google", "organic", "", false},
		// Android app referrers: the package name is the host (Stage 8.6I).
		{"gmail android app is email", UTM{}, "com.google.android.gm", "compnet.kz", "gmail", "email", "", false},
		{"google search app is organic", UTM{}, "com.google.android.googlequicksearchbox", "compnet.kz", "google", "organic", "", false},
		{"other google app is a referral", UTM{}, "com.google.android.apps.messaging", "compnet.kz", "com.google.android.apps.messaging", "referral", "", false},
	}
	for _, c := range cases {
		a := Attribute(c.utm, c.ref, c.own, c.adClick)
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
	// Real browsers whose user agent contains "bot"-like or app tokens (Stage 8.6I).
	for _, ua := range []string{
		"Mozilla/5.0 (Linux; Android 13; CUBOT KINGKONG 9 Build/TP1A.220624.014) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36",
		"Mozilla/5.0 (Linux; Android 14; SM-A546E Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/141.0.0.0 Mobile Safari/537.36 Instagram 400.0.0.0.70 Android",
		"Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/22G86 [FBAN/FBIOS;FBAV/530.0.0.0;FBDV/iPhone15,2]",
		"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 YaBrowser/25.8.0.0 Safari/537.36",
	} {
		if IsBot(ua) {
			t.Errorf("browser treated as bot: %q", ua)
		}
	}
	if !IsBot("Mozilla/5.0 (Linux; Android 13; CUBOT X30) HeadlessChrome/141.0") {
		t.Error("a headless browser on a CUBOT model must still count as a bot")
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

// Invisible and bidi characters are removed from UTM values (Stage 8.6D);
// campaign names in Russian, Kazakh and English stay exactly as written.
func TestCleanText_InvisibleCharacters(t *testing.T) {
	removed := map[string]string{
		"sale\u202etxt.exe\u202c":      "saletxt.exe", // right-to-left override + pop
		"a\u202ab\u202bc\u202dd":       "abcd",        // embeddings and override
		"x\u2066y\u2067z\u2068w\u2069": "xyzw",        // isolates
		"left\u200eright\u200f":        "leftright",   // directional marks
		"zero\u200bwidth\u200c\u200d":  "zerowidth",   // zero-width space, (non-)joiner
		"\ufeffcampaign":               "campaign",    // byte order mark
		"line\u2028para\u2029end":      "Lineparaend"[:0] + "lineparaend",
		"soft\u00adhyphen":             "softhyphen",
		"tag\U000E0041\U000E007F":      "tag", // tag characters
		"a\u0000b\u0007c\u007f":        "abc", // control characters
		"\u202e\u200b":                 "",    // nothing visible left
	}
	for in, want := range removed {
		if got := CleanText(in); got != want {
			t.Errorf("CleanText(%q) = %q, want %q", in, got, want)
		}
	}
	kept := []string{
		"Осенняя_распродажа_2026",
		"Күзгі жеңілдік — Алматы",
		"ҚАЗАҚСТАН: әңғөқұүһі ӘҢҒӨҚҰҮҺІ",
		"Spring Sale (KZ) 50% off",
		"mobile_apps_almaty",
		"brand+сайт-визитка",
		"«Скидки» №1",
	}
	for _, in := range kept {
		if got := CleanText(in); got != in {
			t.Errorf("CleanText(%q) = %q, want it unchanged", in, got)
		}
	}
	if got := CleanPath("/services/\u202ewebsite-development"); got != "/services/website-development" {
		t.Errorf("CleanPath keeps a bidi character: %q", got)
	}
}
