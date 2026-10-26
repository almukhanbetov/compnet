package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/almukha/compnet-backend/internal/domain/tariff"
)

// TariffRepository stores tariffs, their price versions, promotions and the
// administrators' changes to them. Costs are read only by the admin queries.
type TariffRepository struct {
	pool *pgxpool.Pool
}

// NewTariffRepository builds a repository backed by the given pool.
func NewTariffRepository(pool *pgxpool.Pool) *TariffRepository {
	return &TariffRepository{pool: pool}
}

// tariffSelect reads tariffs with their current version; the cost column is
// added only for administrators (withCost).
func tariffSelect(withCost bool) string {
	cost := "NULL::bigint"
	join := ""
	if withCost {
		cost = "c.cost_tenge"
		join = "LEFT JOIN tariff_version_costs c ON c.tariff_version_id = v.id"
	}
	return `
		SELECT t.id, t.slug, t.title, t.description, t.sort_order, t.is_active,
		       v.id, v.version, v.price_tenge, v.price_kind, v.project_type, v.features,
		       v.allowed_module_ids, v.duration_label, v.created_at, ` + cost + `
		FROM tariffs t
		JOIN tariff_versions v ON v.tariff_id = t.id AND v.is_current
		` + join + "\n"
}

func scanTariff(row pgx.Row) (tariff.Tariff, error) {
	var t tariff.Tariff
	err := row.Scan(&t.ID, &t.Slug, &t.Title, &t.Description, &t.SortOrder, &t.IsActive,
		&t.Current.ID, &t.Current.Number, &t.Current.PriceTenge, &t.Current.PriceKind, &t.Current.ProjectType,
		&t.Current.Features, &t.Current.AllowedModuleIDs, &t.Current.DurationLabel, &t.Current.CreatedAt, &t.Current.CostTenge)
	t.Current.TariffID = t.ID
	return t, err
}

// ListTariffs returns the tariffs in display order: active ones only for the
// public, all (with costs) for administrators.
func (r *TariffRepository) ListTariffs(ctx context.Context, activeOnly, withCost bool) ([]tariff.Tariff, error) {
	where := ""
	if activeOnly {
		where = "WHERE t.is_active"
	}
	rows, err := r.pool.Query(ctx, tariffSelect(withCost)+where+" ORDER BY t.sort_order, t.slug")
	if err != nil {
		return nil, err
	}
	return collect(rows, func(row pgx.Rows) (tariff.Tariff, error) { return scanTariff(row) })
}

// GetTariff returns one tariff by slug (active only unless asked otherwise).
func (r *TariffRepository) GetTariff(ctx context.Context, slug string, activeOnly bool) (tariff.Tariff, error) {
	where := "WHERE t.slug = $1"
	if activeOnly {
		where += " AND t.is_active"
	}
	t, err := scanTariff(r.pool.QueryRow(ctx, tariffSelect(false)+where, slug))
	if errors.Is(err, pgx.ErrNoRows) {
		return t, tariff.ErrNotFound
	}
	return t, err
}

// promotionSelect counts the places a promotion has given away: confirmed
// ones, and reserved ones not older than the reservation deadline ($1, in
// seconds) — an expired reservation frees its place even before the cleanup
// job marks it released.
const promotionSelect = `
	SELECT p.id, p.slug, p.title, p.tariff_id, p.discount_tenge, p.starts_at, p.ends_at,
	       p.max_orders, p.is_active, p.version,
	       count(r.id) FILTER (WHERE r.status = 'confirmed'
	                            OR (r.status = 'reserved' AND r.reserved_at > now() - make_interval(secs => $1))),
	       count(r.id) FILTER (WHERE r.status = 'confirmed')
	FROM promotions p
	LEFT JOIN promotion_reservations r ON r.promotion_id = p.id AND r.status <> 'released'`

func scanPromotion(row pgx.Row) (tariff.Promotion, error) {
	var p tariff.Promotion
	err := row.Scan(&p.ID, &p.Slug, &p.Title, &p.TariffID, &p.DiscountTenge, &p.StartsAt, &p.EndsAt,
		&p.MaxOrders, &p.IsActive, &p.Version, &p.Taken, &p.Confirmed)
	return p, err
}

// ListPromotions returns every promotion with its counts.
func (r *TariffRepository) ListPromotions(ctx context.Context, ttl time.Duration) ([]tariff.Promotion, error) {
	rows, err := r.pool.Query(ctx, promotionSelect+` GROUP BY p.id ORDER BY p.created_at, p.slug`, ttl.Seconds())
	if err != nil {
		return nil, err
	}
	return collect(rows, func(row pgx.Rows) (tariff.Promotion, error) { return scanPromotion(row) })
}

