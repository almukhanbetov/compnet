package postgres

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/almukha/compnet-backend/internal/domain/analytics"
)

// AnalyticsRepository stores visit analytics. It never stores IPs, form
// values, chat text or contacts.
type AnalyticsRepository struct {
	pool *pgxpool.Pool
}

// NewAnalyticsRepository builds a repository backed by the given pool.
func NewAnalyticsRepository(pool *pgxpool.Pool) *AnalyticsRepository {
	return &AnalyticsRepository{pool: pool}
}

// Ingest creates the session on first sight (later batches only touch
// last_seen_at; attribution is never overwritten) and inserts the events.
// An event id that already exists is skipped, so a resent batch never
// duplicates. Returns how many events were new.
func (r *AnalyticsRepository) Ingest(ctx context.Context, s analytics.Session, events []analytics.Event) (int, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return 0, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	const upsert = `
		INSERT INTO analytics_sessions (
			id, visitor_id, landing_path, source, medium, campaign, term, content, referrer_host,
			first_source, first_medium, first_campaign, device, language)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
		ON CONFLICT (id) DO UPDATE SET last_seen_at = now()
		RETURNING visitor_id, event_count`
	var (
		visitor string
		count   int
	)
	err = tx.QueryRow(ctx, upsert,
		s.ID, s.VisitorID, s.LandingPath, s.Source, s.Medium,
		nullableString(s.Campaign), nullableString(s.Term), nullableString(s.Content), nullableString(s.ReferrerHost),
		s.First.Source, s.First.Medium, nullableString(s.First.Campaign), s.Device, nullableString(s.Language),
	).Scan(&visitor, &count)
	if err != nil {
		return 0, err
	}
	if visitor != s.VisitorID {
		return 0, analytics.ErrSessionMismatch
	}

	inserted := 0
	for _, e := range events {
		if count+inserted >= analytics.MaxEventsPerSession {
			break // a runaway session stops growing; nothing else is affected
		}
		tag, err := tx.Exec(ctx, `
			INSERT INTO analytics_events (id, session_id, visitor_id, type, path)
			VALUES ($1, $2, $3, $4, $5)
			ON CONFLICT (id) DO NOTHING`,
			e.ID, s.ID, s.VisitorID, string(e.Type), e.Path)
		if err != nil {
			return 0, err
		}
		inserted += int(tag.RowsAffected())
	}
	if inserted > 0 {
		if _, err := tx.Exec(ctx, `UPDATE analytics_sessions SET event_count = event_count + $2 WHERE id = $1`, s.ID, inserted); err != nil {
			return 0, err
		}
	}
	return inserted, tx.Commit(ctx)
}

// RecordLead links a stored request to the session that sent it. At most
// once per request (unique index); unknown sessions are ignored.
func (r *AnalyticsRepository) RecordLead(ctx context.Context, sessionID, requestID string) (bool, error) {
	return r.recordConversion(ctx, `
		INSERT INTO analytics_events (id, session_id, visitor_id, type, project_request_id)
		SELECT gen_random_uuid(), s.id, s.visitor_id, 'lead_submit', $2
		FROM analytics_sessions s
		WHERE s.id = $1
		ON CONFLICT DO NOTHING`, sessionID, requestID)
}

// RecordFirstChatMessage links a conversation to the session, only if the
// message just stored is the conversation's first visitor message, and at
// most once per conversation (unique index).
func (r *AnalyticsRepository) RecordFirstChatMessage(ctx context.Context, sessionID, conversationID string) (bool, error) {
	return r.recordConversion(ctx, `
		INSERT INTO analytics_events (id, session_id, visitor_id, type, conversation_id)
		SELECT gen_random_uuid(), s.id, s.visitor_id, 'chat_first_message', $2
		FROM analytics_sessions s
		WHERE s.id = $1
		  AND (SELECT count(*) FROM chat_messages m
		        WHERE m.conversation_id = $2 AND m.author = 'visitor') = 1
		ON CONFLICT DO NOTHING`, sessionID, conversationID)
}

func (r *AnalyticsRepository) recordConversion(ctx context.Context, query, sessionID, targetID string) (bool, error) {
	tag, err := r.pool.Exec(ctx, query, sessionID, targetID)
	if err != nil {
		return false, err
	}
	if tag.RowsAffected() == 0 {
		return false, nil
	}
	_, err = r.pool.Exec(ctx,
		`UPDATE analytics_sessions SET last_seen_at = now(), event_count = event_count + 1 WHERE id = $1`, sessionID)
	return true, err
}

