package app_test

// Base prices of the project types (/manager/pricing, "Управление ценами")
// on a real, migrated PostgreSQL, through the real server: the seed, the
// catalog and pricing cards served from the database, preview, change,
// history, two administrators at once, requests whose base price changed
// while the form was open, and requests saved during a change. Every test
// restores version 1 of the types it changes.

import (
	"context"
	"encoding/json"
	"strings"
	"sync"
	"testing"

	"github.com/almukha/compnet-backend/internal/domain/staff"
	"github.com/almukha/compnet-backend/internal/pricing"
)

// restoreBasePrice brings a project type back to its seeded version 1 after
// the test (registered first: runs after the test's requests are deleted).
func (e *env) restoreBasePrice(t *testing.T, projectType string) {
	t.Helper()
	t.Cleanup(func() {
		ctx := context.Background()
		for _, q := range []string{
			`DELETE FROM project_requests WHERE id IN (SELECT e.project_request_id FROM project_estimates e
			   JOIN project_type_prices p ON p.id = e.base_price_version_id WHERE p.project_type = $1 AND p.version > 1)`,
			`DELETE FROM pricing_audit_log WHERE entity = 'base_price' AND details->>'project_type' = $1`,
			`UPDATE project_type_prices SET is_current = FALSE WHERE project_type = $1`,
			`DELETE FROM project_type_prices WHERE project_type = $1 AND version > 1`,
			`UPDATE project_type_prices SET is_current = TRUE WHERE project_type = $1 AND version = 1`,
		} {
			if _, err := e.pool.Exec(ctx, q, projectType); err != nil {
				t.Errorf("restore %s: %v", projectType, err)
			}
		}
	})
}

type catalogReply struct {
	Data struct {
		ProjectTypes []struct {
			ID               string `json:"id"`
			BasePriceTenge   *int64 `json:"base_price_tenge"`
			BasePriceVersion int    `json:"base_price_version"`
		} `json:"project_types"`
	} `json:"data"`
}

// publishedBase is a project type's base price and version in GET /api/v1/pricing/catalog.
func publishedBase(a *actor, projectType string) (int64, int) {
	_, raw := a.do("GET", "/api/v1/pricing/catalog", nil)
	var r catalogReply
	_ = json.Unmarshal(raw, &r)
	for _, p := range r.Data.ProjectTypes {
		if p.ID == projectType && p.BasePriceTenge != nil {
			return *p.BasePriceTenge, p.BasePriceVersion
		}
	}
	return 0, -1
}

// cardPrice is a project type's "from" price on GET /api/v1/pricing (the /pricing page and service pages).
func cardPrice(a *actor, projectType string) int64 {
	_, raw := a.do("GET", "/api/v1/pricing", nil)
	var r struct {
		Data []struct {
			ProjectType    string `json:"project_type"`
			PriceFromTenge *int64 `json:"price_from_tenge"`
		} `json:"data"`
	}
	_ = json.Unmarshal(raw, &r)
	for _, c := range r.Data {
		if c.ProjectType == projectType && c.PriceFromTenge != nil {
			return *c.PriceFromTenge
		}
	}
	return 0
}

type estimateReply struct {
	Data struct {
		ID       string `json:"id"`
		Estimate struct {
			MinimumTenge *int64 `json:"minimum_tenge"`
			MaximumTenge *int64 `json:"maximum_tenge"`
		} `json:"estimate"`
	} `json:"data"`
	Error struct {
		Code   string            `json:"code"`
		Fields map[string]string `json:"fields"`
	} `json:"error"`
}

// orderIndividual posts an individual-estimate request; expected is the base
// price the form showed (nil: an older client that sends none).
func (e *env) orderIndividual(a *actor, projectType, tier string, expected *int64) (int, estimateReply) {
	body := map[string]any{
		"name": "База " + randomHex(3), "phone": "7011234567", "project_type": projectType, "description": "Тестовая заявка",
		"contact_method": "phone", "consent": true,
		"calculator": map[string]any{"scale_tier_id": tier, "selected_module_ids": []string{"auth"}, "design_level_id": "custom", "complexity_id": "medium", "urgency_id": "fast"},
	}
	if expected != nil {
		body["expected_base_price_tenge"] = *expected
	}
	code, raw := a.do("POST", "/api/v1/project-requests", body)
	var r estimateReply
	_ = json.Unmarshal(raw, &r)
	if r.Data.ID != "" {
		id := r.Data.ID
		e.t.Cleanup(func() { _, _ = e.pool.Exec(context.Background(), `DELETE FROM project_requests WHERE id = $1`, id) })
	}
	return code, r
}

