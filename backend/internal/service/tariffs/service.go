// Package tariffs serves the tariffs and promotions: the public list and
// quotes, the quote a request is saved with, and the administrators'
// changes. Prices are always the server's: a tariff version's price, extra
// modules from the Go catalog, a live promotion's discount.
package tariffs

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/almukha/compnet-backend/internal/apperr"
	"github.com/almukha/compnet-backend/internal/domain/tariff"
	"github.com/almukha/compnet-backend/internal/pricing"
)

// ReservationTTL is how long a promotional place is held for a request the
// manager has not taken into work yet; then it is given back.
const ReservationTTL = 72 * time.Hour

// Repository persists tariffs and promotions (postgres.TariffRepository).
type Repository interface {
	ListTariffs(ctx context.Context, activeOnly, withCost bool) ([]tariff.Tariff, error)
	GetTariff(ctx context.Context, slug string, activeOnly bool) (tariff.Tariff, error)
	ActivePromotion(ctx context.Context, tariffID string, ttl time.Duration) (*tariff.Promotion, error)
	ListPromotions(ctx context.Context, ttl time.Duration) ([]tariff.Promotion, error)
	UpdateTariff(ctx context.Context, staffID, slug string, p tariff.TariffPatch) (tariff.Tariff, error)
	CreateVersion(ctx context.Context, staffID, slug string, nv tariff.NewVersion) (tariff.Tariff, error)
	PriceHistory(ctx context.Context, slug string, limit int) ([]tariff.HistoryEntry, error)
	SetCurrentCost(ctx context.Context, staffID, slug string, cost int64, check tariff.VersionCheck) (tariff.Tariff, error)
	UpdatePromotion(ctx context.Context, staffID, slug string, p tariff.PromotionPatch, ttl time.Duration, check tariff.PromotionCheck) (tariff.Promotion, error)
	ReleaseExpiredReservations(ctx context.Context, ttl time.Duration) (int64, error)
}

// Service implements the tariff use cases.
type Service struct {
	repo Repository
	now  func() time.Time
}

// NewService builds a Service.
func NewService(repo Repository) *Service {
	return &Service{repo: repo, now: time.Now}
}

// ReservationTTL is the hold time of an unconfirmed promotional place.
func (s *Service) ReservationTTL() time.Duration { return ReservationTTL }

// PublicTariff is an active tariff as visitors see it: no cost, and its
// promotion only while it is live (active, in its period, with places).
type PublicTariff struct {
	Tariff    tariff.Tariff
	Promotion *tariff.Promotion
}

// PublicTariffs lists the active tariffs in display order.
func (s *Service) PublicTariffs(ctx context.Context) ([]PublicTariff, error) {
	list, err := s.repo.ListTariffs(ctx, true, false)
	if err != nil {
		return nil, apperr.Internal(err)
	}
	now := s.now()
	out := make([]PublicTariff, 0, len(list))
	for _, t := range list {
		p, err := s.repo.ActivePromotion(ctx, t.ID, ReservationTTL)
		if err != nil {
			return nil, apperr.Internal(err)
		}
		if p != nil && (!p.LiveAt(now) || p.DiscountTenge >= t.Current.PriceTenge) {
			p = nil
		}
		t.Current.CostTenge = nil
		out = append(out, PublicTariff{Tariff: t, Promotion: p})
	}
	return out, nil
}

// Quote prices a selection: the tariff must be active, the modules allowed
// for it. Used for the visitor's preview and for the request being saved
// (where the promotional place is then reserved, or not).
func (s *Service) Quote(ctx context.Context, sel tariff.Selection) (tariff.Quote, error) {
	t, err := s.repo.GetTariff(ctx, sel.Slug, true)
	if err != nil {
		return tariff.Quote{}, err
	}
	p, err := s.repo.ActivePromotion(ctx, t.ID, ReservationTTL)
	if err != nil {
		return tariff.Quote{}, err
	}
	return tariff.Price(t, p, sel, s.now())
}

// PublicQuote is Quote with errors for the API.
func (s *Service) PublicQuote(ctx context.Context, sel tariff.Selection) (tariff.Quote, error) {
	q, err := s.Quote(ctx, sel)
	switch {
	case errors.Is(err, tariff.ErrNotFound):
		return q, apperr.NotFound("тариф не найден")
	case errors.Is(err, tariff.ErrModuleNotAllowed), errors.Is(err, tariff.ErrDuplicateModule):
		return q, apperr.Validation("проверьте модули", map[string]string{"modules": "модуль недоступен для этого тарифа"})
	case err != nil:
		return q, apperr.Internal(err)
	}
	return q, nil
}

