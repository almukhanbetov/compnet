// Package baseprice holds the base prices of the project types (the
// individual calculator's starting prices): versions stored in PostgreSQL,
// changed by administrators. The formula, scale tiers, modules and
// coefficients stay in the Go catalog (internal/pricing).
package baseprice

import (
	"errors"
	"time"

	"github.com/almukha/compnet-backend/internal/pricing"
)

// Current is a project type's price in force, with who set it, when and why.
type Current struct {
	pricing.BasePrice
	Reason     string
	AuthorName string    // "" for the seeded versions
	CreatedAt  time.Time // zero for a type without a stored price
}

// Change is a new base price as an administrator asked for it.
type Change struct {
	ProjectType string
	PriceTenge  int64
	Reason      string
	// ExpectedVersion is the version the administrator edited: refused
	// (ErrVersionConflict) when another one became current meanwhile.
	ExpectedVersion int
}

// HistoryEntry is one base price version.
type HistoryEntry struct {
	Version            int
	PriceTenge         int64
	PreviousPriceTenge *int64 // nil for the first version
	Reason             string
	AuthorName         string
	CreatedAt          time.Time
	IsCurrent          bool
	Requests           int // estimates calculated with this version
}

var (
	ErrNotFound = errors.New("baseprice: project type not found")
	// ErrVersionConflict: the current version is no longer the one edited.
	ErrVersionConflict = errors.New("baseprice: the current version has changed")
	// ErrPriceChanged: a request's base price is no longer the one it was
	// calculated with (a new version became current meanwhile).
	ErrPriceChanged = errors.New("baseprice: the base price has changed")
)
