package app_test

// Integration tests of the visit analytics on a real, migrated PostgreSQL,
// through the real server (app.Build). Run with TEST_DATABASE_URL (see
// realtime_integration_test.go).

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/almukha/compnet-backend/internal/config"
)

const browserUA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1"

func (e *env) startAnalytics() *server {
	e.cfg.Analytics = config.AnalyticsConfig{Enabled: true, RetentionDays: 90}
	return e.start()
}

// send posts raw JSON with a browser User-Agent and the given Origin.
func (a *actor) send(path, origin, ua string, body any) (int, []byte) {
	a.t.Helper()
	raw, ok := body.([]byte)
	if !ok {
		raw, _ = json.Marshal(body)
	}
	req, _ := http.NewRequest("POST", a.s.srv.URL+path, bytes.NewReader(raw))
	if origin != "" {
		req.Header.Set("Origin", origin)
	}
	req.Header.Set("User-Agent", ua)
	req.Header.Set("Content-Type", "text/plain;charset=UTF-8") // as the browser sends it
	resp, err := a.client.Do(req)
	if err != nil {
		a.t.Fatal(err)
	}
	defer resp.Body.Close()
	data, _ := io.ReadAll(resp.Body)
	return resp.StatusCode, data
}

type batch struct {
	VisitorID  string              `json:"visitor_id"`
	SessionID  string              `json:"session_id"`
	Language   string              `json:"language"`
	Session    map[string]any      `json:"session"`
	FirstTouch map[string]any      `json:"first_touch"`
	Events     []map[string]string `json:"events"`
}

func newBatch(visitor, session string, events ...[2]string) batch {
	b := batch{VisitorID: visitor, SessionID: session, Language: "kk",
		Session:    map[string]any{"landing_path": "/", "utm": map[string]string{}, "referrer_host": ""},
		FirstTouch: map[string]any{"landing_path": "/", "utm": map[string]string{}, "referrer_host": ""},
	}
	for _, ev := range events {
		b.Events = append(b.Events, map[string]string{"id": uuid(), "type": ev[0], "path": ev[1]})
	}
	return b
}

func (e *env) count(sql string, args ...any) int {
	var n int
	if err := e.pool.QueryRow(context.Background(), sql, args...).Scan(&n); err != nil {
		e.t.Fatalf("%s: %v", sql, err)
	}
	return n
}

func (e *env) trackSession(id string) {
	e.t.Cleanup(func() {
		_, _ = e.pool.Exec(context.Background(), `DELETE FROM analytics_sessions WHERE id = $1`, id)
	})
}

