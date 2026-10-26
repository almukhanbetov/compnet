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
	CreateVersion(ctx context.Context, staffID, slug string, v tariff.Version, cost *int64) (tariff.Tariff, error)
	SetCurrentCost(ctx context.Context, staffID, slug string, cost int64) (tariff.Tariff, error)
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
}

// CreateVersion validates and stores a new current price version. The
// project type and modules must exist in the Go catalog.
func (s *Service) CreateVersion(ctx context.Context, staffID, slug string, in VersionInput) (tariff.Tariff, error) {
	fields := map[string]string{}
	if in.PriceTenge <= 0 || in.PriceTenge > 100_000_000 {
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
	if in.CostTenge != nil && *in.CostTenge < 0 {
		fields["cost_tenge"] = "не может быть отрицательной"
	}
	if len(fields) > 0 {
		return tariff.Tariff{}, apperr.Validation("проверьте версию тарифа", fields)
	}
	t, err := s.repo.CreateVersion(ctx, staffID, slug, tariff.Version{
		PriceTenge: in.PriceTenge, PriceKind: tariff.PriceKind(in.PriceKind), ProjectType: in.ProjectType,
		Features: nonNil(in.Features), AllowedModuleIDs: nonNil(in.AllowedModuleIDs), DurationLabel: in.DurationLabel,
	}, in.CostTenge)
	return t, wrap(err, "тариф")
}

// SetCost sets the internal cost of a tariff's current version.
func (s *Service) SetCost(ctx context.Context, staffID, slug string, cost int64) (tariff.Tariff, error) {
	if cost < 0 || cost > 100_000_000 {
		return tariff.Tariff{}, apperr.Validation("проверьте себестоимость", map[string]string{"cost_tenge": "от 0 до 100 000 000 ₸"})
	}
	t, err := s.repo.SetCurrentCost(ctx, staffID, slug, cost)
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
