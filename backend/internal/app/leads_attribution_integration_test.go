package app_test

// Request-source checks added in Stage 8.6C/8.6D: a failing attribution
// write, how the report cards count paid and social channels, and hostile
// values in the reported source. Real server,
// real migrated PostgreSQL; run with TEST_DATABASE_URL (see
// realtime_integration_test.go).

import (
	"context"
	"fmt"
	"strings"
	"testing"
)

// A request whose source cannot be stored is still saved (Stage 8.6D): the
// source is optional, so its insert runs behind a savepoint. The manager is
// notified, the visit is linked, and nothing of the failed source remains.
func TestLeads_AttributionFailureKeepsRequest(t *testing.T) {
	e := newEnv(t)
	s := e.startAnalytics()
	ctx := context.Background()
	mgr := s.actor(t)
	mgr.login(e)
	sock := mgr.ws("/api/v1/manager/ws")
	tag := randomHex(6)
	campaign := "force-fail-" + tag

	// Test-only trigger: rejects just this test's attribution row.
	fn := "stage86d_fail_" + tag
	if _, err := e.pool.Exec(ctx, fmt.Sprintf(`
		CREATE FUNCTION %[1]s() RETURNS trigger LANGUAGE plpgsql AS $$
		BEGIN
			IF NEW.utm_campaign = '%[2]s' THEN RAISE EXCEPTION 'stage86d: simulated attribution failure'; END IF;
			RETURN NEW;
		END $$;
		CREATE TRIGGER %[1]s BEFORE INSERT ON project_request_attribution FOR EACH ROW EXECUTE FUNCTION %[1]s();`, fn, campaign)); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		_, _ = e.pool.Exec(ctx, fmt.Sprintf(`DROP TRIGGER IF EXISTS %[1]s ON project_request_attribution; DROP FUNCTION IF EXISTS %[1]s();`, fn))
	})

	session := uuid()
	id := e.submitRequest(s.actor(t), map[string]any{
		"name": "Сбой атрибуции " + tag, "phone": "7011234567",
		"analytics_session_id": session,
		"attribution":          map[string]any{"source_page": "/contact", "landing_page": "/", "utm_source": "google", "utm_medium": "cpc", "utm_campaign": campaign},
	})
	// submitRequest already required HTTP 201 and an id.
	if n := e.count(`SELECT count(*) FROM project_requests WHERE id = $1`, id); n != 1 {
		t.Fatalf("request not stored: %d", n)
	}
	if n := e.count(`SELECT count(*) FROM project_estimates WHERE project_request_id = $1`, id); n != 1 {
		t.Errorf("estimate not stored: %d", n)
	}
	if n := e.count(`SELECT count(*) FROM project_request_features WHERE project_request_id = $1`, id); n != 1 {
		t.Errorf("features not stored: %d", n)
	}
	if n := e.count(`SELECT count(*) FROM project_request_attribution WHERE project_request_id = $1`, id); n != 0 {
		t.Errorf("failed source left a row: %d", n)
	}
	// The manager hears about it like about any other request.
	sock.wait("project_request_created", fast, func(ev event) bool { return strings.Contains(string(ev.Data), id) })
	if a, _ := mgr.requestAttribution(id); a != nil {
		t.Errorf("manager sees a source that was not stored: %v", a)
	}
	// The visit link does not depend on the source row.
	if n := e.count(`SELECT count(*) FROM analytics_pending_conversions WHERE project_request_id = $1`, id) +
		e.count(`SELECT count(*) FROM analytics_events WHERE type = 'lead_submit' AND project_request_id = $1`, id); n != 1 {
		t.Errorf("conversion not recorded once: %d", n)
	}

	// The transaction is not left broken: the next request keeps its source.
	next := e.submitRequest(s.actor(t), map[string]any{
		"name": "После сбоя " + tag, "phone": "7011234567", "analytics_session_id": uuid(),
		"attribution": map[string]any{"source_page": "/contact", "landing_page": "/", "utm_source": "google", "utm_medium": "cpc", "utm_campaign": "ok-" + tag},
	})
	if a, _ := mgr.requestAttribution(next); a == nil || a["channel"] != "paid_search" {
		t.Errorf("next request lost its source: %v", a)
	}
}

