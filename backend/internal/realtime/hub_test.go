package realtime

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/coder/websocket"
)

func testLimits() Limits {
	l := DefaultLimits()
	l.PresenceGrace = 80 * time.Millisecond
	l.PingInterval = time.Hour
	return l
}

// harness serves real WebSocket connections into a hub. The client role and
// ids come from query parameters; "noserve=1" registers the connection but
// does not start its read/write loops (to simulate a stalled server side).
type harness struct {
	t   *testing.T
	hub *Hub
	srv *httptest.Server

	mu      sync.Mutex
	clients []*Client
}

func newHarness(t *testing.T, limits Limits) *harness {
	t.Helper()
	h := &harness{t: t, hub: NewHub(limits)}
	h.srv = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		q := r.URL.Query()
		info := ClientInfo{Role: RoleVisitor, IP: "203.0.113.1", ConversationID: q.Get("conv")}
		if q.Get("role") == "manager" {
			info = ClientInfo{Role: RoleManager, IP: "203.0.113.9", StaffID: q.Get("staff"), SessionHash: []byte(q.Get("session"))}
		}
		if q.Get("ip") != "" {
			info.IP = q.Get("ip")
		}
		if err := h.hub.CanAccept(info.Role, info.IP, info.StaffID); err != nil {
			http.Error(w, "busy", http.StatusTooManyRequests)
			return
		}
		conn, err := websocket.Accept(w, r, nil)
		if err != nil {
			return
		}
		c := h.hub.Attach(conn, info)
		h.mu.Lock()
		h.clients = append(h.clients, c)
		h.mu.Unlock()
		if q.Get("noserve") == "1" {
			if err := h.hub.register(c); err != nil {
				t.Errorf("register: %v", err)
			}
			<-c.done
			c.finish() // what the (absent) writer would do
			h.hub.unregister(c)
			return
		}
		c.Run(func(_ context.Context, cl *Client, f Frame) {
			cl.SendEvent(Reply(EventMessageAck, f.RequestID, map[string]string{"echo": f.Type}))
		}, nil)
	}))
	t.Cleanup(func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		h.hub.Shutdown(ctx)
		h.srv.Close()
	})
	return h
}

// peer is the test's side of a connection. A background goroutine reads
// it, because cancelling a Read with a context closes the connection.
type peer struct {
	conn   *websocket.Conn
	events chan Event
	closed chan websocket.StatusCode
}

func (h *harness) dial(query string) *peer {
	h.t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	url := "ws" + strings.TrimPrefix(h.srv.URL, "http") + "/?" + query
	conn, resp, err := websocket.Dial(ctx, url, nil)
	if err != nil {
		h.t.Fatalf("dial %s: %v (resp %v)", query, err, resp)
	}
	h.t.Cleanup(func() { _ = conn.CloseNow() })
	p := &peer{conn: conn, events: make(chan Event, 256), closed: make(chan websocket.StatusCode, 1)}
	if strings.Contains(query, "noread=1") {
		return p
	}
	go func() {
		for {
			_, data, err := conn.Read(context.Background())
			if err != nil {
				p.closed <- websocket.CloseStatus(err)
				return
			}
			var ev Event
			if json.Unmarshal(data, &ev) == nil {
				p.events <- ev
			}
		}
	}()
	return p
}

// next returns the next event or fails after the timeout.
func next(t *testing.T, p *peer, timeout time.Duration) Event {
	t.Helper()
	select {
	case ev := <-p.events:
		return ev
	case code := <-p.closed:
		t.Fatalf("connection closed (%v) while waiting for an event", code)
	case <-time.After(timeout):
		t.Fatal("timed out waiting for an event")
	}
	return Event{}
}

// until returns the first event matching pred, skipping others.
func until(t *testing.T, p *peer, pred func(Event) bool) Event {
	t.Helper()
	deadline := time.After(3 * time.Second)
	for {
		select {
		case ev := <-p.events:
			if pred(ev) {
				return ev
			}
		case code := <-p.closed:
			t.Fatalf("connection closed (%v)", code)
		case <-deadline:
			t.Fatal("timed out waiting for a matching event")
		}
	}
}

// none asserts that no event arrives within the window.
func none(t *testing.T, p *peer, window time.Duration) {
	t.Helper()
	select {
	case ev := <-p.events:
		t.Fatalf("unexpected event: %+v", ev)
	case <-time.After(window):
	}
}

// drain discards whatever has arrived so far.
func drain(p *peer) {
	time.Sleep(50 * time.Millisecond)
	for {
		select {
		case <-p.events:
		default:
			return
		}
	}
}

func closeStatus(t *testing.T, p *peer) websocket.StatusCode {
	t.Helper()
	select {
	case code := <-p.closed:
		return code
	case <-time.After(5 * time.Second):
		t.Fatal("connection was not closed")
	}
	return 0
}

