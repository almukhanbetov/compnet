package analyticsevents

import (
	"sync"
	"testing"
	"time"

	"github.com/almukha/compnet-backend/internal/realtime"
)

type fakeHub struct {
	mu     sync.Mutex
	events []realtime.Event
}

func (h *fakeHub) ToManagers(ev realtime.Event) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.events = append(h.events, ev)
}

func (h *fakeHub) count() int {
	h.mu.Lock()
	defer h.mu.Unlock()
	return len(h.events)
}

func TestNotifierCoalesces(t *testing.T) {
	hub := &fakeHub{}
	n := New(hub, 200*time.Millisecond)

	n.VisitsChanged() // first change: announced at once
	time.Sleep(50 * time.Millisecond)
	if hub.count() != 1 || hub.events[0].Type != realtime.EventAnalyticsUpdated || hub.events[0].Data != nil {
		t.Fatalf("first event: %+v", hub.events)
	}
	for i := 0; i < 20; i++ { // a burst within the interval: one more event
		n.VisitsChanged()
	}
	time.Sleep(50 * time.Millisecond)
	if hub.count() != 1 {
		t.Fatalf("burst announced early: %d", hub.count())
	}
	time.Sleep(250 * time.Millisecond)
	if hub.count() != 2 {
		t.Fatalf("burst not announced once after the interval: %d", hub.count())
	}
	time.Sleep(300 * time.Millisecond)
	if hub.count() != 2 {
		t.Fatalf("announced without a change: %d", hub.count())
	}
}