// What the report's summary cards count. "paid" and "social" are the
// numbers behind the "Google Ads" and "Социальные сети" cards.
func TestLeads_PaidAndSocialCards(t *testing.T) {
	e := newEnv(t)
	s := e.startAnalytics()
	mgr := s.actor(t)
	mgr.login(e)
	ctx := context.Background()
	tag := randomHex(4)

	submit := func(label string, attr map[string]any) string {
		return e.submitRequest(s.actor(t), map[string]any{"name": label + " " + tag, "phone": "7011234567", "analytics_session_id": uuid(), "attribution": attr})
	}
	ids := []string{
		submit("Google Ads", map[string]any{"source_page": "/contact", "landing_page": "/services/mobile-app-development", "utm_source": "google", "utm_medium": "cpc", "utm_campaign": "mobile_apps_almaty", "click_id": "gclid"}),
		submit("Яндекс Директ", map[string]any{"source_page": "/contact", "landing_page": "/", "utm_source": "yandex", "utm_medium": "cpc"}),
		submit("Таргет Facebook", map[string]any{"source_page": "/contact", "landing_page": "/", "utm_source": "facebook", "utm_medium": "paid_social"}),
		submit("Instagram", map[string]any{"source_page": "/contact", "landing_page": "/", "referrer_host": "l.instagram.com"}),
		submit("Google Organic", map[string]any{"source_page": "/services/website-development", "landing_page": "/services/website-development", "referrer_host": "www.google.com"}),
		submit("Gmail", map[string]any{"source_page": "/contact", "landing_page": "/", "referrer_host": "mail.google.com"}),
		submit("Прямой", map[string]any{"source_page": "/contact", "landing_page": "/"}),
	}
	// A period of their own (Asia/Almaty day 2024-02-29).
	if _, err := e.pool.Exec(ctx, `UPDATE project_requests SET created_at = '2024-02-29T06:00:00Z' WHERE id = ANY($1::uuid[])`, ids); err != nil {
		t.Fatal(err)
	}
	r := mgr.leads("?from=2024-02-29&to=2024-02-29")
	ch := countsOf(r.Channels)
	t.Logf("totals: requests %d, google_organic %d, paid %d, social %d; channels %v",
		r.Totals.Requests, r.Totals.GoogleOrganic, r.Totals.Paid, r.Totals.Social, ch)
	if r.Totals.Requests != 7 || ch["paid_search"] != 2 || ch["paid_social"] != 1 || ch["social"] != 1 ||
		ch["organic_search"] != 1 || ch["email"] != 1 || ch["direct"] != 1 || r.Totals.GoogleOrganic != 1 {
		t.Fatalf("unexpected classification: %+v %v", r.Totals, ch)
	}
	// The card definitions overlap on purpose (explained under the cards in the UI).
	if r.Totals.Paid != 3 {
		t.Errorf("paid card: %d (Google Ads, Yandex Direct and Facebook ads all count)", r.Totals.Paid)
	}
	if r.Totals.Social != 2 {
		t.Errorf("social card: %d (Facebook ads counted in both paid and social)", r.Totals.Social)
	}
}

// Hostile or malformed values in a reported source are cleaned, never
// rejected, and never reach the database in raw form.
func TestLeads_HostileSourceValues(t *testing.T) {
	e := newEnv(t)
	s := e.startAnalytics()
	mgr := s.actor(t)
	mgr.login(e)
	tag := randomHex(4)

	id := e.submitRequest(s.actor(t), map[string]any{
		"name": "Опасные значения " + tag, "phone": "7011234567", "analytics_session_id": uuid(),
		"attribution": map[string]any{
			"source_page":   "/services/website-development?email=client@example.com#form",
			"previous_page": "https://evil.example/phish",
			"landing_page":  "//evil.example/x",
			"referrer_host": "https://www.google.com/search?q=private+query",
			"utm_source":    "google",
			"utm_medium":    "organic",
			"utm_campaign":  "a\u0000b' OR '1'='1",
			"utm_term":      "+7 701 123 45 67",
			"utm_content":   "client@example.com",
			"click_id":      "fbclid",
		},
	})
	a, raw := mgr.requestAttribution(id)
	t.Logf("stored source: %v", a)
	if a == nil {
		t.Fatalf("no source stored: %s", raw)
	}
	checks := map[string]any{
		"source_page": "/services/website-development", "previous_page": "", "landing_page": "",
		"referrer_host": "google.com", "utm_term": "", "utm_content": "", "ad_click": false, "channel": "organic_search",
	}
	for k, want := range checks {
		if got, ok := a[k]; (ok || want != "") && got != want && !(want == "" && got == nil) {
			t.Errorf("%s = %#v, want %#v", k, got, want)
		}
	}
	if campaign, _ := a["utm_campaign"].(string); campaign != "ab' OR '1'='1" {
		t.Errorf("campaign = %q, want the NUL removed and the rest kept as plain text", campaign)
	}
	for _, leak := range []string{"client@example.com", "private", "701 123", "fbclid", "evil.example"} {
		if strings.Contains(raw, leak) {
			t.Errorf("manager API exposes %q: %s", leak, raw)
		}
	}
	if n := e.count(`SELECT count(*) FROM project_request_attribution WHERE project_request_id = $1 AND
		(coalesce(utm_term,'') <> '' OR coalesce(utm_content,'') <> '')`, id); n != 0 {
		t.Errorf("raw values in the database: %d rows", n)
	}

	// Filter values are bound parameters: an injection attempt is refused, not executed.
	for _, q := range []string{"&channel=%27%20OR%20%271%27%3D%271", "&project_type=x%27%3B%20DROP%20TABLE%20project_requests%3B--"} {
		if code, body := mgr.do("GET", "/api/v1/manager/analytics/leads?from=2024-02-28&to=2024-02-29"+q, nil); code != 422 {
			t.Errorf("%s: %d %s, want 422", q, code, body)
		}
	}
	if n := e.count(`SELECT count(*) FROM project_requests WHERE id = $1`, id); n != 1 {
		t.Fatalf("request table damaged: %d", n)
	}
}

