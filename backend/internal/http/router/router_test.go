package router

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/almukha/compnet-backend/internal/domain/projectrequest"
	"github.com/almukha/compnet-backend/internal/http/handler"
	"github.com/almukha/compnet-backend/internal/ratelimit"
	projectrequestsvc "github.com/almukha/compnet-backend/internal/service/projectrequest"
)

func init() { gin.SetMode(gin.TestMode) }

// memoryRepository stands in for PostgreSQL: it counts saved requests.
type memoryRepository struct {
	mu    sync.Mutex
	saved []projectrequest.ProjectRequest
}

func (r *memoryRepository) Create(
	_ context.Context,
	request projectrequest.ProjectRequest,
	_ []projectrequest.Feature,
	estimate projectrequest.Estimate,
) (projectrequest.ProjectRequest, projectrequest.Estimate, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	request.ID = "00000000-0000-4000-8000-000000000001"
	request.CreatedAt = time.Now()
	r.saved = append(r.saved, request)
	return request, estimate, nil
}

func (r *memoryRepository) count() int {
	r.mu.Lock()
	defer r.mu.Unlock()
	return len(r.saved)
}

type countingNotifier struct {
	mu    sync.Mutex
	calls int
}

func (n *countingNotifier) RequestCreated(context.Context, string) {
	n.mu.Lock()
	n.calls++
	n.mu.Unlock()
}

type requestsServer struct {
	engine   *gin.Engine
	repo     *memoryRepository
	notifier *countingNotifier
}

// newRequestsServer builds the real router with the real project-request
// service; only the database is replaced.
func newRequestsServer(t *testing.T, burst int, trustedProxies []string) *requestsServer {
	t.Helper()
	repo := &memoryRepository{}
	notifier := &countingNotifier{}
	svc := projectrequestsvc.NewService(repo)
	svc.SetNotifier(notifier)
	engine, err := New(Deps{
		ProjectRequest:          handler.NewProjectRequestHandler(svc),
		ProjectRequestIPLimiter: ratelimit.New(1, time.Hour, burst),
		CORSAllowedOrigins:      []string{"https://compnet.kz"},
		TrustedProxies:          trustedProxies,
	})
	if err != nil {
		t.Fatal(err)
	}
	return &requestsServer{engine: engine, repo: repo, notifier: notifier}
}

// formBody is what ProjectEstimateForm sends for a mobile app.
func formBody(overrides map[string]any) map[string]any {
	body := map[string]any{
		"name": "Айгерим", "phone": "+7 (701) 123-45-67", "email": "", "company": "",
		"project_type": "mobile-app", "description": "Приложение для доставки цветов",
		"budget_range": "пока не определён", "desired_timeline": "пока не определён",
		"contact_method": "phone", "consent": true,
		"calculator": map[string]any{
			"scale_tier_id": "app-s", "selected_module_ids": []string{}, "external_api_count": 0,
			"multilingual": false, "design_level_id": "basic", "complexity_id": "standard", "urgency_id": "normal",
		},
	}
	for k, v := range overrides {
		body[k] = v
	}
	return body
}

type call struct {
	remoteAddr string
	xff        string
	body       any
	raw        []byte
}

func (s *requestsServer) post(t *testing.T, c call) *httptest.ResponseRecorder {
	t.Helper()
	raw := c.raw
	if raw == nil {
		raw, _ = json.Marshal(c.body)
	}
	req := httptest.NewRequest(http.MethodPost, "/api/v1/project-requests", bytes.NewReader(raw))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Origin", "https://compnet.kz")
	req.RemoteAddr = c.remoteAddr
	if req.RemoteAddr == "" {
		req.RemoteAddr = "203.0.113.10:51000"
	}
	if c.xff != "" {
		req.Header.Set("X-Forwarded-For", c.xff)
	}
	rec := httptest.NewRecorder()
	s.engine.ServeHTTP(rec, req)
	return rec
}

type errorBody struct {
	Error struct {
		Code   string            `json:"code"`
		Fields map[string]string `json:"fields"`
	} `json:"error"`
}

