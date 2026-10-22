// Package app wires repositories, services, handlers and the realtime hub
// into one HTTP engine. cmd/api and the integration tests build the server
// through the same function, so the tests exercise the production wiring.
package app

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/almukha/compnet-backend/internal/config"
	"github.com/almukha/compnet-backend/internal/http/handler"
	"github.com/almukha/compnet-backend/internal/http/middleware"
	"github.com/almukha/compnet-backend/internal/http/router"
	"github.com/almukha/compnet-backend/internal/ratelimit"
	"github.com/almukha/compnet-backend/internal/realtime"
	"github.com/almukha/compnet-backend/internal/repository/postgres"
	"github.com/almukha/compnet-backend/internal/security"
	analyticssvc "github.com/almukha/compnet-backend/internal/service/analytics"
	"github.com/almukha/compnet-backend/internal/service/analyticsevents"
	chatsvc "github.com/almukha/compnet-backend/internal/service/chat"
	"github.com/almukha/compnet-backend/internal/service/chatevents"
	contentsvc "github.com/almukha/compnet-backend/internal/service/content"
	"github.com/almukha/compnet-backend/internal/service/managerchat"
	"github.com/almukha/compnet-backend/internal/service/managerrequests"
	projectrequestsvc "github.com/almukha/compnet-backend/internal/service/projectrequest"
	"github.com/almukha/compnet-backend/internal/service/requestevents"
	"github.com/almukha/compnet-backend/internal/service/staffauth"
)

// Limiters are the anti-spam limits (in-memory, per backend process).
type Limiters struct {
	ChatIP            middleware.Limiter // all chat requests per client IP, incl. polling
	ChatMessages      chatsvc.Limiter    // messages one conversation may send
	ChatConversations chatsvc.Limiter    // new conversations one IP may start
	LoginIP           staffauth.Limiter  // login attempts per IP (successful included)
	LoginEmail        staffauth.Limiter  // login attempts per target email
	ManagerIP         middleware.Limiter // all manager API requests per IP
	AnalyticsIP       middleware.Limiter // analytics event batches per IP
	ProjectRequestIP  middleware.Limiter // public project-request submissions per IP
}

// DefaultLimiters are the production limits.
func DefaultLimiters() Limiters {
	return Limiters{
		ChatIP:            ratelimit.New(120, time.Minute, 40),
		ChatMessages:      ratelimit.New(10, time.Minute, 5),
		ChatConversations: ratelimit.New(5, time.Hour, 3),
		LoginIP:           ratelimit.New(5, 15*time.Minute, 5),
		LoginEmail:        ratelimit.New(5, 15*time.Minute, 5),
		ManagerIP:         ratelimit.New(300, time.Minute, 100),
		// A browser flushes every few seconds and on page hide.
		AnalyticsIP: ratelimit.New(60, time.Minute, 30),
		// A person sends one request, rarely a few (the form offers "send
		// another"); an office behind one NAT still fits in the burst.
		ProjectRequestIP: ratelimit.New(10, time.Hour, 5),
	}
}

// analyticsNotifyInterval: the statistics page is told about new visits at
// most this often (many browsers send events every few seconds).
const analyticsNotifyInterval = 3 * time.Second

// Options tune Build; zero values mean production defaults.
type Options struct {
	Limiters *Limiters
	Realtime *realtime.Limits
}

// App is the assembled server.
type App struct {
	Engine *gin.Engine
	// Hub holds this process's WebSocket connections. There must be exactly
	// one backend process (see docs/CHAT_REALTIME.md); call Hub.Shutdown on
	// server shutdown, http.Server.Shutdown does not close hijacked conns.
	Hub *realtime.Hub
	// Analytics owns the retention cleanup (Analytics.Purge), run by the
	// caller as a periodic job.
	Analytics *analyticssvc.Service
}

// NewStaffAuthService builds the staff authentication service (also used
// by the create-staff command).
func NewStaffAuthService(pool *pgxpool.Pool, cfg config.Config, limiters Limiters) (*staffauth.Service, error) {
	return staffauth.NewService(postgres.NewStaffRepository(pool), security.BcryptHasher{Cost: security.DefaultBcryptCost}, staffauth.Options{
		SessionTTL:   cfg.Cookie.ManagerSessionTTL,
		LoginByIP:    limiters.LoginIP,
		LoginByEmail: limiters.LoginEmail,
	})
}

