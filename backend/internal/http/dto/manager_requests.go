package dto

import (
	"strings"
	"time"
	"unicode/utf8"

	"github.com/almukha/compnet-backend/internal/domain/projectrequest"
)

// UpdateProjectRequestRequest is PATCH /api/v1/manager/project-requests/:id.
// Omitted fields stay as they are; an empty note clears it.
type UpdateProjectRequestRequest struct {
	Status *string `json:"status"`
	Note   *string `json:"note"`
}

// Validate checks the status value and the note length.
func (r UpdateProjectRequestRequest) Validate() map[string]string {
	fields := map[string]string{}
	if r.Status == nil && r.Note == nil {
		fields["status"] = "укажите статус или заметку"
		return fields
	}
	if r.Status != nil && !projectrequest.ManagerStatuses[projectrequest.Status(strings.TrimSpace(*r.Status))] {
		fields["status"] = "допустимо: new, in_progress, completed, rejected"
	}
	if r.Note != nil && utf8.RuneCountInString(strings.TrimSpace(*r.Note)) > projectrequest.MaxNoteLength {
		fields["note"] = "не больше 4000 символов"
	}
	return fields
}

// WhatsAppNumber returns the international number (digits only, as wa.me
// expects) for a stored phone, or "" when the country code cannot be known
// for sure. Stored phones keep only digits and a leading '+'.
//
//   - "+<8–15 digits>": the client wrote the country code.
//   - 11 digits starting with 7: the +7 zone (Kazakhstan, Russia) written
//     without the '+'; no other country code starts with 7.
//   - 11 digits starting with 87 or 89: the +7 zone's domestic form with the
//     trunk prefix 8 (Kazakh mobiles 87xx, Russian mobiles 89xx).
//
// Anything else (e.g. "7011234567" without a code, or "8" followed by
// another digit) is ambiguous and gets no WhatsApp link: the code is never
// guessed.
func WhatsAppNumber(phone string) string {
	if strings.HasPrefix(phone, "+") {
		digits := phone[1:]
		if isDigits(digits) && len(digits) >= 8 && len(digits) <= 15 && digits[0] != '0' {
			return digits
		}
		return ""
	}
	if !isDigits(phone) || len(phone) != 11 {
		return ""
	}
	switch {
	case phone[0] == '7':
		return phone
	case phone[0] == '8' && (phone[1] == '7' || phone[1] == '9'):
		return "7" + phone[1:]
	}
	return ""
}

func isDigits(s string) bool {
	if s == "" {
		return false
	}
	for _, r := range s {
		if r < '0' || r > '9' {
			return false
		}
	}
	return true
}

