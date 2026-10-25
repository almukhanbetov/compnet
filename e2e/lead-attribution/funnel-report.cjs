// Stage 8.7C: the conversion funnel — real browser visits → API deltas → the manager's block.
// Isolated stack only (artificial data). usage: node funnel-report.cjs <playwright> [screenshot-dir]
// Sends one request (restart-backend.sh first if the per-IP request limit was used up).
const { chromium } = require(process.argv[2]);
const fs = require("fs");
const env = Object.fromEntries(fs.readFileSync(__dirname + "/staff.env", "utf8").trim().split("\n").map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
const SITE = "http://compnet.test:3006", API = "http://api.compnet.test:8096";
const RULES = "MAP compnet.test 127.0.0.1, MAP api.compnet.test 127.0.0.1";
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36";
const SHOTS = process.argv[3];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) process.exitCode = 1; };
const tag = Math.random().toString(16).slice(2, 8);
const almaty = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Almaty" }).format(d);
const today = almaty();
const addDays = (day, n) => { const d = new Date(day + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

async function visitor(b) {
  const ctx = await b.newContext({ userAgent: UA, locale: "ru-RU", viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  const errors = []; page.on("pageerror", (e) => errors.push(e.message));
  return { ctx, page, errors };
}
async function open(page, path) { await page.goto(SITE + path); await page.waitForLoadState("networkidle"); }
async function consent(page, allow) {
  const d = page.getByRole("dialog").filter({ has: page.locator("#consent-title") });
  await d.waitFor({ timeout: 10000 }); await d.getByRole("button", { name: allow ? /Разрешить/ : /Только необходимые/ }).click(); await sleep(400);
}
async function flush(page) { await sleep(2600); await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange"))); await sleep(900); }
async function calculator(page) {
  const select = page.locator("#calc-project-type"); await select.scrollIntoViewIfNeeded();
  const values = await select.locator("option").evaluateAll((o) => o.map((x) => x.value).filter(Boolean));
  await select.selectOption(values[0]); await sleep(300);
}

(async () => {
  const b = await chromium.launch({ args: [`--host-resolver-rules=${RULES}`, "--disable-blink-features=AutomationControlled"] });
  // Manager session (cookies) for the API and the dashboard.
  const mctx = await b.newContext({ userAgent: UA, locale: "ru-RU", viewport: { width: 1440, height: 1000 } });
  const mgr = await mctx.newPage();
  const mErrors = []; mgr.on("pageerror", (e) => mErrors.push(e.message));
  await mgr.goto(SITE + "/manager/login"); await mgr.locator("#manager-email").waitFor();
  await mgr.locator("#manager-email").fill(env.MGR_EMAIL); await mgr.locator("#manager-password").fill(env.MGR_PW);
  await mgr.locator('form button[type="submit"]').click(); await mgr.waitForURL((u) => !u.pathname.endsWith("/login"));
  const funnel = (from, to) => mgr.evaluate(async (u) => (await (await fetch(u, { credentials: "include" })).json()).data, `${API}/api/v1/manager/analytics/funnel?from=${from}&to=${to}`);
  const counts = (f) => Object.fromEntries(f.steps.map((s) => [s.key, s.sessions]).concat([["converted", f.converted_sessions], ["outside", f.conversions_outside_funnel]]));
  const before = counts(await funnel(today, today));

  // V1: the home page only.
  { const { ctx, page } = await visitor(b); await open(page, "/"); await consent(page, true); await flush(page); await ctx.close(); }
  // V2: a service page.
  { const { ctx, page } = await visitor(b); await open(page, "/services/website-development"); await consent(page, true); await flush(page); await ctx.close(); }
  // V3: the calculator, used.
  { const { ctx, page } = await visitor(b); await open(page, "/calculator"); await consent(page, true); await calculator(page); await flush(page); await ctx.close(); }
  // V4: services → the header's link to the form → the form is started and sent.
  {
    const { ctx, page, errors } = await visitor(b);
    await open(page, "/services"); await consent(page, true);
    const link = page.locator('a[href="/contact"]:visible').first(); await link.scrollIntoViewIfNeeded();
    await Promise.all([page.waitForURL(SITE + "/contact"), link.click()]); await page.waitForLoadState("networkidle"); await sleep(2600);
    const form = page.locator("form:has(#description)").first(); await form.scrollIntoViewIfNeeded();
    await form.locator("#name").fill(`E2E-87C-${tag}`); await form.locator("#phone").fill("7000000001"); await form.locator("#email").fill("e2e-test@example.test");
    if (!(await form.locator("#projectType").inputValue())) await form.locator("#projectType").selectOption("Корпоративный сайт");
    await form.locator("#description").fill("Stage 8.7C E2E: искусственная заявка, не обрабатывать."); await form.locator("#consent").check();
    const answer = page.waitForResponse((r) => r.url().endsWith("/api/v1/project-requests") && r.request().method() === "POST");
    await form.locator('button[type="submit"]').click();
    ok((await answer).status() === 201, "V4 request saved (HTTP 201)");
    await flush(page); ok(errors.length === 0, "V4 no browser errors"); await ctx.close();
  }
  // V5: "Necessary only" — counted nowhere.
  { const { ctx, page } = await visitor(b); await open(page, "/calculator"); await consent(page, false); await calculator(page); await flush(page); await ctx.close(); }
  await sleep(1500);

  const after = counts(await funnel(today, today));
  const d = Object.fromEntries(Object.keys(after).map((k) => [k, after[k] - before[k]]));
  const want = { visit: 4, interest: 3, start: 2, intent: 1, conversion: 1, converted: 1, outside: 0 };
  ok(Object.entries(want).every(([k, v]) => d[k] === v), `funnel deltas for today ${JSON.stringify(d)} (want ${JSON.stringify(want)})`);
  const f = await funnel(today, today);
  const monotonic = f.steps.every((s, i) => i === 0 || s.sessions <= f.steps[i - 1].sessions);
  const math = f.steps.every((s, i) => i === 0 ? s.of_previous === null && s.lost === 0 : s.lost === f.steps[i - 1].sessions - s.sessions);
  ok(monotonic && math, `each step ≤ the previous one, lost = previous − current: ${f.steps.map((s) => `${s.key}=${s.sessions}`).join(" ")}`);

  // The block on the dashboard: today's figures, then quick period switches end on the last one.
  await mgr.goto(SITE + "/manager/analytics"); await mgr.waitForLoadState("networkidle");
  const block = mgr.locator('section[aria-labelledby="funnel-title"]');
  const shownCounts = async () => {
    await block.locator("li[data-step]").first().waitFor({ timeout: 15000 });
    return block.locator("li[data-step]").evaluateAll((rows) => rows.map((r) => [r.dataset.step, Number((r.textContent.match(/Сессий: (\d+)/) || [])[1])]));
  };
  const period = (name) => mgr.getByRole("group", { name: /Период/ }).getByRole("button", { name, exact: true });
  await period("Сегодня").click(); await sleep(1500);
  const todayShown = await shownCounts();
  ok(todayShown.length === 5 && todayShown.every(([k, n], i) => k === f.steps[i].key && n === f.steps[i].sessions), `block "Сегодня" equals the API: ${todayShown.map(([k, n]) => `${k}=${n}`).join(" ")}`);
  for (const name of ["30 дней", "Вчера", "Сегодня", "7 дней"]) await period(name).click();
  await sleep(2500);
  const d7 = await funnel(addDays(today, -6), today);
  const d7Shown = await shownCounts();
  ok(d7Shown.every(([k, n], i) => k === d7.steps[i].key && n === d7.steps[i].sessions), `after quick switches the block shows the last period (7 дней): ${d7Shown.map(([k, n]) => `${k}=${n}`).join(" ")}`);
  const text = await block.textContent();
  ok(/от посещений/.test(text) && /Не дошли/.test(text) && /Сессий с обращением за период/.test(text), "block shows shares, drop-offs and inquiries outside the funnel");
  ok(!/e2e-test@example\.test|7000000001|E2E-87C/.test(text), "block shows no contacts or names");
  if (SHOTS) await block.screenshot({ path: `${SHOTS}/funnel-1440.png` });
  await mgr.setViewportSize({ width: 375, height: 800 }); await sleep(600);
  const overflow = await mgr.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok(overflow <= 0, `375 px wide: no horizontal page scroll (${overflow}px)`);
  if (SHOTS) await block.screenshot({ path: `${SHOTS}/funnel-375.png` });
  ok(mErrors.length === 0, `manager page: no browser errors (${mErrors.length})`);
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
