package handler

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/almukha/compnet-backend/internal/apperr"
	"github.com/almukha/compnet-backend/internal/domain/analytics"
	"github.com/almukha/compnet-backend/internal/http/apierr"
	"github.com/almukha/compnet-backend/internal/http/dto"
	"github.com/almukha/compnet-backend/internal/http/middleware"
	"github.com/almukha/compnet-backend/internal/http/response"
	analyticssvc "github.com/almukha/compnet-backend/internal/service/analytics"
)

// AnalyticsService is what the analytics handler needs.
type AnalyticsService interface {
	ClientConfig() analyticssvc.ClientConfig
	Ingest(ctx context.Context, in analyticssvc.IngestInput) error
	Report(ctx context.Context, fromDate, toDate string) (analyticssvc.ReportResult, error)
	SessionDetail(ctx context.Context, id string) (analytics.SessionDetail, error)
}

// AnalyticsHandler serves event intake (public, write-only) and the
// statistics (managers with analytics rights only).
type AnalyticsHandler struct {
	service AnalyticsService
}

// NewAnalyticsHandler wires the handler.
func NewAnalyticsHandler(service AnalyticsService) *AnalyticsHandler {
	return &AnalyticsHandler{service: service}
}

// Ingest handles POST /api/v1/analytics/events. The body is JSON; it is
// read whatever the Content-Type (browsers send text/plain to avoid a CORS
// preflight). Answers 204 for accepted and silently dropped batches alike,
// so a client learns nothing about filtering; nothing is ever returned.
func (h *AnalyticsHandler) Ingest(c *gin.Context) {
	var req dto.AnalyticsBatchRequest
	raw, err := io.ReadAll(c.Request.Body)
	if err != nil || json.Unmarshal(raw, &req) != nil {
		apierr.Write(c, apperr.BadRequest("invalid JSON body"))
		return
	}
	err = h.service.Ingest(c.Request.Context(), analyticssvc.IngestInput{
		Request:   req,
		UserAgent: c.Request.UserAgent(),
		Origin:    c.GetHeader("Origin"),
	})
	if err != nil {
		apierr.Write(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// Config handles GET /api/v1/analytics/config: only switches, never data.
func (h *AnalyticsHandler) Config(c *gin.Context) {
	cfg := h.service.ClientConfig()
	c.Header("Cache-Control", "public, max-age=300")
	response.OK(c, gin.H{"enabled": cfg.Enabled, "ga4_measurement_id": cfg.GA4MeasurementID})
}

// requireAnalyticsRole answers 403 for staff without statistics rights.
func requireAnalyticsRole(c *gin.Context) bool {
	user, ok := middleware.StaffFromContext(c)
	if !ok {
		apierr.Write(c, apperr.Unauthorized("требуется вход"))
		return false
	}
	if !user.Role.CanViewAnalytics() {
		apierr.Write(c, apperr.Forbidden("нет доступа к статистике"))
		return false
	}
	return true
}

// Report handles GET /api/v1/manager/analytics/report?from=YYYY-MM-DD&to=YYYY-MM-DD
// (Asia/Almaty dates, inclusive).
func (h *AnalyticsHandler) Report(c *gin.Context) {
	if !requireAnalyticsRole(c) {
		return
	}
	result, err := h.service.Report(c.Request.Context(), c.Query("from"), c.Query("to"))
	if err != nil {
		apierr.Write(c, err)
		return
	}
	response.OK(c, newReportResponse(result))
}

// Session handles GET /api/v1/manager/analytics/sessions/:id.
func (h *AnalyticsHandler) Session(c *gin.Context) {
	if !requireAnalyticsRole(c) {
		return
	}
	detail, err := h.service.SessionDetail(c.Request.Context(), c.Param("id"))
	if err != nil {
		apierr.Write(c, err)
		return
	}
	response.OK(c, newSessionDetailResponse(detail))
}

// ---- response shapes ----

type reportResponse struct {
	Period struct {
		From     string    `json:"from"`
		To       string    `json:"to"`
		FromUTC  time.Time `json:"from_utc"`
		ToUTC    time.Time `json:"to_utc"`
		TimeZone string    `json:"time_zone"`
	} `json:"period"`
	Settings struct {
		Enabled       bool `json:"enabled"`
		RetentionDays int  `json:"retention_days"`
	} `json:"settings"`
	Totals struct {
		Visitors          int `json:"visitors"`
		Sessions          int `json:"sessions"`
		PageViews         int `json:"page_views"`
		WhatsAppClicks    int `json:"whatsapp_clicks"`
		PhoneClicks       int `json:"phone_clicks"`
		Requests          int `json:"requests"`
		NewChats          int `json:"new_chats"`
		LinkedRequests    int `json:"linked_requests"`
		LinkedChats       int `json:"linked_chats"`
		ConvertedSessions int `json:"converted_sessions"`
	} `json:"totals"`
	Days         []dayResponse     `json:"days"`
	Sources      []sourceResponse  `json:"sources"`
	FirstSources []sourceResponse  `json:"first_sources"`
	Campaigns    []sourceResponse  `json:"campaigns"`
	Pages        []pageResponse    `json:"pages"`
	Devices      []countResponse   `json:"devices"`
	Languages    []countResponse   `json:"languages"`
	Recent       []sessionResponse `json:"recent_sessions"`
}

type dayResponse struct {
	Day               string `json:"day"`
	Sessions          int    `json:"sessions"`
	PageViews         int    `json:"page_views"`
	Requests          int    `json:"requests"`
	NewChats          int    `json:"new_chats"`
	ConvertedSessions int    `json:"converted_sessions"`
}

type sourceResponse struct {
	Source            string `json:"source"`
	Medium            string `json:"medium"`
	Campaign          string `json:"campaign,omitempty"`
	Sessions          int    `json:"sessions"`
	Visitors          int    `json:"visitors"`
	ConvertedSessions int    `json:"converted_sessions"`
}

type pageResponse struct {
	Path     string `json:"path"`
	Views    int    `json:"views"`
	Sessions int    `json:"sessions"`
}

type countResponse struct {
	Key      string `json:"key"`
	Sessions int    `json:"sessions"`
}

type sessionResponse struct {
	ID              string    `json:"id"`
	StartedAt       time.Time `json:"started_at"`
	LastSeenAt      time.Time `json:"last_seen_at"`
	LandingPath     string    `json:"landing_path"`
	Source          string    `json:"source"`
	Medium          string    `json:"medium"`
	Campaign        string    `json:"campaign"`
	Term            string    `json:"term"`
	Content         string    `json:"content"`
	ReferrerHost    string    `json:"referrer_host"`
	FirstSource     string    `json:"first_source"`
	FirstMedium     string    `json:"first_medium"`
	FirstCampaign   string    `json:"first_campaign"`
	Device          string    `json:"device"`
	Language        string    `json:"language"`
	PageViews       int       `json:"page_views"`
	PromoViews      int       `json:"promo_views"`
	PromoClicks     int       `json:"promo_clicks"`
	WhatsAppClicks  int       `json:"whatsapp_clicks"`
	PhoneClicks     int       `json:"phone_clicks"`
	ChatOpens       int       `json:"chat_opens"`
	RequestIDs      []string  `json:"request_ids"`
	ConversationIDs []string  `json:"conversation_ids"`
}

type eventResponse struct {
	ID               string    `json:"id"`
	Type             string    `json:"type"`
	OccurredAt       time.Time `json:"occurred_at"`
	Path             string    `json:"path"`
	ProjectRequestID string    `json:"project_request_id,omitempty"`
	ConversationID   string    `json:"conversation_id,omitempty"`
}

// linkedRequestResponse identifies a request without its contacts.
type linkedRequestResponse struct {
	ID          string    `json:"id"`
	Number      int64     `json:"number"`
	ProjectType string    `json:"project_type"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
}

// linkedConversationResponse carries only what the visitor left in the
// conversation — already visible to managers in /manager.
type linkedConversationResponse struct {
	ID             string `json:"id"`
	Status         string `json:"status"`
	VisitorName    string `json:"visitor_name"`
	VisitorContact string `json:"visitor_contact"`
}

type sessionDetailResponse struct {
	Session       sessionResponse              `json:"session"`
	Events        []eventResponse              `json:"events"`
	Requests      []linkedRequestResponse      `json:"requests"`
	Conversations []linkedConversationResponse `json:"conversations"`
}

func newReportResponse(r analyticssvc.ReportResult) reportResponse {
	var out reportResponse
	out.Period.From, out.Period.To = r.Period.FromDate, r.Period.ToDate
	out.Period.FromUTC, out.Period.ToUTC = r.Period.From, r.Period.To
	out.Period.TimeZone = analyticssvc.ReportZone
	out.Settings.Enabled, out.Settings.RetentionDays = r.Settings.Enabled, r.Settings.RetentionDays
	t := r.Report.Totals
	out.Totals.Visitors, out.Totals.Sessions, out.Totals.PageViews = t.Visitors, t.Sessions, t.PageViews
	out.Totals.WhatsAppClicks, out.Totals.PhoneClicks = t.WhatsAppClicks, t.PhoneClicks
	out.Totals.Requests, out.Totals.NewChats = t.Requests, t.NewChats
	out.Totals.LinkedRequests, out.Totals.LinkedChats = t.LinkedRequests, t.LinkedChats
	out.Totals.ConvertedSessions = t.ConvertedSessions

	out.Days = make([]dayResponse, 0, len(r.Report.Days))
	for _, d := range r.Report.Days {
		out.Days = append(out.Days, dayResponse(d))
	}
	out.Sources = sources(r.Report.Sources)
	out.FirstSources = sources(r.Report.FirstSources)
	out.Campaigns = sources(r.Report.Campaigns)
	out.Pages = make([]pageResponse, 0, len(r.Report.Pages))
	for _, p := range r.Report.Pages {
		out.Pages = append(out.Pages, pageResponse(p))
	}
	out.Devices = counts(r.Report.Devices)
	out.Languages = counts(r.Report.Languages)
	out.Recent = make([]sessionResponse, 0, len(r.Report.Recent))
	for _, s := range r.Report.Recent {
		out.Recent = append(out.Recent, newSessionResponse(s))
	}
	return out
}

func sources(rows []analytics.SourceRow) []sourceResponse {
	out := make([]sourceResponse, 0, len(rows))
	for _, s := range rows {
		out = append(out, sourceResponse(s))
	}
	return out
}

func counts(rows []analytics.CountRow) []countResponse {
	out := make([]countResponse, 0, len(rows))
	for _, c := range rows {
		out = append(out, countResponse(c))
	}
	return out
}

func newSessionResponse(s analytics.SessionRow) sessionResponse {
	return sessionResponse{
		ID: s.ID, StartedAt: s.StartedAt.UTC(), LastSeenAt: s.LastSeenAt.UTC(), LandingPath: s.LandingPath,
		Source: s.Source, Medium: s.Medium, Campaign: s.Campaign, Term: s.Term, Content: s.Content,
		ReferrerHost: s.ReferrerHost, FirstSource: s.First.Source, FirstMedium: s.First.Medium,
		FirstCampaign: s.First.Campaign, Device: s.Device, Language: s.Language,
		PageViews: s.PageViews, PromoViews: s.PromoViews, PromoClicks: s.PromoClicks,
		WhatsAppClicks: s.WhatsAppClicks, PhoneClicks: s.PhoneClicks, ChatOpens: s.ChatOpens,
		RequestIDs: nonNil(s.RequestIDs), ConversationIDs: nonNil(s.ConversationIDs),
	}
}

func newSessionDetailResponse(d analytics.SessionDetail) sessionDetailResponse {
	out := sessionDetailResponse{Session: newSessionResponse(d.Session)}
	out.Events = make([]eventResponse, 0, len(d.Events))
	for _, e := range d.Events {
		out.Events = append(out.Events, eventResponse{
			ID: e.ID, Type: string(e.Type), OccurredAt: e.OccurredAt.UTC(), Path: e.Path,
			ProjectRequestID: e.ProjectRequestID, ConversationID: e.ConversationID,
		})
	}
	out.Requests = make([]linkedRequestResponse, 0, len(d.Requests))
	for _, r := range d.Requests {
		out.Requests = append(out.Requests, linkedRequestResponse{r.ID, r.Number, r.ProjectType, r.Status, r.CreatedAt.UTC()})
	}
	out.Conversations = make([]linkedConversationResponse, 0, len(d.Conversations))
	for _, c := range d.Conversations {
		out.Conversations = append(out.Conversations, linkedConversationResponse(c))
	}
	return out
}

func nonNil(s []string) []string {
	if s == nil {
		return []string{}
	}
	return s
}
