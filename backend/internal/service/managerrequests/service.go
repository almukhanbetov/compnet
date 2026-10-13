// Package managerrequests implements the manager side of project requests:
// the list with search, filters and pages, one request with everything the
// client sent, and status/note changes with their history. The acting staff
// user always comes from the authenticated session, never from the body.
package managerrequests

import (
	"context"
	"errors"
	"regexp"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/almukha/compnet-backend/internal/apperr"
	"github.com/almukha/compnet-backend/internal/domain/projectrequest"
	"github.com/almukha/compnet-backend/internal/domain/staff"
	"github.com/almukha/compnet-backend/internal/http/dto"
)

const (
	DefaultPageSize = 20
	MaxPageSize     = 100
	MaxQueryLength  = 100
	// Zone is the business time zone: periods are whole days there.
	Zone = "Asia/Almaty"
)

var uuidPattern = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)

// Repository is what the service needs from storage.
type Repository interface {
	ListForManager(ctx context.Context, f projectrequest.ListFilter) ([]projectrequest.ProjectRequest, int, error)
	CountNew(ctx context.Context) (int, error)
	Detail(ctx context.Context, id string) (projectrequest.Detail, error)
	UpdateByManager(ctx context.Context, id, staffID string, u projectrequest.Update) (bool, error)
}

// Publisher announces committed changes to connected managers.
type Publisher interface {
	RequestChanged(ctx context.Context, requestID string)
}

type noPublisher struct{}

func (noPublisher) RequestChanged(context.Context, string) {}

// Service implements the manager request use cases.
type Service struct {
	repo      Repository
	publisher Publisher
	zone      *time.Location
}

// NewService builds a Service.
func NewService(repo Repository) (*Service, error) {
	zone, err := time.LoadLocation(Zone)
	if err != nil {
		return nil, err
	}
	return &Service{repo: repo, publisher: noPublisher{}, zone: zone}, nil
}

// SetPublisher enables realtime events.
func (s *Service) SetPublisher(p Publisher) {
	if p != nil {
		s.publisher = p
	}
}

// ListQuery is the raw list query.
type ListQuery struct {
	Query  string // search text
	Status string // new | in_progress | completed | rejected | "" (all)
	From   string // YYYY-MM-DD, Asia/Almaty, inclusive; optional
	To     string // YYYY-MM-DD, Asia/Almaty, inclusive; optional
	Page   string // 1-based
	Limit  string
}

// ListPage is one page of the list plus the "new" counter.
type ListPage struct {
	Items    []projectrequest.ProjectRequest
	Total    int
	Page     int
	Limit    int
	NewCount int
}

// List returns one page of requests, newest first.
func (s *Service) List(ctx context.Context, q ListQuery) (ListPage, error) {
	fields := map[string]string{}
	filter := projectrequest.ListFilter{}

	query := strings.TrimSpace(q.Query)
	if utf8.RuneCountInString(query) > MaxQueryLength {
		fields["q"] = "не больше 100 символов"
	}
	filter.Query = query

	switch status := projectrequest.Status(strings.TrimSpace(q.Status)); {
	case status == "" || status == "all":
	case projectrequest.ManagerStatuses[status]:
		filter.Status = status
	default:
		fields["status"] = "допустимо: new, in_progress, completed, rejected"
	}

	from, to, ok := s.parsePeriod(strings.TrimSpace(q.From), strings.TrimSpace(q.To))
	if !ok {
		fields["period"] = "даты YYYY-MM-DD, from ≤ to"
	}
	filter.From, filter.To = from, to

	page, okPage := parsePositive(q.Page, 1, 1_000_000)
	if !okPage {
		fields["page"] = "целое число от 1"
	}
	limit, okLimit := parsePositive(q.Limit, DefaultPageSize, MaxPageSize)
	if !okLimit {
		fields["limit"] = "число от 1 до 100"
	}
	if len(fields) > 0 {
		return ListPage{}, apperr.Validation("проверьте параметры запроса", fields)
	}
	filter.Limit, filter.Offset = limit, (page-1)*limit

	items, total, err := s.repo.ListForManager(ctx, filter)
	if err != nil {
		return ListPage{}, apperr.Internal(err)
	}
	newCount, err := s.repo.CountNew(ctx)
	if err != nil {
		return ListPage{}, apperr.Internal(err)
	}
	return ListPage{Items: items, Total: total, Page: page, Limit: limit, NewCount: newCount}, nil
}

// NewCount returns how many requests are still "new".
func (s *Service) NewCount(ctx context.Context) (int, error) {
	n, err := s.repo.CountNew(ctx)
	if err != nil {
		return 0, apperr.Internal(err)
	}
	return n, nil
}

// Get returns one request.
func (s *Service) Get(ctx context.Context, id string) (projectrequest.Detail, error) {
	if !uuidPattern.MatchString(id) {
		return projectrequest.Detail{}, apperr.NotFound("заявка не найдена")
	}
	d, err := s.repo.Detail(ctx, strings.ToLower(id))
	if errors.Is(err, projectrequest.ErrNotFound) {
		return d, apperr.NotFound("заявка не найдена")
	}
	if err != nil {
		return d, apperr.Internal(err)
	}
	return d, nil
}

// Update changes the status and/or the note as the given staff member and
// returns the request as it is now.
func (s *Service) Update(ctx context.Context, actor staff.User, id string, req dto.UpdateProjectRequestRequest) (projectrequest.Detail, error) {
	if !uuidPattern.MatchString(id) {
		return projectrequest.Detail{}, apperr.NotFound("заявка не найдена")
	}
	if fields := req.Validate(); len(fields) > 0 {
		return projectrequest.Detail{}, apperr.Validation("проверьте введённые данные", fields)
	}
	id = strings.ToLower(id)

	var u projectrequest.Update
	if req.Status != nil {
		status := projectrequest.Status(strings.TrimSpace(*req.Status))
		u.Status = &status
	}
	if req.Note != nil {
		note := strings.TrimSpace(*req.Note)
		u.Note = &note
	}

	changed, err := s.repo.UpdateByManager(ctx, id, actor.ID, u)
	if errors.Is(err, projectrequest.ErrNotFound) {
		return projectrequest.Detail{}, apperr.NotFound("заявка не найдена")
	}
	if err != nil {
		return projectrequest.Detail{}, apperr.Internal(err)
	}
	if changed {
		s.publisher.RequestChanged(ctx, id)
	}
	return s.Get(ctx, id)
}

// parsePeriod turns optional inclusive Asia/Almaty dates into a UTC
// half-open range; a missing bound stays zero (unbounded).
func (s *Service) parsePeriod(fromDate, toDate string) (time.Time, time.Time, bool) {
	var from, to time.Time
	if fromDate != "" {
		t, err := time.ParseInLocation("2006-01-02", fromDate, s.zone)
		if err != nil {
			return from, to, false
		}
		from = t.UTC()
	}
	if toDate != "" {
		t, err := time.ParseInLocation("2006-01-02", toDate, s.zone)
		if err != nil {
			return from, to, false
		}
		to = t.AddDate(0, 0, 1).UTC()
	}
	if !from.IsZero() && !to.IsZero() && !from.Before(to) {
		return from, to, false
	}
	return from, to, true
}

func parsePositive(raw string, fallback, max int) (int, bool) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return fallback, true
	}
	n, err := strconv.Atoi(raw)
	if err != nil || n < 1 || n > max {
		return fallback, false
	}
	return n, true
}