// Purge deletes events, and sessions without activity, older than before.
func (r *AnalyticsRepository) Purge(ctx context.Context, before time.Time) (events, sessions int64, err error) {
	tag, err := r.pool.Exec(ctx, `DELETE FROM analytics_events WHERE occurred_at < $1`, before)
	if err != nil {
		return 0, 0, err
	}
	events = tag.RowsAffected()
	tag, err = r.pool.Exec(ctx, `DELETE FROM analytics_sessions WHERE last_seen_at < $1`, before)
	if err != nil {
		return events, 0, err
	}
	return events, tag.RowsAffected(), nil
}

// sessionsInPeriod: sessions started in [$1, $2) with a "converted" flag —
// at least one request or first chat message, however many.
const sessionsInPeriod = `
	s AS (
		SELECT s.*, EXISTS (
			SELECT 1 FROM analytics_events e
			WHERE e.session_id = s.id AND e.type IN ('lead_submit', 'chat_first_message')
		) AS converted
		FROM analytics_sessions s
		WHERE s.started_at >= $1 AND s.started_at < $2
	)`

// firstVisitorMessages: when each conversation got its first visitor message.
const firstVisitorMessages = `
	(SELECT min(created_at) AS first_at FROM chat_messages WHERE author = 'visitor' GROUP BY conversation_id)`

