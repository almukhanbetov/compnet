package app_test

// Price management of tariffs (/manager/pricing, "Управление ценами") on a
// real, migrated PostgreSQL, through the real server: preview, a price
// change with its reason and history, two administrators at once, requests
// whose price changed while the form was being filled, and promotions after
// a price change.

import (
	"encoding/json"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/almukha/compnet-backend/internal/domain/staff"
)

type pricePreview struct {
	Data struct {
		CurrentVersion int `json:"current_version"`
		NewVersion     int `json:"new_version"`
		Current        struct {
			FinalPriceTenge int64 `json:"final_price_tenge"`
		} `json:"current"`
		Proposed struct {
			Version         int   `json:"version"`
			BasePriceTenge  int64 `json:"base_price_tenge"`
			FinalPriceTenge int64 `json:"final_price_tenge"`
		} `json:"proposed"`
		Promotion *struct {
			IsActive        bool   `json:"is_active"`
			FinalPriceTenge *int64 `json:"final_price_tenge"`
		} `json:"promotion"`
		CostTenge        *int64            `json:"cost_tenge"`
		MarginTenge      *int64            `json:"margin_tenge"`
		PromoMarginTenge *int64            `json:"promo_margin_tenge"`
		Problems         map[string]string `json:"problems"`
		Warnings         []string          `json:"warnings"`
		CanSave          bool              `json:"can_save"`
	} `json:"data"`
}

func preview(t *testing.T, admin *actor, slug string, body map[string]any) (int, pricePreview) {
	t.Helper()
	code, raw := admin.do("POST", "/api/v1/manager/pricing/tariffs/"+slug+"/price/preview", body)
	var p pricePreview
	_ = json.Unmarshal(raw, &p)
	return code, p
}

func changePrice(admin *actor, slug string, price int64, reason string, expected int, extra map[string]any) (int, string) {
	body := map[string]any{"price_tenge": price, "reason": reason, "expected_version": expected}
	for k, v := range extra {
		body[k] = v
	}
	code, raw := admin.do("POST", "/api/v1/manager/pricing/tariffs/"+slug+"/price", body)
	return code, string(raw)
}

