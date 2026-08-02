// Command api is the COMPNET backend entrypoint. It only wires dependencies
// together (config, database pool, router) and manages the HTTP server's
// lifecycle, including graceful shutdown. No business logic belongs here.
package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os/signal"
	"syscall"
	"time"

	"github.com/almukha/compnet-backend/internal/config"
	"github.com/almukha/compnet-backend/internal/database"
	"github.com/almukha/compnet-backend/internal/http/handler"
	"github.com/almukha/compnet-backend/internal/http/router"
	"github.com/almukha/compnet-backend/internal/repository/postgres"
	projectrequestsvc "github.com/almukha/compnet-backend/internal/service/projectrequest"
)

// shutdownTimeout bounds how long in-flight requests get to finish once a
// shutdown signal is received.
const shutdownTimeout = 10 * time.Second

func main() {
	if err := run(); err != nil {
		log.Fatalf("api: %v", err)
	}
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

	engine := router.New(router.Deps{
		Health:             healthHandler,
		ProjectRequest:     projectRequestHandler,
		CORSAllowedOrigins: cfg.CORSAllowedOrigins,
	})

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
