package handler

import (
	"context"
	"encoding/json"
	"io"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/almukha/compnet-backend/internal/apperr"
	"github.com/almukha/compnet-backend/internal/domain/tariff"
	"github.com/almukha/compnet-backend/internal/http/apierr"
	"github.com/almukha/compnet-backend/internal/http/middleware"
	"github.com/almukha/compnet-backend/internal/http/response"
	"github.com/almukha/compnet-backend/internal/pricing"
	tariffsvc "github.com/almukha/compnet-backend/internal/service/tariffs"
)

// TariffService is what the tariff handler needs.
type TariffService interface {
	PublicTariffs(ctx context.Context) ([]tariffsvc.PublicTariff, error)
	PublicQuote(ctx context.Context, sel tariff.Selection) (tariff.Quote, error)
	AdminList(ctx context.Context) (tariffsvc.AdminView, error)
	UpdateTariff(ctx context.Context, staffID, slug string, p tariff.TariffPatch) (tariff.Tariff, error)
	CreateVersion(ctx context.Context, staffID, slug string, in tariffsvc.VersionInput) (tariff.Tariff, error)
	ChangePrice(ctx context.Context, staffID, slug string, in tariffsvc.PriceChangeInput) (tariff.Tariff, error)
	PreviewPrice(ctx context.Context, slug string, in tariffsvc.PreviewInput) (tariffsvc.PricePreview, error)
	PriceHistory(ctx context.Context, slug string) ([]tariff.HistoryEntry, error)
	SetCost(ctx context.Context, staffID, slug string, cost int64) (tariff.Tariff, error)
	UpdatePromotion(ctx context.Context, staffID, slug string, p tariff.PromotionPatch) (tariff.Promotion, error)
}

// TariffHandler serves the public tariffs (no costs; a promotion only while
// it is live) and the administrators' management of tariffs and promotions.
type TariffHandler struct {
	service TariffService
}

// NewTariffHandler wires the handler.
func NewTariffHandler(service TariffService) *TariffHandler {
	return &TariffHandler{service: service}
}

type tariffModuleResponse struct {
	ID         string `json:"id"`
	Label      string `json:"label"`
	PriceTenge int64  `json:"price_tenge"` // Go catalog price
	PerUnit    bool   `json:"per_unit"`
}

type publicPromotionResponse struct {
	Slug          string    `json:"slug"`
	Title         string    `json:"title"`
	DiscountTenge int64     `json:"discount_tenge"`
	PriceTenge    int64     `json:"price_tenge"` // the tariff's price with the discount
	EndsAt        time.Time `json:"ends_at"`
	Remaining     int       `json:"remaining"`
}

type publicTariffResponse struct {
	Slug          string                   `json:"slug"`
	Title         string                   `json:"title"`
	Description   string                   `json:"description"`
	Version       int                      `json:"version"`
	PriceTenge    int64                    `json:"price_tenge"`
	PriceKind     string                   `json:"price_kind"`
	ProjectType   string                   `json:"project_type"`
	Features      []string                 `json:"features"`
	DurationLabel string                   `json:"duration_label"`
	Modules       []tariffModuleResponse   `json:"modules"`
	Promotion     *publicPromotionResponse `json:"promotion"`
}

func tariffModules(ids []string) []tariffModuleResponse {
	out := make([]tariffModuleResponse, 0, len(ids))
	for _, id := range ids {
		if m, ok := pricing.FindModule(id); ok {
			out = append(out, tariffModuleResponse{m.ID, m.Label, m.PriceTenge, m.PerUnit})
		}
	}
	return out
}

// List handles GET /api/v1/tariffs: the active tariffs, in display order.
func (h *TariffHandler) List(c *gin.Context) {
	items, err := h.service.PublicTariffs(c.Request.Context())
	if err != nil {
		apierr.Write(c, err)
		return
	}
	out := make([]publicTariffResponse, 0, len(items))
	for _, it := range items {
		t, v := it.Tariff, it.Tariff.Current
		r := publicTariffResponse{
			Slug: t.Slug, Title: t.Title, Description: t.Description, Version: v.Number, PriceTenge: v.PriceTenge,
			PriceKind: string(v.PriceKind), ProjectType: v.ProjectType, Features: v.Features,
			DurationLabel: v.DurationLabel, Modules: tariffModules(v.AllowedModuleIDs),
		}
		if p := it.Promotion; p != nil {
			r.Promotion = &publicPromotionResponse{p.Slug, p.Title, p.DiscountTenge, v.PriceTenge - p.DiscountTenge, *p.EndsAt, p.Remaining()}
		}
		out = append(out, r)
	}
	// Places and periods change: cached only briefly.
	c.Header("Cache-Control", "public, max-age=30")
	response.OK(c, out)
}