func TestTariffPrices_PreviewChangeHistoryAndConflicts(t *testing.T) {
	e := newEnv(t)
	s := e.start()
	f := e.newTariff(t, 10)
	admin, _ := e.staffAccount(t, s, staff.RoleAdmin)
	other, _ := e.staffAccount(t, s, staff.RoleAdmin)
	versions := func() int {
		return e.count(`SELECT count(*) FROM tariff_versions v JOIN tariffs t ON t.id = v.tariff_id WHERE t.slug = $1`, f.slug)
	}

	// Preview: the same arithmetic as the site (modules from the Go catalog), nothing stored.
	code, p := preview(t, admin, f.slug, map[string]any{"price_tenge": 65000, "module_ids": []string{"auth"}})
	if code != 200 || p.Data.CurrentVersion != 1 || p.Data.NewVersion != 2 || p.Data.Proposed.Version != 2 ||
		p.Data.Current.FinalPriceTenge != 59000+80000 || p.Data.Proposed.FinalPriceTenge != 65000+80000 || !p.Data.CanSave {
		t.Fatalf("preview: %d %+v", code, p.Data)
	}
	if p.Data.Promotion == nil || p.Data.Promotion.IsActive || p.Data.Promotion.FinalPriceTenge == nil || *p.Data.Promotion.FinalPriceTenge != 65000+80000-10000 {
		t.Errorf("preview promotion: %+v", p.Data.Promotion)
	}
	if p.Data.CostTenge != nil || !strings.Contains(strings.Join(p.Data.Warnings, "|"), "себестоимость не указана") {
		t.Errorf("preview without cost: %+v", p.Data)
	}
	if code, p := preview(t, admin, f.slug, map[string]any{"price_tenge": 59000}); code != 200 || p.Data.CanSave || p.Data.Problems["price_tenge"] == "" {
		t.Errorf("preview of the same price: %d %+v", code, p.Data)
	}
	if code, p := preview(t, admin, f.slug, map[string]any{"price_tenge": 200000}); code != 200 || !strings.Contains(strings.Join(p.Data.Warnings, "|"), "50%") {
		t.Errorf("preview of a big change: %d %+v", code, p.Data)
	}
	for _, bad := range []map[string]any{
		{"price_tenge": 0}, {"price_tenge": -5}, {"price_tenge": 100_000_001},
		{"price_tenge": 65000, "cost_tenge": -1}, {"price_tenge": 65000, "module_ids": []string{"chat"}},
	} {
		if code, _ := preview(t, admin, f.slug, bad); code != 422 {
			t.Errorf("preview %v: want 422, got %d", bad, code)
		}
	}
	if code, _ := admin.do("POST", "/api/v1/manager/pricing/tariffs/"+f.slug+"/price/preview", json.RawMessage(`{"price_tenge":"65000"}`)); code != 400 {
		t.Errorf("preview with a string price: %d", code)
	}
	if code, _ := preview(t, admin, "no-such-tariff", map[string]any{"price_tenge": 65000}); code != 404 {
		t.Errorf("preview of an unknown tariff: %d", code)
	}
	if n := versions(); n != 1 {
		t.Fatalf("preview stored a version: %d", n)
	}

	// A request saved at the first price.
	code, early := e.orderTariff(s.actor(t), f.slug, []string{"auth"}, 0, nil)
	if code != 201 || early.Data.Tariff.Version != 1 || early.Data.Tariff.FinalPriceTenge != 139000 {
		t.Fatalf("early request: %d %+v", code, early.Data.Tariff)
	}

	// A visitor shown the old price while the administrator changes it.
	shown := quoteTariff(s.actor(t), f.slug, nil, 0)

	// Invalid changes: no reason, the same price, a stale version, bad values.
	for _, c := range []struct {
		price    int64
		reason   string
		expected int
		want     int
	}{
		{65000, "", 1, 422}, {65000, "ab", 1, 422}, {59000, "Та же цена", 1, 422}, {65000, "Устаревшая версия", 5, 409},
		{0, "Ноль", 1, 422}, {100_000_001, "Слишком много", 1, 422}, {65000, "Без версии", 0, 422},
	} {
		if code, raw := changePrice(admin, f.slug, c.price, c.reason, c.expected, nil); code != c.want {
			t.Errorf("change %+v: want %d, got %d %s", c, c.want, code, raw)
		}
	}
	if code, _ := changePrice(admin, "no-such-tariff", 65000, "Нет тарифа", 1, nil); code != 404 {
		t.Errorf("unknown tariff: %d", code)
	}
	if n := versions(); n != 1 {
		t.Fatalf("refused changes stored a version: %d", n)
	}

	// The change: a new version 2, everything else kept.
	if code, raw := changePrice(admin, f.slug, 65000, "Рост стоимости работ", 1, nil); code != 200 ||
		!strings.Contains(raw, `"version":2`) || !strings.Contains(raw, `"price_tenge":65000`) || !strings.Contains(raw, `"change_reason":"Рост стоимости работ"`) {
		t.Fatalf("change: %d %s", code, raw)
	}
	if n := e.count(`SELECT count(*) FROM tariff_versions v JOIN tariffs t ON t.id = v.tariff_id
	                 WHERE t.slug = $1 AND v.version = 2 AND v.is_current AND v.project_type = 'landing'
	                   AND v.allowed_module_ids = ARRAY['auth', 'external-api'] AND v.features = ARRAY['Одна страница'] AND v.created_by IS NOT NULL`, f.slug); n != 1 {
		t.Errorf("version 2 does not keep the contents")
	}

	// The visitor's request at the old amount is refused, then accepted at the new one.
	if code, r := e.orderTariff(s.actor(t), f.slug, nil, 0, map[string]any{"expected": shown}); code != 409 || r.Data.ID != "" {
		t.Errorf("request at the old price: %d %+v", code, r.Data)
	}
	if code, r := e.orderTariff(s.actor(t), f.slug, nil, 0, map[string]any{"expected": 1}); code != 409 {
		t.Errorf("request at a made-up price: %d %+v", code, r.Data)
	}
	if code, r := e.orderTariff(s.actor(t), f.slug, nil, 0, map[string]any{"expected": 0}); code != 422 || r.Error.Fields["tariff.expected_final_price_tenge"] == "" {
		t.Errorf("request without the expected price: %d %+v", code, r.Error)
	}
	if code, r := e.orderTariff(s.actor(t), f.slug, nil, 0, nil); code != 201 || r.Data.Tariff.Version != 2 || r.Data.Tariff.FinalPriceTenge != 65000 {
		t.Errorf("request at the new price: %d %+v", code, r.Data.Tariff)
	}

	// The earlier request keeps its version and amount.
	if n := e.count(`SELECT count(*) FROM project_request_tariffs WHERE project_request_id = $1 AND tariff_version = 1
	                 AND base_price_tenge = 59000 AND final_price_tenge = 139000`, early.Data.ID); n != 1 {
		t.Errorf("early request changed")
	}
	if n := e.count(`SELECT count(*) FROM project_estimates WHERE project_request_id = $1 AND minimum_tenge = 139000
	                 AND pricing_version = 'tariff:' || $2 || '@1'`, early.Data.ID, f.slug); n != 1 {
		t.Errorf("early estimate changed")
	}

	// Two administrators edit version 2 at once: one wins, the other is told to reload.
	var wg sync.WaitGroup
	codes := make([]int, 2)
	for i, a := range []*actor{admin, other} {
		wg.Add(1)
		go func(i int, a *actor) {
			defer wg.Done()
			codes[i], _ = changePrice(a, f.slug, int64(70000+i*1000), "Одновременное изменение", 2, nil)
		}(i, a)
	}
	wg.Wait()
	if !((codes[0] == 200 && codes[1] == 409) || (codes[0] == 409 && codes[1] == 200)) {
		t.Fatalf("concurrent changes: %v", codes)
	}
	if n := versions(); n != 3 {
		t.Fatalf("versions after the concurrent changes: %d", n)
	}
	if n := e.count(`SELECT count(*) FROM tariff_versions v JOIN tariffs t ON t.id = v.tariff_id WHERE t.slug = $1 AND v.is_current`, f.slug); n != 1 {
		t.Errorf("current versions: %d", n)
	}

	// History: newest first, old and new price, reason, author, requests per version.
	code, raw := admin.do("GET", "/api/v1/manager/pricing/tariffs/"+f.slug+"/history", nil)
	var h struct {
		Data []struct {
			Version            int       `json:"version"`
			PriceTenge         int64     `json:"price_tenge"`
			PreviousPriceTenge *int64    `json:"previous_price_tenge"`
			Reason             string    `json:"reason"`
			Author             string    `json:"author"`
			CreatedAt          time.Time `json:"created_at"`
			IsCurrent          bool      `json:"is_current"`
			Requests           int       `json:"requests"`
		} `json:"data"`
	}
	if err := json.Unmarshal(raw, &h); code != 200 || err != nil || len(h.Data) != 3 {
		t.Fatalf("history: %d %s", code, raw)
	}
	v3, v2, v1 := h.Data[0], h.Data[1], h.Data[2]
	if v3.Version != 3 || !v3.IsCurrent || v3.PreviousPriceTenge == nil || *v3.PreviousPriceTenge != 65000 || v3.Reason != "Одновременное изменение" || v3.Author == "" {
		t.Errorf("history v3: %+v", v3)
	}
	if v2.Version != 2 || v2.IsCurrent || v2.PriceTenge != 65000 || *v2.PreviousPriceTenge != 59000 || v2.Reason != "Рост стоимости работ" ||
		v2.Author != "Проверка доступа" || v2.Requests != 1 || v2.CreatedAt.IsZero() {
		t.Errorf("history v2: %+v", v2)
	}
	if v1.Version != 1 || v1.PreviousPriceTenge != nil || v1.Author != "" || v1.Requests != 1 {
		t.Errorf("history v1: %+v", v1)
	}
	// The audit log has every change with its author and reason.
	if n := e.count(`SELECT count(*) FROM pricing_audit_log WHERE entity = 'tariff_version' AND staff_user_id IS NOT NULL
	                 AND details->>'tariff' = $1 AND details->>'reason' <> '' AND details ? 'previous_price_tenge'`, f.slug); n != 2 {
		t.Errorf("audit rows: %d", n)
	}
}

