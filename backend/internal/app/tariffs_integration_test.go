package app_test

// Tariffs and promotions on a real, migrated PostgreSQL, through the real
// server. Every test builds its own tariffs (unique slugs), so the seeded
// drafts are never touched.

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/almukha/compnet-backend/internal/domain/staff"
	"github.com/almukha/compnet-backend/internal/repository/postgres"
	"github.com/almukha/compnet-backend/internal/service/tariffs"
)

type tariffFixture struct {
	slug, promo string
}

// newTariff inserts an active test tariff (59 000 ₸, auth and external-api
// allowed) with an inactive promotion (−10 000 ₸, maxOrders places).
func (e *env) newTariff(t *testing.T, maxOrders int) tariffFixture {
	t.Helper()
	ctx := context.Background()
	f := tariffFixture{slug: "test-" + randomHex(4), promo: "promo-" + randomHex(4)}
	var id string
	if err := e.pool.QueryRow(ctx, `INSERT INTO tariffs (slug, title, is_active) VALUES ($1, 'Тест', TRUE) RETURNING id`, f.slug).Scan(&id); err != nil {
		t.Fatal(err)
	}
	if _, err := e.pool.Exec(ctx, `
		INSERT INTO tariff_versions (tariff_id, version, price_tenge, price_kind, project_type, features, allowed_module_ids, duration_label, is_current)
		VALUES ($1, 1, 59000, 'fixed', 'landing', ARRAY['Одна страница'], ARRAY['auth', 'external-api'], '1–2 недели', TRUE)`, id); err != nil {
		t.Fatal(err)
	}
	if _, err := e.pool.Exec(ctx, `INSERT INTO promotions (slug, title, tariff_id, discount_tenge, max_orders) VALUES ($1, 'Тестовая акция', $2, 10000, $3)`,
		f.promo, id, maxOrders); err != nil {
		t.Fatal(err)
	}
	// Registered first, so it runs last — after the test's requests are deleted.
	t.Cleanup(func() {
		for _, q := range []string{
			`DELETE FROM project_requests WHERE id IN (SELECT project_request_id FROM project_request_tariffs WHERE tariff_id = $1)`,
			`DELETE FROM pricing_audit_log WHERE entity_id = $1 OR entity_id IN (SELECT id FROM promotions WHERE tariff_id = $1)
			    OR entity_id IN (SELECT id FROM tariff_versions WHERE tariff_id = $1)`,
			`DELETE FROM promotions WHERE tariff_id = $1`,
			`DELETE FROM tariff_versions WHERE tariff_id = $1`,
			`DELETE FROM tariffs WHERE id = $1`,
		} {
			if _, err := e.pool.Exec(ctx, q, id); err != nil {
				t.Errorf("cleanup: %v", err)
			}
		}
	})
	return f
}

// activate sets a cost and switches the promotion on for the next hour (as an administrator).
func activate(t *testing.T, admin *actor, f tariffFixture) {
	t.Helper()
	if code, body := admin.do("PUT", "/api/v1/manager/pricing/tariffs/"+f.slug+"/cost", map[string]any{"cost_tenge": 30000}); code != 200 {
		t.Fatalf("cost: %d %s", code, body)
	}
	now := time.Now().UTC()
	if code, body := admin.do("PATCH", "/api/v1/manager/pricing/promotions/"+f.promo, map[string]any{
		"starts_at": now.Add(-time.Hour), "ends_at": now.Add(time.Hour), "is_active": true,
	}); code != 200 {
		t.Fatalf("activate: %d %s", code, body)
	}
}

type tariffReply struct {
	Data struct {
		ID       string `json:"id"`
		Estimate struct {
			MinimumTenge        *int64 `json:"minimum_tenge"`
			MaximumTenge        *int64 `json:"maximum_tenge"`
			PricingRulesVersion string `json:"pricing_rules_version"`
		} `json:"estimate"`
		Tariff *struct {
			Slug             string `json:"slug"`
			Version          int    `json:"version"`
			BasePriceTenge   int64  `json:"base_price_tenge"`
			DiscountTenge    int64  `json:"discount_tenge"`
			PromotionApplied bool   `json:"promotion_applied"`
			FinalPriceTenge  int64  `json:"final_price_tenge"`
		} `json:"tariff"`
	} `json:"data"`
	Error struct {
		Fields map[string]string `json:"fields"`
	} `json:"error"`
}

