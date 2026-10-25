package postgres

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/almukha/compnet-backend/internal/domain/analytics"
)

// SourceSessions lists the sessions started in [from, to) for the traffic
// sources report: their stored sources, whether they converted (a request
// or first chat message, however many) and whether each is its visitor's
// earliest stored session. Identifiers never leave the backend.
func (r *AnalyticsRepository) SourceSessions(ctx context.Context, from, to time.Time) ([]analytics.SourceSession, error) {
	rows, err := r.pool.Query(ctx, `
		WITH p AS (
			SELECT id, visitor_id, source, medium, first_source, first_medium
			FROM analytics_sessions
			WHERE started_at >= $1 AND started_at < $2
		), firsts AS (
			SELECT DISTINCT ON (s.visitor_id) s.visitor_id, s.id
			FROM analytics_sessions s
			WHERE s.visitor_id IN (SELECT visitor_id FROM p)
			ORDER BY s.visitor_id, s.started_at, s.id
		), conv AS (
			SELECT DISTINCT e.session_id FROM analytics_events e
			WHERE e.type IN ('lead_submit', 'chat_first_message') AND e.session_id IN (SELECT id FROM p)
		)
		SELECT p.visitor_id, p.source, p.medium, p.first_source, p.first_medium,
		       c.session_id IS NOT NULL, f.id = p.id
		FROM p
		JOIN firsts f ON f.visitor_id = p.visitor_id
		LEFT JOIN conv c ON c.session_id = p.id`, from, to)
	if err != nil {
		return nil, err
	}
	return collect(rows, func(row pgx.Rows) (analytics.SourceSession, error) {
		var s analytics.SourceSession
		return s, row.Scan(&s.VisitorID, &s.Source, &s.Medium, &s.FirstSource, &s.FirstMedium, &s.Converted, &s.VisitorsFirst)
	})
}
