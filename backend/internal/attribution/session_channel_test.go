package attribution

import "testing"

func TestSessionChannel(t *testing.T) {
	for _, tt := range []struct{ source, medium, want string }{
		// As the visit analytics stores them.
		{"google", "organic", SessionGoogleOrganic},  // Google referrer
		{"google", "cpc", SessionGoogleCPC},          // gclid/gbraid/wbraid without UTM, or utm google/cpc
		{"Google", "CPC", SessionGoogleCPC},          // case
		{"google", "ppc", SessionGoogleCPC},          // another paid medium
		{"chatgpt.com", "(not set)", SessionChatGPT}, // utm_source=chatgpt.com
		{"chatgpt.com", "referral", SessionChatGPT},  // chatgpt.com referrer, no UTM
		{"chat.openai.com", "referral", SessionChatGPT},
		{"(direct)", "(none)", SessionDirect},
		{"instagram", "social", SessionSocial},
		{"facebook", "social", SessionSocial},
		{"ig", "paid", SessionSocial},             // paid social (utm ig/paid)
		{"instagram", "(not set)", SessionSocial}, // social name, no medium
		{"telegram", "social", SessionSocial},     // Android app referrer
		{"example.kz", "referral", SessionReferral},
		{"com.google.android.apps.docs", "referral", SessionReferral},
		{"yandex", "organic", SessionOther}, // other search engines
		{"bing", "organic", SessionOther},
		{"yandex", "cpc", SessionOther}, // other search ads
		{"gmail", "email", SessionOther},
		{"newsletter", "email", SessionOther},
		{"partner", "banner", SessionOther},
		{"(not set)", "cpc", SessionOther}, // tagged without a source
		{"", "", SessionOther},
	} {
		if got := SessionChannel(tt.source, tt.medium); got != tt.want {
			t.Errorf("SessionChannel(%q, %q) = %q, want %q", tt.source, tt.medium, got, tt.want)
		}
	}
}
