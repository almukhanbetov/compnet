package postgres

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/almukha/compnet-backend/internal/domain/content"
)

// ContentRepository reads public marketing content (services, pricing,
// portfolio, testimonials) from PostgreSQL. It has no write methods — there
// is no admin path yet.
type ContentRepository struct {
	pool *pgxpool.Pool
}

// NewContentRepository builds a repository backed by the given pool.
func NewContentRepository(pool *pgxpool.Pool) *ContentRepository {
	return &ContentRepository{pool: pool}
}

const publishedFilter = "published_at IS NOT NULL AND published_at <= now()"

func (r *ContentRepository) ListServicesOverview(ctx context.Context) ([]content.ServiceOverview, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT slug, title, description, features, icon, sort_order
		FROM services_overview
		WHERE `+publishedFilter+`
		ORDER BY sort_order`)
	if err != nil {
		return nil, fmt.Errorf("list services overview: %w", err)
	}
	defer rows.Close()

	var result []content.ServiceOverview
	for rows.Next() {
		var item content.ServiceOverview
		if err := rows.Scan(&item.Slug, &item.Title, &item.Description, &item.Features, &item.Icon, &item.SortOrder); err != nil {
			return nil, fmt.Errorf("scan service overview: %w", err)
		}
		result = append(result, item)
	}
	return result, rows.Err()
}

func (r *ContentRepository) ListServiceDetails(ctx context.Context) ([]content.ServiceDetail, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT sd.slug, sd.eyebrow, sd.title, sd.description, sd.points, sd.highlights
		FROM service_details sd
		JOIN services_overview so ON so.slug = sd.slug
		WHERE sd.published_at IS NOT NULL AND sd.published_at <= now()
		ORDER BY so.sort_order`)
	if err != nil {
		return nil, fmt.Errorf("list service details: %w", err)
	}
	defer rows.Close()

	var result []content.ServiceDetail
	for rows.Next() {
		detail, err := scanServiceDetail(rows)
		if err != nil {
			return nil, err
		}
		result = append(result, detail)
	}
	return result, rows.Err()
}

func (r *ContentRepository) GetServiceDetailBySlug(ctx context.Context, slug string) (content.ServiceDetail, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT slug, eyebrow, title, description, points, highlights
		FROM service_details
		WHERE slug = $1 AND `+publishedFilter, slug)
	if err != nil {
		return content.ServiceDetail{}, fmt.Errorf("get service detail: %w", err)
	}
	defer rows.Close()

	if !rows.Next() {
		if err := rows.Err(); err != nil {
			return content.ServiceDetail{}, fmt.Errorf("get service detail: %w", err)
		}
		return content.ServiceDetail{}, content.ErrNotFound
	}
	return scanServiceDetail(rows)
}

func scanServiceDetail(rows pgx.Rows) (content.ServiceDetail, error) {
	var (
		detail        content.ServiceDetail
		highlightsRaw []byte
	)
	if err := rows.Scan(&detail.Slug, &detail.Eyebrow, &detail.Title, &detail.Description, &detail.Points, &highlightsRaw); err != nil {
		return content.ServiceDetail{}, fmt.Errorf("scan service detail: %w", err)
	}
	if err := json.Unmarshal(highlightsRaw, &detail.Highlights); err != nil {
		return content.ServiceDetail{}, fmt.Errorf("decode service detail highlights: %w", err)
	}
	return detail, nil
}

func (r *ContentRepository) ListPricingCards(ctx context.Context) ([]content.PricingCard, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT project_type, description, features, service_href, sort_order
		FROM pricing_cards
		WHERE `+publishedFilter+`
		ORDER BY sort_order`)
	if err != nil {
		return nil, fmt.Errorf("list pricing cards: %w", err)
	}
	defer rows.Close()

	var result []content.PricingCard
	for rows.Next() {
		var item content.PricingCard
		if err := rows.Scan(&item.ProjectType, &item.Description, &item.Features, &item.ServiceHref, &item.SortOrder); err != nil {
			return nil, fmt.Errorf("scan pricing card: %w", err)
		}
		result = append(result, item)
	}
	return result, rows.Err()
}

func (r *ContentRepository) ListPortfolioCases(ctx context.Context) ([]content.PortfolioCase, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT slug, title, category, COALESCE(subcategory, ''), summary, task, process,
		       solution, technologies, result, duration, gradient_from, gradient_to,
		       COALESCE(screenshot_url, ''), COALESCE(external_url, ''), sort_order
		FROM portfolio_cases
		WHERE `+publishedFilter+`
		ORDER BY sort_order`)
	if err != nil {
		return nil, fmt.Errorf("list portfolio cases: %w", err)
	}
	defer rows.Close()

	var result []content.PortfolioCase
	for rows.Next() {
		item, err := scanPortfolioCase(rows)
		if err != nil {
			return nil, err
		}
		result = append(result, item)
	}
	return result, rows.Err()
}

func (r *ContentRepository) GetPortfolioCaseBySlug(ctx context.Context, slug string) (content.PortfolioCase, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT slug, title, category, COALESCE(subcategory, ''), summary, task, process,
		       solution, technologies, result, duration, gradient_from, gradient_to,
		       COALESCE(screenshot_url, ''), COALESCE(external_url, ''), sort_order
		FROM portfolio_cases
		WHERE slug = $1 AND `+publishedFilter, slug)
	if err != nil {
		return content.PortfolioCase{}, fmt.Errorf("get portfolio case: %w", err)
	}
	defer rows.Close()

	if !rows.Next() {
		if err := rows.Err(); err != nil {
			return content.PortfolioCase{}, fmt.Errorf("get portfolio case: %w", err)
		}
		return content.PortfolioCase{}, content.ErrNotFound
	}
	return scanPortfolioCase(rows)
}

func scanPortfolioCase(rows pgx.Rows) (content.PortfolioCase, error) {
	var item content.PortfolioCase
	err := rows.Scan(
		&item.Slug, &item.Title, &item.Category, &item.Subcategory, &item.Summary, &item.Task,
		&item.Process, &item.Solution, &item.Technologies, &item.Result, &item.Duration,
		&item.GradientFrom, &item.GradientTo, &item.ScreenshotURL, &item.ExternalURL, &item.SortOrder,
	)
	if err != nil {
		return content.PortfolioCase{}, fmt.Errorf("scan portfolio case: %w", err)
	}
	return item, nil
}

func (r *ContentRepository) ListTestimonials(ctx context.Context) ([]content.Testimonial, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, name, role, company, quote, rating, initials, sort_order
		FROM testimonials
		WHERE `+publishedFilter+`
		ORDER BY sort_order`)
	if err != nil {
		return nil, fmt.Errorf("list testimonials: %w", err)
	}
	defer rows.Close()

	var result []content.Testimonial
	for rows.Next() {
		var item content.Testimonial
		if err := rows.Scan(&item.ID, &item.Name, &item.Role, &item.Company, &item.Quote, &item.Rating, &item.Initials, &item.SortOrder); err != nil {
			return nil, fmt.Errorf("scan testimonial: %w", err)
		}
		result = append(result, item)
	}
	return result, rows.Err()
}
