package realtime

import (
	"bytes"
	"context"
	"errors"
	"log"
	"sort"
	"sync"
	"time"

	"github.com/coder/websocket"
)

// Close codes sent to clients (4000–4999 are for applications).
const (
	// CloseSessionEnded: the manager logged out, the session expired or the
	// account was disabled. The client must not reconnect without logging in.
	CloseSessionEnded websocket.StatusCode = 4401
	// CloseSlowConsumer: the client did not read its events fast enough.
	CloseSlowConsumer websocket.StatusCode = 4408
	// CloseTooManyFrames: the client kept sending faster than allowed.
	CloseTooManyFrames websocket.StatusCode = 4429
)

// ErrTooManyConnections is returned by Register when a connection limit is
// reached; ErrShuttingDown once Shutdown has started.
var (
	ErrTooManyConnections = errors.New("realtime: too many connections")
	ErrShuttingDown       = errors.New("realtime: shutting down")
)

// Limits bound the resources one backend process spends on WebSockets.
type Limits struct {
	MaxVisitors         int // all visitor connections
	MaxVisitorsPerIP    int
	MaxManagers         int // all manager connections
	MaxManagersPerStaff int // tabs of one staff account

	SendQueue    int           // events buffered per connection before it counts as slow
	ReadLimit    int64         // max bytes of one client frame
	WriteTimeout time.Duration // one write; a stuck write closes the connection
	PingInterval time.Duration // protocol ping cadence
	PongTimeout  time.Duration // no pong within this → connection is dead

	FramesPerSecond float64 // sustained client frame rate
	FrameBurst      float64 // frames allowed at once
	// FrameStrikes: frames refused for rate before the connection is closed.
	FrameStrikes int

	// PresenceGrace delays "went offline" so a page reload does not flicker.
	PresenceGrace time.Duration
	// RevalidateEvery: how often a manager connection re-checks its session.
	RevalidateEvery time.Duration
}

// DefaultLimits are sized for one small VPS.
func DefaultLimits() Limits {
	return Limits{
		MaxVisitors:         2000,
		MaxVisitorsPerIP:    20,
		MaxManagers:         200,
		MaxManagersPerStaff: 20,
		SendQueue:           64,
		ReadLimit:           16 << 10,
		WriteTimeout:        10 * time.Second,
		PingInterval:        25 * time.Second,
		PongTimeout:         10 * time.Second,
		FramesPerSecond:     5,
		FrameBurst:          20,
		FrameStrikes:        20,
		PresenceGrace:       5 * time.Second,
		RevalidateEvery:     30 * time.Second,
	}
}

// Hub tracks the connections of this process and fans events out to them.
// All methods are safe for concurrent use.
type Hub struct {
	limits Limits

	mu             sync.Mutex
	closed         bool
	visitorsByConv map[string]map[*Client]struct{}
	unbound        map[*Client]struct{} // visitors without a conversation yet
	visitorsPerIP  map[string]int
	visitorCount   int
	managers       map[*Client]struct{}
	perStaff       map[string]int

	// Presence as last announced, plus pending "went offline" timers.
	managersOnline   bool
	managersOffTimer *time.Timer
	visitorOnline    map[string]bool
	visitorOffTimers map[string]*time.Timer

	wg sync.WaitGroup // running clients
}

// NewHub builds an empty hub.
func NewHub(limits Limits) *Hub {
	return &Hub{
		limits:           limits,
		visitorsByConv:   map[string]map[*Client]struct{}{},
		unbound:          map[*Client]struct{}{},
		visitorsPerIP:    map[string]int{},
		managers:         map[*Client]struct{}{},
		perStaff:         map[string]int{},
		visitorOnline:    map[string]bool{},
		visitorOffTimers: map[string]*time.Timer{},
	}
}

// Limits returns the hub's limits.
func (h *Hub) Limits() Limits { return h.limits }

// CanAccept reports, before the WebSocket handshake, whether a connection
// of this kind would be admitted. Register re-checks authoritatively.
func (h *Hub) CanAccept(role Role, ip, staffID string) error {
	h.mu.Lock()
	defer h.mu.Unlock()
	return h.admitLocked(role, ip, staffID)
}

func (h *Hub) admitLocked(role Role, ip, staffID string) error {
	if h.closed {
		return ErrShuttingDown
	}
	switch role {
	case RoleVisitor:
		if h.visitorCount >= h.limits.MaxVisitors || h.visitorsPerIP[ip] >= h.limits.MaxVisitorsPerIP {
			return ErrTooManyConnections
		}
	case RoleManager:
		if len(h.managers) >= h.limits.MaxManagers || h.perStaff[staffID] >= h.limits.MaxManagersPerStaff {
			return ErrTooManyConnections
		}
	}
	return nil
}

