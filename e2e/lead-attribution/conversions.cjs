// Stage 8.6M: visitor → session → page view → request / chat → PostgreSQL → manager statistics.
// Isolated stack only (artificial data, *.example.test). usage: node conversions.cjs <playwright>
// Sends at most 5 requests (the per-IP limit of a fresh backend): restart-backend.sh first.
// Checks every conversion once in the database and the manager report's totals as before/after deltas.
const { chromium } = require(process.argv[2]);
const fs = require("fs");
const { execFileSync } = require("child_process");
const env = Object.fromEntries(fs.readFileSync(__dirname + "/staff.env", "utf8").trim().split("\n").map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
const SITE = "http://compnet.test:3006", API = "http://api.compnet.test:8096";
const RULES = "MAP compnet.test 127.0.0.1, MAP api.compnet.test 127.0.0.1, MAP www.google.com:443 127.0.0.1:8443";
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) process.exitCode = 1; };
const sql = (q) => execFileSync("docker", ["exec", "-i", "compnet-stage86c-db", "psql", "-q", "-U", "postgres", "-d", "compnet_e2e", "-At", "-F", "|"], { input: q, encoding: "utf8" }).trim();
const n = (q) => Number(sql(q));
const tag = Math.random().toString(16).slice(2, 8);
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Almaty" }).format(new Date());

