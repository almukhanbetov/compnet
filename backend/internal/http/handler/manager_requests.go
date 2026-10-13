package handler

import (
	"context"

	"github.com/gin-gonic/gin"

	"github.com/almukha/compnet-backend/internal/apperr"
	"github.com/almukha/compnet-backend/internal/domain/projectrequest"
	"github.com/almukha/compnet-backend/internal/domain/staff"
	"github.com/almukha/compnet-backend/internal/http/apierr"
	"github.com/almukha/compnet-backend/internal/http/dto"
	"github.com/almukha/compnet-backend/internal/http/middleware"
	"github.com/almukha/compnet-backend/internal/http/response"
	"github.com/almukha/compnet-backend/internal/service/managerrequests"
)

// ManagerRequestsService is what this handler needs from the service layer.
type ManagerRequestsService interface {
	List(ctx context.Context, q managerrequests.ListQuery) (managerrequests.ListPage, error)
	NewCount(ctx context.Context) (int, error)
	Get(ctx context.Context, id string) (projectrequest.Detail, error)
	Update(ctx context.Context, actor staff.User, id string, req dto.UpdateProjectRequestRequest) (projectrequest.Detail, error)
}

// ManagerRequestsHandler serves the managers' project requests. Every
// route sits behind middleware.RequireStaff and additionally checks the
// role, since the responses carry the clients' contacts.
type ManagerRequestsHandler struct {
	service ManagerRequestsService
}

// NewManagerRequestsHandler wires the handler.
func NewManagerRequestsHandler(service ManagerRequestsService) *ManagerRequestsHandler {
	return &ManagerRequestsHandler{service: service}
}

// requestsStaff returns the signed-in staff member if their role may work
// with requests, otherwise answers 401/403.
func requestsStaff(c *gin.Context) (staff.User, bool) {
	user, ok := middleware.StaffFromContext(c)
	if !ok {
		apierr.Write(c, apperr.Unauthorized("требуется вход"))
		return staff.User{}, false
	}
	if !user.Role.CanManageRequests() {
		apierr.Write(c, apperr.Forbidden("нет доступа к заявкам"))
		return staff.User{}, false
	}
	return user, true
}

// List handles GET /api/v1/manager/project-requests?q=&status=&from=&to=&page=&limit=.
func (h *ManagerRequestsHandler) List(c *gin.Context) {
	if _, ok := requestsStaff(c); !ok {
		return
	}
	page, err := h.service.List(c.Request.Context(), managerrequests.ListQuery{
		Query:  c.Query("q"),
		Status: c.Query("status"),
		From:   c.Query("from"),
		To:     c.Query("to"),
		Page:   c.Query("page"),
		Limit:  c.Query("limit"),
	})
	if err != nil {
		apierr.Write(c, err)
		return
	}
	response.OKWithMeta(c, dto.NewManagerRequestListResponse(page.Items), gin.H{
		"total":     page.Total,
		"page":      page.Page,
		"limit":     page.Limit,
		"new_count": page.NewCount,
	})
}

// Summary handles GET /api/v1/manager/project-requests/summary: the badge.
func (h *ManagerRequestsHandler) Summary(c *gin.Context) {
	if _, ok := requestsStaff(c); !ok {
		return
	}
	n, err := h.service.NewCount(c.Request.Context())
	if err != nil {
		apierr.Write(c, err)
		return
	}
	response.OK(c, gin.H{"new_count": n})
}

// Get handles GET /api/v1/manager/project-requests/:id.
func (h *ManagerRequestsHandler) Get(c *gin.Context) {
	if _, ok := requestsStaff(c); !ok {
		return
	}
	detail, err := h.service.Get(c.Request.Context(), c.Param("id"))
	if err != nil {
		apierr.Write(c, err)
		return
	}
	response.OK(c, dto.NewManagerRequestDetailResponse(detail))
}

// Update handles PATCH /api/v1/manager/project-requests/:id with
// {"status": "...", "note": "..."} (either or both).
func (h *ManagerRequestsHandler) Update(c *gin.Context) {
	user, ok := requestsStaff(c)
	if !ok {
		return
	}
	var req dto.UpdateProjectRequestRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		apierr.Write(c, apperr.BadRequest("invalid JSON body"))
		return
	}
	detail, err := h.service.Update(c.Request.Context(), user, c.Param("id"), req)
	if err != nil {
		apierr.Write(c, err)
		return
	}
	response.OK(c, dto.NewManagerRequestDetailResponse(detail))
}
