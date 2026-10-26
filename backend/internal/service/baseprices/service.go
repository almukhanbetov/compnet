// Package baseprices serves the base prices of the project types: the
// catalog in force (for the calculator, the pricing pages and the requests)
// and the administrators' changes. The formula is the Go catalog's
// (pricing.Catalog.Calculate); only the base prices come from PostgreSQL.
package baseprices

import (
	"context"
	"errors"
	"regexp"
	"strconv"
	"strings"
	"unicode/utf8"

	"github.com/almukha/compnet-backend/internal/apperr"
	"github.com/almukha/compnet-backend/internal/domain/baseprice"
	"github.com/almukha/compnet-backend/internal/domain/tariff"
	"github.com/almukha/compnet-backend/internal/pricing"
)

// MaxPriceTenge bounds a base price (also a database CHECK).
const MaxPriceTenge = 100_000_000

// Repository persists the base prices (postgres.BasePriceRepository).
type Repository interface {
	Current(ctx context.Context) ([]baseprice.Current, error)
	Change(ctx context.Context, staffID string, ch baseprice.Change, seed int64) (baseprice.Current, error)
	History(ctx context.Context, projectType string, limit int) ([]baseprice.HistoryEntry, error)
}

// TariffLister lists the tariffs (for the preview's notes; optional).
type TariffLister interface {
	ListTariffs(ctx context.Context, activeOnly, withCost bool) ([]tariff.Tariff, error)
}

// Service implements the base price use cases.
type Service struct {
	repo    Repository
	tariffs TariffLister
}

// NewService builds a Service; tariffs may be nil.
func NewService(repo Repository, tariffs TariffLister) *Service {
	return &Service{repo: repo, tariffs: tariffs}
}

// Catalog is the pricing catalog with the base prices in force.
func (s *Service) Catalog(ctx context.Context) (pricing.Catalog, error) {
	current, err := s.repo.Current(ctx)
	if err != nil {
		return pricing.Catalog{}, apperr.Internal(err)
	}
	prices := make([]pricing.BasePrice, 0, len(current))
	for _, c := range current {
		prices = append(prices, c.BasePrice)
	}
	return pricing.NewCatalog(prices), nil
}

// AdminItem is a project type as administrators manage it.
type AdminItem struct {
	Type     pricing.ProjectType
	Current  baseprice.Current // a type without a stored price: its seed, version 0
	Editable bool              // individual-only types have no price to change
}

// AdminList returns every project type of the catalog, in its order.
func (s *Service) AdminList(ctx context.Context) ([]AdminItem, error) {
	current, err := s.repo.Current(ctx)
	if err != nil {
		return nil, apperr.Internal(err)
	}
	stored := make(map[string]baseprice.Current, len(current))
	for _, c := range current {
		stored[c.ProjectType] = c
	}
	out := make([]AdminItem, 0, len(pricing.ProjectTypes))
	for _, t := range pricing.ProjectTypes {
		c, ok := stored[t.ID]
		if !ok {
			c = baseprice.Current{BasePrice: pricing.BasePrice{ProjectType: t.ID, PriceTenge: t.SeedBasePriceTenge}}
		}
		out = append(out, AdminItem{Type: t, Current: c, Editable: t.Editable()})
	}
	return out, nil
}

// ExampleRow is the standard estimate (basic design, standard complexity,
// normal urgency, no modules, one language) of a scale tier, at the current
// and at the new base price. TierID is "" for types without scale tiers.
type ExampleRow struct {
	TierID     string
	TierLabel  string
	Current    pricing.Result
	Proposed   pricing.Result
	Individual bool // the tier is out of standard scope
}

// Preview is what a new base price would do, computed by the calculator
// itself; nothing is stored.
type Preview struct {
	Item     AdminItem
	NewPrice int64
	Rows     []ExampleRow
	Problems map[string]string
	Warnings []string
}

func (s *Service) item(ctx context.Context, projectType string) (AdminItem, error) {
	items, err := s.AdminList(ctx)
	if err != nil {
		return AdminItem{}, err
	}
	for _, it := range items {
		if it.Type.ID == projectType {
			return it, nil
		}
	}
	return AdminItem{}, apperr.NotFound("тип проекта не найден")
}

func priceProblems(price int64) map[string]string {
	fields := map[string]string{}
	if price <= 0 || price > MaxPriceTenge {
		fields["price_tenge"] = "цена от 1 до 100 000 000 ₸"
	}
	return fields
}

