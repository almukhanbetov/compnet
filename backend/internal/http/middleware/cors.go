// Package middleware holds cross-cutting Gin middleware (CORS, and future
// concerns like request logging or rate limiting).
package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// CORS allows browser requests from the configured origins only. It answers
// preflight OPTIONS requests directly and never reflects an origin that is
// not on the allow-list.
func CORS(allowedOrigins []string) gin.HandlerFunc {
	allowed := make(map[string]bool, len(allowedOrigins))
	for _, origin := range allowedOrigins {
		allowed[origin] = true
	}

	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if origin != "" && allowed[origin] {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Vary", "Origin")
			c.Header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			c.Header("Access-Control-Allow-Headers", "Content-Type")
		}

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}