async function visitor(b, { block } = {}) {
  const ctx = await b.newContext({ userAgent: UA, ignoreHTTPSErrors: true, locale: "ru-RU", viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  const log = { forms: [], errors: [] };
  if (block) await page.route("**/api/v1/analytics/events", (r) => r.abort("blockedbyclient"));
  page.on("request", (r) => { if (r.method() === "POST" && r.url().endsWith("/api/v1/project-requests")) log.forms.push(JSON.parse(r.postData() || "{}")); });
  page.on("pageerror", (e) => log.errors.push(e.message));
  return { ctx, page, log };
}
async function fromGoogle(page, path) {
  await page.goto(`https://www.google.com/?to=${encodeURIComponent(SITE + path)}`);
  await Promise.all([page.waitForURL(SITE + "/**"), page.click("#result")]);
  await page.waitForLoadState("networkidle");
}
async function consent(page, allow) {
  const b = page.getByRole("dialog").filter({ has: page.locator("#consent-title") });
  await b.waitFor({ timeout: 10000 }); await b.getByRole("button", { name: allow ? /Разрешить/ : /Только необходимые/ }).click(); await sleep(400);
}
async function fill(page, name) {
  await sleep(2600);
  const form = page.locator("form:has(#description)").first();
  await form.scrollIntoViewIfNeeded();
  await form.locator("#name").fill(name); await form.locator("#phone").fill("7000000001"); await form.locator("#email").fill("e2e-test@example.test");
  if (!(await form.locator("#projectType").inputValue())) await form.locator("#projectType").selectOption("Корпоративный сайт");
  await form.locator("#description").fill("Stage 8.6M E2E: искусственная заявка, не обрабатывать."); await form.locator("#consent").check();
  return form;
}
async function submit(page, name, { double = false } = {}) {
  const form = await fill(page, name);
  const button = form.locator('button[type="submit"]');
  const answer = page.waitForResponse((r) => r.url().endsWith("/api/v1/project-requests") && r.request().method() === "POST");
  if (double) await button.dblclick(); else await button.click();
  const status = (await answer).status();
  await sleep(2600);
  return status;
}
const flush = async (page) => { await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange"))); await sleep(800); };
const sessionOf = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("compnet-a-session") || "null")?.id ?? null);
const requests = (name) => n(`SELECT count(*) FROM project_requests WHERE name = '${name}'`);
const requestId = (name) => sql(`SELECT id FROM project_requests WHERE name = '${name}' LIMIT 1`);

(async () => {
  const b = await chromium.launch({ args: [`--host-resolver-rules=${RULES}`, "--disable-blink-features=AutomationControlled"] });
  // Manager API (same browser, cookie session).
  const mctx = await b.newContext({ userAgent: UA, locale: "ru-RU" });
  const mgr = await mctx.newPage();
  await mgr.goto(SITE + "/manager/login"); await mgr.locator("#manager-email").waitFor();
  await mgr.locator("#manager-email").fill(env.MGR_EMAIL); await mgr.locator("#manager-password").fill(env.MGR_PW);
  await mgr.locator('form button[type="submit"]').click(); await mgr.waitForURL((u) => !u.pathname.endsWith("/login"));
  const api = (path) => mgr.evaluate(async (u) => (await (await fetch(u, { credentials: "include" })).json()).data, API + path);
  const report = async () => (await api(`/api/v1/manager/analytics/report?from=${today}&to=${today}`)).totals;
  const leads = async () => (await api(`/api/v1/manager/analytics/leads?from=${today}&to=${today}`)).totals;
  const before = { report: await report(), leads: await leads() };

  // L1 + L2: one consented session from Google sends a request, reloads the thank-you page, then writes in chat.
  {
    const { ctx, page, log } = await visitor(b);
    await fromGoogle(page, "/services/website-development"); await consent(page, true);
    const name = `E2E-86M-L1-${tag}`;
    const status = await submit(page, name);
    const sid = await sessionOf(page);
    await page.reload(); await page.waitForLoadState("networkidle"); await page.reload(); await page.waitForLoadState("networkidle"); await sleep(1500);
    const id = requestId(name);
    ok(status === 201 && requests(name) === 1, `L1 request saved once (HTTP ${status}); reloading the page twice adds no request: ${requests(name)} row`);
    ok(n(`SELECT count(*) FROM analytics_events WHERE type='lead_submit' AND project_request_id='${id}' AND session_id='${sid}'`) === 1,
      "L1 request linked to the visitor's session exactly once");
    ok(sql(`SELECT channel || '/' || source FROM project_request_attribution WHERE project_request_id='${id}'`) === "organic_search/google", "L1 request source: organic_search/google");
    // L2: the same session starts a chat (widget API, same cookies); a retried first message counts once.
    // Ids made here: crypto.randomUUID is not available on the plain-http test origin.
    const ids = [require("crypto").randomUUID(), require("crypto").randomUUID()];
    const chat = await page.evaluate(async ([base, sid, first, second]) => {
      const post = (p, body) => fetch(base + "/api/v1/chat" + p, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.status);
      const s = await post("/session", { page_url: location.href });
      const m1 = await post("/messages", { client_message_id: first, body: "E2E 8.6M: вопрос", analytics_session_id: sid });
      const m2 = await post("/messages", { client_message_id: first, body: "E2E 8.6M: вопрос", analytics_session_id: sid });
      const m3 = await post("/messages", { client_message_id: second, body: "E2E 8.6M: второе", analytics_session_id: sid });
      return [s, m1, m2, m3];
    }, [API, sid, ...ids]);
    await flush(page); await sleep(500);
    ok(chat[1] === 201 && n(`SELECT count(*) FROM analytics_events WHERE type='chat_first_message' AND session_id='${sid}'`) === 1,
      `L2 chat in the same session: first message recorded once (HTTP ${chat.join("/")})`);
    ok(log.errors.length === 0, "L1/L2 no browser errors");
    await ctx.close();
  }

  // L3: "Necessary only" → the form still works; no session id, no source.
  {
    const { ctx, page, log } = await visitor(b);
    await fromGoogle(page, "/services/website-development"); await consent(page, false);
    const name = `E2E-86M-L3-${tag}`;
    const status = await submit(page, name);
    const id = requestId(name);
    ok(status === 201 && requests(name) === 1 && !log.forms[0].analytics_session_id && !log.forms[0].attribution,
      `L3 declined analytics: request saved (HTTP ${status}), sent without session id and source`);
    ok(n(`SELECT count(*) FROM project_request_attribution WHERE project_request_id='${id}'`) === 0 && n(`SELECT count(*) FROM analytics_events WHERE project_request_id='${id}'`) === 0,
      "L3 no source row and no conversion for the declined request");
    await ctx.close();
  }

  // L4: a double click on "Send" creates one request.
  {
    const { ctx, page } = await visitor(b);
    await fromGoogle(page, "/contact"); await consent(page, true);
    const name = `E2E-86M-L4-${tag}`;
    await submit(page, name, { double: true });
    ok(requests(name) === 1, `L4 double click on the submit button: ${requests(name)} request`);
    await ctx.close();
  }

  // L5: a blocker drops the visit batches; the request is still saved with its source, the conversion waits unlinked.
  {
    const { ctx, page } = await visitor(b, { block: true });
    await fromGoogle(page, "/services/website-development"); await consent(page, true);
    const name = `E2E-86M-L5-${tag}`;
    const status = await submit(page, name);
    const id = requestId(name);
    ok(status === 201 && sql(`SELECT channel FROM project_request_attribution WHERE project_request_id='${id}'`) === "organic_search",
      `L5 blocker: request saved (HTTP ${status}) with its source organic_search`);
    ok(n(`SELECT count(*) FROM analytics_events WHERE project_request_id='${id}'`) === 0 && n(`SELECT count(*) FROM analytics_pending_conversions WHERE project_request_id='${id}'`) === 1,
      "L5 no linked conversion (no session stored); one waiting row, removed after 24 h");
    await ctx.close();
  }

  // Report deltas for today: 4 requests (L1, L3, L4, L5); linked to a session: L1 and L4 (consented, not blocked).
  // Sessions stored: L1, L4 (none for the declined L3 and the blocked L5). Conversions: L1 request + L1 chat +
  // L4 request = 3, in 2 sessions — the L1 session counts once.
  await sleep(1500);
  const after = { report: await report(), leads: await leads() };
  const d = (k, o = "report") => after[o][k] - before[o][k];
  ok(d("requests") === 4 && d("linked_requests") === 2, `report: requests +${d("requests")} (want 4), linked to a session +${d("linked_requests")} (want 2: L1, L4)`);
  ok(d("sessions") === 2 && d("linked_requests") + d("linked_chats") === 3 && d("converted_sessions") === 2,
    `report: sessions +${d("sessions")} (want 2), conversions +${d("linked_requests") + d("linked_chats")} (want 3), converted sessions +${d("converted_sessions")} (want 2 — L1 has a request AND a chat, counted once)`);
  ok(d("new_chats") === 1 && d("linked_chats") === 1, `report: new chats +${d("new_chats")}, linked chats +${d("linked_chats")} (want 1/1)`);
  ok(d("requests", "leads") === 4 && d("tracked", "leads") === 3, `requests block: requests +${d("requests", "leads")} (want 4), with a known source +${d("tracked", "leads")} (want 3: L1, L4, L5 — not the declined L3)`);
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
