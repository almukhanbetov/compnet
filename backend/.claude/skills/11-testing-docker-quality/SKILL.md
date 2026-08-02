# Testing, Docker and Quality
Tests:
- table-driven unit tests
- calculator/service tests
- `httptest` handler tests
- PostgreSQL repository integration tests
- Goose migration test on clean DB
- auth and authorization boundary tests

Docker:
- services: postgres, backend
- named PostgreSQL volume
- PostgreSQL healthcheck
- multi-stage Go image
- no `.env` in image
- PostgreSQL not public in production
- avoid `network_mode: host`

Commands:
```bash
gofmt -w .
go vet ./...
go test ./...
go test -race ./...
go build ./...
docker compose up -d --build
```
