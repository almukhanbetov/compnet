// Stage 8.7D: traffic sources — real browser visits by channel → API deltas → the manager's section.
// Isolated stack only (artificial data). usage: node sources-report.cjs <playwright> [screenshot-dir]
// Sends one request (restart-backend.sh first if the per-IP request limit was used up).
const { chromium } = require(process.argv[2]);
const fs = require("fs");
const { execFileSync } = require("child_process");
const env = Object.fromEntries(fs.readFileSync(__dirname + "/staff.env", "utf8").trim().split("\n").map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
const SITE = "http://compnet.test:3006", API = "http://api.compnet.test:8096";
const RULES = "MAP compnet.test 127.0.0.1, MAP api.compnet.test 127.0.0.1, MAP www.google.com:443 127.0.0.1:8443, MAP chatgpt.com:443 127.0.0.1:8443";
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36";
const SHOTS = process.argv[3];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) process.exitCode = 1; };
const sql = (q) => execFileSync("docker", ["exec", "-i", "compnet-stage86c-db", "psql", "-q", "-U", "postgres", "-d", "compnet_e2e", "-At", "-F", "|"], { input: q, encoding: "utf8" }).trim();
const tag = Math.random().toString(16).slice(2, 8);
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Almaty" }).format(new Date());
const addDays = (day, n) => { const d = new Date(day + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

async function visitor(b) {
  const ctx = await b.newContext({ userAgent: UA, ignoreHTTPSErrors: true, locale: "ru-RU", viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  const errors = []; page.on("pageerror", (e) => errors.push(e.message));
  return { ctx, page, errors };
}
async function from(page, host, path) {
  await page.goto(`https://${host}/?to=${encodeURIComponent(SITE + path)}`);
  await Promise.all([page.waitForURL(SITE + "/**"), page.click("#result")]); await page.waitForLoadState("networkidle");
}
async function typed(page, path) { await page.goto(SITE + path); await page.waitForLoadState("networkidle"); }
async function consent(page, allow) {
  const d = page.getByRole("dialog").filter({ has: page.locator("#consent-title") });
  await d.waitFor({ timeout: 10000 }); await d.getByRole("button", { name: allow ? /Разрешить/ : /Только необходимые/ }).click(); await sleep(400);
}
async function go(page, href) {
  const l = page.locator(`a[href="${href}"]:visible`).first(); await l.scrollIntoViewIfNeeded();
  await Promise.all([page.waitForURL(SITE + href), l.click()]); await sleep(600);
}
async function flush(page) { await sleep(2600); await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange"))); await sleep(900); }
const visitorId = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("compnet-a-visitor") || "null"));
const sessionsOf = (v) => sql(`SELECT source || '/' || medium FROM analytics_sessions WHERE visitor_id = '${v}' ORDER BY started_at`).split("\n").filter(Boolean);

(async () => {
  const b = await chromium.launch({ args: [`--host-resolver-rules=${RULES}`, "--disable-blink-features=AutomationControlled"] });
  const mctx = await b.newContext({ userAgent: UA, locale: "ru-RU", viewport: { width: 1440, height: 1000 } });
  const mgr = await mctx.newPage();
  const mErrors = []; mgr.on("pageerror", (e) => mErrors.push(e.message));
  await mgr.goto(SITE + "/manager/login"); await mgr.locator("#manager-email").waitFor();
  await mgr.locator("#manager-email").fill(env.MGR_EMAIL); await mgr.locator("#manager-password").fill(env.MGR_PW);
  await mgr.locator('form button[type="submit"]').click(); await mgr.waitForURL((u) => !u.pathname.endsWith("/login"));
  const sources = (f, t) => mgr.evaluate(async (u) => (await (await fetch(u, { credentials: "include" })).json()).data, `${API}/api/v1/manager/analytics/sources?from=${f}&to=${t}`);
  const flat = (r, list = "channels") => Object.fromEntries(r[list].map((c) => [c.key, [c.sessions, c.visitors, c.new_visitors, c.returning_visitors, c.converted_sessions]]).concat([["total", [r.totals.sessions, r.totals.visitors, r.totals.new_visitors, r.totals.returning_visitors, r.totals.converted_sessions]]]));
  const before = await sources(today, today);

  // V1: Google search, then two pages inside the site — one session.
  { const { ctx, page } = await visitor(b); await from(page, "www.google.com", "/"); await consent(page, true);
    await go(page, "/services"); await go(page, "/services/website-development"); await flush(page);
    const s = sessionsOf(await visitorId(page)); ok(s.length === 1 && s[0] === "google/organic", `V1 Google organic + 2 internal pages: one session ${s}`); await ctx.close(); }
  // V2: a Google Ads click (gclid, no UTM), a request, the page reloaded.
  { const { ctx, page } = await visitor(b);
    await from(page, "www.google.com", `/services/mobile-app-development?gclid=TESTGCLID-SECRET-87D-${tag}`); await consent(page, true); await sleep(2600);
    const form = page.locator("form:has(#description)").first(); await form.scrollIntoViewIfNeeded();
    await form.locator("#name").fill(`E2E-87D-${tag}`); await form.locator("#phone").fill("7000000001"); await form.locator("#email").fill("e2e-test@example.test");
    if (!(await form.locator("#projectType").inputValue())) await form.locator("#projectType").selectOption("Корпоративный сайт");
    await form.locator("#description").fill("Stage 8.7D E2E: искусственная заявка, не обрабатывать."); await form.locator("#consent").check();
    const answer = page.waitForResponse((r) => r.url().endsWith("/api/v1/project-requests") && r.request().method() === "POST");
    await form.locator('button[type="submit"]').click(); ok((await answer).status() === 201, "V2 request saved (HTTP 201)");
    await page.reload(); await page.waitForLoadState("networkidle"); await flush(page);
    const s = sessionsOf(await visitorId(page)); ok(s.length === 1 && s[0] === "google/cpc", `V2 Google Ads (gclid): one session after reload ${s}`); await ctx.close(); }
  // V3: ChatGPT with utm_source=chatgpt.com (no referrer).
  { const { ctx, page } = await visitor(b); await typed(page, "/services?utm_source=chatgpt.com"); await consent(page, true); await flush(page);
    const s = sessionsOf(await visitorId(page)); ok(s[0] === "chatgpt.com/(not set)", `V3 ChatGPT with UTM stored as ${s}`); await ctx.close(); }
  // V4: ChatGPT without UTM: only the referrer.
  { const { ctx, page } = await visitor(b); await from(page, "chatgpt.com", "/services/website-development"); await consent(page, true); await flush(page);
    const s = sessionsOf(await visitorId(page)); ok(s[0] === "chatgpt.com/referral", `V4 ChatGPT without UTM stored as ${s}`); await ctx.close(); }
  // V5: direct, then back from Google after 31 minutes — returning in the Google row.
  { const { ctx, page } = await visitor(b); await typed(page, "/"); await consent(page, true); await flush(page);
    await page.evaluate(() => { const s = JSON.parse(localStorage.getItem("compnet-a-session")); s.lastActivity -= 31 * 60 * 1000; localStorage.setItem("compnet-a-session", JSON.stringify(s)); });
    await from(page, "www.google.com", "/services"); await flush(page);
    const s = sessionsOf(await visitorId(page)); ok(s.join() === "(direct)/(none),google/organic", `V5 direct, then a return from Google: ${s}`); await ctx.close(); }
  // V6: "Necessary only" — counted nowhere.
  { const { ctx, page } = await visitor(b); await from(page, "www.google.com", "/services"); await consent(page, false); await go(page, "/contact"); await flush(page);
    ok((await visitorId(page)) === null, "V6 declined: no visitor id"); await ctx.close(); }
  await sleep(1500);

  const after = await sources(today, today);
  const fb = flat(before), fa = flat(after);
  const delta = (k) => fa[k].map((v, i) => v - fb[k][i]);
  // [sessions, visitors, new, returning, converted]
  const want = { google_organic: [2, 2, 1, 1, 0], google_cpc: [1, 1, 1, 0, 1], chatgpt: [2, 2, 2, 0, 0], direct: [1, 1, 1, 0, 0], social: [0, 0, 0, 0, 0], referral: [0, 0, 0, 0, 0], other: [0, 0, 0, 0, 0], total: [6, 5, 5, 0, 1] };
  const got = Object.fromEntries(Object.keys(want).map((k) => [k, delta(k)]));
  ok(Object.keys(want).every((k) => got[k].join() === want[k].join()), `session channels, deltas [sessions,visitors,new,returning,converted]: ${JSON.stringify(got)}`);
  const ffb = flat(before, "first_channels"), ffa = flat(after, "first_channels");
  const firstDelta = Object.fromEntries(["google_organic", "google_cpc", "chatgpt", "direct"].map((k) => [k, ffa[k][0] - ffb[k][0]]));
  ok(JSON.stringify(firstDelta) === JSON.stringify({ google_organic: 1, google_cpc: 1, chatgpt: 2, direct: 2 }), `by the visitor's first source, session deltas: ${JSON.stringify(firstDelta)} (V5's Google return counts as direct)`);
  const r = after;
  const sharesOk = r.channels.every((c) => c.share === (r.totals.sessions ? Math.round(c.sessions * 1000 / r.totals.sessions) / 10 : null)) &&
    r.channels.every((c) => c.conversion === (c.sessions ? Math.round(c.converted_sessions * 1000 / c.sessions) / 10 : null)) &&
    r.channels.reduce((n, c) => n + c.sessions, 0) === r.totals.sessions && r.channels.every((c) => c.new_visitors + c.returning_visitors === c.visitors);
  ok(sharesOk, "shares and conversions consistent; channels add up to the total; new + returning = visitors per channel");

  // The section on the dashboard.
  await mgr.goto(SITE + "/manager/analytics"); await mgr.waitForLoadState("networkidle");
  const section = mgr.locator('section[aria-labelledby="traffic-sources-title"]');
  const period = (name) => mgr.getByRole("group", { name: /Период/ }).getByRole("button", { name, exact: true });
  const tableRows = () => section.locator("table tbody tr[data-channel]").evaluateAll((rows) => rows.map((tr) => [tr.dataset.channel, ...[...tr.querySelectorAll("td")].slice(1, 6).map((td) => Number(td.textContent))]));
  await period("Сегодня").click(); await section.locator("table tbody tr").first().waitFor({ timeout: 15000 }); await sleep(1200);
  const shown = await tableRows();
  ok(shown.length === 7 && shown.every(([k, ...v]) => v.join() === fa[k].join()), `table "Сегодня" equals the API: ${shown.map(([k, s]) => `${k}=${s}`).join(" ")}`);
  await section.getByRole("button", { name: "Первый источник посетителя" }).click(); await sleep(300);
  const firstShown = await tableRows();
  ok(firstShown.every(([k, s]) => s === ffa[k][0]), `toggle "Первый источник посетителя" shows first-source sessions: ${firstShown.map(([k, s]) => `${k}=${s}`).join(" ")}`);
  await section.getByRole("button", { name: "Источник сессии" }).click();
  for (const name of ["30 дней", "Вчера", "Сегодня", "7 дней"]) await period(name).click();
  await sleep(2500);
  const d7 = flat(await sources(addDays(today, -6), today));
  const d7Shown = await tableRows();
  ok(d7Shown.every(([k, ...v]) => v.join() === d7[k].join()), "after quick period switches the section shows the last period (7 дней)");
  const text = await section.textContent();
  ok(!/e2e-test@example\.test|7000000001|E2E-87D|TESTGCLID|SECRET/.test(text), "section shows no contacts, names or click id values");
  if (SHOTS) await section.screenshot({ path: `${SHOTS}/sources-1440.png` });
  await mgr.setViewportSize({ width: 375, height: 800 }); await sleep(600);
  const overflow = await mgr.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  const cards = await section.locator("ul li[data-channel]:visible").count();
  ok(overflow <= 0 && cards === 7, `375 px: ${cards} channel cards, no horizontal page scroll (${overflow}px)`);
  if (SHOTS) await section.screenshot({ path: `${SHOTS}/sources-375.png` });
  ok(mErrors.length === 0, `manager page: no browser errors (${mErrors.length})`);
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