func TestAnalytics_IngestValidationDedupAndAttribution(t *testing.T) {
	e := newEnv(t)
	s := e.startAnalytics()
	a := s.actor(t)
	visitor, session := uuid(), uuid()
	e.trackSession(session)

	b := newBatch(visitor, session, [2]string{"page_view", "/"}, [2]string{"page_view", "/pricing?email=a@b.kz&token=x#top"})
	b.Session = map[string]any{"landing_path": "/?utm_source=instagram",
		"utm":           map[string]string{"source": "Instagram", "medium": "cpc", "campaign": "digital-start"},
		"referrer_host": "l.instagram.com"}
	b.FirstTouch = map[string]any{"landing_path": "/", "utm": map[string]string{}, "referrer_host": "www.google.kz"}
	if code, body := a.send("/api/v1/analytics/events", testOrigin, browserUA, b); code != 204 {
		t.Fatalf("ingest: %d %s", code, body)
	}
	var src, med, camp, firstSrc, firstMed, device, landing, lang string
	if err := e.pool.QueryRow(context.Background(), `SELECT source, medium, campaign, first_source, first_medium, device, landing_path, language FROM analytics_sessions WHERE id = $1`, session).
		Scan(&src, &med, &camp, &firstSrc, &firstMed, &device, &landing, &lang); err != nil {
		t.Fatal(err)
	}
	if src != "instagram" || med != "cpc" || camp != "digital-start" || firstSrc != "google" || firstMed != "organic" || device != "mobile" || landing != "/" || lang != "kk" {
		t.Fatalf("session: %s %s %s first %s/%s %s %s %s", src, med, camp, firstSrc, firstMed, device, landing, lang)
	}
	if n := e.count(`SELECT count(*) FROM analytics_events WHERE session_id = $1 AND path = '/pricing'`, session); n != 1 {
		t.Fatalf("query string must be cut from the path: %d", n)
	}

	// The very same batch again (retry after a lost response): no duplicates.
	a.send("/api/v1/analytics/events", testOrigin, browserUA, b)
	if n := e.count(`SELECT count(*) FROM analytics_events WHERE session_id = $1`, session); n != 2 {
		t.Fatalf("resent batch duplicated events: %d", n)
	}

	// A later direct page in the same session does not overwrite its source.
	b2 := newBatch(visitor, session, [2]string{"page_view", "/contact"})
	a.send("/api/v1/analytics/events", testOrigin, browserUA, b2)
	if n := e.count(`SELECT count(*) FROM analytics_sessions WHERE id = $1 AND source = 'instagram' AND first_source = 'google'`, session); n != 1 {
		t.Fatal("attribution overwritten by a later direct hit")
	}

	// A new direct session of the same visitor keeps the first source.
	direct := uuid()
	e.trackSession(direct)
	b3 := newBatch(visitor, direct, [2]string{"page_view", "/"})
	b3.FirstTouch = b.FirstTouch
	a.send("/api/v1/analytics/events", testOrigin, browserUA, b3)
	if n := e.count(`SELECT count(*) FROM analytics_sessions WHERE id = $1 AND source = '(direct)' AND first_source = 'google'`, direct); n != 1 {
		t.Fatal("direct session must keep the visitor's first source")
	}

	// Refused: conversions from the client, unknown types, oversized
	// batches, bad ids, wrong origin, oversized body.
	for name, bad := range map[string]batch{
		"client lead_submit":  newBatch(visitor, session, [2]string{"lead_submit", "/contact"}),
		"client chat message": newBatch(visitor, session, [2]string{"chat_first_message", "/"}),
		"unknown type":        newBatch(visitor, session, [2]string{"purchase", "/"}),
		"bad visitor id":      newBatch("not-a-uuid", session, [2]string{"page_view", "/"}),
		"empty batch":         newBatch(visitor, session),
	} {
		if code, _ := a.send("/api/v1/analytics/events", testOrigin, browserUA, bad); code != 422 {
			t.Errorf("%s: want 422, got %d", name, code)
		}
	}
	big := newBatch(visitor, session)
	for i := 0; i < 21; i++ {
		big.Events = append(big.Events, map[string]string{"id": uuid(), "type": "page_view", "path": "/"})
	}
	if code, _ := a.send("/api/v1/analytics/events", testOrigin, browserUA, big); code != 422 {
		t.Errorf("21 events: want 422, got %d", code)
	}
	if code, _ := a.send("/api/v1/analytics/events", "https://evil.example", browserUA, newBatch(visitor, session, [2]string{"page_view", "/"})); code != 403 {
		t.Errorf("foreign origin: want 403, got %d", code)
	}
	if code, _ := a.send("/api/v1/analytics/events", testOrigin, browserUA, []byte(`{"events":"`+strings.Repeat("x", 20000)+`"}`)); code != 400 {
		t.Errorf("oversized body: want 400, got %d", code)
	}
	if n := e.count(`SELECT count(*) FROM analytics_events WHERE type IN ('lead_submit','chat_first_message') AND session_id = $1`, session); n != 0 {
		t.Fatal("client-sent conversion stored")
	}

	// Bots, headless browsers and someone else's session are dropped silently.
	for _, ua := range []string{"curl/8.5.0", "Mozilla/5.0 (X11) HeadlessChrome/126.0", "Googlebot/2.1", ""} {
		bot := uuid()
		if code, _ := a.send("/api/v1/analytics/events", testOrigin, ua, newBatch(uuid(), bot, [2]string{"page_view", "/"})); code != 204 {
			t.Errorf("bot %q: want 204, got %d", ua, code)
		}
		if n := e.count(`SELECT count(*) FROM analytics_sessions WHERE id = $1`, bot); n != 0 {
			t.Errorf("bot %q stored", ua)
		}
	}
	hijack := newBatch(uuid(), session, [2]string{"page_view", "/hijack"})
	a.send("/api/v1/analytics/events", testOrigin, browserUA, hijack)
	if n := e.count(`SELECT count(*) FROM analytics_events WHERE path = '/hijack'`); n != 0 {
		t.Fatal("events accepted into another visitor's session")
	}

	// The manager section is never tracked.
	mgr := newBatch(visitor, session, [2]string{"page_view", "/manager/analytics"})
	a.send("/api/v1/analytics/events", testOrigin, browserUA, mgr)
	if n := e.count(`SELECT count(*) FROM analytics_events WHERE path LIKE '/manager%'`); n != 0 {
		t.Fatal("manager page tracked")
	}

	// Write-only: nothing can be read from the public group.
	for _, path := range []string{"/api/v1/analytics/events", "/api/v1/analytics/report", "/api/v1/manager/analytics/report?from=2026-10-01&to=2026-10-13"} {
		if code, body := a.do("GET", path, nil); code == 200 {
			t.Errorf("GET %s readable without staff session: %s", path, body)
		}
	}
	if code, body := a.do("GET", "/api/v1/analytics/config", nil); code != 200 || !strings.Contains(string(body), `"enabled":true`) || !strings.Contains(string(body), `"ga4_measurement_id":""`) {
		t.Fatalf("config: %d %s", code, body)
	}

	// Rate limit per IP (burst 30).
	limited := false
	for i := 0; i < 40 && !limited; i++ {
		code, _ := a.send("/api/v1/analytics/events", testOrigin, browserUA, newBatch(visitor, session, [2]string{"page_view", "/"}))
		limited = code == 429
	}
	if !limited {
		t.Fatal("no rate limit on the public endpoint")
	}
}