type quoteModuleResponse struct {
	ID             string `json:"id"`
	Quantity       int    `json:"quantity"`
	UnitPriceTenge int64  `json:"unit_price_tenge"`
	TotalTenge     int64  `json:"total_tenge"`
}

type quoteResponse struct {
	Slug              string                `json:"slug"`
	Version           int                   `json:"version"`
	PriceKind         string                `json:"price_kind"`
	BasePriceTenge    int64                 `json:"base_price_tenge"`
	Modules           []quoteModuleResponse `json:"modules"`
	ModulesTotalTenge int64                 `json:"modules_total_tenge"`
	PromotionSlug     string                `json:"promotion_slug,omitempty"`
	DiscountTenge     int64                 `json:"discount_tenge"`
	FinalPriceTenge   int64                 `json:"final_price_tenge"`
	DurationLabel     string                `json:"duration_label"`
}

func newQuoteResponse(q tariff.Quote) quoteResponse {
	r := quoteResponse{
		Slug: q.Slug, Version: q.Version, PriceKind: string(q.PriceKind), BasePriceTenge: q.BasePriceTenge,
		Modules: make([]quoteModuleResponse, 0, len(q.Modules)), ModulesTotalTenge: q.ModulesTotalTenge,
		DiscountTenge: q.DiscountTenge, FinalPriceTenge: q.FinalTenge, DurationLabel: q.DurationLabel,
	}
	for _, m := range q.Modules {
		r.Modules = append(r.Modules, quoteModuleResponse{m.ModuleID, m.Quantity, m.UnitPriceTenge, m.TotalTenge})
	}
	if q.Promotion != nil {
		r.PromotionSlug = q.Promotion.Slug
	}
	return r
}

// Quote handles GET /api/v1/tariffs/:slug/quote?modules=a,b&external_api_count=n:
// the server's price of a tariff with extra modules (the request is priced
// again when it is saved).
func (h *TariffHandler) Quote(c *gin.Context) {
	var modules []string
	for _, id := range strings.Split(c.Query("modules"), ",") {
		if id = strings.TrimSpace(id); id != "" {
			modules = append(modules, id)
		}
	}
	count, _ := strconv.Atoi(c.DefaultQuery("external_api_count", "0"))
	if len(modules) > 20 || count < 0 || count > 50 {
		apierr.Write(c, apperr.Validation("проверьте модули", map[string]string{"modules": "не больше 20 модулей, интеграций от 0 до 50"}))
		return
	}
	q, err := h.service.PublicQuote(c.Request.Context(), tariff.Selection{Slug: c.Param("slug"), ModuleIDs: modules, ExternalApiCount: count})
	if err != nil {
		apierr.Write(c, err)
		return
	}
	c.Header("Cache-Control", "no-store")
	response.OK(c, newQuoteResponse(q))
}

// requirePricingRole answers 403 for staff who may not manage prices.
func requirePricingRole(c *gin.Context) (string, bool) {
	user, ok := middleware.StaffFromContext(c)
	if !ok {
		apierr.Write(c, apperr.Unauthorized("требуется вход"))
		return "", false
	}
	if !user.Role.CanManagePricing() {
		apierr.Write(c, apperr.Forbidden("тарифы и акции может менять только администратор"))
		return "", false
	}
	return user.ID, true
}

type adminTariffResponse struct {
	publicTariffResponse
	IsActive         bool      `json:"is_active"`
	SortOrder        int       `json:"sort_order"`
	AllowedModuleIDs []string  `json:"allowed_module_ids"`
	VersionCreatedAt time.Time `json:"version_created_at"`
	ChangeReason     string    `json:"change_reason"`
	CostTenge        *int64    `json:"cost_tenge"` // internal; administrators only
}

type adminPromotionResponse struct {
	Slug          string     `json:"slug"`
	Title         string     `json:"title"`
	TariffSlug    string     `json:"tariff_slug"`
	DiscountTenge int64      `json:"discount_tenge"`
	StartsAt      *time.Time `json:"starts_at"`
	EndsAt        *time.Time `json:"ends_at"`
	MaxOrders     int        `json:"max_orders"`
	IsActive      bool       `json:"is_active"`
	Version       int        `json:"version"`
	Taken         int        `json:"taken"`     // reserved + confirmed
	Confirmed     int        `json:"confirmed"` // taken into work
	Remaining     int        `json:"remaining"`
}

