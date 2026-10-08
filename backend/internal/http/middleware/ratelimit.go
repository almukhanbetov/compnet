package middleware

import (
	"time"

	"github.com/gin-gonic/gin"

	"github.com/almukha/compnet-backend/internal/http/apierr"
)

// Limiter is a per-key rate limiter (see internal/ratelimit).
type Limiter interface {
	Allow(key string) (bool, time.Duration)
}

// RateLimitByIP answers 429 once a client IP exceeds the limiter. The IP
// comes from gin's ClientIP, which only honours X-Forwarded-For / X-Real-IP
// from the configured trusted proxies.
func RateLimitByIP(limiter Limiter) gin.HandlerFunc {
	return func(c *gin.Context) {
		if ok, wait := limiter.Allow("ip:" + c.ClientIP()); !ok {
			apierr.WriteRateLimited(c, wait)
			c.Abort()
			return
		}
		c.Next()
	}
}
