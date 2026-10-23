// Package analytics implements the first-party visit analytics: accepting
// events from consenting browsers, recording conversions after the backend
// saved them, the statistics for managers and the retention cleanup.
package analytics

import (
	"context"
	"errors"
	"log"
	"net/url"
	"strings"
	"time"

	"github.com/almukha/compnet-backend/internal/apperr"
	"github.com/almukha/compnet-backend/internal/attribution"
	"github.com/almukha/compnet-backend/internal/domain/analytics"
	"github.com/almukha/compnet-backend/internal/http/dto"
	"github.com/almukha/compnet-backend/internal/pricing"
)

// Repository persists analytics.
type Repository interface {
	Ingest(ctx context.Context, s analytics.Session, events []analytics.Event) (int, error)
	RecordLead(ctx context.Context, sessionID, requestID string) (bool, error)
	RecordFirstChatMessage(ctx context.Context, sessionID, conversationID string) (bool, error)
	Purge(ctx context.Context, before time.Time) (events, sessions int64, err error)
	Report(ctx context.Context, from, to time.Time, fromDate, toDate string) (analytics.Report, error)
	LeadsReport(ctx context.Context, from, to time.Time, fromDate, toDate string, f analytics.LeadFilter) (analytics.LeadsReport, error)
	SessionDetail(ctx context.Context, id string) (analytics.SessionDetail, error)
	Visits(ctx context.Context, todayFrom, todayTo time.Time) (analytics.Visits, error)
}

// Notifier tells connected managers that new visits or page views were
// stored (see internal/service/analyticsevents). Best effort.
type Notifier interface {
	VisitsChanged()
}

type noNotifier struct{}

func (noNotifier) VisitsChanged() {}

// Options come from configuration (ANALYTICS_*).
type Options struct {
	Enabled       bool
	RetentionDays int
	// AllowLocal accepts localhost origins and headless browsers (local tests).
	AllowLocal bool
	// GA4MeasurementID is handed to consenting browsers; "" disables GA4.
	GA4MeasurementID string
}

// Service implements the analytics use cases.
type Service struct {
	repo     Repository
	opts     Options
	now      func() time.Time
	notifier Notifier
}

// NewService builds a Service.
func NewService(repo Repository, opts Options) *Service {
	if opts.RetentionDays <= 0 {
		opts.RetentionDays = 90
	}
	return &Service{repo: repo, opts: opts, now: time.Now, notifier: noNotifier{}}
}

// SetNotifier enables live updates of the statistics.
func (s *Service) SetNotifier(n Notifier) {
	if n != nil {
		s.notifier = n
	}
}

// Settings are shown on the dashboard.
type Settings struct {
	Enabled       bool
	RetentionDays int
}

// Settings returns the effective configuration.
func (s *Service) Settings() Settings {
	return Settings{Enabled: s.opts.Enabled, RetentionDays: s.opts.RetentionDays}
}

// ClientConfig is what browsers may know: whether to ask for consent and
// collect, and the optional GA4 measurement id (not a secret).
type ClientConfig struct {
	Enabled          bool
	GA4MeasurementID string
}

// ClientConfig returns the public configuration.
func (s *Service) ClientConfig() ClientConfig {
	return ClientConfig{Enabled: s.opts.Enabled, GA4MeasurementID: s.opts.GA4MeasurementID}
}

// IngestInput is a batch plus the request facts the server trusts.
type IngestInput struct {
	Request   dto.AnalyticsBatchRequest
	UserAgent string
	Origin    string
}