// Unicode format characters such as U+202E RIGHT-TO-LEFT OVERRIDE would let
// a link reorder how a campaign name looks to the manager; they are removed
// with the other invisible characters (Stage 8.6D).
func TestLeads_BidiCharactersInUTM(t *testing.T) {
	e := newEnv(t)
	s := e.startAnalytics()
	mgr := s.actor(t)
	mgr.login(e)
	id := e.submitRequest(s.actor(t), map[string]any{
		"name": "Bidi " + randomHex(4), "phone": "7011234567", "analytics_session_id": uuid(),
		"attribution": map[string]any{"source_page": "/contact", "landing_page": "/", "utm_source": "google", "utm_medium": "cpc",
			"utm_campaign": "sale\u202etxt.exe\u202c", "utm_term": "a\u200fb"},
	})
	a, _ := mgr.requestAttribution(id)
	for _, k := range []string{"utm_campaign", "utm_term"} {
		if v, _ := a[k].(string); strings.ContainsAny(v, "\u202e\u202c\u200f") {
			t.Errorf("%s keeps bidi/format characters: %q", k, v)
		}
	}
}

// A Google Ads click with auto-tagging carries a click id and no UTM tags.
// The browser sends only a yes/no flag; the visit is paid search, not Google
// organic, and no click id reaches the database (Stage 8.6D).
func TestAnalytics_AdClickWithoutUTM(t *testing.T) {
	e := newEnv(t)
	s := e.startAnalytics()
	visitor := uuid()
	ads, organic := uuid(), uuid()
	e.trackSession(ads)
	e.trackSession(organic)

	b := newBatch(visitor, ads, [2]string{"page_view", "/services/mobile-app-development"})
	b.Session = map[string]any{"landing_path": "/services/mobile-app-development", "utm": map[string]string{}, "referrer_host": "www.google.com", "ad_click": true}
	b.FirstTouch = b.Session
	if code, raw := s.actor(t).send("/api/v1/analytics/events", testOrigin, browserUA, b); code != 204 {
		t.Fatalf("ad click batch: %d %s", code, raw)
	}
	o := newBatch(visitor, organic, [2]string{"page_view", "/services/website-development"})
	o.Session = map[string]any{"landing_path": "/services/website-development", "utm": map[string]string{}, "referrer_host": "www.google.com"}
	if code, raw := s.actor(t).send("/api/v1/analytics/events", testOrigin, browserUA, o); code != 204 {
		t.Fatalf("organic batch: %d %s", code, raw)
	}

	read := func(id string) (src, med, firstSrc, firstMed string) {
		t.Helper()
		if err := e.pool.QueryRow(context.Background(), `SELECT source, medium, first_source, first_medium FROM analytics_sessions WHERE id = $1`, id).
			Scan(&src, &med, &firstSrc, &firstMed); err != nil {
			t.Fatal(err)
		}
		return
	}
	if src, med, fs, fm := read(ads); src != "google" || med != "cpc" || fs != "google" || fm != "cpc" {
		t.Errorf("ad click visit: %s/%s (first %s/%s), want google/cpc", src, med, fs, fm)
	}
	if src, med, _, _ := read(organic); src != "google" || med != "organic" {
		t.Errorf("visit from Google without a click id: %s/%s, want google/organic", src, med)
	}
}

// A session that began on a page reached inside the site has no external
// referrer of its own: its request is "direct", not "unknown" (Stage 8.6D).
func TestLeads_InternalNavigationIsDirect(t *testing.T) {
	e := newEnv(t)
	s := e.startAnalytics()
	mgr := s.actor(t)
	mgr.login(e)
	tag := randomHex(4)
	internal := e.submitRequest(s.actor(t), map[string]any{
		"name": "Внутренний переход " + tag, "phone": "7011234567", "analytics_session_id": uuid(),
		"attribution": map[string]any{"source_page": "/contact", "previous_page": "/services", "landing_page": "/services", "internal_navigation": true},
	})
	deep := e.submitRequest(s.actor(t), map[string]any{
		"name": "Глубокая ссылка " + tag, "phone": "7011234567", "analytics_session_id": uuid(),
		"attribution": map[string]any{"source_page": "/contact", "landing_page": "/contact"},
	})
	if a, _ := mgr.requestAttribution(internal); a == nil || a["channel"] != "direct" || a["landing_page"] != "/services" {
		t.Errorf("internal navigation: %v, want direct", a)
	}
	if a, _ := mgr.requestAttribution(deep); a == nil || a["channel"] != "unknown" {
		t.Errorf("deep link without referrer: %v, want unknown", a)
	}
}
