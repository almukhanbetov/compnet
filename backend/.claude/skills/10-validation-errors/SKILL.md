# Validation and Errors
- Request DTOs separate from domain/database models.
- Validate UUID, slug, enums, email, phone and body size.
- Normalize strings before validation.
- Central domain errors: not found, conflict, unauthorized, forbidden, validation.
- One HTTP mapper returns safe JSON errors.
- Add request id.
- Log internal details server-side, never passwords/tokens.
- Gin recovery returns generic 500.

Common statuses: 200, 201, 204, 400, 401, 403, 404, 409, 422, 429, 500.