// register adds a client and returns the presence events to publish.
func (h *Hub) register(c *Client) error {
	h.mu.Lock()
	if err := h.admitLocked(c.role, c.ip, c.staffID); err != nil {
		h.mu.Unlock()
		return err
	}
	h.wg.Add(1)
	var announce []func()

	switch c.role {
	case RoleVisitor:
		h.visitorCount++
		h.visitorsPerIP[c.ip]++
		if c.conversationID == "" {
			h.unbound[c] = struct{}{}
			break
		}
		set := h.visitorsByConv[c.conversationID]
		if set == nil {
			set = map[*Client]struct{}{}
			h.visitorsByConv[c.conversationID] = set
		}
		set[c] = struct{}{}
		if t := h.visitorOffTimers[c.conversationID]; t != nil {
			t.Stop()
			delete(h.visitorOffTimers, c.conversationID)
		}
		if !h.visitorOnline[c.conversationID] {
			h.visitorOnline[c.conversationID] = true
			conv := c.conversationID
			announce = append(announce, func() { h.ToManagers(visitorPresence(conv, true)) })
		}
	case RoleManager:
		h.managers[c] = struct{}{}
		before := len(h.perStaff)
		h.perStaff[c.staffID]++
		if h.managersOffTimer != nil {
			h.managersOffTimer.Stop()
			h.managersOffTimer = nil
		}
		if !h.managersOnline {
			h.managersOnline = true
			announce = append(announce, func() { h.toVisitors(h.managersPresence(false)) })
		}
		if len(h.perStaff) != before {
			announce = append(announce, func() { h.ToManagers(h.managersPresence(true)) })
		}
	}
	h.mu.Unlock()

	for _, fn := range announce {
		fn()
	}
	return nil
}

// unregister removes a client; "went offline" is announced after the grace
// period unless another connection of the same party arrives meanwhile.
func (h *Hub) unregister(c *Client) {
	h.mu.Lock()
	var announce []func()

	switch c.role {
	case RoleVisitor:
		h.visitorCount--
		if h.visitorsPerIP[c.ip]--; h.visitorsPerIP[c.ip] <= 0 {
			delete(h.visitorsPerIP, c.ip)
		}
		if c.conversationID == "" {
			delete(h.unbound, c)
			break
		}
		set := h.visitorsByConv[c.conversationID]
		delete(set, c)
		if len(set) == 0 {
			delete(h.visitorsByConv, c.conversationID)
			conv := c.conversationID
			if !h.closed {
				h.visitorOffTimers[conv] = time.AfterFunc(h.limits.PresenceGrace, func() { h.visitorWentOffline(conv) })
			}
		}
	case RoleManager:
		delete(h.managers, c)
		if h.perStaff[c.staffID]--; h.perStaff[c.staffID] <= 0 {
			delete(h.perStaff, c.staffID)
			announce = append(announce, func() { h.ToManagers(h.managersPresence(true)) })
		}
		if len(h.perStaff) == 0 && h.managersOnline && !h.closed {
			h.managersOffTimer = time.AfterFunc(h.limits.PresenceGrace, h.managersWentOffline)
		}
	}
	h.mu.Unlock()
	h.wg.Done()

	for _, fn := range announce {
		fn()
	}
}

func (h *Hub) visitorWentOffline(conv string) {
	h.mu.Lock()
	delete(h.visitorOffTimers, conv)
	if len(h.visitorsByConv[conv]) > 0 || !h.visitorOnline[conv] {
		h.mu.Unlock()
		return
	}
	delete(h.visitorOnline, conv)
	h.mu.Unlock()
	h.ToManagers(visitorPresence(conv, false))
}

func (h *Hub) managersWentOffline() {
	h.mu.Lock()
	h.managersOffTimer = nil
	if len(h.perStaff) > 0 || !h.managersOnline {
		h.mu.Unlock()
		return
	}
	h.managersOnline = false
	h.mu.Unlock()
	h.toVisitors(h.managersPresence(false))
}

// PresenceData is the payload of "presence" events. Subject says which
// fields are set:
//
//	managers: managers_online (+ online_managers for managers)
//	visitor:  conversation_id, visitor_online (managers only)
//	visitors: online_conversation_ids — snapshot sent to a manager on connect
type PresenceData struct {
	Subject               string   `json:"subject"`
	ManagersOnline        *bool    `json:"managers_online,omitempty"`
	OnlineManagers        *int     `json:"online_managers,omitempty"`
	ConversationID        string   `json:"conversation_id,omitempty"`
	VisitorOnline         *bool    `json:"visitor_online,omitempty"`
	OnlineConversationIDs []string `json:"online_conversation_ids,omitempty"`
}

