package app_test

// Stage 8.7C: the conversion funnel on a real, migrated PostgreSQL. The
// test's sessions are moved to a day of their own, so other data in the
// shared test database never changes the expected counts.

import (
	"context"
	"encoding/json"
	"fmt"
	"math/rand/v2"
	"testing"
)

type funnelStep struct {
	Key        string   `json:"key"`
	Sessions   int      `json:"sessions"`
	OfFirst    *float64 `json:"of_first"`
	OfPrevious *float64 `json:"of_previous"`
	Lost       int      `json:"lost"`
	LostPct    *float64 `json:"lost_pct"`
}

type funnelBody struct {
	Data struct {
		Period struct {
			From, To string
		} `json:"period"`
		Steps             []funnelStep `json:"steps"`
		ConvertedSessions int          `json:"converted_sessions"`
		OutsideFunnel     int          `json:"conversions_outside_funnel"`
		StepEventsSince   *string      `json:"step_events_since"`
	} `json:"data"`
}

func TestAnalytics_Funnel(t *testing.T) {
	e := newEnv(t)
	s := e.startAnalytics()
	a := s.actor(t)
	ctx := context.Background()
	day := fmt.Sprintf("2004-%02d-%02d", 1+rand.IntN(12), 1+rand.IntN(28))

	visit := func(events ...[2]string) string {
		t.Helper()
		session := uuid()
		e.trackSession(session)
		if code, body := a.send("/api/v1/analytics/events", testOrigin, browserUA, newBatch(uuid(), session, events...)); code != 204 {
			t.Fatalf("ingest: %d %s", code, body)
		}
		return session
	}
	request := func(session string) {
		t.Helper()
		e.submitRequest(s.actor(t), map[string]any{"name": "Воронка " + randomHex(4), "phone": "7011234567", "analytics_session_id": session})
	}

	// A: the home page only — a visit.
	sa := visit([2]string{"page_view", "/"})
	// B: a service page — interest.
	sb := visit([2]string{"page_view", "/"}, [2]string{"page_view", "/services/website-development"})
	// C: the calculator, started twice (the session still counts once).
	sc := visit([2]string{"page_view", "/calculator"}, [2]string{"calculator_start", "/calculator"}, [2]string{"calculator_result", "/calculator"},
		[2]string{"page_view", "/calculator"}, [2]string{"calculator_start", "/calculator"})
	// D: the whole way, in the usual order — a link to the form BEFORE the
	// form is started — and two requests: one converted session.
	sd := visit([2]string{"page_view", "/services"}, [2]string{"cta_click", "/services"}, [2]string{"page_view", "/contact"}, [2]string{"form_start", "/contact"})
	request(sd)
	request(sd)
	// E: a request from the home page: converted, but outside the funnel.
	se := visit([2]string{"page_view", "/"}, [2]string{"cta_click", "/"}, [2]string{"form_start", "/contact"})
	request(se)
	// F: interest and a click, never started: stops at interest.
	sf := visit([2]string{"page_view", "/calculator"}, [2]string{"email_click", "/calculator"})
	// Outside the period: the whole way, on another day.
	so := visit([2]string{"page_view", "/services"}, [2]string{"form_start", "/contact"}, [2]string{"cta_click", "/contact"})
	request(so)

	ids := []string{sa, sb, sc, sd, se, sf}
	if _, err := e.pool.Exec(ctx, `UPDATE analytics_sessions SET started_at = ($2::date + time '12:00') AT TIME ZONE 'Asia/Almaty' WHERE id = ANY($1::uuid[])`, ids, day); err != nil {
		t.Fatal(err)
	}
	if _, err := e.pool.Exec(ctx, `UPDATE analytics_sessions SET started_at = ($2::date + 1 + time '12:00') AT TIME ZONE 'Asia/Almaty' WHERE id = $1`, so, day); err != nil {
		t.Fatal(err)
	}
	if n := e.count(`SELECT count(*) FROM analytics_events WHERE session_id = $1 AND type = 'lead_submit'`, sd); n != 2 {
		t.Fatalf("session D: %d request conversions, want 2", n)
	}

	mgr := s.actor(t)
	mgr.login(e)
	code, raw := mgr.do("GET", "/api/v1/manager/analytics/funnel?from="+day+"&to="+day, nil)
	if code != 200 {
		t.Fatalf("funnel: %d %s", code, raw)
	}
	var got funnelBody
	if err := json.Unmarshal(raw, &got); err != nil {
		t.Fatal(err)
	}
	f := got.Data
	want := []struct {
		key                 string
		sessions, lost      int
		ofFirst, ofPrevious float64 // -1: null
	}{
		{"visit", 6, 0, 100, -1},
		{"interest", 4, 2, 66.7, 66.7},  // B, C, D, F
		{"start", 2, 2, 33.3, 50},       // C, D
		{"intent", 1, 1, 16.7, 50},      // D (F clicked, but never started)
		{"conversion", 1, 0, 16.7, 100}, // D, once for two requests
	}
	if len(f.Steps) != len(want) {
		t.Fatalf("steps: %+v", f.Steps)
	}
	val := func(p *float64) float64 {
		if p == nil {
			return -1
		}
		return *p
	}
	for i, w := range want {
		st := f.Steps[i]
		if st.Key != w.key || st.Sessions != w.sessions || st.Lost != w.lost || val(st.OfFirst) != w.ofFirst || val(st.OfPrevious) != w.ofPrevious {
			t.Errorf("step %d: got %s %d lost %d of_first %v of_previous %v, want %+v", i, st.Key, st.Sessions, st.Lost, val(st.OfFirst), val(st.OfPrevious), w)
		}
	}
	if f.Steps[0].LostPct != nil || val(f.Steps[1].LostPct) != 33.3 {
		t.Errorf("lost shares: %v %v", f.Steps[0].LostPct, val(f.Steps[1].LostPct))
	}
	if f.ConvertedSessions != 2 || f.OutsideFunnel != 1 || f.StepEventsSince == nil || f.Period.From != day || f.Period.To != day {
		t.Errorf("converted %d, outside %d, since %v, period %+v", f.ConvertedSessions, f.OutsideFunnel, f.StepEventsSince, f.Period)
	}

	// The same figures as the dashboard: sessions and converted sessions.
	code, raw = mgr.do("GET", "/api/v1/manager/analytics/report?from="+day+"&to="+day, nil)
	var rep struct {
		Data struct {
			Totals struct {
				Sessions          int `json:"sessions"`
				ConvertedSessions int `json:"converted_sessions"`
			} `json:"totals"`
		} `json:"data"`
	}
	if code != 200 || json.Unmarshal(raw, &rep) != nil || rep.Data.Totals.Sessions != 6 || rep.Data.Totals.ConvertedSessions != 2 {
		t.Errorf("report disagrees: %d %+v", code, rep.Data.Totals)
	}

	// No data, bad period, no login.
	code, raw = mgr.do("GET", "/api/v1/manager/analytics/funnel?from=2003-01-01&to=2003-01-01", nil)
	if err := json.Unmarshal(raw, &got); code != 200 || err != nil || got.Data.Steps[0].Sessions != 0 || got.Data.Steps[1].OfFirst != nil || got.Data.Steps[1].OfPrevious != nil {
		t.Errorf("empty period: %d %s", code, raw)
	}
	if code, _ := mgr.do("GET", "/api/v1/manager/analytics/funnel?from="+day+"&to=2003-01-01", nil); code != 422 {
		t.Errorf("reversed period: want 422, got %d", code)
	}
	if code, _ := s.actor(t).do("GET", "/api/v1/manager/analytics/funnel?from="+day+"&to="+day, nil); code != 401 {
		t.Errorf("anonymous: want 401, got %d", code)
	}
}
