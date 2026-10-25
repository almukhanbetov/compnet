package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"

	"github.com/almukha/compnet-backend/internal/apperr"
	"github.com/almukha/compnet-backend/internal/domain/analytics"
	"github.com/almukha/compnet-backend/internal/domain/staff"
	"github.com/almukha/compnet-backend/internal/http/middleware"
	analyticssvc "github.com/almukha/compnet-backend/internal/service/analytics"
)

// sourcesService implements only Sources; other methods are never called.
type sourcesService struct {
	AnalyticsService
	calls int
}

func (s *sourcesService) Sources(context.Context, string, string) (analyticssvc.SourcesResult, error) {
	s.calls++
	return analyticssvc.SourcesResult{Report: analyticssvc.BuildSourcesReport(nil)}, nil
}

func TestSourcesHandler_RequiresAnalyticsRole(t *testing.T) {
	gin.SetMode(gin.TestMode)
	tests := []struct {
		name  string
		auth  fixedAuth
		want  int
		calls int
	}{
		{"manager", fixedAuth{user: staff.User{Role: staff.RoleManager, IsActive: true}}, http.StatusOK, 1},
		{"role without statistics rights", fixedAuth{user: staff.User{Role: "support", IsActive: true}}, http.StatusForbidden, 0},
		{"authentication failed", fixedAuth{err: apperr.Unauthorized("требуется вход")}, http.StatusUnauthorized, 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			svc := &sourcesService{}
			engine := gin.New()
			engine.GET("/sources", middleware.RequireStaff(tt.auth), NewAnalyticsHandler(svc).Sources)
			rec := httptest.NewRecorder()
			engine.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/sources?from=2026-10-01&to=2026-10-02", nil))
			if rec.Code != tt.want || svc.calls != tt.calls {
				t.Fatalf("status %d (service calls %d), want %d (%d): %s", rec.Code, svc.calls, tt.want, tt.calls, rec.Body)
			}
		})
	}
}

func TestNewSourcesResponse_SharesAndNulls(t *testing.T) {
	rep := analyticssvc.BuildSourcesReport([]analytics.SourceSession{
		{VisitorID: "a", Source: "google", Medium: "organic", FirstSource: "google", FirstMedium: "organic", Converted: true, VisitorsFirst: true},
		{VisitorID: "b", Source: "google", Medium: "organic", FirstSource: "google", FirstMedium: "organic", VisitorsFirst: true},
		{VisitorID: "c", Source: "(direct)", Medium: "(none)", FirstSource: "(direct)", FirstMedium: "(none)", VisitorsFirst: true},
	})
	out := newSourcesResponse(analyticssvc.SourcesResult{Report: rep})
	raw, _ := json.Marshal(out)
	var body struct {
		Channels []map[string]any `json:"channels"`
		Totals   map[string]any   `json:"totals"`
	}
	_ = json.Unmarshal(raw, &body)
	g, social := body.Channels[0], body.Channels[4]
	if g["share"] != 66.7 || g["conversion"] != 50.0 || body.Totals["share"] != 100.0 {
		t.Errorf("google: %v, totals: %v", g, body.Totals)
	}
	// A channel without sessions: share 0 %, conversion null (nothing to divide) — the keys are always there.
	if v, ok := social["conversion"]; !ok || v != nil || social["share"] != 0.0 {
		t.Errorf("empty channel: %v", social)
	}
	empty, _ := json.Marshal(newSourcesResponse(analyticssvc.SourcesResult{Report: analyticssvc.BuildSourcesReport(nil)}))
	var e struct {
		Channels []map[string]any `json:"channels"`
	}
	_ = json.Unmarshal(empty, &e)
	if v, ok := e.Channels[0]["share"]; !ok || v != nil {
		t.Errorf("no sessions at all: share must be null, got %v", e.Channels[0])
	}
}
