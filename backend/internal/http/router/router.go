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

// analyticsMaxBodyBytes caps an event batch (20 small events + context).
const analyticsMaxBodyBytes = 16 << 10

// projectRequestMaxBodyBytes caps a project request: the longest text
// fields (2000 + 3×200 + 2×100 characters, up to 4 bytes each) are ~11 KiB
// of UTF-8, plus JSON escaping and the calculator selection.
const projectRequestMaxBodyBytes = 32 << 10

// Deps holds everything the router needs to register routes.
type Deps struct {
	Health         *handler.HealthHandler
	ProjectRequest *handler.ProjectRequestHandler
	// ProjectRequestIPLimiter bounds public request submissions per IP.
	ProjectRequestIPLimiter middleware.Limiter
	Content                 *handler.ContentHandler
	Chat                    *handler.ChatHandler
	// ChatIPLimiter bounds all chat requests (including polling) per IP.
	ChatIPLimiter middleware.Limiter
	ManagerAuth   *handler.ManagerAuthHandler
	ManagerChat   *handler.ManagerChatHandler
	// ManagerRequests: project requests with the clients' contacts.
	ManagerRequests *handler.ManagerRequestsHandler
	// Realtime serves the visitor and manager WebSockets.
	Realtime *handler.RealtimeHandler
	// Analytics: public event intake and the managers' statistics.
	Analytics *handler.AnalyticsHandler
	// AnalyticsIPLimiter bounds event batches per client IP.
	AnalyticsIPLimiter middleware.Limiter
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
	// The public form: per-IP rate limit (429 with Retry-After) and a body
	// cap. No Origin check — the form posts cross-origin from the site and
	// CORS already keeps other sites from reading the answer.
	v1.POST("/project-requests",
		middleware.RateLimitByIP(deps.ProjectRequestIPLimiter),
		middleware.MaxBodyBytes(projectRequestMaxBodyBytes),
		deps.ProjectRequest.Create,
	)

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
	// WebSocket under /api/v1/chat, so the visitor cookie (Path=/api/v1/chat)
	// is sent with the handshake.
	chatGroup.GET("/ws", deps.Realtime.Visitor)

	// Event intake: write-only (nothing can be read back here), allowed
	// origins only, small bodies, per-IP rate limit.
	analyticsGroup := v1.Group("/analytics",
		middleware.RateLimitByIP(deps.AnalyticsIPLimiter),
		middleware.RequireAllowedOrigin(deps.CORSAllowedOrigins),
		middleware.MaxBodyBytes(analyticsMaxBodyBytes),
	)
	analyticsGroup.POST("/events", deps.Analytics.Ingest)
	analyticsGroup.GET("/config", deps.Analytics.Config)

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
	staffOnly.GET("/ws", deps.Realtime.Manager)
	// Project requests: staff session + a role allowed to see contacts.
	staffOnly.GET("/project-requests", deps.ManagerRequests.List)
	staffOnly.GET("/project-requests/summary", deps.ManagerRequests.Summary)
	staffOnly.GET("/project-requests/:id", deps.ManagerRequests.Get)
	staffOnly.PATCH("/project-requests/:id", deps.ManagerRequests.Update)
	// Statistics: staff session + a role with analytics rights.
	staffOnly.GET("/analytics/report", deps.Analytics.Report)
	staffOnly.GET("/analytics/leads", deps.Analytics.Leads)
	staffOnly.GET("/analytics/funnel", deps.Analytics.Funnel)
	staffOnly.GET("/analytics/visits", deps.Analytics.Visits)
	staffOnly.GET("/analytics/sessions/:id", deps.Analytics.Session)

	return engine, nil
}
