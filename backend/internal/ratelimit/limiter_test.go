package ratelimit

import (
	"testing"
	"time"
)

type fakeClock struct{ t time.Time }

func (f *fakeClock) now() time.Time { return f.t }

func newTestLimiter(limit int, period time.Duration, burst int) (*Limiter, *fakeClock) {
	clock := &fakeClock{t: time.Date(2026, 10, 8, 12, 0, 0, 0, time.UTC)}
	l := New(limit, period, burst)
	l.now = clock.now
	return l, clock
}

func TestLimiter_BurstThenBlocks(t *testing.T) {
	l, _ := newTestLimiter(10, time.Minute, 3)

	for i := 0; i < 3; i++ {
		if ok, _ := l.Allow("k"); !ok {
			t.Fatalf("request %d within burst was rejected", i+1)
		}
	}

	ok, wait := l.Allow("k")
	if ok {
		t.Fatal("request beyond burst was allowed")
	}
	// 10 per minute → one token every 6 seconds.
	if wait <= 0 || wait > 6*time.Second {
		t.Fatalf("retry-after = %v, want (0, 6s]", wait)
	}
}

func TestLimiter_RefillsOverTime(t *testing.T) {
	l, clock := newTestLimiter(10, time.Minute, 1)

	if ok, _ := l.Allow("k"); !ok {
		t.Fatal("first request rejected")
	}
	if ok, _ := l.Allow("k"); ok {
		t.Fatal("second immediate request allowed")
	}

	clock.t = clock.t.Add(6 * time.Second)
	if ok, _ := l.Allow("k"); !ok {
		t.Fatal("request after refill interval rejected")
	}
}

func TestLimiter_KeysAreIndependent(t *testing.T) {
	l, _ := newTestLimiter(1, time.Hour, 1)

	if ok, _ := l.Allow("a"); !ok {
		t.Fatal("a rejected")
	}
	if ok, _ := l.Allow("b"); !ok {
		t.Fatal("b rejected because of a")
	}
}

func TestLimiter_SweepDropsIdleBuckets(t *testing.T) {
	l, clock := newTestLimiter(60, time.Minute, 2)

	l.Allow("idle")
	clock.t = clock.t.Add(2 * sweepInterval)
	l.Allow("fresh")

	if _, ok := l.buckets["idle"]; ok {
		t.Fatal("fully refilled idle bucket was not swept")
	}
}