func decodeError(t *testing.T, rec *httptest.ResponseRecorder) errorBody {
	t.Helper()
	var body errorBody
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("error body %q: %v", rec.Body.String(), err)
	}
	return body
}

func TestProjectRequests_SubmitSavesAndNotifies(t *testing.T) {
	s := newRequestsServer(t, 5, nil)

	rec := s.post(t, call{body: formBody(nil)})
	if rec.Code != http.StatusCreated {
		t.Fatalf("status %d: %s", rec.Code, rec.Body)
	}
	var created struct {
		Data struct {
			ID       string `json:"id"`
			Status   string `json:"status"`
			Estimate struct {
				MinimumTenge *int64 `json:"minimum_tenge"`
			} `json:"estimate"`
		} `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &created); err != nil {
		t.Fatal(err)
	}
	if created.Data.ID == "" || created.Data.Status != "new" || created.Data.Estimate.MinimumTenge == nil {
		t.Errorf("response: %s", rec.Body)
	}
	if s.repo.count() != 1 || s.notifier.calls != 1 {
		t.Errorf("saved %d, notified %d; want 1 and 1", s.repo.count(), s.notifier.calls)
	}
}

func TestProjectRequests_RepeatedSubmitsGet429(t *testing.T) {
	s := newRequestsServer(t, 2, nil)

	for i := range 2 {
		if rec := s.post(t, call{body: formBody(nil)}); rec.Code != http.StatusCreated {
			t.Fatalf("submit %d: %d %s", i+1, rec.Code, rec.Body)
		}
	}
	rec := s.post(t, call{body: formBody(nil)})
	if rec.Code != http.StatusTooManyRequests {
		t.Fatalf("third submit: %d, want 429", rec.Code)
	}
	if got := rec.Header().Get("Retry-After"); got == "" || got == "0" {
		t.Errorf("Retry-After = %q", got)
	}
	if code := decodeError(t, rec).Error.Code; code != "rate_limited" {
		t.Errorf("error code = %q", code)
	}
	if s.repo.count() != 2 || s.notifier.calls != 2 {
		t.Errorf("limited request reached the service: saved %d, notified %d", s.repo.count(), s.notifier.calls)
	}

	// Another visitor is not affected.
	if rec := s.post(t, call{remoteAddr: "198.51.100.7:40000", body: formBody(nil)}); rec.Code != http.StatusCreated {
		t.Fatalf("other IP: %d", rec.Code)
	}
}

// Validation failures and bot submissions spend the budget too, so neither
// can be used to probe the endpoint without limit.
func TestProjectRequests_EveryAttemptCounts(t *testing.T) {
	s := newRequestsServer(t, 2, nil)

	if rec := s.post(t, call{body: formBody(map[string]any{"consent": false})}); rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("invalid: %d", rec.Code)
	}
	if rec := s.post(t, call{body: formBody(map[string]any{"website": "spam"})}); rec.Code != http.StatusCreated {
		t.Fatalf("bot: %d", rec.Code)
	}
	if rec := s.post(t, call{body: formBody(nil)}); rec.Code != http.StatusTooManyRequests {
		t.Fatalf("third attempt: %d, want 429", rec.Code)
	}
}

// Without trusted proxies the TCP peer is the client: a forged
// X-Forwarded-For does not buy a fresh limit.
func TestProjectRequests_ForgedForwardedForIgnored(t *testing.T) {
	s := newRequestsServer(t, 1, nil)

	if rec := s.post(t, call{xff: "1.1.1.1", body: formBody(nil)}); rec.Code != http.StatusCreated {
		t.Fatalf("first: %d", rec.Code)
	}
	if rec := s.post(t, call{xff: "2.2.2.2", body: formBody(nil)}); rec.Code != http.StatusTooManyRequests {
		t.Fatalf("forged XFF from the same peer: %d, want 429", rec.Code)
	}
}

// Behind the production nginx ($proxy_add_x_forwarded_for) the backend
// sees the docker gateway as the peer; the client's real IP is the last
// X-Forwarded-For entry, anything before it is client-supplied.
func TestProjectRequests_TrustedProxyUsesRealClientIP(t *testing.T) {
	const gateway = "172.19.0.1"
	s := newRequestsServer(t, 1, []string{gateway})
	viaProxy := func(xff string) call {
		return call{remoteAddr: gateway + ":40000", xff: xff, body: formBody(nil)}
	}

	if rec := s.post(t, viaProxy("203.0.113.5")); rec.Code != http.StatusCreated {
		t.Fatalf("client A: %d", rec.Code)
	}
	if rec := s.post(t, viaProxy("9.9.9.9, 203.0.113.5")); rec.Code != http.StatusTooManyRequests {
		t.Fatalf("client A with a forged prefix: %d, want 429", rec.Code)
	}
	if rec := s.post(t, viaProxy("198.51.100.20")); rec.Code != http.StatusCreated {
		t.Fatalf("client B behind the same proxy: %d", rec.Code)
	}
}

func TestProjectRequests_HoneypotLooksSavedButIsNot(t *testing.T) {
	s := newRequestsServer(t, 5, nil)

	rec := s.post(t, call{body: formBody(map[string]any{"website": "https://spam.example", "name": ""})})
	if rec.Code != http.StatusCreated || !strings.Contains(rec.Body.String(), `"status":"new"`) {
		t.Fatalf("bot: %d %s", rec.Code, rec.Body)
	}
	if s.repo.count() != 0 || s.notifier.calls != 0 {
		t.Fatalf("bot request saved %d, notified %d", s.repo.count(), s.notifier.calls)
	}
}

func TestProjectRequests_Errors(t *testing.T) {
	tests := []struct {
		name      string
		call      call
		status    int
		code      string
		badFields []string
	}{
		{
			name:   "validation",
			call:   call{body: formBody(map[string]any{"name": " ", "phone": "", "consent": false})},
			status: http.StatusUnprocessableEntity, code: "validation_error",
			badFields: []string{"name", "phone", "email", "consent"},
		},
		{
			name:   "unicode over limit",
			call:   call{body: formBody(map[string]any{"description": strings.Repeat("ж", 2001)})},
			status: http.StatusUnprocessableEntity, code: "validation_error",
			badFields: []string{"description"},
		},
		{
			name:   "malformed JSON",
			call:   call{raw: []byte(`{"name":`)},
			status: http.StatusBadRequest, code: "bad_request",
		},
		{
			name:   "oversized body",
			call:   call{body: formBody(map[string]any{"company": strings.Repeat("x", projectRequestMaxBodyBytes)})},
			status: http.StatusBadRequest, code: "bad_request",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := newRequestsServer(t, 5, nil)
			rec := s.post(t, tt.call)
			if rec.Code != tt.status {
				t.Fatalf("status %d, want %d: %s", rec.Code, tt.status, rec.Body)
			}
			body := decodeError(t, rec)
			if body.Error.Code != tt.code {
				t.Errorf("code %q, want %q", body.Error.Code, tt.code)
			}
			for _, field := range tt.badFields {
				if _, ok := body.Error.Fields[field]; !ok {
					t.Errorf("no error for %q: %v", field, body.Error.Fields)
				}
			}
			if s.repo.count() != 0 || s.notifier.calls != 0 {
				t.Errorf("failed request saved %d, notified %d", s.repo.count(), s.notifier.calls)
			}
		})
	}
}

// The largest valid form — every text field at its limit in 4-byte
// characters — still fits under the body cap.
func TestProjectRequests_LargestValidFormFits(t *testing.T) {
	s := newRequestsServer(t, 5, nil)
	rec := s.post(t, call{body: formBody(map[string]any{
		"name":             strings.Repeat("😀", 200),
		"company":          strings.Repeat("😀", 200),
		"description":      strings.Repeat("😀", 2000),
		"budget_range":     strings.Repeat("😀", 100),
		"desired_timeline": strings.Repeat("😀", 100),
	})})
	if rec.Code != http.StatusCreated {
		t.Fatalf("status %d: %s", rec.Code, rec.Body)
	}
}
