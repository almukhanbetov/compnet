// Command api is the COMPNET backend entrypoint. It only wires dependencies
// together (config, database pool, router) and manages the HTTP server's
// lifecycle, including graceful shutdown. No business logic belongs here.
//
// `api create-staff ...` instead runs the staff account command (see
// internal/staffcli).
package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/almukha/compnet-backend/internal/config"
	"github.com/almukha/compnet-backend/internal/database"
	"github.com/almukha/compnet-backend/internal/http/handler"
	"github.com/almukha/compnet-backend/internal/http/router"
	"github.com/almukha/compnet-backend/internal/ratelimit"
	"github.com/almukha/compnet-backend/internal/repository/postgres"
	"github.com/almukha/compnet-backend/internal/security"
	chatsvc "github.com/almukha/compnet-backend/internal/service/chat"
	contentsvc "github.com/almukha/compnet-backend/internal/service/content"
	"github.com/almukha/compnet-backend/internal/service/managerchat"
	projectrequestsvc "github.com/almukha/compnet-backend/internal/service/projectrequest"
	"github.com/almukha/compnet-backend/internal/service/staffauth"
	"github.com/almukha/compnet-backend/internal/staffcli"
)

// shutdownTimeout bounds how long in-flight requests get to finish once a
// shutdown signal is received.
const shutdownTimeout = 10 * time.Second

// Chat anti-spam limits (in-memory, per backend process).
var (
	// All chat requests per client IP, including polling every few seconds
	// from several tabs or an office behind one NAT address.
	chatIPLimiter = func() *ratelimit.Limiter { return ratelimit.New(120, time.Minute, 40) }
	// Messages one conversation may send.
	chatMessageLimiter = func() *ratelimit.Limiter { return ratelimit.New(10, time.Minute, 5) }
	// New conversations one IP may start.
	chatNewConversationLimiter = func() *ratelimit.Limiter { return ratelimit.New(5, time.Hour, 3) }
	// Login attempts (successful ones included): per client IP and per
	// target email, 5 at once, then one every 3 minutes.
	loginIPLimiter    = func() *ratelimit.Limiter { return ratelimit.New(5, 15*time.Minute, 5) }
	loginEmailLimiter = func() *ratelimit.Limiter { return ratelimit.New(5, 15*time.Minute, 5) }
	// All manager API requests per IP (an open inbox polls every few seconds).
	managerIPLimiter = func() *ratelimit.Limiter { return ratelimit.New(300, time.Minute, 100) }
)

func main() {
	if len(os.Args) > 1 && os.Args[1] == "create-staff" {
		if err := runCreateStaff(os.Args[2:]); err != nil {
			log.Fatalf("create-staff: %v", err)
		}
		return
	}
	if err := run(); err != nil {
		log.Fatalf("api: %v", err)
	}
}

func newStaffAuthService(repo *postgres.StaffRepository, cfg config.Config) (*staffauth.Service, error) {
	return staffauth.NewService(repo, security.BcryptHasher{Cost: security.DefaultBcryptCost}, staffauth.Options{
		SessionTTL:   cfg.Cookie.ManagerSessionTTL,
		LoginByIP:    loginIPLimiter(),
		LoginByEmail: loginEmailLimiter(),
	})
}

func runCreateStaff(rawArgs []string) error {
	args, err := staffcli.ParseArgs(rawArgs)
	if err != nil {
		return err
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGTERM)
	defer stop()

	cfg, err := config.Load()
	if err != nil {
		return err
	}
	pool, err := database.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer pool.Close()

	service, err := newStaffAuthService(postgres.NewStaffRepository(pool), cfg)
	if err != nil {
		return err
	}
	return staffcli.Run(ctx, args, service, staffcli.TerminalPassword, os.Stdout)
}

func run() error {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	cfg, err := config.Load()
	if err != nil {
		return err
	}

	pool, err := database.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer pool.Close()

	healthHandler := handler.NewHealthHandler(pool)

	projectRequestRepo := postgres.NewProjectRequestRepository(pool)
	projectRequestService := projectrequestsvc.NewService(projectRequestRepo)
	projectRequestHandler := handler.NewProjectRequestHandler(projectRequestService)

	contentRepo := postgres.NewContentRepository(pool)
	contentService := contentsvc.NewService(contentRepo)
	contentHandler := handler.NewContentHandler(contentService)

	chatRepo := postgres.NewChatRepository(pool)
	chatService := chatsvc.NewService(chatRepo, chatsvc.Limits{
		NewConversation: chatNewConversationLimiter(),
		Messages:        chatMessageLimiter(),
	})
	chatHandler := handler.NewChatHandler(chatService, handler.ChatCookieSettings{
		Secure:   cfg.Cookie.Secure,
		SameSite: cfg.Cookie.SameSite,
		TTL:      cfg.Cookie.ChatTTL,
	})

	staffAuthService, err := newStaffAuthService(postgres.NewStaffRepository(pool), cfg)
	if err != nil {
		return err
	}
	managerAuthHandler := handler.NewManagerAuthHandler(staffAuthService, handler.ManagerCookieSettings{Secure: cfg.Cookie.Secure})
	managerChatHandler := handler.NewManagerChatHandler(managerchat.NewService(chatRepo))

	log.Printf("api: trusted proxies: %v", cfg.TrustedProxies)
	if cfg.IsProduction() && len(cfg.TrustedProxies) == 0 {
		log.Println("api: warning: TRUSTED_PROXIES is empty — behind a reverse proxy every visitor shares the proxy's IP for rate limiting")
	}

	engine, err := router.New(router.Deps{
		Health:             healthHandler,
		ProjectRequest:     projectRequestHandler,
		Content:            contentHandler,
		Chat:               chatHandler,
		ChatIPLimiter:      chatIPLimiter(),
		ManagerAuth:        managerAuthHandler,
		ManagerChat:        managerChatHandler,
		StaffAuth:          staffAuthService,
		ManagerIPLimiter:   managerIPLimiter(),
		CORSAllowedOrigins: cfg.CORSAllowedOrigins,
		TrustedProxies:     cfg.TrustedProxies,
	})
	if err != nil {
		return err
	}

	srv := &http.Server{
		Addr:    ":" + cfg.AppPort,
		Handler: engine,
	}

	serverErr := make(chan error, 1)
	go func() {
		log.Printf("api: listening on %s (env=%s)", srv.Addr, cfg.AppEnv)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			serverErr <- err
			return
		}
		serverErr <- nil
	}()

	select {
	case err := <-serverErr:
		return err
	case <-ctx.Done():
		log.Println("api: shutdown signal received")
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		return err
	}

	log.Println("api: shutdown complete")
	return nil
}
