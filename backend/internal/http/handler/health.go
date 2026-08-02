// Package handler contains thin HTTP handlers. Handlers parse requests,
// call services or repositories, and format responses — no business logic
// or SQL lives here.
package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/almukha/compnet-backend/internal/database"
	"github.com/almukha/compnet-backend/internal/http/response"
)

// HealthHandler serves the liveness and readiness endpoints.
type HealthHandler struct {
	pool *pgxpool.Pool
}

// NewHealthHandler wires the handler with the database pool it needs to
// check readiness.
func NewHealthHandler(pool *pgxpool.Pool) *HealthHandler {
	return &HealthHandler{pool: pool}
}

// Health reports liveness only: if the process can respond at all, it
// returns 200. It never touches the database.
func (h *HealthHandler) Health(c *gin.Context) {
	response.OK(c, gin.H{"status": "ok"})
}

// Ready reports readiness: it pings PostgreSQL with a short, bounded
// timeout and returns 503 if the database is not reachable.
func (h *HealthHandler) Ready(c *gin.Context) {
	if err := database.Ping(c.Request.Context(), h.pool); err != nil {
		response.Error(c, http.StatusServiceUnavailable, "service_unavailable", "database not reachable")
		return
	}

	response.OK(c, gin.H{"status": "ready"})
}
