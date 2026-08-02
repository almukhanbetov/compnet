---
name: deploy-verification-rollback
description: Verifies COMPNET production deployment, diagnoses failures, and performs safe image rollback without deleting PostgreSQL data.
---

# COMPNET Verification and Rollback

Use after each deployment and whenever production fails.

## Verification sequence

On VPS:

```bash
cd /var/www/compnet

docker compose -p compnet --env-file .env -f docker-compose.prod.yml ps
docker inspect compnet-postgres --format '{{json .State.Health}}'
docker inspect compnet-backend --format '{{json .State.Health}}'
docker inspect compnet-frontend --format '{{json .State.Health}}'

curl -fsS http://127.0.0.1:8080/health
curl -fsSI http://127.0.0.1:3000/
```

If Nginx/domains are configured:

```bash
curl -fsSI https://<frontend-domain>/
curl -fsS https://<api-domain>/health
```

Inspect recent logs:

```bash
docker compose -p compnet --env-file .env -f docker-compose.prod.yml logs --tail=150 postgres
docker compose -p compnet --env-file .env -f docker-compose.prod.yml logs --tail=150 backend
docker compose -p compnet --env-file .env -f docker-compose.prod.yml logs --tail=150 frontend
```

## Diagnose by layer

1. Container absent → inspect Compose config and pull result.
2. Container restarting → inspect service logs and environment names.
3. Database unhealthy → inspect credentials, volume ownership, migrations.
4. Backend unhealthy → inspect `DATABASE_URL`, route, migration status, port binding.
5. Frontend unhealthy → inspect standalone build and server startup.
6. Local endpoints work but domain fails → inspect Nginx, DNS, firewall, certificate.

## Immutable rollback strategy

The workflow publishes `${GITHUB_SHA}` tags. To roll back, use the last known good SHA.

Temporarily set image tags in a rollback override file:

```yaml
services:
  backend:
    image: <dockerhub-user>/compnet-backend:<GOOD_SHA>
  frontend:
    image: <dockerhub-user>/compnet-frontend:<GOOD_SHA>
```

Then:

```bash
docker compose -p compnet \
  --env-file .env \
  -f docker-compose.prod.yml \
  -f docker-compose.rollback.yml \
  pull

docker compose -p compnet \
  --env-file .env \
  -f docker-compose.prod.yml \
  -f docker-compose.rollback.yml \
  up -d --no-deps backend frontend
```

Re-run all health checks.

## Database rule

Application rollback must not remove or recreate the PostgreSQL volume.

Never run:

```bash
docker compose down -v
```

If a deployment includes schema migrations, verify backward compatibility before rolling application images back. Restore a database backup only when explicitly required and after confirming the target backup.

## Incident report

Report:

- failing layer;
- exact error excerpt;
- commands run;
- files changed;
- current image tags;
- database status;
- whether rollback was used;
- final endpoint results.