// orderTariff posts a request for a tariff; extra holds additional body fields.
func (e *env) orderTariff(a *actor, slug string, modules []string, apiCount int, extra map[string]any) (int, tariffReply) {
	body := map[string]any{
		"name": "Тариф " + randomHex(3), "phone": "7011234567", "project_type": "landing",
		"description": "Тестовая заявка", "contact_method": "phone", "consent": true,
		"tariff": map[string]any{"slug": slug, "module_ids": modules, "external_api_count": apiCount},
	}
	for k, v := range extra {
		body[k] = v
	}
	code, raw := a.do("POST", "/api/v1/project-requests", body)
	var r tariffReply
	_ = json.Unmarshal(raw, &r)
	if r.Data.ID != "" {
		id := r.Data.ID
		e.t.Cleanup(func() { _, _ = e.pool.Exec(context.Background(), `DELETE FROM project_requests WHERE id = $1`, id) })
	}
	return code, r
}

func TestTariffs_AdminAccessAndActivationRules(t *testing.T) {
	e := newEnv(t)
	s := e.start()
	f := e.newTariff(t, 10)
	admin, _ := e.staffAccount(t, s, staff.RoleAdmin)
	manager, _ := e.staffAccount(t, s, staff.RoleManager)

	// Administrators only; managers see 403, visitors 401.
	if code, _ := s.actor(t).do("GET", "/api/v1/manager/pricing", nil); code != 401 {
		t.Errorf("anonymous: want 401, got %d", code)
	}
	for _, call := range [][3]string{
		{"GET", "/api/v1/manager/pricing", ""}, {"PATCH", "/api/v1/manager/pricing/tariffs/" + f.slug, `{"is_active":false}`},
		{"PUT", "/api/v1/manager/pricing/tariffs/" + f.slug + "/cost", `{"cost_tenge":1}`},
		{"PATCH", "/api/v1/manager/pricing/promotions/" + f.promo, `{"is_active":true}`},
		{"POST", "/api/v1/manager/pricing/tariffs/" + f.slug + "/versions", `{"price_tenge":1}`},
	} {
		var body any
		if call[2] != "" {
			body = json.RawMessage(call[2])
		}
		if code, _ := manager.do(call[0], call[1], body); code != 403 {
			t.Errorf("manager %s %s: want 403, got %d", call[0], call[1], code)
		}
	}
	code, raw := admin.do("GET", "/api/v1/manager/pricing", nil)
	if code != 200 || !strings.Contains(string(raw), `"cost_tenge"`) || !strings.Contains(string(raw), f.slug) {
		t.Fatalf("admin list: %d", code)
	}

	// The public list never carries a cost, and no promotion before activation.
	_, raw = s.actor(t).do("GET", "/api/v1/tariffs", nil)
	if strings.Contains(string(raw), "cost") || !strings.Contains(string(raw), f.slug) {
		t.Errorf("public list: %s", raw)
	}
	if strings.Contains(string(raw), f.promo) {
		t.Errorf("inactive promotion is public")
	}
	// The seeded drafts stay unpublished until an administrator activates them.
	for _, draft := range []string{`"slug":"start"`, `"slug":"business"`, `"slug":"pro"`, `"start-launch"`} {
		if strings.Contains(string(raw), draft) {
			t.Errorf("draft %s is public", draft)
		}
	}

	// Activation rules: dates, cost known, promotional price not below the cost, active tariff.
	patch := func(body map[string]any) (int, string) {
		code, raw := admin.do("PATCH", "/api/v1/manager/pricing/promotions/"+f.promo, body)
		return code, string(raw)
	}
	now := time.Now().UTC()
	window := map[string]any{"starts_at": now.Add(-time.Hour), "ends_at": now.Add(time.Hour)}
	if code, raw := patch(map[string]any{"is_active": true}); code != 422 || !strings.Contains(raw, "даты") {
		t.Errorf("without dates: %d %s", code, raw)
	}
	if code, raw := patch(map[string]any{"starts_at": now.Add(-time.Hour), "ends_at": now.Add(time.Hour), "is_active": true}); code != 422 || !strings.Contains(raw, "себестоимость") {
		t.Errorf("without cost: %d %s", code, raw)
	}
	admin.do("PUT", "/api/v1/manager/pricing/tariffs/"+f.slug+"/cost", map[string]any{"cost_tenge": 55000})
	window["is_active"] = true
	if code, raw := patch(window); code != 422 || !strings.Contains(raw, "ниже себестоимости") {
		t.Errorf("below cost: %d %s", code, raw)
	}
	admin.do("PUT", "/api/v1/manager/pricing/tariffs/"+f.slug+"/cost", map[string]any{"cost_tenge": 30000})
	if code, raw := patch(map[string]any{"starts_at": now.Add(-2 * time.Hour), "ends_at": now.Add(-time.Hour), "is_active": true}); code != 422 || !strings.Contains(raw, "прошла") {
		t.Errorf("ended: %d %s", code, raw)
	}
	if code, raw := patch(window); code != 200 {
		t.Fatalf("activate: %d %s", code, raw)
	}
	// Now public, with the promotional price; the tariff cannot be switched off under it.
	_, raw = s.actor(t).do("GET", "/api/v1/tariffs", nil)
	if !strings.Contains(string(raw), f.promo) || !strings.Contains(string(raw), `"price_tenge":49000`) {
		t.Errorf("live promotion not public: %s", raw)
	}
	if code, raw := admin.do("PATCH", "/api/v1/manager/pricing/tariffs/"+f.slug, map[string]any{"is_active": false}); code != 422 {
		t.Errorf("switch tariff off under an active promotion: %d %s", code, raw)
	}
	// Versions: the catalog checks project type and modules; a new version becomes current.
	if code, _ := admin.do("POST", "/api/v1/manager/pricing/tariffs/"+f.slug+"/versions", map[string]any{
		"price_tenge": 65000, "price_kind": "fixed", "project_type": "no-such-type", "duration_label": "1 неделя"}); code != 422 {
		t.Errorf("unknown project type: %d", code)
	}
	if code, raw := admin.do("POST", "/api/v1/manager/pricing/tariffs/"+f.slug+"/versions", map[string]any{
		"price_tenge": 65000, "price_kind": "fixed", "project_type": "landing", "features": []string{"Одна страница"},
		"allowed_module_ids": []string{"auth"}, "duration_label": "1–2 недели", "cost_tenge": 30000}); code != 200 || !strings.Contains(string(raw), `"version":2`) {
		t.Errorf("new version: %d %s", code, raw)
	}
	if n := e.count(`SELECT count(*) FROM tariff_versions v JOIN tariffs t ON t.id = v.tariff_id WHERE t.slug = $1`, f.slug); n != 2 {
		t.Errorf("versions kept: %d", n)
	}
	if n := e.count(`SELECT count(*) FROM pricing_audit_log WHERE staff_user_id IS NOT NULL AND (entity_id IN (SELECT id FROM promotions WHERE slug = $1)
	                 OR entity_id IN (SELECT v.id FROM tariff_versions v JOIN tariffs t ON t.id = v.tariff_id WHERE t.slug = $2))`, f.promo, f.slug); n < 3 {
		t.Errorf("audit log rows: %d", n)
	}
}

