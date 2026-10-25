// Package attribution classifies where a visit or a project request came
// from. It is pure (no I/O) so the rules can be tested in isolation and
// shared by the visit analytics and the request attribution.
//
// All inputs come from the visitor's browser (UTM tags of the landing URL,
// the referring site's host, the presence of an ad click id). They are
// treated as reported, never as proof: the channel is always derived here,
// a channel sent by a client is never accepted.
package attribution

import "strings"

// Channel is a marketing channel of a request.
type Channel string

const (
	OrganicSearch Channel = "organic_search"
	PaidSearch    Channel = "paid_search"
	Social        Channel = "social"
	PaidSocial    Channel = "paid_social"
	Referral      Channel = "referral"
	Direct        Channel = "direct"
	Email         Channel = "email"
	Other         Channel = "other"
	// Unknown: not enough data to tell, e.g. no consent to analytics, or a
	// deep link without referrer (messengers and apps often strip it).
	Unknown Channel = "unknown"
)

// Channels lists every channel, in the order reports show them.
var Channels = []Channel{OrganicSearch, PaidSearch, Social, PaidSocial, Referral, Direct, Email, Other, Unknown}

// ValidChannel reports a known channel name.
func ValidChannel(s string) bool {
	for _, c := range Channels {
		if string(c) == s {
			return true
		}
	}
	return false
}

// Click id parameters of Google Ads. Only which one was present is kept,
// never its value.
var ClickIDs = map[string]bool{"gclid": true, "gbraid": true, "wbraid": true}

// Source names for the reports.
const (
	SourceDirect  = "(direct)"
	SourceUnknown = "(unknown)"
)

// Input is what the browser reported for the visit that sent the request.
// Strings are expected to be sanitized already (see service/analytics).
type Input struct {
	UTMSource    string
	UTMMedium    string
	ReferrerHost string // the referring site's host only, never a URL
	ClickID      string // "gclid", "gbraid", "wbraid" or ""
	LandingPath  string // first page of the visit
	// InternalNavigation: the visit started on a page reached by a link
	// inside the site, not from outside (no external referrer to lose).
	InternalNavigation bool
}

// Result is the classification of an Input.
type Result struct {
	Channel Channel
	// Source: utm_source, a search engine or network name, the referring
	// host, SourceDirect or SourceUnknown.
	Source string
}

// Classify decides the channel. Order: an ad click id, then explicit UTM
// tags, then the referring site; with none of them a visit that started
// on the home page, or on a page reached inside the site, counts as
// direct, any other one as unknown — a deep link without referrer usually
// comes from an app or messenger that stripped it, not from someone typing
// the address.
func Classify(in Input) Result {
	source := strings.ToLower(strings.TrimSpace(in.UTMSource))
	medium := normalizeMedium(in.UTMMedium)
	host := strings.ToLower(strings.TrimSpace(in.ReferrerHost))

	if ClickIDs[in.ClickID] {
		if source == "" {
			source = "google"
		}
		return Result{Channel: PaidSearch, Source: source}
	}

	if source != "" || medium != "" {
		if source == "" {
			source = sourceFromHost(host)
		}
		return Result{Channel: classifyTagged(source, medium), Source: source}
	}

	if host != "" {
		name, kind := ReferrerKind(host)
		switch kind {
		case KindSearch:
			return Result{Channel: OrganicSearch, Source: name}
		case KindSocial:
			return Result{Channel: Social, Source: name}
		case KindEmail:
			return Result{Channel: Email, Source: name}
		default:
			return Result{Channel: Referral, Source: name}
		}
	}

	if in.LandingPath == "/" || in.InternalNavigation {
		return Result{Channel: Direct, Source: SourceDirect}
	}
	return Result{Channel: Unknown, Source: SourceUnknown}
}

// classifyTagged maps UTM tags. utm_medium decides; the source only tells
// paid search from paid social and fills in a missing medium.
func classifyTagged(source, medium string) Channel {
	social := isSocialName(source)
	search := isSearchName(source)
	switch {
	case paidSocialMediums[medium]:
		return PaidSocial
	case paidMediums[medium]:
		if social {
			return PaidSocial
		}
		return PaidSearch // cpc/ppc from a search engine or an unnamed one
	case emailMediums[medium]:
		return Email
	case socialMediums[medium]:
		return Social
	case medium == "organic":
		if search {
			return OrganicSearch
		}
		return Other
	case medium == "referral":
		return Referral
	case medium == "":
		switch {
		case social:
			return Social
		case emailMediums[source]:
			return Email
		}
		return Other // tagged link without a medium: do not guess search
	default:
		return Other // display, banner, affiliate, qr, …
	}
}

func normalizeMedium(raw string) string {
	m := strings.ToLower(strings.TrimSpace(raw))
	m = strings.NewReplacer("_", "-", " ", "-").Replace(m)
	if m == "(not-set)" || m == "(none)" {
		return ""
	}
	return m
}