// Report reads every dashboard figure for [from, to). fromDate/toDate are
// the same bounds as Asia/Almaty dates, for the per-day series.
func (r *AnalyticsRepository) Report(ctx context.Context, from, to time.Time, fromDate, toDate string) (analytics.Report, error) {
	var rep analytics.Report
	t := &rep.Totals
	err := r.pool.QueryRow(ctx, `WITH `+sessionsInPeriod+`
		SELECT
			(SELECT count(*) FROM s),
			(SELECT count(DISTINCT visitor_id) FROM s),
			(SELECT count(*) FROM s WHERE converted),
			(SELECT count(*) FROM analytics_events WHERE type = 'page_view' AND occurred_at >= $1 AND occurred_at < $2),
			(SELECT count(*) FROM analytics_events WHERE type = 'whatsapp_click' AND occurred_at >= $1 AND occurred_at < $2),
			(SELECT count(*) FROM analytics_events WHERE type = 'phone_click' AND occurred_at >= $1 AND occurred_at < $2),
			(SELECT count(*) FROM analytics_events WHERE type = 'lead_submit' AND occurred_at >= $1 AND occurred_at < $2),
			(SELECT count(*) FROM analytics_events WHERE type = 'chat_first_message' AND occurred_at >= $1 AND occurred_at < $2),
			(SELECT count(*) FROM project_requests WHERE created_at >= $1 AND created_at < $2),
			(SELECT count(*) FROM `+firstVisitorMessages+` f WHERE f.first_at >= $1 AND f.first_at < $2)`,
		from, to).Scan(&t.Sessions, &t.Visitors, &t.ConvertedSessions, &t.PageViews, &t.WhatsAppClicks, &t.PhoneClicks,
		&t.LinkedRequests, &t.LinkedChats, &t.Requests, &t.NewChats)
	if err != nil {
		return rep, err
	}

	rows, err := r.pool.Query(ctx, `WITH
		days AS (SELECT d::date AS day FROM generate_series($3::date, $4::date, interval '1 day') d),
		`+sessionsInPeriod+`,
		sd AS (SELECT (started_at AT TIME ZONE 'Asia/Almaty')::date AS day, count(*) AS n, count(*) FILTER (WHERE converted) AS c FROM s GROUP BY 1),
		pv AS (SELECT (occurred_at AT TIME ZONE 'Asia/Almaty')::date AS day, count(*) AS n FROM analytics_events
		        WHERE type = 'page_view' AND occurred_at >= $1 AND occurred_at < $2 GROUP BY 1),
		rq AS (SELECT (created_at AT TIME ZONE 'Asia/Almaty')::date AS day, count(*) AS n FROM project_requests
		        WHERE created_at >= $1 AND created_at < $2 GROUP BY 1),
		ch AS (SELECT (first_at AT TIME ZONE 'Asia/Almaty')::date AS day, count(*) AS n FROM `+firstVisitorMessages+` f
		        WHERE first_at >= $1 AND first_at < $2 GROUP BY 1)
		SELECT to_char(days.day, 'YYYY-MM-DD'), COALESCE(sd.n, 0), COALESCE(pv.n, 0), COALESCE(rq.n, 0), COALESCE(ch.n, 0), COALESCE(sd.c, 0)
		FROM days
		LEFT JOIN sd ON sd.day = days.day LEFT JOIN pv ON pv.day = days.day
		LEFT JOIN rq ON rq.day = days.day LEFT JOIN ch ON ch.day = days.day
		ORDER BY days.day`, from, to, fromDate, toDate)
	if err != nil {
		return rep, err
	}
	rep.Days, err = collect(rows, func(row pgx.Rows) (analytics.DayPoint, error) {
		var d analytics.DayPoint
		return d, row.Scan(&d.Day, &d.Sessions, &d.PageViews, &d.Requests, &d.NewChats, &d.ConvertedSessions)
	})
	if err != nil {
		return rep, err
	}

	sourceQuery := func(columns, where string) ([]analytics.SourceRow, error) {
		rows, err := r.pool.Query(ctx, `WITH `+sessionsInPeriod+`
			SELECT `+columns+`, count(*), count(DISTINCT visitor_id), count(*) FILTER (WHERE converted)
			FROM s `+where+` GROUP BY 1, 2, 3 ORDER BY 4 DESC, 1, 2, 3 LIMIT 20`, from, to)
		if err != nil {
			return nil, err
		}
		return collect(rows, func(row pgx.Rows) (analytics.SourceRow, error) {
			var s analytics.SourceRow
			return s, row.Scan(&s.Source, &s.Medium, &s.Campaign, &s.Sessions, &s.Visitors, &s.ConvertedSessions)
		})
	}
	if rep.Sources, err = sourceQuery(`source, medium, ''`, ``); err != nil {
		return rep, err
	}
	if rep.FirstSources, err = sourceQuery(`first_source, first_medium, ''`, ``); err != nil {
		return rep, err
	}
	if rep.Campaigns, err = sourceQuery(`source, medium, campaign`, `WHERE campaign IS NOT NULL`); err != nil {
		return rep, err
	}

	rows, err = r.pool.Query(ctx, `
		SELECT path, count(*), count(DISTINCT session_id) FROM analytics_events
		WHERE type = 'page_view' AND occurred_at >= $1 AND occurred_at < $2
		GROUP BY path ORDER BY 2 DESC, 1 LIMIT 20`, from, to)
	if err != nil {
		return rep, err
	}
	if rep.Pages, err = collect(rows, func(row pgx.Rows) (analytics.PageRow, error) {
		var p analytics.PageRow
		return p, row.Scan(&p.Path, &p.Views, &p.Sessions)
	}); err != nil {
		return rep, err
	}

	countBy := func(column string) ([]analytics.CountRow, error) {
		rows, err := r.pool.Query(ctx, `WITH `+sessionsInPeriod+`
			SELECT COALESCE(`+column+`, ''), count(*) FROM s GROUP BY 1 ORDER BY 2 DESC, 1`, from, to)
		if err != nil {
			return nil, err
		}
		return collect(rows, func(row pgx.Rows) (analytics.CountRow, error) {
			var c analytics.CountRow
			return c, row.Scan(&c.Key, &c.Sessions)
		})
	}
	if rep.Devices, err = countBy("device"); err != nil {
		return rep, err
	}
	if rep.Languages, err = countBy("language"); err != nil {
		return rep, err
	}

	rows, err = r.pool.Query(ctx, sessionRowSelect+`
		WHERE s.started_at >= $1 AND s.started_at < $2
		GROUP BY s.id ORDER BY s.started_at DESC LIMIT 50`, from, to)
	if err != nil {
		return rep, err
	}
	rep.Recent, err = collect(rows, scanSessionRow)
	return rep, err
}

