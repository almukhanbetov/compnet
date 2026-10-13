// Package analyticsevents tells connected managers that the statistics
// changed, over the existing manager WebSocket. Visitors' browsers send
// events every few seconds, so announcements are coalesced: at most one
// per interval, sent once the interval since the previous one has passed.
// The event has no payload — the statistics page re-reads the HTTP API,
// which checks the staff member's rights; nothing about visitors travels
// over the socket.
package analyticsevents

import (
	"sync"
	"time"

	"github.com/almukha/compnet-backend/internal/realtime"
)

// Hub delivers events (implemented by *realtime.Hub).
type Hub interface {
	ToManagers(ev realtime.Event)
}

// Notifier implements analytics.Notifier.
type Notifier struct {
	hub      Hub
	interval time.Duration

	mu    sync.Mutex
	last  time.Time
	timer *time.Timer
}

// New builds a Notifier sending at most one event per interval.
func New(hub Hub, interval time.Duration) *Notifier {
	return &Notifier{hub: hub, interval: interval}
}

// VisitsChanged schedules an announcement unless one is already pending.
func (n *Notifier) VisitsChanged() {
	n.mu.Lock()
	defer n.mu.Unlock()
	if n.timer != nil {
		return
	}
	delay := n.interval - time.Since(n.last)
	if delay < 0 {
		delay = 0
	}
	n.timer = time.AfterFunc(delay, n.fire)
}

func (n *Notifier) fire() {
	n.mu.Lock()
	n.timer = nil
	n.last = time.Now()
	n.mu.Unlock()
	n.hub.ToManagers(realtime.NewEvent(realtime.EventAnalyticsUpdated, "", nil))
}
