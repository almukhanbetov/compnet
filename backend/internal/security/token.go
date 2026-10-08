// Package security holds small, dependency-free primitives for opaque
// bearer tokens (generation, format checks and hashing for storage).
package security

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
)

// tokenBytes is the amount of randomness in a token: 256 bits.
const tokenBytes = 32

// tokenLength is the base64url (no padding) length of a token.
var tokenLength = base64.RawURLEncoding.EncodedLen(tokenBytes)

// NewToken returns a new random token (safe for cookies and URLs) and the
// SHA-256 hash that should be stored instead of it.
func NewToken() (token string, hash []byte, err error) {
	buf := make([]byte, tokenBytes)
	if _, err := rand.Read(buf); err != nil {
		return "", nil, fmt.Errorf("security: generate token: %w", err)
	}
	token = base64.RawURLEncoding.EncodeToString(buf)
	return token, HashToken(token), nil
}

// HashToken returns the SHA-256 of a token. A fast hash is appropriate here:
// the token carries 256 bits of randomness, so it cannot be brute-forced
// the way a password could.
func HashToken(token string) []byte {
	sum := sha256.Sum256([]byte(token))
	return sum[:]
}

// ValidTokenFormat reports whether s looks like a token produced by
// NewToken, so malformed cookie values can be ignored without a database
// lookup.
func ValidTokenFormat(s string) bool {
	if len(s) != tokenLength {
		return false
	}
	decoded, err := base64.RawURLEncoding.DecodeString(s)
	return err == nil && len(decoded) == tokenBytes
}
