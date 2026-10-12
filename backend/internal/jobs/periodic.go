// Package jobs runs periodic background tasks inside the backend process
// (there is a single backend instance; see docs/CHAT_REALTIME.md). Tasks
// must be idempotent: a restart simply runs them again.
package jobs

import (
	"context"
	"log"
	"time"
)

// Periodic runs fn right away and then every interval until ctx is done.
// A failing run is logged (by name, without data) and retried next time.
// The returned channel is closed once the loop has stopped.
func Periodic(ctx context.Context, name string, interval time.Duration, fn func(context.Context) error) <-chan struct{} {
	done := make(chan struct{})
	go func() {
		defer close(done)
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for {
			runCtx, cancel := context.WithTimeout(ctx, interval/2)
			if err := fn(runCtx); err != nil && ctx.Err() == nil {
				log.Printf("jobs: %s failed: %v", name, err)
			}
			cancel()
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
			}
		}
	}()
	return done
}
