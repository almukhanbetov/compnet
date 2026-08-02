// Package apperr defines transport-agnostic domain errors. HTTP handlers
// never construct status codes directly from business logic — they map one
// of these codes through internal/http/apierr instead.
package apperr

// Code is a machine-readable error category.
type Code string

const (
	CodeValidation Code = "validation_error"
	CodeBadRequest Code = "bad_request"
	CodeNotFound   Code = "not_found"
	CodeConflict   Code = "conflict"
	CodeInternal   Code = "internal_error"
)

// Error is the standard domain error type. Err, when set, carries the
// underlying cause for server-side logging and must never be serialized to
// the client.
type Error struct {
	Code    Code
	Message string
	Fields  map[string]string
	Err     error
}

func (e *Error) Error() string {
	if e.Err != nil {
		return e.Message + ": " + e.Err.Error()
	}
	return e.Message
}

func (e *Error) Unwrap() error {
	return e.Err
}

// Validation builds a 422-mapped error carrying per-field messages.
func Validation(message string, fields map[string]string) *Error {
	return &Error{Code: CodeValidation, Message: message, Fields: fields}
}

// BadRequest builds a 400-mapped error for malformed requests (e.g. invalid
// JSON), as opposed to well-formed-but-invalid input.
func BadRequest(message string) *Error {
	return &Error{Code: CodeBadRequest, Message: message}
}

// Internal builds a 500-mapped error. The wrapped err is logged server-side
// and never shown to the client.
func Internal(err error) *Error {
	return &Error{Code: CodeInternal, Message: "internal server error", Err: err}
}
