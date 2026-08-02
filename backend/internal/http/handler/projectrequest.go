package handler

import (
	"context"

	"github.com/gin-gonic/gin"

	"github.com/almukha/compnet-backend/internal/apperr"
	"github.com/almukha/compnet-backend/internal/domain/projectrequest"
	"github.com/almukha/compnet-backend/internal/http/apierr"
	"github.com/almukha/compnet-backend/internal/http/dto"
	"github.com/almukha/compnet-backend/internal/http/response"
)

// ProjectRequestService is what this handler needs from the service layer.
type ProjectRequestService interface {
	CreateProjectRequest(
		ctx context.Context,
		req dto.CreateProjectRequestRequest,
	) (projectrequest.ProjectRequest, projectrequest.Estimate, error)
}

// ProjectRequestHandler serves the project-request endpoints.
type ProjectRequestHandler struct {
	service ProjectRequestService
}

// NewProjectRequestHandler wires the handler with the service it delegates to.
func NewProjectRequestHandler(service ProjectRequestService) *ProjectRequestHandler {
	return &ProjectRequestHandler{service: service}
}

// Create handles POST /api/v1/project-requests: it binds the body, delegates
// validation and price calculation to the service, and persists nothing
// itself.
func (h *ProjectRequestHandler) Create(c *gin.Context) {
	var req dto.CreateProjectRequestRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		apierr.Write(c, apperr.BadRequest("invalid JSON body"))
		return
	}

	request, estimate, err := h.service.CreateProjectRequest(c.Request.Context(), req)
	if err != nil {
		apierr.Write(c, err)
		return
	}

	response.Created(c, dto.NewProjectRequestResponse(request, estimate))
}
