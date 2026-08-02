package postgres

import (
	"context"
	"encoding/json"

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
// single transaction: either all three are stored, or none are.
func (r *ProjectRequestRepository) Create(
	ctx context.Context,
	request projectrequest.ProjectRequest,
	features []projectrequest.Feature,
	estimate projectrequest.Estimate,
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
		RETURNING id, status, created_at, updated_at`

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
	).Scan(&request.ID, &request.Status, &request.CreatedAt, &request.UpdatedAt)
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

	if err := tx.Commit(ctx); err != nil {
		return projectrequest.ProjectRequest{}, projectrequest.Estimate{}, err
	}

	return request, estimate, nil
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
