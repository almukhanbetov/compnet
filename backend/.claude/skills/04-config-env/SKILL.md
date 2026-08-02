# Configuration
Required `.env.example`:
```env
APP_ENV=development
APP_PORT=8080
DATABASE_URL=postgres://compnet:password@postgres:5432/compnet?sslmode=disable
CORS_ALLOWED_ORIGINS=http://localhost:3000
JWT_ACCESS_SECRET=change_me
JWT_REFRESH_SECRET=change_me
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=720h
```

Rules:
- Typed Config struct.
- Validate at startup and fail fast.
- Never log secrets.
- Parse durations and comma-separated origins.
- Production has no wildcard CORS with credentials.
