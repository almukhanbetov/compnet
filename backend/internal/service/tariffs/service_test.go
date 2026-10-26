package tariffs

import (
	"strings"
	"testing"

	"github.com/almukha/compnet-backend/internal/domain/tariff"
)

func priced(price int64, cost *int64) tariff.Tariff {
	return tariff.Tariff{Slug: "start", Current: tariff.Version{PriceTenge: price, CostTenge: cost}}
}

func ptr(n int64) *int64 { return &n }

func TestVersionProblems(t *testing.T) {
	promo := &tariff.Promotion{Title: "Старт по акции", DiscountTenge: 10000, IsActive: true}
	for _, c := range []struct {
		name  string
		t     tariff.Tariff
		promo *tariff.Promotion
		field string // "" — allowed
		want  string
	}{
		{"no cost, no promotion", priced(59000, nil), nil, "", ""},
		{"above the cost", priced(59000, ptr(30000)), nil, "", ""},
		{"equal to the cost", priced(30000, ptr(30000)), nil, "", ""},
		{"below the cost", priced(29000, ptr(30000)), nil, "price_tenge", "ниже себестоимости (30 000 ₸)"},
		{"promotion fits", priced(59000, ptr(30000)), promo, "", ""},
		{"promotional price equal to the cost", priced(40000, ptr(30000)), promo, "", ""},
		{"discount not below the price", priced(10000, ptr(0)), promo, "price_tenge", "скидка действующей акции"},
		{"promotion without a cost", priced(59000, nil), promo, "cost_tenge", "укажите себестоимость"},
		{"promotional price below the cost", priced(35000, ptr(30000)), promo, "price_tenge", "акционная цена (25 000 ₸) ниже себестоимости"},
	} {
		got := versionProblems(c.t, c.promo)
		if c.field == "" {
			if len(got) != 0 {
				t.Errorf("%s: want none, got %v", c.name, got)
			}
			continue
		}
		if !strings.Contains(got[c.field], c.want) {
			t.Errorf("%s: want %s ~ %q, got %v", c.name, c.field, c.want, got)
		}
	}
}

func TestFormatTenge(t *testing.T) {
	for n, want := range map[int64]string{0: "0 ₸", 999: "999 ₸", 1000: "1 000 ₸", 49000: "49 000 ₸", 1234567: "1 234 567 ₸", -10000: "-10 000 ₸"} {
		if got := formatTenge(n); got != want {
			t.Errorf("formatTenge(%d) = %q, want %q", n, got, want)
		}
	}
}
