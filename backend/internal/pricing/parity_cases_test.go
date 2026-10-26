package pricing

import (
	"bufio"
	"encoding/json"
	"math/rand/v2"
	"net/http"
	"os"
	"sort"
	"testing"
)

// parityCatalog prices the cases: the seed prices, or the base prices a
// running server publishes ($PRICING_CATALOG_URL), so the parity is checked
// on the prices in force after administrators changed them.
var parityCatalog = SeedCatalog()

func loadParityCatalog(t *testing.T, url string) Catalog {
	t.Helper()
	res, err := http.Get(url)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	var body struct {
		Data struct {
			ProjectTypes []struct {
				ID               string `json:"id"`
				BasePriceTenge   *int64 `json:"base_price_tenge"`
				BasePriceVersion int    `json:"base_price_version"`
			} `json:"project_types"`
		} `json:"data"`
	}
	if err := json.NewDecoder(res.Body).Decode(&body); err != nil || len(body.Data.ProjectTypes) == 0 {
		t.Fatalf("catalog %s: %v", url, err)
	}
	prices := []BasePrice{}
	for _, p := range body.Data.ProjectTypes {
		prices = append(prices, BasePrice{ProjectType: p.ID, VersionID: "published", Version: p.BasePriceVersion, PriceTenge: p.BasePriceTenge})
	}
	return NewCatalog(prices)
}

// parityCase is one estimate input with this calculator's outcome, as
// e2e/pricing/parity.mjs replays it with the browser's calculator.
type parityCase struct {
	ProjectType  string   `json:"p"`
	ScaleTier    string   `json:"t"`
	Modules      []string `json:"m"`
	ApiCount     int      `json:"n"`
	Multilingual bool     `json:"ml"`
	Design       string   `json:"d"`
	Complexity   string   `json:"c"`
	Urgency      string   `json:"u"`
	Kind         string   `json:"k"` // estimate, individual or invalid
	Minimum      int64    `json:"min,omitempty"`
	Maximum      int64    `json:"max,omitempty"`
	Duration     string   `json:"dur,omitempty"`
}

func (c *parityCase) calculate() {
	r, err := parityCatalog.Calculate(CalculateInput{c.ProjectType, c.ScaleTier, c.Modules, c.ApiCount, c.Multilingual, c.Design, c.Complexity, c.Urgency})
	switch {
	case err != nil:
		c.Kind = "invalid"
	case r.IsIndividual:
		c.Kind = "individual"
	default:
		c.Kind, c.Minimum, c.Maximum, c.Duration = "estimate", *r.MinimumTenge, *r.MaximumTenge, r.DurationLabel
	}
}

