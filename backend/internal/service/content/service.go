// Package content orchestrates read access to public marketing content. It
// exists mainly to join pricing_cards (PostgreSQL) with the price/duration
// catalog that already lives in internal/pricing, so the calculator and the
// pricing page can never show two different numbers for the same project
// type.
package content

import (
	"context"
	"errors"

	"github.com/almukha/compnet-backend/internal/apperr"
	"github.com/almukha/compnet-backend/internal/domain/content"
	"github.com/almukha/compnet-backend/internal/pricing"
)

// Repository is what this service needs from persistence.
type Repository interface {
	ListServicesOverview(ctx context.Context) ([]content.ServiceOverview, error)
	ListServiceDetails(ctx context.Context) ([]content.ServiceDetail, error)
	GetServiceDetailBySlug(ctx context.Context, slug string) (content.ServiceDetail, error)
	ListPricingCards(ctx context.Context) ([]content.PricingCard, error)
	ListPortfolioCases(ctx context.Context) ([]content.PortfolioCase, error)
	GetPortfolioCaseBySlug(ctx context.Context, slug string) (content.PortfolioCase, error)
	ListTestimonials(ctx context.Context) ([]content.Testimonial, error)
}

// PricingCardView is a pricing card enriched with the price/duration/label
// looked up from the internal/pricing catalog at request time.
type PricingCardView struct {
	ProjectType    string
	Title          string
	PriceFromTenge *int64
	IsIndividual   bool
	Duration       string
	Description    string
	Features       []string
	ServiceHref    string
}

// Service implements the content read use cases.
type Service struct {
	repo Repository
}

// NewService builds a Service backed by the given Repository.
func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) ListServicesOverview(ctx context.Context) ([]content.ServiceOverview, error) {
	items, err := s.repo.ListServicesOverview(ctx)
	if err != nil {
		return nil, apperr.Internal(err)
	}
	return items, nil
}

func (s *Service) ListServiceDetails(ctx context.Context) ([]content.ServiceDetail, error) {
	items, err := s.repo.ListServiceDetails(ctx)
	if err != nil {
		return nil, apperr.Internal(err)
	}
	return items, nil
}

func (s *Service) GetServiceDetail(ctx context.Context, slug string) (content.ServiceDetail, error) {
	detail, err := s.repo.GetServiceDetailBySlug(ctx, slug)
	if err != nil {
		if errors.Is(err, content.ErrNotFound) {
			return content.ServiceDetail{}, apperr.NotFound("service not found")
		}
		return content.ServiceDetail{}, apperr.Internal(err)
	}
	return detail, nil
}

func (s *Service) ListPricing(ctx context.Context) ([]PricingCardView, error) {
	cards, err := s.repo.ListPricingCards(ctx)
	if err != nil {
		return nil, apperr.Internal(err)
	}

	views := make([]PricingCardView, 0, len(cards))
	for _, card := range cards {
		projectType, ok := pricing.FindProjectType(card.ProjectType)
		if !ok {
			// The seeded content and the Go pricing catalog have drifted —
			// this is an internal inconsistency, not a client error.
			return nil, apperr.Internal(errors.New("pricing card references unknown project_type: " + card.ProjectType))
		}

		views = append(views, PricingCardView{
			ProjectType:    card.ProjectType,
			Title:          projectType.Label,
			PriceFromTenge: projectType.BasePriceTenge,
			IsIndividual:   projectType.BasePriceTenge == nil,
			Duration:       projectType.DefaultDuration,
			Description:    card.Description,
			Features:       card.Features,
			ServiceHref:    card.ServiceHref,
		})
	}
	return views, nil
}

func (s *Service) ListPortfolioCases(ctx context.Context) ([]content.PortfolioCase, error) {
	items, err := s.repo.ListPortfolioCases(ctx)
	if err != nil {
		return nil, apperr.Internal(err)
	}
	return items, nil
}

func (s *Service) GetPortfolioCase(ctx context.Context, slug string) (content.PortfolioCase, error) {
	item, err := s.repo.GetPortfolioCaseBySlug(ctx, slug)
	if err != nil {
		if errors.Is(err, content.ErrNotFound) {
			return content.PortfolioCase{}, apperr.NotFound("portfolio case not found")
		}
		return content.PortfolioCase{}, apperr.Internal(err)
	}
	return item, nil
}

func (s *Service) ListTestimonials(ctx context.Context) ([]content.Testimonial, error) {
	items, err := s.repo.ListTestimonials(ctx)
	if err != nil {
		return nil, apperr.Internal(err)
	}
	return items, nil
}
