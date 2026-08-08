# COMPNET — Production Deployment

VPS: `89.207.254.215` · production directory: `/var/www/compnet` (from `VPS_PATH` secret)
Flow: GitHub Actions → Docker Hub → SSH → `docker compose -p compnet`

This stack is fully isolated from any other project on the VPS: every
container, network and volume is prefixed `compnet`/`compnet-network`, the
compose project name is fixed to `compnet`, and PostgreSQL is never
published to the host or the internet.

## GitHub Secrets required

`DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`, `VPS_HOST`, `VPS_PORT`, `VPS_USER`,
`VPS_PATH`, `VPS_SSH_KEY` — all already exist in the repository. The
workflow never echoes their values.

Optional repository **variable** (not secret): `NEXT_PUBLIC_API_URL`. If
unset, the workflow falls back to `http://89.207.254.215:8080`. Set it once
a domain + Nginx + TLS are in place (see "Next steps" below) and redeploy.

## 1. First-time VPS bootstrap

SSH in using the port from the `VPS_PORT` secret — never assume 22:

```bash
ssh -p <VPS_PORT> <VPS_USER>@89.207.254.215
```

Read-only discovery first (do not change anything yet):

```bash
hostname; whoami; pwd
docker --version
docker compose version
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}'
docker network ls
docker volume ls
sudo ss -tulpn
```

Confirm ports `3000`, `8080` and `5432` are free, and that no other
container already uses the name `compnet-*`. If Docker requires `sudo`,
add your user to the `docker` group and start a new session:

```bash
sudo usermod -aG docker "$USER"
```

Create the project directory:

```bash
sudo mkdir -p /var/www/compnet
sudo chown -R "$USER":"$USER" /var/www/compnet
chmod 750 /var/www/compnet
```

## 2. Upload the compose file and create `.env`

From your **local machine** (repository root):

```bash
scp -P <VPS_PORT> docker-compose.prod.yml \
  <VPS_USER>@89.207.254.215:/var/www/compnet/
scp -P <VPS_PORT> .env.production.example \
  <VPS_USER>@89.207.254.215:/var/www/compnet/
```

On the **VPS**:

```bash
cd /var/www/compnet
cp .env.production.example .env
openssl rand -base64 36   # use the output as POSTGRES_PASSWORD
nano .env                 # fill in DOCKERHUB_USERNAME, POSTGRES_*, CORS_ALLOWED_ORIGINS
chmod 600 .env
```

`.env` never leaves the VPS and is never committed — it is already covered
by the repo's `.gitignore` pattern (`.env*`) as a matter of policy, but it
also simply never exists in the git working tree since it's created here
directly on the server.

Validate the compose file before starting anything:

```bash
docker compose -p compnet --env-file .env -f docker-compose.prod.yml config
```

## 3. First deploy

Either push to `main` (GitHub Actions builds, pushes, and deploys
automatically), or run it manually the first time:

```bash
cd /var/www/compnet
docker compose -p compnet --env-file .env -f docker-compose.prod.yml pull
docker compose -p compnet --env-file .env -f docker-compose.prod.yml up -d
docker compose -p compnet --env-file .env -f docker-compose.prod.yml ps
```

## 4. Apply database migrations

As of the `deploy.yml` workflow, this step runs **automatically on every
push to `main`**: it copies `backend/migrations` to the VPS via
`appleboy/scp-action`, then runs `goose ... up` right after
`docker compose up -d`, before the health checks. Nothing below is needed
for a normal deploy — it's here for first-time bootstrap and manual
recovery (e.g. if the automated step ever needs to be re-run by hand).

Migrations are **never** run automatically inside the backend (`goose` is a
CLI tool, not a runtime dependency of the Go binary). PostgreSQL is not
published to the host, so run `goose` from a throwaway container attached to
`compnet-network`:

```bash
cd /var/www/compnet
source .env   # loads POSTGRES_DB / POSTGRES_USER / POSTGRES_PASSWORD into this shell

docker run --rm \
  --network compnet-network \
  -e GOOSE_DRIVER=postgres \
  -e GOOSE_DBSTRING="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@compnet-postgres:5432/${POSTGRES_DB}?sslmode=disable" \
  -v "$(pwd)/migrations:/migrations" \
  golang:1.25-alpine \
  sh -c 'go install github.com/pressly/goose/v3/cmd/goose@latest && goose -dir /migrations up'
```

`ghcr.io/pressly/goose` is not a public image (pulls fail with `denied`,
reproducible even outside the VPS) — do not use it. The `golang:1.25-alpine`
route above builds `goose` from source on the fly instead; it's slower
(pulls the Go module graph each run) but always works.

This requires the `migrations/` directory to be present at
`/var/www/compnet/migrations` — copy it once from the repo:

```bash
scp -P <VPS_PORT> -r backend/migrations \
  <VPS_USER>@89.207.254.215:/var/www/compnet/
```

Re-run the same `goose ... up` command after any deploy that adds new
migration files.

## 5. Verify

```bash
cd /var/www/compnet
docker compose -p compnet --env-file .env -f docker-compose.prod.yml ps
docker inspect compnet-postgres --format '{{json .State.Health}}'
docker inspect compnet-backend  --format '{{json .State.Health}}'
docker inspect compnet-frontend --format '{{json .State.Health}}'

curl -fsS http://127.0.0.1:8080/health
curl -fsSI http://127.0.0.1:3000/
```

Logs if something looks unhealthy:

```bash
docker compose -p compnet --env-file .env -f docker-compose.prod.yml logs --tail=150 postgres
docker compose -p compnet --env-file .env -f docker-compose.prod.yml logs --tail=150 backend
docker compose -p compnet --env-file .env -f docker-compose.prod.yml logs --tail=150 frontend
```

## 6. Rollback

Every image is tagged with the immutable `github.sha` in addition to
`latest`. To roll back to a known-good commit SHA, create a small override
file on the VPS (do not edit `docker-compose.prod.yml` itself):

```yaml
# docker-compose.rollback.yml
services:
  backend:
    image: ${DOCKERHUB_USERNAME}/compnet-backend:<GOOD_SHA>
  frontend:
    image: ${DOCKERHUB_USERNAME}/compnet-frontend:<GOOD_SHA>
```

```bash
docker compose -p compnet --env-file .env \
  -f docker-compose.prod.yml -f docker-compose.rollback.yml pull

docker compose -p compnet --env-file .env \
  -f docker-compose.prod.yml -f docker-compose.rollback.yml \
  up -d --no-deps backend frontend
```

Then re-run the verification steps above.

**Database rule:** application rollback must never remove or recreate the
`compnet_postgres_data` volume. Never run `docker compose down -v`. If a
migration is not backward-compatible with the rolled-back code, restore from
a `pg_dump` backup instead of rolling the app back blindly:

```bash
mkdir -p /var/www/compnet/backups
docker exec compnet-postgres pg_dump \
  -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc \
  > "/var/www/compnet/backups/compnet-$(date +%F-%H%M%S).dump"
```

## Forbidden commands

Never run any of these against this VPS — they can affect other projects or
destroy data that has no other backup:

```bash
docker compose down -v
docker system prune -a --volumes
docker rm -f $(docker ps -aq)
docker volume prune
```

Plain `docker image prune -f` (no `-a`, used by the deploy workflow) only
removes dangling, untagged images and is safe.

## Next steps (not part of this deployment)

Domain + HTTPS via system Nginx (`.claude/skills/17-nginx-domain-ssl`) is a
separate, later step — it requires a confirmed domain name and DNS already
pointing at `89.207.254.215`, neither of which exists yet. Until then, the
frontend and backend are reachable only from the VPS itself on
`127.0.0.1:3000` / `127.0.0.1:8080`, and CI verification hits those loopback
addresses directly.
