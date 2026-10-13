package app_test

// Integration tests of the managers' project requests on a real, migrated
// PostgreSQL, through the real server (app.Build) and the real manager
// WebSocket. Run with TEST_DATABASE_URL (see realtime_integration_test.go).

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
	"sync"
	"testing"
	"time"
)

type requestItem struct {
	ID            string `json:"id"`
	Number        int64  `json:"number"`
	Name          string `json:"name"`
	Phone         string `json:"phone"`
	Email         string `json:"email"`
	ProjectType   string `json:"project_type"`
	BudgetRange   string `json:"budget_range"`
	Status        string `json:"status"`
	CreatedAt     string `json:"created_at"`
	Description   string `json:"description"`
	WhatsAppPhone string `json:"whatsapp_phone"`
	Note          struct {
		Text      string  `json:"text"`
		UpdatedAt *string `json:"updated_at"`
		UpdatedBy *struct {
			Name string `json:"name"`
		} `json:"updated_by"`
	} `json:"note"`
	Estimate *struct {
		MinimumTenge *int64 `json:"minimum_tenge"`
		Breakdown    struct {
			DesignLevelID string `json:"design_level_id"`
			Modules       []struct {
				ModuleID string `json:"module_id"`
			} `json:"modules"`
		} `json:"breakdown"`
	} `json:"estimate"`
	History []struct {
		OldStatus string `json:"old_status"`
		NewStatus string `json:"new_status"`
		Staff     struct {
			Name string `json:"name"`
		} `json:"staff"`
		ChangedAt string `json:"changed_at"`
	} `json:"history"`
	Analytics *struct {
		SessionID string `json:"session_id"`
		Source    string `json:"source"`
		Medium    string `json:"medium"`
		Campaign  string `json:"campaign"`
	} `json:"analytics"`
}

type requestList struct {
	Data []requestItem `json:"data"`
	Meta struct {
		Total    int `json:"total"`
		Page     int `json:"page"`
		Limit    int `json:"limit"`
		NewCount int `json:"new_count"`
	} `json:"meta"`
}

func (a *actor) listRequests(query string) requestList {
	a.t.Helper()
	code, body := a.do("GET", "/api/v1/manager/project-requests"+query, nil)
	if code != 200 {
		a.t.Fatalf("list %s: %d %s", query, code, body)
	}
	var out requestList
	if err := json.Unmarshal(body, &out); err != nil {
		a.t.Fatal(err)
	}
	return out
}

func (a *actor) requestDetail(id string) requestItem {
	a.t.Helper()
	code, body := a.do("GET", "/api/v1/manager/project-requests/"+id, nil)
	if code != 200 {
		a.t.Fatalf("detail: %d %s", code, body)
	}
	var out struct {
		Data requestItem `json:"data"`
	}
	if err := json.Unmarshal(body, &out); err != nil {
		a.t.Fatal(err)
	}
	return out.Data
}

func (a *actor) patchRequest(id string, body map[string]any) requestItem {
	a.t.Helper()
	code, raw := a.do("PATCH", "/api/v1/manager/project-requests/"+id, body)
	if code != 200 {
		a.t.Fatalf("patch %v: %d %s", body, code, raw)
	}
	var out struct {
		Data requestItem `json:"data"`
	}
	if err := json.Unmarshal(raw, &out); err != nil {
		a.t.Fatal(err)
	}
	return out.Data
}

// submitRequest posts the public form like the site does.
func (e *env) submitRequest(a *actor, fields map[string]any) string {
	e.t.Helper()
	body := map[string]any{
		"project_type": "corporate", "description": "Описание", "contact_method": "phone", "consent": true,
		"budget_range": "300 000–700 000 ₸",
		"calculator":   map[string]any{"scale_tier_id": "site-s", "selected_module_ids": []string{"auth"}, "design_level_id": "custom", "complexity_id": "standard", "urgency_id": "normal"},
	}
	for k, v := range fields {
		body[k] = v
	}
	code, raw := a.do("POST", "/api/v1/project-requests", body)
	if code != 201 {
		e.t.Fatalf("request: %d %s", code, raw)
	}
	var created struct {
		Data map[string]any `json:"data"`
	}
	_ = json.Unmarshal(raw, &created)
	id, _ := created.Data["id"].(string)
	e.t.Cleanup(func() {
		_, _ = e.pool.Exec(context.Background(), `DELETE FROM project_requests WHERE id = $1`, id)
	})
	// The public answer is the estimate only: nothing the manager adds.
	for _, key := range []string{"note", "manager_note", "history", "number", "phone", "email"} {
		if _, ok := created.Data[key]; ok {
			e.t.Errorf("public response carries %q: %s", key, raw)
		}
	}
	return id
}

