# Base prices of the services

The starting price of every project type of the individual calculator
(landing, business card, corporate, catalog, online store, web app, CRM,
mobile app, AI solution, backend/API, DevOps/VPS) is kept in PostgreSQL and
changed by administrators in `/manager/pricing` → "Управление ценами" →
"Базовые цены услуг", without code changes or a deploy. "Другое" has no base
price (individual estimate only) and cannot be given one.

Everything else of the estimate stays in the Go catalog
(`backend/internal/pricing`) and changes only with a release: scale tiers,
extra modules, design / complexity / urgency coefficients, the multilingual
surcharge, rounding, the maximum ratio and the duration brackets.

## One source for every page

| Where | Reads |
|---|---|
| Calculator, request form preview | `GET /api/v1/pricing/catalog` (`base_price_tenge`, new `base_price_version`; cached 30 s) |
| `/pricing`, service pages (`fetchPricingCards`) | `GET /api/v1/pricing` (`price_from_tenge`; read on every page render) |
| Requests (individual estimate) | `pricing.Catalog.Calculate` with the stored prices |
| Admin preview | the same `Catalog.Calculate` |

`pricing.Calculate(input)` (seed prices) remains for unit tests and parity
cases without a server; the server always uses a `pricing.Catalog` built from
`project_type_prices` (`internal/service/baseprices`). A project type without
a stored version keeps its seed price (version 0).

## Tables (migration `20261029120000_project_type_base_prices`)

- `project_type_prices` — project type (Go catalog id), version, base price,
  reason, author, date; one current version per type. Seeded with the prices
  in force until now (version 1), so nothing changes on the site.
- `project_estimates.base_price_version_id` — the version an estimate was
  calculated with (NULL for older estimates, tariffs and individual-only
  types); the estimate's `breakdown` also carries `base_price_version`.
- `pricing_audit_log` accepts the entity `base_price` (who, old and new
  price, reason).

## Changing a price

1. "Изменить цену": the new price and the reason (3–500 characters).
2. "Проверить расчёт": the server's calculation on every scale tier of the
   type (basic design, standard complexity, normal urgency, no modules),
   current vs new; problems block saving, warnings do not (change above 50%,
   a price not a multiple of the 10 000 ₸ rounding step, tariffs filed under
   this type — their prices do not change).
3. "Сохранить цену…" → confirmation → a new version.

The change is refused with 409 when another version became current since the
page was loaded (two administrators at once). Requests already saved keep
their estimate and the version it points at. Managers get 403 on every
endpoint; costs and margins do not exist for base prices and nothing internal
is published.

## Requests while a price changes

The request form sends the base price its preview shows ("от X") as
`expected_base_price_tenge`. When it is no longer the price in force the
request is refused with 409 before it takes a number; the form reloads the
catalog past the caches, shows "было от X, теперь от Y" (scrolled into view,
focused) and the button becomes "Подтвердить новую цену и отправить". A page
without the preview (mobile apps) shows no price and sends none.

Requests without `expected_base_price_tenge` (older pages during a deploy,
other clients) are accepted and priced as in force; if the price changes while
one is being saved it is priced again once.

Locks: the change takes the current version `FOR NO KEY UPDATE`; a request
takes the version it was priced with `FOR SHARE` and checks it is still
current; the estimate's foreign key only needs `KEY SHARE`. No deadlock
(`TestBasePrices_RequestsDuringAChange`).

## API (administrators)

| Endpoint | Notes |
|---|---|
| `GET /api/v1/manager/pricing/base-prices` | every project type: price, version, date, author, reason, editable |
| `POST /api/v1/manager/pricing/base-prices/:type/preview` | `{price_tenge}` → rows per scale tier, problems, warnings; nothing stored |
| `POST /api/v1/manager/pricing/base-prices/:type` | `{price_tenge, reason, expected_version}` → new version; 409 on a stale version |
| `GET /api/v1/manager/pricing/base-prices/:type/history` | versions, newest first: old → new price, date, reason, author, requests |

Public APIs are backward compatible: the same fields, plus
`project_types[].base_price_version` in the catalog and the optional
`expected_base_price_tenge` in `POST /api/v1/project-requests`.