func TestTariffs_PromotionPlacesUnderConcurrency(t *testing.T) {
	e := newEnv(t)
	s := e.start()
	f := e.newTariff(t, 10)
	admin, _ := e.staffAccount(t, s, staff.RoleAdmin)
	activate(t, admin, f)

	// 11 requests at once for 10 places: exactly 10 get the promotion, one the regular price.
	var wg sync.WaitGroup
	replies := make([]tariffReply, 11)
	codes := make([]int, 11)
	for i := range replies {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			codes[i], replies[i] = e.orderTariff(s.actor(t), f.slug, nil, 0, nil)
		}(i)
	}
	wg.Wait()
	applied, regular := 0, 0
	var regularID string
	for i, r := range replies {
		if codes[i] != 201 || r.Data.Tariff == nil {
			t.Fatalf("request %d: %d %+v", i, codes[i], r)
		}
		switch tr := r.Data.Tariff; {
		case tr.PromotionApplied && tr.DiscountTenge == 10000 && tr.FinalPriceTenge == 49000 && *r.Data.Estimate.MinimumTenge == 49000:
			applied++
		case !tr.PromotionApplied && tr.DiscountTenge == 0 && tr.FinalPriceTenge == 59000:
			regular++
			regularID = r.Data.ID
		default:
			t.Errorf("request %d: %+v", i, tr)
		}
	}
	if applied != 10 || regular != 1 {
		t.Fatalf("applied %d, regular %d", applied, regular)
	}
	taken := func() int {
		return e.count(`SELECT count(*) FROM promotion_reservations r JOIN promotions p ON p.id = r.promotion_id WHERE p.slug = $1 AND r.status <> 'released'`, f.promo)
	}
	if n := taken(); n != 10 {
		t.Fatalf("places taken: %d", n)
	}
	if n := e.count(`SELECT count(*) FROM promotion_reservations WHERE project_request_id = $1`, regularID); n != 0 {
		t.Errorf("the 11th request holds a place")
	}
	// Full: the public list stops offering it.
	if _, raw := s.actor(t).do("GET", "/api/v1/tariffs", nil); strings.Contains(string(raw), f.promo) {
		t.Errorf("full promotion still public")
	}

	ids := []string{}
	for _, r := range replies {
		if r.Data.Tariff.PromotionApplied {
			ids = append(ids, r.Data.ID)
		}
	}
	status := func(id, st string) {
		t.Helper()
		if code, body := admin.do("PATCH", "/api/v1/manager/project-requests/"+id, map[string]any{"status": st}); code != 200 {
			t.Fatalf("status %s: %d %s", st, code, body)
		}
	}
	place := func(id string) string {
		var st, reason string
		_ = e.pool.QueryRow(context.Background(), `SELECT status, COALESCE(release_reason, '') FROM promotion_reservations WHERE project_request_id = $1`, id).Scan(&st, &reason)
		return strings.TrimSuffix(st+"/"+reason, "/")
	}
	// Taken into work: confirmed. Rejected: released, the place is free again.
	status(ids[0], "in_progress")
	if p := place(ids[0]); p != "confirmed" {
		t.Errorf("in progress: %s", p)
	}
	status(ids[1], "rejected")
	if p := place(ids[1]); p != "released/rejected" || taken() != 9 {
		t.Errorf("rejected: %s, taken %d", p, taken())
	}
	if _, r := e.orderTariff(s.actor(t), f.slug, nil, 0, nil); !r.Data.Tariff.PromotionApplied {
		t.Errorf("freed place not offered again")
	}
	// Completed keeps it confirmed; a confirmed order cancelled (rejected) gives its place back too.
	status(ids[3], "completed")
	if p := place(ids[3]); p != "confirmed" {
		t.Errorf("completed: %s", p)
	}
	status(ids[0], "rejected")
	if p := place(ids[0]); p != "released/rejected" || taken() != 9 {
		t.Errorf("cancelled after confirmation: %s, taken %d", p, taken())
	}
	// Unconfirmed past the deadline: the place counts as free at once and the job releases it.
	if _, err := e.pool.Exec(context.Background(), `UPDATE promotion_reservations SET reserved_at = now() - interval '73 hours' WHERE project_request_id = $1`, ids[2]); err != nil {
		t.Fatal(err)
	}
	_, raw := s.actor(t).do("GET", "/api/v1/tariffs", nil)
	if !strings.Contains(string(raw), `"remaining":2`) {
		t.Errorf("expired place not free: %s", raw)
	}
	// The periodic job (cmd/api) releases it for good.
	if err := tariffs.NewService(postgres.NewTariffRepository(e.pool)).ReleaseExpired(context.Background()); err != nil {
		t.Fatal(err)
	}
	if p := place(ids[2]); p != "released/expired" {
		t.Errorf("expired place: %s", p)
	}
	// After its end the promotion applies no more.
	if _, err := e.pool.Exec(context.Background(), `UPDATE promotions SET ends_at = now() - interval '1 second', starts_at = now() - interval '2 hours' WHERE slug = $1`, f.promo); err != nil {
		t.Fatal(err)
	}
	before := taken()
	if _, r := e.orderTariff(s.actor(t), f.slug, nil, 0, nil); r.Data.Tariff.PromotionApplied || r.Data.Tariff.FinalPriceTenge != 59000 || taken() != before {
		t.Errorf("ended promotion applied: %+v", r.Data.Tariff)
	}
}