func newAdminTariff(t tariff.Tariff) adminTariffResponse {
	v := t.Current
	return adminTariffResponse{
		publicTariffResponse: publicTariffResponse{
			Slug: t.Slug, Title: t.Title, Description: t.Description, Version: v.Number, PriceTenge: v.PriceTenge,
			PriceKind: string(v.PriceKind), ProjectType: v.ProjectType, Features: v.Features,
			DurationLabel: v.DurationLabel, Modules: tariffModules(v.AllowedModuleIDs),
		},
		IsActive: t.IsActive, SortOrder: t.SortOrder, AllowedModuleIDs: v.AllowedModuleIDs,
		VersionCreatedAt: v.CreatedAt, ChangeReason: v.ChangeReason, CostTenge: v.CostTenge,
	}
}

func newAdminPromotion(p tariff.Promotion, slugs map[string]string) adminPromotionResponse {
	return adminPromotionResponse{
		Slug: p.Slug, Title: p.Title, TariffSlug: slugs[p.TariffID], DiscountTenge: p.DiscountTenge,
		StartsAt: p.StartsAt, EndsAt: p.EndsAt, MaxOrders: p.MaxOrders, IsActive: p.IsActive,
		Version: p.Version, Taken: p.Taken, Confirmed: p.Confirmed, Remaining: p.Remaining(),
	}
}

// AdminList handles GET /api/v1/manager/pricing.
func (h *TariffHandler) AdminList(c *gin.Context) {
	if _, ok := requirePricingRole(c); !ok {
		return
	}
	view, err := h.service.AdminList(c.Request.Context())
	if err != nil {
		apierr.Write(c, err)
		return
	}
	slugs := map[string]string{}
	tariffs := make([]adminTariffResponse, 0, len(view.Tariffs))
	for _, t := range view.Tariffs {
		slugs[t.ID] = t.Slug
		tariffs = append(tariffs, newAdminTariff(t))
	}
	promotions := make([]adminPromotionResponse, 0, len(view.Promotions))
	for _, p := range view.Promotions {
		promotions = append(promotions, newAdminPromotion(p, slugs))
	}
	modules := make([]tariffModuleResponse, 0, len(pricing.Modules))
	for _, m := range pricing.Modules {
		modules = append(modules, tariffModuleResponse{m.ID, m.Label, m.PriceTenge, m.PerUnit})
	}
	response.OK(c, gin.H{"tariffs": tariffs, "promotions": promotions, "modules": modules,
		"reservation_hours": int(tariffsvc.ReservationTTL.Hours())})
}

// bindJSON decodes a body strictly (unknown fields refused).
func bindJSON(c *gin.Context, dst any) bool {
	raw, err := io.ReadAll(c.Request.Body)
	if err != nil {
		apierr.Write(c, apperr.BadRequest("invalid JSON body"))
		return false
	}
	dec := json.NewDecoder(strings.NewReader(string(raw)))
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		apierr.Write(c, apperr.BadRequest("invalid JSON body"))
		return false
	}
	return true
}

// UpdateTariff handles PATCH /api/v1/manager/pricing/tariffs/:slug.
func (h *TariffHandler) UpdateTariff(c *gin.Context) {
	staffID, ok := requirePricingRole(c)
	if !ok {
		return
	}
	var body struct {
		Title       *string `json:"title"`
		Description *string `json:"description"`
		SortOrder   *int    `json:"sort_order"`
		IsActive    *bool   `json:"is_active"`
	}
	if !bindJSON(c, &body) {
		return
	}
	t, err := h.service.UpdateTariff(c.Request.Context(), staffID, c.Param("slug"), tariff.TariffPatch(body))
	if err != nil {
		apierr.Write(c, err)
		return
	}
	response.OK(c, newAdminTariff(t))
}

// CreateVersion handles POST /api/v1/manager/pricing/tariffs/:slug/versions.
func (h *TariffHandler) CreateVersion(c *gin.Context) {
	staffID, ok := requirePricingRole(c)
	if !ok {
		return
	}
	var body struct {
		PriceTenge       int64    `json:"price_tenge"`
		PriceKind        string   `json:"price_kind"`
		ProjectType      string   `json:"project_type"`
		Features         []string `json:"features"`
		AllowedModuleIDs []string `json:"allowed_module_ids"`
		DurationLabel    string   `json:"duration_label"`
		CostTenge        *int64   `json:"cost_tenge"`
		Reason           string   `json:"reason"`
		ExpectedVersion  int      `json:"expected_version"`
	}
	if !bindJSON(c, &body) {
		return
	}
	t, err := h.service.CreateVersion(c.Request.Context(), staffID, c.Param("slug"), tariffsvc.VersionInput(body))
	if err != nil {
		apierr.Write(c, err)
		return
	}
	response.OK(c, newAdminTariff(t))
}

