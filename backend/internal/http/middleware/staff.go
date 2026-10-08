package middleware

import (
	"context"

	"github.com/gin-gonic/gin"

	"github.com/almukha/compnet-backend/internal/domain/staff"
	"github.com/almukha/compnet-backend/internal/http/apierr"
)

const (
	// ManagerCookieName holds the staff session token.
	ManagerCookieName = "compnet_manager"
	// ManagerCookiePath limits the cookie to the manager API.
	ManagerCookiePath = "/api/v1/manager"

	staffContextKey = "compnet.staff"
)

// Authenticator resolves a session token to the staff user (see
// staffauth.Service.Authenticate).
type Authenticator interface {
	Authenticate(ctx context.Context, token string) (staff.User, error)
}

// RequireStaff authenticates every request from the manager session cookie:
// the session must exist, be unexpired and unrevoked, its owner active and
// in a role with access. Otherwise the request ends with 401/403.
func RequireStaff(auth Authenticator) gin.HandlerFunc {
	return func(c *gin.Context) {
		token, _ := c.Cookie(ManagerCookieName)
		user, err := auth.Authenticate(c.Request.Context(), token)
		if err != nil {
			apierr.Write(c, err)
			c.Abort()
			return
		}
		c.Set(staffContextKey, user)
		c.Next()
	}
}

// StaffFromContext returns the user set by RequireStaff.
func StaffFromContext(c *gin.Context) (staff.User, bool) {
	value, ok := c.Get(staffContextKey)
	if !ok {
		return staff.User{}, false
	}
	user, ok := value.(staff.User)
	return user, ok
}

// NoStore forbids caching of responses (private manager data).
func NoStore() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Cache-Control", "no-store")
		c.Next()
	}
}
