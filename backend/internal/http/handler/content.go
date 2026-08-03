package handler

import (
	"context"

	"github.com/gin-gonic/gin"

	"github.com/almukha/compnet-backend/internal/domain/content"
	"github.com/almukha/compnet-backend/internal/http/apierr"
	"github.com/almukha/compnet-backend/internal/http/dto"
	"github.com/almukha/compnet-backend/internal/http/response"
	contentsvc "github.com/almukha/compnet-backend/internal/service/content"
)

// ContentService is what this handler needs from the service layer.
type ContentService interface {
	ListServicesOverview(ctx context.Context) ([]content.ServiceOverview, error)
	ListServiceDetails(ctx context.Context) ([]content.ServiceDetail, error)
	GetServiceDetail(ctx context.Context, slug string) (content.ServiceDetail, error)
	ListPricing(ctx context.Context) ([]contentsvc.PricingCardView, error)
	ListPortfolioCases(ctx context.Context) ([]content.PortfolioCase, error)
	GetPortfolioCase(ctx context.Context, slug string) (content.PortfolioCase, error)
	ListTestimonials(ctx context.Context) ([]content.Testimonial, error)
}

// ContentHandler serves the public services/pricing/portfolio/testimonials
// endpoints. All read-only — there is no admin write path yet.
type ContentHandler struct {
	service ContentService
}

// NewContentHandler wires the handler with the service it delegates to.
func NewContentHandler(service ContentService) *ContentHandler {
	return &ContentHandler{service: service}
}

func (h *ContentHandler) ListServices(c *gin.Context) {
	items, err := h.service.ListServicesOverview(c.Request.Context())
	if err != nil {
		apierr.Write(c, err)
		return
	}
	response.OK(c, dto.NewServiceOverviewListResponse(items))
}

func (h *ContentHandler) GetService(c *gin.Context) {
	detail, err := h.service.GetServiceDetail(c.Request.Context(), c.Param("slug"))
	if err != nil {
		apierr.Write(c, err)
		return
	}
	response.OK(c, dto.NewServiceDetailResponse(detail))
}

func (h *ContentHandler) ListPricing(c *gin.Context) {
	items, err := h.service.ListPricing(c.Request.Context())
	if err != nil {
		apierr.Write(c, err)
		return
	}
	response.OK(c, dto.NewPricingCardListResponse(items))
}

func (h *ContentHandler) ListPortfolio(c *gin.Context) {
	items, err := h.service.ListPortfolioCases(c.Request.Context())
	if err != nil {
		apierr.Write(c, err)
		return
	}
	response.OK(c, dto.NewPortfolioCaseListResponse(items))
}

func (h *ContentHandler) GetPortfolioCase(c *gin.Context) {
	item, err := h.service.GetPortfolioCase(c.Request.Context(), c.Param("slug"))
	if err != nil {
		apierr.Write(c, err)
		return
	}
	response.OK(c, dto.NewPortfolioCaseResponse(item))
}

func (h *ContentHandler) ListTestimonials(c *gin.Context) {
	items, err := h.service.ListTestimonials(c.Request.Context())
	if err != nil {
		apierr.Write(c, err)
		return
	}
	response.OK(c, dto.NewTestimonialListResponse(items))
}