const sessionRowSelect = `
	SELECT s.id, s.visitor_id, s.started_at, s.last_seen_at, s.landing_path,
	       s.source, s.medium, COALESCE(s.campaign, ''), COALESCE(s.term, ''), COALESCE(s.content, ''),
	       COALESCE(s.referrer_host, ''), s.first_source, s.first_medium, COALESCE(s.first_campaign, ''),
	       s.device, COALESCE(s.language, ''),
	       count(e.id) FILTER (WHERE e.type = 'page_view'),
	       count(e.id) FILTER (WHERE e.type = 'promo_view'),
	       count(e.id) FILTER (WHERE e.type = 'promo_click'),
	       count(e.id) FILTER (WHERE e.type = 'whatsapp_click'),
	       count(e.id) FILTER (WHERE e.type = 'phone_click'),
	       count(e.id) FILTER (WHERE e.type = 'chat_open'),
	       COALESCE(array_agg(e.project_request_id::text) FILTER (WHERE e.project_request_id IS NOT NULL), '{}'),
	       COALESCE(array_agg(e.conversation_id::text) FILTER (WHERE e.conversation_id IS NOT NULL), '{}')
	FROM analytics_sessions s
	LEFT JOIN analytics_events e ON e.session_id = s.id`

func scanSessionRow(row pgx.Rows) (analytics.SessionRow, error) {
	var s analytics.SessionRow
	err := row.Scan(&s.ID, &s.VisitorID, &s.StartedAt, &s.LastSeenAt, &s.LandingPath,
		&s.Source, &s.Medium, &s.Campaign, &s.Term, &s.Content,
		&s.ReferrerHost, &s.First.Source, &s.First.Medium, &s.First.Campaign,
		&s.Device, &s.Language,
		&s.PageViews, &s.PromoViews, &s.PromoClicks, &s.WhatsAppClicks, &s.PhoneClicks, &s.ChatOpens,
		&s.RequestIDs, &s.ConversationIDs)
	return s, err
}

// SessionDetail returns one session, its events in order and what it led to.
func (r *AnalyticsRepository) SessionDetail(ctx context.Context, id string) (analytics.SessionDetail, error) {
	var d analytics.SessionDetail
	rows, err := r.pool.Query(ctx, sessionRowSelect+` WHERE s.id = $1 GROUP BY s.id`, id)
	if err != nil {
		return d, err
	}
	list, err := collect(rows, scanSessionRow)
	if err != nil {
		return d, err
	}
	if len(list) == 0 {
		return d, analytics.ErrNotFound
	}
	d.Session = list[0]

	rows, err = r.pool.Query(ctx, `
		SELECT id, session_id, visitor_id, type, occurred_at, path,
		       COALESCE(project_request_id::text, ''), COALESCE(conversation_id::text, '')
		FROM analytics_events WHERE session_id = $1 ORDER BY occurred_at, id`, id)
	if err != nil {
		return d, err
	}
	if d.Events, err = collect(rows, func(row pgx.Rows) (analytics.Event, error) {
		var e analytics.Event
		return e, row.Scan(&e.ID, &e.SessionID, &e.VisitorID, &e.Type, &e.OccurredAt, &e.Path, &e.ProjectRequestID, &e.ConversationID)
	}); err != nil {
		return d, err
	}

	rows, err = r.pool.Query(ctx, `
		SELECT id, number, project_type, status, created_at FROM project_requests
		WHERE id = ANY($1::uuid[]) ORDER BY created_at`, d.Session.RequestIDs)
	if err != nil {
		return d, err
	}
	if d.Requests, err = collect(rows, func(row pgx.Rows) (analytics.LinkedRequest, error) {
		var l analytics.LinkedRequest
		return l, row.Scan(&l.ID, &l.Number, &l.ProjectType, &l.Status, &l.CreatedAt)
	}); err != nil {
		return d, err
	}

	rows, err = r.pool.Query(ctx, `
		SELECT id, status, COALESCE(visitor_name, ''), COALESCE(visitor_contact, '') FROM chat_conversations
		WHERE id = ANY($1::uuid[]) ORDER BY created_at`, d.Session.ConversationIDs)
	if err != nil {
		return d, err
	}
	d.Conversations, err = collect(rows, func(row pgx.Rows) (analytics.LinkedConversation, error) {
		var c analytics.LinkedConversation
		return c, row.Scan(&c.ID, &c.Status, &c.VisitorName, &c.VisitorContact)
	})
	return d, err
}

func collect[T any](rows pgx.Rows, scan func(pgx.Rows) (T, error)) ([]T, error) {
	defer rows.Close()
	items := make([]T, 0)
	for rows.Next() {
		item, err := scan(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}