func presenceOf(t *testing.T, ev Event) PresenceData {
	t.Helper()
	if ev.Type != EventPresence || ev.V != ProtocolVersion || ev.EventID == "" || ev.TS.IsZero() || ev.TS.Location() != time.UTC {
		t.Fatalf("not a well-formed presence event: %+v", ev)
	}
	raw, _ := json.Marshal(ev.Data)
	var p PresenceData
	_ = json.Unmarshal(raw, &p)
	return p
}

func waitFor(t *testing.T, what string, cond func() bool) {
	t.Helper()
	deadline := time.Now().Add(3 * time.Second)
	for time.Now().Before(deadline) {
		if cond() {
			return
		}
		time.Sleep(10 * time.Millisecond)
	}
	t.Fatalf("timed out waiting for %s", what)
}

// "Manager online" follows live manager connections: a second tab keeps
// the manager online when the first closes, and going offline is announced
// only after the grace period.
func TestPresence_ManagerTabs(t *testing.T) {
	h := newHarness(t, testLimits())
	visitor := h.dial("conv=c1")
	if p := presenceOf(t, next(t, visitor, time.Second)); p.Subject != "managers" || *p.ManagersOnline {
		t.Fatalf("initial presence: %+v", p)
	}

	tab1 := h.dial("role=manager&staff=s1&session=a")
	if p := presenceOf(t, next(t, visitor, time.Second)); !*p.ManagersOnline {
		t.Fatalf("manager connected, visitor got %+v", p)
	}
	tab2 := h.dial("role=manager&staff=s1&session=b")
	none(t, visitor, 150*time.Millisecond) // same manager, no change

	_ = tab1.conn.Close(websocket.StatusNormalClosure, "")
	none(t, visitor, 250*time.Millisecond) // tab2 still connected

	_ = tab2.conn.Close(websocket.StatusNormalClosure, "")
	start := time.Now()
	p := presenceOf(t, next(t, visitor, 2*time.Second))
	if *p.ManagersOnline || time.Since(start) < 50*time.Millisecond {
		t.Fatalf("offline must be announced after the grace period: %+v after %v", p, time.Since(start))
	}
}

// A page reload within the grace period does not flicker presence.
func TestPresence_ReconnectWithinGrace(t *testing.T) {
	h := newHarness(t, testLimits())
	manager := h.dial("role=manager&staff=s1&session=a")
	drain(manager) // presence snapshots

	v1 := h.dial("conv=c1")
	p := presenceOf(t, until(t, manager, func(ev Event) bool { return ev.ConversationID == "c1" }))
	if p.Subject != "visitor" || p.ConversationID != "c1" || !*p.VisitorOnline {
		t.Fatalf("visitor online: %+v", p)
	}
	_ = v1.conn.Close(websocket.StatusNormalClosure, "")
	h.dial("conv=c1") // reload
	none(t, manager, 250*time.Millisecond)
}

func TestFanOut_ConversationIsolation(t *testing.T) {
	h := newHarness(t, testLimits())
	a := h.dial("conv=a")
	b := h.dial("conv=b")
	next(t, a, time.Second)
	next(t, b, time.Second)

	h.hub.ToConversation("a", NewEvent(EventNewMessage, "", map[string]string{"body": "for a"}))
	if ev := next(t, a, time.Second); ev.Type != EventNewMessage {
		t.Fatalf("a: %+v", ev)
	}
	none(t, b, 150*time.Millisecond)
}

// A client that cannot keep up is disconnected instead of blocking others
// or growing an unbounded queue.
func TestSlowConsumer_Disconnected(t *testing.T) {
	limits := testLimits()
	limits.SendQueue = 2
	h := newHarness(t, limits)
	slow := h.dial("conv=c1&noserve=1") // registered, nothing drains its queue
	fast := h.dial("conv=c1")
	next(t, fast, time.Second)
	waitFor(t, "both registered", func() bool { return h.hub.Stats().Visitors == 2 })

	for i := 0; i < 5; i++ {
		h.hub.ToConversation("c1", NewEvent(EventTyping, "", nil))
		time.Sleep(20 * time.Millisecond) // the fast client keeps up between events
	}
	if code := closeStatus(t, slow); code != CloseSlowConsumer {
		t.Fatalf("slow consumer close code %v", code)
	}
	for i := 0; i < 5; i++ {
		if ev := next(t, fast, time.Second); ev.Type != EventTyping {
			t.Fatalf("fast client: %+v", ev)
		}
	}
}

func TestLimits_ConnectionsPerIPAndStaff(t *testing.T) {
	limits := testLimits()
	limits.MaxVisitorsPerIP = 2
	limits.MaxManagersPerStaff = 1
	h := newHarness(t, limits)
	h.dial("conv=a")
	h.dial("conv=b")
	waitFor(t, "2 visitors", func() bool { return h.hub.Stats().Visitors == 2 })

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	url := "ws" + strings.TrimPrefix(h.srv.URL, "http")
	if _, resp, err := websocket.Dial(ctx, url+"/?conv=c", nil); err == nil || resp == nil || resp.StatusCode != http.StatusTooManyRequests {
		t.Fatalf("third visitor from one IP must get 429, got err=%v", err)
	}
	h.dial("conv=d&ip=198.51.100.7") // another IP is fine

	h.dial("role=manager&staff=s1&session=a")
	waitFor(t, "manager", func() bool { return h.hub.Stats().Managers == 1 })
	if _, resp, err := websocket.Dial(ctx, url+"/?role=manager&staff=s1&session=b", nil); err == nil || resp.StatusCode != http.StatusTooManyRequests {
		t.Fatal("second tab over the per-staff limit must get 429")
	}
}

