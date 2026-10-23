// Stage 8.6C: manager pages and the leads API on the isolated local stack.
// usage: node manager.cjs <playwright>   (credentials read from staff.env; never printed)
const { chromium } = require(process.argv[2]);
const fs = require("fs");
const env = Object.fromEntries(fs.readFileSync(__dirname + "/staff.env", "utf8").trim().split("\n").map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
const SITE = "http://compnet.test:3006", API = "http://api.compnet.test:8096";
const RULES = "MAP compnet.test 127.0.0.1, MAP api.compnet.test 127.0.0.1";
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36";
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) process.exitCode = 1; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Almaty" }).format(new Date());
const addDays = (d, n) => { const t = new Date(d + "T00:00:00Z"); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };

(async () => {
  const browser = await chromium.launch({ args: [`--host-resolver-rules=${RULES}`] });
  async function staff(email) {
    const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 1440, height: 1000 }, locale: "ru-RU" });
    const page = await ctx.newPage(); const errors = [];
    page.on("pageerror", (e) => errors.push(e.message)); page.errors = errors;
    await page.goto(SITE + "/manager/login"); await page.locator("#manager-email").waitFor();
    await page.locator("#manager-email").fill(email);
    await page.locator("#manager-password").fill(env.MGR_PW);
    await page.locator('form button[type="submit"]').click();
    await page.waitForURL((u) => !u.pathname.endsWith("/login"), { timeout: 8000 }).catch(() => {});
    return { ctx, page };
  }
  // API calls go through the browser itself (same cookies, CORS and host mapping as the manager UI).
  const raw = (page, path) => page.evaluate(async (url) => { const r = await fetch(url, { credentials: "include" }); return { status: r.status, text: await r.text() }; }, API + path);
  const api = async (page, path) => { const r = await raw(page, path); return { status: r.status, body: r.status === 200 ? JSON.parse(r.text).data : r.text }; };

  // ---- anonymous API
  const anon = await browser.newContext({ userAgent: UA });
  const anonPage = await anon.newPage(); await anonPage.goto(SITE + "/");
  for (const p of ["/api/v1/manager/analytics/leads?from=2026-10-01&to=2026-10-23", "/api/v1/manager/project-requests", "/api/v1/manager/analytics/report?from=2026-10-01&to=2026-10-23"]) {
    const r = await raw(anonPage, p);
    ok(r.status === 401 && !/postgres|panic|sql|stack/i.test(r.text), `anonymous ${p.split("?")[0]} → ${r.status} ${r.text.slice(0, 60)}`);
  }
  await anon.close();

  // ---- manager
  const { ctx, page } = await staff(env.MGR_EMAIL);
  await page.goto(SITE + "/manager/analytics");
  const leadsSection = page.locator('section[aria-labelledby="leads-title"]');
  await leadsSection.waitFor();
  const cardValue = async (label) => {
    const el = leadsSection.locator(`text="${label}"`).first();
    const box = el.locator("xpath=ancestor::div[1]");
    const txt = (await box.innerText()).replace(/\s+/g, " ");
    const m = txt.replace(label, "").match(/\d+/); return m ? Number(m[0]) : null;
  };
  const periods = [["Сегодня", today, today], ["7 дней", addDays(today, -6), today], ["30 дней", addDays(today, -29), today]];
  const totals = {};
  for (const [label, from, to] of periods) {
    await page.getByRole("group", { name: /Период|period/i }).getByRole("button", { name: label, exact: true }).click();
    await sleep(1200);
    const a = await api(page, `/api/v1/manager/analytics/leads?from=${from}&to=${to}`);
    const ui = { total: await cardValue("Всего заявок"), google: await cardValue("Google, органический поиск"), paid: await cardValue("Реклама: поиск и соцсети"), social: await cardValue("Соцсети, включая рекламу"), fresh: await cardValue("Новые") };
    const t = a.body.totals; totals[label] = t.requests;
    ok(ui.total === t.requests && ui.google === t.google_organic && ui.paid === t.paid && ui.social === t.social && ui.fresh === t.new,
      `period ${label} (${from}..${to}): UI ${JSON.stringify(ui)} = API {total:${t.requests}, google:${t.google_organic}, paid:${t.paid}, social:${t.social}, new:${t.new}}, tracked ${t.tracked}`);
    const chSum = a.body.channels.reduce((s, c) => s + c.count, 0), ptSum = a.body.project_types.reduce((s, c) => s + c.count, 0), daySum = a.body.days.reduce((s, c) => s + c.count, 0);
    ok(chSum === t.requests && ptSum === t.requests && daySum === t.requests, `period ${label}: channels ${chSum}, project types ${ptSum}, days ${daySum} each = total ${t.requests} (no double counting)`);
    if (label === "Сегодня") {
      console.log("      channels today:", JSON.stringify(a.body.channels), "| conversion:", JSON.stringify(a.body.conversion));
      console.log("      service pages:", JSON.stringify(a.body.service_pages), "| project types:", JSON.stringify(a.body.project_types));
    }
  }
  ok(totals["Сегодня"] <= totals["7 дней"] && totals["7 дней"] <= totals["30 дней"], `today ${totals["Сегодня"]} ≤ 7 days ${totals["7 дней"]} ≤ 30 days ${totals["30 дней"]}`);
  // Almaty day boundary: 18:59:59Z belongs to the 22nd, 19:00:00Z to the 23rd.
  const d22 = await api(page, "/api/v1/manager/analytics/leads?from=2026-10-22&to=2026-10-22");
  const d23 = await api(page, "/api/v1/manager/analytics/leads?from=2026-10-23&to=2026-10-23");
  const both = await api(page, "/api/v1/manager/analytics/leads?from=2026-10-22&to=2026-10-23");
  ok(d22.body.totals.requests === 1 && both.body.totals.requests === d22.body.totals.requests + d23.body.totals.requests,
    `Asia/Almaty days: 22 Oct ${d22.body.totals.requests} (the 18:59:59Z request), 23 Oct ${d23.body.totals.requests}, both ${both.body.totals.requests}`);
  // Custom period with no requests.
  await page.locator('input[type="date"]').nth(0).fill("2026-09-01");
  await page.locator('input[type="date"]').nth(1).fill("2026-09-05");
  await page.getByRole("button", { name: "Показать" }).click(); await sleep(1200);
  ok(await leadsSection.getByText("Нет заявок за период").first().isVisible() || (await cardValue("Всего заявок")) === 0, "custom period 1–5 Sep: no requests shown");
  // Channel filter.
  await page.getByRole("group", { name: /Период|period/i }).getByRole("button", { name: "30 дней", exact: true }).click(); await sleep(1200);
  await leadsSection.locator("select").first().selectOption("paid_search"); await sleep(1200);
  const fPaid = await api(page, `/api/v1/manager/analytics/leads?from=${addDays(today, -29)}&to=${today}&channel=paid_search`);
  ok((await cardValue("Всего заявок")) === fPaid.body.totals.requests && fPaid.body.conversion?.available !== true,
    `channel filter paid_search: UI total ${await cardValue("Всего заявок")} = API ${fPaid.body.totals.requests}; conversion with filter: ${JSON.stringify(fPaid.body.conversion)}`);
  ok(await leadsSection.getByText(/реклама в соцсетях входит и в «Реклама», и в «Соцсети»/).isVisible(), "overlap of the source cards is explained under them");
  await page.screenshot({ path: __dirname + "/manager-analytics.png", fullPage: true });
  for (const w of [375, 1440]) {
    await page.setViewportSize({ width: w, height: 900 }); await sleep(500);
    ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `statistics page at ${w}px: no horizontal scroll`);
    await leadsSection.screenshot({ path: `${__dirname}/manager-leads-${w}.png` });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  // API failure is shown, stale figures hidden.
  await page.route("**/api/v1/manager/analytics/leads**", (r) => r.fulfill({ status: 500, contentType: "application/json", body: '{"error":{"message":"internal"}}' }));
  await page.getByRole("group", { name: /Период|period/i }).getByRole("button", { name: "Вчера", exact: true }).click(); await sleep(1200);
  ok(await leadsSection.getByText(/Не удалось загрузить заявки/).isVisible() && !(await leadsSection.getByText("Всего заявок").isVisible().catch(() => false)),
    "leads API 500: failure message shown, previous figures hidden");
  await page.unroute("**/api/v1/manager/analytics/leads**");

  // Request cards.
  await page.goto(SITE + "/manager/requests"); await page.getByText(/^E2E-86C-/).first().waitFor();
  for (const [label, needles] of [["E2E-86C-ads_gclid_contact-", ["Платный поиск", "mobile_apps_almaty", "/services/mobile-app-development", "/contact", "Google Ads"]],
                                   ["E2E-86C-organic_multi-", ["google", "/services/website-development", "/services"]],
                                   ["E2E-86C-consent_declined-", []]]) {
    await page.getByText(new RegExp("^" + label)).first().click(); await sleep(1200);
    const src = page.locator('section[aria-labelledby="rq-source"]');
    const txt = (await src.count()) ? (await src.innerText()).replace(/\s+/g, " ") : "";
    if (needles.length) ok(needles.every((n) => txt.includes(n)) && !/SECRET|gclid=/.test(txt), `card ${label}: ${txt.slice(0, 230)}`);
    else ok(!/Платный поиск|google/i.test(txt), `card ${label} (no consent): source block "${txt.slice(0, 120)}"`);
    await page.keyboard.press("Escape"); await sleep(400);
  }
  await page.getByText(/^E2E-86C-xss/).first().click(); await sleep(1500);
  const xssTxt = await page.locator('section[aria-labelledby="rq-source"]').innerText();
  ok(await page.evaluate(() => window.__xss === undefined) && (await page.locator('section[aria-labelledby="rq-source"] img, section[aria-labelledby="rq-source"] script, section[aria-labelledby="rq-source"] b').count()) === 0,
    `XSS card: markup shown as text, not executed: ${xssTxt.replace(/\s+/g, " ").slice(0, 200)}`);
  await page.screenshot({ path: __dirname + "/manager-request-xss.png" });
  ok(page.errors.length === 0, "manager pages: no browser errors " + page.errors.join("; "));
  await ctx.close();

  // ---- staff role without statistics rights
  const an = await staff(env.ANALYST_EMAIL);
  const r1 = await raw(an.page, `/api/v1/manager/analytics/leads?from=${today}&to=${today}`);
  const r2 = await raw(an.page, "/api/v1/manager/project-requests");
  ok([401, 403].includes(r1.status) && [401, 403].includes(r2.status), `role without rights is refused (cannot sign in → 401; a session whose role lost rights → 403, covered by TestLeads_AccessControl): leads ${r1.status}, requests ${r2.status}`);
  console.log("      role without rights after login:", an.page.url().replace(SITE, ""), "|", (await an.page.locator("main").innerText()).replace(/\s+/g, " ").slice(0, 160));
  await an.page.goto(SITE + "/manager/analytics"); await sleep(2000);
  const body = (await an.page.locator("main").innerText()).replace(/\s+/g, " ");
  ok(!/Всего заявок \d/.test(body), `role without rights sees no figures: "${body.slice(0, 140)}"`);
  await an.ctx.close();
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
