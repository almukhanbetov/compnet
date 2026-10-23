package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"log"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/almukha/compnet-backend/internal/domain/projectrequest"
)

// ProjectRequestRepository persists project requests against PostgreSQL.
type ProjectRequestRepository struct {
	pool *pgxpool.Pool
}

// NewProjectRequestRepository builds a repository backed by the given pool.
func NewProjectRequestRepository(pool *pgxpool.Pool) *ProjectRequestRepository {
	return &ProjectRequestRepository{pool: pool}
}

// Create inserts the request, its selected features and its estimate in a
// single transaction: either all three are stored, or none are. The
// request's source (attribution) is optional: it is written in the same
// transaction behind a savepoint, so a failure there drops only the source
// and never the request itself.
func (r *ProjectRequestRepository) Create(
	ctx context.Context,
	request projectrequest.ProjectRequest,
	features []projectrequest.Feature,
	estimate projectrequest.Estimate,
	attribution *projectrequest.Attribution,
) (projectrequest.ProjectRequest, projectrequest.Estimate, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return projectrequest.ProjectRequest{}, projectrequest.Estimate{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	const insertRequest = `
		INSERT INTO project_requests
			(name, phone, email, company, project_type, description,
			 budget_range, desired_timeline, contact_method, consent, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		RETURNING id, number, status, created_at, updated_at`

	err = tx.QueryRow(ctx, insertRequest,
		request.Name,
		nullableString(request.Phone),
		nullableString(request.Email),
		nullableString(request.Company),
		request.ProjectType,
		request.Description,
		nullableString(request.BudgetRange),
		nullableString(request.DesiredTimeline),
		string(request.ContactMethod),
		request.Consent,
		string(request.Status),
	).Scan(&request.ID, &request.Number, &request.Status, &request.CreatedAt, &request.UpdatedAt)
	if err != nil {
		return projectrequest.ProjectRequest{}, projectrequest.Estimate{}, err
	}

	const insertFeature = `
		INSERT INTO project_request_features
			(project_request_id, module_id, quantity, unit_price_tenge)
		VALUES ($1, $2, $3, $4)`

	for _, f := range features {
		if _, err := tx.Exec(ctx, insertFeature, request.ID, f.ModuleID, f.Quantity, f.UnitPriceTenge); err != nil {
			return projectrequest.ProjectRequest{}, projectrequest.Estimate{}, err
		}
	}

	breakdownJSON, err := json.Marshal(estimate.Breakdown)
	if err != nil {
		return projectrequest.ProjectRequest{}, projectrequest.Estimate{}, err
	}

	const insertEstimate = `
		INSERT INTO project_estimates
			(project_request_id, pricing_version, is_individual, minimum_tenge,
			 maximum_tenge, duration_label, breakdown)
		VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
		RETURNING id, created_at`

	estimate.ProjectRequestID = request.ID
	err = tx.QueryRow(ctx, insertEstimate,
		request.ID,
		estimate.PricingVersion,
		estimate.IsIndividual,
		estimate.MinimumTenge,
		estimate.MaximumTenge,
		estimate.DurationLabel,
		string(breakdownJSON),
	).Scan(&estimate.ID, &estimate.CreatedAt)
	if err != nil {
		return projectrequest.ProjectRequest{}, projectrequest.Estimate{}, err
	}

	if attribution != nil {
		insertAttribution(ctx, tx, request.ID, attribution)
	}

	if err := tx.Commit(ctx); err != nil {
		return projectrequest.ProjectRequest{}, projectrequest.Estimate{}, err
	}

	return request, estimate, nil
}

// insertAttribution stores a request's source behind a savepoint (a nested
// pgx transaction). The source is optional data reported by the browser:
// if it cannot be stored, the savepoint is rolled back and the request is
// saved without it ("unknown" in the reports), instead of losing a valid
// request. Only the PostgreSQL error code is logged, never the values.
func insertAttribution(ctx context.Context, tx pgx.Tx, requestID string, a *projectrequest.Attribution) {
	const query = `
		INSERT INTO project_request_attribution
			(project_request_id, channel, source, source_page, previous_page, landing_page,
			 referrer_host, utm_source, utm_medium, utm_campaign, utm_content, utm_term, click_id_type)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`
	sp, err := tx.Begin(ctx) // SAVEPOINT
	if err != nil {
		log.Printf("projectrequest: request source not stored (savepoint: %s)", errorCode(err))
		return
	}
	if _, err := sp.Exec(ctx, query,
		requestID, a.Channel, a.Source,
		nullableString(a.SourcePage), nullableString(a.PreviousPage), nullableString(a.LandingPage),
		nullableString(a.ReferrerHost), nullableString(a.UTMSource), nullableString(a.UTMMedium),
		nullableString(a.UTMCampaign), nullableString(a.UTMContent), nullableString(a.UTMTerm),
		nullableString(a.ClickIDType),
	); err != nil {
		_ = sp.Rollback(ctx) // ROLLBACK TO SAVEPOINT: the request itself stays
		log.Printf("projectrequest: request source not stored (%s)", errorCode(err))
		return
	}
	if err := sp.Commit(ctx); err != nil { // RELEASE SAVEPOINT
		_ = sp.Rollback(ctx)
		log.Printf("projectrequest: request source not stored (release: %s)", errorCode(err))
	}
}

// errorCode is a loggable summary of a database error: the SQLSTATE and the
// constraint name, never the message (it may quote the values).
func errorCode(err error) string {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		if pgErr.ConstraintName != "" {
			return "SQLSTATE " + pgErr.Code + ", constraint " + pgErr.ConstraintName
		}
		return "SQLSTATE " + pgErr.Code
	}
	if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
		return err.Error()
	}
	return "non-database error"
}

// nullableString turns an empty string into a NULL parameter so optional
// columns and CHECK constraints (e.g. "phone or email required") behave
// correctly — an empty string is not NULL in SQL.
func nullableString(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