func TestAnalytics_DisabledAndLocalhost(t *testing.T) {
	e := newEnv(t)
	e.cfg.CORSAllowedOrigins = append(e.cfg.CORSAllowedOrigins, "http://localhost:3001")
	off := e.start() // analytics disabled (default)
	session := uuid()
	if code, _ := off.actor(t).send("/api/v1/analytics/events", testOrigin, browserUA, newBatch(uuid(), session, [2]string{"page_view", "/"})); code != 204 {
		t.Fatalf("disabled: %d", code)
	}
	if n := e.count(`SELECT count(*) FROM analytics_sessions WHERE id = $1`, session); n != 0 {
		t.Fatal("stored while disabled")
	}
	on := e.startAnalytics()
	local := uuid()
	on.actor(t).send("/api/v1/analytics/events", "http://localhost:3001", browserUA, newBatch(uuid(), local, [2]string{"page_view", "/"}))
	if n := e.count(`SELECT count(*) FROM analytics_sessions WHERE id = $1`, local); n != 0 {
		t.Fatal("localhost traffic stored")
	}
}

type reportData struct {
	Totals map[string]int `json:"totals"`
	Days   []struct {
		Day      string `json:"day"`
		Sessions int    `json:"sessions"`
	} `json:"days"`
}

type reportJSON struct {
	Data reportData `json:"data"`
}

func report(t *testing.T, a *actor, from, to string) reportJSON {
	t.Helper()
	code, body := a.do("GET", "/api/v1/manager/analytics/report?from="+from+"&to="+to, nil)
	if code != 200 {
		t.Fatalf("report: %d %s", code, body)
	}
	var r reportJSON
	if err := json.Unmarshal(body, &r); err != nil {
		t.Fatal(err)
	}
	return r
}

func almatyToday() string {
	loc, _ := time.LoadLocation("Asia/Almaty")
	return time.Now().In(loc).Format("2006-01-02")
}