func changeBase(a *actor, projectType string, price int64, reason string, expected int) (int, string) {
	code, raw := a.do("POST", "/api/v1/manager/pricing/base-prices/"+projectType, map[string]any{"price_tenge": price, "reason": reason, "expected_version": expected})
	return code, string(raw)
}

func i64(n int64) *int64 { return &n }

type previewRange struct {
	MinimumTenge *int64 `json:"minimum_tenge"`
	MaximumTenge *int64 `json:"maximum_tenge"`
	Individual   bool   `json:"individual"`
}

// estimateWith is the calculator's result for orderIndividual's selection at a base price.
func estimateWith(t *testing.T, projectType, tier string, base int64) (int64, int64) {
	t.Helper()
	c := pricing.NewCatalog([]pricing.BasePrice{{ProjectType: projectType, VersionID: "x", PriceTenge: &base}})
	r, err := c.Calculate(pricing.CalculateInput{ProjectTypeID: projectType, ScaleTierID: tier, SelectedModuleIDs: []string{"auth"},
		DesignLevelID: "custom", ComplexityID: "medium", UrgencyID: "fast"})
	if err != nil || r.MinimumTenge == nil {
		t.Fatalf("calculate: %v", err)
	}
	return *r.MinimumTenge, *r.MaximumTenge
}

func TestBasePrices_SeedCatalogAndAccess(t *testing.T) {
	e := newEnv(t)
	s := e.start()
	pub := s.actor(t)
	admin, _ := e.staffAccount(t, s, staff.RoleAdmin)
	manager, _ := e.staffAccount(t, s, staff.RoleManager)

	// The migration stored the prices in force until now (the Go seeds), and nothing for individual-only types.
	for _, p := range pricing.ProjectTypes {
		n := e.count(`SELECT count(*) FROM project_type_prices WHERE project_type = $1 AND version = 1`, p.ID)
		switch {
		case p.SeedBasePriceTenge == nil && n != 0:
			t.Errorf("%s: an individual-only type has a stored price", p.ID)
		case p.SeedBasePriceTenge != nil && e.count(`SELECT count(*) FROM project_type_prices WHERE project_type = $1 AND version = 1
		                                                AND base_price_tenge = $2`, p.ID, *p.SeedBasePriceTenge) != 1:
			t.Errorf("%s: seed %d not stored as version 1", p.ID, *p.SeedBasePriceTenge)
		}
	}

	// Administrators only; managers 403, visitors 401.
	calls := [][3]string{
		{"GET", "/api/v1/manager/pricing/base-prices", ""},
		{"POST", "/api/v1/manager/pricing/base-prices/devops-vps/preview", `{"price_tenge":1}`},
		{"POST", "/api/v1/manager/pricing/base-prices/devops-vps", `{"price_tenge":1,"reason":"попытка","expected_version":1}`},
		{"GET", "/api/v1/manager/pricing/base-prices/devops-vps/history", ""},
	}
	for _, c := range calls {
		var body any
		if c[2] != "" {
			body = json.RawMessage(c[2])
		}
		if code, _ := manager.do(c[0], c[1], body); code != 403 {
			t.Errorf("manager %s %s: %d", c[0], c[1], code)
		}
		if code, _ := pub.do(c[0], c[1], body); code != 401 {
			t.Errorf("anonymous %s %s: %d", c[0], c[1], code)
		}
	}
	code, raw := admin.do("GET", "/api/v1/manager/pricing/base-prices", nil)
	var list struct {
		Data []struct {
			ProjectType string `json:"project_type"`
			PriceTenge  *int64 `json:"price_tenge"`
			Version     int    `json:"version"`
			Editable    bool   `json:"editable"`
		} `json:"data"`
	}
	if err := json.Unmarshal(raw, &list); code != 200 || err != nil || len(list.Data) != len(pricing.ProjectTypes) {
		t.Fatalf("admin list: %d %s", code, raw)
	}
	for i, p := range pricing.ProjectTypes {
		it := list.Data[i]
		if it.ProjectType != p.ID || it.Editable != p.Editable() || (p.Editable() && (it.Version < 1 || it.PriceTenge == nil)) || (!p.Editable() && it.PriceTenge != nil) {
			t.Errorf("admin list %d: %+v", i, it)
		}
	}
	// The public API carries no costs, margins or reasons.
	for _, path := range []string{"/api/v1/pricing/catalog", "/api/v1/pricing"} {
		if _, raw := pub.do("GET", path, nil); strings.Contains(string(raw), "cost") || strings.Contains(string(raw), "margin") || strings.Contains(string(raw), "reason") {
			t.Errorf("%s exposes internal fields", path)
		}
	}
}

