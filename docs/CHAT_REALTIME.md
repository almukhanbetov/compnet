# Chat in real time (WebSocket)

The visitor ↔ manager chat delivers messages instantly over WebSocket.
PostgreSQL stays the only source of truth: every event describes a change
that has already been committed, and clients re-read the HTTP API after
every (re)connect, so a lost event costs a delay, never a message.

## Architecture

```
browser (widget / /manager)                       backend (one process)
  ├─ HTTP API  ── reads, fallback sends ───────►  handlers ─► services ─► PostgreSQL
  └─ WebSocket ── events, sends with ack ──────►  realtime.Hub (in memory)
                                                     ▲
                    services ── after COMMIT ── chatevents.Publisher
```

- **Write path**: authorization (cookie) → service → PostgreSQL transaction →
  `COMMIT` → `message_ack` to the sender **and** `new_message` to everyone
  allowed to see it. Nothing is acknowledged before the commit.
- **Idempotency**: every message carries a client-generated
  `client_message_id`; `UNIQUE (conversation_id, client_message_id)` makes a
  retry (after a lost ack, a dropped socket, a switch to HTTP) return the
  stored message instead of a duplicate. A retry re-publishes the event, in
  case the first publish was lost between commit and publish.
- **Order**: message ids are a monotonically increasing identity. Inserts
  lock the conversation row first, so within one conversation ids become
  visible in increasing order and `?after=<last id>` never skips a message.
- **Recovery**: the HTTP cursor of a client only moves over contiguous HTTP
  pages, never on an event. After a reconnect the client asks
  `GET …/messages?after=<cursor>` and gets exactly what it missed.
- **Fallback**: polling never stops. Without a socket it runs at the old rate
  (visitor 4 s open / 20 s closed, manager 4 s dialog / 10 s inbox); with a
  socket it is a 60 s safety net. Sends fall back to the HTTP API with the
  same `client_message_id` on a timeout, a closed socket or a server error.
- **Who gets what**: a visitor socket is bound to the visitor's own
  conversation by the `compnet_chat` cookie (the client never names a
  conversation); an authenticated manager socket receives events of all
  conversations (all managers may work with every conversation today),
  inbox rows and the unread totals.

## Endpoints

| Path | Auth | Notes |
|---|---|---|
| `GET /api/v1/chat/ws` | `compnet_chat` cookie (Path `/api/v1/chat`) | A visitor without a conversation may connect (presence only) and reconnects once the first message has created it. |
| `GET /api/v1/manager/ws` | `compnet_manager` session cookie (Path `/api/v1/manager`, `SameSite=Strict`) | 401 without a valid session. |

No token or password is ever put in a URL: the browser sends the existing
HttpOnly cookies with the handshake. The `Origin` header must be exactly one
of `CORS_ALLOWED_ORIGINS` (403 otherwise, also when it is missing) — this
blocks cross-site WebSocket hijacking with the visitor's or manager's cookie.

