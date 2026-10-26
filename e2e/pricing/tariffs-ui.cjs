// Tariffs and the launch promotion end to end, on the isolated stack (artificial data,
// see e2e/lead-attribution/README.md): drafts unpublished → an administrator switches them on
// in /manager/pricing → /pricing, /calculator, the request form → stored terms → the manager's
// request card → everything switched off again.
// usage: node tariffs-ui.cjs <playwright>   (needs staff.env with a manager and admin.env with an
// administrator next to this script; sends two artificial requests — restart the test backend first)
const { chromium } = require(process.argv[2]);
const fs = require("fs");
const { execFileSync } = require("child_process");
const readEnv = (f) => Object.fromEntries(fs.readFileSync(__dirname + "/" + f, "utf8").trim().split("\n").map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
const staff = readEnv("staff.env"), admin = readEnv("admin.env");
const SITE = "http://compnet.test:3006", API = "http://api.compnet.test:8096";
const RULES = "MAP compnet.test 127.0.0.1, MAP api.compnet.test 127.0.0.1";
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) process.exitCode = 1; };
const sql = (q) => execFileSync("docker", ["exec", "-i", "compnet-stage86c-db", "psql", "-q", "-U", "postgres", "-d", "compnet_e2e", "-At", "-F", "|"], { input: q, encoding: "utf8" }).trim();
const norm = (s) => (s ?? "").replace(/[  ]/g, " ").replace(/\s+/g, " ");
const tag = Math.random().toString(16).slice(2, 8);
// datetime-local in Almaty (UTC+5).
const almatyLocal = (ms) => new Date(Date.now() + ms + 5 * 3600e3).toISOString().slice(0, 16);

