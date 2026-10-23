# Lead source E2E (Stage 8.6C checks, Stage 8.6D fixes) — isolated stack only

Browser journeys for "external site → compnet → form → PostgreSQL → manager panel".
Everything runs locally; nothing here may point at production.

Stack used for the Stage 8.6C report and the Stage 8.6D re-run:

- PostgreSQL 17 in its own container (`compnet-stage86c-db`, 127.0.0.1:5499), databases
  `compnet_e2e` (stack) and `compnet_test` (Go integration tests), migrated with `goose`.
- Backend built from this worktree on :8096 with `ANALYTICS_ENABLED=true`
  (`ANALYTICS_ALLOW_LOCAL` stays off: bot and localhost filters are active), env in `db.env`
  (`E2E_DB`, `TEST_DB`, generated password, mode 600, git-ignored).
- Frontend `next build` with `NEXT_PUBLIC_API_URL=http://api.compnet.test:8096`, started with
  `NODE_OPTIONS=--require ./dnsmap.cjs next start -p 3006 -H 127.0.0.1` (the Next server must
  resolve the test domain for server-side rendering).
- `referrers.cjs`: HTTPS stand-ins for www.google.com, mail.google.com and l.instagram.com on
  127.0.0.1:8443 (self-signed `ref.crt`/`ref.key`, generated, git-ignored). Chromium reaches them
  only through `--host-resolver-rules`; the visitor clicks a link, the browser sets the referrer.
- The test browser looks like a normal visitor: `--disable-blink-features=AutomationControlled`
  and a regular Chrome User-Agent (the site and the server ignore automation by design).

Run (Playwright from the npx cache, not a project dependency):

    node journeys.cjs <playwright> journeys.jsonl organic_multi ads_gclid_contact ...   # ≤5 per backend start (10 requests/h per IP)
    ./restart-backend.sh                                                              # resets in-memory rate limits
    python3 -I verify.py journeys.jsonl                                               # DB + manager API per journey
    node manager.cjs <playwright>                                                     # periods, filters, cards, XSS, access
    node manager-403.cjs <playwright>                                                 # 403 message per section, RU/KZ/EN
    node manager-periods.cjs <playwright>                                             # fast period/filter switches, late realtime re-reads (8.6F)
    node prod-readonly.cjs <playwright>                                               # production: open pages only, click nothing

Staff for the test DB are created with `mkstaff.py` (pty for `api create-staff`; password from
`staff.env`). All names, phones and emails are artificial (`*.example.test`).
