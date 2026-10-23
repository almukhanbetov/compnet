package postgres

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5/pgconn"
)

// A failed source insert is logged by its error code only: PostgreSQL
// messages may quote the rejected values (UTM tags reported by a browser).
func TestErrorCodeNeverLogsTheMessage(t *testing.T) {
	cases := []struct {
		err  error
		want string
	}{
		{&pgconn.PgError{Code: "23514", ConstraintName: "project_request_attribution_lengths_check", Message: "new row … utm_campaign client@example.com"}, "SQLSTATE 23514, constraint project_request_attribution_lengths_check"},
		{fmt.Errorf("insert: %w", &pgconn.PgError{Code: "P0001", Message: "secret value"}), "SQLSTATE P0001"},
		{context.Canceled, "context canceled"},
		{errors.New("dial tcp: secret host"), "non-database error"},
	}
	for _, c := range cases {
		got := errorCode(c.err)
		if got != c.want {
			t.Errorf("errorCode(%v) = %q, want %q", c.err, got, c.want)
		}
		if strings.Contains(got, "secret") || strings.Contains(got, "@") {
			t.Errorf("errorCode leaks the message: %q", got)
		}
	}
}
