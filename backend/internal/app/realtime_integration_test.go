package app_test

// Integration tests of the realtime chat: the real server (app.Build), a
// real, fully migrated PostgreSQL and real WebSocket connections. They run
// only with TEST_DATABASE_URL set, e.g.
//
//	TEST_DATABASE_URL=postgres://...:5452/compnet_test?sslmode=disable go test -race ./internal/app/

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/cookiejar"
	"net/http/httptest"
	"net/url"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/coder/websocket"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/almukha/compnet-backend/internal/app"
	"github.com/almukha/compnet-backend/internal/config"
	"github.com/almukha/compnet-backend/internal/domain/staff"
	"github.com/almukha/compnet-backend/internal/ratelimit"
	"github.com/almukha/compnet-backend/internal/realtime"
	"github.com/almukha/compnet-backend/internal/service/staffauth"
)

const testOrigin = "http://frontend.test"

// fast is how long an event may take to arrive and still count as "instant".
const fast = time.Second

type env struct {
	t     *testing.T
	pool  *pgxpool.Pool
	cfg   config.Config
	email string
	pass  string

	mu      sync.Mutex
	convIDs map[string]bool
	servers []*server
}

type server struct {
	app *app.App
	srv *httptest.Server
}

func newEnv(t *testing.T) *env {
	t.Helper()
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("TEST_DATABASE_URL not set; skipping PostgreSQL + WebSocket integration test")
	}
	pool, err := pgxpool.New(context.Background(), dsn)
	if err != nil {
		t.Fatal(err)
	}
	e := &env{
		t:    t,
		pool: pool,
		cfg: config.Config{
			CORSAllowedOrigins: []string{testOrigin},
			Cookie: config.CookieConfig{
				Secure: false, SameSite: http.SameSiteLaxMode,
				ChatTTL: time.Hour, ManagerSessionTTL: time.Hour,
			},
		},
		email:   fmt.Sprintf("rt-%s@test.local", randomHex(6)),
		pass:    randomHex(12),
		convIDs: map[string]bool{},
	}
	t.Cleanup(e.cleanup)

	auth, err := app.NewStaffAuthService(pool, e.cfg, app.DefaultLimiters())
	if err != nil {
		t.Fatal(err)
	}
	if _, err := auth.CreateStaff(context.Background(), staffauth.CreateStaffInput{
		Email: e.email, DisplayName: "Тест Менеджер", Role: staff.RoleManager, Password: e.pass,
	}); err != nil {
		t.Fatal(err)
	}
	return e
}

func (e *env) cleanup() {
	ctx := context.Background()
	for _, s := range e.servers {
		sctx, cancel := context.WithTimeout(ctx, 5*time.Second)
		s.app.Hub.Shutdown(sctx)
		cancel()
		s.srv.Close()
	}
	e.mu.Lock()
	ids := make([]string, 0, len(e.convIDs))
	for id := range e.convIDs {
		ids = append(ids, id)
	}
	e.mu.Unlock()
	_, _ = e.pool.Exec(ctx, `DELETE FROM chat_conversations WHERE id = ANY($1::uuid[])`, ids)
	_, _ = e.pool.Exec(ctx, `DELETE FROM staff_users WHERE email = $1`, e.email)
	e.pool.Close()
}

func (e *env) track(convID string) {
	if convID == "" {
		return
	}
	e.mu.Lock()
	e.convIDs[convID] = true
	e.mu.Unlock()
}

