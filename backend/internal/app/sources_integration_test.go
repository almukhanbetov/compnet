package app_test

// Stage 8.7D: the traffic sources report on a real, migrated PostgreSQL,
// through event intake as browsers send it. The test's sessions are moved
// to days of their own, so other data in the shared test database never
// changes the expected counts.

import (
	"context"
	"encoding/json"
	"fmt"
	"math/rand/v2"
	"testing"
)

type sourcesRow struct {
	Key               string   `json:"key"`
	Sessions          int      `json:"sessions"`
	Visitors          int      `json:"visitors"`
	NewVisitors       int      `json:"new_visitors"`
	ReturningVisitors int      `json:"returning_visitors"`
	ConvertedSessions int      `json:"converted_sessions"`
	Conversion        *float64 `json:"conversion"`
	Share             *float64 `json:"share"`
}

func TestAnalytics_Sources(t *testing.T) {
	e := newEnv(t)
	s := e.startAnalytics()
	a := s.actor(t)
	ctx := context.Background()
	day := fmt.Sprintf("2005-%02d-%02d", 1+rand.IntN(12), 2+rand.IntN(27))

	touch := func(referrer string, utm map[string]string, adClick bool) map[string]any {
		if utm == nil {
			utm = map[string]string{}
		}
		return map[string]any{"landing_path": "/services", "utm": utm, "referrer_host": referrer, "ad_click": adClick}
	}
	// visit stores one session as a consenting browser sends it and moves it to dayOffset,
	// a minute after the previous one (a visitor's sessions keep their order).
	minute := 0
	visit := func(visitor string, session, first map[string]any, dayOffset int) string {
		t.Helper()
		minute++
		id := uuid()
		e.trackSession(id)
		b := newBatch(visitor, id, [2]string{"page_view", "/services"}, [2]string{"page_view", "/contact"})
		b.Session, b.FirstTouch = session, first
		if code, body := a.send("/api/v1/analytics/events", testOrigin, browserUA, b); code != 204 {
			t.Fatalf("ingest: %d %s", code, body)
		}
		if _, err := e.pool.Exec(ctx, `UPDATE analytics_sessions SET started_at = ($2::date + $3::int + time '12:00' + make_interval(mins => $4)) AT TIME ZONE 'Asia/Almaty' WHERE id = $1`, id, day, dayOffset, minute); err != nil {
			t.Fatal(err)
		}
		return id
	}
	google := touch("www.google.com", nil, false)
	direct := touch("", nil, false)
	v1, v2, v3, v4, v5, v6 := uuid(), uuid(), uuid(), uuid(), uuid(), uuid()

	visit(v1, google, google, 0)                                                                // new, Google organic
	visit(v1, direct, google, 0)                                                                // back the same day, direct
	ads := visit(v2, touch("www.google.com", nil, true), touch("www.google.com", nil, true), 0) // gclid, no UTM
	chatUTM := touch("", map[string]string{"source": "chatgpt.com"}, false)
	visit(v3, chatUTM, chatUTM, 0)                                                   // ChatGPT with utm_source
	visit(v4, touch("chatgpt.com", nil, false), touch("chatgpt.com", nil, false), 0) // ChatGPT referrer, no UTM
	visit(v5, touch("l.instagram.com", nil, false), touch("l.instagram.com", nil, false), 0)
	visit(v6, direct, direct, -1) // the day before: outside the period…
	visit(v6, google, direct, 0)  // …so v6 is returning today

	// Two requests from the ad click session: one converted session.
	for i := 0; i < 2; i++ {
		e.submitRequest(s.actor(t), map[string]any{"name": "Источники " + randomHex(4), "phone": "7011234567", "analytics_session_id": ads})
	}

	mgr := s.actor(t)
	mgr.login(e)
	code, raw := mgr.do("GET", "/api/v1/manager/analytics/sources?from="+day+"&to="+day, nil)
	if code != 200 {
		t.Fatalf("sources: %d %s", code, raw)
	}
	var got struct {
		Data struct {
			Totals        sourcesRow   `json:"totals"`
			Channels      []sourcesRow `json:"channels"`
			FirstChannels []sourcesRow `json:"first_channels"`
		} `json:"data"`
	}
	if err := json.Unmarshal(raw, &got); err != nil {
		t.Fatal(err)
	}
	d := got.Data
	tot := d.Totals
	if tot.Sessions != 7 || tot.Visitors != 6 || tot.NewVisitors != 5 || tot.ReturningVisitors != 1 || tot.ConvertedSessions != 1 {
		t.Errorf("totals: %+v", tot)
	}
	type counts struct{ sessions, visitors, new, returning, converted int }
	want := map[string]counts{
		"google_organic": {2, 2, 1, 1, 0}, // v1 new, v6 returning
		"google_cpc":     {1, 1, 1, 0, 1}, // two requests, one converted session
		"chatgpt":        {2, 2, 2, 0, 0}, // with and without UTM
		"direct":         {1, 1, 0, 1, 0}, // v1's second session
		"social":         {1, 1, 1, 0, 0},
		"referral":       {}, "other": {},
	}
	keys := []string{}
	for _, r := range d.Channels {
		keys = append(keys, r.Key)
		w := want[r.Key]
		if (counts{r.Sessions, r.Visitors, r.NewVisitors, r.ReturningVisitors, r.ConvertedSessions}) != w {
			t.Errorf("%s: %+v, want %+v", r.Key, r, w)
		}
	}
	if fmt.Sprint(keys) != "[google_organic google_cpc chatgpt direct social referral other]" {
		t.Errorf("channel order: %v", keys)
	}
	val := func(p *float64) float64 {
		if p == nil {
			return -1
		}
		return *p
	}
	if val(d.Channels[0].Share) != 28.6 || val(d.Channels[1].Conversion) != 100 || val(d.Channels[5].Conversion) != -1 || val(d.Channels[5].Share) != 0 {
		t.Errorf("shares: organic share %v, cpc conversion %v, referral conversion %v share %v",
			val(d.Channels[0].Share), val(d.Channels[1].Conversion), val(d.Channels[5].Conversion), val(d.Channels[5].Share))
	}
	first := map[string]int{}
	for _, r := range d.FirstChannels {
		first[r.Key] = r.Sessions
	}
	if first["google_organic"] != 2 || first["google_cpc"] != 1 || first["chatgpt"] != 2 || first["social"] != 1 || first["direct"] != 1 {
		t.Errorf("by first source: %v", first)
	}

	// The same session and conversion counts as the dashboard.
	code, raw = mgr.do("GET", "/api/v1/manager/analytics/report?from="+day+"&to="+day, nil)
	var rep struct {
		Data struct {
			Totals struct {
				Sessions          int `json:"sessions"`
				Visitors          int `json:"visitors"`
				ConvertedSessions int `json:"converted_sessions"`
			} `json:"totals"`
		} `json:"data"`
	}
	if code != 200 || json.Unmarshal(raw, &rep) != nil || rep.Data.Totals.Sessions != 7 || rep.Data.Totals.Visitors != 6 || rep.Data.Totals.ConvertedSessions != 1 {
		t.Errorf("report disagrees: %d %+v", code, rep.Data.Totals)
	}

	// No data, bad period, no login.
	if code, raw := mgr.do("GET", "/api/v1/manager/analytics/sources?from=2004-01-01&to=2004-01-01", nil); code != 200 || json.Unmarshal(raw, &got) != nil ||
		got.Data.Totals.Sessions != 0 || len(got.Data.Channels) != 7 || got.Data.Channels[0].Share != nil {
		t.Errorf("empty period: %d %s", code, raw)
	}
	if code, _ := mgr.do("GET", "/api/v1/manager/analytics/sources?from="+day+"&to=2004-01-01", nil); code != 422 {
		t.Errorf("reversed period: want 422, got %d", code)
	}
	if code, _ := s.actor(t).do("GET", "/api/v1/manager/analytics/sources?from="+day+"&to="+day, nil); code != 401 {
		t.Errorf("anonymous: want 401, got %d", code)
	}
}
