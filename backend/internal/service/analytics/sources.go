package analytics

import (
	"context"

	"github.com/almukha/compnet-backend/internal/apperr"
	"github.com/almukha/compnet-backend/internal/attribution"
	"github.com/almukha/compnet-backend/internal/domain/analytics"
)

// SourcesResult is the traffic sources payload.
type SourcesResult struct {
	Period Period
	Report analytics.SourcesReport
}

// Sources returns the sessions started in whole Asia/Almaty days [from, to]
// by channel: of the session itself and of the visitor's first session.
func (s *Service) Sources(ctx context.Context, fromDate, toDate string) (SourcesResult, error) {
	period, ok := ParsePeriod(fromDate, toDate)
	if !ok {
		return SourcesResult{}, apperr.Validation("проверьте период", map[string]string{
			"period": "даты YYYY-MM-DD, from ≤ to, не больше 366 дней",
		})
	}
	sessions, err := s.repo.SourceSessions(ctx, period.From, period.To)
	if err != nil {
		return SourcesResult{}, apperr.Internal(err)
	}
	return SourcesResult{Period: period, Report: BuildSourcesReport(sessions)}, nil
}

// BuildSourcesReport counts sessions per channel (attribution.SessionChannel):
// every channel is listed, in report order, even without sessions.
func BuildSourcesReport(sessions []analytics.SourceSession) analytics.SourcesReport {
	return analytics.SourcesReport{
		Totals:   countChannel("", sessions, func(analytics.SourceSession) string { return "" }),
		Channels: byChannel(sessions, func(s analytics.SourceSession) string { return attribution.SessionChannel(s.Source, s.Medium) }),
		FirstChannels: byChannel(sessions, func(s analytics.SourceSession) string {
			return attribution.SessionChannel(s.FirstSource, s.FirstMedium)
		}),
	}
}

func byChannel(sessions []analytics.SourceSession, channel func(analytics.SourceSession) string) []analytics.ChannelRow {
	rows := make([]analytics.ChannelRow, 0, len(attribution.SessionChannels))
	for _, key := range attribution.SessionChannels {
		rows = append(rows, countChannel(key, sessions, channel))
	}
	return rows
}

// countChannel counts the sessions whose channel is key.
func countChannel(key string, sessions []analytics.SourceSession, channel func(analytics.SourceSession) string) analytics.ChannelRow {
	row := analytics.ChannelRow{Key: key}
	visitors, first := map[string]bool{}, map[string]bool{}
	for _, s := range sessions {
		if channel(s) != key {
			continue
		}
		row.Sessions++
		visitors[s.VisitorID] = true
		if s.VisitorsFirst {
			first[s.VisitorID] = true
		}
		if s.Converted {
			row.ConvertedSessions++
		}
	}
	row.Visitors, row.NewVisitors = len(visitors), len(first)
	row.ReturningVisitors = row.Visitors - row.NewVisitors
	return row
}
