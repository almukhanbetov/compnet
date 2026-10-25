package attribution

import "strings"

// Session channels of the traffic sources report (Stage 8.7D): a coarser
// grouping of the source and medium a session stored, decided when the
// report is read. Stored values are never changed, so a rule added here
// applies to history as well.
const (
	SessionGoogleOrganic = "google_organic"
	SessionGoogleCPC     = "google_cpc"
	SessionChatGPT       = "chatgpt"
	SessionDirect        = "direct"
	SessionSocial        = "social"
	SessionReferral      = "referral"
	SessionOther         = "other" // other search engines and ads, email, unknown
)

// SessionChannels lists every session channel, in the order reports show them.
var SessionChannels = []string{
	SessionGoogleOrganic, SessionGoogleCPC, SessionChatGPT, SessionDirect, SessionSocial, SessionReferral, SessionOther,
}

// ChatGPT links carry utm_source=chatgpt.com; without the tag the referrer
// host is the source (stored without "www.").
var chatGPTSources = map[string]bool{"chatgpt.com": true, "chat.openai.com": true, "chatgpt": true}

// SessionChannel groups a stored session source/medium (as written by the
// visit analytics: utm values, a referrer name with organic/social/email/
// referral, google/cpc for an ad click id, or (direct)/(none)) with the
// same tag rules as the request channels.
func SessionChannel(source, medium string) string {
	src := strings.ToLower(strings.TrimSpace(source))
	switch {
	case chatGPTSources[src]:
		return SessionChatGPT
	case src == SourceDirect:
		return SessionDirect
	case src == "" || src == "(not set)":
		return SessionOther
	}
	switch classifyTagged(src, normalizeMedium(medium)) {
	case OrganicSearch:
		if src == "google" {
			return SessionGoogleOrganic
		}
	case PaidSearch:
		if src == "google" {
			return SessionGoogleCPC
		}
	case Social, PaidSocial:
		return SessionSocial
	case Referral:
		return SessionReferral
	}
	return SessionOther
}
