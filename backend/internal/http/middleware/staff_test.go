package middleware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"

	"github.com/almukha/compnet-backend/internal/apperr"
	"github.com/almukha/compnet-backend/internal/domain/staff"
)

type fakeAuth map[string]error

func (f fakeAuth) Authenticate(_ context.Context, token string) (staff.User, error) {
	if err, ok := f[token]; ok {
		return staff.User{}, err
	}
	return staff.User{ID: "u1", Role: staff.RoleManager}, nil
}

func TestRequireStaff(t *testing.T) {
	auth := fakeAuth{
		"":        apperr.Unauthorized("требуется вход"),
		"revoked": apperr.Unauthorized("требуется вход"),
		"client":  apperr.Forbidden("недостаточно прав"),
	}
	engine := gin.New()
	engine.GET("/x", NoStore(), RequireStaff(auth), func(c *gin.Context) {
		u, ok := StaffFromContext(c)
		if !ok || u.ID != "u1" {
			c.Status(http.StatusInternalServerError)
			return
		}
		c.Status(http.StatusOK)
	})

	tests := map[string]int{"": 401, "revoked": 401, "client": 403, "valid": 200}
	for token, want := range tests {
		req := httptest.NewRequest(http.MethodGet, "/x", nil)
		if token != "" {
			req.AddCookie(&http.Cookie{Name: ManagerCookieName, Value: token})
		}
		rec := httptest.NewRecorder()
		engine.ServeHTTP(rec, req)
		if rec.Code != want {
			t.Errorf("token %q: status %d, want %d", token, rec.Code, want)
		}
		if rec.Header().Get("Cache-Control") != "no-store" {
			t.Errorf("token %q: missing Cache-Control: no-store", token)
		}
	}
}
