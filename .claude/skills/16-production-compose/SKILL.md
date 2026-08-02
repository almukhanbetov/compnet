---
name: production-compose
description: Creates an isolated production Docker Compose stack for COMPNET frontend, backend, and PostgreSQL 17.
---

# COMPNET Production Compose

Use when creating or updating `docker-compose.prod.yml`.

## Core requirements

- Compose project: `compnet`.
- PostgreSQL: `postgres:17-alpine`.
- Named containers:
  - `compnet-postgres`
  - `compnet-backend`
  - `compnet-frontend`
- Named volume: `compnet_postgres_data`.
- Named network: `compnet-network`.
- PostgreSQL is not published to the host.
- Backend and frontend bind to loopback only when Nginx is used.
- All services use `restart: unless-stopped`.
- Health checks must be real.

## Canonical file

```yaml
services:
  postgres:
    image: postgres:17-alpine
    container_name: compnet-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - compnet_postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 10s
    networks: [compnet-network]

  backend:
    image: ${DOCKERHUB_USERNAME}/compnet-backend:latest
    container_name: compnet-backend
    restart: unless-stopped
    environment:
      PORT: "8080"
      DATABASE_URL: postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?sslmode=disable
    depends_on:
      postgres:
        condition: service_healthy
    ports:
      - "127.0.0.1:8080:8080"
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://127.0.0.1:8080/health"]
      interval: 15s
      timeout: 5s
      retries: 5
      start_period: 20s
    networks: [compnet-network]

  frontend:
    image: ${DOCKERHUB_USERNAME}/compnet-frontend:latest
    container_name: compnet-frontend
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: "3000"
      HOSTNAME: "0.0.0.0"
    depends_on:
      backend:
        condition: service_healthy
    ports:
      - "127.0.0.1:3000:3000"
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://127.0.0.1:3000/"]
      interval: 15s
      timeout: 5s
      retries: 5
      start_period: 20s
    networks: [compnet-network]

volumes:
  compnet_postgres_data:
    name: compnet_postgres_data

networks:
  compnet-network:
    name: compnet-network
    driver: bridge
```

## Important adaptation

The health check command must exist in the runtime image. Alpine images usually provide BusyBox `wget`; confirm it. If not, add the required utility or implement a binary-level health command.

If the backend does not yet expose `/health`, add a simple health route before production deployment rather than claiming it works.

## Validation

```bash
DOCKERHUB_USERNAME=test \
POSTGRES_DB=test \
POSTGRES_USER=test \
POSTGRES_PASSWORD=test \
docker compose -p compnet -f docker-compose.prod.yml config
```

On the VPS:

```bash
cd /var/www/compnet
docker compose -p compnet --env-file .env -f docker-compose.prod.yml pull
docker compose -p compnet --env-file .env -f docker-compose.prod.yml up -d
docker compose -p compnet --env-file .env -f docker-compose.prod.yml ps
```

Never use `down -v` in normal deployment because it deletes database data.