// Build assembles the HTTP engine.
func Build(pool *pgxpool.Pool, cfg config.Config, opts Options) (*App, error) {
	limiters := DefaultLimiters()
	if opts.Limiters != nil {
		limiters = *opts.Limiters
	}
	rtLimits := realtime.DefaultLimits()
	if opts.Realtime != nil {
		rtLimits = *opts.Realtime
	}

	analyticsService := analyticssvc.NewService(postgres.NewAnalyticsRepository(pool), analyticssvc.Options{
		Enabled:          cfg.Analytics.Enabled,
		RetentionDays:    cfg.Analytics.RetentionDays,
		AllowLocal:       cfg.Analytics.AllowLocal,
		GA4MeasurementID: cfg.Analytics.GA4MeasurementID,
	})

	hub := realtime.NewHub(rtLimits)
	analyticsService.SetNotifier(analyticsevents.New(hub, analyticsNotifyInterval))

	projectRequestRepo := postgres.NewProjectRequestRepository(pool)
	requestEvents := requestevents.New(projectRequestRepo, hub)
	projectRequestService := projectrequestsvc.NewService(projectRequestRepo)
	projectRequestService.SetConversionRecorder(analyticsService)
	projectRequestService.SetNotifier(requestEvents)
	projectRequestService.SetAttributionEnabled(cfg.Analytics.Enabled)
	projectRequestHandler := handler.NewProjectRequestHandler(projectRequestService)
	contentHandler := handler.NewContentHandler(contentsvc.NewService(postgres.NewContentRepository(pool)))

	managerRequestsService, err := managerrequests.NewService(projectRequestRepo)
	if err != nil {
		return nil, err
	}
	managerRequestsService.SetPublisher(requestEvents)
	chatRepo := postgres.NewChatRepository(pool)
	publisher := chatevents.New(chatRepo, hub)

	chatService := chatsvc.NewService(chatRepo, chatsvc.Limits{
		NewConversation: limiters.ChatConversations,
		Messages:        limiters.ChatMessages,
	})
	chatService.SetPublisher(publisher)
	chatService.SetConversionRecorder(analyticsService)
	chatHandler := handler.NewChatHandler(chatService, handler.ChatCookieSettings{
		Secure:   cfg.Cookie.Secure,
		SameSite: cfg.Cookie.SameSite,
		TTL:      cfg.Cookie.ChatTTL,
	})
	chatHandler.SetPresence(hub)

	staffAuthService, err := NewStaffAuthService(pool, cfg, limiters)
	if err != nil {
		return nil, err
	}
	managerAuthHandler := handler.NewManagerAuthHandler(staffAuthService, handler.ManagerCookieSettings{Secure: cfg.Cookie.Secure})
	managerAuthHandler.OnLogout(hub.CloseSession)

	managerChatService := managerchat.NewService(chatRepo)
	managerChatService.SetPublisher(publisher)
	managerChatHandler := handler.NewManagerChatHandler(managerChatService)

	realtimeHandler := handler.NewRealtimeHandler(hub, chatService, managerChatService, staffAuthService, cfg.CORSAllowedOrigins)

	engine, err := router.New(router.Deps{
		Health:                  handler.NewHealthHandler(pool),
		ProjectRequest:          projectRequestHandler,
		ProjectRequestIPLimiter: limiters.ProjectRequestIP,
		Content:                 contentHandler,
		Chat:                    chatHandler,
		ChatIPLimiter:           limiters.ChatIP,
		ManagerAuth:             managerAuthHandler,
		ManagerChat:             managerChatHandler,
		ManagerRequests:         handler.NewManagerRequestsHandler(managerRequestsService),
		Realtime:                realtimeHandler,
		Analytics:               handler.NewAnalyticsHandler(analyticsService),
		AnalyticsIPLimiter:      limiters.AnalyticsIP,
		StaffAuth:               staffAuthService,
		ManagerIPLimiter:        limiters.ManagerIP,
		CORSAllowedOrigins:      cfg.CORSAllowedOrigins,
		TrustedProxies:          cfg.TrustedProxies,
	})
	if err != nil {
		return nil, err
	}
	return &App{Engine: engine, Hub: hub, Analytics: analyticsService}, nil
}