// TestWriteParityCases writes estimate cases and their results as JSON lines
// to $PRICING_PARITY_OUT (base prices: the seed, or those published at
// $PRICING_CATALOG_URL). Skipped unless the variable is set. The grid covers
// every project type, every scale tier of its category, every distinct
// modules total (one module set per total, with and without the per-unit
// integrations), every design / complexity / urgency level and both
// multilingual choices; random cases add arbitrary module sets and invalid
// input (unknown ids, repeated modules, tiers of another category,
// negative integration counts).
func TestWriteParityCases(t *testing.T) {
	out := os.Getenv("PRICING_PARITY_OUT")
	if out == "" {
		t.Skip("PRICING_PARITY_OUT not set")
	}
	if url := os.Getenv("PRICING_CATALOG_URL"); url != "" {
		parityCatalog = loadParityCatalog(t, url)
	}
	f, err := os.Create(out)
	if err != nil {
		t.Fatal(err)
	}
	defer f.Close()
	w := bufio.NewWriter(f)
	defer w.Flush()
	enc := json.NewEncoder(w)
	count := 0
	write := func(c parityCase) {
		c.calculate()
		if err := enc.Encode(c); err != nil {
			t.Fatal(err)
		}
		count++
	}

	// One module set per distinct total: subsets of the fixed-price modules,
	// then 0–5 integrations on top.
	// Map keys are walked in sorted order, so the file is the same on every run.
	sortedTotals := func(m map[int64][]string) []int64 {
		keys := make([]int64, 0, len(m))
		for k := range m {
			keys = append(keys, k)
		}
		sort.Slice(keys, func(i, j int) bool { return keys[i] < keys[j] })
		return keys
	}
	setFor := map[int64][]string{0: {}}
	for _, m := range Modules {
		if m.PerUnit {
			continue
		}
		next := map[int64][]string{}
		for total, set := range setFor {
			next[total] = set
		}
		for _, total := range sortedTotals(setFor) {
			if _, ok := next[total+m.PriceTenge]; !ok {
				next[total+m.PriceTenge] = append(append([]string{}, setFor[total]...), m.ID)
			}
		}
		setFor = next
	}
	type moduleChoice struct {
		ids []string
		n   int
	}
	byTotal := map[int64]moduleChoice{}
	var perUnit Module
	for _, m := range Modules {
		if m.PerUnit {
			perUnit = m
		}
	}
	for _, total := range sortedTotals(setFor) {
		set := setFor[total]
		for n := 0; n <= 5; n++ {
			sum := total + int64(n)*perUnit.PriceTenge
			if _, ok := byTotal[sum]; ok && n == 0 {
				continue
			}
			ids := set
			if n > 0 {
				ids = append(append([]string{}, set...), perUnit.ID)
			}
			if prev, ok := byTotal[sum]; !ok || (n > 0 && prev.n == 0) {
				byTotal[sum] = moduleChoice{ids, n}
			}
		}
	}
	totals := make([]int64, 0, len(byTotal))
	for total := range byTotal {
		totals = append(totals, total)
	}
	sort.Slice(totals, func(i, j int) bool { return totals[i] < totals[j] })

	for _, p := range ProjectTypes {
		tiers := []string{""}
		if p.Category != ScaleCategoryNone {
			tiers = nil
			for _, tier := range ScaleTiers {
				if tier.Category == p.Category {
					tiers = append(tiers, tier.ID)
				}
			}
		}
		for _, tier := range tiers {
			for _, total := range totals {
				choice := byTotal[total]
				for _, d := range DesignLevels {
					for _, c := range ComplexityLevels {
						for _, u := range UrgencyLevels {
							for _, ml := range []bool{false, true} {
								write(parityCase{ProjectType: p.ID, ScaleTier: tier, Modules: choice.ids, ApiCount: choice.n,
									Multilingual: ml, Design: d.ID, Complexity: c.ID, Urgency: u.ID})
							}
						}
					}
				}
			}
		}
	}

	rng := rand.New(rand.NewPCG(87, 1))
	pick := func(ids []string) string { return ids[rng.IntN(len(ids))] }
	var typeIDs, tierIDs, moduleIDs, designIDs, complexityIDs, urgencyIDs []string
	for _, p := range ProjectTypes {
		typeIDs = append(typeIDs, p.ID)
	}
	for _, s := range ScaleTiers {
		tierIDs = append(tierIDs, s.ID)
	}
	for _, m := range Modules {
		moduleIDs = append(moduleIDs, m.ID)
	}
	for _, l := range DesignLevels {
		designIDs = append(designIDs, l.ID)
	}
	for _, l := range ComplexityLevels {
		complexityIDs = append(complexityIDs, l.ID)
	}
	for _, l := range UrgencyLevels {
		urgencyIDs = append(urgencyIDs, l.ID)
	}
	typeIDs = append(typeIDs, "unknown-type")
	tierIDs = append(tierIDs, "", "unknown-tier")
	designIDs = append(designIDs, "unknown")
	for i := 0; i < 50000; i++ {
		var modules []string
		for _, id := range moduleIDs {
			if rng.IntN(3) == 0 {
				modules = append(modules, id)
			}
		}
		rng.Shuffle(len(modules), func(a, b int) { modules[a], modules[b] = modules[b], modules[a] })
		switch rng.IntN(40) {
		case 0:
			modules = append(modules, "unknown-module")
		case 1:
			if len(modules) > 0 {
				modules = append(modules, modules[0])
			}
		}
		write(parityCase{ProjectType: pick(typeIDs), ScaleTier: pick(tierIDs), Modules: modules, ApiCount: rng.IntN(15) - 2,
			Multilingual: rng.IntN(2) == 0, Design: pick(designIDs), Complexity: pick(complexityIDs), Urgency: pick(urgencyIDs)})
	}
	t.Logf("%d cases written", count)
}
