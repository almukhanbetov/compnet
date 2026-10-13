-- +goose Up
-- Daily totals of the visit counter, kept for good. Detailed sessions and
-- events are deleted after ANALYTICS_RETENTION_DAYS; right before that, the
-- cleanup task stores each affected Asia/Almaty day here, so the "all time"
-- counter never goes down. Only counts — no identifiers, paths or sources.
-- A day is written once, when it is long finished (it can no longer change:
-- sessions and page views are dated by the server when they arrive).
CREATE TABLE analytics_daily_totals (
    day         DATE PRIMARY KEY,              -- Asia/Almaty
    sessions    INTEGER NOT NULL,              -- visits started that day
    visitors    INTEGER NOT NULL,              -- distinct browsers with a visit started that day
    page_views  INTEGER NOT NULL,
    stored_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT analytics_daily_totals_counts_check
        CHECK (sessions >= 0 AND visitors >= 0 AND page_views >= 0 AND visitors <= sessions)
);

-- +goose Down
-- Rolling back loses the totals of days whose details were already deleted:
-- the "all time" counter then only covers the retention period.
DROP TABLE IF EXISTS analytics_daily_totals;