// Ingest stores a batch of browser events. Disabled analytics, bots,
// automation and local origins are dropped silently (the browser cannot
// tell, and need not); invalid batches are refused.
func (s *Service) Ingest(ctx context.Context, in IngestInput) error {
	if !s.opts.Enabled {
		return nil
	}
	req := in.Request
	if fields := req.Validate(); len(fields) > 0 {
		return apperr.Validation("проверьте события", fields)
	}
	if !s.opts.AllowLocal && (IsBot(in.UserAgent) || IsLocalOrigin(in.Origin)) {
		return nil
	}

	ownHost := ""
	if u, err := url.Parse(in.Origin); err == nil {
		ownHost = u.Hostname()
	}
	attribution := Attribute(utm(req.Session.UTM), req.Session.ReferrerHost, ownHost, req.Session.AdClick)
	first := Attribute(utm(req.FirstTouch.UTM), req.FirstTouch.ReferrerHost, ownHost, req.FirstTouch.AdClick)
	if req.FirstTouch.LandingPath == "" {
		// No first touch known (older client): this visit is the first one.
		first = attribution
	}

	landing := CleanPath(req.Session.LandingPath)
	if landing == "" {
		landing = "/"
	}
	session := analytics.Session{
		ID:          strings.ToLower(req.SessionID),
		VisitorID:   strings.ToLower(req.VisitorID),
		LandingPath: landing,
		Attribution: attribution,
		First:       analytics.Attribution{Source: first.Source, Medium: first.Medium, Campaign: first.Campaign},
		Device:      DeviceCategory(in.UserAgent),
		Language:    Language(req.Language),
	}

	events := make([]analytics.Event, 0, len(req.Events))
	for _, e := range req.Events {
		path := CleanPath(e.Path)
		if path == "" {
			continue // manager section, API, or not a path
		}
		events = append(events, analytics.Event{ID: strings.ToLower(e.ID), Type: analytics.EventType(e.Type), Path: path})
	}
	if len(events) == 0 {
		return nil
	}

	inserted, err := s.repo.Ingest(ctx, session, events)
	if errors.Is(err, analytics.ErrSessionMismatch) {
		return nil // someone else's session id: ignore without telling
	}
	if err != nil {
		return apperr.Internal(err)
	}
	if inserted > 0 { // a resent batch (same event ids) changes nothing
		s.notifier.VisitsChanged()
	}
	return nil
}

func utm(u dto.AnalyticsUTM) UTM {
	return UTM{Source: u.Source, Medium: u.Medium, Campaign: u.Campaign, Term: u.Term, Content: u.Content}
}

// conversionTimeout bounds the recording of a conversion; the request
// context is detached from, since the operation it follows already succeeded.
const conversionTimeout = 3 * time.Second

// LeadCreated links a saved request to the browser's analytics session.
// Called by the project request service after the commit; best effort —
// a failure here never affects the request.
func (s *Service) LeadCreated(ctx context.Context, sessionID, requestID string) {
	if !s.opts.Enabled || !ValidUUID(sessionID) {
		return
	}
	ctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), conversionTimeout)
	defer cancel()
	if _, err := s.repo.RecordLead(ctx, strings.ToLower(sessionID), requestID); err != nil {
		log.Printf("analytics: record request conversion: %v", err)
	}
}

// ChatMessageStored links a conversation to the session when the stored
// message is the conversation's first visitor message (checked in the
// database, so retries and later messages never count again).
func (s *Service) ChatMessageStored(ctx context.Context, sessionID, conversationID string) {
	if !s.opts.Enabled || !ValidUUID(sessionID) {
		return
	}
	ctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), conversionTimeout)
	defer cancel()
	if _, err := s.repo.RecordFirstChatMessage(ctx, strings.ToLower(sessionID), conversationID); err != nil {
		log.Printf("analytics: record chat conversion: %v", err)
	}
}

// ReportResult is the dashboard payload.
type ReportResult struct {
	Period   Period
	Settings Settings
	Report   analytics.Report
}

