package analytics

import (
	"net/url"
	"regexp"
	"strings"
	"time"
	_ "time/tzdata" // Asia/Almaty must resolve inside minimal containers
	"unicode"
	"unicode/utf8"

	"github.com/almukha/compnet-backend/internal/attribution"
	"github.com/almukha/compnet-backend/internal/domain/analytics"
)

// ReportZone is where the statistics' days start and end. Storage is UTC.
const ReportZone = "Asia/Almaty"

var (
	uuidPattern = regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`)
	hostPattern = regexp.MustCompile(`^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$`)
	// Automation and crawlers. Detection is best effort: a bot that
	// pretends to be a browser is counted as one.
	botPattern = regexp.MustCompile(`(?i)bot\b|bot/|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|python|curl|wget|go-http|java/|okhttp|axios|node-fetch|undici|phantom|selenium|puppeteer|playwright|webdriver|httpclient|monitor|uptime|scanner|facebookexternalhit|embedly|whatsapp/|telegrambot`)
	// Phone brands that end in "bot" (CUBOT): removed before botPattern runs.
	botLookalikes = regexp.MustCompile(`(?i)\bcubot\b`)
)

// ValidUUID accepts a lowercase or uppercase canonical UUID.
func ValidUUID(s string) bool {
	return uuidPattern.MatchString(strings.ToLower(s))
}

// CleanPath keeps only the path: no query string or fragment (they may
// carry tokens, emails, search terms), no control characters, at most 300
// characters. The manager section and the API are never tracked ("" =
// ignore).
func CleanPath(raw string) string {
	path := strings.TrimSpace(raw)
	if i := strings.IndexAny(path, "?#"); i >= 0 {
		path = path[:i]
	}
	if !strings.HasPrefix(path, "/") || strings.HasPrefix(path, "//") || !utf8.ValidString(path) {
		return ""
	}
	path = stripControl(path)
	if path == "/manager" || strings.HasPrefix(path, "/manager/") || strings.HasPrefix(path, "/api/") {
		return ""
	}
	return truncate(path, analytics.MaxPathLength)
}

// CleanText is a UTM value: trimmed, without control characters, at most
// 100 characters, "" if nothing is left. A value that looks like personal
// data (an email, a phone number, …; see LooksPersonal) is dropped whole.
func CleanText(raw string) string {
	if !utf8.ValidString(raw) {
		return ""
	}
	value := strings.TrimSpace(stripControl(raw))
	if LooksPersonal(value) {
		return ""
	}
	return truncate(value, analytics.MaxUTMLength)
}

// CleanHost keeps only a referrer's host name (never its path or query),
// lowercased and without "www.".
func CleanHost(raw string) string {
	host := strings.ToLower(strings.TrimSpace(raw))
	if strings.Contains(host, "://") {
		if u, err := url.Parse(host); err == nil {
			host = u.Hostname()
		}
	}
	host = strings.TrimPrefix(strings.TrimSuffix(host, "."), "www.")
	if len(host) > analytics.MaxHostLength || !hostPattern.MatchString(host) {
		return ""
	}
	return host
}

// UTM is the raw campaign tagging of a landing URL.
type UTM struct {
	Source, Medium, Campaign, Term, Content string
}

// Attribute decides a session's source: explicit UTM tags first, then the
// referring site (search, social or referral), otherwise direct. A
// referrer equal to the site itself (ownHost) counts as direct.
func Attribute(utm UTM, referrerHost, ownHost string, adClick bool) analytics.Attribution {
	source := strings.ToLower(CleanText(utm.Source))
	ref := CleanHost(referrerHost)
	if ref != "" && ref == CleanHost(ownHost) {
		ref = ""
	}
	a := analytics.Attribution{
		Campaign:     CleanText(utm.Campaign),
		Term:         CleanText(utm.Term),
		Content:      CleanText(utm.Content),
		ReferrerHost: ref,
	}
	medium := strings.ToLower(CleanText(utm.Medium))
	switch {
	case adClick && source == "" && medium == "":
		// Google Ads auto-tagging: a click id and no UTM tags. Paid search,
		// even though the referrer is google.com.
		a.Source, a.Medium = "google", "cpc"
	case source != "" || medium != "":
		// A tagged link; utm_source may be missing or dropped as personal.
		a.Source, a.Medium = source, medium
		if a.Source == "" {
			a.Source = "(not set)"
		}
		if a.Medium == "" {
			a.Medium = "(not set)"
		}
	case ref != "":
		a.Source, a.Medium = classifyReferrer(ref)
	default:
		a.Source, a.Medium = "(direct)", "(none)"
	}
	return a
}

// classifyReferrer uses the host tables shared with the request
// attribution (internal/attribution), so both agree on what is search.
func classifyReferrer(host string) (source, medium string) {
	name, kind := attribution.ReferrerKind(host)
	switch kind {
	case attribution.KindSocial:
		return name, "social"
	case attribution.KindSearch:
		return name, "organic"
	case attribution.KindEmail:
		return name, "email"
	}
	return name, "referral"
}

// IsDirect reports a session without any source.
func IsDirect(a analytics.Attribution) bool { return a.Source == "(direct)" }

// DeviceCategory from the User-Agent (only the category is kept).
func DeviceCategory(ua string) string {
	switch {
	case strings.Contains(ua, "iPad") || strings.Contains(ua, "Tablet") ||
		(strings.Contains(ua, "Android") && !strings.Contains(ua, "Mobile")):
		return "tablet"
	case strings.Contains(ua, "Mobi") || strings.Contains(ua, "iPhone") || strings.Contains(ua, "iPod"):
		return "mobile"
	default:
		return "desktop"
	}
}

// IsBot reports automation and known crawlers (best effort).
func IsBot(ua string) bool {
	return strings.TrimSpace(ua) == "" || botPattern.MatchString(botLookalikes.ReplaceAllString(ua, ""))
}

// IsLocalOrigin reports a development origin (localhost, loopback, *.local).
func IsLocalOrigin(origin string) bool {
	u, err := url.Parse(origin)
	if err != nil {
		return false
	}
	host := u.Hostname()
	return host == "localhost" || host == "::1" || strings.HasPrefix(host, "127.") || strings.HasSuffix(host, ".local") || strings.HasSuffix(host, ".localhost")
}

// Language accepts the site's locales only.
func Language(raw string) string {
	switch raw {
	case "ru", "kk", "en":
		return raw
	}
	return ""
}

// Period is a report range: whole days in Asia/Almaty, as UTC instants
// [From, To).
type Period struct {
	From, To         time.Time
	FromDate, ToDate string // YYYY-MM-DD, Asia/Almaty
}

// ParsePeriod turns two Asia/Almaty dates (inclusive) into UTC bounds.
func ParsePeriod(fromDate, toDate string) (Period, bool) {
	loc, err := time.LoadLocation(ReportZone)
	if err != nil {
		return Period{}, false
	}
	from, err1 := time.ParseInLocation("2006-01-02", fromDate, loc)
	to, err2 := time.ParseInLocation("2006-01-02", toDate, loc)
	if err1 != nil || err2 != nil || to.Before(from) || to.Sub(from) > (analytics.MaxPeriodDays-1)*24*time.Hour {
		return Period{}, false
	}
	return Period{
		From:     from.UTC(),
		To:       to.AddDate(0, 0, 1).UTC(),
		FromDate: fromDate,
		ToDate:   toDate,
	}, true
}

// stripControl removes characters that are invisible or change how the
// text around them is displayed: control characters (Cc), format
// characters (Cf: bidi overrides and isolates such as U+202E, zero-width
// spaces and joiners, the BOM, tag characters), line and paragraph
// separators, and U+FFFD left by broken encodings. Letters of every
// alphabet (Russian, Kazakh, English, …), digits, punctuation and ordinary
// spaces are kept.
func stripControl(s string) string {
	return strings.Map(func(r rune) rune {
		if unicode.IsControl(r) || unicode.In(r, unicode.Cf, unicode.Zl, unicode.Zp) || r == '\uFFFD' {
			return -1
		}
		return r
	}, s)
}

func truncate(s string, limit int) string {
	if utf8.RuneCountInString(s) <= limit {
		return s
	}
	return string([]rune(s)[:limit])
}
