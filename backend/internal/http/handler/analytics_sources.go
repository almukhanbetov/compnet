package handler

import (
	"math"

	"github.com/gin-gonic/gin"

	"github.com/almukha/compnet-backend/internal/domain/analytics"
	"github.com/almukha/compnet-backend/internal/http/apierr"
	"github.com/almukha/compnet-backend/internal/http/response"
	analyticssvc "github.com/almukha/compnet-backend/internal/service/analytics"
)

// Sources handles GET /api/v1/manager/analytics/sources?from=YYYY-MM-DD&to=YYYY-MM-DD
// (Asia/Almaty dates, inclusive): sessions by channel, counts only.
func (h *AnalyticsHandler) Sources(c *gin.Context) {
	if !requireAnalyticsRole(c) {
		return
	}
	result, err := h.service.Sources(c.Request.Context(), c.Query("from"), c.Query("to"))
	if err != nil {
		apierr.Write(c, err)
		return
	}
	response.OK(c, newSourcesResponse(result))
}

// channelRowResponse is one channel. Conversion is the share of its
// sessions with an inquiry, Share its part of all sessions: percent with
// one decimal, null when there is nothing to divide by.
type channelRowResponse struct {
	Key               string   `json:"key,omitempty"`
	Sessions          int      `json:"sessions"`
	Visitors          int      `json:"visitors"`
	NewVisitors       int      `json:"new_visitors"`
	ReturningVisitors int      `json:"returning_visitors"`
	ConvertedSessions int      `json:"converted_sessions"`
	Conversion        *float64 `json:"conversion"`
	Share             *float64 `json:"share"`
}

type sourcesResponse struct {
	Period struct {
		From     string `json:"from"`
		To       string `json:"to"`
		TimeZone string `json:"time_zone"`
	} `json:"period"`
	Totals        channelRowResponse   `json:"totals"`
	Channels      []channelRowResponse `json:"channels"`       // by the session's own source
	FirstChannels []channelRowResponse `json:"first_channels"` // by the visitor's first source
}

// sourcePercent is part/whole in percent with one decimal, nil when whole is 0.
func sourcePercent(part, whole int) *float64 {
	if whole <= 0 {
		return nil
	}
	v := math.Round(float64(part)*1000/float64(whole)) / 10
	return &v
}

func newSourcesResponse(r analyticssvc.SourcesResult) sourcesResponse {
	var out sourcesResponse
	out.Period.From, out.Period.To, out.Period.TimeZone = r.Period.FromDate, r.Period.ToDate, analyticssvc.ReportZone
	total := r.Report.Totals.Sessions
	row := func(c analytics.ChannelRow) channelRowResponse {
		return channelRowResponse{
			Key: c.Key, Sessions: c.Sessions, Visitors: c.Visitors, NewVisitors: c.NewVisitors,
			ReturningVisitors: c.ReturningVisitors, ConvertedSessions: c.ConvertedSessions,
			Conversion: sourcePercent(c.ConvertedSessions, c.Sessions),
			Share:      sourcePercent(c.Sessions, total),
		}
	}
	out.Totals = row(r.Report.Totals)
	rows := func(list []analytics.ChannelRow) []channelRowResponse {
		res := make([]channelRowResponse, 0, len(list))
		for _, c := range list {
			res = append(res, row(c))
		}
		return res
	}
	out.Channels, out.FirstChannels = rows(r.Report.Channels), rows(r.Report.FirstChannels)
	return out
}
