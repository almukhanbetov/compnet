package middleware

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

func init() { gin.SetMode(gin.TestMode) }

func newEngine(handlers ...gin.HandlerFunc) *gin.Engine {
	engine := gin.New()
	engine.Use(handlers...)
	ok := func(c *gin.Context) { c.Status(http.StatusOK) }
	engine.GET("/x", ok)
	engine.POST("/x", ok)
	engine.PUT("/x", ok)
	return engine
}

func TestRequireAllowedOrigin(t *testing.T) {
	engine := newEngine(RequireAllowedOrigin([]string{"https://compnet.kz"}))

	tests := []struct {
		method, origin string
		want           int
	}{
		{http.MethodGet, "", http.StatusOK},
		{http.MethodGet, "https://evil.example", http.StatusOK},
		{http.MethodPost, "https://compnet.kz", http.StatusOK},
		{http.MethodPut, "https://compnet.kz", http.StatusOK},
		{http.MethodPost, "", http.StatusForbidden},
		{http.MethodPost, "https://evil.example", http.StatusForbidden},
		{http.MethodPost, "https://compnet.kz.evil.example", http.StatusForbidden},
		{http.MethodPut, "null", http.StatusForbidden},
	}

	for _, tt := range tests {
		req := httptest.NewRequest(tt.method, "/x", nil)
		if tt.origin != "" {
			req.Header.Set("Origin", tt.origin)
		}
		rec := httptest.NewRecorder()
		engine.ServeHTTP(rec, req)
		if rec.Code != tt.want {
			t.Errorf("%s Origin=%q: status %d, want %d", tt.method, tt.origin, rec.Code, tt.want)
		}
	}
}

func TestCORS_CredentialsOnlyForListedOrigin(t *testing.T) {
	engine := newEngine(CORS([]string{"https://compnet.kz"}))

	req := httptest.NewRequest(http.MethodGet, "/x", nil)
	req.Header.Set("Origin", "https://compnet.kz")
	rec := httptest.NewRecorder()
	engine.ServeHTTP(rec, req)
	if rec.Header().Get("Access-Control-Allow-Origin") != "https://compnet.kz" ||
		rec.Header().Get("Access-Control-Allow-Credentials") != "true" ||
		!strings.Contains(rec.Header().Get("Access-Control-Allow-Methods"), "PATCH") {
		t.Fatalf("allowed origin: headers %v", rec.Header())
	}

	req = httptest.NewRequest(http.MethodGet, "/x", nil)
	req.Header.Set("Origin", "https://evil.example")
	rec = httptest.NewRecorder()
	engine.ServeHTTP(rec, req)
	if rec.Header().Get("Access-Control-Allow-Origin") != "" ||
		rec.Header().Get("Access-Control-Allow-Credentials") != "" {
		t.Fatalf("foreign origin got CORS headers: %v", rec.Header())
	}
}

type denyAfter struct{ left int }

func (d *denyAfter) Allow(string) (bool, time.Duration) {
	if d.left <= 0 {
		return false, 1500 * time.Millisecond
	}
	d.left--
	return true, 0
}

func TestRateLimitByIP(t *testing.T) {
	engine := newEngine(RateLimitByIP(&denyAfter{left: 1}))

	rec := httptest.NewRecorder()
	engine.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/x", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("first request: %d", rec.Code)
	}

	rec = httptest.NewRecorder()
	engine.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/x", nil))
	if rec.Code != http.StatusTooManyRequests {
		t.Fatalf("second request: %d, want 429", rec.Code)
	}
	if got := rec.Header().Get("Retry-After"); got != "2" {
		t.Fatalf("Retry-After = %q, want 2", got)
	}
}
