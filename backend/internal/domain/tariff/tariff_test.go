package tariff

import (
	"errors"
	"testing"
	"time"
)

func start() Tariff {
	return Tariff{ID: "t-start", Slug: "start", IsActive: true, Current: Version{
		ID: "v1", Number: 1, PriceTenge: 59000, PriceKind: PriceFixed, ProjectType: "landing",
		AllowedModuleIDs: []string{"auth", "external-api"}, DurationLabel: "1–2 недели",
	}}
}

func TestPrice(t *testing.T) {
	now := time.Date(2026, 11, 10, 12, 0, 0, 0, time.UTC)
	from, to := now.Add(-time.Hour), now.Add(time.Hour)
	live := Promotion{ID: "p", TariffID: "t-start", DiscountTenge: 10000, StartsAt: &from, EndsAt: &to, MaxOrders: 10, IsActive: true}

	// No modules, no promotion: the version's price.
	q, err := Price(start(), nil, Selection{Slug: "start"}, now)
	if err != nil || q.BasePriceTenge != 59000 || q.FinalTenge != 59000 || q.DiscountTenge != 0 || q.Version != 1 || q.ProjectType != "landing" {
		t.Fatalf("plain: %+v %v", q, err)
	}
	// Extra modules at the Go catalog's prices (auth 80 000, external-api 100 000 per integration).
	q, err = Price(start(), nil, Selection{Slug: "start", ModuleIDs: []string{"auth", "external-api"}, ExternalApiCount: 2}, now)
	if err != nil || q.ModulesTotalTenge != 280000 || q.FinalTenge != 339000 || len(q.Modules) != 2 || q.Modules[1].Quantity != 2 {
		t.Fatalf("modules: %+v %v", q, err)
	}
	// A live promotion takes its discount off the tariff's price only.
	p := live
	q, err = Price(start(), &p, Selection{Slug: "start", ModuleIDs: []string{"auth"}}, now)
	if err != nil || q.DiscountTenge != 10000 || q.FinalTenge != 59000-10000+80000 || q.Promotion == nil {
		t.Fatalf("promotion: %+v %v", q, err)
	}
	if w := q.WithoutPromotion(); w.DiscountTenge != 0 || w.FinalTenge != 59000+80000 || w.Promotion != nil {
		t.Fatalf("without promotion: %+v", w)
	}
	// Not live: before its start, after its end, inactive, no place left, another tariff, discount ≥ price.
	cases := map[string]func(*Promotion){
		"not started":  func(p *Promotion) { s := now.Add(time.Minute); p.StartsAt = &s },
		"ended":        func(p *Promotion) { e := now; p.EndsAt = &e },
		"inactive":     func(p *Promotion) { p.IsActive = false },
		"no dates":     func(p *Promotion) { p.StartsAt = nil },
		"full":         func(p *Promotion) { p.Taken = 10 },
		"other tariff": func(p *Promotion) { p.TariffID = "t-business" },
		"too large":    func(p *Promotion) { p.DiscountTenge = 59000 },
	}
	for name, change := range cases {
		p := live
		change(&p)
		q, err := Price(start(), &p, Selection{Slug: "start"}, now)
		if err != nil || q.DiscountTenge != 0 || q.FinalTenge != 59000 || q.Promotion != nil {
			t.Errorf("%s: promotion applied: %+v %v", name, q, err)
		}
	}
	// Only the version's modules; never twice.
	if _, err := Price(start(), nil, Selection{Slug: "start", ModuleIDs: []string{"chat"}}, now); !errors.Is(err, ErrModuleNotAllowed) {
		t.Errorf("module not allowed: %v", err)
	}
	if _, err := Price(start(), nil, Selection{Slug: "start", ModuleIDs: []string{"unknown"}}, now); !errors.Is(err, ErrModuleNotAllowed) {
		t.Errorf("unknown module: %v", err)
	}
	if _, err := Price(start(), nil, Selection{Slug: "start", ModuleIDs: []string{"auth", "auth"}}, now); !errors.Is(err, ErrDuplicateModule) {
		t.Errorf("duplicate module: %v", err)
	}
	// A negative integration count counts as none.
	q, _ = Price(start(), nil, Selection{Slug: "start", ModuleIDs: []string{"external-api"}, ExternalApiCount: -3}, now)
	if q.ModulesTotalTenge != 0 || q.FinalTenge != 59000 {
		t.Errorf("negative count: %+v", q)
	}
}

func TestPromotionRemaining(t *testing.T) {
	if r := (Promotion{MaxOrders: 10, Taken: 3}).Remaining(); r != 7 {
		t.Errorf("remaining %d", r)
	}
	if r := (Promotion{MaxOrders: 10, Taken: 12}).Remaining(); r != 0 {
		t.Errorf("over-taken remaining %d", r)
	}
}
