# Visit analytics and the "Statistics" page

First-party analytics: where visitors come from, which pages they see, and
which actions end in a request or a chat. Collected only in browsers that
accepted analytics; shown to managers at `/manager/analytics`.

## What is collected

| Event | When | Recorded by |
|---|---|---|
| `page_view` | every Next.js navigation (repeats of the same page within 1.5 s ignored) | browser |
| `promo_view` | at least half of the promo block was on screen (once per page view) | browser |
| `promo_click` | a link/button inside the promo block was clicked | browser |
| `whatsapp_click`, `phone_click` | any `wa.me` / `tel:` link clicked | browser |
| `chat_open` | the chat widget was opened | browser |
| `chat_first_message` | the conversation's **first visitor message was stored** | backend, after saving |
| `lead_submit` | a request **was stored** | backend, after saving |

Clicks are not inquiries. Only `lead_submit` and `chat_first_message` count
as inquiries, and the API refuses them from browsers.

Per session the server stores: start/last activity (UTC), landing path,
source/medium/campaign/term/content (UTM, max 100 characters), the referring
site's **host only**, the visitor's first source, device category
(desktop/mobile/tablet from the User-Agent, which is not stored), and the site
language. Per event: type, server time (UTC), page **path without query
string or fragment**. Links to a request or conversation are internal ids.

Never stored in analytics: IP addresses (used only in memory for rate
limiting), User-Agent strings, query strings, form values, chat text, names,
phones, emails. No geolocation, no fingerprinting.

## Visitors and sessions

- **Visitor** = a browser with a random UUID in `localStorage`
  (`compnet-a-visitor`), created after consent. Another device, a private
  window, cleared storage or declined consent all look like a new or missing
  visitor — the dashboard says "anonymous visitors (browsers, not people)".
- **Session** (`compnet-a-session`) ends after **30 minutes without
  activity**, or when the visitor arrives through a link with different UTM
  tags.
- **Source of a session**: `utm_source` (+ medium, campaign …) → else the
  referring site, classified as `organic` (search engines), `social` or
  `referral` → else `(direct) / (none)`. A referrer from the site itself
  counts as direct.
- **First source** (`compnet-a-first`): the touch of the visitor's very
  first session, never overwritten — a later direct visit does not erase it.
- **Conversion** = sessions started in the period with at least one stored
  request or first chat message ÷ sessions started in the period. A session
  with both counts once.
- Requests and new conversations on the cards count **all** saved records
  (consent or not); "linked to a session" counts those from consenting
  browsers.

## Consent

There was no consent mechanism before; a banner was added
(`components/analytics/AnalyticsProvider.tsx`). It appears only when the
backend enables analytics or GA4. "Allow analytics" turns collection on;
"Necessary only" keeps it off and removes any analytics ids. The choice is
stored in this browser (`compnet-consent`) and can be changed with "Cookie
settings" in the footer. Without consent the site, forms and chat work as
before and their records are stored as before; nothing is sent to the
analytics endpoint and no session id is attached to requests or messages.
The privacy and cookie pages describe this (still marked as a demo text; no
legal certification is claimed).

## Exclusions and data quality

- Dropped by the server: known bots and automation (User-Agent patterns incl.
  HeadlessChrome, Lighthouse, curl, scripts), requests from localhost /
  `*.local` origins, the manager section (`/manager…`) and `/api` paths.
- Not sent by the browser: `navigator.webdriver` (automated tests), the
  manager's **"Don't count this browser"** switch on the statistics page.
- Bot detection is best effort; blockers, declined consent, cleared storage
  and device changes all reduce or distort the numbers.

## API

| Endpoint | Access | Notes |
|---|---|---|
| `POST /api/v1/analytics/events` | public, allowed `Origin` only | write-only; ≤ 20 events, ≤ 16 KiB; 60 batches/min per IP (burst 30); duplicate `event_id` ignored; conversions refused (422); dropped traffic still gets 204 |
| `GET /api/v1/analytics/config` | public | `{enabled, ga4_measurement_id}` only |
| `GET /api/v1/manager/analytics/report?from&to` | staff session + role with analytics rights (manager, admin) | Asia/Almaty dates, inclusive, ≤ 366 days |
| `GET /api/v1/manager/analytics/sessions/:id` | same | events in order, linked request (id, type, status — no contacts), linked conversation (what the visitor left in the chat) |

Requests and chat messages accept an optional `analytics_session_id`; the
backend records the conversion after the save, once per request /
conversation (unique indexes), and only if the session exists.

## Time zone

Stored in UTC. Report days start at 00:00 Asia/Almaty (UTC+5);
`time/tzdata` is embedded in the binary.

## Retention

`ANALYTICS_RETENTION_DAYS` (default **90**). A background job in the backend
deletes older events and inactive sessions at startup and every 6 hours.
Requests and conversations themselves are not touched.

## Configuration

| Variable | Default | Meaning |
|---|---|---|
| `ANALYTICS_ENABLED` | `false` | collection, consent banner, conversion links |
| `ANALYTICS_RETENTION_DAYS` | `90` | 1…3650 |
| `ANALYTICS_ALLOW_LOCAL` | `false` | accept localhost/headless — local testing only, refused in production |
| `GA4_MEASUREMENT_ID` | empty | optional GA4 (`G-…`); empty = no GA4 at all |

## GA4

Not installed before (no gtag/GTM in the code). Optional and off: with a real
`GA4_MEASUREMENT_ID` the browser loads `gtag.js` **after consent** and sends
`page_view` (path only), `promo_view`, `promo_click`, `whatsapp_click`,
`phone_click`, `chat_open` and `generate_lead` (after the server confirmed a
saved request). Never contacts, chat text, request or conversation ids;
Google signals and ad personalisation off. Withdrawing consent sets
`analytics_storage` to denied. Create the property in Google Analytics
yourself and put its id in the VPS `.env`.

## Enabling in production

The stack runs from `/var/www/compnet` (compose project `compnet`, env file
`/var/www/compnet/.env`, owner `compnet`, mode 600 — no sudo needed). The
deploy copies the compose file and the migrations there; the migration
`20261013120000_create_analytics` runs during the deploy. Analytics stays off
until the steps below.

```bash
ssh compnet-vps            # as compnet
cd /var/www/compnet
cp -a .env ".env.backup-$(date +%Y%m%d-%H%M%S)"
grep -q '^ANALYTICS_ENABLED=' .env \
  && sed -i 's/^ANALYTICS_ENABLED=.*/ANALYTICS_ENABLED=true/' .env \
  || printf '\nANALYTICS_ENABLED=true\nANALYTICS_RETENTION_DAYS=90\n' >> .env
grep -E '^(ANALYTICS_|GA4_)' .env          # GA4_MEASUREMENT_ID absent or empty = GA4 off
docker compose -p compnet --env-file .env -f docker-compose.prod.yml config --quiet
docker compose -p compnet --env-file .env -f docker-compose.prod.yml up -d --no-deps backend
docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' compnet-backend | grep -E '^(ANALYTICS_|GA4_)'
curl -s https://compnet.kz/api/v1/analytics/config   # {"data":{"enabled":true,"ga4_measurement_id":""},...}
```

Then open the site in a private window: the consent banner appears; allow,
browse a few pages, open `/manager/analytics` → today's session is listed.
Press "Don't count this browser" in the browsers you use yourself.

To switch off: set `ANALYTICS_ENABLED=false` in the same file and run the same
`up -d --no-deps backend`; the banner disappears and nothing is collected
(stored data is kept until retention deletes it). The frontend needs no
rebuild either way — it reads the switch from the backend.
