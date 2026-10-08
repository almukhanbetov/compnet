package staffauth

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/almukha/compnet-backend/internal/apperr"
	"github.com/almukha/compnet-backend/internal/domain/staff"
	"github.com/almukha/compnet-backend/internal/security"
)

type fakeSession struct {
	staffID   string
	expiresAt time.Time
	revoked   bool
}

type fakeRepo struct {
	users    map[string]*staff.User // by email
	sessions map[string]*fakeSession
	now      func() time.Time
}

func newFakeRepo(now func() time.Time) *fakeRepo {
	return &fakeRepo{users: map[string]*staff.User{}, sessions: map[string]*fakeSession{}, now: now}
}

func (f *fakeRepo) Create(_ context.Context, u staff.User) (staff.User, error) {
	if _, ok := f.users[u.Email]; ok {
		return staff.User{}, staff.ErrEmailTaken
	}
	u.ID = fmt.Sprintf("staff-%d", len(f.users)+1)
	f.users[u.Email] = &u
	return u, nil
}

func (f *fakeRepo) FindByEmail(_ context.Context, email string) (staff.User, error) {
	if u, ok := f.users[email]; ok {
		return *u, nil
	}
	return staff.User{}, staff.ErrNotFound
}

func (f *fakeRepo) byID(id string) *staff.User {
	for _, u := range f.users {
		if u.ID == id {
			return u
		}
	}
	return nil
}

func (f *fakeRepo) CreateSession(_ context.Context, id string, hash []byte, exp time.Time) (staff.Session, error) {
	f.sessions[string(hash)] = &fakeSession{staffID: id, expiresAt: exp}
	return staff.Session{StaffUserID: id, ExpiresAt: exp}, nil
}

func (f *fakeRepo) FindSession(_ context.Context, hash []byte) (staff.User, staff.Session, error) {
	s, ok := f.sessions[string(hash)]
	if !ok || s.revoked || !s.expiresAt.After(f.now()) {
		return staff.User{}, staff.Session{}, staff.ErrNotFound
	}
	return *f.byID(s.staffID), staff.Session{StaffUserID: s.staffID, ExpiresAt: s.expiresAt}, nil
}

func (f *fakeRepo) RevokeSession(_ context.Context, hash []byte) error {
	if s, ok := f.sessions[string(hash)]; ok {
		s.revoked = true
	}
	return nil
}

func (f *fakeRepo) PruneSessions(context.Context, string) error { return nil }

type allowAll struct{}

func (allowAll) Allow(string) (bool, time.Duration) { return true, 0 }

// countingLimiter allows n attempts per key.
type countingLimiter struct {
	n    int
	seen map[string]int
}

func (c *countingLimiter) Allow(key string) (bool, time.Duration) {
	if c.seen == nil {
		c.seen = map[string]int{}
	}
	c.seen[key]++
	if c.seen[key] > c.n {
		return false, 3 * time.Minute
	}
	return true, 0
}

const goodPassword = "correct horse battery"

type env struct {
	svc  *Service
	repo *fakeRepo
	now  time.Time
}

func newEnv(t *testing.T, opts Options) *env {
	t.Helper()
	e := &env{now: time.Date(2026, 10, 9, 10, 0, 0, 0, time.UTC)}
	e.repo = newFakeRepo(func() time.Time { return e.now })
	if opts.SessionTTL == 0 {
		opts.SessionTTL = 12 * time.Hour
	}
	if opts.LoginByIP == nil {
		opts.LoginByIP = allowAll{}
	}
	if opts.LoginByEmail == nil {
		opts.LoginByEmail = allowAll{}
	}
	svc, err := NewService(e.repo, security.BcryptHasher{Cost: 4}, opts)
	if err != nil {
		t.Fatal(err)
	}
	svc.now = func() time.Time { return e.now }
	e.svc = svc
	return e
}

func (e *env) createStaff(t *testing.T, email string, role staff.Role) staff.User {
	t.Helper()
	u, err := e.svc.CreateStaff(context.Background(), CreateStaffInput{Email: email, DisplayName: "Анна", Role: role, Password: goodPassword})
	if err != nil {
		t.Fatalf("CreateStaff: %v", err)
	}
	return u
}