func TestBasePrices_PreviewChangeHistoryAndRequests(t *testing.T) {
	e := newEnv(t)
	s := e.start()
	e.restoreBasePrice(t, "catalog")
	pub := s.actor(t)
	admin, _ := e.staffAccount(t, s, staff.RoleAdmin)
	other, _ := e.staffAccount(t, s, staff.RoleAdmin)
	versions := func() int { return e.count(`SELECT count(*) FROM project_type_prices WHERE project_type = 'catalog'`) }

	base0, v0 := publishedBase(pub, "catalog")
	if base0 != 400000 || v0 != 1 || cardPrice(pub, "catalog") != 400000 {
		t.Fatalf("start: %d v%d, card %d", base0, v0, cardPrice(pub, "catalog"))
	}

	// Preview: the calculator itself on every scale tier, nothing stored.
	code, raw := admin.do("POST", "/api/v1/manager/pricing/base-prices/catalog/preview", map[string]any{"price_tenge": 430000})
	var p struct {
		Data struct {
			CurrentVersion int `json:"current_version"`
			NewVersion     int `json:"new_version"`
			Rows           []struct {
				TierID   string       `json:"tier_id"`
				Current  previewRange `json:"current"`
				Proposed previewRange `json:"proposed"`
			} `json:"rows"`
			Problems map[string]string `json:"problems"`
			CanSave  bool              `json:"can_save"`
		} `json:"data"`
	}
	if err := json.Unmarshal(raw, &p); code != 200 || err != nil || p.Data.CurrentVersion != 1 || p.Data.NewVersion != 2 || !p.Data.CanSave || len(p.Data.Rows) != 4 {
		t.Fatalf("preview: %d %s", code, raw)
	}
	for _, row := range p.Data.Rows {
		in := pricing.CalculateInput{ProjectTypeID: "catalog", ScaleTierID: row.TierID, DesignLevelID: "basic", ComplexityID: "standard", UrgencyID: "normal"}
		cur, _ := pricing.Calculate(in)
		pro, _ := pricing.NewCatalog([]pricing.BasePrice{{ProjectType: "catalog", VersionID: "x", PriceTenge: i64(430000)}}).Calculate(in)
		if row.TierID == "site-xl" {
			if !row.Proposed.Individual || row.Proposed.MinimumTenge != nil {
				t.Errorf("xl preview: %+v", row)
			}
			continue
		}
		if *row.Current.MinimumTenge != *cur.MinimumTenge || *row.Proposed.MinimumTenge != *pro.MinimumTenge || *row.Proposed.MaximumTenge != *pro.MaximumTenge {
			t.Errorf("preview %s: %+v", row.TierID, row)
		}
	}
	for _, c := range []struct {
		path string
		body map[string]any
		want int
	}{
		{"catalog/preview", map[string]any{"price_tenge": 0}, 422},
		{"catalog/preview", map[string]any{"price_tenge": 100_000_001}, 422},
		{"no-such-type/preview", map[string]any{"price_tenge": 1000}, 404},
	} {
		if code, _ := admin.do("POST", "/api/v1/manager/pricing/base-prices/"+c.path, c.body); code != c.want {
			t.Errorf("preview %s %v: %d", c.path, c.body, code)
		}
	}
	if code, raw := admin.do("POST", "/api/v1/manager/pricing/base-prices/other/preview", map[string]any{"price_tenge": 1000}); code != 200 || !strings.Contains(string(raw), "только индивидуальный расчёт") {
		t.Errorf("preview of an individual-only type: %d %s", code, raw)
	}
	if n := versions(); n != 1 {
		t.Fatalf("preview stored a version: %d", n)
	}

	// A request saved at the first price, with the price it showed.
	code, early := e.orderIndividual(pub, "catalog", "site-m", i64(400000))
	min0, max0 := estimateWith(t, "catalog", "site-m", 400000)
	if code != 201 || *early.Data.Estimate.MinimumTenge != min0 || *early.Data.Estimate.MaximumTenge != max0 {
		t.Fatalf("early request: %d %+v", code, early)
	}

	// Invalid changes.
	for _, c := range []struct {
		price    int64
		reason   string
		expected int
		want     int
	}{
		{430000, "", 1, 422}, {430000, "ab", 1, 422}, {400000, "Та же цена", 1, 422}, {430000, "Устаревшая версия", 7, 409},
		{0, "Ноль", 1, 422}, {-5, "Минус", 1, 422},
	} {
		if code, raw := changeBase(admin, "catalog", c.price, c.reason, c.expected); code != c.want {
			t.Errorf("change %+v: %d %s", c, code, raw)
		}
	}
	if code, _ := changeBase(admin, "other", 100000, "Индивидуальный тип", 0); code != 422 {
		t.Errorf("change of an individual-only type: %d", code)
	}
	if n := versions(); n != 1 {
		t.Fatalf("refused changes stored a version: %d", n)
	}

	// The change: version 2, served at once to the catalog and the pricing cards.
	if code, raw := changeBase(admin, "catalog", 430000, "Рост стоимости работ", 1); code != 200 || !strings.Contains(raw, `"version":2`) || !strings.Contains(raw, `"price_tenge":430000`) {
		t.Fatalf("change: %d %s", code, raw)
	}
	if b, v := publishedBase(pub, "catalog"); b != 430000 || v != 2 || cardPrice(pub, "catalog") != 430000 {
		t.Errorf("after the change: catalog %d v%d, card %d", b, v, cardPrice(pub, "catalog"))
	}

	// A form opened before the change: refused, nothing stored; at the new price: saved.
	before := e.count(`SELECT count(*) FROM project_requests`)
	if code, r := e.orderIndividual(pub, "catalog", "site-m", i64(400000)); code != 409 || r.Error.Code != "conflict" {
		t.Errorf("request at the old base price: %d %+v", code, r.Error)
	}
	if n := e.count(`SELECT count(*) FROM project_requests`); n != before {
		t.Errorf("the refused request was stored")
	}
	min1, max1 := estimateWith(t, "catalog", "site-m", 430000)
	code, late := e.orderIndividual(pub, "catalog", "site-m", i64(430000))
	if code != 201 || *late.Data.Estimate.MinimumTenge != min1 || *late.Data.Estimate.MaximumTenge != max1 {
		t.Errorf("request at the new base price: %d %+v (want %d–%d)", code, late, min1, max1)
	}
	// An older client sends no base price: priced at the one in force.
	if code, r := e.orderIndividual(pub, "catalog", "site-m", nil); code != 201 || *r.Data.Estimate.MinimumTenge != min1 {
		t.Errorf("request without the expected base price: %d %+v", code, r)
	}
	if code, r := e.orderIndividual(pub, "catalog", "site-m", i64(0)); code != 422 || r.Error.Fields["expected_base_price_tenge"] == "" {
		t.Errorf("request with a zero base price: %d %+v", code, r.Error)
	}
	// Stored with its version; the early one keeps its price and version.
	if n := e.count(`SELECT count(*) FROM project_estimates e JOIN project_type_prices p ON p.id = e.base_price_version_id
	                 WHERE e.project_request_id = $1 AND p.version = 2 AND (e.breakdown->>'base_price_tenge')::bigint = 430000
	                   AND (e.breakdown->>'base_price_version')::int = 2`, late.Data.ID); n != 1 {
		t.Errorf("late estimate: version not stored")
	}
	if n := e.count(`SELECT count(*) FROM project_estimates e JOIN project_type_prices p ON p.id = e.base_price_version_id
	                 WHERE e.project_request_id = $1 AND p.version = 1 AND e.minimum_tenge = $2 AND e.maximum_tenge = $3
	                   AND (e.breakdown->>'base_price_tenge')::bigint = 400000`, early.Data.ID, min0, max0); n != 1 {
		t.Errorf("early estimate changed")
	}

	// Two administrators edit version 2 at once: one wins, the other is told to reload.
	var wg sync.WaitGroup
	codes := make([]int, 2)
	for i, a := range []*actor{admin, other} {
		wg.Add(1)
		go func(i int, a *actor) {
			defer wg.Done()
			codes[i], _ = changeBase(a, "catalog", int64(440000+i*10000), "Одновременное изменение", 2)
		}(i, a)
	}
	wg.Wait()
	if !((codes[0] == 200 && codes[1] == 409) || (codes[0] == 409 && codes[1] == 200)) {
		t.Fatalf("concurrent changes: %v", codes)
	}
	if n := e.count(`SELECT count(*) FROM project_type_prices WHERE project_type = 'catalog' AND is_current`); versions() != 3 || n != 1 {
		t.Errorf("versions %d, current %d", versions(), n)
	}

	// History: newest first, old → new price, reason, author, requests per version.
	code, raw = admin.do("GET", "/api/v1/manager/pricing/base-prices/catalog/history", nil)
	var h struct {
		Data []struct {
			Version            int    `json:"version"`
			PriceTenge         int64  `json:"price_tenge"`
			PreviousPriceTenge *int64 `json:"previous_price_tenge"`
			Reason             string `json:"reason"`
			Author             string `json:"author"`
			IsCurrent          bool   `json:"is_current"`
			Requests           int    `json:"requests"`
		} `json:"data"`
	}
	if err := json.Unmarshal(raw, &h); code != 200 || err != nil || len(h.Data) != 3 {
		t.Fatalf("history: %d %s", code, raw)
	}
	if v := h.Data[1]; v.Version != 2 || v.PriceTenge != 430000 || *v.PreviousPriceTenge != 400000 || v.Reason != "Рост стоимости работ" ||
		v.Author != "Проверка доступа" || v.Requests != 2 || v.IsCurrent {
		t.Errorf("history v2: %+v", v)
	}
	if v := h.Data[2]; v.Version != 1 || v.PreviousPriceTenge != nil || v.Author != "" || v.Requests != 1 {
		t.Errorf("history v1: %+v", v)
	}
	if n := e.count(`SELECT count(*) FROM pricing_audit_log WHERE entity = 'base_price' AND details->>'project_type' = 'catalog'
	                 AND staff_user_id IS NOT NULL AND details->>'reason' <> '' AND details ? 'previous_price_tenge'`); n != 2 {
		t.Errorf("audit rows: %d", n)
	}
	// Other project types and the tariffs are untouched.
	if b, v := publishedBase(pub, "corporate"); b != 300000 || v != 1 {
		t.Errorf("corporate changed: %d v%d", b, v)
	}
}