// AdminView is everything an administrator manages, costs included.
type AdminView struct {
	Tariffs    []tariff.Tariff
	Promotions []tariff.Promotion
}

// AdminList returns every tariff (with cost) and promotion (with counts).
func (s *Service) AdminList(ctx context.Context) (AdminView, error) {
	ts, err := s.repo.ListTariffs(ctx, false, true)
	if err != nil {
		return AdminView{}, apperr.Internal(err)
	}
	ps, err := s.repo.ListPromotions(ctx, ReservationTTL)
	if err != nil {
		return AdminView{}, apperr.Internal(err)
	}
	return AdminView{Tariffs: ts, Promotions: ps}, nil
}

func wrap(err error, what string) error {
	var ae *apperr.Error
	switch {
	case err == nil:
		return nil
	case errors.As(err, &ae):
		return err
	case errors.Is(err, tariff.ErrNotFound):
		return apperr.NotFound(what + " не найден")
	case errors.Is(err, tariff.ErrVersionConflict):
		return apperr.Conflict("цену уже изменил другой администратор — обновите данные и проверьте расчёт ещё раз")
	default:
		return apperr.Internal(err)
	}
}

// UpdateTariff changes a tariff's texts, order or activity. A tariff with an
// active promotion cannot be switched off (switch the promotion off first).
func (s *Service) UpdateTariff(ctx context.Context, staffID, slug string, p tariff.TariffPatch) (tariff.Tariff, error) {
	fields := map[string]string{}
	if p.Title != nil && !between(*p.Title, 1, 100) {
		fields["title"] = "от 1 до 100 символов"
	}
	if p.Description != nil && utf8.RuneCountInString(*p.Description) > 1000 {
		fields["description"] = "не больше 1000 символов"
	}
	if p.IsActive != nil && !*p.IsActive {
		t, err := s.repo.GetTariff(ctx, slug, false)
		if err != nil {
			return tariff.Tariff{}, wrap(err, "тариф")
		}
		if promo, err := s.repo.ActivePromotion(ctx, t.ID, ReservationTTL); err != nil {
			return tariff.Tariff{}, apperr.Internal(err)
		} else if promo != nil {
			fields["is_active"] = "сначала выключите акцию «" + promo.Title + "»"
		}
	}
	if len(fields) > 0 {
		return tariff.Tariff{}, apperr.Validation("проверьте тариф", fields)
	}
	t, err := s.repo.UpdateTariff(ctx, staffID, slug, p)
	return t, wrap(err, "тариф")
}

// VersionInput is a new price version from an administrator.
type VersionInput struct {
	PriceTenge       int64
	PriceKind        string
	ProjectType      string
	Features         []string
	AllowedModuleIDs []string
	DurationLabel    string
	CostTenge        *int64
	Reason           string
	// ExpectedVersion: the version the administrator edited (0: not checked).
	ExpectedVersion int
}

// MaxPriceTenge bounds tariff prices and costs.
const MaxPriceTenge = 100_000_000

// versionProblems is what forbids a tariff's new current version (cost
// resolved), against its active promotion: the price not below the cost,
// and the rules the promotion was switched on with still true.
func versionProblems(t tariff.Tariff, active *tariff.Promotion) map[string]string {
	fields := map[string]string{}
	v := t.Current
	if v.CostTenge != nil && v.PriceTenge < *v.CostTenge {
		fields["price_tenge"] = "цена ниже себестоимости (" + formatTenge(*v.CostTenge) + ")"
	}
	if active != nil {
		switch {
		case active.DiscountTenge >= v.PriceTenge:
			fields["price_tenge"] = "скидка действующей акции «" + active.Title + "» (" + formatTenge(active.DiscountTenge) + ") должна быть меньше цены"
		case v.CostTenge == nil:
			fields["cost_tenge"] = "у тарифа действует акция — укажите себестоимость"
		case v.PriceTenge-active.DiscountTenge < *v.CostTenge:
			fields["price_tenge"] = "акционная цена (" + formatTenge(v.PriceTenge-active.DiscountTenge) + ") ниже себестоимости"
		}
	}
	return fields
}

func versionCheck(t tariff.Tariff, active *tariff.Promotion) error {
	if fields := versionProblems(t, active); len(fields) > 0 {
		return apperr.Validation("проверьте цену", fields)
	}
	return nil
}