var (
	paidMediums       = map[string]bool{"cpc": true, "ppc": true, "paid": true, "paidsearch": true, "paid-search": true, "sem": true, "search-ads": true}
	paidSocialMediums = map[string]bool{"paid-social": true, "paidsocial": true, "social-paid": true, "social-ads": true, "smm-ads": true}
	socialMediums     = map[string]bool{"social": true, "social-network": true, "social-media": true, "sm": true, "smm": true}
	emailMediums      = map[string]bool{"email": true, "e-mail": true, "mail": true, "newsletter": true}
)

// Referrer kinds.
const (
	KindSearch   = "search"
	KindSocial   = "social"
	KindEmail    = "email"
	KindReferral = "referral"
)

var searchEngines = map[string]string{
	"google": "google", "yandex": "yandex", "ya.ru": "yandex", "bing.com": "bing",
	"duckduckgo.com": "duckduckgo", "go.mail.ru": "mail.ru", "search.yahoo.com": "yahoo",
}

var socialSites = map[string]string{
	"instagram.com": "instagram", "l.instagram.com": "instagram", "facebook.com": "facebook",
	"m.facebook.com": "facebook", "l.facebook.com": "facebook", "lm.facebook.com": "facebook",
	"t.me": "telegram", "web.telegram.org": "telegram", "vk.com": "vk", "m.vk.com": "vk",
	"youtube.com": "youtube", "m.youtube.com": "youtube", "tiktok.com": "tiktok",
	"linkedin.com": "linkedin", "lnkd.in": "linkedin", "x.com": "x", "t.co": "x", "twitter.com": "x",
	"wa.me": "whatsapp", "web.whatsapp.com": "whatsapp", "threads.net": "threads",
}

// Webmail sites: checked before search engines (mail.google.com is not
// Google search).
var emailSites = map[string]string{
	"mail.google.com": "gmail", "outlook.live.com": "outlook", "outlook.office.com": "outlook",
	"outlook.office365.com": "outlook", "e.mail.ru": "mail.ru", "mail.yandex.ru": "yandex-mail",
	"mail.yandex.kz": "yandex-mail", "mail.yahoo.com": "yahoo-mail",
}

// Android apps that open a link pass an android-app://<package> referrer;
// the browser reports the package name as the host. Checked before the
// site tables: "com.google.android.gm" is Gmail, not Google search.
var androidApps = map[string]struct{ name, kind string }{
	"com.google.android.googlequicksearchbox": {"google", KindSearch},
	"ru.yandex.searchplugin":                  {"yandex", KindSearch},
	"com.google.android.gm":                   {"gmail", KindEmail},
	"ru.yandex.mail":                          {"yandex-mail", KindEmail},
	"ru.mail.mailapp":                         {"mail.ru", KindEmail},
	"com.microsoft.office.outlook":            {"outlook", KindEmail},
	"com.instagram.android":                   {"instagram", KindSocial},
	"com.facebook.katana":                     {"facebook", KindSocial},
	"com.facebook.orca":                       {"facebook", KindSocial},
	"org.telegram.messenger":                  {"telegram", KindSocial},
	"com.whatsapp":                            {"whatsapp", KindSocial},
	"com.vkontakte.android":                   {"vk", KindSocial},
	"com.linkedin.android":                    {"linkedin", KindSocial},
	"com.twitter.android":                     {"x", KindSocial},
	"com.google.android.youtube":              {"youtube", KindSocial},
	"com.zhiliaoapp.musically":                {"tiktok", KindSocial},
}

// Package prefixes of the search companies' other apps (Messages, Docs,
// Disk, …): such a referrer is an app, never the search engine itself.
var appPackagePrefixes = []string{"com.google.", "ru.yandex.", "com.yandex."}

// ReferrerKind names a referring host and tells whether it is a search
// engine, a social network, a webmail or another site (the name is then
// the host itself).
func ReferrerKind(host string) (name, kind string) {
	host = strings.ToLower(strings.TrimSpace(host))
	if app, ok := androidApps[host]; ok {
		return app.name, app.kind
	}
	for _, prefix := range appPackagePrefixes {
		if strings.HasPrefix(host, prefix) {
			return host, KindReferral
		}
	}
	if name, ok := emailSites[host]; ok {
		return name, KindEmail
	}
	if name, ok := socialSites[host]; ok {
		return name, KindSocial
	}
	for key, name := range searchEngines {
		if host == key || strings.HasPrefix(host, key+".") || strings.Contains(host, "."+key+".") || strings.HasSuffix(host, "."+key) {
			return name, KindSearch
		}
	}
	return host, KindReferral
}

func sourceFromHost(host string) string {
	if host == "" {
		return SourceUnknown
	}
	name, _ := ReferrerKind(host)
	return name
}

func isSocialName(source string) bool {
	if _, ok := socialSites[source]; ok {
		return true
	}
	for _, name := range socialSites {
		if name == source {
			return true
		}
	}
	switch source {
	case "fb", "ig", "vkontakte", "tg", "meta":
		return true
	}
	return false
}

func isSearchName(source string) bool {
	for key, name := range searchEngines {
		if source == key || source == name {
			return true
		}
	}
	return false
}