// managersPresence reports whether at least one manager has a live,
// authenticated connection. forManagers adds how many staff are connected.
func (h *Hub) managersPresence(forManagers bool) Event {
	h.mu.Lock()
	online := h.managersOnline
	count := len(h.perStaff)
	h.mu.Unlock()
	data := PresenceData{Subject: "managers", ManagersOnline: &online}
	if forManagers {
		data.OnlineManagers = &count
	}
	return NewEvent(EventPresence, "", data)
}

func visitorPresence(conv string, online bool) Event {
	return NewEvent(EventPresence, conv, PresenceData{Subject: "visitor", ConversationID: conv, VisitorOnline: &online})
}

// ManagersOnline reports the announced manager presence (for HTTP clients).
func (h *Hub) ManagersOnline() bool {
	h.mu.Lock()
	defer h.mu.Unlock()
	return h.managersOnline
}

// snapshot sends a newly registered client the current presence.
func (h *Hub) snapshot(c *Client) {
	if c.role == RoleVisitor {
		c.SendEvent(h.managersPresence(false))
		return
	}
	c.SendEvent(h.managersPresence(true))
	h.mu.Lock()
	ids := make([]string, 0, len(h.visitorOnline))
	for id, online := range h.visitorOnline {
		if online {
			ids = append(ids, id)
		}
	}
	h.mu.Unlock()
	sort.Strings(ids)
	c.SendEvent(NewEvent(EventPresence, "", PresenceData{Subject: "visitors", OnlineConversationIDs: ids}))
}

// ToConversation sends an event to every visitor connection of a conversation.
func (h *Hub) ToConversation(conversationID string, ev Event) {
	h.mu.Lock()
	targets := make([]*Client, 0, len(h.visitorsByConv[conversationID]))
	for c := range h.visitorsByConv[conversationID] {
		targets = append(targets, c)
	}
	h.mu.Unlock()
	h.fanOut(targets, ev)
}

// ToManagers sends an event to every manager connection.
func (h *Hub) ToManagers(ev Event) {
	h.mu.Lock()
	targets := make([]*Client, 0, len(h.managers))
	for c := range h.managers {
		targets = append(targets, c)
	}
	h.mu.Unlock()
	h.fanOut(targets, ev)
}

func (h *Hub) toVisitors(ev Event) {
	h.mu.Lock()
	targets := make([]*Client, 0, h.visitorCount)
	for _, set := range h.visitorsByConv {
		for c := range set {
			targets = append(targets, c)
		}
	}
	for c := range h.unbound {
		targets = append(targets, c)
	}
	h.mu.Unlock()
	h.fanOut(targets, ev)
}

func (h *Hub) fanOut(targets []*Client, ev Event) {
	if len(targets) == 0 {
		return
	}
	payload, err := encode(ev)
	if err != nil {
		log.Printf("realtime: encode %s: %v", ev.Type, err)
		return
	}
	for _, c := range targets {
		c.enqueue(payload)
	}
}

// CloseSession disconnects every manager connection opened with the given
// session (by token hash), e.g. right after logout.
func (h *Hub) CloseSession(sessionHash []byte) {
	h.mu.Lock()
	var targets []*Client
	for c := range h.managers {
		if bytes.Equal(c.sessionHash, sessionHash) {
			targets = append(targets, c)
		}
	}
	h.mu.Unlock()
	for _, c := range targets {
		c.Close(CloseSessionEnded, "session ended")
	}
}

// Stats is a point-in-time count of connections (for tests and logs).
type Stats struct {
	Visitors       int
	Managers       int
	OnlineManagers int
}

// Stats returns current connection counts.
func (h *Hub) Stats() Stats {
	h.mu.Lock()
	defer h.mu.Unlock()
	return Stats{Visitors: h.visitorCount, Managers: len(h.managers), OnlineManagers: len(h.perStaff)}
}

// Shutdown refuses new connections, closes every open one with "going
// away" (clients reconnect to the next process) and waits for them to
// finish, at most until ctx is done.
func (h *Hub) Shutdown(ctx context.Context) {
	h.mu.Lock()
	h.closed = true
	var all []*Client
	for c := range h.managers {
		all = append(all, c)
	}
	for _, set := range h.visitorsByConv {
		for c := range set {
			all = append(all, c)
		}
	}
	for c := range h.unbound {
		all = append(all, c)
	}
	if h.managersOffTimer != nil {
		h.managersOffTimer.Stop()
	}
	for _, t := range h.visitorOffTimers {
		t.Stop()
	}
	h.mu.Unlock()

	for _, c := range all {
		c.Close(websocket.StatusGoingAway, "server restart")
	}

	done := make(chan struct{})
	go func() {
		h.wg.Wait()
		close(done)
	}()
	select {
	case <-done:
	case <-ctx.Done():
		log.Printf("realtime: shutdown timed out with connections still open")
	}
}