func TestFrameFlood_RateLimitedThenClosed(t *testing.T) {
	limits := testLimits()
	limits.FrameBurst = 3
	limits.FramesPerSecond = 0.1
	limits.FrameStrikes = 4
	h := newHarness(t, limits)
	conn := h.dial("conv=c1")
	next(t, conn, time.Second)

	ctx := context.Background()
	for i := 0; i < 10; i++ {
		if err := conn.conn.Write(ctx, websocket.MessageText, []byte(`{"type":"ping","request_id":"r"}`)); err != nil {
			break
		}
	}
	pongs, limited := 0, 0
	for done := false; !done; {
		select {
		case ev := <-conn.events:
			switch ev.Type {
			case EventPong:
				pongs++
			case EventError:
				limited++
			}
		case code := <-conn.closed:
			if code != CloseTooManyFrames {
				t.Fatalf("close code %v", code)
			}
			// Events read before the close may still sit in the channel
			// (select picks randomly among ready cases): count them too.
			for drained := false; !drained; {
				select {
				case ev := <-conn.events:
					switch ev.Type {
					case EventPong:
						pongs++
					case EventError:
						limited++
					}
				default:
					drained = true
				}
			}
			done = true
		case <-time.After(3 * time.Second):
			t.Fatal("not closed")
		}
	}
	if pongs != 3 || limited != 3 {
		t.Fatalf("pongs=%d rate-limited=%d", pongs, limited)
	}
}

func TestReadLimit_TooBigFrameCloses(t *testing.T) {
	limits := testLimits()
	limits.ReadLimit = 256
	h := newHarness(t, limits)
	conn := h.dial("conv=c1")
	next(t, conn, time.Second)
	big := `{"type":"send_message","body":"` + strings.Repeat("x", 1000) + `"}`
	_ = conn.conn.Write(context.Background(), websocket.MessageText, []byte(big))
	if code := closeStatus(t, conn); code != websocket.StatusMessageTooBig {
		t.Fatalf("close code %v", code)
	}
}

func TestBadFrame_ErrorEvent(t *testing.T) {
	h := newHarness(t, testLimits())
	conn := h.dial("conv=c1")
	next(t, conn, time.Second)
	_ = conn.conn.Write(context.Background(), websocket.MessageText, []byte(`not json`))
	ev := next(t, conn, time.Second)
	if ev.Type != EventError {
		t.Fatalf("%+v", ev)
	}
}

// A peer that stops answering pings (network gone) is dropped and cleaned up.
func TestDeadPeer_PingTimeout(t *testing.T) {
	limits := testLimits()
	limits.PingInterval = 50 * time.Millisecond
	limits.PongTimeout = 50 * time.Millisecond
	h := newHarness(t, limits)
	h.dial("conv=c1&noread=1") // never read: pongs are only sent while the client reads
	waitFor(t, "registered", func() bool { return h.hub.Stats().Visitors == 1 })
	waitFor(t, "dead connection cleaned up", func() bool { return h.hub.Stats().Visitors == 0 })
}

func TestCloseSession_OnlyThatSession(t *testing.T) {
	h := newHarness(t, testLimits())
	a := h.dial("role=manager&staff=s1&session=aaa")
	b := h.dial("role=manager&staff=s1&session=bbb")
	waitFor(t, "two tabs", func() bool { return h.hub.Stats().Managers == 2 })

	h.hub.CloseSession([]byte("aaa"))
	if code := closeStatus(t, a); code != CloseSessionEnded {
		t.Fatalf("logout close code %v", code)
	}
	waitFor(t, "one tab left", func() bool { return h.hub.Stats().Managers == 1 })
	next(t, b, time.Second) // still connected and served
}

func TestShutdown_GoingAwayAndRefuse(t *testing.T) {
	h := newHarness(t, testLimits())
	conn := h.dial("conv=c1")
	next(t, conn, time.Second)

	done := make(chan struct{})
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		h.hub.Shutdown(ctx)
		close(done)
	}()
	if code := closeStatus(t, conn); code != websocket.StatusGoingAway {
		t.Fatalf("close code %v", code)
	}
	select {
	case <-done:
	case <-time.After(5 * time.Second):
		t.Fatal("shutdown did not finish")
	}
	if err := h.hub.CanAccept(RoleVisitor, "203.0.113.1", ""); err != ErrShuttingDown {
		t.Fatalf("after shutdown: %v", err)
	}
}
