package postgres

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/almukha/compnet-backend/internal/domain/staff"
)

// uniqueViolation is PostgreSQL's SQLSTATE for a unique constraint failure.
const uniqueViolation = "23505"

// StaffRepository persists staff users and their sessions.
type StaffRepository struct {
	pool *pgxpool.Pool
}

// NewStaffRepository builds a repository backed by the given pool.
func NewStaffRepository(pool *pgxpool.Pool) *StaffRepository {
	return &StaffRepository{pool: pool}
}

const staffColumns = `id, email, password_hash, display_name, role, is_active, created_at, updated_at`

func scanStaff(row pgx.Row) (staff.User, error) {
	var u staff.User
	err := row.Scan(&u.ID, &u.Email, &u.PasswordHash, &u.DisplayName, &u.Role, &u.IsActive, &u.CreatedAt, &u.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return staff.User{}, staff.ErrNotFound
	}
	return u, err
}

// Create inserts a staff user. It returns staff.ErrEmailTaken if the email
// is already registered.
func (r *StaffRepository) Create(ctx context.Context, u staff.User) (staff.User, error) {
	const query = `
		INSERT INTO staff_users (email, password_hash, display_name, role, is_active)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING ` + staffColumns

	created, err := scanStaff(r.pool.QueryRow(ctx, query, u.Email, u.PasswordHash, u.DisplayName, string(u.Role), u.IsActive))
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == uniqueViolation {
		return staff.User{}, staff.ErrEmailTaken
	}
	return created, err
}

// FindByEmail returns the user with this (normalized) email.
func (r *StaffRepository) FindByEmail(ctx context.Context, email string) (staff.User, error) {
	return scanStaff(r.pool.QueryRow(ctx, `SELECT `+staffColumns+` FROM staff_users WHERE email = $1`, email))
}

// CreateSession stores a new session for the user.
func (r *StaffRepository) CreateSession(ctx context.Context, staffUserID string, tokenHash []byte, expiresAt time.Time) (staff.Session, error) {
	const query = `
		INSERT INTO staff_sessions (token_hash, staff_user_id, expires_at)
		VALUES ($1, $2, $3)
		RETURNING id, staff_user_id, expires_at, created_at`

	var s staff.Session
	err := r.pool.QueryRow(ctx, query, tokenHash, staffUserID, expiresAt).
		Scan(&s.ID, &s.StaffUserID, &s.ExpiresAt, &s.CreatedAt)
	return s, err
}

// FindSession returns a session that is neither revoked nor expired, with
// its owner. The owner's is_active flag and role are returned as stored;
// the caller decides whether they allow access.
func (r *StaffRepository) FindSession(ctx context.Context, tokenHash []byte) (staff.User, staff.Session, error) {
	const query = `
		SELECT u.id, u.email, u.password_hash, u.display_name, u.role, u.is_active, u.created_at, u.updated_at,
		       s.id, s.staff_user_id, s.expires_at, s.created_at
		FROM staff_sessions s
		JOIN staff_users u ON u.id = s.staff_user_id
		WHERE s.token_hash = $1
		  AND s.revoked_at IS NULL
		  AND s.expires_at > now()`

	var (
		u staff.User
		s staff.Session
	)
	err := r.pool.QueryRow(ctx, query, tokenHash).Scan(
		&u.ID, &u.Email, &u.PasswordHash, &u.DisplayName, &u.Role, &u.IsActive, &u.CreatedAt, &u.UpdatedAt,
		&s.ID, &s.StaffUserID, &s.ExpiresAt, &s.CreatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return staff.User{}, staff.Session{}, staff.ErrNotFound
	}
	return u, s, err
}

// RevokeSession marks the session with this token hash as revoked. Revoking
// an unknown or already revoked session is not an error.
func (r *StaffRepository) RevokeSession(ctx context.Context, tokenHash []byte) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE staff_sessions SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL`, tokenHash)
	return err
}

// PruneSessions deletes the user's sessions that expired more than a week
// ago, keeping the table small while leaving recent ones for auditing.
func (r *StaffRepository) PruneSessions(ctx context.Context, staffUserID string) error {
	_, err := r.pool.Exec(ctx,
		`DELETE FROM staff_sessions WHERE staff_user_id = $1 AND expires_at < now() - interval '7 days'`, staffUserID)
	return err
}