// start builds and serves a backend process on the shared database.
func (e *env) start() *server {
	e.t.Helper()
	lim := app.DefaultLimiters()
	// Many visitors and logins from 127.0.0.1 in one test; message limits stay real.
	lim.ChatConversations = ratelimit.New(1000, time.Minute, 1000)
	lim.ChatIP = ratelimit.New(10000, time.Minute, 10000)
	lim.ManagerIP = ratelimit.New(10000, time.Minute, 10000)
	lim.LoginIP = ratelimit.New(1000, time.Minute, 1000)
	lim.LoginEmail = ratelimit.New(1000, time.Minute, 1000)
	lim.ProjectRequestIP = ratelimit.New(1000, time.Minute, 1000)
	rt := realtime.DefaultLimits()
	rt.PresenceGrace = 150 * time.Millisecond
	rt.RevalidateEvery = 300 * time.Millisecond

	a, err := app.Build(e.pool, e.cfg, app.Options{Limiters: &lim, Realtime: &rt})
	if err != nil {
		e.t.Fatal(err)
	}
	s := &server{app: a, srv: httptest.NewServer(a.Engine)}
	e.servers = append(e.servers, s)
	return s
}

// actor is one browser profile: its own cookie jar.
type actor struct {
	t      *testing.T
	s      *server
	jar    *cookiejar.Jar
	client *http.Client
}

func (s *server) actor(t *testing.T) *actor {
	jar, _ := cookiejar.New(nil)
	return &actor{t: t, s: s, jar: jar, client: &http.Client{Jar: jar, Timeout: 10 * time.Second}}
}

// on moves the actor (cookies included) to another server process.
func (a *actor) on(s *server) *actor {
	moved := s.actor(a.t)
	old, _ := url.Parse(a.s.srv.URL)
	next, _ := url.Parse(s.srv.URL)
	for _, p := range []string{"/api/v1/chat", "/api/v1/manager"} {
		old.Path, next.Path = p, p
		moved.jar.SetCookies(next, a.jar.Cookies(old))
	}
	return moved
}

func (a *actor) do(method, path string, body any) (int, []byte) {
	a.t.Helper()
	var reader io.Reader
	if body != nil {
		raw, _ := json.Marshal(body)
		reader = bytes.NewReader(raw)
	}
	req, _ := http.NewRequest(method, a.s.srv.URL+path, reader)
	req.Header.Set("Origin", testOrigin)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	resp, err := a.client.Do(req)
	if err != nil {
		a.t.Fatalf("%s %s: %v", method, path, err)
	}
	defer resp.Body.Close()
	data, _ := io.ReadAll(resp.Body)
	return resp.StatusCode, data
}

func (a *actor) login(e *env) {
	a.t.Helper()
	if code, body := a.do("POST", "/api/v1/manager/auth/login", map[string]string{"email": e.email, "password": e.pass}); code != 200 {
		a.t.Fatalf("login: %d %s", code, body)
	}
}

func (a *actor) startChat() {
	a.t.Helper()
	if code, body := a.do("POST", "/api/v1/chat/session", map[string]string{}); code != 201 && code != 200 {
		a.t.Fatalf("session: %d %s", code, body)
	}
}

type event struct {
	V              int             `json:"v"`
	Type           string          `json:"type"`
	EventID        string          `json:"event_id"`
	TS             time.Time       `json:"ts"`
	ConversationID string          `json:"conversation_id"`
	RequestID      string          `json:"request_id"`
	Data           json.RawMessage `json:"data"`
}

func (ev event) decode(t *testing.T, into any) {
	t.Helper()
	if err := json.Unmarshal(ev.Data, into); err != nil {
		t.Fatalf("decode %s: %v (%s)", ev.Type, err, ev.Data)
	}
}

type socket struct {
	t      *testing.T
	conn   *websocket.Conn
	events chan event
	closed chan websocket.StatusCode
}

