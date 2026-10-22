package app_test

// Integration tests of the request source (attribution) and the requests
// report on a real, migrated PostgreSQL through the real server. Run with
// TEST_DATABASE_URL (see realtime_integration_test.go).

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
)

type leadsReport struct {
	Totals struct {
		Requests      int `json:"requests"`
		Tracked       int `json:"tracked"`
		New           int `json:"new"`
		InProgress    int `json:"in_progress"`
		Completed     int `json:"completed"`
		Rejected      int `json:"rejected"`
		GoogleOrganic int `json:"google_organic"`
		Paid          int `json:"paid"`
		Social        int `json:"social"`
	} `json:"totals"`
	Conversion   *json.RawMessage `json:"conversion"`
	Channels     []leadCount      `json:"channels"`
	Pages        []leadCount      `json:"pages"`
	ServicePages []leadCount      `json:"service_pages"`
	ProjectTypes []leadCount      `json:"project_types"`
	Days         []leadCount      `json:"days"`
}

type leadCount struct {
	Key   string `json:"key"`
	Count int    `json:"count"`
}

func countsOf(rows []leadCount) map[string]int {
	out := map[string]int{}
	for _, r := range rows {
		out[r.Key] = r.Count
	}
	return out
}

func (a *actor) leads(query string) leadsReport {
	a.t.Helper()
	code, raw := a.do("GET", "/api/v1/manager/analytics/leads"+query, nil)
	if code != 200 {
		a.t.Fatalf("leads %s: %d %s", query, code, raw)
	}
	var out struct {
		Data leadsReport `json:"data"`
	}
	if err := json.Unmarshal(raw, &out); err != nil {
		a.t.Fatal(err)
	}
	return out.Data
}

func (a *actor) requestAttribution(id string) (map[string]any, string) {
	a.t.Helper()
	code, raw := a.do("GET", "/api/v1/manager/project-requests/"+id, nil)
	if code != 200 {
		a.t.Fatalf("request %s: %d %s", id, code, raw)
	}
	var out struct {
		Data struct {
			Attribution map[string]any `json:"attribution"`
		} `json:"data"`
	}
	if err := json.Unmarshal(raw, &out); err != nil {
		a.t.Fatal(err)
	}
	return out.Data.Attribution, string(raw)
}