// captureLogs collects everything the backend logs during the test.
type logBuffer struct {
	mu  sync.Mutex
	buf bytes.Buffer
}

func (l *logBuffer) Write(p []byte) (int, error) {
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.buf.Write(p)
}

func (l *logBuffer) String() string {
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.buf.String()
}

func captureLogs(t *testing.T) *logBuffer {
	b := &logBuffer{}
	log.SetOutput(b)
	t.Cleanup(func() { log.SetOutput(os.Stderr) })
	return b
}

func TestRequests_ManagerFlow(t *testing.T) {
	logs := captureLogs(t)
	e := newEnv(t)
	s := e.startAnalytics()
	mgr := s.actor(t)
	mgr.login(e)
	sock := mgr.ws("/api/v1/manager/ws")
	tag := randomHex(4)
	newBefore := mgr.listRequests("?limit=1").Meta.NewCount

	// A request from a browser with analytics consent (linked to a session
	// that came from a UTM campaign) and one without consent.
	session := uuid()
	e.trackSession(session)
	visitor := s.actor(t)
	b := newBatch(uuid(), session, [2]string{"page_view", "/contact"})
	b.Session["utm"] = map[string]string{"source": "instagram", "medium": "cpc", "campaign": "autumn"}
	if code, body := visitor.send("/api/v1/analytics/events", testOrigin, browserUA, b); code != 204 {
		t.Fatalf("events: %d %s", code, body)
	}
	secretPhone := "+7701" + fmt.Sprint(1000000+time.Now().UnixNano()%8999999)
	secretEmail := "client-" + tag + "@example.kz"
	secretName := "Айгерим-" + tag
	secretText := "Секретное описание " + tag
	linked := e.submitRequest(visitor, map[string]any{
		"name": secretName, "phone": secretPhone, "email": secretEmail, "description": secretText,
		"analytics_session_id": session,
	})

	// Managers learn about it at once — without any personal data.
	ev := sock.wait("project_request_created", fast, func(ev event) bool { return strings.Contains(string(ev.Data), linked) })
	for _, secret := range []string{secretPhone, secretEmail, secretName, secretText} {
		if strings.Contains(string(ev.Data), secret) {
			t.Fatalf("realtime event carries personal data: %s", ev.Data)
		}
	}
	var evData struct {
		NewCount int `json:"new_count"`
	}
	ev.decode(t, &evData)
	if evData.NewCount != newBefore+1 {
		t.Errorf("new_count = %d, want %d", evData.NewCount, newBefore+1)
	}

	plain := e.submitRequest(s.actor(t), map[string]any{
		"name": "Без согласия " + tag, "phone": "7011234567", "contact_method": "whatsapp",
	})
	sock.wait("project_request_created", fast, func(ev event) bool { return strings.Contains(string(ev.Data), plain) })

	t.Run("list, search, filters, pages", func(t *testing.T) {
		all := mgr.listRequests("?q=" + tag)
		if all.Meta.Total != 2 || len(all.Data) != 2 || all.Data[0].ID != plain || all.Data[1].ID != linked {
			t.Fatalf("search by tag: %+v", all)
		}
		if all.Data[1].Phone != secretPhone || all.Data[1].Email != secretEmail || all.Data[1].Number == 0 {
			t.Errorf("contacts in the list: %+v", all.Data[1])
		}
		// Phone typed with spaces, the request number, the email.
		spaced := secretPhone[:2] + " " + secretPhone[2:5] + " " + secretPhone[5:]
		for _, q := range []string{spaced, fmt.Sprintf("№%d", all.Data[1].Number), secretEmail} {
			found := mgr.listRequests("?q=" + strings.ReplaceAll(strings.ReplaceAll(q, " ", "%20"), "+", "%2B"))
			if found.Meta.Total < 1 || !containsID(found.Data, linked) {
				t.Errorf("search %q: %+v", q, found.Meta)
			}
		}
		today := almatyToday()
		page1 := mgr.listRequests("?q=" + tag + "&from=" + today + "&to=" + today + "&status=new&limit=1&page=1")
		page2 := mgr.listRequests("?q=" + tag + "&from=" + today + "&to=" + today + "&status=new&limit=1&page=2")
		if page1.Meta.Total != 2 || len(page1.Data) != 1 || len(page2.Data) != 1 || page1.Data[0].ID == page2.Data[0].ID {
			t.Errorf("pages: %+v / %+v", page1, page2)
		}
		if old := mgr.listRequests("?q=" + tag + "&to=2020-01-01"); old.Meta.Total != 0 {
			t.Errorf("period filter: %+v", old.Meta)
		}
		for _, bad := range []string{"?status=archived", "?from=2026-13-01", "?from=2026-10-10&to=2026-10-01", "?page=0", "?limit=500"} {
			if code, body := mgr.do("GET", "/api/v1/manager/project-requests"+bad, nil); code != 422 {
				t.Errorf("%s: %d %s", bad, code, body)
			}
		}
	})

	t.Run("detail with contacts, estimate and source", func(t *testing.T) {
		d := mgr.requestDetail(linked)
		if d.Description != secretText || d.Phone != secretPhone || d.Email != secretEmail || d.WhatsAppPhone != strings.TrimPrefix(secretPhone, "+") {
			t.Errorf("client data: %+v", d)
		}
		if d.Estimate == nil || d.Estimate.MinimumTenge == nil || d.Estimate.Breakdown.DesignLevelID != "custom" || len(d.Estimate.Breakdown.Modules) != 1 {
			t.Errorf("estimate: %+v", d.Estimate)
		}
		if d.Analytics == nil || d.Analytics.SessionID != session || d.Analytics.Source != "instagram" || d.Analytics.Campaign != "autumn" {
			t.Errorf("analytics: %+v", d.Analytics)
		}
		p := mgr.requestDetail(plain)
		if p.Analytics != nil {
			t.Errorf("source invented for a request without consent: %+v", p.Analytics)
		}
		if p.WhatsAppPhone != "" {
			t.Errorf("country code guessed for %q: %q", p.Phone, p.WhatsAppPhone)
		}
		if code, _ := mgr.do("GET", "/api/v1/manager/project-requests/"+uuid(), nil); code != 404 {
			t.Errorf("unknown id: %d", code)
		}
		if code, _ := mgr.do("GET", "/api/v1/manager/project-requests/not-an-id", nil); code != 404 {
			t.Errorf("bad id: %d", code)
		}
	})

	t.Run("status, note and history survive a reload", func(t *testing.T) {
		got := mgr.patchRequest(linked, map[string]any{"status": "in_progress", "note": "  Перезвонить после 15:00 " + tag + "  "})
		if got.Status != "in_progress" || len(got.History) != 1 || got.History[0].OldStatus != "new" || got.History[0].NewStatus != "in_progress" || got.History[0].Staff.Name != "Тест Менеджер" {
			t.Fatalf("after patch: %+v", got)
		}
		upd := sock.wait("project_request_updated", fast, func(ev event) bool { return strings.Contains(string(ev.Data), linked) })
		if strings.Contains(string(upd.Data), "Перезвонить") {
			t.Fatalf("note sent over the socket: %s", upd.Data)
		}
		// The same status again: no new history entry, no event.
		mgr.patchRequest(linked, map[string]any{"status": "in_progress"})
		sock.never("project_request_updated", 300*time.Millisecond)
		mgr.patchRequest(linked, map[string]any{"status": "completed"})

		reloaded := mgr.on(s).requestDetail(linked) // fresh client, same session
		if reloaded.Status != "completed" || reloaded.Note.Text != "Перезвонить после 15:00 "+tag || reloaded.Note.UpdatedBy == nil || reloaded.Note.UpdatedBy.Name != "Тест Менеджер" {
			t.Errorf("after reload: %+v", reloaded)
		}
		if len(reloaded.History) != 2 || reloaded.History[0].OldStatus != "in_progress" || reloaded.History[0].NewStatus != "completed" {
			t.Errorf("history: %+v", reloaded.History)
		}
		if f := mgr.listRequests("?q=" + tag + "&status=completed"); f.Meta.Total != 1 || f.Data[0].ID != linked {
			t.Errorf("status filter: %+v", f.Meta)
		}
		cleared := mgr.patchRequest(linked, map[string]any{"note": ""})
		if cleared.Note.Text != "" {
			t.Errorf("note not cleared: %+v", cleared.Note)
		}
		for _, bad := range []map[string]any{{"status": "archived"}, {}, {"note": strings.Repeat("x", 4001)}} {
			if code, body := mgr.do("PATCH", "/api/v1/manager/project-requests/"+linked, bad); code != 422 {
				t.Errorf("patch %v: %d %s", bad, code, body)
			}
		}
	})

	t.Run("statistics link the request without contacts", func(t *testing.T) {
		code, body := mgr.do("GET", "/api/v1/manager/analytics/sessions/"+session, nil)
		if code != 200 {
			t.Fatalf("session: %d %s", code, body)
		}
		if !strings.Contains(string(body), linked) || !strings.Contains(string(body), `"number":`) {
			t.Errorf("request not linked: %s", body)
		}
		for _, secret := range []string{secretPhone, secretEmail, secretName, secretText} {
			if strings.Contains(string(body), secret) {
				t.Errorf("statistics carry personal data %q", secret)
			}
		}
	})

	t.Run("no access without a manager session", func(t *testing.T) {
		anon := s.actor(t)
		for _, call := range [][2]string{
			{"GET", "/api/v1/manager/project-requests"},
			{"GET", "/api/v1/manager/project-requests/summary"},
			{"GET", "/api/v1/manager/project-requests/" + linked},
			{"PATCH", "/api/v1/manager/project-requests/" + linked},
		} {
			code, body := anon.do(call[0], call[1], map[string]string{"status": "rejected"})
			if code != 401 || strings.Contains(string(body), secretPhone) {
				t.Errorf("%s %s: %d %s", call[0], call[1], code, body)
			}
		}
		// The public API has no way to read requests back.
		for _, path := range []string{"/api/v1/project-requests", "/api/v1/project-requests/" + linked} {
			if code, body := anon.do("GET", path, nil); code != 404 && code != 405 {
				t.Errorf("GET %s: %d %s", path, code, body)
			}
		}
		if _, status := anon.dial("/api/v1/manager/ws", testOrigin); status != 401 {
			t.Errorf("manager socket without session: %d", status)
		}
		if got := mgr.requestDetail(linked); got.Status != "completed" {
			t.Errorf("anonymous patch changed the request: %s", got.Status)
		}
	})

	// Nothing personal was written to the server log.
	out := logs.String()
	for _, secret := range []string{secretPhone, strings.TrimPrefix(secretPhone, "+"), secretEmail, secretName, secretText, "Перезвонить"} {
		if strings.Contains(out, secret) {
			t.Errorf("log contains personal data %q:\n%s", secret, out)
		}
	}
}

