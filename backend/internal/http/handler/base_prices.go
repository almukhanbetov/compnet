package handler

import (
	"context"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/almukha/compnet-backend/internal/domain/baseprice"
	"github.com/almukha/compnet-backend/internal/http/apierr"
	"github.com/almukha/compnet-backend/internal/http/response"
	"github.com/almukha/compnet-backend/internal/pricing"
	basepricesvc "github.com/almukha/compnet-backend/internal/service/baseprices"
)

// BasePriceService is what the base price handler needs.
type BasePriceService interface {
	AdminList(ctx context.Context) ([]basepricesvc.AdminItem, error)
	PreviewPrice(ctx context.Context, projectType string, price int64) (basepricesvc.Preview, error)
	ChangePrice(ctx context.Context, staffID, projectType string, in basepricesvc.ChangeInput) (baseprice.Current, error)
	History(ctx context.Context, projectType string) ([]baseprice.HistoryEntry, error)
}

// BasePriceHandler serves the administrators' management of the project
// types' base prices (/manager/pricing, "Управление ценами"). The public
// side is GET /api/v1/pricing and /pricing/catalog (ContentHandler).
type BasePriceHandler struct {
	service BasePriceService
}

// NewBasePriceHandler wires the handler.
func NewBasePriceHandler(service BasePriceService) *BasePriceHandler {
	return &BasePriceHandler{service: service}
}

type basePriceResponse struct {
	ProjectType string     `json:"project_type"`
	Label       string     `json:"label"`
	Category    string     `json:"category"`
	PriceTenge  *int64     `json:"price_tenge"` // null: individual estimate only
	Version     int        `json:"version"`     // 0: no stored version
	ChangedAt   *time.Time `json:"changed_at"`
	Author      string     `json:"author"` // "" for the seeded versions
	Reason      string     `json:"reason"`
	Editable    bool       `json:"editable"`
}

func newBasePrice(it basepricesvc.AdminItem) basePriceResponse {
	r := basePriceResponse{
		ProjectType: it.Type.ID, Label: it.Type.Label, Category: string(it.Type.Category), PriceTenge: it.Current.PriceTenge,
		Version: it.Current.Version, Author: it.Current.AuthorName, Reason: it.Current.Reason, Editable: it.Editable,
	}
	if !it.Current.CreatedAt.IsZero() {
		at := it.Current.CreatedAt
		r.ChangedAt = &at
	}
	return r
}

// List handles GET /api/v1/manager/pricing/base-prices: every project type
// of the catalog with its base price in force.
func (h *BasePriceHandler) List(c *gin.Context) {
	if _, ok := requirePricingRole(c); !ok {
		return
	}
	items, err := h.service.AdminList(c.Request.Context())
	if err != nil {
		apierr.Write(c, err)
		return
	}
	out := make([]basePriceResponse, 0, len(items))
	for _, it := range items {
		out = append(out, newBasePrice(it))
	}
	c.Header("Cache-Control", "no-store")
	response.OK(c, out)
}

type estimateRange struct {
	Individual   bool   `json:"individual"`
	MinimumTenge *int64 `json:"minimum_tenge"`
	MaximumTenge *int64 `json:"maximum_tenge"`
}

func newRange(r pricing.Result) estimateRange {
	return estimateRange{Individual: r.IsIndividual, MinimumTenge: r.MinimumTenge, MaximumTenge: r.MaximumTenge}
}

type basePricePreviewResponse struct {
	ProjectType       string            `json:"project_type"`
	Label             string            `json:"label"`
	CurrentVersion    int               `json:"current_version"`
	NewVersion        int               `json:"new_version"`
	CurrentPriceTenge *int64            `json:"current_price_tenge"`
	NewPriceTenge     int64             `json:"new_price_tenge"`
	Rows              []previewRow      `json:"rows"`
	Problems          map[string]string `json:"problems"`
	Warnings          []string          `json:"warnings"`
	CanSave           bool              `json:"can_save"`
}

// previewRow: the standard estimate of a scale tier (basic design,
// standard complexity, normal urgency, no modules, one language).
type previewRow struct {
	TierID    string        `json:"tier_id"` // "" for types without scale tiers
	TierLabel string        `json:"tier_label"`
	Current   estimateRange `json:"current"`
	Proposed  estimateRange `json:"proposed"`
}

// Preview handles POST /api/v1/manager/pricing/base-prices/:type/preview:
// what a new base price would do (the calculator itself), nothing stored.
func (h *BasePriceHandler) Preview(c *gin.Context) {
	if _, ok := requirePricingRole(c); !ok {
		return
	}
	var body struct {
		PriceTenge int64 `json:"price_tenge"`
	}
	if !bindJSON(c, &body) {
		return
	}
	p, err := h.service.PreviewPrice(c.Request.Context(), c.Param("type"), body.PriceTenge)
	if err != nil {
		apierr.Write(c, err)
		return
	}
	r := basePricePreviewResponse{
		ProjectType: p.Item.Type.ID, Label: p.Item.Type.Label, CurrentVersion: p.Item.Current.Version,
		NewVersion: p.Item.Current.Version + 1, CurrentPriceTenge: p.Item.Current.PriceTenge, NewPriceTenge: p.NewPrice,
		Rows: make([]previewRow, 0, len(p.Rows)), Problems: p.Problems, Warnings: p.Warnings, CanSave: len(p.Problems) == 0,
	}
	for _, row := range p.Rows {
		r.Rows = append(r.Rows, previewRow{TierID: row.TierID, TierLabel: row.TierLabel, Current: newRange(row.Current), Proposed: newRange(row.Proposed)})
	}
	c.Header("Cache-Control", "no-store")
	response.OK(c, r)
}

// Change handles POST /api/v1/manager/pricing/base-prices/:type: a new base
// price version with a reason, refused with 409 when expected_version is no
// longer the current one.
func (h *BasePriceHandler) Change(c *gin.Context) {
	staffID, ok := requirePricingRole(c)
	if !ok {
		return
	}
	var body struct {
		PriceTenge      int64  `json:"price_tenge"`
		Reason          string `json:"reason"`
		ExpectedVersion int    `json:"expected_version"`
	}
	if !bindJSON(c, &body) {
		return
	}
	cur, err := h.service.ChangePrice(c.Request.Context(), staffID, c.Param("type"), basepricesvc.ChangeInput(body))
	if err != nil {
		apierr.Write(c, err)
		return
	}
	t, _ := pricing.FindProjectType(cur.ProjectType)
	response.OK(c, newBasePrice(basepricesvc.AdminItem{Type: t, Current: cur, Editable: true}))
}

// History handles GET /api/v1/manager/pricing/base-prices/:type/history.
func (h *BasePriceHandler) History(c *gin.Context) {
	if _, ok := requirePricingRole(c); !ok {
		return
	}
	items, err := h.service.History(c.Request.Context(), c.Param("type"))
	if err != nil {
		apierr.Write(c, err)
		return
	}
	out := make([]priceHistoryResponse, 0, len(items))
	for _, it := range items {
		out = append(out, priceHistoryResponse{
			Version: it.Version, PriceTenge: it.PriceTenge, PreviousPriceTenge: it.PreviousPriceTenge, PriceKind: "from",
			Reason: it.Reason, Author: it.AuthorName, CreatedAt: it.CreatedAt, IsCurrent: it.IsCurrent, Requests: it.Requests,
		})
	}
	c.Header("Cache-Control", "no-store")
	response.OK(c, out)
}