func TestLeads_AttributionAndReport(t *testing.T) {
	e := newEnv(t)
	s := e.startAnalytics() // sources are kept only while visit analytics is on
	mgr := s.actor(t)
	mgr.login(e)
	tag := randomHex(4)
	appCalc := map[string]any{"scale_tier_id": "app-s", "selected_module_ids": []string{}, "design_level_id": "basic", "complexity_id": "standard", "urgency_id": "normal"}

	// A mobile app request sent on its service page, found through Google.
	organic := e.submitRequest(s.actor(t), map[string]any{
		"name": "Органика " + tag, "phone": "7011234567", "project_type": "mobile-app", "calculator": appCalc,
		"analytics_session_id": uuid(),
		"attribution": map[string]any{
			"source_page": "/services/mobile-app-development", "previous_page": "/",
			"landing_page": "/", "referrer_host": "www.google.kz",
		},
	})
	// Google Ads, opened /contact from the website page.
	paid := e.submitRequest(s.actor(t), map[string]any{
		"name": "Реклама " + tag, "phone": "7011234567",
		"analytics_session_id": uuid(),
		"attribution": map[string]any{
			"source_page": "/contact", "previous_page": "/services/website-development",
			"landing_page": "/services/website-development", "utm_source": "google", "utm_medium": "cpc",
			"utm_campaign": "autumn-sites", "click_id": "gclid",
		},
	})
	// No consent: a source without a session id is not stored.
	unknown := e.submitRequest(s.actor(t), map[string]any{
		"name": "Без согласия " + tag, "phone": "7011234567",
		"attribution": map[string]any{"source_page": "/contact", "utm_source": "google", "utm_medium": "cpc"},
	})
	// Social, with markup in a campaign name.
	social := e.submitRequest(s.actor(t), map[string]any{
		"name": "Соцсети " + tag, "phone": "7011234567",
		"analytics_session_id": uuid(),
		"attribution": map[string]any{
			"source_page": "/services/website-development", "landing_page": "/services/website-development",
			"utm_source": "instagram", "utm_medium": "social", "utm_campaign": `<script>alert(1)</script>`,
		},
	})

	t.Run("request card shows the stored source", func(t *testing.T) {
		a, _ := mgr.requestAttribution(organic)
		if a == nil || a["channel"] != "organic_search" || a["source"] != "google" ||
			a["source_page"] != "/services/mobile-app-development" || a["referrer_host"] != "google.kz" || a["ad_click"] != false {
			t.Fatalf("organic: %v", a)
		}
		a, raw := mgr.requestAttribution(paid)
		if a == nil || a["channel"] != "paid_search" || a["ad_click"] != true || a["utm_campaign"] != "autumn-sites" ||
			a["previous_page"] != "/services/website-development" {
			t.Fatalf("paid: %v", a)
		}
		if strings.Contains(raw, "gclid") {
			t.Errorf("click id type exposed to the manager: %s", raw)
		}
		if a, _ := mgr.requestAttribution(unknown); a != nil {
			t.Fatalf("source stored without consent: %v", a)
		}
		a, raw = mgr.requestAttribution(social)
		if a == nil || a["channel"] != "social" || a["utm_campaign"] != `<script>alert(1)</script>` {
			t.Fatalf("social: %v", a)
		}
		if strings.Contains(raw, "<script>") {
			t.Errorf("markup not escaped in JSON: %s", raw)
		}
	})

	// Move the requests into a period of their own. Asia/Almaty is UTC+5:
	// 18:59:59Z is still 10 June there, 19:00:00Z is already 11 June.
	ctx := context.Background()
	for id, at := range map[string]string{
		organic: "2025-06-10T18:59:59Z",
		paid:    "2025-06-10T19:00:00Z",
		unknown: "2025-06-11T10:00:00Z",
		social:  "2025-06-12T05:00:00Z",
	} {
		if _, err := e.pool.Exec(ctx, `UPDATE project_requests SET created_at = $2 WHERE id = $1`, id, at); err != nil {
			t.Fatal(err)
		}
	}
	if _, err := e.pool.Exec(ctx, `UPDATE project_requests SET status = 'in_progress' WHERE id = $1`, paid); err != nil {
		t.Fatal(err)
	}
	if _, err := e.pool.Exec(ctx, `UPDATE project_requests SET status = 'rejected' WHERE id = $1`, unknown); err != nil {
		t.Fatal(err)
	}

	t.Run("report over the period", func(t *testing.T) {
		r := mgr.leads("?from=2025-06-10&to=2025-06-12")
		x := r.Totals
		if x.Requests != 4 || x.Tracked != 3 || x.New != 2 || x.InProgress != 1 || x.Rejected != 1 || x.Completed != 0 {
			t.Errorf("totals: %+v", x)
		}
		if x.GoogleOrganic != 1 || x.Paid != 1 || x.Social != 1 {
			t.Errorf("channel cards: %+v", x)
		}
		if got := countsOf(r.Days); got["2025-06-10"] != 1 || got["2025-06-11"] != 2 || got["2025-06-12"] != 1 || len(r.Days) != 3 {
			t.Errorf("Asia/Almaty days: %v", r.Days)
		}
		if got := countsOf(r.Channels); got["organic_search"] != 1 || got["paid_search"] != 1 || got["social"] != 1 || got["unknown"] != 1 {
			t.Errorf("channels: %v", r.Channels)
		}
		if got := countsOf(r.ServicePages); got["/services/mobile-app-development"] != 1 || got["/services/website-development"] != 1 || len(got) != 2 {
			t.Errorf("service pages: %v", r.ServicePages)
		}
		if got := countsOf(r.Pages); got[""] != 1 || got["/contact"] != 1 {
			t.Errorf("pages (unknown page counted as \"\"): %v", r.Pages)
		}
		if got := countsOf(r.ProjectTypes); got["corporate"] != 3 || got["mobile-app"] != 1 {
			t.Errorf("project types: %v", r.ProjectTypes)
		}
		if r.Conversion != nil {
			t.Errorf("conversion without any consented visits in the period: %s", *r.Conversion)
		}
	})

	t.Run("single Almaty days", func(t *testing.T) {
		if n := mgr.leads("?from=2025-06-10&to=2025-06-10").Totals.Requests; n != 1 {
			t.Errorf("10 June: %d requests, want 1", n)
		}
		if n := mgr.leads("?from=2025-06-11&to=2025-06-11").Totals.Requests; n != 2 {
			t.Errorf("11 June: %d requests, want 2", n)
		}
	})

	t.Run("filters", func(t *testing.T) {
		period := "?from=2025-06-10&to=2025-06-12"
		for query, want := range map[string]int{
			"&channel=unknown":                        1, // no stored source counts as unknown
			"&channel=paid_search":                    1,
			"&page=%2Fcontact":                        1,
			"&page=%2Fservices%2Fwebsite-development": 1,
			"&project_type=mobile-app":                1,
			"&project_type=corporate&channel=social":  1,
			"&channel=email":                          0,
		} {
			r := mgr.leads(period + query)
			if r.Totals.Requests != want {
				t.Errorf("%s: %d requests, want %d", query, r.Totals.Requests, want)
			}
			if r.Conversion != nil {
				t.Errorf("%s: conversion computed with a filter", query)
			}
		}
	})

	t.Run("invalid filters and access", func(t *testing.T) {
		for _, q := range []string{
			"?from=2025-06-10&to=2025-06-12&channel=ads",
			"?from=2025-06-10&to=2025-06-12&page=https%3A%2F%2Fevil.example",
			"?from=2025-06-10&to=2025-06-12&project_type=%3Cscript%3E",
			"?from=2025-06-12&to=2025-06-10",
		} {
			if code, raw := mgr.do("GET", "/api/v1/manager/analytics/leads"+q, nil); code != 422 {
				t.Errorf("%s: %d %s, want 422", q, code, raw)
			}
		}
		if code, _ := s.actor(t).do("GET", "/api/v1/manager/analytics/leads?from=2025-06-10&to=2025-06-12", nil); code != 401 {
			t.Errorf("anonymous: %d, want 401", code)
		}
		if code, _ := s.actor(t).do("GET", "/api/v1/analytics/leads?from=2025-06-10&to=2025-06-12", nil); code != 404 {
			t.Errorf("public path: %d, want 404 (no public API)", code)
		}
	})
}

