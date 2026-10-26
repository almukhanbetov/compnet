// Package tariff holds the fixed-scope packages (Start, Business, PRO …)
// sold next to the individual calculator, their price versions and the
// promotions on them. A tariff's price lives in PostgreSQL (versioned);
// extra modules are priced from the Go catalog (internal/pricing), the only
// source of module prices.
package tariff

import (
	"errors"
	"time"

	"github.com/almukha/compnet-backend/internal/pricing"
)

// PriceKind: fixed is the price; from is the lower bound, the final price
// follows the brief (PRO).
type PriceKind string

const (
	PriceFixed PriceKind = "fixed"
	PriceFrom  PriceKind = "from"
)

// Tariff with its current version.
type Tariff struct {
	ID          string
	Slug        string
	Title       string
	Description string
	SortOrder   int
	IsActive    bool
	Current     Version
}

// Version is one immutable price version of a tariff.
type Version struct {
	ID               string
	TariffID         string
	Number           int
	PriceTenge       int64
	PriceKind        PriceKind
	ProjectType      string // a Go catalog project type
	Features         []string
	AllowedModuleIDs []string
	DurationLabel    string
	CreatedAt        time.Time
	// CostTenge: internal cost, administrators only; nil when unknown.
	CostTenge *int64
}

// Promotion is a discount on a tariff for a period and a number of orders.
type Promotion struct {
	ID            string
	Slug          string
	Title         string
	TariffID      string
	DiscountTenge int64
	StartsAt      *time.Time
	EndsAt        *time.Time
	MaxOrders     int
	IsActive      bool
	Version       int
	// Places held by requests (reserved + confirmed) and those confirmed.
	Taken     int
	Confirmed int
}

// LiveAt: active, inside its period and with a free place.
func (p Promotion) LiveAt(now time.Time) bool {
	return p.IsActive && p.StartsAt != nil && p.EndsAt != nil &&
		!now.Before(*p.StartsAt) && now.Before(*p.EndsAt) && p.Taken < p.MaxOrders
}

// Remaining free places.
func (p Promotion) Remaining() int {
	if p.Taken >= p.MaxOrders {
		return 0
	}
	return p.MaxOrders - p.Taken
}

// Selection is what a visitor chose: a tariff and its extra modules.
type Selection struct {
	Slug             string
	ModuleIDs        []string
	ExternalApiCount int // quantity for per-unit modules
}

// ModuleLine is one priced extra module.
type ModuleLine struct {
	ModuleID       string
	Quantity       int
	UnitPriceTenge int64
	TotalTenge     int64
}

// Quote is the server's price of a selection. Final = Base - Discount + Modules.
type Quote struct {
	TariffID          string
	Slug              string
	VersionID         string
	Version           int
	PriceKind         PriceKind
	ProjectType       string
	DurationLabel     string
	BasePriceTenge    int64
	Modules           []ModuleLine
	ModulesTotalTenge int64
	// Promotion offered for this quote (nil without one); whether it is
	// applied to a request is decided again when the request is saved.
	Promotion     *Promotion
	DiscountTenge int64
	FinalTenge    int64
	RulesVersion  string // Go catalog version of the module prices
}

var (
	ErrNotFound         = errors.New("tariff: not found")
	ErrModuleNotAllowed = errors.New("tariff: module not available for this tariff")
	ErrDuplicateModule  = errors.New("tariff: module selected twice")
)

// Price prices a selection on a version: the version's price, the allowed
// extra modules at the Go catalog's prices, and the promotion's discount
// when it is live at now. It never takes a price from the caller.
func Price(t Tariff, promo *Promotion, sel Selection, now time.Time) (Quote, error) {
	v := t.Current
	allowed := make(map[string]bool, len(v.AllowedModuleIDs))
	for _, id := range v.AllowedModuleIDs {
		allowed[id] = true
	}
	q := Quote{
		TariffID: t.ID, Slug: t.Slug, VersionID: v.ID, Version: v.Number, PriceKind: v.PriceKind,
		ProjectType: v.ProjectType, DurationLabel: v.DurationLabel, BasePriceTenge: v.PriceTenge,
		RulesVersion: pricing.RulesVersion,
	}
	seen := map[string]bool{}
	for _, id := range sel.ModuleIDs {
		if seen[id] {
			return Quote{}, ErrDuplicateModule
		}
		seen[id] = true
		m, ok := pricing.FindModule(id)
		if !ok || !allowed[id] {
			return Quote{}, ErrModuleNotAllowed
		}
		qty := 1
		if m.PerUnit {
			qty = max(sel.ExternalApiCount, 0)
		}
		line := ModuleLine{ModuleID: m.ID, Quantity: qty, UnitPriceTenge: m.PriceTenge, TotalTenge: m.PriceTenge * int64(qty)}
		q.Modules = append(q.Modules, line)
		q.ModulesTotalTenge += line.TotalTenge
	}
	if promo != nil && promo.TariffID == t.ID && promo.LiveAt(now) && promo.DiscountTenge < v.PriceTenge {
		q.Promotion = promo
		q.DiscountTenge = promo.DiscountTenge
	}
	q.FinalTenge = q.BasePriceTenge - q.DiscountTenge + q.ModulesTotalTenge
	return q, nil
}

// WithoutPromotion is the same quote at the regular price (no free place
// left when the request was saved).
func (q Quote) WithoutPromotion() Quote {
	q.Promotion = nil
	q.DiscountTenge = 0
	q.FinalTenge = q.BasePriceTenge + q.ModulesTotalTenge
	return q
}

// TariffPatch changes a tariff's texts, order or activity (nil: unchanged).
type TariffPatch struct {
	Title       *string
	Description *string
	SortOrder   *int
	IsActive    *bool
}

// PromotionPatch changes a promotion (nil: unchanged; ClearDates removes both dates).
type PromotionPatch struct {
	Title         *string
	DiscountTenge *int64
	StartsAt      *time.Time
	EndsAt        *time.Time
	ClearDates    bool
	MaxOrders     *int
	IsActive      *bool
}

// PromotionCheck validates a promotion as it would be after a change,
// against its tariff (current version, with cost). Called inside the
// transaction, with the promotion row locked.
type PromotionCheck func(p Promotion, t Tariff) error
