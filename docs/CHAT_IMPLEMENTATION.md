# Visitor ↔ manager chat

Status (2026-10-08): implemented on branch `feature/chat-stage-1`, verified
locally and on a production-like stand; **not deployed**. The visitor widget
is off by default. Deployment and launch steps: [DEPLOY.md](../DEPLOY.md#chat-settings-and-launch).

## What it does

- A chat button in the bottom-right corner of every site page (when enabled).
  Visitors write without registering; the history survives page reloads.
- Managers answer in a protected section at `/manager` (login with email and
  password), see unread counts, open/close conversations.
- Messages are delivered by HTTP polling (no WebSocket): the open widget polls
  every 4 s, the closed widget every 20 s, the manager inbox every 10 s and an
  open conversation every 4 s. Polling pauses in hidden tabs.
- No AI, no paid services, no presence or "read" indicators.

## Stages

| Stage | Content |
|---|---|
| 1 | Backend: `chat_conversations` / `chat_messages`, visitor API, cookie identity, rate limits, Origin check, CORS with credentials, trusted proxies. |
| 2 | Session created before the first message (no duplicates when a response is lost); frontend widget (`components/chat/`), off by default. |
| 3 | `staff_users` / `staff_sessions`, `api create-staff`, manager API with server-side sessions. |
| 4 | Atomic reply vs. close (row lock); manager section `/manager`, `/manager/login`. |
| 5 | Production configuration, deploy workflow with verified backup, docs, production-like verification. |

## Architecture

```
browser ──https──▶ Nginx (VPS host) ──▶ 127.0.0.1:3000 frontend (Next.js)
                                   └─▶ 127.0.0.1:8080 backend (Go/Gin) ──▶ PostgreSQL
                     /api/* ───────────┘      (via docker-proxy: peer = compnet-network gateway)
```

Backend (`backend/`): domain `internal/domain/{chat,staff}`, repositories
`internal/repository/postgres/{chat,chat_manager,staff}_repository.go`,
services `internal/service/{chat,managerchat,staffauth}`, handlers
`internal/http/handler/{chat,manager_auth,manager_chat}.go`, middleware
`internal/http/middleware/{origin,ratelimit,staff,cors}.go`, CLI
`internal/staffcli`. Migrations `20261008120000_create_chat_tables.sql`,
`20261009100000_create_staff_auth.sql` (additive).

Frontend (`frontend/`): widget `components/chat/` (+ `lib/api/chat.ts`), manager
section `app/manager/`, `components/manager/` (+ `lib/api/manager.ts`).

### Identity and security

| | Visitor | Manager |
|---|---|---|
| Cookie | `compnet_chat`, path `/api/v1/chat`, 90 days, `SameSite=Lax` | `compnet_manager`, path `/api/v1/manager`, 12 h absolute, `SameSite=Strict` |
| Flags | `HttpOnly`, `Secure` in production | `HttpOnly`, `Secure` in production |
| Stored | SHA-256 of a 256-bit random token | SHA-256 of a 256-bit random token; session revocable |
| Created | `POST /chat/session` (before the first message) | `POST /manager/auth/login` |

- The server finds the conversation from the cookie only; no request carries
  a conversation id for visitors. `client_message_id` only de-duplicates
  inside that conversation.
- Every state-changing request needs an allowed `Origin` (CSRF protection);
  CORS with credentials only for listed origins, no wildcard.
- Staff: bcrypt (cost 12), no public registration, active flag and role
  (`manager`/`admin`) checked on every request, one generic login error,
  login throttled per IP and per email.
- Client IP: `TRUSTED_PROXIES` (exactly the Docker network gateway) lets the
  backend use the address Nginx put into `X-Forwarded-For`; spoofed values
  are ignored.

### Rate limits (in memory, per backend process)

| What | Limit |
|---|---|
| All chat requests per IP | 120/min, burst 40 |
| New chat sessions per IP | 5/hour, burst 3 |
| Messages per conversation | 10/min, burst 5 |
| Manager API per IP | 300/min, burst 100 |
| Login attempts | 5 per 15 min per IP and per email (successful ones count) |

Answers are `429` with `Retry-After`; both UIs show a countdown.

### Behaviour rules

- A conversation is "closed" by a manager; a new visitor message reopens it.
  A manager cannot reply into a closed conversation (409) — the status check
  and the insert are one transaction under a row lock, so a close and a reply
  never interleave. Re-sending an already stored reply (same
  `client_message_id`) always succeeds without a duplicate.
- Visitor and manager read markers are independent; the manager section marks
  as read only visitor messages that were actually on screen in a visible tab.
- Empty conversations (session created, nothing sent) are never listed.

## API

Visitor (`/api/v1/chat`): `GET /` (conversation or `data: null`),
`POST /session`, `GET /messages?after=`, `POST /messages`, `POST /read`,
`PUT /contact`.

Manager (`/api/v1/manager`): `POST /auth/login`, `POST /auth/logout`,
`GET /auth/me`, `GET /conversations?status=open|closed|all&cursor=&limit=`,
`GET /conversations/:id/messages?after=|before=&limit=`,
`POST /conversations/:id/messages`, `POST /conversations/:id/read`,
`PATCH /conversations/:id` (`{"status":"open"|"closed"}`), `GET /unread-count`.

## Settings

| Where | Name | Production value |
|---|---|---|
| VPS `.env` | `CORS_ALLOWED_ORIGINS` | `https://compnet.kz,https://www.compnet.kz` |
| VPS `.env` | `TRUSTED_PROXIES` | `compnet-network` gateway (`172.19.0.1` on 2026-10-08) |
| VPS `.env` | `CHAT_COOKIE_TTL`, `MANAGER_SESSION_TTL` | defaults `2160h`, `12h` |
| compose (fixed) | `COOKIE_SECURE`, `COOKIE_SAMESITE` | `true`, `lax` |
| GitHub variable | `NEXT_PUBLIC_CHAT_WIDGET_ENABLED` | `false` until the manager is ready, then `true` |
| GitHub variable | `NEXT_PUBLIC_API_URL` | `https://compnet.kz` (default) |

## Creating a manager

```bash
docker exec -it compnet-backend ./api create-staff -email <email> -name "<name>" -role manager
```

The password is asked twice with echo off (min 12 characters, max 72 bytes);
there is no password flag, it cannot be piped, and it is never logged.
Locally: `go run ./cmd/api create-staff …` with `DATABASE_URL` and
`CORS_ALLOWED_ORIGINS` set.

## Enabling order

1. VPS `.env`: `CORS_ALLOWED_ORIGINS`, `TRUSTED_PROXIES`.
2. Deploy with the widget off (backup + migrations happen in the workflow).
3. Create the real manager; check login, cookie flags, logout.
4. Check that two different client IPs get separate limits.
5. Set `NEXT_PUBLIC_CHAT_WIDGET_ENABLED=true`, re-run the workflow.
6. Visitor ↔ manager conversation end-to-end.

Details and commands: [DEPLOY.md](../DEPLOY.md#chat-settings-and-launch); rollback: [DEPLOY.md § 6](../DEPLOY.md#6-rollback).

## Verification done

- Go: `gofmt`, `go vet`, `go test -race ./...` incl. PostgreSQL integration
  tests (concurrent close vs. reply, duplicate sends, read markers, sessions,
  FK/constraints); migrations Up → Down → Up incl. on pre-existing data.
- Frontend: `tsc --noEmit`, `eslint`, `next build` with the widget off and on.
- Production images built with the workflow's build args (widget off/on).
- `docker compose config` of `docker-compose.prod.yml` (secrets masked);
  missing `TRUSTED_PROXIES` is rejected before anything starts.
- Production-like stand: the production compose file + an Nginx with the
  VPS site's proxy headers on the host network, HTTPS single origin, the
  workflow's deploy steps (backup verified with `pg_restore --list`, pinned
  goose, start, health) — then:
  - client IP: different clients get separate limits, spoofed
    `X-Forwarded-For`/`X-Real-IP` does not bypass them; with a wrong
    `TRUSTED_PROXIES` both clients share one limit (control);
  - 37 API checks: all pages, project request form, `Secure` cookies with the
    right `SameSite`/path/lifetime, Origin/CORS rejection, login, logout,
    unread counts;
  - widget off: no chat button, no chat requests, contact form present;
  - widget on: 38 two-browser checks (visitor and manager in separate Chrome
    profiles): send/receive, unread badges and tab title, read-only-when-
    visible, close/reopen, visitor reopens, retry after network error without
    duplicates, pagination, older history keeps scroll position, logout,
    session expiry stops polling, 403, login 429, 1440/768/375 px, both themes;
  - backup with chat data restored into a scratch database with equal counts;
    switching the frontend to the widget-off image keeps all messages.
- VPS (read-only): `compnet-network` gateway `172.19.0.1`, `docker-proxy` in
  use for `127.0.0.1:8080`, Nginx config `compnet.kz` (`/api/` →
  `127.0.0.1:8080`, `X-Forwarded-For $proxy_add_x_forwarded_for`), no CDN,
  current `CORS_ALLOWED_ORIGINS=http://89.207.254.215:3000` (must be changed).

## Not verified

- A real phone's on-screen keyboard (iOS Safari / Android Chrome): the widget
  sizes itself to `visualViewport`, checked only in headless Chrome.
- Safari and Firefox; screen readers.
- The actual production run on the VPS (no deploy was made), including the
  `www.compnet.kz` → apex API path (cross-origin, same-site) and Docker Hub
  pulls; the deploy-script steps were run locally only.
- Hidden-tab behaviour was emulated (`visibilityState` override); network loss
  was emulated by dropping responses in DevTools.

## Limitations

- Rate limits and their counters live in memory (single backend container;
  reset on restart).
- Manager inbox: pages after the first are not refreshed by polling (status
  and unread of rows further down update on reload or on own actions); the
  cursor walks a list that reorders when conversations get new messages.
- Unsent manager replies are kept in memory only (lost on reload).
- No email/Telegram notifications for managers; no file attachments; no
  commands to deactivate staff or reset passwords (SQL for now).
- A lost response to `POST /chat/session` leaves an empty, never-listed
  conversation behind.
- IPv6 visitors are limited per address, not per /64.
