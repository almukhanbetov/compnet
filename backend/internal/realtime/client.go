package realtime

import (
	"context"
	"encoding/json"
	"errors"
	"sync"
	"time"

	"github.com/coder/websocket"
)

// Role is which side of the chat a connection belongs to.
type Role int

const (
	RoleVisitor Role = iota + 1
	RoleManager
)

// ClientInfo identifies a connection. Visitors carry their conversation id
// ("" before they have one); managers their staff id and session hash.
type ClientInfo struct {
	Role           Role
	IP             string
	ConversationID string
	StaffID        string
	SessionHash    []byte
}

// FrameHandler processes one client frame. It runs on the connection's
// read goroutine, so frames of one connection are handled in order.
type FrameHandler func(ctx context.Context, c *Client, f Frame)

// Revalidator re-checks a manager's session. ErrSessionEnded closes the
// connection; any other error (e.g. the database is briefly unavailable)
// keeps it open until the next check.
type Revalidator func(ctx context.Context) error

// ErrSessionEnded is returned by a Revalidator when the session is gone.
var ErrSessionEnded = errors.New("realtime: session ended")

// Client is one WebSocket connection.
type Client struct {
	hub            *Hub
	conn           *websocket.Conn
	role           Role
	ip             string
	conversationID string
	staffID        string
	sessionHash    []byte

	send chan []byte   // bounded outgoing queue
	done chan struct{} // closed once the client is shutting down

	closeOnce sync.Once
	// Set once, before done is closed; read by the writer after done.
	closeCode   websocket.StatusCode
	closeReason string
	drain       bool // deliver queued events before the close frame
	broken      bool // the connection is already unusable: no handshake

	// Inbound frame rate (token bucket), touched only by the read goroutine.
	tokens     float64
	lastRefill time.Time
	strikes    int
	lastTyping time.Time
}

// Attach wraps an accepted connection. Call Run to serve it.
func (h *Hub) Attach(conn *websocket.Conn, info ClientInfo) *Client {
	conn.SetReadLimit(h.limits.ReadLimit)
	return &Client{
		hub:            h,
		conn:           conn,
		role:           info.Role,
		ip:             info.IP,
		conversationID: info.ConversationID,
		staffID:        info.StaffID,
		sessionHash:    info.SessionHash,
		send:           make(chan []byte, h.limits.SendQueue),
		done:           make(chan struct{}),
		tokens:         h.limits.FrameBurst,
		lastRefill:     time.Now(),
	}
}

// Role reports the connection's side.
func (c *Client) Role() Role { return c.role }

// ConversationID is the visitor's conversation ("" if none, or for managers).
func (c *Client) ConversationID() string { return c.conversationID }

// StaffID is the manager's staff id ("" for visitors).
func (c *Client) StaffID() string { return c.staffID }

// Run registers the client, serves it until it disconnects, and cleans up.
// It blocks; call it from the HTTP handler goroutine after Accept.
func (c *Client) Run(handle FrameHandler, revalidate Revalidator) {
	if err := c.hub.register(c); err != nil {
		code := websocket.StatusTryAgainLater
		if errors.Is(err, ErrShuttingDown) {
			code = websocket.StatusGoingAway
		}
		_ = c.conn.Close(code, "unavailable")
		return
	}
	defer c.hub.unregister(c)

	// Not the request context: it is unusable once the connection is hijacked.
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	writerDone := make(chan struct{})
	go func() { defer close(writerDone); c.writeLoop() }()
	keepAliveDone := make(chan struct{})
	go func() { defer close(keepAliveDone); c.keepAlive(ctx, revalidate) }()

	c.hub.snapshot(c)
	c.readLoop(ctx, handle)

	// The writer owns the end of the connection: it flushes what is queued
	// and performs the close handshake. Only then are the reads cancelled.
	c.Close(websocket.StatusNormalClosure, "")
	<-writerDone
	cancel()
	<-keepAliveDone
}

func (c *Client) readLoop(ctx context.Context, handle FrameHandler) {
	for {
		typ, data, err := c.conn.Read(ctx)
		if err != nil {
			return // closed by the peer, by us, too big, or network failure
		}
		if typ != websocket.MessageText {
			c.SendEvent(Reply(EventError, "", ErrorData{Code: "bad_request"}))
			continue
		}
		var f Frame
		if err := json.Unmarshal(data, &f); err != nil || f.Type == "" {
			c.SendEvent(Reply(EventError, "", ErrorData{Code: "bad_request"}))
			continue
		}
		if !c.allowFrame() {
			c.strikes++
			if c.strikes >= c.hub.limits.FrameStrikes {
				c.Close(CloseTooManyFrames, "too many frames")
				return
			}
			c.SendEvent(Reply(EventError, f.RequestID, ErrorData{Code: "rate_limited", RetryAfterSeconds: 1, ClientMessageID: f.ClientMessageID}))
			continue
		}
		if f.Type == "ping" {
			c.SendEvent(Reply(EventPong, f.RequestID, nil))
			continue
		}
		handle(ctx, c, f)
	}
}

