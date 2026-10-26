# Pricing checks

The server's pricing catalog (`backend/internal/pricing`) is the only source of prices. It is
published read-only at `GET /api/v1/pricing/catalog`; the calculator and the request form's
estimate preview read it there and repeat the server's formula (`frontend/lib/pricingCalculator.ts`).
Every request is still recalculated on the server.

    # Parity: the browser's formula on the published catalog = the server's, case for case
    (cd backend && PRICING_PARITY_OUT=/tmp/cases.jsonl go test ./internal/pricing -run TestWriteParityCases)
    node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON e2e/pricing/parity.mjs /tmp/cases.jsonl \
        http://127.0.0.1:8096/api/v1/pricing/catalog

    # The calculator and the form preview in a browser, with and without the catalog
    # (isolated stack of e2e/lead-attribution; sends one artificial request)
    node e2e/pricing/calculator-ui.cjs <playwright>

The parity cases cover every project type, every scale tier of its category, every distinct
modules total (with and without per-unit integrations), every design / complexity / urgency
level and both multilingual choices, plus 50 000 random cases with invalid input.

    # Tariffs and the launch promotion end to end (isolated stack; needs staff.env with a
    # manager and admin.env with an administrator; sends two artificial requests and
    # switches everything off again at the end)
    node e2e/pricing/tariffs-ui.cjs <playwright>

    # Price management ("Управление ценами", /manager/pricing#prices): manager refused (page and
    # API), preview = server, confirmation, history, two administrators at once, a price changed
    # while a visitor fills in the form (409, then saved at the new amount), promotion rules, the
    # API unavailable, 375 px; screenshots into [screenshot-dir]. Prices are read from the API,
    # so it can be run again; it creates new price versions in the test database.
    node e2e/pricing/price-management-ui.cjs <playwright> [screenshot-dir]

    # A price changed while the form is open: Business shown at 99 000 ₸, set to 109 000 ₸,
    # the open form sent → 409 with old → new amount → confirmed → saved at 109 000 ₸; the
    # amount sent is the one on screen; earlier requests keep their prices; the form without a
    # price preview; the API directly (stale, made-up, missing amounts, forged fields).
    # Restarts the test backend before the API block (rate limiter), if restart-backend.sh is
    # next to it. Leaves Business at 109 000 ₸ (tariffs-ui.cjs expects the seeded 99 000 ₸).
    node e2e/pricing/price-change-request.cjs <playwright> [screenshot-dir]

    # Base prices of the services ("Базовые цены услуг", docs/BASE_PRICES.md): manager refused,
    # preview = the calculator, confirmation, history, the same price at once on the catalog,
    # /pricing, the service page and the calculator, two administrators at once, a price changed
    # while the form is open (409 → confirmed), the API directly, SEO texts with the base price
    # (tariffs and the promotion switched on for it), 375 px. Landing is restored at the end.
    node e2e/pricing/base-prices-ui.cjs <playwright> [screenshot-dir]

    # Parity on the prices in force (after administrators changed them): generate the cases
    # with the published base prices, then compare as above.
    (cd backend && PRICING_PARITY_OUT=/tmp/cases.jsonl PRICING_CATALOG_URL=http://127.0.0.1:8096/api/v1/pricing/catalog \
        go test ./internal/pricing -run TestWriteParityCases)

The tariff rules themselves (prices, places under concurrency, release, versions, access, price
changes, requests during a change) are covered by the Go integration tests `TestTariffs_*`,
`TestTariffPrices_*` and `TestBasePrices_*` (backend/internal/app). See docs/TARIFFS.md and
docs/BASE_PRICES.md.