func wantCode(t *testing.T, err error, code apperr.Code) {
	t.Helper()
	var appErr *apperr.Error
	if !errors.As(err, &appErr) || appErr.Code != code {
		t.Fatalf("want %s, got %v", code, err)
	}
}

func login(e *env, email, password string) (LoginResult, error) {
	return e.svc.Login(context.Background(), LoginInput{Email: email, Password: password, ClientIP: "203.0.113.5"})
}

func TestCreateStaff_HashesPasswordAndNormalizesEmail(t *testing.T) {
	e := newEnv(t, Options{})
	u := e.createStaff(t, "  Anna@COMPNET.kz ", staff.RoleManager)

	if u.Email != "anna@compnet.kz" || !u.IsActive {
		t.Fatalf("got %+v", u)
	}
	if u.PasswordHash == goodPassword || !strings.HasPrefix(u.PasswordHash, "$2") {
		t.Fatal("password must be stored as a bcrypt hash")
	}

	_, err := e.svc.CreateStaff(context.Background(), CreateStaffInput{Email: "anna@compnet.kz", DisplayName: "X", Role: staff.RoleManager, Password: goodPassword})
	wantCode(t, err, apperr.CodeConflict)
}

func TestCreateStaff_Validation(t *testing.T) {
	e := newEnv(t, Options{})
	tests := map[string]CreateStaffInput{
		"bad email":      {Email: "nope", DisplayName: "A", Role: staff.RoleManager, Password: goodPassword},
		"no name":        {Email: "a@b.kz", DisplayName: " ", Role: staff.RoleManager, Password: goodPassword},
		"client role":    {Email: "a@b.kz", DisplayName: "A", Role: "client", Password: goodPassword},
		"short password": {Email: "a@b.kz", DisplayName: "A", Role: staff.RoleManager, Password: "short"},
		"too long":       {Email: "a@b.kz", DisplayName: "A", Role: staff.RoleManager, Password: strings.Repeat("я", 40)},
	}
	for name, in := range tests {
		t.Run(name, func(t *testing.T) {
			_, err := e.svc.CreateStaff(context.Background(), in)
			wantCode(t, err, apperr.CodeValidation)
		})
	}
}

func TestLogin_CorrectAndWrongPassword(t *testing.T) {
	e := newEnv(t, Options{})
	u := e.createStaff(t, "anna@compnet.kz", staff.RoleManager)

	res, err := login(e, "ANNA@compnet.kz", goodPassword)
	if err != nil {
		t.Fatalf("login: %v", err)
	}
	if !security.ValidTokenFormat(res.Token) || res.User.ID != u.ID || !res.ExpiresAt.Equal(e.now.Add(12*time.Hour)) {
		t.Fatalf("unexpected result %+v", res)
	}
	if _, ok := e.repo.sessions[res.Token]; ok {
		t.Fatal("raw token must not be stored")
	}

	_, err = login(e, "anna@compnet.kz", "wrong password!!")
	wantCode(t, err, apperr.CodeUnauthorized)
}

func TestLogin_SameErrorForUnknownInactiveAndForbiddenRole(t *testing.T) {
	e := newEnv(t, Options{})
	e.createStaff(t, "inactive@compnet.kz", staff.RoleManager)
	e.repo.users["inactive@compnet.kz"].IsActive = false
	e.createStaff(t, "client@compnet.kz", staff.RoleManager)
	e.repo.users["client@compnet.kz"].Role = "client"

	var messages []string
	for _, email := range []string{"nobody@compnet.kz", "inactive@compnet.kz", "client@compnet.kz"} {
		_, err := login(e, email, goodPassword)
		wantCode(t, err, apperr.CodeUnauthorized)
		messages = append(messages, err.Error())
	}
	if messages[0] != messages[1] || messages[1] != messages[2] {
		t.Fatalf("responses must not reveal the reason: %q", messages)
	}
	if len(e.repo.sessions) != 0 {
		t.Fatal("no session may be created on failure")
	}
}

