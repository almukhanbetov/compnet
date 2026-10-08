// Package ratelimit provides an in-memory, per-key token-bucket limiter.
//
// State lives in process memory, which is correct for the single backend
// instance COMPNET runs today; running several replicas would need a shared
// store instead.
package ratelimit

import (
	"math"
	"sync"
	"time"
)

// sweepInterval is how often idle buckets are dropped, bounding memory to
// roughly the keys seen recently.
const sweepInterval = time.Minute

// Limiter allows up to Burst events at once per key, refilled at Limit
// events per Per.
type Limiter struct {
	mu        sync.Mutex
	rate      float64 // tokens per second
	burst     float64
	buckets   map[string]*bucket
	lastSweep time.Time
	now       func() time.Time
}

type bucket struct {
	tokens float64
	last   time.Time
}

// New builds a limiter allowing limit events per period per key, with bursts
// of up to burst events. limit, period and burst must be positive.
func New(limit int, period time.Duration, burst int) *Limiter {
	return &Limiter{
		rate:    float64(limit) / period.Seconds(),
		burst:   float64(burst),
		buckets: make(map[string]*bucket),
		now:     time.Now,
	}
}

// Allow consumes one token for key. When none is available it returns false
// and how long until the next token.
func (l *Limiter) Allow(key string) (bool, time.Duration) {
	l.mu.Lock()
	defer l.mu.Unlock()

	now := l.now()
	l.sweep(now)

	b, ok := l.buckets[key]
	if !ok {
		b = &bucket{tokens: l.burst, last: now}
		l.buckets[key] = b
	} else {
		l.refill(b, now)
	}

	if b.tokens >= 1 {
		b.tokens--
		return true, 0
	}

	wait := time.Duration(math.Ceil((1 - b.tokens) / l.rate * float64(time.Second)))
	return false, wait
}

func (l *Limiter) refill(b *bucket, now time.Time) {
	elapsed := now.Sub(b.last).Seconds()
	if elapsed > 0 {
		b.tokens = math.Min(l.burst, b.tokens+elapsed*l.rate)
		b.last = now
	}
}

// sweep drops buckets that have refilled completely: they are
// indistinguishable from a fresh bucket, so forgetting them is lossless.
func (l *Limiter) sweep(now time.Time) {
	if now.Sub(l.lastSweep) < sweepInterval {
		return
	}
	l.lastSweep = now
	for key, b := range l.buckets {
		l.refill(b, now)
		if b.tokens >= l.burst {
			delete(l.buckets, key)
		}
	}
}
