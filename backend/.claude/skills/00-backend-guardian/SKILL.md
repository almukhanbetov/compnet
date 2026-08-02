# Backend Guardian
Goal: protect COMPNET backend architecture.

Rules:
- Backend stack: Go, Gin, PostgreSQL, pgxpool, Goose.
- Inspect before editing and show a plan before large changes.
- Do not modify `frontend/` unless explicitly requested.
- Do not hardcode secrets or commit `.env`.
- Keep handlers thin, business logic in services, SQL in repositories.
- Use contexts, timeouts, structured errors and graceful shutdown.
- Do not add Redis, WebSocket, S3, queues or microservices yet.
- Never trust client-calculated prices.
- Run:
  `gofmt -w .`
  `go vet ./...`
  `go test ./...`
  `go build ./...`
