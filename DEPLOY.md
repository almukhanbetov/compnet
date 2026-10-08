# COMPNET — Production Deployment

VPS: `89.207.254.215` · production directory: `/var/www/compnet` (from `VPS_PATH` secret)
Flow: GitHub Actions → Docker Hub → SSH → `docker compose -p compnet`
Public site: `https://compnet.kz` (and `https://www.compnet.kz`) via system Nginx,
`/etc/nginx/sites-available/compnet.kz`: `/api/` → `127.0.0.1:8080`, `/` → `127.0.0.1:3000`.

This stack is fully isolated from any other project on the VPS: every
container, network and volume is prefixed `compnet`/`compnet-network`, the
compose project name is fixed to `compnet`, and PostgreSQL is never
published to the host or the internet.

Visitor ↔ manager chat: see [docs/CHAT_IMPLEMENTATION.md](docs/CHAT_IMPLEMENTATION.md)
for what it is; the production settings and launch order are in
[Chat: settings and launch](#chat-settings-and-launch) below.

## GitHub Secrets and variables

Secrets (all already exist; the workflow never echoes them):
`DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`, `VPS_HOST`, `VPS_PORT`, `VPS_USER`,
`VPS_PATH`, `VPS_SSH_KEY`.

Repository **variables** (Settings → Secrets and variables → Actions →
Variables). They are build-time values: Next.js inlines `NEXT_PUBLIC_*` into
the frontend bundle, so changing one needs a new build (re-run the workflow);
setting them on the VPS has no effect.

| Variable | Default when unset | Meaning |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://compnet.kz` | Bare origin of the API (no `/api` suffix). |
| `NEXT_PUBLIC_CHAT_WIDGET_ENABLED` | `false` | Visitor chat widget. Only the exact value `true` turns it on. |

## VPS `.env`

`/var/www/compnet/.env` (mode 600, never committed). Template:
[.env.production.example](.env.production.example).

| Key | Value | Notes |
|---|---|---|
| `DOCKERHUB_USERNAME` | Docker Hub account | |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | secret | unchanged |
| `CORS_ALLOWED_ORIGINS` | `https://compnet.kz,https://www.compnet.kz` | **required**; was `http://89.207.254.215:3000` — must be changed before the chat goes live |
| `TRUSTED_PROXIES` | the `compnet-network` gateway, `172.19.0.1` as of 2026-10-08 | **required** (compose refuses to start without it); see below |
| `CHAT_COOKIE_TTL` | `2160h` | optional |
| `MANAGER_SESSION_TTL` | `12h` | optional, 5m…168h |

`COOKIE_SECURE=true` and `COOKIE_SAMESITE=lax` are fixed in
`docker-compose.prod.yml` (the manager cookie is always `SameSite=Strict`).

### `TRUSTED_PROXIES` — why and how to read it

Host Nginx connects to `127.0.0.1:8080`; Docker forwards that through
`docker-proxy`, so the backend sees every request as coming from the
`compnet-network` **gateway**, not from the visitor. Trusting exactly that
address lets the backend take the real client IP from the `X-Forwarded-For`
that Nginx sets (Gin reads it right-to-left and stops at the first untrusted
address, so values a client injects on the left are ignored). With nothing
trusted, all visitors would share the gateway IP for rate limiting — one
person could exhaust the chat or the manager-login limit for everybody.

Read-only check on the VPS (verified 2026-10-08: gateway `172.19.0.1`,
`docker-proxy` in use, no CDN in front of Nginx):

```bash
docker network inspect compnet-network --format '{{(index .IPAM.Config 0).Gateway}}'
ps -eo args | grep 'docker-proxy.*-host-port 8080' | grep -v grep   # docker-proxy in use?
grep -n 'X-Forwarded-For\|X-Real-IP' /etc/nginx/sites-available/compnet.kz
curl -sI https://compnet.kz/ | grep -i '^server'                        # nginx, not a CDN
```

Re-check the gateway whenever `compnet-network` is recreated. After start,
`docker logs compnet-backend | grep 'trusted proxies'` shows the value in use.
If a CDN/extra proxy is ever put in front of Nginx, its addresses must be
handled too — otherwise all visitors share the CDN's IP.

## What a deploy does (push to `main` or manual "Run workflow")

1. Build and push `compnet-backend` / `compnet-frontend` (`latest` + commit SHA).
2. Copy `backend/migrations/` and `docker-compose.prod.yml` to the VPS.
3. On the VPS, with `set -Eeuo pipefail` (any failure stops the deploy):
   1. `docker compose config --quiet` — stops here if `.env` lacks a required key;
   2. `pull`; start/keep `postgres` and wait until healthy;
   3. **backup**: `pg_dump -Fc` to `backups/compnet-predeploy-<time>-<sha>.dump`,
      written as `….dump.partial` and renamed only if it is non-empty and
      readable by `pg_restore --list`; otherwise the deploy stops here — no
      migrations, no new images (a leftover `.partial` file is not a backup);
   4. **migrations**: goose v3.27.3 (pinned) in a throwaway container; they run
      before the new images start (all migrations so far are additive, the old
      backend keeps working on the new schema);
   5. `up -d` the new images; health checks `/health`, `/ready`, frontend `/`.

Backups accumulate in `/var/www/compnet/backups/` (mode 600) — check disk
space occasionally and delete old ones by hand.

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

(After the first deploy the workflow keeps `docker-compose.prod.yml` in sync.)

On the **VPS**:

```bash
cd /var/www/compnet
cp .env.production.example .env
openssl rand -base64 36   # use the output as POSTGRES_PASSWORD
nano .env                 # fill in every value, see "VPS .env" above
chmod 600 .env
```

Validate the compose file before starting anything (prints nothing on success):

```bash
docker compose -p compnet --env-file .env -f docker-compose.prod.yml config --quiet
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

## 4. Database backups and migrations by hand

Normally both happen inside the workflow (see above). For manual recovery:

```bash
cd /var/www/compnet
set -a; source .env; set +a      # values for the commands below; never echo them

# Backup, accepted only if it is readable
umask 077; mkdir -p backups
B="backups/compnet-manual-$(date +%F-%H%M%S).dump"
docker exec compnet-postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > "$B"
test -s "$B" && docker exec -i compnet-postgres pg_restore --list < "$B" > /dev/null && echo "backup ok: $B"

# Migrations (same pinned goose as the workflow)
docker run --rm \
  --network compnet-network \
  -e GOOSE_DRIVER=postgres \
  -e GOOSE_DBSTRING="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@compnet-postgres:5432/${POSTGRES_DB}?sslmode=disable" \
  -v "$(pwd)/migrations:/migrations:ro" \
  golang:1.25-alpine \
  sh -c 'go install github.com/pressly/goose/v3/cmd/goose@v3.27.3 && goose -dir /migrations up && goose -dir /migrations status'
```

`ghcr.io/pressly/goose` is not a public image (pulls fail with `denied`) — do
not use it. Migrations are **never** run automatically inside the backend.

## 5. Verify

```bash
cd /var/www/compnet
docker compose -p compnet --env-file .env -f docker-compose.prod.yml ps
docker inspect compnet-postgres --format '{{json .State.Health}}'
docker inspect compnet-backend  --format '{{json .State.Health}}'
docker inspect compnet-frontend --format '{{json .State.Health}}'

curl -fsS http://127.0.0.1:8080/health
curl -fsS http://127.0.0.1:8080/ready
curl -fsSI http://127.0.0.1:3000/
curl -fsS https://compnet.kz/api/v1/services > /dev/null && echo "public API ok"
docker logs compnet-backend 2>&1 | grep 'trusted proxies'
```

Logs if something looks unhealthy:

```bash
docker compose -p compnet --env-file .env -f docker-compose.prod.yml logs --tail=150 postgres
docker compose -p compnet --env-file .env -f docker-compose.prod.yml logs --tail=150 backend
docker compose -p compnet --env-file .env -f docker-compose.prod.yml logs --tail=150 frontend
```

## Chat: settings and launch

The chat ships **off**: with `NEXT_PUBLIC_CHAT_WIDGET_ENABLED` unset the site
shows no chat button and makes no chat requests; the manager section
`/manager` exists (noindex) and is protected by the backend.

Launch in this order — each step is checked before the next:

1. **`.env` on the VPS** (before merging the chat branch): set
   `CORS_ALLOWED_ORIGINS=https://compnet.kz,https://www.compnet.kz` and
   `TRUSTED_PROXIES=<gateway from the command above>`; then
   `docker compose -p compnet --env-file .env -f docker-compose.prod.yml config --quiet`.
   (Until the new compose file arrives this checks only the old keys; the
   deploy re-checks with the new file and stops if anything is missing.)
2. **Deploy** with the widget still off (merge to `main`). Check the workflow
   log for `backup ok:` and the goose status, then the "Verify" commands.
3. **Create the real manager account** on the VPS — interactive, the password
   is typed twice and never shown, never passed as an argument:

   ```bash
   docker exec -it compnet-backend ./api create-staff -email <manager email> -name "<display name>" -role manager
   ```

   No test accounts in production. Deactivate an account with
   `UPDATE staff_users SET is_active = false WHERE email = '…'` (takes effect on
   the next request; accounts with messages cannot be deleted).
4. **Check the manager login**: open `https://compnet.kz/manager/login`, sign
   in, see the empty inbox; DevTools → Application → Cookies:
   `compnet_manager` is `HttpOnly`, `Secure`, `SameSite=Strict`, path
   `/api/v1/manager`. "Выйти" returns to the login page.
5. **Check per-visitor IPs** (creates up to 4 empty, never-listed conversations):

   ```bash
   # from your computer — the 4th answers 429
   for i in 1 2 3 4; do curl -s -o /dev/null -w "%{http_code} " -X POST -H "Origin: https://compnet.kz" https://compnet.kz/api/v1/chat/session; done; echo
   # right after, from the VPS (a different client IP) — must be 201, not 429
   curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "Origin: https://compnet.kz" https://compnet.kz/api/v1/chat/session
   ```

   429 from the VPS too means visitors share an IP: re-check `TRUSTED_PROXIES`.
6. **Enable the widget**: set the repository variable
   `NEXT_PUBLIC_CHAT_WIDGET_ENABLED=true` → Actions → "Build and Deploy
   COMPNET" → Run workflow.
7. **End-to-end**: a normal browser window on `https://compnet.kz` (visitor)
   and a private window on `/manager` (manager): visitor writes → manager sees
   it with an unread badge and `(1)` in the tab title → manager replies →
   visitor's chat button shows `1` and the reply → close/reopen the dialog.

## 6. Rollback

### Turn the chat widget off (fast, no data touched)

Set `NEXT_PUBLIC_CHAT_WIDGET_ENABLED` to `false` (or delete it) and re-run the
workflow — the new frontend has no chat button. Or, without a build, roll
only the frontend back to an image built with the widget off (below,
`--no-deps frontend`). Messages stay in the database; managers can keep
answering in `/manager`, and the widget shows the history again once enabled.

### Return to previous images

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

Then re-run the verification steps above. A pre-chat backend runs fine on the
migrated schema: the chat and staff tables are simply unused.

### Keep the messages

- **Never** run `goose down` for the chat or staff migrations on production,
  and never drop `chat_*` / `staff_*` tables: rolling the app back does not
  require it, and it would delete real conversations.
- Before risky manual work, export the chat separately:

  ```bash
  set -a; source .env; set +a; umask 077
  docker exec compnet-postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc \
    -t chat_conversations -t chat_messages -t staff_users -t staff_sessions \
    > "backups/compnet-chat-$(date +%F-%H%M%S).dump"
  ```

- Restore from a backup only when explicitly needed and after checking it:
  `pg_restore --list <file>`, ideally into a scratch database first.

**Database rule:** application rollback must never remove or recreate the
`compnet_postgres_data` volume. Never run `docker compose down -v`.

## Forbidden commands

Never run any of these against this VPS — they can affect other projects or
destroy data that has no other backup:

```bash
docker compose down -v
docker system prune -a --volumes
docker rm -f $(docker ps -aq)
docker volume prune
goose down        # on production, with real chat messages
```

Plain `docker image prune -f` (no `-a`, used by the deploy workflow) only
removes dangling, untagged images and is safe.

## Notes

- `www.compnet.kz` is served by the same Nginx server (no redirect). With
  `NEXT_PUBLIC_API_URL=https://compnet.kz` a page opened on `www` calls the API
  on the apex domain — this works because both origins are in
  `CORS_ALLOWED_ORIGINS` and both hosts are the same site for cookies. A
  `www → compnet.kz` redirect in Nginx would simplify it (optional, not done).
- Rate limits live in backend memory: they reset on restart and assume one
  backend container.