// SetCost handles PUT /api/v1/manager/pricing/tariffs/:slug/cost.
func (h *TariffHandler) SetCost(c *gin.Context) {
	staffID, ok := requirePricingRole(c)
	if !ok {
		return
	}
	var body struct {
		CostTenge *int64 `json:"cost_tenge"`
	}
	if !bindJSON(c, &body) {
		return
	}
	if body.CostTenge == nil {
		apierr.Write(c, apperr.Validation("проверьте себестоимость", map[string]string{"cost_tenge": "обязательное поле"}))
		return
	}
	t, err := h.service.SetCost(c.Request.Context(), staffID, c.Param("slug"), *body.CostTenge)
	if err != nil {
		apierr.Write(c, err)
		return
	}
	response.OK(c, newAdminTariff(t))
}

// UpdatePromotion handles PATCH /api/v1/manager/pricing/promotions/:slug.
func (h *TariffHandler) UpdatePromotion(c *gin.Context) {
	staffID, ok := requirePricingRole(c)
	if !ok {
		return
	}
	var body struct {
		Title         *string    `json:"title"`
		DiscountTenge *int64     `json:"discount_tenge"`
		StartsAt      *time.Time `json:"starts_at"`
		EndsAt        *time.Time `json:"ends_at"`
		ClearDates    bool       `json:"clear_dates"`
		MaxOrders     *int       `json:"max_orders"`
		IsActive      *bool      `json:"is_active"`
	}
	if !bindJSON(c, &body) {
		return
	}
	p, err := h.service.UpdatePromotion(c.Request.Context(), staffID, c.Param("slug"), tariff.PromotionPatch(body))
	if err != nil {
		apierr.Write(c, err)
		return
	}
	view, err := h.service.AdminList(c.Request.Context())
	if err != nil {
		apierr.Write(c, err)
		return
	}
	slugs := map[string]string{}
	for _, t := range view.Tariffs {
		slugs[t.ID] = t.Slug
	}
	response.OK(c, newAdminPromotion(p, slugs))
}

// ChangePrice handles POST /api/v1/manager/pricing/tariffs/:slug/price: a new
// price version (everything else kept), with a reason, refused with 409 when
// expected_version is no longer the current one.
func (h *TariffHandler) ChangePrice(c *gin.Context) {
	staffID, ok := requirePricingRole(c)
	if !ok {
		return
	}
	var body struct {
		PriceTenge      int64  `json:"price_tenge"`
		CostTenge       *int64 `json:"cost_tenge"`
		Reason          string `json:"reason"`
		ExpectedVersion int    `json:"expected_version"`
	}
	if !bindJSON(c, &body) {
		return
	}
	t, err := h.service.ChangePrice(c.Request.Context(), staffID, c.Param("slug"), tariffsvc.PriceChangeInput(body))
	if err != nil {
		apierr.Write(c, err)
		return
	}
	response.OK(c, newAdminTariff(t))
}

type previewPromotionResponse struct {
	Slug            string     `json:"slug"`
	Title           string     `json:"title"`
	IsActive        bool       `json:"is_active"`
	Live            bool       `json:"live"`
	DiscountTenge   int64      `json:"discount_tenge"`
	FinalPriceTenge *int64     `json:"final_price_tenge"` // the selection with the discount; null when it would not apply
	EndsAt          *time.Time `json:"ends_at"`
	Remaining       int        `json:"remaining"`
}

type pricePreviewResponse struct {
	Slug              string                    `json:"slug"`
	CurrentVersion    int                       `json:"current_version"`
	NewVersion        int                       `json:"new_version"`
	CurrentPriceTenge int64                     `json:"current_price_tenge"`
	NewPriceTenge     int64                     `json:"new_price_tenge"`
	PriceKind         string                    `json:"price_kind"`
	CostTenge         *int64                    `json:"cost_tenge"` // of the new version (kept or entered)
	MarginTenge       *int64                    `json:"margin_tenge"`
	PromoMarginTenge  *int64                    `json:"promo_margin_tenge"`
	Current           quoteResponse             `json:"current"`
	Proposed          quoteResponse             `json:"proposed"`
	Promotion         *previewPromotionResponse `json:"promotion"`
	Problems          map[string]string         `json:"problems"`
	Warnings          []string                  `json:"warnings"`
	CanSave           bool                      `json:"can_save"`
}

