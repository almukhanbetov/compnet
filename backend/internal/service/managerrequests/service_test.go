package managerrequests

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/almukha/compnet-backend/internal/apperr"
	"github.com/almukha/compnet-backend/internal/domain/projectrequest"
	"github.com/almukha/compnet-backend/internal/domain/staff"
	"github.com/almukha/compnet-backend/internal/http/dto"
)

type fakeRepo struct {
	filter    projectrequest.ListFilter
	changed   bool
	updateErr error
	updates   []projectrequest.Update
	staffIDs  []string
}

func (f *fakeRepo) ListForManager(_ context.Context, filter projectrequest.ListFilter) ([]projectrequest.ProjectRequest, int, error) {
	f.filter = filter
	return nil, 0, nil
}
func (f *fakeRepo) CountNew(context.Context) (int, error) { return 3, nil }
func (f *fakeRepo) Detail(_ context.Context, id string) (projectrequest.Detail, error) {
	return projectrequest.Detail{Request: projectrequest.ProjectRequest{ID: id}}, nil
}
func (f *fakeRepo) UpdateByManager(_ context.Context, _ string, staffID string, u projectrequest.Update) (bool, error) {
	f.updates = append(f.updates, u)
	f.staffIDs = append(f.staffIDs, staffID)
	return f.changed, f.updateErr
}

type fakePublisher struct{ ids []string }

func (p *fakePublisher) RequestChanged(_ context.Context, id string) { p.ids = append(p.ids, id) }

func newTestService(t *testing.T, repo *fakeRepo) (*Service, *fakePublisher) {
	t.Helper()
	s, err := NewService(repo)
	if err != nil {
		t.Fatal(err)
	}
	pub := &fakePublisher{}
	s.SetPublisher(pub)
	return s, pub
}

func validationFields(t *testing.T, err error) map[string]string {
	t.Helper()
	var appErr *apperr.Error
	if !errors.As(err, &appErr) || appErr.Code != apperr.CodeValidation {
		t.Fatalf("want validation error, got %v", err)
	}
	return appErr.Fields
}

func TestListPeriodIsAlmatyDays(t *testing.T) {
	repo := &fakeRepo{}
	s, _ := newTestService(t, repo)
	page, err := s.List(context.Background(), ListQuery{From: "2026-10-01", To: "2026-10-13", Page: "2", Limit: "10"})
	if err != nil {
		t.Fatal(err)
	}
	// Asia/Almaty is UTC+5: the day starts at 19:00 UTC the day before.
	if want := time.Date(2026, 9, 30, 19, 0, 0, 0, time.UTC); !repo.filter.From.Equal(want) {
		t.Errorf("from = %v, want %v", repo.filter.From, want)
	}
	if want := time.Date(2026, 10, 13, 19, 0, 0, 0, time.UTC); !repo.filter.To.Equal(want) {
		t.Errorf("to = %v, want %v", repo.filter.To, want)
	}
	if repo.filter.Offset != 10 || repo.filter.Limit != 10 || page.Page != 2 || page.NewCount != 3 {
		t.Errorf("paging: %+v %+v", repo.filter, page)
	}
}

func TestListDefaultsAndOpenPeriod(t *testing.T) {
	repo := &fakeRepo{}
	s, _ := newTestService(t, repo)
	if _, err := s.List(context.Background(), ListQuery{Status: "in_progress", Query: "  Алия "}); err != nil {
		t.Fatal(err)
	}
	f := repo.filter
	if !f.From.IsZero() || !f.To.IsZero() || f.Limit != DefaultPageSize || f.Offset != 0 {
		t.Errorf("defaults: %+v", f)
	}
	if f.Status != projectrequest.StatusInProgress || f.Query != "Алия" {
		t.Errorf("filter: %+v", f)
	}
}

func TestListRefusesBadQuery(t *testing.T) {
	s, _ := newTestService(t, &fakeRepo{})
	_, err := s.List(context.Background(), ListQuery{
		Status: "archived", From: "2026-10-13", To: "2026-10-01", Page: "0", Limit: "1000",
	})
	fields := validationFields(t, err)
	for _, key := range []string{"status", "period", "page", "limit"} {
		if fields[key] == "" {
			t.Errorf("no error for %s: %v", key, fields)
		}
	}
}

func TestUpdatePublishesOnlyRealChanges(t *testing.T) {
	repo := &fakeRepo{changed: false}
	s, pub := newTestService(t, repo)
	actor := staff.User{ID: "staff-1"}
	id := "6F9619FF-8B86-D011-B42D-00C04FC964FF"
	status := "completed"
	note := "  перезвонить в пятницу  "

	if _, err := s.Update(context.Background(), actor, id, dto.UpdateProjectRequestRequest{Status: &status, Note: &note}); err != nil {
		t.Fatal(err)
	}
	if len(pub.ids) != 0 {
		t.Error("published although nothing changed")
	}
	u := repo.updates[0]
	if *u.Status != projectrequest.StatusCompleted || *u.Note != "перезвонить в пятницу" || repo.staffIDs[0] != "staff-1" {
		t.Errorf("update: %+v by %s", u, repo.staffIDs[0])
	}

	repo.changed = true
	if _, err := s.Update(context.Background(), actor, id, dto.UpdateProjectRequestRequest{Status: &status}); err != nil {
		t.Fatal(err)
	}
	if len(pub.ids) != 1 || pub.ids[0] != "6f9619ff-8b86-d011-b42d-00c04fc964ff" {
		t.Errorf("published: %v", pub.ids)
	}
}

func TestUpdateErrors(t *testing.T) {
	repo := &fakeRepo{updateErr: projectrequest.ErrNotFound}
	s, _ := newTestService(t, repo)
	status := "completed"
	var appErr *apperr.Error

	_, err := s.Update(context.Background(), staff.User{ID: "x"}, "not-a-uuid", dto.UpdateProjectRequestRequest{Status: &status})
	if !errors.As(err, &appErr) || appErr.Code != apperr.CodeNotFound {
		t.Errorf("bad id: %v", err)
	}
	_, err = s.Update(context.Background(), staff.User{ID: "x"}, "6f9619ff-8b86-d011-b42d-00c04fc964ff", dto.UpdateProjectRequestRequest{Status: &status})
	if !errors.As(err, &appErr) || appErr.Code != apperr.CodeNotFound {
		t.Errorf("missing request: %v", err)
	}
	bad := "archived"
	_, err = s.Update(context.Background(), staff.User{ID: "x"}, "6f9619ff-8b86-d011-b42d-00c04fc964ff", dto.UpdateProjectRequestRequest{Status: &bad})
	validationFields(t, err)
}