func (a *actor) dial(path string, origin string) (*socket, int) {
	a.t.Helper()
	u, _ := url.Parse(a.s.srv.URL + path)
	header := http.Header{}
	if origin != "" {
		header.Set("Origin", origin)
	}
	var cookies []string
	for _, c := range a.jar.Cookies(u) {
		cookies = append(cookies, c.Name+"="+c.Value)
	}
	if len(cookies) > 0 {
		header.Set("Cookie", strings.Join(cookies, "; "))
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	conn, resp, err := websocket.Dial(ctx, "ws"+strings.TrimPrefix(u.String(), "http"), &websocket.DialOptions{HTTPHeader: header})
	if err != nil {
		status := 0
		if resp != nil {
			status = resp.StatusCode
		}
		return nil, status
	}
	s := &socket{t: a.t, conn: conn, events: make(chan event, 512), closed: make(chan websocket.StatusCode, 1)}
	a.t.Cleanup(func() { _ = conn.CloseNow() })
	go func() {
		for {
			_, data, err := conn.Read(context.Background())
			if err != nil {
				s.closed <- websocket.CloseStatus(err)
				return
			}
			var ev event
			if json.Unmarshal(data, &ev) == nil {
				s.events <- ev
			}
		}
	}()
	return s, 101
}

func (a *actor) ws(path string) *socket {
	a.t.Helper()
	s, status := a.dial(path, testOrigin)
	if s == nil {
		a.t.Fatalf("ws %s: handshake status %d", path, status)
	}
	return s
}

func (s *socket) send(frame map[string]any) {
	s.t.Helper()
	raw, _ := json.Marshal(frame)
	if err := s.conn.Write(context.Background(), websocket.MessageText, raw); err != nil {
		s.t.Fatalf("write: %v", err)
	}
}

// wait returns the first event of the given type matching pred within
// timeout, skipping others.
func (s *socket) wait(typ string, timeout time.Duration, pred func(event) bool) event {
	s.t.Helper()
	deadline := time.After(timeout)
	for {
		select {
		case ev := <-s.events:
			if ev.V != realtime.ProtocolVersion || ev.EventID == "" || ev.TS.IsZero() || ev.TS.Location() != time.UTC {
				s.t.Fatalf("malformed envelope: %+v", ev)
			}
			if ev.Type == typ && (pred == nil || pred(ev)) {
				return ev
			}
		case code := <-s.closed:
			s.t.Fatalf("socket closed (%v) while waiting for %s", code, typ)
		case <-deadline:
			s.t.Fatalf("no %s within %v", typ, timeout)
		}
	}
}

// never asserts that no event of the given type arrives within the window.
func (s *socket) never(typ string, window time.Duration) {
	s.t.Helper()
	deadline := time.After(window)
	for {
		select {
		case ev := <-s.events:
			if ev.Type == typ {
				s.t.Fatalf("unexpected %s: %s", typ, ev.Data)
			}
		case <-deadline:
			return
		}
	}
}

func (s *socket) closeCode(timeout time.Duration) websocket.StatusCode {
	s.t.Helper()
	select {
	case code := <-s.closed:
		return code
	case <-time.After(timeout):
		s.t.Fatalf("socket not closed within %v", timeout)
	}
	return 0
}

type message struct {
	ID              int64     `json:"id"`
	Author          string    `json:"author"`
	Body            string    `json:"body"`
	ClientMessageID string    `json:"client_message_id"`
	CreatedAt       time.Time `json:"created_at"`
}

type ack struct {
	ClientMessageID string  `json:"client_message_id"`
	Created         bool    `json:"created"`
	Message         message `json:"message"`
}

type managerNew struct {
	Message      message `json:"message"`
	Conversation struct {
		ID          string `json:"id"`
		Status      string `json:"status"`
		UnreadCount int    `json:"unread_count"`
		LastMessage struct {
			ID int64 `json:"id"`
		} `json:"last_message"`
	} `json:"conversation"`
	UnreadTotal struct {
		Conversations int `json:"conversations"`
		Messages      int `json:"messages"`
	} `json:"unread_total"`
}

func uuid() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	b[6] = b[6]&0x0f | 0x40
	b[8] = b[8]&0x3f | 0x80
	h := hex.EncodeToString(b)
	return h[:8] + "-" + h[8:12] + "-" + h[12:16] + "-" + h[16:20] + "-" + h[20:]
}

