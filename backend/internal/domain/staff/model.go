// Package staff holds the domain model for COMPNET staff accounts and their
// server-side sessions. Nothing here imports Gin or database drivers.
package staff

import (
	"errors"
	"time"
)

var (
	// ErrNotFound is returned when a staff user or a valid session does not exist.
	ErrNotFound = errors.New("staff: not found")
	// ErrEmailTaken is returned when creating a user whose email already exists.
	ErrEmailTaken = errors.New("staff: email already registered")
)

// Role is a staff member's role. Only roles listed in managerRoles may use
// the manager section; everything else is denied by default.
type Role string

const (
	RoleManager Role = "manager"
	RoleAdmin   Role = "admin"
)

var managerRoles = map[Role]bool{RoleManager: true, RoleAdmin: true}

// CanUseManagerSection reports whether the role grants access to the
// manager API.
func (r Role) CanUseManagerSection() bool {
	return managerRoles[r]
}

// Limits shared by validation and the database CHECK constraints.
const (
	MaxEmailLength       = 254
	MaxDisplayNameLength = 100
	MinPasswordLength    = 12 // characters
	MaxPasswordBytes     = 72 // bcrypt's input limit
)

// User is a staff account. PasswordHash is a bcrypt hash and must never
// leave the service layer.
type User struct {
	ID           string
	Email        string
	PasswordHash string
	DisplayName  string
	Role         Role
	IsActive     bool
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

// Session is a server-side login session; only its token hash is stored.
type Session struct {
	ID          string
	StaffUserID string
	ExpiresAt   time.Time
	CreatedAt   time.Time
}
