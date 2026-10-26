package postgres

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/almukha/compnet-backend/internal/domain/baseprice"
)

// BasePriceRepository stores the base price versions of the project types
// and the administrators' changes to them.
type BasePriceRepository struct {
	pool *pgxpool.Pool
}

// NewBasePriceRepository builds a repository backed by the given pool.
func NewBasePriceRepository(pool *pgxpool.Pool) *BasePriceRepository {
	return &BasePriceRepository{pool: pool}
}

const currentBasePrices = `
	SELECT p.id, p.project_type, p.version, p.base_price_tenge, p.change_reason, COALESCE(s.display_name, ''), p.created_at
	FROM project_type_prices p
	LEFT JOIN staff_users s ON s.id = p.created_by
	WHERE p.is_current`

func scanCurrent(row pgx.Row) (baseprice.Current, error) {
	var c baseprice.Current
	var price int64
	err := row.Scan(&c.VersionID, &c.ProjectType, &c.Version, &price, &c.Reason, &c.AuthorName, &c.CreatedAt)
	c.PriceTenge = &price
	return c, err
}

// Current returns the base price in force of every project type that has one.
func (r *BasePriceRepository) Current(ctx context.Context) ([]baseprice.Current, error) {
	rows, err := r.pool.Query(ctx, currentBasePrices+" ORDER BY p.project_type")
	if err != nil {
		return nil, err
	}
	return collect(rows, func(row pgx.Rows) (baseprice.Current, error) { return scanCurrent(row) })
}

// Change stores a new current version of a project type's base price; the
// previous ones stay (history, and the estimates calculated with them).
// The current version is locked FOR NO KEY UPDATE — the request being saved
// holds it FOR SHARE, so one waits for the other; a request's foreign key
// check (KEY SHARE) is not blocked. seed is the price a type without a
// stored version had (its first version is then 1).
func (r *BasePriceRepository) Change(ctx context.Context, staffID string, ch baseprice.Change, seed int64) (baseprice.Current, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return baseprice.Current{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	var curID string
	curVersion, curPrice := 0, seed
	err = tx.QueryRow(ctx, `
		SELECT id, version, base_price_tenge FROM project_type_prices
		WHERE project_type = $1 AND is_current FOR NO KEY UPDATE`, ch.ProjectType).Scan(&curID, &curVersion, &curPrice)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return baseprice.Current{}, err
	}
	if curVersion != ch.ExpectedVersion {
		return baseprice.Current{}, baseprice.ErrVersionConflict
	}
	if curID != "" {
		if _, err := tx.Exec(ctx, `UPDATE project_type_prices SET is_current = FALSE WHERE id = $1`, curID); err != nil {
			return baseprice.Current{}, err
		}
	}
	var id string
	var version int
	if err := tx.QueryRow(ctx, `
		INSERT INTO project_type_prices (project_type, version, base_price_tenge, change_reason, is_current, created_by)
		SELECT $1, COALESCE(max(version), 0) + 1, $2, $3, TRUE, NULLIF($4, '')::uuid
		FROM project_type_prices WHERE project_type = $1
		RETURNING id, version`, ch.ProjectType, ch.PriceTenge, ch.Reason, staffID).Scan(&id, &version); err != nil {
		return baseprice.Current{}, err
	}
	if err := audit(ctx, tx, staffID, "base_price", id, "create", map[string]any{
		"project_type": ch.ProjectType, "version": version, "price_tenge": ch.PriceTenge,
		"previous_version": curVersion, "previous_price_tenge": curPrice, "reason": ch.Reason,
	}); err != nil {
		return baseprice.Current{}, err
	}
	c, err := scanCurrent(tx.QueryRow(ctx, currentBasePrices+" AND p.id = $1", id))
	if err != nil {
		return baseprice.Current{}, err
	}
	return c, tx.Commit(ctx)
}

// History returns a project type's base price versions, newest first.
func (r *BasePriceRepository) History(ctx context.Context, projectType string, limit int) ([]baseprice.HistoryEntry, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT version, base_price_tenge, previous_price, change_reason, author, created_at, is_current, requests
		FROM (
			SELECT p.version, p.base_price_tenge, lag(p.base_price_tenge) OVER (ORDER BY p.version) AS previous_price,
			       p.change_reason, COALESCE(s.display_name, '') AS author, p.created_at, p.is_current,
			       (SELECT count(*) FROM project_estimates e WHERE e.base_price_version_id = p.id) AS requests
			FROM project_type_prices p
			LEFT JOIN staff_users s ON s.id = p.created_by
			WHERE p.project_type = $1
		) h
		ORDER BY version DESC
		LIMIT $2`, projectType, limit)
	if err != nil {
		return nil, err
	}
	return collect(rows, func(row pgx.Rows) (baseprice.HistoryEntry, error) {
		var h baseprice.HistoryEntry
		err := row.Scan(&h.Version, &h.PriceTenge, &h.PreviousPriceTenge, &h.Reason, &h.AuthorName, &h.CreatedAt, &h.IsCurrent, &h.Requests)
		return h, err
	})
}

// lockBasePrice checks, inside a request's transaction and before the
// request is stored, that the base price version its estimate was
// calculated with is still current — under a shared lock, so a change
// waits for this request or this request sees the change.
func lockBasePrice(ctx context.Context, tx pgx.Tx, versionID string) error {
	var current bool
	if err := tx.QueryRow(ctx, `SELECT is_current FROM project_type_prices WHERE id = $1 FOR SHARE`, versionID).Scan(&current); err != nil {
		return err
	}
	if !current {
		return baseprice.ErrPriceChanged
	}
	return nil
}
