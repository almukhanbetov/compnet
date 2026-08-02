# COMPNET Backend Instructions

Product: COMPNET IT-company platform with an existing Next.js frontend.

Stack:
- Go
- Gin
- PostgreSQL
- pgxpool
- Goose
- Docker Compose

Order:
1. foundation/config/database
2. Goose migrations
3. users/auth
4. project requests and server-side estimates
5. admin lead management
6. services/pricing/portfolio
7. comments
8. chat HTTP API
9. realtime/storage later

Mandatory:
- read relevant skills first
- show a plan before large changes
- do not change frontend without permission
- no hardcoded secrets
- integer money in tenge
- server validates/recomputes estimates
- run fmt, vet, tests and build after each milestone