// Report returns the statistics for whole Asia/Almaty days [from, to].
func (s *Service) Report(ctx context.Context, fromDate, toDate string) (ReportResult, error) {
	period, ok := ParsePeriod(fromDate, toDate)
	if !ok {
		return ReportResult{}, apperr.Validation("проверьте период", map[string]string{
			"period": "даты YYYY-MM-DD, from ≤ to, не больше 366 дней",
		})
	}
	rep, err := s.repo.Report(ctx, period.From, period.To, period.FromDate, period.ToDate)
	if err != nil {
		return ReportResult{}, apperr.Internal(err)
	}
	return ReportResult{Period: period, Settings: s.Settings(), Report: rep}, nil
}

// LeadsResult is the requests report payload.
type LeadsResult struct {
	Period Period
	Filter analytics.LeadFilter
	Report analytics.LeadsReport
}

// Leads returns the requests report for whole Asia/Almaty days [from, to].
// Filters must name a known channel, a page path and a catalog project
// type; anything else is a validation error, never part of a query.
func (s *Service) Leads(ctx context.Context, fromDate, toDate string, f analytics.LeadFilter) (LeadsResult, error) {
	period, ok := ParsePeriod(fromDate, toDate)
	if !ok {
		return LeadsResult{}, apperr.Validation("проверьте период", map[string]string{
			"period": "даты YYYY-MM-DD, from ≤ to, не больше 366 дней",
		})
	}
	fields := map[string]string{}
	if f.Channel != "" && !attribution.ValidChannel(f.Channel) {
		fields["channel"] = "неизвестный канал"
	}
	if f.Page != "" && CleanPath(f.Page) != f.Page {
		fields["page"] = "укажите путь страницы, например /contact"
	}
	if f.ProjectType != "" {
		if _, ok := pricing.FindProjectType(f.ProjectType); !ok {
			fields["project_type"] = "неизвестный тип проекта"
		}
	}
	if len(fields) > 0 {
		return LeadsResult{}, apperr.Validation("проверьте фильтры", fields)
	}
	rep, err := s.repo.LeadsReport(ctx, period.From, period.To, period.FromDate, period.ToDate, f)
	if err != nil {
		return LeadsResult{}, apperr.Internal(err)
	}
	return LeadsResult{Period: period, Filter: f, Report: rep}, nil
}

// SessionDetail returns one session's history.
func (s *Service) SessionDetail(ctx context.Context, id string) (analytics.SessionDetail, error) {
	if !ValidUUID(id) {
		return analytics.SessionDetail{}, apperr.NotFound("сессия не найдена")
	}
	d, err := s.repo.SessionDetail(ctx, strings.ToLower(id))
	if errors.Is(err, analytics.ErrNotFound) {
		return d, apperr.NotFound("сессия не найдена")
	}
	if err != nil {
		return d, apperr.Internal(err)
	}
	return d, nil
}

// VisitsResult is the visit counter plus the day "today" refers to.
type VisitsResult struct {
	Today  string // YYYY-MM-DD, Asia/Almaty
	Visits analytics.Visits
}

// Visits returns the visit counter for today (Asia/Almaty) and all time.
func (s *Service) Visits(ctx context.Context) (VisitsResult, error) {
	loc, err := time.LoadLocation(ReportZone)
	if err != nil {
		return VisitsResult{}, apperr.Internal(err)
	}
	today := s.now().In(loc).Format("2006-01-02")
	period, _ := ParsePeriod(today, today)
	v, err := s.repo.Visits(ctx, period.From, period.To)
	if err != nil {
		return VisitsResult{}, apperr.Internal(err)
	}
	return VisitsResult{Today: today, Visits: v}, nil
}

// Purge deletes detailed analytics older than the retention period.
func (s *Service) Purge(ctx context.Context) error {
	cutoff := s.now().Add(-time.Duration(s.opts.RetentionDays) * 24 * time.Hour)
	events, sessions, err := s.repo.Purge(ctx, cutoff)
	if err != nil {
		return err
	}
	if events > 0 || sessions > 0 {
		log.Printf("analytics: retention cleanup removed %d events, %d sessions", events, sessions)
	}
	return nil
}
