// Package apierr maps internal/apperr domain errors to the standard HTTP
// error envelope. It is the only place that turns a business error into a
// status code, and the only place internal error details are logged.
package apierr

import (
	"errors"
	"log"
	"math"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/almukha/compnet-backend/internal/apperr"
	"github.com/almukha/compnet-backend/internal/http/response"
)

// Write inspects err and writes the matching HTTP error response. Unknown
// error types and internal errors are logged server-side and returned to
// the client as a generic 500 — no internal detail ever reaches the JSON
// body.
func Write(c *gin.Context, err error) {
	var appErr *apperr.Error
	if !errors.As(err, &appErr) {
		log.Printf("apierr: unhandled error: %v", err)
		response.Error(c, http.StatusInternalServerError, string(apperr.CodeInternal), "internal server error")
		return
	}

	switch appErr.Code {
	case apperr.CodeValidation:
		response.ErrorWithFields(c, http.StatusUnprocessableEntity, string(appErr.Code), appErr.Message, appErr.Fields)
	case apperr.CodeBadRequest:
		response.Error(c, http.StatusBadRequest, string(appErr.Code), appErr.Message)
	case apperr.CodeNotFound:
		response.Error(c, http.StatusNotFound, string(appErr.Code), appErr.Message)
	case apperr.CodeConflict:
		response.Error(c, http.StatusConflict, string(appErr.Code), appErr.Message)
	case apperr.CodeUnauthorized:
		response.Error(c, http.StatusUnauthorized, string(appErr.Code), appErr.Message)
	case apperr.CodeForbidden:
		response.Error(c, http.StatusForbidden, string(appErr.Code), appErr.Message)
	case apperr.CodeRateLimit:
		WriteRateLimited(c, appErr.RetryAfter)
	default:
		if appErr.Err != nil {
			log.Printf("apierr: internal error: %v", appErr.Err)
		}
		response.Error(c, http.StatusInternalServerError, string(apperr.CodeInternal), "internal server error")
	}
}

// WriteRateLimited writes a 429 with a Retry-After header (whole seconds,
// at least 1) so well-behaved clients back off for the right amount of time.
func WriteRateLimited(c *gin.Context, retryAfter time.Duration) {
	seconds := int(math.Ceil(retryAfter.Seconds()))
	if seconds < 1 {
		seconds = 1
	}
	c.Header("Retry-After", strconv.Itoa(seconds))
	response.Error(c, http.StatusTooManyRequests, string(apperr.CodeRateLimit), "слишком много запросов, попробуйте позже")
}