// CreateVersion validates and stores a new current price version. The
// project type and modules must exist in the Go catalog; without a cost the
// current version's is kept.
func (s *Service) CreateVersion(ctx context.Context, staffID, slug string, in VersionInput) (tariff.Tariff, error) {
	fields := map[string]string{}
	if in.PriceTenge <= 0 || in.PriceTenge > MaxPriceTenge {
		fields["price_tenge"] = "цена от 1 до 100 000 000 ₸"
	}
	if in.PriceKind != string(tariff.PriceFixed) && in.PriceKind != string(tariff.PriceFrom) {
		fields["price_kind"] = "fixed или from"
	}
	if _, ok := pricing.FindProjectType(in.ProjectType); !ok {
		fields["project_type"] = "неизвестный тип проекта"
	}
	if len(in.Features) > 20 {
		fields["features"] = "не больше 20 пунктов"
	}
	for _, f := range in.Features {
		if !between(f, 1, 200) {
			fields["features"] = "каждый пункт — от 1 до 200 символов"
		}
	}
	seen := map[string]bool{}
	for _, id := range in.AllowedModuleIDs {
		if _, ok := pricing.FindModule(id); !ok || seen[id] {
			fields["allowed_module_ids"] = "неизвестный или повторный модуль: " + id
		}
		seen[id] = true
	}
	if !between(in.DurationLabel, 1, 50) {
		fields["duration_label"] = "от 1 до 50 символов"
	}
	if in.CostTenge != nil && (*in.CostTenge < 0 || *in.CostTenge > MaxPriceTenge) {
		fields["cost_tenge"] = "от 0 до 100 000 000 ₸"
	}
	if utf8.RuneCountInString(in.Reason) > 500 {
		fields["reason"] = "не больше 500 символов"
	}
	if len(fields) > 0 {
		return tariff.Tariff{}, apperr.Validation("проверьте версию тарифа", fields)
	}
	t, err := s.repo.CreateVersion(ctx, staffID, slug, tariff.NewVersion{
		Version: tariff.Version{
			PriceTenge: in.PriceTenge, PriceKind: tariff.PriceKind(in.PriceKind), ProjectType: in.ProjectType,
			Features: nonNil(in.Features), AllowedModuleIDs: nonNil(in.AllowedModuleIDs), DurationLabel: in.DurationLabel,
			ChangeReason: strings.TrimSpace(in.Reason),
		},
		CostTenge: in.CostTenge, CarryCost: true, ExpectedVersion: in.ExpectedVersion, Check: versionCheck,
	})
	return t, wrap(err, "тариф")
}

// PriceChangeInput is a new price for a tariff, everything else kept.
type PriceChangeInput struct {
	PriceTenge int64
	// CostTenge of the new version; nil keeps the current version's.
	CostTenge       *int64
	Reason          string
	ExpectedVersion int
}

func (in PriceChangeInput) problems() map[string]string {
	fields := map[string]string{}
	if in.PriceTenge <= 0 || in.PriceTenge > MaxPriceTenge {
		fields["price_tenge"] = "цена от 1 до 100 000 000 ₸"
	}
	if in.CostTenge != nil && (*in.CostTenge < 0 || *in.CostTenge > MaxPriceTenge) {
		fields["cost_tenge"] = "от 0 до 100 000 000 ₸"
	}
	return fields
}

// ChangePrice makes a new current version of a tariff with another price:
// contents, modules, project type and timeline are those of the current
// version, which must still be the one the administrator edited. Requests
// already saved keep their version and price.
func (s *Service) ChangePrice(ctx context.Context, staffID, slug string, in PriceChangeInput) (tariff.Tariff, error) {
	fields := in.problems()
	if !between(in.Reason, 3, 500) {
		fields["reason"] = "укажите причину: от 3 до 500 символов"
	}
	if in.ExpectedVersion < 1 {
		fields["expected_version"] = "обновите данные"
	}
	if len(fields) > 0 {
		return tariff.Tariff{}, apperr.Validation("проверьте цену", fields)
	}
	cur, err := s.repo.GetTariff(ctx, slug, false)
	if err != nil {
		return tariff.Tariff{}, wrap(err, "тариф")
	}
	if cur.Current.Number != in.ExpectedVersion {
		return tariff.Tariff{}, wrap(tariff.ErrVersionConflict, "тариф")
	}
	if cur.Current.PriceTenge == in.PriceTenge {
		return tariff.Tariff{}, apperr.Validation("проверьте цену", map[string]string{"price_tenge": "новая цена совпадает с текущей"})
	}
	v := cur.Current
	v.ID, v.PriceTenge, v.ChangeReason, v.CostTenge = "", in.PriceTenge, strings.TrimSpace(spaces.ReplaceAllString(in.Reason, " ")), nil
	t, err := s.repo.CreateVersion(ctx, staffID, slug, tariff.NewVersion{
		Version: v, CostTenge: in.CostTenge, CarryCost: true, ExpectedVersion: in.ExpectedVersion, Check: versionCheck,
	})
	return t, wrap(err, "тариф")
}