func TestTariffPrices_PromotionAndCostRules(t *testing.T) {
	e := newEnv(t)
	s := e.start()
	f := e.newTariff(t, 10)
	admin, _ := e.staffAccount(t, s, staff.RoleAdmin)
	activate(t, admin, f) // cost 30 000, promotion −10 000 live

	// A place taken at 59 000 − 10 000.
	code, before := e.orderTariff(s.actor(t), f.slug, nil, 0, nil)
	if code != 201 || !before.Data.Tariff.PromotionApplied || before.Data.Tariff.FinalPriceTenge != 49000 {
		t.Fatalf("promotional request: %d %+v", code, before.Data.Tariff)
	}

	// Under an active promotion the price keeps the discount below it and the
	// promotional price not below the cost; the price never goes below the cost.
	code, p := preview(t, admin, f.slug, map[string]any{"price_tenge": 35000})
	if code != 200 || p.Data.CanSave || !strings.Contains(p.Data.Problems["price_tenge"], "ниже себестоимости") {
		t.Errorf("preview below the cost with the promotion: %d %+v", code, p.Data)
	}
	for _, c := range []struct {
		price int64
		extra map[string]any
		want  string
	}{
		{9000, nil, "скидка действующей акции"},
		{35000, nil, "ниже себестоимости"},
		{70000, map[string]any{"cost_tenge": 65000}, "ниже себестоимости"},
		{25000, nil, "ниже себестоимости"},
	} {
		if code, raw := changePrice(admin, f.slug, c.price, "Проверка правил", 1, c.extra); code != 422 || !strings.Contains(raw, c.want) {
			t.Errorf("change to %d %v: %d %s", c.price, c.extra, code, raw)
		}
	}
	if code, raw := admin.do("PUT", "/api/v1/manager/pricing/tariffs/"+f.slug+"/cost", map[string]any{"cost_tenge": 52000}); code != 422 || !strings.Contains(string(raw), "ниже себестоимости") {
		t.Errorf("cost above the promotional price: %d %s", code, raw)
	}

	// A valid change: the cost is carried over, the promotion applies to the new price.
	code, p = preview(t, admin, f.slug, map[string]any{"price_tenge": 69000})
	if code != 200 || !p.Data.CanSave || p.Data.CostTenge == nil || *p.Data.CostTenge != 30000 ||
		*p.Data.MarginTenge != 39000 || *p.Data.PromoMarginTenge != 29000 || *p.Data.Promotion.FinalPriceTenge != 59000 {
		t.Fatalf("preview with the promotion: %d %+v", code, p.Data)
	}
	if code, raw := changePrice(admin, f.slug, 69000, "Новая цена с акцией", 1, nil); code != 200 || !strings.Contains(raw, `"cost_tenge":30000`) {
		t.Fatalf("change under the promotion: %d %s", code, raw)
	}
	code, after := e.orderTariff(s.actor(t), f.slug, nil, 0, nil)
	if code != 201 || !after.Data.Tariff.PromotionApplied || after.Data.Tariff.BasePriceTenge != 69000 || after.Data.Tariff.FinalPriceTenge != 59000 || after.Data.Tariff.Version != 2 {
		t.Errorf("promotional request at the new price: %d %+v", code, after.Data.Tariff)
	}
	// Both hold places (the limit counts them all); the first keeps its terms.
	if n := e.count(`SELECT count(*) FROM promotion_reservations r JOIN promotions p ON p.id = r.promotion_id WHERE p.slug = $1 AND r.status = 'reserved'`, f.promo); n != 2 {
		t.Errorf("places: %d", n)
	}
	if n := e.count(`SELECT count(*) FROM project_request_tariffs WHERE project_request_id = $1 AND base_price_tenge = 59000
	                 AND discount_tenge = 10000 AND final_price_tenge = 49000 AND tariff_version = 1`, before.Data.ID); n != 1 {
		t.Errorf("the first promotional request changed")
	}
	// The public list shows the new price and promotional price, and never a cost.
	_, raw := s.actor(t).do("GET", "/api/v1/tariffs", nil)
	if !strings.Contains(string(raw), `"price_tenge":69000`) || !strings.Contains(string(raw), `"price_tenge":59000`) ||
		strings.Contains(string(raw), "cost") || strings.Contains(string(raw), "margin") || strings.Contains(string(raw), "reason") {
		t.Errorf("public list: %s", raw)
	}
}

