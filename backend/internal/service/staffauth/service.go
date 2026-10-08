// Package staffauth implements staff login with server-side sessions:
// password verification, login throttling, session issue/lookup/revocation
// and the per-request active/role checks. It also creates staff accounts
// for the create-staff command; there is no public registration.
package staffauth

import (
	"context"
	"errors"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/almukha/compnet-backend/internal/apperr"
	"github.com/almukha/compnet-backend/internal/domain/staff"
	"github.com/almukha/compnet-backend/internal/security"
)

// invalidCredentials is the single message for every failed login, so a
// response never reveals whether the email exists, is inactive or lacks
// the role.
const invalidCredentials = "неверный email или пароль"

var emailPattern = regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)

// Repository persists staff users and sessions.
type Repository interface {
	Create(ctx context.Context, u staff.User) (staff.User, error)
	FindByEmail(ctx context.Context, email string) (staff.User, error)
	CreateSession(ctx context.Context, staffUserID string, tokenHash []byte, expiresAt time.Time) (staff.Session, error)
	FindSession(ctx context.Context, tokenHash []byte) (staff.User, staff.Session, error)
	RevokeSession(ctx context.Context, tokenHash []byte) error
	PruneSessions(ctx context.Context, staffUserID string) error
}

// Hasher hashes and verifies passwords (see security.BcryptHasher).
type Hasher interface {
	Hash(password string) (string, error)
	Matches(hash, password string) bool
}

// Limiter is a per-key rate limiter (see internal/ratelimit).
type Limiter interface {
	Allow(key string) (bool, time.Duration)
}

// Options configures the service.
type Options struct {
	SessionTTL time.Duration
	// LoginByIP and LoginByEmail throttle login attempts per client IP and
	// per target email (successful attempts count too).
	LoginByIP    Limiter
	LoginByEmail Limiter
}

// Service implements staff authentication.
type Service struct {
	repo   Repository
	hasher Hasher
	opts   Options
	now    func() time.Time
	// dummyHash is compared against when the email is unknown, so such a
	// login takes as long as one with a wrong password.
	dummyHash string
}

// NewService builds the service. It hashes one random value up front to
// equalize login timing for unknown emails.
func NewService(repo Repository, hasher Hasher, opts Options) (*Service, error) {
	random, _, err := security.NewToken()
	if err != nil {
		return nil, err
	}
	dummy, err := hasher.Hash(random[:32])
	if err != nil {
		return nil, err
	}
	return &Service{repo: repo, hasher: hasher, opts: opts, now: time.Now, dummyHash: dummy}, nil
}

// NormalizeEmail trims and lowercases an email for storage and lookup.
func NormalizeEmail(raw string) string {
	return strings.ToLower(strings.TrimSpace(raw))
}

// LoginInput is a login attempt.
type LoginInput struct {
	Email    string
	Password string
	ClientIP string
	// CurrentToken is the session cookie already present, if any; it is
	// revoked on successful login so an old session cannot linger.
	CurrentToken string
}

// LoginResult is a new session: the raw token goes into the cookie and is
// never stored.
type LoginResult struct {
	User      staff.User
	Token     string
	ExpiresAt time.Time
}

// Login verifies credentials and opens a session. Every failure that
// depends on the account (unknown email, wrong password, inactive user,
// role without access) returns the same Unauthorized error.
func (s *Service) Login(ctx context.Context, in LoginInput) (LoginResult, error) {
	email := NormalizeEmail(in.Email)

	if ok, wait := s.opts.LoginByIP.Allow("ip:" + in.ClientIP); !ok {
		return LoginResult{}, apperr.RateLimited(wait)
	}
	if ok, wait := s.opts.LoginByEmail.Allow("email:" + email); !ok {
		return LoginResult{}, apperr.RateLimited(wait)
	}

	if email == "" || in.Password == "" {
		return LoginResult{}, apperr.Validation("введите email и пароль", map[string]string{
			"email":    "обязательное поле",
			"password": "обязательное поле",
		})
	}

	user, err := s.repo.FindByEmail(ctx, email)
	switch {
	case errors.Is(err, staff.ErrNotFound):
		s.hasher.Matches(s.dummyHash, in.Password)
		return LoginResult{}, apperr.Unauthorized(invalidCredentials)
	case err != nil:
		return LoginResult{}, apperr.Internal(err)
	}

	if !s.hasher.Matches(user.PasswordHash, in.Password) || !user.IsActive || !user.Role.CanUseManagerSection() {
		return LoginResult{}, apperr.Unauthorized(invalidCredentials)
	}

	token, hash, err := security.NewToken()
	if err != nil {
		return LoginResult{}, apperr.Internal(err)
	}
	session, err := s.repo.CreateSession(ctx, user.ID, hash, s.now().Add(s.opts.SessionTTL))
	if err != nil {
		return LoginResult{}, apperr.Internal(err)
	}

	if security.ValidTokenFormat(in.CurrentToken) {
		_ = s.repo.RevokeSession(ctx, security.HashToken(in.CurrentToken))
	}
	_ = s.repo.PruneSessions(ctx, user.ID) // housekeeping; failure is harmless

	return LoginResult{User: user, Token: token, ExpiresAt: session.ExpiresAt}, nil
}

