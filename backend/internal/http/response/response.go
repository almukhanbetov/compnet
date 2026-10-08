// Package response provides the standard success/error JSON envelopes used
// by every handler, so API consumers see one consistent response shape.
package response

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// Envelope is the standard success response shape: {"data": ..., "meta": ...}.
type Envelope struct {
	Data any `json:"data"`
	Meta any `json:"meta"`
}

// ErrorBody is the standard error response shape:
// {"error": {"code": "...", "message": "...", "fields": {}}}.
type ErrorBody struct {
	Error ErrorDetail `json:"error"`
}

// ErrorDetail carries a machine-readable code, a human-readable message and
// optional per-field validation details.
type ErrorDetail struct {
	Code    string         `json:"code"`
	Message string         `json:"message"`
	Fields  map[string]any `json:"fields"`
}

// OK writes a 200 response with the standard success envelope.
func OK(c *gin.Context, data any) {
	c.JSON(http.StatusOK, Envelope{Data: data, Meta: nil})
}

// OKWithMeta writes a 200 response carrying both data and meta.
func OKWithMeta(c *gin.Context, data, meta any) {
	c.JSON(http.StatusOK, Envelope{Data: data, Meta: meta})
}

// Created writes a 201 response with the standard success envelope.
func Created(c *gin.Context, data any) {
	c.JSON(http.StatusCreated, Envelope{Data: data, Meta: nil})
}

// Error writes an error response with the standard error envelope.
func Error(c *gin.Context, status int, code, message string) {
	c.JSON(status, ErrorBody{Error: ErrorDetail{
		Code:    code,
		Message: message,
		Fields:  map[string]any{},
	}})
}

// ErrorWithFields writes an error response that also carries per-field
// validation details.
func ErrorWithFields(c *gin.Context, status int, code, message string, fields map[string]string) {
	converted := make(map[string]any, len(fields))
	for k, v := range fields {
		converted[k] = v
	}
	c.JSON(status, ErrorBody{Error: ErrorDetail{
		Code:    code,
		Message: message,
		Fields:  converted,
	}})
}
