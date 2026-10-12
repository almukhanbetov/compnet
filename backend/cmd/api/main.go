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

	"github.com/almukha/compnet-backend/internal/app"
	"github.com/almukha/compnet-backend/internal/config"
	"github.com/almukha/compnet-backend/internal/database"
	"github.com/almukha/compnet-backend/internal/jobs"
	"github.com/almukha/compnet-backend/internal/staffcli"
)

// shutdownTimeout bounds how long in-flight requests get to finish once a
// shutdown signal is received.
const shutdownTimeout = 10 * time.Second

// analyticsCleanupInterval: how often analytics older than the retention
// period are deleted (also once at startup).
const analyticsCleanupInterval = 6 * time.Hour

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

	service, err := app.NewStaffAuthService(pool, cfg, app.DefaultLimiters())
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

	log.Printf("api: trusted proxies: %v", cfg.TrustedProxies)
	if cfg.IsProduction() && len(cfg.TrustedProxies) == 0 {
		log.Println("api: warning: TRUSTED_PROXIES is empty — behind a reverse proxy every visitor shares the proxy's IP for rate limiting")
	}

	// One in-memory realtime hub: this must be the only backend process
	// (docker-compose.prod.yml runs exactly one). See docs/CHAT_REALTIME.md.
	application, err := app.Build(pool, cfg, app.Options{})
	if err != nil {
		return err
	}

	// Background jobs stop with the process (ctx is cancelled on SIGTERM).
	jobsDone := jobs.Periodic(ctx, "analytics retention", analyticsCleanupInterval, application.Analytics.Purge)

	srv := &http.Server{
		Addr:    ":" + cfg.AppPort,
		Handler: application.Engine,
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

	// Stop accepting connections and let HTTP requests finish, then close
	// the WebSockets ourselves (http.Server.Shutdown does not track hijacked
	// connections) with "going away", so clients reconnect to the new
	// process and re-read the history from PostgreSQL.
	shutdownErr := srv.Shutdown(shutdownCtx)
	application.Hub.Shutdown(shutdownCtx)
	if shutdownErr != nil {
		return shutdownErr
	}

	<-jobsDone
	log.Println("api: shutdown complete")
	return nil
}
