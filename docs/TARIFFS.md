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

The request also carries the amount the visitor was shown
(`expected_final_price_tenge`, the server's quote). It is never used as the
price: when the server's final price differs — a new price version, the
promotion changed or its last place was taken — the request is refused with
409 and nothing is stored. The form sends exactly the amount it shows under
the tariff field ("Стоимость по тарифу", also on pages without the price
preview); after a 409 it reloads the quote and the tariff list past the
caches, shows "было X, теперь Y" (scrolled into view and focused) and the
button becomes "Подтвердить новую цену и отправить": sending again is the
visitor's confirmation of the new amount. A request without the amount is
refused (422).

Design, complexity, urgency and multilingual coefficients do not apply to
tariffs. `price_kind = from` (PRO) makes the result a lower bound: the final
price follows the brief.

## Tables (migration `20261027120000_create_tariffs_and_promotions`)

- `tariffs` — slug, title, description, order, `is_active`.
- `tariff_versions` — price, kind (`fixed` / `from`), catalog project type,
  contents, allowed modules, duration, the reason of the change
  (`change_reason`, migration `20261028120000_tariff_price_change_reason`)
  and its author; a new price is a new version, the old ones stay (price
  history, and the version each request was quoted with).
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
  limit is never exceeded. No place left (or the period ended) for a visitor
  shown the promotional price: the request is refused (409, see above) and,
  shown the regular price, sent again at it. The price is fixed before the
  request takes its number, so a refused request leaves no gap.
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
| `POST /api/v1/manager/pricing/tariffs/:slug/versions` | administrators | new current version with new contents (project type and modules checked against the catalog); optional `reason`, `expected_version` |
| `PUT /api/v1/manager/pricing/tariffs/:slug/cost` | administrators | cost of the current version (price rules below) |
| `POST /api/v1/manager/pricing/tariffs/:slug/price/preview` | administrators | what a new price would do (`price_tenge`, optional `cost_tenge`, modules): current and new quote, promotional price, margins, `problems` (block saving) and `warnings`; nothing stored |
| `POST /api/v1/manager/pricing/tariffs/:slug/price` | administrators | new price version, everything else kept: `price_tenge`, `reason` (3–500), `expected_version`, optional `cost_tenge`; 409 when another version became current |
| `GET /api/v1/manager/pricing/tariffs/:slug/history` | administrators | price versions, newest first: old and new price, date, reason, author, requests saved with each |
| `PATCH /api/v1/manager/pricing/promotions/:slug` | administrators | discount, period, places, on/off |

Managers get 403 on the administrator endpoints (`Role.CanManagePricing`).

A promotion can be switched on only with both dates (end in the future), an
active tariff, a discount below the tariff's price, a known cost of the
current version and a promotional price not below that cost.

## Price management (administrators)

`/manager/pricing`, tab "Управление ценами" (`#prices`): every tariff with its
current price, status, version, date and author of the last change.

1. "Изменить цену": new price, optionally a new cost (empty keeps the current
   version's), the reason, and modules to check the calculation with.
2. "Проверить расчёт": the server's preview (the same `tariff.Price` as the
   site and the requests). Saving is possible only after a check of exactly
   these inputs and this version, without problems.
3. "Сохранить цену…" opens a confirmation (old → new price, new version);
   only then is the version created.

Rules, checked on the server inside the transaction (tariff, current version
and active promotion locked) for a price change, a new version and a cost:

- the price is not below the version's cost (when known);
- with an active promotion: its discount stays below the price, the cost is
  known and the promotional price is not below it — the rules it was
  switched on with;
- the version edited must still be current: two administrators at once —
  one is saved, the other gets 409 and the page reloads the data.

The change never switches a tariff or a promotion on or off. Requests already
saved keep their version and amounts (`project_request_tariffs`,
`project_estimates`); places already taken keep their discount. Every change
is in `pricing_audit_log` with the author, old price and reason.

Locks: a price change takes the tariff and its version (`FOR NO KEY UPDATE`,
which does not block the requests' foreign key checks), then the promotion; a
request being saved takes the version (`FOR SHARE`), then the promotion — the
same order, so they never deadlock (`TestTariffPrices_RequestsDuringAChange`).

Extra module prices are in the Go catalog (`internal/pricing`) and change only
with a release, so the calculator, the tariffs and the requests always price
them alike; the tab lists them for reference.

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
