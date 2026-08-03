// Package content holds the domain model for public marketing content:
// services overview/detail, pricing cards, portfolio cases and testimonials.
// All of it is read-only from the API's perspective in this milestone — no
// admin write path exists yet (that requires auth/roles, which don't exist
// yet either).
package content

import "errors"

// ErrNotFound is returned by single-record lookups (by slug) when no
// published record matches.
var ErrNotFound = errors.New("content: not found")

// ServiceOverview is one summary card (homepage + /services intro grid).
type ServiceOverview struct {
	Slug        string
	Title       string
	Description string
	Features    []string
	Icon        string
	SortOrder   int
}

// ServiceHighlight is one icon+label pair inside a ServiceDetail.
type ServiceHighlight struct {
	Icon  string `json:"icon"`
	Label string `json:"label"`
}

// ServiceDetail is the full section content for one service (/services page).
type ServiceDetail struct {
	Slug        string
	Eyebrow     string
	Title       string
	Description string
	Points      []string
	Highlights  []ServiceHighlight
}

// PricingCard is the content half of a pricing card. Price and duration are
// deliberately not stored here — the service layer joins ProjectType by
// looking it up in internal/pricing, so the calculator and this card can
// never disagree on a price.
type PricingCard struct {
	ProjectType string
	Description string
	Features    []string
	ServiceHref string
	SortOrder   int
}

// PortfolioCase is one real-project case study shown on /portfolio.
type PortfolioCase struct {
	Slug          string
	Title         string
	Category      string
	Subcategory   string
	Summary       string
	Task          string
	Process       []string
	Solution      string
	Technologies  []string
	Result        string
	Duration      string
	GradientFrom  string
	GradientTo    string
	ScreenshotURL string
	ExternalURL   string
	SortOrder     int
}

// Testimonial is one client quote.
type Testimonial struct {
	ID        string
	Name      string
	Role      string
	Company   string
	Quote     string
	Rating    int
	Initials  string
	SortOrder int
}
