package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/almukha/compnet-backend/internal/http/response"
)

// RequireAllowedOrigin rejects state-changing requests (anything but GET,
// HEAD and OPTIONS) whose Origin header is missing or not on the allow-list.
// Browsers always send Origin on such requests, so this blocks cross-site
// request forgery against cookie-authenticated endpoints.
func RequireAllowedOrigin(allowedOrigins []string) gin.HandlerFunc {
	allowed := make(map[string]bool, len(allowedOrigins))
	for _, origin := range allowedOrigins {
		allowed[origin] = true
	}

	return func(c *gin.Context) {
		switch c.Request.Method {
		case http.MethodGet, http.MethodHead, http.MethodOptions:
			c.Next()
			return
		}

		if !allowed[c.GetHeader("Origin")] {
			response.Error(c, http.StatusForbidden, "forbidden", "request origin is not allowed")
			c.Abort()
			return
		}

		c.Next()
	}
}

// MaxBodyBytes caps the request body size; larger bodies fail JSON binding
// and are answered with 400.
func MaxBodyBytes(limit int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, limit)
		c.Next()
	}
}
