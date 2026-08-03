package dto

import (
	"github.com/almukha/compnet-backend/internal/domain/content"
	contentsvc "github.com/almukha/compnet-backend/internal/service/content"
)

// ServiceOverviewResponse is one summary card in GET /api/v1/services.
type ServiceOverviewResponse struct {
	Slug        string   `json:"slug"`
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Features    []string `json:"features"`
	Icon        string   `json:"icon"`
}

func NewServiceOverviewResponse(item content.ServiceOverview) ServiceOverviewResponse {
	return ServiceOverviewResponse{
		Slug:        item.Slug,
		Title:       item.Title,
		Description: item.Description,
		Features:    item.Features,
		Icon:        item.Icon,
	}
}

func NewServiceOverviewListResponse(items []content.ServiceOverview) []ServiceOverviewResponse {
	result := make([]ServiceOverviewResponse, 0, len(items))
	for _, item := range items {
		result = append(result, NewServiceOverviewResponse(item))
	}
	return result
}

// ServiceHighlightResponse is one icon+label pair inside ServiceDetailResponse.
type ServiceHighlightResponse struct {
	Icon  string `json:"icon"`
	Label string `json:"label"`
}

// ServiceDetailResponse is the full content of GET /api/v1/services/:slug.
type ServiceDetailResponse struct {
	Slug        string                     `json:"slug"`
	Eyebrow     string                     `json:"eyebrow"`
	Title       string                     `json:"title"`
	Description string                     `json:"description"`
	Points      []string                   `json:"points"`
	Highlights  []ServiceHighlightResponse `json:"highlights"`
}

func NewServiceDetailResponse(item content.ServiceDetail) ServiceDetailResponse {
	highlights := make([]ServiceHighlightResponse, 0, len(item.Highlights))
	for _, h := range item.Highlights {
		highlights = append(highlights, ServiceHighlightResponse{Icon: h.Icon, Label: h.Label})
	}

	return ServiceDetailResponse{
		Slug:        item.Slug,
		Eyebrow:     item.Eyebrow,
		Title:       item.Title,
		Description: item.Description,
		Points:      item.Points,
		Highlights:  highlights,
	}
}

func NewServiceDetailListResponse(items []content.ServiceDetail) []ServiceDetailResponse {
	result := make([]ServiceDetailResponse, 0, len(items))
	for _, item := range items {
		result = append(result, NewServiceDetailResponse(item))
	}
	return result
}

// PricingCardResponse is one card in GET /api/v1/pricing. Price/duration/title
// come from the server-side pricing catalog, never from client input.
type PricingCardResponse struct {
	ProjectType    string   `json:"project_type"`
	Title          string   `json:"title"`
	PriceFromTenge *int64   `json:"price_from_tenge"`
	IsIndividual   bool     `json:"is_individual"`
	Duration       string   `json:"duration"`
	Description    string   `json:"description"`
	Features       []string `json:"features"`
	ServiceHref    string   `json:"service_href"`
}

func NewPricingCardResponse(item contentsvc.PricingCardView) PricingCardResponse {
	return PricingCardResponse{
		ProjectType:    item.ProjectType,
		Title:          item.Title,
		PriceFromTenge: item.PriceFromTenge,
		IsIndividual:   item.IsIndividual,
		Duration:       item.Duration,
		Description:    item.Description,
		Features:       item.Features,
		ServiceHref:    item.ServiceHref,
	}
}

func NewPricingCardListResponse(items []contentsvc.PricingCardView) []PricingCardResponse {
	result := make([]PricingCardResponse, 0, len(items))
	for _, item := range items {
		result = append(result, NewPricingCardResponse(item))
	}
	return result
}

// PortfolioCaseResponse is one case study in GET /api/v1/portfolio.
type PortfolioCaseResponse struct {
	Slug          string   `json:"slug"`
	Title         string   `json:"title"`
	Category      string   `json:"category"`
	Subcategory   string   `json:"subcategory,omitempty"`
	Summary       string   `json:"summary"`
	Task          string   `json:"task"`
	Process       []string `json:"process"`
	Solution      string   `json:"solution"`
	Technologies  []string `json:"technologies"`
	Result        string   `json:"result"`
	Duration      string   `json:"duration"`
	GradientFrom  string   `json:"gradient_from"`
	GradientTo    string   `json:"gradient_to"`
	ScreenshotURL string   `json:"screenshot_url,omitempty"`
	ExternalURL   string   `json:"external_url,omitempty"`
}

func NewPortfolioCaseResponse(item content.PortfolioCase) PortfolioCaseResponse {
	return PortfolioCaseResponse{
		Slug:          item.Slug,
		Title:         item.Title,
		Category:      item.Category,
		Subcategory:   item.Subcategory,
		Summary:       item.Summary,
		Task:          item.Task,
		Process:       item.Process,
		Solution:      item.Solution,
		Technologies:  item.Technologies,
		Result:        item.Result,
		Duration:      item.Duration,
		GradientFrom:  item.GradientFrom,
		GradientTo:    item.GradientTo,
		ScreenshotURL: item.ScreenshotURL,
		ExternalURL:   item.ExternalURL,
	}
}

func NewPortfolioCaseListResponse(items []content.PortfolioCase) []PortfolioCaseResponse {
	result := make([]PortfolioCaseResponse, 0, len(items))
	for _, item := range items {
		result = append(result, NewPortfolioCaseResponse(item))
	}
	return result
}

// TestimonialResponse is one client quote in GET /api/v1/testimonials.
type TestimonialResponse struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Role     string `json:"role"`
	Company  string `json:"company"`
	Quote    string `json:"quote"`
	Rating   int    `json:"rating"`
	Initials string `json:"initials"`
}

func NewTestimonialResponse(item content.Testimonial) TestimonialResponse {
	return TestimonialResponse{
		ID:       item.ID,
		Name:     item.Name,
		Role:     item.Role,
		Company:  item.Company,
		Quote:    item.Quote,
		Rating:   item.Rating,
		Initials: item.Initials,
	}
}

func NewTestimonialListResponse(items []content.Testimonial) []TestimonialResponse {
	result := make([]TestimonialResponse, 0, len(items))
	for _, item := range items {
		result = append(result, NewTestimonialResponse(item))
	}
	return result
}
