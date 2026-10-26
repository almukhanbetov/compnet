# Tariffs and promotions

Fixed-scope packages (Start, Business, PRO) sold next to the individual
calculator, and promotions on them. Nothing is public until an administrator
switches it on in `/manager/pricing`.

## Where prices come from

| What | Source |
|---|---|
| Individual estimate (calculator, `/pricing` "from" prices) | Go catalog `backend/internal/pricing`, published at `GET /api/v1/pricing/catalog` (unchanged) |
| A tariff's price | PostgreSQL `tariff_versions`: immutable versions, one current per tariff |
| Extra modules of a tariff | the same Go catalog (`pricing.FindModule`), only those the version allows |
| A promotion's discount | `promotions`, applied to the tariff's price only |

A tariff request is priced on the server only:

    final = version price − promotion discount (if a place was taken) + Σ allowed modules (catalog prices)

Design, complexity, urgency and multilingual coefficients do not apply to
tariffs. `price_kind = from` (PRO) makes the result a lower bound: the final
price follows the brief.

## Tables (migration `20261027120000_create_tariffs_and_promotions`)

- `tariffs` — slug, title, description, order, `is_active`.
- `tariff_versions` — price, kind (`fixed` / `from`), catalog project type,
  contents, allowed modules, duration; a new price is a new version, the
  old ones stay (price history, and the version each request was quoted with).
- `tariff_version_costs` — internal cost per version; read by admin queries
  only, never by a public one.
- `promotions` — tariff, discount, period (`starts_at`, `ends_at`),
  `max_orders`, `is_active`; at most one active promotion per tariff; the
  database refuses an active promotion without both dates.
- `promotion_reservations` — a request's place: `reserved` → `confirmed` or
  `released` (`rejected`, `archived`, `expired`).
- `project_request_tariffs` — the terms a request was saved with: tariff,
  version, base price, discount, promotion and its version, modules total,
  final price, catalog version (`final = base − discount + modules` is a
  CHECK). The estimate (`project_estimates`) carries the same final price
  and `pricing_version = tariff:<slug>@<version>`.
- `pricing_audit_log` — who changed which tariff, version, cost or promotion.

The migration seeds Start (59 000 ₸), Business (99 000 ₸) and PRO
(from 199 000 ₸) and the promotion "Старт по акции" (−10 000 ₸, 10 places),
all **inactive**, the promotion without dates.

## Promotional places

- **Reserved** when a request for the tariff is saved while the promotion is
  live, in the request's transaction: the promotion row is locked
  (`FOR UPDATE`), activity and period are checked by the database clock,
  expired reservations are released, and a place is taken only while fewer
  than `max_orders` are held. Concurrent requests queue on the lock, so the
  limit is never exceeded. No place left (or the period ended): the request
  is saved at the regular price and the visitor is told so.
- **Confirmed** when the manager sets the request to *in progress* or
  *completed*.
- **Released** when the request is *rejected* (also after confirmation) or
  *archived*, or when it stays unconfirmed for 72 hours
  (`tariffs.ReservationTTL`): such a place counts as free at once and the
  backend job marks it released every 10 minutes. A released place is not
  taken back automatically if the request is reopened.
- The promotion's end stops new reservations; places already held keep their
  rules.

## API

| Endpoint | Access | Notes |
|---|---|---|
| `GET /api/v1/tariffs` | public | active tariffs, their modules (catalog prices) and a promotion only while live; no costs; cached 30 s |
| `GET /api/v1/tariffs/:slug/quote?modules=a,b&external_api_count=n` | public | the server's price of a choice |
| `POST /api/v1/project-requests` with `tariff: {slug, module_ids, external_api_count}` | public | priced on the server; any amount sent by the client is ignored |
| `GET /api/v1/manager/pricing` | administrators | tariffs with costs, promotions with taken / confirmed places |
| `PATCH /api/v1/manager/pricing/tariffs/:slug` | administrators | texts, order, on/off (not off while its promotion is on) |
| `POST /api/v1/manager/pricing/tariffs/:slug/versions` | administrators | new current price version (project type and modules checked against the catalog) |
| `PUT /api/v1/manager/pricing/tariffs/:slug/cost` | administrators | cost of the current version |
| `PATCH /api/v1/manager/pricing/promotions/:slug` | administrators | discount, period, places, on/off |

Managers get 403 on the administrator endpoints (`Role.CanManagePricing`).

A promotion can be switched on only with both dates (end in the future), an
active tariff, a discount below the tariff's price, a known cost of the
current version and a promotional price not below that cost.

## Site

- `/pricing` — tariff cards above the catalog cards, only when active ones
  exist; the promotional price only while the API offers it.
- `/calculator` — a "Tariffs / Individual estimate" switch only when active
  tariffs exist; amounts from the server quote. `?tariff=<slug>` opens a tariff.
- Request form — a tariff field only when active tariffs exist; a tariff
  replaces the project type; `?tariff=<slug>&modules=a,b&integrations=n`
  preselects a choice.
- Page titles and descriptions never contain a promotional price.

## Analytics

The requests report counts requests by tariff (`tariffs`, "" = individual).
GA4 `generate_lead` carries the tariff's slug (no contacts or ids). Visit
events are unchanged.

## Launch checklist (administrator)

1. Approve each tariff's contents, price, project type and allowed modules;
   change them with a new version if needed.
2. Enter the cost of each current version.
3. Switch the tariffs on.
4. Set the promotion's period and switch it on (the server checks the rules above).
