# COMPNET — Production Deployment

VPS: `89.207.254.215` · production directory: `/var/www/compnet` (from `VPS_PATH` secret)
Flow: GitHub Actions → Docker Hub → SSH → `docker compose -p compnet`
Public site: `https://compnet.kz` — the main domain; `www.compnet.kz` and plain
HTTP redirect to it (301). System Nginx, `/etc/nginx/sites-available/compnet.kz`:
`/api/` → `127.0.0.1:8080`, `/` → `127.0.0.1:3000`. Reference copy and how to
change it: [Nginx](#nginx).

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

## Nginx

The site file is `/etc/nginx/sites-available/compnet.kz` on the VPS. Its
reference copy is [deploy/nginx/compnet.kz.conf](deploy/nginx/compnet.kz.conf):
a comment header, then the server file byte for byte. **The deploy workflow
never touches Nginx** — a deploy neither applies the copy nor overwrites the
server file, so changes are made by hand (below) and the copy is kept in sync
in the same PR. If the server file changes (by hand or by Certbot), copy it
back into the repository.

What the file does:

| Request | Answer |
|---|---|
| `https://www.compnet.kz/*` | 301 → `https://compnet.kz/*` (path and query kept) |
| `/index.html` | 301 → `https://compnet.kz/` |
| `/img/favicon.ico` | 301 → `https://compnet.kz/favicon.ico` |
| `http://compnet.kz/*`, `http://www.compnet.kz/*` | 301 → `https://` on the same host (Certbot block) |
| `/api/v1/chat/ws`, `/api/v1/manager/ws` | WebSocket → `127.0.0.1:8080` |
| `/api/` | → `127.0.0.1:8080` (backend) |
| `/` | → `127.0.0.1:3000` (frontend) |

URLs of the domain's previous site (`/lead`, `/trial-lessons`) answer **404
on purpose**: there is no matching page, so they are neither redirected nor
answered with 410.

### Check (from any computer)

```bash
chk() { printf '%-42s %s\n' "$1" "$(curl -s -o /dev/null -m 10 -w '%{http_code} %{redirect_url}' "$1")"; }
chk 'https://www.compnet.kz/pricing?x=1'   # 301 https://compnet.kz/pricing?x=1
chk 'https://compnet.kz/index.html'        # 301 https://compnet.kz/
chk 'https://compnet.kz/img/favicon.ico'   # 301 https://compnet.kz/favicon.ico
chk 'http://compnet.kz/'                   # 301 https://compnet.kz/
chk 'https://compnet.kz/'                  # 200
chk 'https://compnet.kz/favicon.ico'       # 200
chk 'https://compnet.kz/api/v1/services'   # 200
chk 'https://compnet.kz/lead'              # 404
```

Does the server still match the repository? Compare both without the leading
comment header (the server file has none until the repository copy is first
applied with the steps below):

```bash
body() { awk 'NR==1{h=/^#/} h{if(/^$/)h=0; next} 1'; }   # drop a leading "#" header
ssh compnet-vps 'cat /etc/nginx/sites-available/compnet.kz' | body > /tmp/compnet.kz.server
body < deploy/nginx/compnet.kz.conf | diff -u /tmp/compnet.kz.server - && echo "in sync"
```

### Apply a change

Needs root or a sudo-capable account (the `compnet` user has no sudo).
Change `deploy/nginx/compnet.kz.conf` in a PR first, then:

```bash
# copy the file to the server (as compnet, no sudo needed for this)
scp deploy/nginx/compnet.kz.conf compnet-vps:/home/compnet/

# then, as root or a sudo user on the VPS:
F=/etc/nginx/sites-available/compnet.kz
N=/home/compnet/compnet.kz.conf
diff -u "$F" "$N"     # review: only your change plus the comment header
B=/root/compnet.kz.bak-$(date +%Y%m%d-%H%M%S)
sudo cp -a "$F" "$B"  # backup outside /etc/nginx, so it is never included
sudo cp "$N" "$F"
sudo nginx -t         # must print "syntax is ok" and "test is successful"
sudo systemctl reload nginx   # graceful: open connections finish on the old workers
```

If `nginx -t` fails, do **not** reload — restore the backup; the running
Nginx is untouched until a reload. Then run the check above.

**Rollback:**

```bash
sudo cp -a "$B" /etc/nginx/sites-available/compnet.kz
sudo nginx -t && sudo systemctl reload nginx
```

The lines marked `# managed by Certbot` (certificate paths and the HTTP
block) belong to Certbot; edit them only together with the certificate setup.

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

### Realtime (WebSocket)

Details, event format and limits: [docs/CHAT_REALTIME.md](docs/CHAT_REALTIME.md).

- **One backend process.** The realtime hub lives in the backend's memory;
  the compose file runs exactly one backend and that must stay so (see
  "Scaling" in the document before adding replicas).
- **Order is safe either way.** Without the Nginx change the widget and
  `/manager` keep working over HTTP polling; with the Nginx change but the
  old backend, `/ws` just answers 404 and the clients poll.

**1. Deploy the code** (merge the PR). The workflow backs up the database,
applies `20261013100000_chat_realtime_indexes` (indexes only) and restarts
the containers. `NEXT_PUBLIC_CHAT_WIDGET_ENABLED` stays as it is.

**2. Nginx** — already applied on the VPS (October 2026); the WebSocket
blocks are part of [deploy/nginx/compnet.kz.conf](deploy/nginx/compnet.kz.conf),
and new changes follow [Nginx](#nginx). Kept for history — needs root or a
sudo-capable account (the `compnet` user has no sudo). The change is
[deploy/nginx/compnet-chat-websocket.patch](deploy/nginx/compnet-chat-websocket.patch):
two `location = /api/v1/{chat,manager}/ws` blocks added before
`location /api/`, upstream `127.0.0.1:8080` (where `compnet-backend` is
published). Nothing else in the site file changes.

```bash
# copy the patch to the server (as compnet, no sudo needed for this)
scp deploy/nginx/compnet-chat-websocket.patch compnet-vps:/home/compnet/

# then, as root or a sudo user on the VPS:
F=/etc/nginx/sites-available/compnet.kz
sha256sum "$F"        # expected aca5dc505b58a382… (the file the patch was made for);
                      # anything else: the file changed — compare before applying
B=/root/compnet.kz.bak-$(date +%Y%m%d-%H%M%S)
sudo cp -a "$F" "$B"  # backup outside /etc/nginx, so it is never included
sudo patch --dry-run "$F" < /home/compnet/compnet-chat-websocket.patch
sudo patch "$F" < /home/compnet/compnet-chat-websocket.patch
sudo nginx -t         # must print "syntax is ok" and "test is successful"
sudo systemctl reload nginx   # graceful: open connections finish on the old workers
```

If `nginx -t` fails, do **not** reload — restore the backup (below); the
running Nginx is untouched until a reload. `reload` never drops the site:
if the new configuration cannot be loaded, the old workers keep serving.

**Rollback** (the chat falls back to HTTP polling, nothing else changes):

```bash
sudo cp -a "$B" /etc/nginx/sites-available/compnet.kz
sudo nginx -t && sudo systemctl reload nginx
```

**3. Verify** (from any computer):

```bash
H='-H Connection:Upgrade -H Upgrade:websocket -H Sec-WebSocket-Version:13 -H Sec-WebSocket-Key:dGhlIHNhbXBsZSBub25jZQ=='
curl -s -o /dev/null -w '%{http_code}\n' --http1.1 -m 3 $H -H 'Origin: https://compnet.kz'   https://compnet.kz/api/v1/chat/ws     # 101
curl -s -o /dev/null -w '%{http_code}\n' --http1.1 -m 3 $H -H 'Origin: https://evil.example' https://compnet.kz/api/v1/chat/ws     # 403
curl -s -o /dev/null -w '%{http_code}\n' --http1.1 -m 3 $H -H 'Origin: https://compnet.kz'   https://compnet.kz/api/v1/manager/ws  # 401 (no session)
```

Then two sessions: a normal window on `https://compnet.kz` (visitor) and a
private one on `/manager`. DevTools → Network → WS shows
`wss://compnet.kz/api/v1/chat/ws` with status 101; the manager header says
"Онлайн — сообщения приходят сразу", the widget "Менеджер онлайн"; messages
appear on the other side without a reload; turning the network off and on
(DevTools → Offline) reconnects and shows each message once.

## Manager requests (`/manager/requests`)

The release adds two migrations, applied by the deploy before the new images
start (backup first, as always):

| Migration | What it does to existing data |
|---|---|
| `20261013150000_project_request_management.sql` | adds `number` to `project_requests` (existing requests numbered 1…N by date received), the statuses `in_progress` / `completed` (earlier values stay valid), the manager note columns and the table `project_request_status_changes`. No request is changed or deleted. |
| `20261013160000_analytics_pending_conversions.sql` | new table `analytics_pending_conversions` (conversions waiting for their analytics session, see docs/ANALYTICS.md). |

Both are additive: the previous backend image keeps working on the migrated
schema, so **rolling back the application never needs a database rollback**
— use "Return to previous images" below. Managers need no new setting; the
section uses the existing staff accounts, roles, WebSocket and analytics
configuration.

Verify after the deploy:

```bash
set -a; source .env; set +a
docker exec compnet-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc \
  "select count(*), min(number), max(number), count(distinct number) from project_requests"
curl -s -o /dev/null -w '%{http_code}\n' https://compnet.kz/api/v1/manager/project-requests   # 401 without a session
```

Then sign in at `https://compnet.kz/manager/requests`: the list shows every
request received so far; open one, set a status and a note, reload — both
stay, and the status history names you.

### Rolling the migrations back deletes manager work

`goose down` for these migrations is **destructive** and is not part of an
application rollback:

- `20261013150000` down **deletes every manager note, the whole status
  history and the request numbers**, and rewrites the new statuses to the
  closest earlier ones (`in_progress` → `contacted`, `completed` →
  `accepted`); a later `up` renumbers requests and starts an empty history.
- `20261013160000` down drops conversions still waiting for their session —
  those requests keep no analytics source.

Requests, contacts, descriptions and estimates themselves are kept either
way. If a down migration is ever unavoidable, export the manager data first:

```bash
set -a; source .env; set +a; umask 077
docker exec compnet-postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc \
  -t project_requests -t project_request_status_changes -t analytics_pending_conversions \
  > "backups/compnet-requests-$(date +%F-%H%M%S).dump"
```

## Visit counter ("Посещаемость" on `/manager/analytics`)

One additive migration, applied by the deploy before the new images start:
`20261013170000_analytics_daily_totals.sql` creates `analytics_daily_totals`
(per Asia/Almaty day: visits, visitors, page views — counts only). It
changes no existing row. Nothing to configure: the counter uses the existing
`ANALYTICS_*` settings, GA4 and the manager WebSocket as they are.

How it keeps "all time": the cleanup job (at start-up and every 6 hours)
first stores the totals of each finished day that is about to lose details,
then deletes the details, in one transaction. The counter adds those totals
to the details still kept, so cleanup never lowers it. It starts at the
first recorded visit.

Verify after the deploy:

```bash
set -a; source .env; set +a
docker exec compnet-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc \
  "select count(*), (select count(*) from analytics_events where type = 'page_view') from analytics_sessions"
docker logs compnet-backend 2>&1 | grep -i 'analytics' | tail -3   # no "retention failed"
```

Then open `/manager/analytics`: "Visits, all time" equals the first number,
and "Visits today" grows within seconds after a visit from a browser that
allowed analytics.

Rollback: return to the previous images only (below) — the previous backend
ignores the new table. **Do not run `goose down` for this migration while
the new backend runs** (its cleanup then fails until the table is back), and
know that `down` deletes the stored day totals: "all time" shrinks to the
retention period (`ANALYTICS_RETENTION_DAYS`). If the previous backend runs
past a retention cleanup, the days it deletes are not stored as totals
either.

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
goose down        # on production, with real chat messages or manager notes
```

Plain `docker image prune -f` (no `-a`, used by the deploy workflow) only
removes dangling, untagged images and is safe.

## Notes

- `www.compnet.kz` redirects to `https://compnet.kz` (301, see [Nginx](#nginx)),
  so pages and the API are always served from the main domain.
  `https://www.compnet.kz` stays in `CORS_ALLOWED_ORIGINS`; it is harmless and
  can be removed later.
- Rate limits live in backend memory: they reset on restart and assume one
  backend container.
