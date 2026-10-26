// A tariff's price changes while a visitor fills in the request form, on the isolated stack
// (artificial data, see e2e/lead-attribution/README.md):
//   Business shown at 99 000 ₸ → the administrator sets 109 000 ₸ → the open form is sent →
//   refused with old → new amount → the visitor confirms → saved at 109 000 ₸; earlier requests
//   keep their prices. The amount sent must be the one on screen. Then the same through the API
//   directly (stale, made-up, missing amounts, forged fields), and the form without a price
//   preview (/services/mobile-app-development).
// usage: node price-change-request.cjs <playwright> [screenshot-dir]   (needs admin.env next to
// this script; sends 9 artificial requests, ≤ 5 per IP and window: the API block restarts the
// test backend (restart-backend.sh next to this script, if any) to reset its limiter; sets Business to
// 99 000 ₸ and then 109 000 ₸ as new versions of the test database, switched off at the end)
const { chromium } = require(process.argv[2]);
const fs = require("fs");
const { execFileSync } = require("child_process");
const readEnv = (f) => Object.fromEntries(fs.readFileSync(__dirname + "/" + f, "utf8").trim().split("\n").map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
const admin = readEnv("admin.env");
const SHOTS = process.argv[3];
const SITE = "http://compnet.test:3006", API = "http://api.compnet.test:8096";
const RULES = "MAP compnet.test 127.0.0.1, MAP api.compnet.test 127.0.0.1";
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) process.exitCode = 1; };
const sql = (q) => execFileSync("docker", ["exec", "-i", "compnet-stage86c-db", "psql", "-q", "-U", "postgres", "-d", "compnet_e2e", "-At", "-F", "|"], { input: q, encoding: "utf8" }).trim();
const norm = (s) => (s ?? "").replace(/[  ]/g, " ").replace(/\s+/g, " ").trim();
const digits = (s) => Number((s.match(/(\d[\d\s  ]*\d|\d)\s*₸/) ?? ["", "0"])[1].replace(/\D/g, ""));
const tag = Math.random().toString(16).slice(2, 8);
const OLD = 99000, NEW = 109000;

async function context(b, width = 1366) {
  const ctx = await b.newContext({ userAgent: UA, locale: "ru-RU", viewport: { width, height: 900 } });
  const page = await ctx.newPage();
  const errors = []; page.on("pageerror", (e) => errors.push(e.message));
  return { ctx, page, errors };
}
const call = (page, method, path, body) => page.evaluate(async ([m, u, b]) => {
  const r = await fetch(u, { method: m, credentials: "include", headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined });
  return { status: r.status, body: await r.json().catch(() => null) };
}, [method, API + "/api/v1/manager" + path, body]);
async function fill(page, name) {
  const form = page.locator("form:has(#description)").first();
  await form.locator("#name").fill(name); await form.locator("#phone").fill("7000000001"); await form.locator("#email").fill("e2e-test@example.test");
  await form.locator("#description").fill("Price change E2E: искусственная заявка, не обрабатывать."); await form.locator("#consent").check();
  return form;
}
async function submit(page, form) {
  const answer = page.waitForResponse((r) => r.url().endsWith("/api/v1/project-requests") && r.request().method() === "POST");
  await form.locator('button[type="submit"]').click();
  const res = await answer;
  const body = await res.json().catch(() => null);
  await sleep(1200);
  return { status: res.status(), sent: JSON.parse(res.request().postData()).tariff, body };
}
const stored = (name) => sql(`SELECT coalesce(string_agg(t.final_price_tenge || '@v' || t.tariff_version, ','), '-') FROM project_requests r
  JOIN project_request_tariffs t ON t.project_request_id = r.id WHERE r.name = '${name}'`);

