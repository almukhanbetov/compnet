package attribution

import "testing"

func TestClassify(t *testing.T) {
	tests := []struct {
		name    string
		in      Input
		channel Channel
		source  string
	}{
		// Search
		{"google organic", Input{ReferrerHost: "google.kz", LandingPath: "/services/mobile-app-development"}, OrganicSearch, "google"},
		{"google.com organic", Input{ReferrerHost: "google.com", LandingPath: "/"}, OrganicSearch, "google"},
		{"yandex organic", Input{ReferrerHost: "yandex.kz", LandingPath: "/"}, OrganicSearch, "yandex"},
		{"bing organic", Input{ReferrerHost: "bing.com", LandingPath: "/pricing"}, OrganicSearch, "bing"},
		{"google referrer is not paid by itself", Input{ReferrerHost: "google.com", LandingPath: "/contact"}, OrganicSearch, "google"},
		{"utm organic from google", Input{UTMSource: "google", UTMMedium: "organic"}, OrganicSearch, "google"},

		// Paid search
		{"google ads gclid", Input{ClickID: "gclid", ReferrerHost: "google.com", LandingPath: "/services/website-development"}, PaidSearch, "google"},
		{"google ads gbraid", Input{ClickID: "gbraid"}, PaidSearch, "google"},
		{"google ads wbraid with utm", Input{ClickID: "wbraid", UTMSource: "google", UTMMedium: "cpc"}, PaidSearch, "google"},
		{"google ads utm cpc", Input{UTMSource: "Google", UTMMedium: "CPC", ReferrerHost: "google.com"}, PaidSearch, "google"},
		{"yandex direct ppc", Input{UTMSource: "yandex", UTMMedium: "ppc"}, PaidSearch, "yandex"},
		{"paid_search spelled with underscore", Input{UTMSource: "google", UTMMedium: "paid_search"}, PaidSearch, "google"},
		{"unknown click id ignored", Input{ClickID: "fbclid", ReferrerHost: "google.com", LandingPath: "/"}, OrganicSearch, "google"},

		// Social
		{"instagram referrer", Input{ReferrerHost: "l.instagram.com", LandingPath: "/"}, Social, "instagram"},
		{"telegram referrer", Input{ReferrerHost: "t.me", LandingPath: "/services/mobile-app-development"}, Social, "telegram"},
		{"utm social", Input{UTMSource: "instagram", UTMMedium: "social"}, Social, "instagram"},
		{"utm social source without medium", Input{UTMSource: "facebook"}, Social, "facebook"},

		// Paid social
		{"instagram cpc", Input{UTMSource: "instagram", UTMMedium: "cpc"}, PaidSocial, "instagram"},
		{"paid social medium", Input{UTMSource: "meta", UTMMedium: "paid-social"}, PaidSocial, "meta"},
		{"paid_social with underscore", Input{UTMSource: "tiktok", UTMMedium: "paid_social"}, PaidSocial, "tiktok"},

		// Referral
		{"referral site", Input{ReferrerHost: "partner.kz", LandingPath: "/portfolio"}, Referral, "partner.kz"},
		{"utm referral", Input{UTMSource: "partner.kz", UTMMedium: "referral"}, Referral, "partner.kz"},

		// Email
		{"utm email", Input{UTMSource: "newsletter", UTMMedium: "email"}, Email, "newsletter"},
		{"utm e-mail", Input{UTMSource: "crm", UTMMedium: "E-Mail"}, Email, "crm"},
		{"webmail referrer is not google search", Input{ReferrerHost: "mail.google.com", LandingPath: "/"}, Email, "gmail"},
		{"mail.ru webmail", Input{ReferrerHost: "e.mail.ru", LandingPath: "/"}, Email, "mail.ru"},

		// Direct and unknown
		{"home page without referrer is direct", Input{LandingPath: "/"}, Direct, SourceDirect},
		{"deep link without referrer is unknown", Input{LandingPath: "/services/mobile-app-development"}, Unknown, SourceUnknown},
		{"nothing reported is unknown", Input{}, Unknown, SourceUnknown},

		// Other / malformed
		{"display banner", Input{UTMSource: "kolesa.kz", UTMMedium: "banner"}, Other, "kolesa.kz"},
		{"tagged without medium, unknown source", Input{UTMSource: "flyer"}, Other, "flyer"},
		{"medium only", Input{UTMMedium: "cpc", ReferrerHost: "google.com"}, PaidSearch, "google"},
		{"medium not set placeholder", Input{UTMSource: "google", UTMMedium: "(not set)"}, Other, "google"},
		{"organic from a non-search source", Input{UTMSource: "flyer", UTMMedium: "organic"}, Other, "flyer"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := Classify(tt.in)
			if got.Channel != tt.channel || got.Source != tt.source {
				t.Fatalf("Classify(%+v) = %s / %s, want %s / %s", tt.in, got.Channel, got.Source, tt.channel, tt.source)
			}
		})
	}
}

func TestValidChannel(t *testing.T) {
	for _, c := range Channels {
		if !ValidChannel(string(c)) {
			t.Errorf("%s should be valid", c)
		}
	}
	for _, bad := range []string{"", "Organic Search", "ads", "unknown'; DROP TABLE x;--"} {
		if ValidChannel(bad) {
			t.Errorf("%q should be invalid", bad)
		}
	}
}

func TestReferrerKind(t *testing.T) {
	for host, want := range map[string]string{
		"www.google.kz":   KindSearch,
		"mail.google.com": KindEmail,
		"t.co":            KindSocial,
		"example.org":     KindReferral,
	} {
		if _, kind := ReferrerKind(host); kind != want {
			t.Errorf("ReferrerKind(%q) = %s, want %s", host, kind, want)
		}
	}
}