func TestAnalytics_ConversionsLinksAndReport(t *testing.T) {
	e := newEnv(t)
	s := e.startAnalytics()
	mgr := s.actor(t)
	mgr.login(e)
	today := almatyToday()
	before := report(t, mgr, today, today).Data.Totals

	// Session 1: pages, a request and a chat — converts once.
	v1 := s.actor(t)
	s1 := uuid()
	e.trackSession(s1)
	v1.send("/api/v1/analytics/events", testOrigin, browserUA, newBatch(uuid(), s1,
		[2]string{"page_view", "/"}, [2]string{"promo_view", "/"}, [2]string{"whatsapp_click", "/"}, [2]string{"page_view", "/contact"}))

	const secretPhone, secretEmail, secretText = "+77015550123", "client.secret@example.kz", "Секретный текст переписки"
	code, body := v1.do("POST", "/api/v1/project-requests", map[string]any{
		"name": "Айжан", "phone": secretPhone, "email": secretEmail, "project_type": "corporate",
		"description": "Нужен сайт", "contact_method": "phone", "consent": true,
		"calculator":           map[string]any{"scale_tier_id": "site-s", "selected_module_ids": []string{}, "design_level_id": "basic", "complexity_id": "standard", "urgency_id": "normal"},
		"analytics_session_id": s1,
	})
	if code != 201 {
		t.Fatalf("request: %d %s", code, body)
	}
	var created struct {
		Data struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	_ = json.Unmarshal(body, &created)
	t.Cleanup(func() {
		_, _ = e.pool.Exec(context.Background(), `DELETE FROM project_requests WHERE id = $1`, created.Data.ID)
	})
	if n := e.count(`SELECT count(*) FROM analytics_events WHERE type = 'lead_submit' AND session_id = $1 AND project_request_id = $2`, s1, created.Data.ID); n != 1 {
		t.Fatalf("lead_submit not recorded after save: %d", n)
	}

	v1.startChat()
	first := uuid()
	for i := 0; i < 2; i++ { // the same message twice (retry): one conversion
		if code, body := v1.do("POST", "/api/v1/chat/messages", map[string]string{"client_message_id": first, "body": secretText, "analytics_session_id": s1}); code != 201 && code != 200 {
			t.Fatalf("chat: %d %s", code, body)
		}
	}
	v1.do("POST", "/api/v1/chat/messages", map[string]string{"client_message_id": uuid(), "body": "второе", "analytics_session_id": s1})
	var conv string
	_ = e.pool.QueryRow(context.Background(), `SELECT conversation_id::text FROM analytics_events WHERE type = 'chat_first_message' AND session_id = $1`, s1).Scan(&conv)
	e.track(conv)
	if n := e.count(`SELECT count(*) FROM analytics_events WHERE type = 'chat_first_message' AND session_id = $1`, s1); n != 1 || conv == "" {
		t.Fatalf("chat_first_message must be recorded exactly once: %d", n)
	}

	// Session 2: only a chat; session 3: nothing; session 4: a chat whose
	// first message came before consent → not counted as its conversion.
	v2 := s.actor(t)
	s2 := uuid()
	e.trackSession(s2)
	v2.send("/api/v1/analytics/events", testOrigin, browserUA, newBatch(uuid(), s2, [2]string{"page_view", "/pricing"}))
	v2.startChat()
	v2.do("POST", "/api/v1/chat/messages", map[string]string{"client_message_id": uuid(), "body": "вопрос", "analytics_session_id": s2})
	var conv2 string
	_ = e.pool.QueryRow(context.Background(), `SELECT conversation_id::text FROM analytics_events WHERE type = 'chat_first_message' AND session_id = $1`, s2).Scan(&conv2)
	e.track(conv2)

	s3 := uuid()
	e.trackSession(s3)
	s.actor(t).send("/api/v1/analytics/events", testOrigin, browserUA, newBatch(uuid(), s3, [2]string{"page_view", "/"}))

	v4 := s.actor(t)
	s4 := uuid()
	e.trackSession(s4)
	v4.startChat()
	v4.do("POST", "/api/v1/chat/messages", map[string]string{"client_message_id": uuid(), "body": "до согласия"})
	v4.send("/api/v1/analytics/events", testOrigin, browserUA, newBatch(uuid(), s4, [2]string{"page_view", "/"}))
	v4.do("POST", "/api/v1/chat/messages", map[string]string{"client_message_id": uuid(), "body": "после согласия", "analytics_session_id": s4})
	if n := e.count(`SELECT count(*) FROM analytics_events WHERE type = 'chat_first_message' AND session_id = $1`, s4); n != 0 {
		t.Fatal("a later message must not count as the first one")
	}
	var conv4 string
	_ = e.pool.QueryRow(context.Background(), `SELECT c.id::text FROM chat_conversations c JOIN chat_messages m ON m.conversation_id = c.id WHERE m.body = 'до согласия' LIMIT 1`).Scan(&conv4)
	e.track(conv4)

	after := report(t, mgr, today, today).Data.Totals
	delta := func(k string) int { return after[k] - before[k] }
	if delta("sessions") != 4 || delta("visitors") != 4 {
		t.Errorf("sessions/visitors: +%d/+%d", delta("sessions"), delta("visitors"))
	}
	// S1 has a request AND a chat but converts once; S2 converts; S3, S4 do not.
	if delta("converted_sessions") != 2 {
		t.Errorf("converted sessions: +%d, want +2", delta("converted_sessions"))
	}
	if delta("linked_requests") != 1 || delta("linked_chats") != 2 || delta("requests") != 1 || delta("new_chats") != 3 {
		t.Errorf("requests %d linked %d, chats %d linked %d", delta("requests"), delta("linked_requests"), delta("new_chats"), delta("linked_chats"))
	}
	if delta("page_views") != 5 || delta("whatsapp_clicks") != 1 {
		t.Errorf("page views +%d, whatsapp +%d", delta("page_views"), delta("whatsapp_clicks"))
	}

	// Session history: source → pages → actions → request and chat.
	code, body = mgr.do("GET", "/api/v1/manager/analytics/sessions/"+s1, nil)
	if code != 200 {
		t.Fatalf("session: %d %s", code, body)
	}
	for _, want := range []string{`"type":"page_view"`, `"type":"promo_view"`, `"type":"whatsapp_click"`, `"type":"lead_submit"`, `"type":"chat_first_message"`, created.Data.ID, conv, `"project_type":"corporate"`} {
		if !strings.Contains(string(body), want) {
			t.Errorf("session detail misses %s", want)
		}
	}
	// No contacts or message text in the statistics or the analytics tables.
	for _, secret := range []string{secretPhone, secretEmail, secretText, "Айжан"} {
		if strings.Contains(string(body), secret) {
			t.Errorf("session detail leaks %q", secret)
		}
		if n := e.count(`SELECT count(*) FROM analytics_events e JOIN analytics_sessions s ON s.id = e.session_id
			WHERE e::text LIKE '%' || $1 || '%' OR s::text LIKE '%' || $1 || '%'`, secret); n != 0 {
			t.Errorf("analytics tables contain %q", secret)
		}
	}

	// Only staff: visitors, forged and missing sessions are refused.
	for _, who := range []*actor{v1, s.actor(t)} {
		if code, _ := who.do("GET", "/api/v1/manager/analytics/report?from="+today+"&to="+today, nil); code != 401 {
			t.Errorf("report without staff session: %d", code)
		}
		if code, _ := who.do("GET", "/api/v1/manager/analytics/sessions/"+s1, nil); code != 401 {
			t.Errorf("session without staff session: %d", code)
		}
	}
	if code, _ := mgr.do("GET", "/api/v1/manager/analytics/report?from=2026-10-13&to=2026-10-01", nil); code != 422 {
		t.Errorf("reversed period: %d", code)
	}
}

// Days are Asia/Almaty days: 18:59:59Z belongs to the previous day,
// 19:00:00Z to the next (UTC+5). Also checks the retention cleanup.
func TestAnalytics_AlmatyDaysAndRetention(t *testing.T) {
	e := newEnv(t)
	s := e.startAnalytics()
	mgr := s.actor(t)
	mgr.login(e)
	ctx := context.Background()
	insert := func(at time.Time) string {
		id := uuid()
		e.trackSession(id)
		if _, err := e.pool.Exec(ctx, `INSERT INTO analytics_sessions (id, visitor_id, started_at, last_seen_at, landing_path, source, medium, first_source, first_medium, device)
			VALUES ($1, $2, $3, $3, '/', 'test-boundary', '(none)', 'test-boundary', '(none)', 'desktop')`, id, uuid(), at); err != nil {
			t.Fatal(err)
		}
		return id
	}
	day := time.Date(2026, 9, 15, 0, 0, 0, 0, time.UTC)
	insert(day.Add(18*time.Hour + 59*time.Minute + 59*time.Second)) // 23:59:59 on 15 Sep in Almaty
	insert(day.Add(19 * time.Hour))                                 // 00:00:00 on 16 Sep in Almaty

	r15 := report(t, mgr, "2026-09-15", "2026-09-15").Data
	r16 := report(t, mgr, "2026-09-16", "2026-09-16").Data
	if got := sessionsFrom(r15, "2026-09-15"); got < 1 {
		t.Errorf("15 Sep: %d", got)
	}
	if got := sessionsFrom(r16, "2026-09-16"); got < 1 {
		t.Errorf("16 Sep: %d", got)
	}
	both := report(t, mgr, "2026-09-15", "2026-09-16").Data
	if len(both.Days) != 2 || both.Days[0].Day != "2026-09-15" || both.Days[1].Day != "2026-09-16" {
		t.Fatalf("days: %+v", both.Days)
	}
	n15 := e.count(`SELECT count(*) FROM analytics_sessions WHERE source = 'test-boundary' AND (started_at AT TIME ZONE 'Asia/Almaty')::date = '2026-09-15'`)
	n16 := e.count(`SELECT count(*) FROM analytics_sessions WHERE source = 'test-boundary' AND (started_at AT TIME ZONE 'Asia/Almaty')::date = '2026-09-16'`)
	if n15 != 1 || n16 != 1 {
		t.Fatalf("Almaty day split: 15→%d 16→%d", n15, n16)
	}
	if both.Days[0].Sessions < 1 || both.Days[1].Sessions < 1 {
		t.Fatalf("per-day series: %+v", both.Days)
	}

	// Retention: older than 90 days goes, recent stays.
	old := insert(time.Now().Add(-100 * 24 * time.Hour))
	if _, err := e.pool.Exec(ctx, `INSERT INTO analytics_events (id, session_id, visitor_id, type, occurred_at, path)
		SELECT $2, id, visitor_id, 'page_view', now() - interval '100 days', '/' FROM analytics_sessions WHERE id = $1`, old, uuid()); err != nil {
		t.Fatal(err)
	}
	recent := insert(time.Now())
	if err := s.app.Analytics.Purge(ctx); err != nil {
		t.Fatal(err)
	}
	if e.count(`SELECT count(*) FROM analytics_sessions WHERE id = $1`, old) != 0 || e.count(`SELECT count(*) FROM analytics_events WHERE session_id = $1`, old) != 0 {
		t.Fatal("old analytics not purged")
	}
	if e.count(`SELECT count(*) FROM analytics_sessions WHERE id = $1`, recent) != 1 {
		t.Fatal("recent session purged")
	}
}

func sessionsFrom(r reportData, day string) int {
	for _, d := range r.Days {
		if d.Day == day {
			return d.Sessions
		}
	}
	return 0
}

type visitsJSON struct {
	Data struct {
		Today       string  `json:"today"`
		Since       *string `json:"since"`
		TodayCounts struct {
			Visits    int64 `json:"visits"`
			Visitors  int64 `json:"visitors"`
			PageViews int64 `json:"page_views"`
		} `json:"today_counts"`
		AllTime struct {
			Visits    int64 `json:"visits"`
			PageViews int64 `json:"page_views"`
		} `json:"all_time"`
	} `json:"data"`
}

func visits(t *testing.T, a *actor) visitsJSON {
	t.Helper()
	code, body := a.do("GET", "/api/v1/manager/analytics/visits", nil)
	if code != 200 {
		t.Fatalf("visits: %d %s", code, body)
	}
	var v visitsJSON
	if err := json.Unmarshal(body, &v); err != nil {
		t.Fatal(err)
	}
	return v
}

// The visit counter: today and all time, no double counting of resent
// batches, live notice to managers, and totals that survive the cleanup.
func TestAnalytics_VisitCounter(t *testing.T) {
	e := newEnv(t)
	s := e.startAnalytics()
	mgr := s.actor(t)
	mgr.login(e)
	sock := mgr.ws("/api/v1/manager/ws")

	if code, _ := s.actor(t).do("GET", "/api/v1/manager/analytics/visits", nil); code != 401 {
		t.Fatalf("visits without a session: %d", code)
	}
	code, raw := mgr.do("GET", "/api/v1/manager/analytics/visits", nil)
	if code != 200 || !strings.Contains(string(raw), `"visitors":`) || !strings.Contains(string(raw), `"page_views":`) {
		t.Fatalf("every today figure must be present, zeros included: %d %s", code, raw)
	}
	before := visits(t, mgr).Data
	if before.Today != almatyToday() {
		t.Fatalf("today = %s, want %s", before.Today, almatyToday())
	}

	// A visit: landing page, a second page.
	visitor, session := uuid(), uuid()
	e.trackSession(session)
	v := s.actor(t)
	first := newBatch(visitor, session, [2]string{"page_view", "/"}, [2]string{"promo_view", "/"}, [2]string{"page_view", "/pricing"})
	if code, body := v.send("/api/v1/analytics/events", testOrigin, browserUA, first); code != 204 {
		t.Fatalf("events: %d %s", code, body)
	}
	sock.wait("analytics_updated", fast, nil)
	now := visits(t, mgr).Data
	if now.TodayCounts.Visits != before.TodayCounts.Visits+1 || now.TodayCounts.Visitors != before.TodayCounts.Visitors+1 || now.TodayCounts.PageViews != before.TodayCounts.PageViews+2 {
		t.Fatalf("after a visit: %+v → %+v", before.TodayCounts, now.TodayCounts)
	}
	if now.AllTime.Visits != before.AllTime.Visits+1 || now.AllTime.PageViews != before.AllTime.PageViews+2 || now.Since == nil {
		t.Fatalf("all time: %+v → %+v (since %v)", before.AllTime, now.AllTime, now.Since)
	}

	// The same batch again (a retry): nothing changes, no notice.
	v.send("/api/v1/analytics/events", testOrigin, browserUA, first)
	sock.never("analytics_updated", 3500*time.Millisecond)
	if again := visits(t, mgr).Data; again.TodayCounts != now.TodayCounts || again.AllTime != now.AllTime {
		t.Fatalf("resent batch counted: %+v", again)
	}

	// A reload in the same visit: one more view, same visit.
	v.send("/api/v1/analytics/events", testOrigin, browserUA, newBatch(visitor, session, [2]string{"page_view", "/pricing"}))
	sock.wait("analytics_updated", 4*time.Second, nil)
	reload := visits(t, mgr).Data
	if reload.TodayCounts.Visits != now.TodayCounts.Visits || reload.TodayCounts.PageViews != now.TodayCounts.PageViews+1 {
		t.Fatalf("reload: %+v → %+v", now.TodayCounts, reload.TodayCounts)
	}

	// A new session of the same browser (after 30 min idle): a new visit,
	// the same visitor.
	session2 := uuid()
	e.trackSession(session2)
	v.send("/api/v1/analytics/events", testOrigin, browserUA, newBatch(visitor, session2, [2]string{"page_view", "/"}))
	second := visits(t, mgr).Data
	if second.TodayCounts.Visits != reload.TodayCounts.Visits+1 || second.TodayCounts.Visitors != reload.TodayCounts.Visitors {
		t.Fatalf("second session: %+v → %+v", reload.TodayCounts, second.TodayCounts)
	}

	// An old day (past the retention period): counted in all time, then
	// stored as a daily total when the cleanup deletes its details.
	ctx := context.Background()
	oldDay := "2025-01-15"
	oldSession := uuid()
	t.Cleanup(func() {
		_, _ = e.pool.Exec(ctx, `DELETE FROM analytics_sessions WHERE id = $1`, oldSession)
		_, _ = e.pool.Exec(ctx, `DELETE FROM analytics_daily_totals WHERE day = $1`, oldDay)
	})
	if _, err := e.pool.Exec(ctx, `DELETE FROM analytics_daily_totals WHERE day = $1`, oldDay); err != nil {
		t.Fatal(err)
	}
	at := `('2025-01-15 10:00'::timestamp AT TIME ZONE 'Asia/Almaty')`
	if _, err := e.pool.Exec(ctx, `INSERT INTO analytics_sessions (id, visitor_id, started_at, last_seen_at, landing_path, source, medium, first_source, first_medium, device, event_count)
		VALUES ($1, $2, `+at+`, `+at+`, '/', '(direct)', '(none)', '(direct)', '(none)', 'desktop', 3)`, oldSession, uuid()); err != nil {
		t.Fatal(err)
	}
	for i := 0; i < 3; i++ {
		if _, err := e.pool.Exec(ctx, `INSERT INTO analytics_events (id, session_id, visitor_id, type, occurred_at, path)
			SELECT gen_random_uuid(), id, visitor_id, 'page_view', `+at+`, '/' FROM analytics_sessions WHERE id = $1`, oldSession); err != nil {
			t.Fatal(err)
		}
	}
	withOld := visits(t, mgr).Data
	if withOld.AllTime.Visits != second.AllTime.Visits+1 || withOld.AllTime.PageViews != second.AllTime.PageViews+3 || withOld.Since == nil || *withOld.Since > oldDay {
		t.Fatalf("old day not counted: %+v since %v", withOld.AllTime, withOld.Since)
	}
	if err := s.app.Analytics.Purge(ctx); err != nil {
		t.Fatal(err)
	}
	if n := e.count(`SELECT count(*) FROM analytics_sessions WHERE id = $1`, oldSession); n != 0 {
		t.Fatalf("old details not deleted")
	}
	if n := e.count(`SELECT count(*) FROM analytics_daily_totals WHERE day = $1 AND sessions = 1 AND visitors = 1 AND page_views = 3`, oldDay); n != 1 {
		t.Fatalf("day total not stored")
	}
	if n := e.count(`SELECT count(*) FROM analytics_daily_totals WHERE day >= ((now() AT TIME ZONE 'Asia/Almaty')::date - 1)`); n != 0 {
		t.Fatalf("recent days stored as totals: %d", n)
	}
	afterPurge := visits(t, mgr).Data
	if afterPurge.AllTime != withOld.AllTime || afterPurge.TodayCounts != withOld.TodayCounts || afterPurge.Since == nil || *afterPurge.Since != oldDay {
		t.Fatalf("cleanup changed the counter: %+v → %+v (since %v)", withOld, afterPurge, afterPurge.Since)
	}
	// A second cleanup changes nothing.
	if err := s.app.Analytics.Purge(ctx); err != nil {
		t.Fatal(err)
	}
	if again := visits(t, mgr).Data; again.AllTime != afterPurge.AllTime {
		t.Fatalf("second cleanup: %+v", again.AllTime)
	}
}

// Stage 8.7B: the funnel steps are stored (the migrated type check accepts
// them) with the path only, are never conversions, and resending the batch
// adds nothing.
func TestAnalytics_FunnelEvents(t *testing.T) {
	e := newEnv(t)
	s := e.startAnalytics()
	a := s.actor(t)
	visitor, session := uuid(), uuid()
	e.trackSession(session)

	b := newBatch(visitor, session,
		[2]string{"page_view", "/calculator"},
		[2]string{"calculator_start", "/calculator"},
		[2]string{"calculator_result", "/calculator?type=corporate&phone=77001234567"},
		[2]string{"cta_click", "/calculator"},
		[2]string{"form_start", "/contact"},
		[2]string{"email_click", "/contact"},
	)
	for i := 0; i < 2; i++ { // the second time: a retry with the same ids
		if code, body := a.send("/api/v1/analytics/events", testOrigin, browserUA, b); code != 204 {
			t.Fatalf("ingest %d: %d %s", i, code, body)
		}
	}
	for _, typ := range []string{"calculator_start", "calculator_result", "cta_click", "form_start", "email_click"} {
		if n := e.count(`SELECT count(*) FROM analytics_events WHERE session_id = $1 AND type = $2`, session, typ); n != 1 {
			t.Errorf("%s stored %d times, want 1", typ, n)
		}
	}
	if n := e.count(`SELECT count(*) FROM analytics_events WHERE session_id = $1 AND path LIKE '%?%'`, session); n != 0 {
		t.Fatal("query string kept in a funnel event path")
	}
	if n := e.count(`SELECT count(*) FROM analytics_events WHERE session_id = $1 AND (type IN ('lead_submit','chat_first_message') OR project_request_id IS NOT NULL OR conversation_id IS NOT NULL)`, session); n != 0 {
		t.Fatal("a funnel step was stored as a conversion")
	}
	if n := e.count(`SELECT event_count FROM analytics_sessions WHERE id = $1`, session); n != 6 {
		t.Fatalf("event_count %d, want 6", n)
	}
	// Names close to the new ones are still refused.
	if code, _ := a.send("/api/v1/analytics/events", testOrigin, browserUA, newBatch(visitor, session, [2]string{"form_submit", "/contact"})); code != 422 {
		t.Errorf("form_submit: want 422, got %d", code)
	}
}