func TestLogin_RateLimited(t *testing.T) {
	byEmail := &countingLimiter{n: 3}
	e := newEnv(t, Options{LoginByEmail: byEmail})
	e.createStaff(t, "anna@compnet.kz", staff.RoleManager)

	for i := 0; i < 3; i++ {
		_, err := login(e, "anna@compnet.kz", "wrong password!!")
		wantCode(t, err, apperr.CodeUnauthorized)
	}
	// Even the right password is refused while limited.
	_, err := login(e, "Anna@compnet.kz", goodPassword)
	wantCode(t, err, apperr.CodeRateLimit)

	byIP := &countingLimiter{n: 1}
	e2 := newEnv(t, Options{LoginByIP: byIP})
	_, _ = login(e2, "x@compnet.kz", "whatever-long-pw")
	_, err = login(e2, "y@compnet.kz", "whatever-long-pw")
	wantCode(t, err, apperr.CodeRateLimit)
}

func TestAuthenticate_SessionLifecycle(t *testing.T) {
	e := newEnv(t, Options{SessionTTL: time.Hour})
	e.createStaff(t, "anna@compnet.kz", staff.RoleManager)
	ctx := context.Background()

	// Missing / malformed / unknown token.
	unknown, _, _ := security.NewToken()
	for _, token := range []string{"", "garbage", unknown} {
		_, err := e.svc.Authenticate(ctx, token)
		wantCode(t, err, apperr.CodeUnauthorized)
	}

	res, _ := login(e, "anna@compnet.kz", goodPassword)
	if u, err := e.svc.Authenticate(ctx, res.Token); err != nil || u.Email != "anna@compnet.kz" {
		t.Fatalf("valid session rejected: %v", err)
	}

	// Expired.
	e.now = e.now.Add(time.Hour + time.Second)
	_, err := e.svc.Authenticate(ctx, res.Token)
	wantCode(t, err, apperr.CodeUnauthorized)

	// Revoked by logout.
	res, _ = login(e, "anna@compnet.kz", goodPassword)
	if err := e.svc.Logout(ctx, res.Token); err != nil {
		t.Fatal(err)
	}
	_, err = e.svc.Authenticate(ctx, res.Token)
	wantCode(t, err, apperr.CodeUnauthorized)
}

func TestAuthenticate_ChecksUserOnEveryRequest(t *testing.T) {
	e := newEnv(t, Options{})
	e.createStaff(t, "anna@compnet.kz", staff.RoleManager)
	ctx := context.Background()
	res, _ := login(e, "anna@compnet.kz", goodPassword)

	e.repo.users["anna@compnet.kz"].Role = "client"
	_, err := e.svc.Authenticate(ctx, res.Token)
	wantCode(t, err, apperr.CodeForbidden)

	e.repo.users["anna@compnet.kz"].Role = staff.RoleAdmin
	if _, err := e.svc.Authenticate(ctx, res.Token); err != nil {
		t.Fatalf("admin rejected: %v", err)
	}

	e.repo.users["anna@compnet.kz"].IsActive = false
	_, err = e.svc.Authenticate(ctx, res.Token)
	wantCode(t, err, apperr.CodeUnauthorized)
	if !e.repo.sessions[string(security.HashToken(res.Token))].revoked {
		t.Fatal("session of a deactivated user must be revoked")
	}
}

func TestLogin_RevokesPreviousSessionCookie(t *testing.T) {
	e := newEnv(t, Options{})
	e.createStaff(t, "anna@compnet.kz", staff.RoleManager)
	first, _ := login(e, "anna@compnet.kz", goodPassword)

	second, err := e.svc.Login(context.Background(), LoginInput{Email: "anna@compnet.kz", Password: goodPassword, CurrentToken: first.Token})
	if err != nil {
		t.Fatal(err)
	}
	_, err = e.svc.Authenticate(context.Background(), first.Token)
	wantCode(t, err, apperr.CodeUnauthorized)
	if _, err := e.svc.Authenticate(context.Background(), second.Token); err != nil {
		t.Fatal(err)
	}
}

func TestValidatePassword(t *testing.T) {
	tests := map[string]bool{
		goodPassword:              true,
		"short":                   false,
		" leading space password": false,
		strings.Repeat("a", 72):   true,
		strings.Repeat("a", 73):   false,
		"twelve\x00chars!":        false,
	}
	for pw, ok := range tests {
		if got := ValidatePassword(pw) == ""; got != ok {
			t.Errorf("ValidatePassword(%q) ok=%v, want %v", pw, got, ok)
		}
	}
}
