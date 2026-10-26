package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5"

	"github.com/almukha/compnet-backend/internal/domain/projectrequest"
)

// The manager side of project requests: the list, one request with its
// estimate, history and analytics link, and status/note changes.

const requestListColumns = `
	id, number, name, COALESCE(phone, ''), COALESCE(email, ''), COALESCE(company, ''),
	project_type, COALESCE(budget_range, ''), COALESCE(desired_timeline, ''),
	contact_method, status, created_at, updated_at`

func scanListRequest(row pgx.Rows) (projectrequest.ProjectRequest, error) {
	var r projectrequest.ProjectRequest
	err := row.Scan(&r.ID, &r.Number, &r.Name, &r.Phone, &r.Email, &r.Company,
		&r.ProjectType, &r.BudgetRange, &r.DesiredTimeline,
		&r.ContactMethod, &r.Status, &r.CreatedAt, &r.UpdatedAt)
	return r, err
}

// listWhere builds the WHERE clause shared by the page and the total.
func listWhere(f projectrequest.ListFilter) (string, []any) {
	var conds []string
	var args []any
	arg := func(v any) string {
		args = append(args, v)
		return "$" + strconv.Itoa(len(args))
	}
	if f.Status != "" {
		conds = append(conds, "status = "+arg(string(f.Status)))
	}
	if !f.From.IsZero() {
		conds = append(conds, "created_at >= "+arg(f.From))
	}
	if !f.To.IsZero() {
		conds = append(conds, "created_at < "+arg(f.To))
	}
	if q := strings.TrimSpace(f.Query); q != "" {
		like := arg("%" + escapeLike(q) + "%")
		alts := []string{
			"name ILIKE " + like + ` ESCAPE '\'`,
			"email ILIKE " + like + ` ESCAPE '\'`,
			"company ILIKE " + like + ` ESCAPE '\'`,
			"description ILIKE " + like + ` ESCAPE '\'`,
			"phone ILIKE " + like + ` ESCAPE '\'`,
		}
		// Phones are stored as digits (and a leading +): "+7 701 123" finds them too.
		if digits := onlyDigits(q); len(digits) >= 3 {
			alts = append(alts, "phone LIKE "+arg("%"+digits+"%"))
		}
		// "17" or "№17" finds request number 17.
		if n, err := strconv.ParseInt(strings.TrimLeft(q, "№# "), 10, 64); err == nil && n > 0 {
			alts = append(alts, "number = "+arg(n))
		}
		conds = append(conds, "("+strings.Join(alts, " OR ")+")")
	}
	if len(conds) == 0 {
		return "", args
	}
	return " WHERE " + strings.Join(conds, " AND "), args
}