// allowFrame is a token bucket: FrameBurst at once, FramesPerSecond after.
func (c *Client) allowFrame() bool {
	now := time.Now()
	c.tokens += now.Sub(c.lastRefill).Seconds() * c.hub.limits.FramesPerSecond
	if c.tokens > c.hub.limits.FrameBurst {
		c.tokens = c.hub.limits.FrameBurst
	}
	c.lastRefill = now
	if c.tokens < 1 {
		return false
	}
	c.tokens--
	return true
}

// TypingAllowed throttles typing notifications to one per second per
// connection; extra ones are dropped silently.
func (c *Client) TypingAllowed() bool {
	now := time.Now()
	if now.Sub(c.lastTyping) < time.Second {
		return false
	}
	c.lastTyping = now
	return true
}

// writeLoop is the only writer of data frames. Each write has its own
// timeout (cancelling a write's context breaks the connection, so it must
// not share a context that is cancelled on exit).
func (c *Client) writeLoop() {
	for {
		select {
		case payload := <-c.send:
			if !c.write(payload) {
				c.closeNow()
				_ = c.conn.CloseNow()
				return
			}
		case <-c.done:
			c.finish()
			return
		}
	}
}

// finish flushes the queue (unless the client is slow or the connection is
// broken) and closes the connection with the requested code.
func (c *Client) finish() {
	if c.broken {
		_ = c.conn.CloseNow()
		return
	}
	for c.drain {
		select {
		case payload := <-c.send:
			if !c.write(payload) {
				_ = c.conn.CloseNow()
				return
			}
			continue
		default:
		}
		break
	}
	_ = c.conn.Close(c.closeCode, c.closeReason)
}

func (c *Client) write(payload []byte) bool {
	ctx, cancel := context.WithTimeout(context.Background(), c.hub.limits.WriteTimeout)
	defer cancel()
	return c.conn.Write(ctx, websocket.MessageText, payload) == nil
}

// keepAlive pings the peer (a missing pong means the connection is dead)
// and, for managers, re-checks the session.
func (c *Client) keepAlive(ctx context.Context, revalidate Revalidator) {
	ping := time.NewTicker(c.hub.limits.PingInterval)
	defer ping.Stop()
	var recheck <-chan time.Time
	if revalidate != nil {
		t := time.NewTicker(c.hub.limits.RevalidateEvery)
		defer t.Stop()
		recheck = t.C
	}
	for {
		select {
		case <-c.done:
			return
		case <-ping.C:
			pctx, cancel := context.WithTimeout(ctx, c.hub.limits.PongTimeout)
			err := c.conn.Ping(pctx)
			cancel()
			if err != nil {
				c.closeNow()
				return
			}
		case <-recheck:
			rctx, cancel := context.WithTimeout(ctx, 5*time.Second)
			err := revalidate(rctx)
			cancel()
			if errors.Is(err, ErrSessionEnded) {
				c.Close(CloseSessionEnded, "session ended")
				return
			}
		}
	}
}

// SendEvent queues an event for this connection only.
func (c *Client) SendEvent(ev Event) {
	payload, err := encode(ev)
	if err != nil {
		return
	}
	c.enqueue(payload)
}

// enqueue never blocks: a client whose queue is full is too slow to keep
// up and is disconnected; it will reconnect and re-read the API.
func (c *Client) enqueue(payload []byte) {
	select {
	case <-c.done:
		return
	default:
	}
	select {
	case c.send <- payload:
	default:
		c.closeWith(CloseSlowConsumer, "slow consumer", false)
	}
}

// Close ends the connection: queued events are still delivered, then the
// close frame with the given code. Safe to call more than once and from any
// goroutine; the first call wins.
func (c *Client) Close(code websocket.StatusCode, reason string) {
	c.closeWith(code, reason, true)
}

func (c *Client) closeWith(code websocket.StatusCode, reason string, drain bool) {
	c.closeOnce.Do(func() {
		c.closeCode, c.closeReason, c.drain = code, reason, drain
		close(c.done)
	})
}

// closeNow drops a connection that is already broken (failed ping/write):
// no flush, no handshake. Unblocks a pending read at once.
func (c *Client) closeNow() {
	c.closeOnce.Do(func() {
		c.broken = true
		close(c.done)
	})
	_ = c.conn.CloseNow()
}