// Conversion compares sessions of consenting browsers with how many of
// them sent a request: computed only without filters, from like data.
func TestLeads_ConversionUsesConsentedVisits(t *testing.T) {
	e := newEnv(t)
	s := e.startAnalytics()
	mgr := s.actor(t)
	mgr.login(e)
	visitor := s.actor(t)

	session := uuid()
	e.trackSession(session)
	b := newBatch(uuid(), session, [2]string{"page_view", "/services/mobile-app-development"})
	if code, body := visitor.send("/api/v1/analytics/events", testOrigin, browserUA, b); code != 204 {
		t.Fatalf("events: %d %s", code, body)
	}
	e.submitRequest(visitor, map[string]any{
		"name": "Конверсия " + randomHex(4), "phone": "7011234567", "analytics_session_id": session,
		"attribution": map[string]any{"source_page": "/services/mobile-app-development", "landing_page": "/services/mobile-app-development"},
	})

	today := almatyToday()
	var out struct {
		Data struct {
			Conversion *struct {
				Sessions            int `json:"sessions"`
				SessionsWithRequest int `json:"sessions_with_request"`
			} `json:"conversion"`
		} `json:"data"`
	}
	code, raw := mgr.do("GET", "/api/v1/manager/analytics/leads?from="+today+"&to="+today, nil)
	if code != 200 || json.Unmarshal(raw, &out) != nil {
		t.Fatalf("leads: %d %s", code, raw)
	}
	c := out.Data.Conversion
	if c == nil || c.Sessions < 1 || c.SessionsWithRequest < 1 || c.SessionsWithRequest > c.Sessions {
		t.Fatalf("conversion: %s", raw)
	}
	if r := mgr.leads("?from=" + today + "&to=" + today + "&page=%2Fservices%2Fmobile-app-development"); r.Conversion != nil {
		t.Errorf("conversion with a page filter: %s", *r.Conversion)
	}
}

func TestLeads_NoAttributionWhileAnalyticsOff(t *testing.T) {
	e := newEnv(t)
	s := e.start() // ANALYTICS_ENABLED=false
	mgr := s.actor(t)
	mgr.login(e)
	id := e.submitRequest(s.actor(t), map[string]any{
		"name": "Аналитика выключена " + randomHex(4), "phone": "7011234567", "analytics_session_id": uuid(),
		"attribution": map[string]any{"source_page": "/contact", "utm_source": "google", "utm_medium": "cpc", "click_id": "gclid"},
	})
	if a, _ := mgr.requestAttribution(id); a != nil {
		t.Fatalf("source stored while analytics is off: %v", a)
	}
}
