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
| `calculator_start` | first click or change in the calculator form (once per page view) | browser |
| `calculator_result` | the calculator showed an estimate for the first time (once per page view) | browser |
| `form_start` | first focus or input in the request form, not the hidden anti-spam field (once per page view) | browser |
| `cta_click` | a link inside the site to `/contact` or `/calculator` was clicked (the page it was on is stored, not the target; a repeat on the same page within 1.5 s ignored) | browser |
| `email_click` | a `mailto:` link was clicked (repeats within 1.5 s ignored) | browser |
| `chat_first_message` | the conversation's **first visitor message was stored** | backend, after saving |
| `lead_submit` | a request **was stored** | backend, after saving |

Funnel steps carry only the type and the page path: never the calculator's
choices or estimate, a form field or its value.

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

UTM values are free text from a URL, so a shared link can carry personal
data. A value that looks like an email, a web address, a phone number
(Kazakhstan/Russia, or any number written with `+`), a Kazakh IIN or a
payment card number is dropped whole — by the browser before it keeps or
sends it (`frontend/lib/analytics/personal.ts`) and again by the server
(`backend/internal/service/analytics/personal.go`, used by `CleanText`).
Ordinary tags, dates and Google Ads ValueTrack ids are kept. Of an ad click
id (`gclid`, `gbraid`, `wbraid`) only which one was present is kept, for a
request's source; its value is never stored or sent. Visit events get just a
yes/no flag (`ad_click`), so an auto-tagged Google Ads click (click id, no
UTM tags) counts as `google / cpc` and not as Google organic; the flag
itself is not stored. A click id only counts when it looks like one (8–1024
URL-safe characters): `?gclid=` alone does not.

Invisible characters are removed from UTM values and paths before anything
is stored: control characters, Unicode format characters (bidi overrides
and isolates such as U+202E, zero-width spaces and joiners, the BOM) and
line/paragraph separators — so a link cannot make a campaign name look
different to the manager. Letters of every alphabet stay as written.

## Visitors and sessions

- **Visitor** = a browser with a random UUID in `localStorage`
  (`compnet-a-visitor`), created after consent. Another device, a private
  window, cleared storage or declined consent all look like a new or missing
  visitor — the dashboard says "anonymous visitors (browsers, not people)".
- **Session** (`compnet-a-session`) ends after **30 minutes without
  activity**, or when the visitor arrives through a link with different UTM
  tags or a new ad click id (gclid/gbraid/wbraid without UTM — Google Ads
  auto-tagging). Coming back from a search engine or another site within
  30 minutes continues the session (as in GA4); the visitor's first source
  is never replaced.
- **Source of a session**: `utm_source` (+ medium, campaign …) → else the
  referring site, classified as `organic` (search engines), `social`,
  `email` (webmail) or `referral` → else `(direct) / (none)`. Android apps
  pass `android-app://<package>`, so the package name is the host: known
  apps are mapped (`com.google.android.gm` → Gmail / email,
  `com.google.android.googlequicksearchbox` → Google / organic, Telegram,
  Instagram … → social); any other Google or Yandex app is a referral, never
  search. A referrer from the site itself
  counts as direct. `document.referrer` describes how the tab was opened,
  so it is used only until the visitor follows a link inside the site: a
  session that starts later in the same tab (after 30 minutes idle, or when
  analytics is allowed after "Necessary only") gets no external referrer —
  the earlier arrival is not re-counted, and nothing from before a decline
  comes back.
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

When a page opens (unless the visitor chose "Necessary only"), the tab
remembers **in memory only** where this visit entered the site (landing
path, referring host, UTM tags, ad click flag) — no storage, no request.
The session this visit starts (within 30 minutes) starts from that entry:
a visitor who accepts on a later page is not counted as "unknown", and a
returning visitor who follows a link before the tracker has loaded its
settings keeps the search engine or ad as the source; "Necessary only"
forgets it. The page shown before the current one is kept the same way, so
a request sent right after accepting still has its previous page. A full
page reload starts a new tab state.
The privacy and cookie pages describe this (still marked as a demo text; no
legal certification is claimed).

