// Package router assembles the gin.Engine and registers routes. It contains
// no business logic — only wiring of handlers to paths.
package router

import (
	"github.com/gin-gonic/gin"

	"github.com/almukha/compnet-backend/internal/http/handler"
	"github.com/almukha/compnet-backend/internal/http/middleware"
)

// chatMaxBodyBytes caps chat request bodies: a 2000-character message is
// at most ~8 KiB of UTF-8 plus JSON overhead.
const chatMaxBodyBytes = 16 << 10

// Deps holds everything the router needs to register routes.
type Deps struct {
	Health         *handler.HealthHandler
	ProjectRequest *handler.ProjectRequestHandler
	Content        *handler.ContentHandler
	Chat           *handler.ChatHandler
	// ChatIPLimiter bounds all chat requests (including polling) per IP.
	ChatIPLimiter middleware.Limiter
	ManagerAuth   *handler.ManagerAuthHandler
	ManagerChat   *handler.ManagerChatHandler
	// StaffAuth authenticates every manager request from its session cookie.
	StaffAuth middleware.Authenticator
	// ManagerIPLimiter bounds all manager API requests per IP (login has
	// its own, stricter limits in the auth service).
	ManagerIPLimiter middleware.Limiter
	// CORSAllowedOrigins is the explicit allow-list for CORS and for the
	// Origin check on state-changing chat requests.
	CORSAllowedOrigins []string
	// TrustedProxies are the only peers whose X-Forwarded-For is believed.
	TrustedProxies []string
}

// New builds the gin.Engine with all routes registered.
//
// Health endpoints live outside /api/v1: they are infrastructure signals
// (used by orchestrators/load balancers), not versioned product API.
func New(deps Deps) (*gin.Engine, error) {
	engine := gin.New()
	// nil/empty trusts no proxy: ClientIP is then the TCP peer, so a client
	// cannot spoof its IP (and dodge rate limits) via X-Forwarded-For.
	if err := engine.SetTrustedProxies(deps.TrustedProxies); err != nil {
		return nil, err
	}
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

	chatGroup := v1.Group("/chat",
		middleware.RateLimitByIP(deps.ChatIPLimiter),
		middleware.RequireAllowedOrigin(deps.CORSAllowedOrigins),
		middleware.MaxBodyBytes(chatMaxBodyBytes),
	)
	chatGroup.GET("", deps.Chat.Get)
	chatGroup.POST("/session", deps.Chat.StartSession)
	chatGroup.GET("/messages", deps.Chat.ListMessages)
	chatGroup.POST("/messages", deps.Chat.SendMessage)
	chatGroup.POST("/read", deps.Chat.MarkRead)
	chatGroup.PUT("/contact", deps.Chat.UpdateContact)

	manager := v1.Group("/manager",
		middleware.NoStore(),
		middleware.RateLimitByIP(deps.ManagerIPLimiter),
		middleware.RequireAllowedOrigin(deps.CORSAllowedOrigins),
		middleware.MaxBodyBytes(chatMaxBodyBytes),
	)
	manager.POST("/auth/login", deps.ManagerAuth.Login)
	manager.POST("/auth/logout", deps.ManagerAuth.Logout)

	staffOnly := manager.Group("", middleware.RequireStaff(deps.StaffAuth))
	staffOnly.GET("/auth/me", deps.ManagerAuth.Me)
	staffOnly.GET("/conversations", deps.ManagerChat.ListConversations)
	staffOnly.GET("/conversations/:id/messages", deps.ManagerChat.ListMessages)
	staffOnly.POST("/conversations/:id/messages", deps.ManagerChat.SendMessage)
	staffOnly.POST("/conversations/:id/read", deps.ManagerChat.MarkRead)
	staffOnly.PATCH("/conversations/:id", deps.ManagerChat.UpdateConversation)
	staffOnly.GET("/unread-count", deps.ManagerChat.UnreadCount)

	return engine, nil
}
