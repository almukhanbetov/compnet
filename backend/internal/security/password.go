package security

import (
	"golang.org/x/crypto/bcrypt"
)

// DefaultBcryptCost is the work factor for staff password hashes.
const DefaultBcryptCost = 12

// BcryptHasher hashes and verifies passwords with bcrypt.
type BcryptHasher struct {
	Cost int
}

// Hash returns the bcrypt hash of password.
func (h BcryptHasher) Hash(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), h.Cost)
	if err != nil {
		return "", err
	}
	return string(hash), nil
}

// Matches reports whether password matches hash. Any malformed hash is
// simply a mismatch.
func (h BcryptHasher) Matches(hash, password string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}