// Requests saved while a price changes: each is saved at the amount its
// visitor was shown or refused — never at another one, never a server error
// (the version is locked before the promotion on both sides).
func TestTariffPrices_RequestsDuringAChange(t *testing.T) {
	e := newEnv(t)
	s := e.start()
	f := e.newTariff(t, 50)
	admin, _ := e.staffAccount(t, s, staff.RoleAdmin)
	activate(t, admin, f)
	shown := quoteTariff(s.actor(t), f.slug, nil, 0) // 49 000

	const n = 12
	var wg sync.WaitGroup
	codes := make([]int, n)
	replies := make([]tariffReply, n)
	var changeCode int
	for i := 0; i < n; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			codes[i], replies[i] = e.orderTariff(s.actor(t), f.slug, nil, 0, map[string]any{"expected": shown})
		}(i)
		if i == n/2 {
			wg.Add(1)
			go func() {
				defer wg.Done()
				changeCode, _ = changePrice(admin, f.slug, 64000, "Изменение во время заявок", 1, nil)
			}()
		}
	}
	wg.Wait()
	if changeCode != 200 {
		t.Fatalf("change: %d", changeCode)
	}
	for i := range codes {
		switch codes[i] {
		case 201:
			if tr := replies[i].Data.Tariff; tr.FinalPriceTenge != shown || tr.Version != 1 {
				t.Errorf("request %d saved at %d (v%d), shown %d", i, tr.FinalPriceTenge, tr.Version, shown)
			}
		case 409:
		default:
			t.Errorf("request %d: %d", i, codes[i])
		}
	}
	if n := e.count(`SELECT count(*) FROM project_request_tariffs r JOIN tariffs t ON t.id = r.tariff_id
	                 WHERE t.slug = $1 AND r.final_price_tenge <> $2`, f.slug, shown); n != 0 {
		t.Errorf("requests at an amount nobody was shown: %d", n)
	}
	if got := quoteTariff(s.actor(t), f.slug, nil, 0); got != 54000 {
		t.Errorf("quote after the change: %d", got)
	}
}