// PreviewInput is a price to try, with a selection of extra modules to price.
type PreviewInput struct {
	PriceTenge       int64
	CostTenge        *int64
	ModuleIDs        []string
	ExternalApiCount int
}

// PricePreview is what a new price would do, computed by the same rules as
// the site and the requests (tariff.Price), nothing stored.
type PricePreview struct {
	Current  tariff.Tariff // with cost
	Proposed tariff.Tariff // the new version as it would be (cost resolved)
	// The selection at the current and at the new price (regular price).
	CurrentQuote, NewQuote tariff.Quote
	// The tariff's promotion (the active one, otherwise the first), with the
	// selection's price after its discount (nil when the discount would not
	// apply) and whether it is live now.
	Promotion      *tariff.Promotion
	PromotionLive  bool
	PromotionFinal *int64
	// Problems block the change (the same rules as saving it); warnings do not.
	Problems map[string]string
	Warnings []string
}

// PreviewPrice computes a new price's effect for an administrator.
func (s *Service) PreviewPrice(ctx context.Context, slug string, in PreviewInput) (PricePreview, error) {
	if fields := (PriceChangeInput{PriceTenge: in.PriceTenge, CostTenge: in.CostTenge}).problems(); len(fields) > 0 {
		return PricePreview{}, apperr.Validation("проверьте цену", fields)
	}
	view, err := s.AdminList(ctx)
	if err != nil {
		return PricePreview{}, err
	}
	var out PricePreview
	found := false
	for _, t := range view.Tariffs {
		if t.Slug == slug {
			out.Current, found = t, true
		}
	}
	if !found {
		return PricePreview{}, apperr.NotFound("тариф не найден")
	}
	var active *tariff.Promotion
	for i := range view.Promotions {
		p := &view.Promotions[i]
		if p.TariffID != out.Current.ID {
			continue
		}
		if p.IsActive {
			active = p
			out.Promotion = p
		} else if out.Promotion == nil {
			out.Promotion = p
		}
	}
	out.Proposed = out.Current
	out.Proposed.Current.Number++
	out.Proposed.Current.PriceTenge = in.PriceTenge
	if in.CostTenge != nil {
		out.Proposed.Current.CostTenge = in.CostTenge
	}
	sel := tariff.Selection{Slug: slug, ModuleIDs: in.ModuleIDs, ExternalApiCount: in.ExternalApiCount}
	now := s.now()
	if out.CurrentQuote, err = tariff.Price(out.Current, nil, sel, now); err == nil {
		out.NewQuote, err = tariff.Price(out.Proposed, nil, sel, now)
	}
	if errors.Is(err, tariff.ErrModuleNotAllowed) || errors.Is(err, tariff.ErrDuplicateModule) {
		return PricePreview{}, apperr.Validation("проверьте модули", map[string]string{"modules": "модуль недоступен для этого тарифа"})
	}
	if err != nil {
		return PricePreview{}, apperr.Internal(err)
	}
	out.Problems = versionProblems(out.Proposed, active)
	if in.PriceTenge == out.Current.Current.PriceTenge {
		out.Problems["price_tenge"] = "новая цена совпадает с текущей"
	}
	out.Warnings = []string{}
	if p := out.Promotion; p != nil {
		out.PromotionLive = p.LiveAt(now)
		if p.DiscountTenge < in.PriceTenge {
			final := out.NewQuote.FinalTenge - p.DiscountTenge
			out.PromotionFinal = &final
		}
		if !p.IsActive {
			if fields := versionProblems(out.Proposed, p); len(fields) > 0 {
				out.Warnings = append(out.Warnings, "акция «"+p.Title+"» выключена; с этой ценой её нельзя будет включить: "+firstValue(fields))
			}
		}
	}
	old := out.Current.Current.PriceTenge
	if diff := in.PriceTenge - old; diff*2 > old || -diff*2 > old {
		out.Warnings = append(out.Warnings, "цена меняется больше чем на 50% — проверьте сумму")
	}
	if out.Proposed.Current.CostTenge == nil {
		out.Warnings = append(out.Warnings, "себестоимость не указана — маржа не рассчитана")
	}
	if out.Current.Current.PriceKind == tariff.PriceFrom {
		out.Warnings = append(out.Warnings, "цена «от»: итоговая стоимость заявки по ТЗ может быть выше")
	}
	return out, nil
}

