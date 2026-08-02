# Go Gin Architecture
Use a modular monolith.

Recommended structure:
```text
cmd/api/main.go
internal/config
internal/http/handler
internal/http/middleware
internal/http/router
internal/http/response
internal/domain
internal/service
internal/repository/postgres
internal/database
internal/security
migrations
```

Rules:
- `main.go` only wires dependencies and starts/stops the server.
- Domain models must not import Gin.
- Routes use `/api/v1`.
- Public health endpoints: `GET /health`, `GET /ready`.
- Dependency injection through constructors.
- Standard response:
  success: `{"data": ..., "meta": ...}`
  error: `{"error":{"code":"...","message":"...","fields":{}}}`