HTTP additions: `GET /api/v1/chat` returns `meta.managers_online`;
`GET /api/v1/chat/messages` accepts `?tail=1` (newest page) and `?before=<id>`
(older history) besides `?after=<id>`, and its meta includes
`manager_last_read_id` and `status`. The visitor conversation includes
`manager_last_read_id` (for "read" on the visitor's own messages).

## Event format (server → client)

Every frame is one JSON object:

```json
{
  "v": 1,
  "type": "new_message",
  "event_id": "4f1c…",
  "ts": "2026-10-12T17:35:00.123456Z",
  "conversation_id": "…uuid… (manager events only)",
  "request_id": "… (only on message_ack / error / pong)",
  "data": { }
}
```

- `v` — protocol version (bump on breaking changes); `ts` — server time,
  UTC; `event_id` — unique per event. Message timestamps in payloads are UTC
  too.
- Visitors never receive conversation ids or staff identities.

| type | visitor `data` | manager `data` |
|---|---|---|
| `new_message` | `message` (id, author, body, client_message_id for own, created_at), `unread_count` | `message` (+ staff_user_id, staff_name), `conversation` (inbox row with `last_message`), `unread_total` {conversations, messages} |
| `message_ack` | `client_message_id`, `created` (false on a retry), `message` | same, `conversation_id` set |
| `messages_read` | `reader` (visitor/manager), `last_read_id`, `unread_count` | `reader`, `last_read_id`, `conversation`, `unread_total` |
| `conversation_updated` | `conversation` (status, contact, read markers, counters) | `conversation`, `unread_total` |
| `typing` | `from: "manager"`, `is_typing` | `from`, `is_typing`, for managers also `staff_user_id`, `staff_name` |
| `presence` | `subject: "managers"`, `managers_online` | `subject: "managers"` + `online_managers`; `subject: "visitor"` + `conversation_id`, `visitor_online`; on connect `subject: "visitors"` + `online_conversation_ids` |
| `error` | `code` (`validation_error`, `rate_limited`, `not_found`, `conflict`, `unauthorized`, `forbidden`, `bad_request`, `internal_error`), optional `fields`, `retry_after_seconds`, `client_message_id` | same |
| `pong` | answer to `ping` | same |

Clients translate `code`; the optional `message` is a server-side Russian
text and is never shown as is.

## Client frames (client → server)

```json
{"type": "send_message", "request_id": "r1", "client_message_id": "<uuid v4>", "body": "…", "conversation_id": "<manager only>"}
{"type": "mark_read", "request_id": "r2", "last_message_id": 123, "conversation_id": "<manager only>"}
{"type": "typing", "is_typing": true, "conversation_id": "<manager only>"}
{"type": "ping", "request_id": "r3"}
```

`send_message` is answered by `message_ack` or `error` with the same
`request_id`. The web clients use HTTP for read markers (the server
publishes `messages_read` either way); `mark_read` over the socket is
available too.

## Presence

"Manager online" is shown to visitors only while at least one manager has a
live, authenticated socket: protocol pings every 25 s, no pong within 10 s
drops the connection. Several tabs count once; closing one tab keeps the
manager online while another is connected. Going offline is announced
after a 5 s grace period, so a page reload does not flicker. The widget
shows it only while its own socket is open; otherwise it says nothing. No
reply time is promised anywhere; the header reads «Напишите нам — менеджер
ответит в чате». Working hours never block sending or receiving.

## Limits and protection

| What | Limit | Where |
|---|---|---|
| Frame size | 16 KiB (larger → close 1009) | `realtime.DefaultLimits` |
| Client frames | 20 at once, then 5/s; refused frames get `error rate_limited`, 20 refusals → close 4429 | per connection |
| Typing | ≤ 1 signal/s per connection (extra dropped) | per connection |
| Messages | existing limits: 5 at once, 10/min per conversation; 3 new conversations/hour per IP | services (same for HTTP and WebSocket) |
| Connections | 2000 visitors, 20 per IP; 200 managers, 20 tabs per account (→ HTTP 429 before the upgrade) | hub |
| Handshakes | counted by the existing per-IP limits of `/api/v1/chat` (120/min) and `/api/v1/manager` (300/min) | router |
| Outgoing queue | 64 events per connection; a client that cannot keep up is closed with 4408 and re-syncs | hub |
| Writes | 10 s per write; a stuck write drops the connection | client |

Manager sockets re-check their session on every `send_message`/`mark_read`
and every 30 s; logout closes the session's sockets at once (4401), an
expired, revoked or deactivated session within 30 s. A closed socket frees
all its resources (goroutines, queue, presence) immediately.

Close codes: `1000` normal, `1001` server restart (reconnect), `1009` frame
too big, `1013` connection limit, `4401` session ended (log in again, no
reconnect), `4408` slow consumer (reconnect), `4429` too many frames
(reconnect after backoff).

Logs never contain cookies, tokens, passwords, conversation ids or message
text.

## Reconnection (frontend)

`lib/chat/realtime.ts`: exponential backoff with full jitter (1 s … 30 s),
an application ping every 25 s with a 10 s pong timeout (browsers do not
expose protocol pings), immediate reconnect on the `online` event, no
reconnect after 4401. A visitor tab hidden for 2 minutes closes its socket
and reconnects when shown. After every (re)connect the client re-reads the
conversation, the messages after its cursor, read markers, status and
counters from the API. Messages are merged by server id and
`client_message_id`, so the same message arriving by event, ack and HTTP
appears once. Unconfirmed messages stay in the UI as "sending"/"failed" with
retry (same `client_message_id`).

## Scaling: one backend process only

The hub is **in memory and per process**. `docker-compose.prod.yml` runs
exactly one backend (`container_name: compnet-backend`), which is what this
design supports. With two or more backend processes an event published in
one process would never reach sockets connected to another one, and
presence and connection limits would be per process. Do not scale the
backend horizontally as it is.

To run several instances:

1. Publish events through a shared bus instead of directly into the local
   hub: PostgreSQL `LISTEN/NOTIFY` (already available, payload ≤ 8 KB — send
   ids and let each process load the data) or Redis Pub/Sub.
   `chatevents.Publisher` is the single place to change: it would `NOTIFY`
   after commit, and every process would `LISTEN` and fan out to its own hub.
2. Keep presence in a shared store with TTLs (Redis keys refreshed by
   heartbeats) instead of in-process counters.
3. Move rate and connection limits to the shared store as well.

No sticky sessions are needed after that: any process can serve any socket.

## Reverse proxy (production)

The production Nginx (`/etc/nginx/sites-available/compnet.kz`, not in this
repository) proxies `/api/` without `Upgrade`/`Connection`, so WebSocket
handshakes do not pass yet. Until it is changed the chat keeps working over
HTTP polling — the frontend falls back automatically.

Add inside the `server { … listen 443 ssl; … }` block, **before**
`location /api/ { … }`:

```nginx
    # Chat WebSockets (visitor and manager). Exact-match locations take
    # precedence over "location /api/".
    location = /api/v1/chat/ws {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        # The server pings every 25 s, so a healthy idle socket always has
        # traffic well within this timeout.
        proxy_read_timeout 75s;
        proxy_send_timeout 75s;
        proxy_buffering off;
    }

    location = /api/v1/manager/ws {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 75s;
        proxy_send_timeout 75s;
        proxy_buffering off;
    }
```

Then `sudo nginx -t && sudo systemctl reload nginx`. TLS terminates in Nginx,
so the browser uses `wss://compnet.kz/api/v1/…/ws` and the backend sees plain
HTTP from `127.0.0.1:8080`; `X-Forwarded-For` from the compose gateway is
trusted through the existing `TRUSTED_PROXIES`. The same snippet was used for
the local proxy test (see the verification report).

Check from outside (expect `HTTP/1.1 101 Switching Protocols`):

```bash
curl -si --http1.1 -H "Connection: Upgrade" -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  -H "Origin: https://compnet.kz" https://compnet.kz/api/v1/chat/ws | head -1
# and a foreign origin must be refused (403):
curl -si --http1.1 -H "Connection: Upgrade" -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  -H "Origin: https://evil.example" https://compnet.kz/api/v1/chat/ws | head -1
```

## Tests

- `go test -race ./internal/realtime/` — hub: presence with several tabs and
  the grace period, isolation, slow consumer, connection limits, frame
  flood, frame size, dead peer, logout of one session, shutdown.
- `TEST_DATABASE_URL=… go test -race ./internal/app/` — the real server
  (`app.Build`) on a migrated PostgreSQL with real WebSockets: delivery both
  ways, ack after commit, idempotent retry, typing, read markers, close,
  HTTP fallback, message limits over WebSocket, isolation of visitors,
  manager API refusal for visitor/forged cookies, foreign/missing Origin,
  logout and session revocation, presence with two sessions, backend restart
  and recovery of missed messages, concurrent sends never skipped by an
  `after` poller.