// Authenticate resolves the session token to its staff user. It is called
// on every manager request: a missing, expired or revoked session, or a
// deactivated user, is Unauthorized; a role without access is Forbidden.
func (s *Service) Authenticate(ctx context.Context, token string) (staff.User, error) {
	if !security.ValidTokenFormat(token) {
		return staff.User{}, apperr.Unauthorized("требуется вход")
	}
	hash := security.HashToken(token)

	user, _, err := s.repo.FindSession(ctx, hash)
	switch {
	case errors.Is(err, staff.ErrNotFound):
		return staff.User{}, apperr.Unauthorized("требуется вход")
	case err != nil:
		return staff.User{}, apperr.Internal(err)
	}

	if !user.IsActive {
		// The account was deactivated after login: end the session for good.
		_ = s.repo.RevokeSession(ctx, hash)
		return staff.User{}, apperr.Unauthorized("требуется вход")
	}
	if !user.Role.CanUseManagerSection() {
		return staff.User{}, apperr.Forbidden("недостаточно прав")
	}
	return user, nil
}

// Logout revokes the session with this token, if any.
func (s *Service) Logout(ctx context.Context, token string) error {
	if !security.ValidTokenFormat(token) {
		return nil
	}
	if err := s.repo.RevokeSession(ctx, security.HashToken(token)); err != nil {
		return apperr.Internal(err)
	}
	return nil
}

// CreateStaffInput is a new staff account.
type CreateStaffInput struct {
	Email       string
	DisplayName string
	Role        staff.Role
	Password    string
}

// CreateStaff validates the input, hashes the password and stores the
// account. Only roles with manager-section access can be created.
func (s *Service) CreateStaff(ctx context.Context, in CreateStaffInput) (staff.User, error) {
	email := NormalizeEmail(in.Email)
	name := strings.TrimSpace(in.DisplayName)
	fields := map[string]string{}

	if !emailPattern.MatchString(email) || len(email) > staff.MaxEmailLength {
		fields["email"] = "некорректный email"
	}
	if name == "" || utf8.RuneCountInString(name) > staff.MaxDisplayNameLength {
		fields["name"] = "имя от 1 до 100 символов"
	}
	if !in.Role.CanUseManagerSection() {
		fields["role"] = "допустимые роли: manager, admin"
	}
	if msg := ValidatePassword(in.Password); msg != "" {
		fields["password"] = msg
	}
	if len(fields) > 0 {
		return staff.User{}, apperr.Validation("проверьте данные сотрудника", fields)
	}

	hash, err := s.hasher.Hash(in.Password)
	if err != nil {
		return staff.User{}, apperr.Internal(err)
	}

	user, err := s.repo.Create(ctx, staff.User{
		Email:        email,
		PasswordHash: hash,
		DisplayName:  name,
		Role:         in.Role,
		IsActive:     true,
	})
	if errors.Is(err, staff.ErrEmailTaken) {
		return staff.User{}, apperr.Conflict("сотрудник с таким email уже существует")
	}
	if err != nil {
		return staff.User{}, apperr.Internal(err)
	}
	return user, nil
}

// ValidatePassword returns a message describing why the password is not
// acceptable, or "" if it is.
func ValidatePassword(password string) string {
	switch {
	case !utf8.ValidString(password) || strings.ContainsRune(password, 0):
		return "недопустимые символы"
	case utf8.RuneCountInString(password) < staff.MinPasswordLength:
		return "не короче 12 символов"
	case len(password) > staff.MaxPasswordBytes:
		return "не длиннее 72 байт"
	case strings.TrimSpace(password) != password:
		return "без пробелов в начале и конце"
	}
	return ""
}
