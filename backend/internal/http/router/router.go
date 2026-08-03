// Package router assembles the gin.Engine and registers routes. It contains
// no business logic — only wiring of handlers to paths.
package router

import (
	"github.com/gin-gonic/gin"

	"github.com/almukha/compnet-backend/internal/http/handler"
	"github.com/almukha/compnet-backend/internal/http/middleware"
)

// Deps holds everything the router needs to register routes.
type Deps struct {
	Health         *handler.HealthHandler
	ProjectRequest *handler.ProjectRequestHandler
	Content        *handler.ContentHandler
	// CORSAllowedOrigins will be used once CORS middleware is introduced.
	CORSAllowedOrigins []string
}

// New builds the gin.Engine with all routes registered.
//
// Health endpoints live outside /api/v1: they are infrastructure signals
// (used by orchestrators/load balancers), not versioned product API.
func New(deps Deps) *gin.Engine {
	engine := gin.New()
	engine.Use(gin.Recovery())
	engine.Use(middleware.CORS(deps.CORSAllowedOrigins))

	engine.GET("/health", deps.Health.Health)
	engine.GET("/ready", deps.Health.Ready)

	v1 := engine.Group("/api/v1")
	v1.POST("/project-requests", deps.ProjectRequest.Create)

	v1.GET("/services", deps.Content.ListServices)
	v1.GET("/services/:slug", deps.Content.GetService)
	v1.GET("/pricing", deps.Content.ListPricing)
	v1.GET("/portfolio", deps.Content.ListPortfolio)
	v1.GET("/portfolio/:slug", deps.Content.GetPortfolioCase)
	v1.GET("/testimonials", deps.Content.ListTestimonials)

	return engine
}