func TestTariffs_RequestTerms(t *testing.T) {
	e := newEnv(t)
	s := e.start()
	a := e.newTariff(t, 10)
	b := e.newTariff(t, 10)
	admin, _ := e.staffAccount(t, s, staff.RoleAdmin)
	activate(t, admin, a)

	// Modules at the Go catalog's prices; a price sent by the client is ignored.
	code, r := e.orderTariff(s.actor(t), a.slug, []string{"auth", "external-api"}, 2, map[string]any{"price": 1, "final_price_tenge": 1})
	if code != 201 || r.Data.Tariff.BasePriceTenge != 59000 || r.Data.Tariff.FinalPriceTenge != 59000-10000+80000+200000 ||
		r.Data.Estimate.PricingRulesVersion != "tariff:"+a.slug+"@1" || *r.Data.Estimate.MaximumTenge != r.Data.Tariff.FinalPriceTenge {
		t.Fatalf("terms: %d %+v %+v", code, r.Data.Tariff, r.Data.Estimate)
	}
	id := r.Data.ID
	if n := e.count(`SELECT count(*) FROM project_request_tariffs WHERE project_request_id = $1 AND tariff_slug = $2 AND tariff_version = 1
	                 AND base_price_tenge = 59000 AND discount_tenge = 10000 AND modules_total_tenge = 280000 AND final_price_tenge = 329000
	                 AND promotion_id IS NOT NULL AND pricing_rules_version = 'v1'`, id, a.slug); n != 1 {
		t.Errorf("stored terms: %d", n)
	}
	if n := e.count(`SELECT count(*) FROM project_request_features WHERE project_request_id = $1 AND
	                 ((module_id = 'auth' AND unit_price_tenge = 80000 AND quantity = 1) OR (module_id = 'external-api' AND unit_price_tenge = 100000 AND quantity = 2))`, id); n != 2 {
		t.Errorf("features: %d", n)
	}
	if n := e.count(`SELECT count(*) FROM project_requests WHERE id = $1 AND project_type = 'landing'`, id); n != 1 {
		t.Errorf("project type from the tariff")
	}
	// The manager sees the terms and the place.
	mgr := s.actor(t)
	mgr.login(e)
	_, raw := mgr.do("GET", "/api/v1/manager/project-requests/"+id, nil)
	if !strings.Contains(string(raw), `"promotion_place"`) || !strings.Contains(string(raw), `"status":"reserved"`) || !strings.Contains(string(raw), `"final_price_tenge":329000`) {
		t.Errorf("manager detail: %s", raw)
	}

	// A module the tariff does not offer, an unknown or inactive tariff: refused.
	if code, r := e.orderTariff(s.actor(t), a.slug, []string{"chat"}, 0, nil); code != 422 || r.Error.Fields["tariff.module_ids"] == "" {
		t.Errorf("module not allowed: %d %+v", code, r.Error)
	}
	if code, _ := e.orderTariff(s.actor(t), "no-such-tariff", nil, 0, nil); code != 422 {
		t.Errorf("unknown tariff: %d", code)
	}
	admin.do("PATCH", "/api/v1/manager/pricing/tariffs/"+b.slug, map[string]any{"is_active": false})
	if code, _ := e.orderTariff(s.actor(t), b.slug, nil, 0, nil); code != 422 {
		t.Errorf("inactive tariff: %d", code)
	}
	admin.do("PATCH", "/api/v1/manager/pricing/tariffs/"+b.slug, map[string]any{"is_active": true})

	// Another tariff in the request (the visitor changed it): no place of a's promotion.
	if _, r := e.orderTariff(s.actor(t), b.slug, nil, 0, nil); r.Data.Tariff.PromotionApplied || r.Data.Tariff.Slug != b.slug {
		t.Errorf("tariff change: %+v", r.Data.Tariff)
	}

	// A new version: new requests use it, earlier ones keep theirs.
	admin.do("POST", "/api/v1/manager/pricing/tariffs/"+b.slug+"/versions", map[string]any{
		"price_tenge": 65000, "price_kind": "fixed", "project_type": "business-card", "allowed_module_ids": []string{}, "duration_label": "1–2 недели"})
	_, r2 := e.orderTariff(s.actor(t), b.slug, nil, 0, nil)
	if r2.Data.Tariff.Version != 2 || r2.Data.Tariff.FinalPriceTenge != 65000 || r2.Data.Estimate.PricingRulesVersion != "tariff:"+b.slug+"@2" {
		t.Errorf("new version: %+v", r2.Data.Tariff)
	}
	if n := e.count(`SELECT count(*) FROM project_request_tariffs WHERE tariff_slug = $1 AND tariff_version = 1`, b.slug); n != 1 {
		t.Errorf("earlier request lost its version: %d", n)
	}

	// The individual estimate is unchanged: no tariff terms.
	plain := e.submitRequest(s.actor(t), map[string]any{"name": "Без тарифа", "phone": "7011234567"})
	if n := e.count(`SELECT count(*) FROM project_request_tariffs WHERE project_request_id = $1`, plain); n != 0 {
		t.Errorf("individual request has tariff terms")
	}

	// Public quote: the same arithmetic, no cost.
	_, raw = s.actor(t).do("GET", fmt.Sprintf("/api/v1/tariffs/%s/quote?modules=auth", a.slug), nil)
	if !strings.Contains(string(raw), `"final_price_tenge":129000`) || strings.Contains(string(raw), "cost") {
		t.Errorf("quote: %s", raw)
	}
}