func randomHex(n int) string {
	b := make([]byte, n)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

func (e *env) countMessages(convID, clientID string) int {
	var n int
	_ = e.pool.QueryRow(context.Background(),
		`SELECT count(*) FROM chat_messages WHERE conversation_id = $1 AND client_message_id = $2`, convID, clientID).Scan(&n)
	return n
}

func TestRealtime_VisitorManagerRoundTrip(t *testing.T) {
	e := newEnv(t)
	s := e.start()

	mgr := s.actor(t)
	mgr.login(e)
	tab1 := mgr.ws("/api/v1/manager/ws")
	tab2 := mgr.ws("/api/v1/manager/ws")

	visitor := s.actor(t)
	visitor.startChat()
	vs := visitor.ws("/api/v1/chat/ws")
	p := vs.wait("presence", fast, nil)
	if !strings.Contains(string(p.Data), `"managers_online":true`) {
		t.Fatalf("visitor must see a connected manager: %s", p.Data)
	}
	if code, body := visitor.do("GET", "/api/v1/chat", nil); code != 200 || !strings.Contains(string(body), `"managers_online":true`) {
		t.Fatalf("GET /chat presence: %d %s", code, body)
	}

	// Visitor sends over the socket: ack only after commit, managers see it at once.
	clientID := uuid()
	sentAt := time.Now()
	vs.send(map[string]any{"type": "send_message", "request_id": "r1", "client_message_id": clientID, "body": "Здравствуйте! Нужен сайт."})
	ackEv := vs.wait("message_ack", fast, func(ev event) bool { return ev.RequestID == "r1" })
	var a ack
	ackEv.decode(t, &a)
	if !a.Created || a.Message.ID == 0 || a.Message.ClientMessageID != clientID || a.Message.CreatedAt.Location().String() != "UTC" && a.Message.CreatedAt.UTC() != a.Message.CreatedAt {
		t.Fatalf("ack: %+v", a)
	}
	var stored string
	if err := e.pool.QueryRow(context.Background(), `SELECT body FROM chat_messages WHERE id = $1`, a.Message.ID).Scan(&stored); err != nil {
		t.Fatalf("acked message must already be committed: %v", err)
	}

	newEv := tab1.wait("new_message", fast, func(ev event) bool { return strings.Contains(string(ev.Data), clientID) })
	var mn managerNew
	newEv.decode(t, &mn)
	convID := newEv.ConversationID
	e.track(convID)
	if convID == "" || mn.Conversation.ID != convID || mn.Conversation.UnreadCount != 1 || mn.Message.ID != a.Message.ID || mn.Conversation.LastMessage.ID != a.Message.ID || mn.UnreadTotal.Messages < 1 {
		t.Fatalf("manager new_message: conv=%s %+v", convID, mn)
	}
	t.Logf("visitor → manager delivery: %v", time.Since(sentAt))
	tab2.wait("new_message", fast, func(ev event) bool { return ev.ConversationID == convID })

	// Retry with the same client_message_id: no duplicate, same message.
	vs.send(map[string]any{"type": "send_message", "request_id": "r2", "client_message_id": clientID, "body": "Здравствуйте! Нужен сайт."})
	ackEv = vs.wait("message_ack", fast, func(ev event) bool { return ev.RequestID == "r2" })
	ackEv.decode(t, &a)
	if a.Created || e.countMessages(convID, clientID) != 1 {
		t.Fatalf("retry must not duplicate: %+v count=%d", a, e.countMessages(convID, clientID))
	}

	// Typing both ways; the visitor never learns ids or staff names.
	vs.send(map[string]any{"type": "typing", "is_typing": true})
	tab1.wait("typing", fast, func(ev event) bool {
		return ev.ConversationID == convID && strings.Contains(string(ev.Data), `"from":"visitor"`)
	})
	tab1.send(map[string]any{"type": "typing", "conversation_id": convID, "is_typing": true})
	ty := vs.wait("typing", fast, nil)
	if ty.ConversationID != "" || strings.Contains(string(ty.Data), "staff") || !strings.Contains(string(ty.Data), `"from":"manager"`) {
		t.Fatalf("visitor typing event leaks identity: %+v %s", ty, ty.Data)
	}

	// Manager replies over the socket: the visitor gets it at once.
	replyID := uuid()
	sentAt = time.Now()
	tab1.send(map[string]any{"type": "send_message", "request_id": "m1", "conversation_id": convID, "client_message_id": replyID, "body": "Добрый день! Какой сайт нужен?"})
	tab1.wait("message_ack", fast, func(ev event) bool { return ev.RequestID == "m1" && ev.ConversationID == convID })
	reply := vs.wait("new_message", fast, func(ev event) bool { return strings.Contains(string(ev.Data), "Какой сайт") })
	t.Logf("manager → visitor delivery: %v", time.Since(sentAt))
	var vm struct {
		Message     message `json:"message"`
		UnreadCount int     `json:"unread_count"`
	}
	reply.decode(t, &vm)
	if vm.Message.Author != "manager" || vm.UnreadCount != 1 || strings.Contains(string(reply.Data), "staff") || reply.ConversationID != "" {
		t.Fatalf("visitor view of reply: %s", reply.Data)
	}
	tab2.wait("new_message", fast, func(ev event) bool { return strings.Contains(string(ev.Data), replyID) })

	// Read markers: each side separately, synced to the other side and other tabs.
	tab1.send(map[string]any{"type": "mark_read", "conversation_id": convID, "last_message_id": a.Message.ID})
	vs.wait("messages_read", fast, func(ev event) bool {
		return strings.Contains(string(ev.Data), `"reader":"manager"`) && strings.Contains(string(ev.Data), fmt.Sprintf(`"last_read_id":%d`, a.Message.ID))
	})
	tab2.wait("messages_read", fast, func(ev event) bool {
		return ev.ConversationID == convID && strings.Contains(string(ev.Data), `"unread_count":0`)
	})
	vs.send(map[string]any{"type": "mark_read", "last_message_id": vm.Message.ID})
	tab1.wait("messages_read", fast, func(ev event) bool { return strings.Contains(string(ev.Data), `"reader":"visitor"`) })

	// Closing (HTTP) reaches the visitor and the other tab.
	if code, body := mgr.do("PATCH", "/api/v1/manager/conversations/"+convID, map[string]string{"status": "closed"}); code != 200 {
		t.Fatalf("close: %d %s", code, body)
	}
	vs.wait("conversation_updated", fast, func(ev event) bool { return strings.Contains(string(ev.Data), `"status":"closed"`) })
	tab2.wait("conversation_updated", fast, func(ev event) bool { return ev.ConversationID == convID })

	// HTTP fallback: a message sent over HTTP is delivered over the sockets
	// too, and reopens the closed conversation for managers.
	httpID := uuid()
	if code, body := visitor.do("POST", "/api/v1/chat/messages", map[string]string{"client_message_id": httpID, "body": "Отправлено через HTTP"}); code != 201 {
		t.Fatalf("http send: %d %s", code, body)
	}
	newEv = tab1.wait("new_message", fast, func(ev event) bool { return strings.Contains(string(ev.Data), httpID) })
	newEv.decode(t, &mn)
	if mn.Conversation.Status != "open" {
		t.Fatalf("visitor message must reopen: %+v", mn.Conversation)
	}

	// Message rate limit applies over the socket as over HTTP (burst 5:
	// two used above, the third one … the sixth is refused).
	limited := false
	for i := 0; i < 5 && !limited; i++ {
		rid := fmt.Sprintf("flood-%d", i)
		vs.send(map[string]any{"type": "send_message", "request_id": rid, "client_message_id": uuid(), "body": "flood"})
		deadline := time.After(fast)
	wait:
		for {
			select {
			case ev := <-vs.events:
				if ev.RequestID != rid {
					continue
				}
				if ev.Type == "error" {
					if !strings.Contains(string(ev.Data), `"code":"rate_limited"`) || !strings.Contains(string(ev.Data), "retry_after_seconds") {
						t.Fatalf("error: %s", ev.Data)
					}
					limited = true
				}
				break wait
			case <-deadline:
				t.Fatal("no answer to send_message")
			}
		}
	}
	if !limited {
		t.Fatal("message rate limit not applied over WebSocket")
	}
}

func TestRealtime_IsolationAndAuth(t *testing.T) {
	e := newEnv(t)
	s := e.start()
	mgr := s.actor(t)
	mgr.login(e)
	tab := mgr.ws("/api/v1/manager/ws")

	alice := s.actor(t)
	alice.startChat()
	as := alice.ws("/api/v1/chat/ws")
	bob := s.actor(t)
	bob.startChat()
	bs := bob.ws("/api/v1/chat/ws")

	aliceID := uuid()
	as.send(map[string]any{"type": "send_message", "request_id": "a", "client_message_id": aliceID, "body": "секрет Алисы"})
	as.wait("message_ack", fast, nil)
	ev := tab.wait("new_message", fast, func(ev event) bool { return strings.Contains(string(ev.Data), aliceID) })
	e.track(ev.ConversationID)
	tab.send(map[string]any{"type": "send_message", "request_id": "m", "conversation_id": ev.ConversationID, "client_message_id": uuid(), "body": "ответ Алисе"})
	as.wait("new_message", fast, func(ev event) bool { return strings.Contains(string(ev.Data), "ответ Алисе") })

	bs.never("new_message", 400*time.Millisecond)
	if code, body := bob.do("GET", "/api/v1/chat/messages?tail=1", nil); code != 200 || strings.Contains(string(body), "Алис") {
		t.Fatalf("bob history: %d %s", code, body)
	}

	// Manager endpoints refuse visitor cookies, forged and missing cookies.
	if code, _ := alice.do("GET", "/api/v1/manager/conversations/"+ev.ConversationID+"/messages", nil); code != 401 {
		t.Fatalf("visitor on manager API: %d", code)
	}
	if _, status := alice.dial("/api/v1/manager/ws", testOrigin); status != 401 {
		t.Fatalf("visitor on manager socket: %d", status)
	}
	forged := s.actor(t)
	u, _ := url.Parse(s.srv.URL + "/api/v1/manager")
	forged.jar.SetCookies(u, []*http.Cookie{{Name: "compnet_manager", Value: randomHex(32), Path: "/api/v1/manager"}})
	if _, status := forged.dial("/api/v1/manager/ws", testOrigin); status != 401 {
		t.Fatalf("forged manager cookie: %d", status)
	}

	// Cross-site WebSocket hijacking: wrong or missing Origin is refused.
	if _, status := mgr.dial("/api/v1/manager/ws", "https://evil.example"); status != 403 {
		t.Fatalf("wrong origin (manager): %d", status)
	}
	if _, status := alice.dial("/api/v1/chat/ws", "https://evil.example"); status != 403 {
		t.Fatalf("wrong origin (visitor): %d", status)
	}
	if _, status := alice.dial("/api/v1/chat/ws", ""); status != 403 {
		t.Fatalf("missing origin: %d", status)
	}

	// A manager frame cannot address a conversation that does not exist.
	tab.send(map[string]any{"type": "send_message", "request_id": "x", "conversation_id": uuid(), "client_message_id": uuid(), "body": "x"})
	errEv := tab.wait("error", fast, func(ev event) bool { return ev.RequestID == "x" })
	if !strings.Contains(string(errEv.Data), `"code":"not_found"`) {
		t.Fatalf("unknown conversation: %s", errEv.Data)
	}
}

// Logout and session revocation end manager connections; with another
// session still connected the manager stays online, and goes offline for
// visitors only when the last connection is gone.
func TestRealtime_LogoutRevocationAndPresence(t *testing.T) {
	e := newEnv(t)
	s := e.start()

	visitor := s.actor(t)
	visitor.startChat()
	vs := visitor.ws("/api/v1/chat/ws")
	if p := vs.wait("presence", fast, nil); !strings.Contains(string(p.Data), `"managers_online":false`) {
		t.Fatalf("no manager yet: %s", p.Data)
	}

	first := s.actor(t)
	first.login(e)
	tabA := first.ws("/api/v1/manager/ws")
	tabB := first.ws("/api/v1/manager/ws")
	vs.wait("presence", fast, func(ev event) bool { return strings.Contains(string(ev.Data), `"managers_online":true`) })

	second := s.actor(t)
	second.login(e)
	other := second.ws("/api/v1/manager/ws")

	if code, _ := first.do("POST", "/api/v1/manager/auth/logout", map[string]string{}); code != 204 {
		t.Fatalf("logout: %d", code)
	}
	for _, tab := range []*socket{tabA, tabB} {
		if code := tab.closeCode(fast); code != realtime.CloseSessionEnded {
			t.Fatalf("logout must close the session's sockets: %v", code)
		}
	}
	if _, status := first.dial("/api/v1/manager/ws", testOrigin); status != 401 {
		t.Fatalf("reconnect after logout: %d", status)
	}
	vs.never("presence", 400*time.Millisecond) // the second session keeps the manager online

	// Revoked elsewhere (or expired): the periodic re-check closes the socket.
	if _, err := e.pool.Exec(context.Background(),
		`UPDATE staff_sessions SET revoked_at = now() WHERE staff_user_id = (SELECT id FROM staff_users WHERE email = $1) AND revoked_at IS NULL`, e.email); err != nil {
		t.Fatal(err)
	}
	if code := other.closeCode(3 * time.Second); code != realtime.CloseSessionEnded {
		t.Fatalf("revoked session: %v", code)
	}
	vs.wait("presence", 2*time.Second, func(ev event) bool { return strings.Contains(string(ev.Data), `"managers_online":false`) })
}

// A backend restart: sockets are closed with "going away", history is in
// PostgreSQL, and messages written while a visitor was disconnected are
// recovered through the API after reconnecting.
func TestRealtime_RestartAndMissedEvents(t *testing.T) {
	e := newEnv(t)
	first := e.start()

	mgr := first.actor(t)
	mgr.login(e)
	tab := mgr.ws("/api/v1/manager/ws")
	visitor := first.actor(t)
	visitor.startChat()
	vs := visitor.ws("/api/v1/chat/ws")

	vs.send(map[string]any{"type": "send_message", "request_id": "1", "client_message_id": uuid(), "body": "до перезапуска"})
	var a ack
	vs.wait("message_ack", fast, nil).decode(t, &a)
	ev := tab.wait("new_message", fast, nil)
	convID := ev.ConversationID
	e.track(convID)

	// Restart: the old process closes its sockets with 1001.
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	first.app.Hub.Shutdown(ctx)
	cancel()
	if code := vs.closeCode(fast); code != websocket.StatusGoingAway {
		t.Fatalf("visitor close code on restart: %v", code)
	}
	if code := tab.closeCode(fast); code != websocket.StatusGoingAway {
		t.Fatalf("manager close code on restart: %v", code)
	}

	second := e.start()
	mgr2 := mgr.on(second)
	visitor2 := visitor.on(second)

	// While the visitor is disconnected the manager answers (HTTP).
	if code, body := mgr2.do("POST", "/api/v1/manager/conversations/"+convID+"/messages",
		map[string]string{"client_message_id": uuid(), "body": "ответ, пока вы были офлайн"}); code != 201 {
		t.Fatalf("reply: %d %s", code, body)
	}

	// Reconnect, then reconcile from PostgreSQL after the last seen id.
	vs2 := visitor2.ws("/api/v1/chat/ws")
	vs2.wait("presence", fast, nil)
	code, body := visitor2.do("GET", fmt.Sprintf("/api/v1/chat/messages?after=%d", a.Message.ID), nil)
	if code != 200 || !strings.Contains(string(body), "пока вы были офлайн") {
		t.Fatalf("missed message not recovered: %d %s", code, body)
	}
	code, body = visitor2.do("GET", "/api/v1/chat/messages?tail=1&limit=10", nil)
	if code != 200 || !strings.Contains(string(body), "до перезапуска") {
		t.Fatalf("history after restart: %d %s", code, body)
	}
	// And the new process delivers live again.
	tab2 := mgr2.ws("/api/v1/manager/ws")
	vs2.send(map[string]any{"type": "send_message", "request_id": "2", "client_message_id": uuid(), "body": "после перезапуска"})
	tab2.wait("new_message", fast, func(ev event) bool { return strings.Contains(string(ev.Data), "после перезапуска") })
}

// Concurrent sends into one conversation get increasing ids in commit
// order, so "after <last id>" never skips a message.
func TestRealtime_ConcurrentSendsOrdered(t *testing.T) {
	e := newEnv(t)
	s := e.start()
	mgr := s.actor(t)
	mgr.login(e)
	tab := mgr.ws("/api/v1/manager/ws")
	visitor := s.actor(t)
	visitor.startChat()
	if code, body := visitor.do("POST", "/api/v1/chat/messages", map[string]string{"client_message_id": uuid(), "body": "первое"}); code != 201 {
		t.Fatalf("%d %s", code, body)
	}
	convID := tab.wait("new_message", fast, nil).ConversationID
	e.track(convID)

	// A client polling "after <cursor>" while both sides write concurrently
	// must end up with every message: no id may become visible after the
	// cursor has already moved past it.
	seen := map[int64]bool{}
	var cursor int64
	poll := func() {
		code, body := visitor.do("GET", fmt.Sprintf("/api/v1/chat/messages?after=%d", cursor), nil)
		if code != 200 {
			t.Errorf("poll: %d", code)
			return
		}
		var page struct {
			Data []message `json:"data"`
		}
		_ = json.Unmarshal(body, &page)
		for _, m := range page.Data {
			seen[m.ID] = true
			if m.ID > cursor {
				cursor = m.ID
			}
		}
	}

	var wg sync.WaitGroup
	for i := 0; i < 10; i++ {
		wg.Add(2)
		go func(i int) {
			defer wg.Done()
			visitor.do("POST", "/api/v1/chat/messages", map[string]string{"client_message_id": uuid(), "body": fmt.Sprintf("v%d", i)})
		}(i)
		go func(i int) {
			defer wg.Done()
			mgr.do("POST", "/api/v1/manager/conversations/"+convID+"/messages", map[string]string{"client_message_id": uuid(), "body": fmt.Sprintf("m%d", i)})
		}(i)
	}
	done := make(chan struct{})
	go func() { wg.Wait(); close(done) }()
	for polling := true; polling; {
		select {
		case <-done:
			polling = false
		default:
			poll()
		}
	}
	poll()

	rows, err := e.pool.Query(context.Background(), `SELECT id FROM chat_messages WHERE conversation_id = $1 ORDER BY id`, convID)
	if err != nil {
		t.Fatal(err)
	}
	defer rows.Close()
	n := 0
	for rows.Next() {
		var id int64
		_ = rows.Scan(&id)
		if !seen[id] {
			t.Fatalf("message %d was skipped by the after-cursor poller", id)
		}
		n++
	}
	if n < 15 {
		t.Fatalf("expected the concurrent messages to be stored, got %d", n)
	}
}