// PreviewPrice handles POST /api/v1/manager/pricing/tariffs/:slug/price/preview:
// what a new price would do (the same rules as saving it), nothing stored.
func (h *TariffHandler) PreviewPrice(c *gin.Context) {
	if _, ok := requirePricingRole(c); !ok {
		return
	}
	var body struct {
		PriceTenge       int64    `json:"price_tenge"`
		CostTenge        *int64   `json:"cost_tenge"`
		ModuleIDs        []string `json:"module_ids"`
		ExternalApiCount int      `json:"external_api_count"`
	}
	if !bindJSON(c, &body) {
		return
	}
	if len(body.ModuleIDs) > 20 || body.ExternalApiCount < 0 || body.ExternalApiCount > 50 {
		apierr.Write(c, apperr.Validation("проверьте модули", map[string]string{"modules": "не больше 20 модулей, интеграций от 0 до 50"}))
		return
	}
	p, err := h.service.PreviewPrice(c.Request.Context(), c.Param("slug"), tariffsvc.PreviewInput(body))
	if err != nil {
		apierr.Write(c, err)
		return
	}
	cost := p.Proposed.Current.CostTenge
	r := pricePreviewResponse{
		Slug: p.Current.Slug, CurrentVersion: p.Current.Current.Number, NewVersion: p.Proposed.Current.Number,
		CurrentPriceTenge: p.Current.Current.PriceTenge, NewPriceTenge: p.Proposed.Current.PriceTenge,
		PriceKind: string(p.Current.Current.PriceKind), CostTenge: cost,
		Current: newQuoteResponse(p.CurrentQuote), Proposed: newQuoteResponse(p.NewQuote),
		Problems: p.Problems, Warnings: p.Warnings, CanSave: len(p.Problems) == 0,
	}
	r.Proposed.Version = p.Proposed.Current.Number
	if cost != nil {
		margin := p.Proposed.Current.PriceTenge - *cost
		r.MarginTenge = &margin
	}
	if pr := p.Promotion; pr != nil {
		r.Promotion = &previewPromotionResponse{
			Slug: pr.Slug, Title: pr.Title, IsActive: pr.IsActive, Live: p.PromotionLive, DiscountTenge: pr.DiscountTenge,
			FinalPriceTenge: p.PromotionFinal, EndsAt: pr.EndsAt, Remaining: pr.Remaining(),
		}
		if cost != nil && pr.DiscountTenge < p.Proposed.Current.PriceTenge {
			margin := p.Proposed.Current.PriceTenge - pr.DiscountTenge - *cost
			r.PromoMarginTenge = &margin
		}
	}
	c.Header("Cache-Control", "no-store")
	response.OK(c, r)
}

type priceHistoryResponse struct {
	Version            int       `json:"version"`
	PriceTenge         int64     `json:"price_tenge"`
	PreviousPriceTenge *int64    `json:"previous_price_tenge"`
	PriceKind          string    `json:"price_kind"`
	Reason             string    `json:"reason"`
	Author             string    `json:"author"` // "" for the seeded versions
	CreatedAt          time.Time `json:"created_at"`
	IsCurrent          bool      `json:"is_current"`
	Requests           int       `json:"requests"`
}

// PriceHistory handles GET /api/v1/manager/pricing/tariffs/:slug/history.
func (h *TariffHandler) PriceHistory(c *gin.Context) {
	if _, ok := requirePricingRole(c); !ok {
		return
	}
	items, err := h.service.PriceHistory(c.Request.Context(), c.Param("slug"))
	if err != nil {
		apierr.Write(c, err)
		return
	}
	out := make([]priceHistoryResponse, 0, len(items))
	for _, it := range items {
		out = append(out, priceHistoryResponse{
			Version: it.Version, PriceTenge: it.PriceTenge, PreviousPriceTenge: it.PreviousPriceTenge,
			PriceKind: string(it.PriceKind), Reason: it.Reason, Author: it.AuthorName, CreatedAt: it.CreatedAt,
			IsCurrent: it.IsCurrent, Requests: it.Requests,
		})
	}
	c.Header("Cache-Control", "no-store")
	response.OK(c, out)
}
