package analytics

import (
	"testing"

	"github.com/almukha/compnet-backend/internal/domain/analytics"
)

func TestBuildSourcesReport(t *testing.T) {
	s := func(visitor, source, medium, firstSource, firstMedium string, converted, first bool) analytics.SourceSession {
		return analytics.SourceSession{VisitorID: visitor, Source: source, Medium: medium, FirstSource: firstSource, FirstMedium: firstMedium, Converted: converted, VisitorsFirst: first}
	}
	rep := BuildSourcesReport([]analytics.SourceSession{
		s("v1", "google", "organic", "google", "organic", false, true), // v1 new via Google
		s("v1", "google", "organic", "google", "organic", true, false), // …back via Google, converted
		s("v1", "(direct)", "(none)", "google", "organic", false, false),
		s("v2", "google", "cpc", "google", "cpc", true, true),
		s("v3", "chatgpt.com", "(not set)", "(direct)", "(none)", false, false), // first visit before the period
	})
	if rep.Totals.Sessions != 5 || rep.Totals.Visitors != 3 || rep.Totals.NewVisitors != 2 || rep.Totals.ReturningVisitors != 1 || rep.Totals.ConvertedSessions != 2 {
		t.Fatalf("totals: %+v", rep.Totals)
	}
	if len(rep.Channels) != 7 || rep.Channels[0].Key != "google_organic" || rep.Channels[6].Key != "other" {
		t.Fatalf("channels must list all 7 in order: %+v", rep.Channels)
	}
	want := map[string]analytics.ChannelRow{
		"google_organic": {Sessions: 2, Visitors: 1, NewVisitors: 1, ReturningVisitors: 0, ConvertedSessions: 1},
		"google_cpc":     {Sessions: 1, Visitors: 1, NewVisitors: 1, ConvertedSessions: 1},
		"chatgpt":        {Sessions: 1, Visitors: 1, ReturningVisitors: 1},
		"direct":         {Sessions: 1, Visitors: 1, ReturningVisitors: 1}, // v1 returning in another channel
		"social":         {}, "referral": {}, "other": {},
	}
	for _, row := range rep.Channels {
		w := want[row.Key]
		w.Key = row.Key
		if row != w {
			t.Errorf("channel %s: %+v, want %+v", row.Key, row, w)
		}
	}
	first := map[string]int{}
	for _, row := range rep.FirstChannels {
		first[row.Key] = row.Sessions
	}
	if first["google_organic"] != 3 || first["google_cpc"] != 1 || first["direct"] != 1 {
		t.Errorf("by first source: %v", first)
	}
	if empty := BuildSourcesReport(nil); empty.Totals.Sessions != 0 || len(empty.Channels) != 7 {
		t.Errorf("empty: %+v", empty)
	}
}