func containsID(items []requestItem, id string) bool {
	for _, it := range items {
		if it.ID == id {
			return true
		}
	}
	return false
}

// A visitor who accepted analytics and sends the form (or a first chat
// message) before the tracker's first batch arrives keeps the link: the
// conversion waits for the session instead of being lost.
func TestRequests_FastSubmitKeepsAnalyticsLink(t *testing.T) {
	e := newEnv(t)
	s := e.startAnalytics()
	mgr := s.actor(t)
	mgr.login(e)
	tag := randomHex(4)

	session := uuid()
	e.trackSession(session)
	visitor := s.actor(t)
	id := e.submitRequest(visitor, map[string]any{
		"name": "Быстрый " + tag, "phone": "+77017770011", "email": "fast-" + tag + "@example.kz",
		"analytics_session_id": session,
	})
	if n := e.count(`SELECT count(*) FROM analytics_pending_conversions WHERE session_id = $1 AND project_request_id = $2`, session, id); n != 1 {
		t.Fatalf("conversion not kept while the session is unknown: %d", n)
	}
	if d := mgr.requestDetail(id); d.Analytics != nil {
		t.Fatalf("source shown before the session exists: %+v", d.Analytics)
	}

	// The first chat message of the same visit, also before any batch.
	visitor.startChat()
	if code, body := visitor.do("POST", "/api/v1/chat/messages", map[string]string{"client_message_id": uuid(), "body": "Здравствуйте " + tag, "analytics_session_id": session}); code != 201 {
		t.Fatalf("chat: %d %s", code, body)
	}
	var conv string
	if err := e.pool.QueryRow(context.Background(), `SELECT conversation_id::text FROM analytics_pending_conversions WHERE session_id = $1 AND type = 'chat_first_message'`, session).Scan(&conv); err != nil {
		t.Fatalf("chat conversion not kept: %v", err)
	}
	e.track(conv)

	// The tracker's batch arrives afterwards and carries the UTM tags.
	b := newBatch(uuid(), session, [2]string{"page_view", "/contact"})
	b.Session["utm"] = map[string]string{"source": "google", "medium": "cpc", "campaign": "fast_" + tag}
	if code, body := visitor.send("/api/v1/analytics/events", testOrigin, browserUA, b); code != 204 {
		t.Fatalf("events: %d %s", code, body)
	}
	if n := e.count(`SELECT count(*) FROM analytics_pending_conversions WHERE session_id = $1`, session); n != 0 {
		t.Errorf("pending conversions left after the session arrived: %d", n)
	}
	if n := e.count(`SELECT count(*) FROM analytics_events WHERE session_id = $1 AND type = 'lead_submit' AND project_request_id = $2`, session, id); n != 1 {
		t.Errorf("lead not linked: %d", n)
	}
	if n := e.count(`SELECT count(*) FROM analytics_events WHERE session_id = $1 AND type = 'chat_first_message' AND conversation_id = $2`, session, conv); n != 1 {
		t.Errorf("chat not linked: %d", n)
	}
	// Dated when the request was saved, not when the batch came.
	if n := e.count(`SELECT count(*) FROM analytics_events ev JOIN project_requests p ON p.id = ev.project_request_id
		WHERE ev.project_request_id = $1 AND ev.occurred_at <= (SELECT started_at FROM analytics_sessions WHERE id = $2) AND ev.occurred_at >= p.created_at`, id, session); n != 1 {
		t.Errorf("conversion not dated at the request")
	}
	d := mgr.requestDetail(id)
	if d.Analytics == nil || d.Analytics.SessionID != session || d.Analytics.Source != "google" || d.Analytics.Campaign != "fast_"+tag {
		t.Fatalf("source after the batch: %+v", d.Analytics)
	}
	// A repeated batch changes nothing.
	visitor.send("/api/v1/analytics/events", testOrigin, browserUA, newBatch(b.VisitorID, session, [2]string{"page_view", "/"}))
	if n := e.count(`SELECT count(*) FROM analytics_events WHERE session_id = $1 AND type IN ('lead_submit','chat_first_message')`, session); n != 2 {
		t.Errorf("conversions duplicated: %d", n)
	}
	// Nothing personal in the analytics tables.
	if n := e.count(`SELECT count(*) FROM analytics_events WHERE session_id = $1 AND (path LIKE '%' || $2 || '%')`, session, tag); n != 0 {
		t.Errorf("personal data in events")
	}

	// Without consent the form sends no session id: nothing is recorded.
	plain := e.submitRequest(s.actor(t), map[string]any{"name": "Без согласия " + tag, "phone": "+77017770012"})
	if n := e.count(`SELECT (SELECT count(*) FROM analytics_pending_conversions WHERE project_request_id = $1) + (SELECT count(*) FROM analytics_events WHERE project_request_id = $1)`, plain); n != 0 {
		t.Errorf("analytics recorded without consent: %d", n)
	}

	// A session that never arrives (consent withdrawn before the flush): the
	// waiting row is removed by the cleanup task; the request stays.
	lost := uuid()
	orphan := e.submitRequest(s.actor(t), map[string]any{"name": "Отозвал " + tag, "phone": "+77017770013", "analytics_session_id": lost})
	if _, err := e.pool.Exec(context.Background(), `UPDATE analytics_pending_conversions SET created_at = now() - interval '25 hours' WHERE session_id = $1`, lost); err != nil {
		t.Fatal(err)
	}
	if err := s.app.Analytics.Purge(context.Background()); err != nil {
		t.Fatal(err)
	}
	if n := e.count(`SELECT count(*) FROM analytics_pending_conversions WHERE session_id = $1`, lost); n != 0 {
		t.Errorf("stale pending conversion not purged: %d", n)
	}
	if got := mgr.requestDetail(orphan); got.Analytics != nil || got.Name != "Отозвал "+tag {
		t.Errorf("request after purge: %+v", got)
	}
}