(async () => {
  const b = await chromium.launch({ args: [`--host-resolver-rules=${RULES}`, "--disable-blink-features=AutomationControlled"] });
  const { ctx: actx, page: ap } = await context(b);
  await ap.goto(SITE + "/manager/login"); await ap.locator("#manager-email").waitFor();
  await ap.locator("#manager-email").fill(admin.ADMIN_EMAIL); await ap.locator("#manager-password").fill(admin.ADMIN_PW);
  await ap.locator('form button[type="submit"]').click(); await ap.waitForURL((u) => !u.pathname.endsWith("/login"));
  const business = async () => (await call(ap, "GET", "/pricing")).body.data.tariffs.find((t) => t.slug === "business");
  const setPrice = async (price, reason) => {
    const cur = await business();
    if (cur.price_tenge === price) return 200;
    return (await call(ap, "POST", "/pricing/tariffs/business/price", { price_tenge: price, reason, expected_version: cur.version })).status;
  };

  // Setup: Business on at 99 000 ₸.
  await call(ap, "PATCH", "/pricing/tariffs/business", { is_active: true });
  ok((await setPrice(OLD, "E2E: исходная цена сценария")) === 200 && (await business()).price_tenge === OLD, "S0 setup: Business on at 99 000 ₸");
  const vOld = (await business()).version;
  const earlier = sql(`SELECT count(*) || ':' || coalesce(sum(final_price_tenge), 0) || ':' || coalesce(sum(tariff_version), 0) FROM project_request_tariffs WHERE tariff_slug = 'business'`);

  // S1: a request saved at 99 000 ₸ before the change (an "old" request).
  const nameA = `E2E старая ${tag}`;
  {
    const { ctx, page } = await context(b);
    await page.goto(SITE + "/contact?tariff=business"); await page.waitForLoadState("networkidle"); await sleep(2600);
    const r = await submit(page, await fill(page, nameA));
    ok(r.status === 201 && r.sent.expected_final_price_tenge === OLD && stored(nameA) === `${OLD}@v${vOld}`, `S1 request before the change: ${r.status}, stored ${stored(nameA)}`);
    await ctx.close();
  }

  // S2–S5: the visitor opens Business at 99 000 ₸, the price changes, the open form is sent.
  const nameB = `E2E смена цены ${tag}`;
  {
    const { ctx, page, errors } = await context(b);
    await page.goto(SITE + "/contact?tariff=business"); await page.waitForLoadState("networkidle"); await sleep(2600);
    const total = page.locator('[data-testid="tariff-total"]');
    const preview = page.locator("div.lg\\:sticky").first();
    const option = async () => norm(await page.locator("#tariff option:checked").textContent());
    const shown = digits(norm(await total.textContent()));
    ok(shown === OLD && digits(norm(await preview.textContent())) === OLD && (await option()).includes("99 000 ₸"),
      `S2 the visitor sees 99 000 ₸: field "${norm(await total.textContent())}", preview, option "${await option()}"`);
    const form = await fill(page, nameB);

    ok((await setPrice(NEW, "E2E: новая цена во время заполнения формы")) === 200 && (await business()).price_tenge === NEW, "S3 the administrator sets 109 000 ₸");
    const vNew = (await business()).version;
    ok(digits(norm(await total.textContent())) === OLD, "S3 the open form still shows 99 000 ₸ (nothing reloaded behind the visitor's back)");

    const first = await submit(page, form);
    const alert = page.locator('[data-testid="tariff-price-changed"]');
    await alert.waitFor();
    const aText = norm(await alert.textContent());
    const button = norm(await form.locator('button[type="submit"]').textContent());
    ok(first.sent.expected_final_price_tenge === shown, `S4 sent with the amount on screen: ${first.sent.expected_final_price_tenge} = ${shown} (not the new ${NEW})`);
    ok(first.status === 409 && first.body?.error?.code === "conflict" && /стоимость тарифа изменилась/.test(first.body?.error?.message ?? ""),
      `S4 server: ${first.status} ${first.body?.error?.code} "${first.body?.error?.message}"`);
    ok(/было 99 000 ₸, теперь 109 000 ₸/.test(aText) && /не отправлена/.test(aText) && button === "Подтвердить новую цену и отправить",
      `S4 the visitor sees: "${aText}" / button "${button}"`);
    await sleep(700);
    const seen = await alert.evaluate((el) => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= window.innerHeight && document.activeElement === el; });
    ok(seen, "S4 the notice is brought into view and focused (the visitor was at the button)");
    ok(digits(norm(await total.textContent())) === NEW && digits(norm(await preview.textContent())) === NEW && (await option()).includes("109 000 ₸"),
      `S4 every amount on the page is now 109 000 ₸ (field, preview, option "${await option()}")`);
    ok(stored(nameB) === "-", "S4 nothing stored for the refused request");
    if (SHOTS) await page.locator("form:has(#description)").first().screenshot({ path: `${SHOTS}/request-price-changed.png` });

    const second = await submit(page, form);
    const status = norm(await page.locator("[role=status]").first().textContent());
    ok(second.status === 201 && second.sent.expected_final_price_tenge === NEW && second.body.data.tariff.final_price_tenge === NEW && second.body.data.tariff.version === vNew,
      `S5 confirmed and sent again: ${second.status}, sent ${second.sent.expected_final_price_tenge}, saved ${second.body?.data?.tariff?.final_price_tenge} v${second.body?.data?.tariff?.version}`);
    ok(/Тариф «Бизнес»: 109 000 ₸/.test(status) && stored(nameB) === `${NEW}@v${vNew}` && errors.length === 0, `S5 "${status.slice(0, 70)}", stored ${stored(nameB)}, ${errors.length} browser errors`);
    if (SHOTS) await page.locator("section").filter({ has: page.locator("[role=status]") }).first().screenshot({ path: `${SHOTS}/request-confirmed.png` });
    await ctx.close();
  }

  // S6: earlier requests keep their prices.
  ok(stored(nameA) === `${OLD}@v${vOld}`, `S6 the request saved before the change keeps 99 000 ₸ (v${vOld}): ${stored(nameA)}`);
  const [n0, s0, v0] = earlier.split(":").map(Number);
  const now = sql(`SELECT count(*) || ':' || coalesce(sum(final_price_tenge), 0) || ':' || coalesce(sum(tariff_version), 0) FROM project_request_tariffs WHERE tariff_slug = 'business'
    AND project_request_id NOT IN (SELECT id FROM project_requests WHERE name LIKE 'E2E % ${tag}')`).split(":").map(Number);
  ok(now[0] === n0 && now[1] === s0 && now[2] === v0, `S6 all ${n0} earlier Business requests unchanged (sum ${s0})`);
  ok(sql(`SELECT count(*) FROM project_estimates e JOIN project_requests r ON r.id = e.project_request_id WHERE r.name = '${nameA}' AND e.minimum_tenge = ${OLD}`) === "1",
    "S6 its estimate keeps 99 000 ₸ too");

  // S7: the form without a price preview (mobile apps page): the amount is shown under the field and sent as shown.
  {
    const { ctx, page, errors } = await context(b, 375);
    await page.goto(SITE + "/services/mobile-app-development?tariff=business"); await page.waitForLoadState("networkidle"); await sleep(2600);
    const total = page.locator('[data-testid="tariff-total"]');
    await total.waitFor();
    const shown = digits(norm(await total.textContent()));
    const r = await submit(page, await fill(page, `E2E без превью ${tag}`));
    ok(shown === NEW && r.sent.expected_final_price_tenge === shown && r.status === 201 && errors.length === 0,
      `S7 page without the preview: shown ${shown}, sent ${r.sent.expected_final_price_tenge}, ${r.status}`);
    ok((await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 0, "S7 375 px: no horizontal scroll");
    await ctx.close();
  }

  // S8: straight to the API, around the form (after resetting the test backend's rate limiter).
  if (fs.existsSync(__dirname + "/restart-backend.sh")) execFileSync(__dirname + "/restart-backend.sh", { stdio: "ignore" });
  {
    const post = (tariff, extra = {}) => ap.evaluate(async ([u, body]) => {
      const r = await fetch(u, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      return { status: r.status, body: await r.json().catch(() => null) };
    }, [API + "/api/v1/project-requests", {
      name: `E2E API ${tag}`, phone: "7000000001", email: "e2e-test@example.test", company: "", project_type: "landing",
      description: "Price change E2E: прямой запрос к API.", budget_range: "", desired_timeline: "", contact_method: "phone", consent: true,
      calculator: { scale_tier_id: "", selected_module_ids: [], external_api_count: 0, multilingual: false, design_level_id: "", complexity_id: "", urgency_id: "" },
      meta: null, tariff, ...extra,
    }]);
    const base = { slug: "business", module_ids: [], external_api_count: 0 };
    const stale = await post({ ...base, expected_final_price_tenge: OLD });
    const lower = await post({ ...base, expected_final_price_tenge: 1 });
    const missing = await post(base);
    const modules = await post({ ...base, module_ids: ["crm-integration"], expected_final_price_tenge: NEW });
    ok(stale.status === 409 && lower.status === 409 && modules.status === 409,
      `S8 stale 99 000, made-up 1 ₸, modules not paid for: ${stale.status}, ${lower.status}, ${modules.status}`);
    ok(missing.status === 422 && missing.body?.error?.fields?.["tariff.expected_final_price_tenge"], `S8 no expected amount: ${missing.status}`);
    const forged = await post({ ...base, expected_final_price_tenge: NEW, final_price_tenge: 1, price_tenge: 1 },
      { price: 1, estimate: { minimum_tenge: 1, maximum_tenge: 1 }, final_price_tenge: 1 });
    ok(forged.status === 201 && forged.body.data.tariff.final_price_tenge === NEW && forged.body.data.estimate.minimum_tenge === NEW,
      `S8 forged amounts ignored: ${forged.status}, saved ${forged.body?.data?.tariff?.final_price_tenge}`);
    ok(stored(`E2E API ${tag}`) === `${NEW}@v${(await business()).version}`, `S8 only the honest request stored: ${stored(`E2E API ${tag}`)}`);
  }

  // Back to drafts.
  await call(ap, "PATCH", "/pricing/tariffs/business", { is_active: false });
  const after = await ap.evaluate(async (u) => (await (await fetch(u, { cache: "no-store" })).json()).data, `${API}/api/v1/tariffs`);
  ok(Array.isArray(after) && after.length === 0, "switched off again: nothing public");
  await actx.close();
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