// PreviewPrice computes a new base price's effect for an administrator.
func (s *Service) PreviewPrice(ctx context.Context, projectType string, price int64) (Preview, error) {
	if fields := priceProblems(price); len(fields) > 0 {
		return Preview{}, apperr.Validation("проверьте цену", fields)
	}
	it, err := s.item(ctx, projectType)
	if err != nil {
		return Preview{}, err
	}
	out := Preview{Item: it, NewPrice: price, Problems: map[string]string{}, Warnings: []string{}}
	if !it.Editable {
		out.Problems["price_tenge"] = "у этого типа проекта нет базовой цены — только индивидуальный расчёт"
		return out, nil
	}
	current, err := s.Catalog(ctx)
	if err != nil {
		return Preview{}, err
	}
	newBase := it.Current.BasePrice
	newBase.PriceTenge = &price
	proposed := pricing.NewCatalog(append(currentPrices(current), newBase))
	tiers := []pricing.ScaleTier{{}}
	if it.Type.Category != pricing.ScaleCategoryNone {
		tiers = tiers[:0]
		for _, t := range pricing.ScaleTiers {
			if t.Category == it.Type.Category {
				tiers = append(tiers, t)
			}
		}
	}
	for _, t := range tiers {
		in := pricing.CalculateInput{ProjectTypeID: projectType, ScaleTierID: t.ID, DesignLevelID: "basic", ComplexityID: "standard", UrgencyID: "normal"}
		cur, err1 := current.Calculate(in)
		pro, err2 := proposed.Calculate(in)
		if err := errors.Join(err1, err2); err != nil {
			return Preview{}, apperr.Internal(err)
		}
		out.Rows = append(out.Rows, ExampleRow{TierID: t.ID, TierLabel: t.Label, Current: cur, Proposed: pro, Individual: pro.IsIndividual})
	}
	old := *it.Current.PriceTenge
	if price == old {
		out.Problems["price_tenge"] = "новая цена совпадает с текущей"
	}
	if diff := price - old; diff*2 > old || -diff*2 > old {
		out.Warnings = append(out.Warnings, "цена меняется больше чем на 50% — проверьте сумму")
	}
	if price%pricing.RoundStepTenge != 0 {
		out.Warnings = append(out.Warnings, "цена не кратна "+formatTenge(pricing.RoundStepTenge)+": расчёты всё равно округляются до этого шага")
	}
	if s.tariffs != nil {
		ts, err := s.tariffs.ListTariffs(ctx, false, false)
		if err != nil {
			return Preview{}, apperr.Internal(err)
		}
		for _, t := range ts {
			if t.Current.ProjectType == projectType {
				out.Warnings = append(out.Warnings, "тариф «"+t.Title+"» ("+formatTenge(t.Current.PriceTenge)+") относится к этому типу; его цена не меняется")
			}
		}
	}
	return out, nil
}

// currentPrices lists the stored prices of a catalog (the order does not matter).
func currentPrices(c pricing.Catalog) []pricing.BasePrice {
	out := []pricing.BasePrice{}
	for _, t := range pricing.ProjectTypes {
		if p := c.BasePrice(t.ID); p.VersionID != "" {
			out = append(out, p)
		}
	}
	return out
}

// ChangeInput is a new base price from an administrator.
type ChangeInput struct {
	PriceTenge      int64
	Reason          string
	ExpectedVersion int
}

var spaces = regexp.MustCompile(`\s+`)

// ChangePrice stores a new base price version. Requests already saved keep
// their amounts and the version they were calculated with.
func (s *Service) ChangePrice(ctx context.Context, staffID, projectType string, in ChangeInput) (baseprice.Current, error) {
	fields := priceProblems(in.PriceTenge)
	reason := strings.TrimSpace(spaces.ReplaceAllString(in.Reason, " "))
	if n := utf8.RuneCountInString(reason); n < 3 || n > 500 {
		fields["reason"] = "укажите причину: от 3 до 500 символов"
	}
	if in.ExpectedVersion < 0 {
		fields["expected_version"] = "обновите данные"
	}
	if len(fields) > 0 {
		return baseprice.Current{}, apperr.Validation("проверьте цену", fields)
	}
	it, err := s.item(ctx, projectType)
	if err != nil {
		return baseprice.Current{}, err
	}
	if !it.Editable {
		return baseprice.Current{}, apperr.Validation("проверьте цену", map[string]string{"price_tenge": "у этого типа проекта нет базовой цены — только индивидуальный расчёт"})
	}
	if it.Current.Version != in.ExpectedVersion {
		return baseprice.Current{}, conflict()
	}
	if *it.Current.PriceTenge == in.PriceTenge {
		return baseprice.Current{}, apperr.Validation("проверьте цену", map[string]string{"price_tenge": "новая цена совпадает с текущей"})
	}
	c, err := s.repo.Change(ctx, staffID, baseprice.Change{
		ProjectType: projectType, PriceTenge: in.PriceTenge, Reason: reason, ExpectedVersion: in.ExpectedVersion,
	}, *it.Type.SeedBasePriceTenge)
	switch {
	case errors.Is(err, baseprice.ErrVersionConflict):
		return baseprice.Current{}, conflict()
	case err != nil:
		return baseprice.Current{}, apperr.Internal(err)
	}
	return c, nil
}

func conflict() error {
	return apperr.Conflict("цену уже изменил другой администратор — обновите данные и проверьте расчёт ещё раз")
}

// History lists a project type's base price versions, newest first.
func (s *Service) History(ctx context.Context, projectType string) ([]baseprice.HistoryEntry, error) {
	if _, ok := pricing.FindProjectType(projectType); !ok {
		return nil, apperr.NotFound("тип проекта не найден")
	}
	h, err := s.repo.History(ctx, projectType, 50)
	if err != nil {
		return nil, apperr.Internal(err)
	}
	return h, nil
}

// formatTenge writes 10000 as "10 000 ₸" (messages for administrators).
func formatTenge(n int64) string {
	digits := strconv.FormatInt(n, 10)
	var b strings.Builder
	for i, r := range digits {
		if i > 0 && (len(digits)-i)%3 == 0 {
			b.WriteByte(' ')
		}
		b.WriteRune(r)
	}
	return b.String() + " ₸"
}