async function context(b) {
  const ctx = await b.newContext({ userAgent: UA, locale: "ru-RU", viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  const errors = []; page.on("pageerror", (e) => errors.push(e.message));
  return { ctx, page, errors };
}
async function login(page, email, password) {
  await page.goto(SITE + "/manager/login"); await page.locator("#manager-email").waitFor();
  await page.locator("#manager-email").fill(email); await page.locator("#manager-password").fill(password);
  await page.locator('form button[type="submit"]').click(); await page.waitForURL((u) => !u.pathname.endsWith("/login"));
}
async function open(page, path) { await page.goto(SITE + path); await page.waitForLoadState("networkidle"); await sleep(400); }
async function sendForm(page, name) {
  await sleep(2600);
  const form = page.locator("form:has(#description)").first();
  await form.locator("#name").fill(name); await form.locator("#phone").fill("7000000001"); await form.locator("#email").fill("e2e-test@example.test");
  await form.locator("#description").fill("Tariffs E2E: искусственная заявка, не обрабатывать."); await form.locator("#consent").check();
  const answer = page.waitForResponse((r) => r.url().endsWith("/api/v1/project-requests") && r.request().method() === "POST");
  await form.locator('button[type="submit"]').click();
  const res = await answer; const body = await res.json(); await sleep(500);
  return { status: res.status(), body, text: norm(await page.locator("[role=status]").first().textContent()) };
}

(async () => {
  const b = await chromium.launch({ args: [`--host-resolver-rules=${RULES}`, "--disable-blink-features=AutomationControlled"] });

  // T1: drafts are not published anywhere.
  {
    const { ctx, page } = await context(b);
    await open(page, "/pricing");
    ok((await page.locator("#tariffs").count()) === 0, "T1 /pricing: no tariff section while the drafts are inactive");
    await open(page, "/calculator");
    ok((await page.getByRole("group", { name: "Способ расчёта" }).count()) === 0 && (await page.locator("#calc-project-type").count()) === 1,
      "T1 /calculator: only the individual calculator, no mode switch");
    await open(page, "/contact");
    ok((await page.locator("#tariff").count()) === 0 && (await page.locator("#projectType").count()) === 1, "T1 request form: no tariff field");
    await ctx.close();
  }

  // T2: a manager has no access; the administrator switches everything on in /manager/pricing.
  {
    const { ctx, page } = await context(b);
    await login(page, staff.MGR_EMAIL, staff.MGR_PW);
    await open(page, "/manager/analytics");
    ok((await page.locator('a[href="/manager/pricing"]').count()) === 0, "T2 manager: no 'Тарифы' link");
    await open(page, "/manager/pricing");
    ok(/только администратор/.test(norm(await page.locator("main").textContent())), "T2 manager opening /manager/pricing: refused");
    await ctx.close();
  }
  const { ctx: actx, page: adminPage, errors: adminErrors } = await context(b);
  await login(adminPage, admin.ADMIN_EMAIL, admin.ADMIN_PW);
  await open(adminPage, "/manager/analytics");
  ok((await adminPage.locator('a[href="/manager/pricing"]').count()) === 1, "T2 administrator: 'Тарифы' link shown");
  await open(adminPage, "/manager/pricing");
  const tariffCard = (slug) => adminPage.locator(`article[data-tariff="${slug}"]`);
  const promoCard = adminPage.locator('article[data-promotion="start-launch"]');
  // Switching the promotion on before the tariff and the cost: the server refuses with its reason.
  await promoCard.locator('input[type="datetime-local"]').nth(0).fill(almatyLocal(-3600e3));
  await promoCard.locator('input[type="datetime-local"]').nth(1).fill(almatyLocal(7 * 24 * 3600e3));
  await promoCard.getByRole("button", { name: "Включить" }).click(); await sleep(800);
  ok(/тариф/.test(norm(await promoCard.locator("[role=alert]").textContent())), `T2 promotion before its tariff is on: refused (${norm(await promoCard.locator("[role=alert]").textContent())})`);
  for (const slug of ["start", "business", "pro"]) {
    await tariffCard(slug).getByRole("button", { name: "Включить" }).click(); await sleep(700);
  }
  await tariffCard("start").locator("label", { hasText: "Себестоимость" }).locator("input").fill("30000");
  await tariffCard("start").getByRole("button", { name: "Сохранить себестоимость" }).click(); await sleep(800);
  const promo = adminPage.locator('article[data-promotion="start-launch"]');
  await promo.locator('input[type="datetime-local"]').nth(0).fill(almatyLocal(-3600e3));
  await promo.locator('input[type="datetime-local"]').nth(1).fill(almatyLocal(7 * 24 * 3600e3));
  await promo.getByRole("button", { name: "Включить" }).click(); await sleep(900);
  const live = sql(`SELECT p.is_active || '|' || t.is_active || '|' || (c.cost_tenge IS NOT NULL) FROM promotions p JOIN tariffs t ON t.id = p.tariff_id
    JOIN tariff_versions v ON v.tariff_id = t.id AND v.is_current LEFT JOIN tariff_version_costs c ON c.tariff_version_id = v.id WHERE p.slug = 'start-launch'`);
  ok(live === "true|true|true", `T2 administrator switched on the tariffs, set the cost and the promotion (${live})`);
  ok(Number(sql(`SELECT count(*) FROM pricing_audit_log WHERE created_at > now() - interval '5 minutes'`)) >= 5, "T2 changes written to the audit log");

  // T3: /pricing shows the tariffs; the promotional price only for Start.
  {
    const { ctx, page, errors } = await context(b);
    await open(page, "/pricing");
    const card = (slug) => page.locator(`#tariffs article[data-tariff="${slug}"]`);
    const start = norm(await card("start").textContent()), business = norm(await card("business").textContent()), pro = norm(await card("pro").textContent());
    ok(/49 000 ₸/.test(start) && /59 000 ₸/.test(start) && /Акция до/.test(start), "T3 Start: 49 000 ₸ instead of 59 000 ₸, 'Акция до …'");
    ok(/99 000 ₸/.test(business) && !/Акция/.test(business), "T3 Business: 99 000 ₸, no promotion");
    ok(/от 199 000 ₸/.test(pro), "T3 PRO: от 199 000 ₸");
    const title = await page.title();
    ok(!/49 000/.test(title) && !/49 000/.test((await page.locator('meta[name="description"]').getAttribute("content")) ?? ""), "T3 the promotional price is not in the page title or description");
    // A client-side navigation from a card keeps the choice (the route's parameters, not window.location).
    await Promise.all([page.waitForURL(/\/calculator\?tariff=business/), card("business").getByRole("link", { name: "Добавить модули" }).click()]);
    await page.waitForLoadState("networkidle"); await sleep(800);
    ok((await page.getByRole("button", { name: "Тарифы", exact: true }).getAttribute("aria-pressed")) === "true" &&
      (await page.locator('[data-testid="tariff-calculator"] button[aria-pressed="true"]').first().textContent()).includes("Бизнес"),
      "T3 'Добавить модули' on Business opens the tariff calculator on Business (client-side navigation)");
    ok(errors.length === 0, "T3 no browser errors");
    await ctx.close();
  }

  // T4: the tariff calculator (server quote), then the request form with the choice.
  let businessId, startId;
  {
    const { ctx, page, errors } = await context(b);
    await open(page, "/calculator?tariff=business");
    ok((await page.getByRole("button", { name: "Тарифы", exact: true }).getAttribute("aria-pressed")) === "true", "T4 /calculator?tariff=business opens the tariffs");
    await page.locator('[data-testid="tariff-calculator"] label', { hasText: "CRM" }).locator("input").check(); await sleep(900);
    const total = norm(await page.locator('[data-testid="tariff-total"]').textContent());
    const quote = JSON.parse(execFileSync("curl", ["-s", "http://127.0.0.1:8096/api/v1/tariffs/business/quote?modules=crm-integration"], { encoding: "utf8" })).data;
    ok(total === "249 000 ₸" && quote.final_price_tenge === 249000, `T4 Business + CRM integration = ${total} (server quote ${quote.final_price_tenge})`);
    await page.getByRole("button", { name: "Индивидуальный расчёт", exact: true }).click(); await sleep(300);
    ok(await page.locator("#calc-project-type").isVisible(), "T4 the individual calculator is still there");
    await page.getByRole("button", { name: "Тарифы", exact: true }).click(); await sleep(300);
    await Promise.all([page.waitForURL(/\/contact\?/), page.locator('[data-testid="tariff-quote"] a').click()]); await page.waitForLoadState("networkidle"); await sleep(800);
    ok((await page.locator("#tariff").inputValue()) === "business" && (await page.locator("#projectType").count()) === 0, "T4 request form: tariff Business preselected, project type replaced");
    ok(/249 000 ₸/.test(norm(await page.locator("div.lg\\:sticky").first().textContent())), "T4 form preview: 249 000 ₸ (server quote)");
    const sent = await sendForm(page, `E2E-TARIFF-B-${tag}`);
    businessId = sent.body.data?.id;
    ok(sent.status === 201 && sent.body.data.tariff.final_price_tenge === 249000 && /Тариф «Бизнес»: 249 000 ₸/.test(sent.text), `T4 request saved: ${sent.text}`);
    ok(errors.length === 0, "T4 no browser errors");
    await ctx.close();
  }
  {
    const { ctx, page } = await context(b);
    await open(page, "/contact?tariff=start");
    const sent = await sendForm(page, `E2E-TARIFF-S-${tag}`);
    startId = sent.body.data?.id;
    ok(sent.status === 201 && sent.body.data.tariff.promotion_applied && /49 000 ₸/.test(sent.text) && /по акции/.test(sent.text), `T5 Start on the promotion: ${sent.text}`);
    await ctx.close();
  }
  const rows = sql(`SELECT tariff_slug || ':' || final_price_tenge || ':' || (promotion_id IS NOT NULL) FROM project_request_tariffs WHERE project_request_id IN ('${businessId}', '${startId}') ORDER BY tariff_slug`);
  ok(rows === "business:249000:false\nstart:49000:true", `T5 stored terms: ${rows.replace("\n", ", ")}`);

  // T6: the manager's request card shows the terms and the place.
  {
    const { ctx, page, errors } = await context(b);
    await login(page, staff.MGR_EMAIL, staff.MGR_PW);
    await open(page, `/manager/requests?id=${startId}`); await sleep(1200);
    const terms = norm(await page.locator('[data-testid="tariff-terms"]').textContent());
    ok(/start/.test(terms) && /59 000 ₸/.test(terms) && /−10 000 ₸/.test(terms) && /49 000 ₸/.test(terms) && /место зарезервировано/.test(terms), `T6 manager card: ${terms.slice(0, 160)}`);
    ok(errors.length === 0, "T6 no browser errors");
    await ctx.close();
  }

  // T7: places in the admin view; then everything switched off again (the stack goes back to drafts).
  await open(adminPage, "/manager/pricing");
  const takenInDb = sql(`SELECT count(*) FROM promotion_reservations r JOIN promotions p ON p.id = r.promotion_id WHERE p.slug = 'start-launch' AND r.status <> 'released'`);
  ok(norm(await promo.locator('[data-testid="promotion-places"]').textContent()).includes(`Занято: ${takenInDb} из 10`), `T7 admin view: ${takenInDb} of 10 places taken, as in the database`);
  await promo.getByRole("button", { name: "Выключить" }).click(); await sleep(800);
  for (const slug of ["start", "business", "pro"]) {
    await tariffCard(slug).getByRole("button", { name: "Выключить" }).click(); await sleep(700);
  }
  const after = JSON.parse(execFileSync("curl", ["-s", "http://127.0.0.1:8096/api/v1/tariffs"], { encoding: "utf8" })).data;
  ok(after.length === 0, "T7 switched off: nothing public any more");
  ok(adminErrors.length === 0, "T7 admin page: no browser errors");
  await actx.close();
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