// PriceHistory lists a tariff's price versions, newest first.
func (s *Service) PriceHistory(ctx context.Context, slug string) ([]tariff.HistoryEntry, error) {
	h, err := s.repo.PriceHistory(ctx, slug, 50)
	return h, wrap(err, "тариф")
}

func firstValue(m map[string]string) string {
	for _, k := range []string{"price_tenge", "cost_tenge"} {
		if v, ok := m[k]; ok {
			return v
		}
	}
	return ""
}

// formatTenge writes 10000 as "10 000 ₸" (messages for administrators).
func formatTenge(n int64) string {
	digits := strconv.FormatInt(n, 10)
	neg := strings.HasPrefix(digits, "-")
	digits = strings.TrimPrefix(digits, "-")
	var b strings.Builder
	for i, r := range digits {
		if i > 0 && (len(digits)-i)%3 == 0 {
			b.WriteByte(' ')
		}
		b.WriteRune(r)
	}
	if neg {
		return "-" + b.String() + " ₸"
	}
	return b.String() + " ₸"
}

// SetCost sets the internal cost of a tariff's current version: not above
// its price, nor above the active promotion's price.
func (s *Service) SetCost(ctx context.Context, staffID, slug string, cost int64) (tariff.Tariff, error) {
	if cost < 0 || cost > MaxPriceTenge {
		return tariff.Tariff{}, apperr.Validation("проверьте себестоимость", map[string]string{"cost_tenge": "от 0 до 100 000 000 ₸"})
	}
	t, err := s.repo.SetCurrentCost(ctx, staffID, slug, cost, versionCheck)
	return t, wrap(err, "тариф")
}

// UpdatePromotion changes a promotion. Checked against its tariff inside the
// transaction; switching it on (or changing it while on) requires both
// dates with the end in the future, an active tariff, a discount below the
// tariff's price, a known cost of the current version and a promotional
// price not below that cost.
func (s *Service) UpdatePromotion(ctx context.Context, staffID, slug string, patch tariff.PromotionPatch) (tariff.Promotion, error) {
	now := s.now()
	check := func(p tariff.Promotion, t tariff.Tariff) error {
		fields := map[string]string{}
		if !between(p.Title, 1, 100) {
			fields["title"] = "от 1 до 100 символов"
		}
		if p.DiscountTenge <= 0 {
			fields["discount_tenge"] = "скидка больше нуля"
		}
		if p.MaxOrders < 1 || p.MaxOrders > 10000 {
			fields["max_orders"] = "от 1 до 10 000"
		} else if p.MaxOrders < p.Taken {
			fields["max_orders"] = fmt.Sprintf("уже занято мест: %d", p.Taken)
		}
		if p.StartsAt != nil && p.EndsAt != nil && !p.EndsAt.After(*p.StartsAt) {
			fields["ends_at"] = "окончание позже начала"
		}
		if p.IsActive {
			switch {
			case p.StartsAt == nil || p.EndsAt == nil:
				fields["is_active"] = "укажите даты начала и окончания"
			case !p.EndsAt.After(now):
				fields["is_active"] = "дата окончания уже прошла"
			case !t.IsActive:
				fields["is_active"] = "сначала включите тариф «" + t.Title + "»"
			case p.DiscountTenge >= t.Current.PriceTenge:
				fields["is_active"] = "скидка должна быть меньше цены тарифа"
			case t.Current.CostTenge == nil:
				fields["is_active"] = "укажите себестоимость текущей версии тарифа"
			case t.Current.PriceTenge-p.DiscountTenge < *t.Current.CostTenge:
				fields["is_active"] = "акционная цена ниже себестоимости"
			}
		}
		if len(fields) > 0 {
			return apperr.Validation("проверьте акцию", fields)
		}
		return nil
	}
	p, err := s.repo.UpdatePromotion(ctx, staffID, slug, patch, ReservationTTL, check)
	if err != nil && strings.Contains(err.Error(), "promotions_one_active") {
		return p, apperr.Validation("проверьте акцию", map[string]string{"is_active": "у тарифа уже есть активная акция"})
	}
	return p, wrap(err, "акция")
}

// ReleaseExpired gives back places of requests not taken into work in time
// (periodic job).
func (s *Service) ReleaseExpired(ctx context.Context) error {
	_, err := s.repo.ReleaseExpiredReservations(ctx, ReservationTTL)
	return err
}

var spaces = regexp.MustCompile(`\s+`)

func between(s string, min, max int) bool {
	n := utf8.RuneCountInString(strings.TrimSpace(spaces.ReplaceAllString(s, " ")))
	return n >= min && n <= max
}

func nonNil(s []string) []string {
	if s == nil {
		return []string{}
	}
	return s
}
