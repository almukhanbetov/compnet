package analytics

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/almukha/compnet-backend/internal/apperr"
	"github.com/almukha/compnet-backend/internal/domain/analytics"
)

// leadsRepo implements only LeadsReport; other methods are never called.
type leadsRepo struct {
	Repository
	calls    int
	from, to time.Time
	filter   analytics.LeadFilter
}

func (r *leadsRepo) LeadsReport(_ context.Context, from, to time.Time, _, _ string, f analytics.LeadFilter) (analytics.LeadsReport, error) {
	r.calls++
	r.from, r.to, r.filter = from, to, f
	return analytics.LeadsReport{}, nil
}

func TestLeads_ValidFilters(t *testing.T) {
	repo := &leadsRepo{}
	svc := NewService(repo, Options{})
	f := analytics.LeadFilter{Channel: "paid_search", Page: "/services/mobile-app-development", ProjectType: "mobile-app"}
	if _, err := svc.Leads(context.Background(), "2026-10-01", "2026-10-22", f); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if repo.calls != 1 || repo.filter != f {
		t.Fatalf("repository got %+v (%d calls)", repo.filter, repo.calls)
	}
	// Whole Asia/Almaty days (UTC+5): 2026-10-01 00:00 → 2026-09-30 19:00 UTC.
	if want := time.Date(2026, 9, 30, 19, 0, 0, 0, time.UTC); !repo.from.Equal(want) {
		t.Errorf("from = %s, want %s", repo.from, want)
	}
	if want := time.Date(2026, 10, 22, 19, 0, 0, 0, time.UTC); !repo.to.Equal(want) {
		t.Errorf("to = %s, want %s", repo.to, want)
	}
}

func TestLeads_InvalidInputNeverReachesTheQuery(t *testing.T) {
	tests := map[string]struct {
		from, to string
		filter   analytics.LeadFilter
		field    string
	}{
		"unknown channel":       {"2026-10-01", "2026-10-02", analytics.LeadFilter{Channel: "ads"}, "channel"},
		"sql in channel":        {"2026-10-01", "2026-10-02", analytics.LeadFilter{Channel: "x' OR '1'='1"}, "channel"},
		"page with query":       {"2026-10-01", "2026-10-02", analytics.LeadFilter{Page: "/contact?email=a@b.kz"}, "page"},
		"absolute url page":     {"2026-10-01", "2026-10-02", analytics.LeadFilter{Page: "https://evil.example/"}, "page"},
		"unknown project type":  {"2026-10-01", "2026-10-02", analytics.LeadFilter{ProjectType: "<script>"}, "project_type"},
		"reversed period":       {"2026-10-05", "2026-10-01", analytics.LeadFilter{}, "period"},
		"period over 366 days":  {"2024-01-01", "2026-01-01", analytics.LeadFilter{}, "period"},
		"malformed period date": {"01.10.2026", "2026-10-02", analytics.LeadFilter{}, "period"},
	}
	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			repo := &leadsRepo{}
			_, err := NewService(repo, Options{}).Leads(context.Background(), tt.from, tt.to, tt.filter)
			var appErr *apperr.Error
			if !errors.As(err, &appErr) || appErr.Code != apperr.CodeValidation {
				t.Fatalf("want a validation error, got %v", err)
			}
			if _, ok := appErr.Fields[tt.field]; !ok {
				t.Errorf("no error on %q: %v", tt.field, appErr.Fields)
			}
			if repo.calls != 0 {
				t.Error("invalid input reached the repository")
			}
		})
	}
}