// ActivePromotion returns a tariff's active promotion (at most one exists),
// whatever its dates; nil without one.
func (r *TariffRepository) ActivePromotion(ctx context.Context, tariffID string, ttl time.Duration) (*tariff.Promotion, error) {
	p, err := scanPromotion(r.pool.QueryRow(ctx, promotionSelect+` WHERE p.tariff_id = $2 AND p.is_active GROUP BY p.id`, ttl.Seconds(), tariffID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func audit(ctx context.Context, tx pgx.Tx, staffID, entity, entityID, action string, details any) error {
	raw, err := json.Marshal(details)
	if err != nil {
		return err
	}
	_, err = tx.Exec(ctx, `
		INSERT INTO pricing_audit_log (staff_user_id, entity, entity_id, action, details)
		VALUES (NULLIF($1, '')::uuid, $2, $3, $4, $5::jsonb)`, staffID, entity, entityID, action, string(raw))
	return err
}

// UpdateTariff applies a patch and logs it.
func (r *TariffRepository) UpdateTariff(ctx context.Context, staffID, slug string, p tariff.TariffPatch) (tariff.Tariff, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return tariff.Tariff{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	var id string
	err = tx.QueryRow(ctx, `
		UPDATE tariffs SET title = COALESCE($2, title), description = COALESCE($3, description),
		       sort_order = COALESCE($4, sort_order), is_active = COALESCE($5, is_active), updated_at = now()
		WHERE slug = $1 RETURNING id`, slug, p.Title, p.Description, p.SortOrder, p.IsActive).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		return tariff.Tariff{}, tariff.ErrNotFound
	}
	if err != nil {
		return tariff.Tariff{}, err
	}
	if err := audit(ctx, tx, staffID, "tariff", id, "update", p); err != nil {
		return tariff.Tariff{}, err
	}
	t, err := scanTariff(tx.QueryRow(ctx, tariffSelect(true)+"WHERE t.id = $1", id))
	if err != nil {
		return tariff.Tariff{}, err
	}
	return t, tx.Commit(ctx)
}

// CreateVersion stores a new price version and makes it current; the
// previous ones stay as history. cost is optional (administrators only).
func (r *TariffRepository) CreateVersion(ctx context.Context, staffID, slug string, v tariff.Version, cost *int64) (tariff.Tariff, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return tariff.Tariff{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	var tariffID string
	if err := tx.QueryRow(ctx, `SELECT id FROM tariffs WHERE slug = $1 FOR UPDATE`, slug).Scan(&tariffID); errors.Is(err, pgx.ErrNoRows) {
		return tariff.Tariff{}, tariff.ErrNotFound
	} else if err != nil {
		return tariff.Tariff{}, err
	}
	if _, err := tx.Exec(ctx, `UPDATE tariff_versions SET is_current = FALSE WHERE tariff_id = $1 AND is_current`, tariffID); err != nil {
		return tariff.Tariff{}, err
	}
	var versionID string
	var number int
	if err := tx.QueryRow(ctx, `
		INSERT INTO tariff_versions (tariff_id, version, price_tenge, price_kind, project_type, features,
		                             allowed_module_ids, duration_label, is_current, created_by)
		SELECT $1, COALESCE(max(version), 0) + 1, $2, $3, $4, $5, $6, $7, TRUE, NULLIF($8, '')::uuid
		FROM tariff_versions WHERE tariff_id = $1
		RETURNING id, version`, tariffID, v.PriceTenge, string(v.PriceKind), v.ProjectType, v.Features,
		v.AllowedModuleIDs, v.DurationLabel, staffID).Scan(&versionID, &number); err != nil {
		return tariff.Tariff{}, err
	}
	if cost != nil {
		if _, err := tx.Exec(ctx, `INSERT INTO tariff_version_costs (tariff_version_id, cost_tenge, updated_by) VALUES ($1, $2, NULLIF($3, '')::uuid)`,
			versionID, *cost, staffID); err != nil {
			return tariff.Tariff{}, err
		}
	}
	if err := audit(ctx, tx, staffID, "tariff_version", versionID, "create", map[string]any{
		"tariff": slug, "version": number, "price_tenge": v.PriceTenge, "price_kind": v.PriceKind,
		"project_type": v.ProjectType, "allowed_module_ids": v.AllowedModuleIDs, "cost_set": cost != nil,
	}); err != nil {
		return tariff.Tariff{}, err
	}
	t, err := scanTariff(tx.QueryRow(ctx, tariffSelect(true)+"WHERE t.id = $1", tariffID))
	if err != nil {
		return tariff.Tariff{}, err
	}
	return t, tx.Commit(ctx)
}

// SetCurrentCost sets the internal cost of a tariff's current version.
func (r *TariffRepository) SetCurrentCost(ctx context.Context, staffID, slug string, cost int64) (tariff.Tariff, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return tariff.Tariff{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	var tariffID, versionID string
	err = tx.QueryRow(ctx, `
		SELECT t.id, v.id FROM tariffs t JOIN tariff_versions v ON v.tariff_id = t.id AND v.is_current
		WHERE t.slug = $1 FOR UPDATE OF t`, slug).Scan(&tariffID, &versionID)
	if errors.Is(err, pgx.ErrNoRows) {
		return tariff.Tariff{}, tariff.ErrNotFound
	}
	if err != nil {
		return tariff.Tariff{}, err
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO tariff_version_costs (tariff_version_id, cost_tenge, updated_by) VALUES ($1, $2, NULLIF($3, '')::uuid)
		ON CONFLICT (tariff_version_id) DO UPDATE SET cost_tenge = EXCLUDED.cost_tenge, updated_by = EXCLUDED.updated_by, updated_at = now()`,
		versionID, cost, staffID); err != nil {
		return tariff.Tariff{}, err
	}
	if err := audit(ctx, tx, staffID, "tariff_cost", versionID, "set", map[string]any{"tariff": slug}); err != nil {
		return tariff.Tariff{}, err
	}
	t, err := scanTariff(tx.QueryRow(ctx, tariffSelect(true)+"WHERE t.id = $1", tariffID))
	if err != nil {
		return tariff.Tariff{}, err
	}
	return t, tx.Commit(ctx)
}

// UpdatePromotion applies a patch, validates the result with check and
// logs it; the promotion's version is raised.
func (r *TariffRepository) UpdatePromotion(ctx context.Context, staffID, slug string, patch tariff.PromotionPatch, ttl time.Duration, check tariff.PromotionCheck) (tariff.Promotion, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return tariff.Promotion{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	var id string
	if err := tx.QueryRow(ctx, `SELECT id FROM promotions WHERE slug = $1 FOR UPDATE`, slug).Scan(&id); errors.Is(err, pgx.ErrNoRows) {
		return tariff.Promotion{}, tariff.ErrNotFound
	} else if err != nil {
		return tariff.Promotion{}, err
	}
	p, err := scanPromotion(tx.QueryRow(ctx, promotionSelect+` WHERE p.id = $2 GROUP BY p.id`, ttl.Seconds(), id))
	if err != nil {
		return tariff.Promotion{}, err
	}
	if patch.Title != nil {
		p.Title = *patch.Title
	}
	if patch.DiscountTenge != nil {
		p.DiscountTenge = *patch.DiscountTenge
	}
	if patch.ClearDates {
		p.StartsAt, p.EndsAt = nil, nil
	}
	if patch.StartsAt != nil {
		p.StartsAt = patch.StartsAt
	}
	if patch.EndsAt != nil {
		p.EndsAt = patch.EndsAt
	}
	if patch.MaxOrders != nil {
		p.MaxOrders = *patch.MaxOrders
	}
	if patch.IsActive != nil {
		p.IsActive = *patch.IsActive
	}
	t, err := scanTariff(tx.QueryRow(ctx, tariffSelect(true)+"WHERE t.id = $1", p.TariffID))
	if err != nil {
		return tariff.Promotion{}, err
	}
	if err := check(p, t); err != nil {
		return tariff.Promotion{}, err
	}
	if _, err := tx.Exec(ctx, `
		UPDATE promotions SET title = $2, discount_tenge = $3, starts_at = $4, ends_at = $5, max_orders = $6,
		       is_active = $7, version = version + 1, updated_at = now()
		WHERE id = $1`, id, p.Title, p.DiscountTenge, p.StartsAt, p.EndsAt, p.MaxOrders, p.IsActive); err != nil {
		return tariff.Promotion{}, err
	}
	if err := audit(ctx, tx, staffID, "promotion", id, "update", map[string]any{
		"discount_tenge": p.DiscountTenge, "starts_at": p.StartsAt, "ends_at": p.EndsAt,
		"max_orders": p.MaxOrders, "is_active": p.IsActive,
	}); err != nil {
		return tariff.Promotion{}, err
	}
	p, err = scanPromotion(tx.QueryRow(ctx, promotionSelect+` WHERE p.id = $2 GROUP BY p.id`, ttl.Seconds(), id))
	if err != nil {
		return tariff.Promotion{}, err
	}
	return p, tx.Commit(ctx)
}

// reservePromotion takes a promotional place for a request, inside the
// request's transaction. The promotion row is locked, so concurrent requests
// take places one after another; the promotion is checked again by the
// database clock (active, inside its period, still on this tariff, below
// the tariff's price), expired
// reservations are released first, and a place is taken only while fewer
// than max_orders are held. Returns the discount and version in force, or
// ok=false when the request goes at the regular price.
func reservePromotion(ctx context.Context, tx pgx.Tx, promotionID, tariffID, requestID string, basePrice int64, ttl time.Duration) (discount int64, version int, ok bool, err error) {
	var maxOrders int
	err = tx.QueryRow(ctx, `
		SELECT discount_tenge, version, max_orders FROM promotions
		WHERE id = $1 AND tariff_id = $2 AND is_active AND starts_at <= now() AND now() < ends_at AND discount_tenge < $3
		FOR UPDATE`, promotionID, tariffID, basePrice).Scan(&discount, &version, &maxOrders)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, 0, false, nil
	}
	if err != nil {
		return 0, 0, false, err
	}
	if _, err := releaseExpired(ctx, tx, ttl, promotionID); err != nil {
		return 0, 0, false, err
	}
	var taken int
	if err := tx.QueryRow(ctx, `SELECT count(*) FROM promotion_reservations WHERE promotion_id = $1 AND status <> 'released'`,
		promotionID).Scan(&taken); err != nil {
		return 0, 0, false, err
	}
	if taken >= maxOrders {
		return 0, 0, false, nil
	}
	if _, err := tx.Exec(ctx, `INSERT INTO promotion_reservations (promotion_id, project_request_id) VALUES ($1, $2)`,
		promotionID, requestID); err != nil {
		return 0, 0, false, err
	}
	return discount, version, true, nil
}

// commandExecer is a pool or a transaction.
type commandExecer interface {
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
}

// releaseExpired marks reservations unconfirmed for longer than ttl as
// released (of one promotion, or of all when promotionID is "").
func releaseExpired(ctx context.Context, q commandExecer, ttl time.Duration, promotionID string) (int64, error) {
	tag, err := q.Exec(ctx, `
		UPDATE promotion_reservations SET status = 'released', release_reason = 'expired', released_at = now()
		WHERE status = 'reserved' AND reserved_at <= now() - make_interval(secs => $1)
		  AND ($2 = '' OR promotion_id = $2::uuid)`, ttl.Seconds(), promotionID)
	if err != nil {
		return 0, err
	}
	return tag.RowsAffected(), nil
}

// ReleaseExpiredReservations frees the places of reservations nobody
// confirmed in time (run periodically; reserving does it too).
func (r *TariffRepository) ReleaseExpiredReservations(ctx context.Context, ttl time.Duration) (int64, error) {
	return releaseExpired(ctx, r.pool, ttl, "")
}

// Request statuses that confirm a promotional order, and those that give the
// place back (with the reason stored).
var (
	confirmingStatuses = map[string]bool{"in_progress": true, "completed": true, "accepted": true}
	releasingStatuses  = map[string]string{"rejected": "rejected", "archived": "archived"}
)

// applyReservationStatus follows a request's new status: confirms its
// reserved place, or releases a reserved or confirmed one. Inside the status
// change's transaction. Any other status changes nothing.
func applyReservationStatus(ctx context.Context, tx pgx.Tx, requestID, status string) error {
	if confirmingStatuses[status] {
		_, err := tx.Exec(ctx, `
			UPDATE promotion_reservations SET status = 'confirmed', confirmed_at = now()
			WHERE project_request_id = $1 AND status = 'reserved'`, requestID)
		return err
	}
	if reason, ok := releasingStatuses[status]; ok {
		_, err := tx.Exec(ctx, `
			UPDATE promotion_reservations SET status = 'released', release_reason = $2, released_at = now()
			WHERE project_request_id = $1 AND status IN ('reserved', 'confirmed')`, requestID, reason)
		return err
	}
	return nil
}