## Exclusions and data quality

- Dropped by the server: known bots and automation (User-Agent patterns incl.
  HeadlessChrome, Lighthouse, curl, scripts; phone brands that merely end in
  "bot", such as CUBOT, are not bots), requests from localhost /
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
conversation (unique indexes). The browser sends its events every ~2 s, so
a visitor who consented and submits quickly can reach the backend before
the session does: the conversion then waits in
`analytics_pending_conversions` (session id + request/conversation id, no
contacts) and becomes a `lead_submit` / `chat_first_message` event, dated at
the save, as soon as that session's first batch arrives. Nothing delays the
request itself. A session that never arrives (consent withdrawn before the
flush, filtered bot, analytics off) leaves no link; its waiting row is
deleted by the cleanup task after 24 hours.

## Time zone

Stored in UTC. Report days start at 00:00 Asia/Almaty (UTC+5);
`time/tzdata` is embedded in the binary.

## Request sources

Since Stage 8.4 a request sent with analytics consent keeps its source in
`project_request_attribution` (1:1 with the request, deleted with it): page
sent from, the page before it, landing page, referring host, UTM tags (with
the personal-data filter above) and whether an ad click id was present. The
backend derives the channel (`backend/internal/attribution`) and stores
sources only while `ANALYTICS_ENABLED` is on. Unlike visit details, a source
is kept as long as the request. A visit with no referrer, tags or click id
is `direct` when it started on the home page or on a page reached inside
the site (`internal_navigation`), otherwise `unknown` (a deep link whose
referrer an app stripped). The source is optional: it is written in the
request's transaction behind a savepoint, so if it cannot be stored the
request is still saved — without a source — and the manager is notified as
usual; only the database error code is logged. The statistics' "Заявки и источники" block
(`GET /api/v1/manager/analytics/leads`) counts every request; those without
a source are "unknown". The source cards are partial views that overlap by
definition — "Google, органический поиск" (organic Google only), "Реклама:
поиск и соцсети" (`paid_search` + `paid_social`), "Соцсети, включая рекламу"
(`social` + `paid_social`) — and the page says so under them; "По каналам"
is the full breakdown without overlaps. When a report fails to load, the
page hides the previous period's figures instead of showing them as current.

## Server logs

The backend does not log requests. Nginx's access log is configured without
query strings and with referrers cut before `?` (`log_format compnet_privacy`
in `deploy/nginx/compnet.kz.conf`), so UTM tags, `gclid` and the managers'
search (`?q=`) are not written there. Nginx's error log cannot be formatted:
when the backend is unreachable it still records the full request line —
keep its rotation short.

## Retention

`ANALYTICS_RETENTION_DAYS` (default **90**). A background job in the backend
deletes older events and inactive sessions at startup and every 6 hours.
Requests and conversations themselves are not touched.

Before deleting, the same job stores the totals of every finished
Asia/Almaty day that is about to lose details in `analytics_daily_totals`
(visits = sessions, visitors = distinct browser ids, page views — counts
only). The "Посещаемость" block (`GET /api/v1/manager/analytics/visits`)
adds these totals to the details still kept, so "visits, all time" never
goes down; it starts at the first recorded visit and is not reconstructed
from requests. "Today" is Asia/Almaty. Managers' pages are told about new
visits over the manager WebSocket (`analytics_updated`, no payload, at most
every 3 s) and re-read the API; they also re-read after every reconnect and
poll while the socket is down.

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
`phone_click`, `chat_open`, `calculator_start`, `calculator_result`,
`request_form_start` (the tracker's `form_start`; GA4's own enhanced
measurement uses `form_start` for any form), `cta_click`, `email_click` and
`generate_lead` (after the server confirmed a saved request). Browsers the
manager excluded ("do not count this browser") and automated browsers send
nothing to GA4 either. Never contacts, chat text, request or conversation ids;
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
