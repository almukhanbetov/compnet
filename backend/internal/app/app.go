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
	chatsvc "github.com/almukha/compnet-backend/internal/service/chat"
	"github.com/almukha/compnet-backend/internal/service/chatevents"
	contentsvc "github.com/almukha/compnet-backend/internal/service/content"
	"github.com/almukha/compnet-backend/internal/service/managerchat"
	projectrequestsvc "github.com/almukha/compnet-backend/internal/service/projectrequest"
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
	}
}

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

	projectRequestHandler := handler.NewProjectRequestHandler(projectrequestsvc.NewService(postgres.NewProjectRequestRepository(pool)))
	contentHandler := handler.NewContentHandler(contentsvc.NewService(postgres.NewContentRepository(pool)))

	hub := realtime.NewHub(rtLimits)
	chatRepo := postgres.NewChatRepository(pool)
	publisher := chatevents.New(chatRepo, hub)

	chatService := chatsvc.NewService(chatRepo, chatsvc.Limits{
		NewConversation: limiters.ChatConversations,
		Messages:        limiters.ChatMessages,
	})
	chatService.SetPublisher(publisher)
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
		Health:             handler.NewHealthHandler(pool),
		ProjectRequest:     projectRequestHandler,
		Content:            contentHandler,
		Chat:               chatHandler,
		ChatIPLimiter:      limiters.ChatIP,
		ManagerAuth:        managerAuthHandler,
		ManagerChat:        managerChatHandler,
		Realtime:           realtimeHandler,
		StaffAuth:          staffAuthService,
		ManagerIPLimiter:   limiters.ManagerIP,
		CORSAllowedOrigins: cfg.CORSAllowedOrigins,
		TrustedProxies:     cfg.TrustedProxies,
	})
	if err != nil {
		return nil, err
	}
	return &App{Engine: engine, Hub: hub}, nil
}
