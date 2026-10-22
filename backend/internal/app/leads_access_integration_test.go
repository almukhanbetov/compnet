package app_test

// Who may read GET /api/v1/manager/analytics/leads, through the real
// server and sessions. Run with TEST_DATABASE_URL.

import (
	"context"
	"net/http"
	"net/url"
	"testing"

	"github.com/almukha/compnet-backend/internal/app"
	"github.com/almukha/compnet-backend/internal/domain/staff"
	"github.com/almukha/compnet-backend/internal/http/middleware"
	"github.com/almukha/compnet-backend/internal/service/staffauth"
)

const leadsPath = "/api/v1/manager/analytics/leads?from=2025-06-10&to=2025-06-12"

// staffAccount creates another staff member and returns a signed-in actor.
func (e *env) staffAccount(t *testing.T, s *server, role staff.Role) (*actor, string) {
	t.Helper()
	email, pass := "acl-"+randomHex(6)+"@test.local", randomHex(12)
	auth, err := app.NewStaffAuthService(e.pool, e.cfg, app.DefaultLimiters())
	if err != nil {
		t.Fatal(err)
	}
	if _, err := auth.CreateStaff(context.Background(), staffauth.CreateStaffInput{
		Email: email, DisplayName: "Проверка доступа", Role: role, Password: pass,
	}); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		_, _ = e.pool.Exec(context.Background(), `DELETE FROM staff_users WHERE email = $1`, email)
	})
	a := s.actor(t)
	if code, body := a.do("POST", "/api/v1/manager/auth/login", map[string]string{"email": email, "password": pass}); code != 200 {
		t.Fatalf("login %s: %d %s", role, code, body)
	}
	return a, email
}

// withCookie is an actor whose only manager cookie has the given value.
func (s *server) withCookie(t *testing.T, value string) *actor {
	a := s.actor(t)
	u, _ := url.Parse(s.srv.URL + middleware.ManagerCookiePath)
	a.jar.SetCookies(u, []*http.Cookie{{Name: middleware.ManagerCookieName, Value: value, Path: middleware.ManagerCookiePath}})
	return a
}

func managerToken(a *actor) string {
	u, _ := url.Parse(a.s.srv.URL + middleware.ManagerCookiePath)
	for _, c := range a.jar.Cookies(u) {
		if c.Name == middleware.ManagerCookieName {
			return c.Value
		}
	}
	return ""
}

func TestLeads_AccessControl(t *testing.T) {
	e := newEnv(t)
	s := e.start()
	ctx := context.Background()

	expect := func(t *testing.T, a *actor, want int) {
		t.Helper()
		if code, body := a.do("GET", leadsPath, nil); code != want {
			t.Fatalf("status %d, want %d: %s", code, want, body)
		}
	}

	t.Run("manager with access", func(t *testing.T) {
		mgr := s.actor(t)
		mgr.login(e)
		expect(t, mgr, 200)
	})
	t.Run("admin", func(t *testing.T) {
		admin, _ := e.staffAccount(t, s, staff.RoleAdmin)
		expect(t, admin, 200)
	})
	t.Run("not signed in", func(t *testing.T) {
		expect(t, s.actor(t), 401)
	})
	t.Run("site visitor with a chat session", func(t *testing.T) {
		visitor := s.actor(t)
		visitor.startChat()
		expect(t, visitor, 401)
	})
	t.Run("malformed session cookie", func(t *testing.T) {
		expect(t, s.withCookie(t, "not-a-token"), 401)
	})
	t.Run("well-formed but unknown session", func(t *testing.T) {
		mgr := s.actor(t)
		mgr.login(e)
		token := []byte(managerToken(mgr))
		// Same length and alphabet, another value.
		if token[0] == 'A' {
			token[0] = 'B'
		} else {
			token[0] = 'A'
		}
		expect(t, s.withCookie(t, string(token)), 401)
	})
	t.Run("session after logout", func(t *testing.T) {
		mgr := s.actor(t)
		mgr.login(e)
		token := managerToken(mgr)
		if code, _ := mgr.do("POST", "/api/v1/manager/auth/logout", nil); code != 200 && code != 204 {
			t.Fatalf("logout: %d", code)
		}
		expect(t, s.withCookie(t, token), 401)
	})
	t.Run("expired session", func(t *testing.T) {
		a, email := e.staffAccount(t, s, staff.RoleManager)
		if _, err := e.pool.Exec(ctx, `
			UPDATE staff_sessions SET created_at = now() - interval '2 hours', expires_at = now() - interval '1 hour'
			WHERE staff_user_id = (SELECT id FROM staff_users WHERE email = $1)`, email); err != nil {
			t.Fatal(err)
		}
		expect(t, a, 401)
	})
	t.Run("deactivated account", func(t *testing.T) {
		a, email := e.staffAccount(t, s, staff.RoleManager)
		expect(t, a, 200)
		if _, err := e.pool.Exec(ctx, `UPDATE staff_users SET is_active = false WHERE email = $1`, email); err != nil {
			t.Fatal(err)
		}
		expect(t, a, 401)
	})
	t.Run("ordinary staff role without the manager section", func(t *testing.T) {
		a, email := e.staffAccount(t, s, staff.RoleManager)
		if _, err := e.pool.Exec(ctx, `UPDATE staff_users SET role = 'support' WHERE email = $1`, email); err != nil {
			t.Fatal(err)
		}
		expect(t, a, 403)
	})
	t.Run("statistics are never cached", func(t *testing.T) {
		mgr := s.actor(t)
		mgr.login(e)
		req, _ := http.NewRequest("GET", s.srv.URL+leadsPath, nil)
		req.Header.Set("Origin", testOrigin)
		resp, err := mgr.client.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		resp.Body.Close()
		if got := resp.Header.Get("Cache-Control"); got != "no-store" {
			t.Errorf("Cache-Control = %q", got)
		}
	})
}
