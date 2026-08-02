// Package database manages the application-wide PostgreSQL connection pool.
package database

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// pingTimeout bounds how long a single readiness ping may take, so a slow or
// unreachable database can never hang a request indefinitely.
const pingTimeout = 3 * time.Second

// NewPool creates a pgxpool.Pool for the given DSN and verifies connectivity
// once at startup with a bounded ping, so a misconfigured or unreachable
// database is caught immediately instead of on the first request.
func NewPool(ctx context.Context, databaseURL string) (*pgxpool.Pool, error) {
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		return nil, fmt.Errorf("database: create pool: %w", err)
	}

	pingCtx, cancel := context.WithTimeout(ctx, pingTimeout)
	defer cancel()

	if err := pool.Ping(pingCtx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("database: initial ping: %w", err)
	}

	return pool, nil
}

// Ping checks database connectivity within a short, bounded timeout. It is
// used by the readiness endpoint and must never block a caller for long.
func Ping(ctx context.Context, pool *pgxpool.Pool) error {
	pingCtx, cancel := context.WithTimeout(ctx, pingTimeout)
	defer cancel()

	return pool.Ping(pingCtx)
}