// ListForManager returns one page of requests, newest first, and how many
// match the filter in total.
func (r *ProjectRequestRepository) ListForManager(ctx context.Context, f projectrequest.ListFilter) ([]projectrequest.ProjectRequest, int, error) {
	where, args := listWhere(f)

	var total int
	if err := r.pool.QueryRow(ctx, `SELECT count(*) FROM project_requests`+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	n := len(args)
	query := `SELECT ` + requestListColumns + ` FROM project_requests` + where +
		` ORDER BY created_at DESC, id DESC LIMIT $` + strconv.Itoa(n+1) + ` OFFSET $` + strconv.Itoa(n+2)
	rows, err := r.pool.Query(ctx, query, append(args, f.Limit, f.Offset)...)
	if err != nil {
		return nil, 0, err
	}
	items, err := collect(rows, scanListRequest)
	return items, total, err
}

// CountNew returns how many requests have the status "new".
func (r *ProjectRequestRepository) CountNew(ctx context.Context) (int, error) {
	var n int
	err := r.pool.QueryRow(ctx, `SELECT count(*) FROM project_requests WHERE status = 'new'`).Scan(&n)
	return n, err
}

// Detail returns one request with everything a manager may see on it.
func (r *ProjectRequestRepository) Detail(ctx context.Context, id string) (projectrequest.Detail, error) {
	var d projectrequest.Detail
	req := &d.Request
	var noteBy, noteByName *string
	err := r.pool.QueryRow(ctx, `
		SELECT p.id, p.number, p.name, COALESCE(p.phone, ''), COALESCE(p.email, ''), COALESCE(p.company, ''),
		       p.project_type, p.description, COALESCE(p.budget_range, ''), COALESCE(p.desired_timeline, ''),
		       p.contact_method, p.consent, p.status, p.created_at, p.updated_at,
		       COALESCE(p.manager_note, ''), p.manager_note_updated_at,
		       p.manager_note_updated_by::text, s.display_name
		FROM project_requests p
		LEFT JOIN staff_users s ON s.id = p.manager_note_updated_by
		WHERE p.id = $1`, id).Scan(
		&req.ID, &req.Number, &req.Name, &req.Phone, &req.Email, &req.Company,
		&req.ProjectType, &req.Description, &req.BudgetRange, &req.DesiredTimeline,
		&req.ContactMethod, &req.Consent, &req.Status, &req.CreatedAt, &req.UpdatedAt,
		&d.Note.Text, &d.Note.UpdatedAt, &noteBy, &noteByName)
	if errors.Is(err, pgx.ErrNoRows) {
		return d, projectrequest.ErrNotFound
	}
	if err != nil {
		return d, err
	}
	if noteBy != nil {
		d.Note.UpdatedBy = &projectrequest.StaffRef{ID: *noteBy, Name: derefString(noteByName)}
	}

	// The estimate saved with the request (one per request today; the
	// latest wins should that ever change).
	var est projectrequest.Estimate
	var breakdown []byte
	err = r.pool.QueryRow(ctx, `
		SELECT id, pricing_version, is_individual, minimum_tenge, maximum_tenge, duration_label, breakdown, created_at
		FROM project_estimates WHERE project_request_id = $1
		ORDER BY created_at DESC LIMIT 1`, id).Scan(
		&est.ID, &est.PricingVersion, &est.IsIndividual, &est.MinimumTenge, &est.MaximumTenge,
		&est.DurationLabel, &breakdown, &est.CreatedAt)
	switch {
	case errors.Is(err, pgx.ErrNoRows):
	case err != nil:
		return d, err
	default:
		if err := json.Unmarshal(breakdown, &est.Breakdown); err != nil {
			return d, err
		}
		est.ProjectRequestID = id
		d.Estimate = &est
	}

	rows, err := r.pool.Query(ctx, `
		SELECT c.id, c.old_status, c.new_status, c.staff_user_id::text, s.display_name, c.changed_at
		FROM project_request_status_changes c
		JOIN staff_users s ON s.id = c.staff_user_id
		WHERE c.project_request_id = $1
		ORDER BY c.changed_at DESC, c.id DESC`, id)
	if err != nil {
		return d, err
	}
	if d.History, err = collect(rows, func(row pgx.Rows) (projectrequest.StatusChange, error) {
		var c projectrequest.StatusChange
		return c, row.Scan(&c.ID, &c.OldStatus, &c.NewStatus, &c.Staff.ID, &c.Staff.Name, &c.ChangedAt)
	}); err != nil {
		return d, err
	}

	// Only a request sent from a browser with analytics consent has a
	// lead_submit event; the session disappears after the retention period.
	var a projectrequest.AnalyticsLink
	err = r.pool.QueryRow(ctx, `
		SELECT s.id::text, e.occurred_at, s.landing_path, s.source, s.medium,
		       COALESCE(s.campaign, ''), COALESCE(s.term, ''), COALESCE(s.content, ''),
		       COALESCE(s.referrer_host, ''), s.first_source, s.first_medium, COALESCE(s.first_campaign, ''),
		       s.device, COALESCE(s.language, '')
		FROM analytics_events e
		JOIN analytics_sessions s ON s.id = e.session_id
		WHERE e.type = 'lead_submit' AND e.project_request_id = $1
		LIMIT 1`, id).Scan(
		&a.SessionID, &a.LinkedAt, &a.LandingPath, &a.Source, &a.Medium,
		&a.Campaign, &a.Term, &a.Content,
		&a.ReferrerHost, &a.FirstSource, &a.FirstMedium, &a.FirstCampaign,
		&a.Device, &a.Language)
	switch {
	case errors.Is(err, pgx.ErrNoRows):
	case err != nil:
		return d, err
	default:
		d.Analytics = &a
	}

	// The stored source: no row for requests without analytics consent
	// and for those received before it was recorded.
	var at projectrequest.Attribution
	err = r.pool.QueryRow(ctx, `
		SELECT channel, source, COALESCE(source_page, ''), COALESCE(previous_page, ''), COALESCE(landing_page, ''),
		       COALESCE(referrer_host, ''), COALESCE(utm_source, ''), COALESCE(utm_medium, ''),
		       COALESCE(utm_campaign, ''), COALESCE(utm_content, ''), COALESCE(utm_term, ''), COALESCE(click_id_type, '')
		FROM project_request_attribution WHERE project_request_id = $1`, id).Scan(
		&at.Channel, &at.Source, &at.SourcePage, &at.PreviousPage, &at.LandingPage,
		&at.ReferrerHost, &at.UTMSource, &at.UTMMedium,
		&at.UTMCampaign, &at.UTMContent, &at.UTMTerm, &at.ClickIDType)
	switch {
	case errors.Is(err, pgx.ErrNoRows):
	case err != nil:
		return d, err
	default:
		d.Attribution = &at
	}

	var place projectrequest.PromotionPlace
	err = r.pool.QueryRow(ctx, `
		SELECT p.slug, p.title, r.status, COALESCE(r.release_reason, ''), r.reserved_at, r.confirmed_at, r.released_at
		FROM promotion_reservations r JOIN promotions p ON p.id = r.promotion_id
		WHERE r.project_request_id = $1`, id).Scan(
		&place.PromotionSlug, &place.PromotionTitle, &place.Status, &place.ReleaseReason,
		&place.ReservedAt, &place.ConfirmedAt, &place.ReleasedAt)
	switch {
	case errors.Is(err, pgx.ErrNoRows):
	case err != nil:
		return d, err
	default:
		d.PromotionPlace = &place
	}
	return d, nil
}

// UpdateByManager applies a status and/or note change in one transaction.
// A status change is written to the history with the acting staff member;
// setting the current status again changes nothing. Reports whether
// anything was changed.
func (r *ProjectRequestRepository) UpdateByManager(ctx context.Context, id, staffID string, u projectrequest.Update) (bool, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return false, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var current projectrequest.Status
	var note string
	err = tx.QueryRow(ctx, `SELECT status, COALESCE(manager_note, '') FROM project_requests WHERE id = $1 FOR UPDATE`, id).Scan(&current, &note)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, projectrequest.ErrNotFound
	}
	if err != nil {
		return false, err
	}

	changed := false
	if u.Status != nil && *u.Status != current {
		if _, err := tx.Exec(ctx, `UPDATE project_requests SET status = $2, updated_at = now() WHERE id = $1`, id, string(*u.Status)); err != nil {
			return false, err
		}
		if _, err := tx.Exec(ctx, `
			INSERT INTO project_request_status_changes (project_request_id, old_status, new_status, staff_user_id)
			VALUES ($1, $2, $3, $4)`, id, string(current), string(*u.Status), staffID); err != nil {
			return false, err
		}
		// A promotional place follows the status: taken into work confirms
		// it, rejected or archived gives it back.
		if err := applyReservationStatus(ctx, tx, id, string(*u.Status)); err != nil {
			return false, err
		}
		changed = true
	}
	if u.Note != nil && *u.Note != note {
		if _, err := tx.Exec(ctx, `
			UPDATE project_requests
			SET manager_note = $2, manager_note_updated_at = now(), manager_note_updated_by = $3, updated_at = now()
			WHERE id = $1`, id, nullableString(*u.Note), staffID); err != nil {
			return false, err
		}
		changed = true
	}
	if !changed {
		return false, nil
	}
	return true, tx.Commit(ctx)
}

// escapeLike makes user input literal inside a LIKE pattern.
func escapeLike(s string) string {
	return strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`).Replace(s)
}

func onlyDigits(s string) string {
	var b strings.Builder
	for _, r := range s {
		if r >= '0' && r <= '9' {
			b.WriteRune(r)
		}
	}
	return b.String()
}
