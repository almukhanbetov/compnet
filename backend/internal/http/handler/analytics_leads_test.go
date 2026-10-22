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

// leadsService implements only Leads; other methods are never called.
type leadsService struct {
	AnalyticsService
	calls int
}

func (s *leadsService) Leads(context.Context, string, string, analytics.LeadFilter) (analyticssvc.LeadsResult, error) {
	s.calls++
	return analyticssvc.LeadsResult{}, nil
}

type fixedAuth struct {
	user staff.User
	err  error
}

func (a fixedAuth) Authenticate(context.Context, string) (staff.User, error) { return a.user, a.err }

func TestLeadsHandler_RequiresAnalyticsRole(t *testing.T) {
	gin.SetMode(gin.TestMode)
	tests := []struct {
		name  string
		auth  fixedAuth
		want  int
		calls int
	}{
		{"manager", fixedAuth{user: staff.User{Role: staff.RoleManager, IsActive: true}}, http.StatusOK, 1},
		{"admin", fixedAuth{user: staff.User{Role: staff.RoleAdmin, IsActive: true}}, http.StatusOK, 1},
		// A role that passed authentication but has no statistics rights
		// (none exists today; the handler must still refuse it).
		{"role without statistics rights", fixedAuth{user: staff.User{Role: "support", IsActive: true}}, http.StatusForbidden, 0},
		{"authentication failed", fixedAuth{err: apperr.Unauthorized("требуется вход")}, http.StatusUnauthorized, 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			svc := &leadsService{}
			engine := gin.New()
			engine.GET("/leads", middleware.RequireStaff(tt.auth), NewAnalyticsHandler(svc).Leads)
			rec := httptest.NewRecorder()
			engine.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/leads?from=2026-10-01&to=2026-10-02", nil))
			if rec.Code != tt.want || svc.calls != tt.calls {
				t.Fatalf("status %d (service calls %d), want %d (%d): %s", rec.Code, svc.calls, tt.want, tt.calls, rec.Body)
			}
		})
	}
}
