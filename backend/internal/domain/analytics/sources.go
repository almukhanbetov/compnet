package analytics

// SourceSession is one session of the traffic sources report: where it
// came from, where its visitor first came from, and what it led to.
type SourceSession struct {
	VisitorID   string
	Source      string
	Medium      string
	FirstSource string
	FirstMedium string
	// Converted: the session has a stored request or first chat message.
	Converted bool
	// VisitorsFirst: this is the visitor's earliest session still stored
	// (details are kept for the retention period only).
	VisitorsFirst bool
}

// ChannelRow counts the sessions of one channel. Visitors are distinct
// browsers; a visitor is new in the channel whose session was their first
// one, returning in every other channel they used: New + Returning =
// Visitors in each row.
type ChannelRow struct {
	Key               string
	Sessions          int
	Visitors          int
	NewVisitors       int
	ReturningVisitors int
	ConvertedSessions int
}

// SourcesReport groups the sessions of a period by the channel of the
// session itself and by the channel of the visitor's first session.
type SourcesReport struct {
	Totals        ChannelRow // Key ""; distinct visitors over all channels
	Channels      []ChannelRow
	FirstChannels []ChannelRow
}