// ManagerRequestItemResponse is one row of the manager's request list.
type ManagerRequestItemResponse struct {
	ID              string    `json:"id"`
	Number          int64     `json:"number"`
	Name            string    `json:"name"`
	Phone           string    `json:"phone"`
	Email           string    `json:"email"`
	Company         string    `json:"company"`
	ProjectType     string    `json:"project_type"`
	BudgetRange     string    `json:"budget_range"`
	DesiredTimeline string    `json:"desired_timeline"`
	ContactMethod   string    `json:"contact_method"`
	Status          string    `json:"status"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// NewManagerRequestItemResponse builds a list row.
func NewManagerRequestItemResponse(r projectrequest.ProjectRequest) ManagerRequestItemResponse {
	return ManagerRequestItemResponse{
		ID: r.ID, Number: r.Number, Name: r.Name, Phone: r.Phone, Email: r.Email, Company: r.Company,
		ProjectType: r.ProjectType, BudgetRange: r.BudgetRange, DesiredTimeline: r.DesiredTimeline,
		ContactMethod: string(r.ContactMethod), Status: string(r.Status),
		CreatedAt: r.CreatedAt.UTC(), UpdatedAt: r.UpdatedAt.UTC(),
	}
}

// NewManagerRequestListResponse builds the list (never null).
func NewManagerRequestListResponse(items []projectrequest.ProjectRequest) []ManagerRequestItemResponse {
	out := make([]ManagerRequestItemResponse, 0, len(items))
	for _, r := range items {
		out = append(out, NewManagerRequestItemResponse(r))
	}
	return out
}

// StaffRefResponse names a staff member.
type StaffRefResponse struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// ManagerRequestNoteResponse is the internal note.
type ManagerRequestNoteResponse struct {
	Text      string            `json:"text"`
	UpdatedAt *time.Time        `json:"updated_at"`
	UpdatedBy *StaffRefResponse `json:"updated_by"`
}

// ManagerRequestEstimateResponse is the estimate saved with the request.
type ManagerRequestEstimateResponse struct {
	PricingVersion string                           `json:"pricing_version"`
	IsIndividual   bool                             `json:"is_individual"`
	MinimumTenge   *int64                           `json:"minimum_tenge"`
	MaximumTenge   *int64                           `json:"maximum_tenge"`
	DurationLabel  string                           `json:"duration_label"`
	Breakdown      projectrequest.EstimateBreakdown `json:"breakdown"`
	CreatedAt      time.Time                        `json:"created_at"`
}

// ManagerRequestStatusChangeResponse is one history entry.
type ManagerRequestStatusChangeResponse struct {
	ID        int64            `json:"id"`
	OldStatus string           `json:"old_status"`
	NewStatus string           `json:"new_status"`
	Staff     StaffRefResponse `json:"staff"`
	ChangedAt time.Time        `json:"changed_at"`
}

// ManagerRequestAnalyticsResponse is the linked visit (source and UTM).
type ManagerRequestAnalyticsResponse struct {
	SessionID     string    `json:"session_id"`
	LinkedAt      time.Time `json:"linked_at"`
	LandingPath   string    `json:"landing_path"`
	Source        string    `json:"source"`
	Medium        string    `json:"medium"`
	Campaign      string    `json:"campaign"`
	Term          string    `json:"term"`
	Content       string    `json:"content"`
	ReferrerHost  string    `json:"referrer_host"`
	FirstSource   string    `json:"first_source"`
	FirstMedium   string    `json:"first_medium"`
	FirstCampaign string    `json:"first_campaign"`
	Device        string    `json:"device"`
	Language      string    `json:"language"`
}

// ManagerRequestAttributionResponse is the request's stored source. The
// ad click id itself is never kept; AdClick only says one was present.
type ManagerRequestAttributionResponse struct {
	Channel      string `json:"channel"`
	Source       string `json:"source"`
	SourcePage   string `json:"source_page"`
	PreviousPage string `json:"previous_page"`
	LandingPage  string `json:"landing_page"`
	ReferrerHost string `json:"referrer_host"`
	UTMSource    string `json:"utm_source"`
	UTMMedium    string `json:"utm_medium"`
	UTMCampaign  string `json:"utm_campaign"`
	UTMContent   string `json:"utm_content"`
	UTMTerm      string `json:"utm_term"`
	AdClick      bool   `json:"ad_click"`
}

// ManagerRequestDetailResponse is one request as the manager sees it.
type ManagerRequestDetailResponse struct {
	ManagerRequestItemResponse
	Description string `json:"description"`
	Consent     bool   `json:"consent"`
	// WhatsAppPhone is set only when the phone's country code is certain.
	WhatsAppPhone string                               `json:"whatsapp_phone"`
	Note          ManagerRequestNoteResponse           `json:"note"`
	Estimate      *ManagerRequestEstimateResponse      `json:"estimate"`
	History       []ManagerRequestStatusChangeResponse `json:"history"`
	// Analytics is null when the request has no analytics session (no
	// consent, or the session was removed after the retention period).
	Analytics *ManagerRequestAnalyticsResponse `json:"analytics"`
	// Attribution is null for requests sent without analytics consent and
	// for those received before the source was recorded.
	Attribution *ManagerRequestAttributionResponse `json:"attribution"`
}

// NewManagerRequestDetailResponse builds the detail DTO.
func NewManagerRequestDetailResponse(d projectrequest.Detail) ManagerRequestDetailResponse {
	out := ManagerRequestDetailResponse{
		ManagerRequestItemResponse: NewManagerRequestItemResponse(d.Request),
		Description:                d.Request.Description,
		Consent:                    d.Request.Consent,
		WhatsAppPhone:              WhatsAppNumber(d.Request.Phone),
		Note:                       ManagerRequestNoteResponse{Text: d.Note.Text},
		History:                    make([]ManagerRequestStatusChangeResponse, 0, len(d.History)),
	}
	if d.Note.UpdatedAt != nil {
		t := d.Note.UpdatedAt.UTC()
		out.Note.UpdatedAt = &t
	}
	if d.Note.UpdatedBy != nil {
		out.Note.UpdatedBy = &StaffRefResponse{ID: d.Note.UpdatedBy.ID, Name: d.Note.UpdatedBy.Name}
	}
	if e := d.Estimate; e != nil {
		breakdown := e.Breakdown
		if breakdown.Modules == nil {
			breakdown.Modules = []projectrequest.BreakdownModule{}
		}
		out.Estimate = &ManagerRequestEstimateResponse{
			PricingVersion: e.PricingVersion, IsIndividual: e.IsIndividual,
			MinimumTenge: e.MinimumTenge, MaximumTenge: e.MaximumTenge,
			DurationLabel: e.DurationLabel, Breakdown: breakdown, CreatedAt: e.CreatedAt.UTC(),
		}
	}
	for _, c := range d.History {
		out.History = append(out.History, ManagerRequestStatusChangeResponse{
			ID: c.ID, OldStatus: string(c.OldStatus), NewStatus: string(c.NewStatus),
			Staff: StaffRefResponse{ID: c.Staff.ID, Name: c.Staff.Name}, ChangedAt: c.ChangedAt.UTC(),
		})
	}
	if a := d.Analytics; a != nil {
		out.Analytics = &ManagerRequestAnalyticsResponse{
			SessionID: a.SessionID, LinkedAt: a.LinkedAt.UTC(), LandingPath: a.LandingPath,
			Source: a.Source, Medium: a.Medium, Campaign: a.Campaign, Term: a.Term, Content: a.Content,
			ReferrerHost: a.ReferrerHost, FirstSource: a.FirstSource, FirstMedium: a.FirstMedium,
			FirstCampaign: a.FirstCampaign, Device: a.Device, Language: a.Language,
		}
	}
	if a := d.Attribution; a != nil {
		out.Attribution = &ManagerRequestAttributionResponse{
			Channel: a.Channel, Source: a.Source, SourcePage: a.SourcePage, PreviousPage: a.PreviousPage,
			LandingPage: a.LandingPage, ReferrerHost: a.ReferrerHost, UTMSource: a.UTMSource,
			UTMMedium: a.UTMMedium, UTMCampaign: a.UTMCampaign, UTMContent: a.UTMContent, UTMTerm: a.UTMTerm,
			AdClick: a.ClickIDType != "",
		}
	}
	return out
}