// Requests saved while a base price changes: with the price shown, saved at
// it or refused; without one (older clients), saved at the price in force —
// never at a price whose version is not the one stored, never a server error.
func TestBasePrices_RequestsDuringAChange(t *testing.T) {
	e := newEnv(t)
	s := e.start()
	e.restoreBasePrice(t, "devops-vps")
	admin, _ := e.staffAccount(t, s, staff.RoleAdmin)
	shown, _ := publishedBase(s.actor(t), "devops-vps") // 150 000

	const n = 12
	var wg sync.WaitGroup
	codes := make([]int, n)
	replies := make([]estimateReply, n)
	var changeCode int
	for i := 0; i < n; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			var expected *int64
			if i%2 == 0 {
				expected = i64(shown)
			}
			codes[i], replies[i] = e.orderIndividual(s.actor(t), "devops-vps", "", expected)
		}(i)
		if i == n/2 {
			wg.Add(1)
			go func() {
				defer wg.Done()
				changeCode, _ = changeBase(admin, "devops-vps", 170000, "Изменение во время заявок", 1)
			}()
		}
	}
	wg.Wait()
	if changeCode != 200 {
		t.Fatalf("change: %d", changeCode)
	}
	for i := range codes {
		switch {
		case codes[i] == 201:
		case codes[i] == 409 && i%2 == 0:
		default:
			t.Errorf("request %d (expected sent: %v): %d", i, i%2 == 0, codes[i])
		}
	}
	// Every stored estimate matches the version it points at.
	if bad := e.count(`SELECT count(*) FROM project_estimates e JOIN project_type_prices p ON p.id = e.base_price_version_id
	                   WHERE p.project_type = 'devops-vps' AND (e.breakdown->>'base_price_tenge')::bigint <> p.base_price_tenge`); bad != 0 {
		t.Errorf("estimates at a price other than their version's: %d", bad)
	}
	for i, r := range replies {
		if codes[i] != 201 || i%2 != 0 {
			continue
		}
		if minWant, _ := estimateWith(t, "devops-vps", "", shown); *r.Data.Estimate.MinimumTenge != minWant {
			t.Errorf("request %d sent with %d saved at %d", i, shown, *r.Data.Estimate.MinimumTenge)
		}
	}
	if b, _ := publishedBase(s.actor(t), "devops-vps"); b != 170000 {
		t.Errorf("after the change: %d", b)
	}
}
