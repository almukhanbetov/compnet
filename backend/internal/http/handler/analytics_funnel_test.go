package handler

import (
	"context"
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

// funnelService implements only Funnel; other methods are never called.
type funnelService struct {
	AnalyticsService
	calls int
}

func (s *funnelService) Funnel(context.Context, string, string) (analyticssvc.FunnelResult, error) {
	s.calls++
	return analyticssvc.FunnelResult{}, nil
}

func TestFunnelHandler_RequiresAnalyticsRole(t *testing.T) {
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
			svc := &funnelService{}
			engine := gin.New()
			engine.GET("/funnel", middleware.RequireStaff(tt.auth), NewAnalyticsHandler(svc).Funnel)
			rec := httptest.NewRecorder()
			engine.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/funnel?from=2026-10-01&to=2026-10-02", nil))
			if rec.Code != tt.want || svc.calls != tt.calls {
				t.Fatalf("status %d (service calls %d), want %d (%d): %s", rec.Code, svc.calls, tt.want, tt.calls, rec.Body)
			}
		})
	}
}

func TestNewFunnelResponse_Shares(t *testing.T) {
	v := func(p *float64) float64 {
		if p == nil {
			return -1
		}
		return *p
	}
	out := newFunnelResponse(analyticssvc.FunnelResult{Funnel: analytics.Funnel{
		Visits: 3, Interest: 2, Started: 0, Intent: 0, Conversion: 0, ConvertedSessions: 1,
	}})
	s := out.Steps
	if len(s) != 5 || s[0].Key != "visit" || s[4].Key != "conversion" {
		t.Fatalf("steps: %+v", s)
	}
	if v(s[0].OfFirst) != 100 || s[0].OfPrevious != nil || s[0].LostPct != nil || s[0].Lost != 0 {
		t.Errorf("first step: %+v", s[0])
	}
	if v(s[1].OfFirst) != 66.7 || v(s[1].OfPrevious) != 66.7 || s[1].Lost != 1 || v(s[1].LostPct) != 33.3 {
		t.Errorf("interest: %v %v %d %v", v(s[1].OfFirst), v(s[1].OfPrevious), s[1].Lost, v(s[1].LostPct))
	}
	// After a zero step there is nothing to compare with: null, not 0 % or NaN.
	if v(s[3].OfPrevious) != -1 || v(s[3].LostPct) != -1 || v(s[3].OfFirst) != 0 {
		t.Errorf("after a zero step: %+v", s[3])
	}
	if out.OutsideFunnel != 1 {
		t.Errorf("outside funnel: %d", out.OutsideFunnel)
	}
	empty := newFunnelResponse(analyticssvc.FunnelResult{})
	for _, st := range empty.Steps {
		if st.OfFirst != nil || st.OfPrevious != nil || st.LostPct != nil {
			t.Errorf("empty period %s: shares must be null: %+v", st.Key, st)
		}
	}
}
