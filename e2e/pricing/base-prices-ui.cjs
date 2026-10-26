// Base prices of the project types ("Управление ценами" → "Базовые цены услуг") end to end, on
// the isolated stack (artificial data, see e2e/lead-attribution/README.md): access, preview =
// the calculator, confirmation, history, the same price at once on /pricing, the service page,
// the calculator and new requests, two administrators at once, a price changed while a visitor
// fills in the form, the API directly, SEO texts with the base (not a promotional) price, 375 px.
// Landing's price is changed and restored at the end (new versions of the test database); the
// tariffs and the launch promotion are switched on for the SEO check and off again.
// usage: node base-prices-ui.cjs <playwright> [screenshot-dir]   (needs staff.env and admin.env
// next to this script; sends ≤ 8 artificial requests; restarts the test backend before the API
// block when restart-backend.sh is next to it)
const { chromium } = require(process.argv[2]);
const fs = require("fs");
const { execFileSync } = require("child_process");
const readEnv = (f) => Object.fromEntries(fs.readFileSync(__dirname + "/" + f, "utf8").trim().split("\n").map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
const staff = readEnv("staff.env"), admin = readEnv("admin.env");
const SHOTS = process.argv[3];
const SITE = "http://compnet.test:3006", API = "http://api.compnet.test:8096";
const RULES = "MAP compnet.test 127.0.0.1, MAP api.compnet.test 127.0.0.1";
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) process.exitCode = 1; };
const sql = (q) => execFileSync("docker", ["exec", "-i", "compnet-stage86c-db", "psql", "-q", "-U", "postgres", "-d", "compnet_e2e", "-At", "-F", "|"], { input: q, encoding: "utf8" }).trim();
const norm = (s) => (s ?? "").replace(/[  ]/g, " ").replace(/\s+/g, " ").trim();
const money = (n) => `${n.toLocaleString("ru-RU")} ₸`.replace(/[  ]/g, " ");
const tag = Math.random().toString(16).slice(2, 8);
const shot = async (target, name) => { if (SHOTS) await target.screenshot({ path: `${SHOTS}/${name}.png` }); };

async function context(b, width = 1366) {
  const ctx = await b.newContext({ userAgent: UA, locale: "ru-RU", viewport: { width, height: 900 } });
  const page = await ctx.newPage();
  const errors = []; page.on("pageerror", (e) => errors.push(e.message));
  return { ctx, page, errors };
}
async function login(page, email, password) {
  await page.goto(SITE + "/manager/login"); await page.locator("#manager-email").waitFor();
  await page.locator("#manager-email").fill(email); await page.locator("#manager-password").fill(password);
  await page.locator('form button[type="submit"]').click(); await page.waitForURL((u) => !u.pathname.endsWith("/login"));
}
async function open(page, path) { await page.goto(SITE + path); await page.waitForLoadState("networkidle"); await sleep(500); }
const call = (page, method, path, body) => page.evaluate(async ([m, u, b]) => {
  const r = await fetch(u, { method: m, credentials: "include", cache: "no-store", headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined });
  return { status: r.status, body: await r.json().catch(() => null) };
}, [method, API + "/api/v1/manager" + path, body]);
const publicGet = (page, path) => page.evaluate(async (u) => (await (await fetch(u, { cache: "no-store" })).json()).data, API + path);
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const stored = (name) => sql(`SELECT coalesce(string_agg(coalesce((e.breakdown->>'base_price_tenge'), '-') || '@v' || coalesce(p.version::text, '0'), ','), '-')
  FROM project_requests r JOIN project_estimates e ON e.project_request_id = r.id LEFT JOIN project_type_prices p ON p.id = e.base_price_version_id WHERE r.name = '${name}'`);
async function fillForm(page, name, type) {
  const form = page.locator("form:has(#description)").first();
  if (type) await form.locator("#projectType").selectOption(type);
  await form.locator("#name").fill(name); await form.locator("#phone").fill("7000000001"); await form.locator("#email").fill("e2e-test@example.test");
  await form.locator("#description").fill("Base prices E2E: искусственная заявка, не обрабатывать."); await form.locator("#consent").check();
  return form;
}
async function submit(page, form) {
  const answer = page.waitForResponse((r) => r.url().endsWith("/api/v1/project-requests") && r.request().method() === "POST");
  await form.locator('button[type="submit"]').click();
  const res = await answer;
  await sleep(1200);
  return { status: res.status(), sent: JSON.parse(res.request().postData()), body: await res.json().catch(() => null) };
}

(async () => {
  const b = await chromium.launch({ args: [`--host-resolver-rules=${RULES}`, "--disable-blink-features=AutomationControlled"] });

  // B1: managers cannot change base prices, in the page or straight through the API.
  {
    const { ctx, page } = await context(b);
    await login(page, staff.MGR_EMAIL, staff.MGR_PW);
    await open(page, "/manager/pricing#prices");
    ok(/только администратор/.test(norm(await page.locator("main").textContent())) && (await page.locator('[data-testid="base-prices"]').count()) === 0,
      "B1 manager opening /manager/pricing#prices: refused");
    const r = [
      await call(page, "GET", "/pricing/base-prices"),
      await call(page, "POST", "/pricing/base-prices/landing/preview", { price_tenge: 1000 }),
      await call(page, "POST", "/pricing/base-prices/landing", { price_tenge: 1000, reason: "Попытка менеджера", expected_version: 1 }),
      await call(page, "GET", "/pricing/base-prices/landing/history"),
    ];
    ok(r.every((x) => x.status === 403), `B1 manager API calls: ${r.map((x) => x.status).join(", ")} (all 403)`);
    await ctx.close();
  }

  const { ctx: actx, page: ap, errors: adminErrors } = await context(b);
  await login(ap, admin.ADMIN_EMAIL, admin.ADMIN_PW);
  const landing = async () => (await call(ap, "GET", "/pricing/base-prices")).body.data.find((x) => x.project_type === "landing");
  const l0 = await landing();
  const original = l0.price_tenge;

  // B2: every project type of the catalog, with price, status, version, date and author.
  await open(ap, "/manager/pricing");
  await ap.getByRole("tab", { name: "Управление ценами" }).click();
  const section = ap.locator('[data-testid="base-prices"]');
  await section.locator('article[data-base-price="landing"]').waitFor();
  const card = (type) => section.locator(`article[data-base-price="${type}"]`);
  const lText = norm(await card("landing").textContent());
  const otherText = norm(await card("other").textContent());
  ok((await section.locator("article[data-base-price]").count()) === 12 && lText.includes(`от ${money(original)}`) && lText.includes("в калькуляторе") &&
    lText.includes(`Версия${l0.version}`) && /Изменена\d{1,2} \S+ \d{4}/.test(lText),
    `B2 12 project types; Лендинг: ${lText.slice(0, 120)}`);
  ok(otherText.includes("индивидуальный расчёт") && (await card("other").getByRole("button", { name: "Изменить цену" }).count()) === 0,
    "B2 «Другое»: individual estimate only, not editable");
  await shot(section, "base-prices-desktop");

  // B3: change Landing — the server's calculation on every scale tier, save only after it, confirmation.
  const newPrice = original + 10000;
  const c = card("landing");
  await c.getByRole("button", { name: "Изменить цену" }).click();
  const save = c.getByRole("button", { name: "Сохранить цену…" });
  await c.locator('input[name="base-price"]').fill(String(newPrice));
  await c.locator('textarea[name="base-reason"]').fill("E2E: проверка базовой цены");
  ok(await save.isDisabled(), "B3 'Сохранить цену' disabled before the check");
  const res = ap.waitForResponse((r) => r.url().endsWith("/base-prices/landing/preview"));
  await c.getByRole("button", { name: "Проверить расчёт" }).click();
  const server = (await (await res).json()).data;
  const panel = c.locator('[data-testid="base-preview"]');
  await panel.waitFor();
  const pText = norm(await panel.textContent());
  const s = server.rows.find((r) => r.tier_id === "site-s");
  ok(server.rows.length === 4 && pText.includes(`${money(s.current.minimum_tenge)} – ${money(s.current.maximum_tenge)}`) &&
    pText.includes(`${money(s.proposed.minimum_tenge)} – ${money(s.proposed.maximum_tenge)}`) && pText.includes("индивидуально"),
    `B3 preview = server, 4 scale tiers: до 5 страниц ${money(s.current.minimum_tenge)} → ${money(s.proposed.minimum_tenge)}`);
  await c.locator('input[name="base-price"]').fill(String(newPrice + 1));
  ok(await save.isDisabled() && /проверьте расчёт ещё раз/.test(norm(await panel.textContent())), "B3 input changed after the check: save disabled");
  await c.locator('input[name="base-price"]').fill(String(newPrice));
  await c.getByRole("button", { name: "Проверить расчёт" }).click(); await sleep(500);
  await shot(c, "base-preview-desktop");
  await save.click();
  const dialog = ap.getByRole("dialog");
  await dialog.waitFor();
  const dText = norm(await dialog.textContent());
  ok(dText.includes(`от ${money(original)} → от ${money(newPrice)}`) && dText.includes(`версия ${l0.version + 1}`) && dText.includes("страница цен"),
    `B3 confirmation: ${dText.slice(0, 120)}`);
  await shot(dialog, "base-confirm-desktop");
  await ap.keyboard.press("Escape");
  ok((await dialog.count()) === 0 && (await landing()).version === l0.version, "B3 Escape: nothing saved");
  await save.click();
  const changed = ap.waitForResponse((r) => r.url().endsWith("/base-prices/landing") && r.request().method() === "POST");
  await ap.getByRole("button", { name: "Подтвердить изменение" }).click();
  ok((await changed).status() === 200, "B3 confirmed: saved");
  await sleep(800);
  const l1 = await landing();
  ok(l1.version === l0.version + 1 && l1.price_tenge === newPrice && l1.reason === "E2E: проверка базовой цены" && l1.author !== "",
    `B3 version ${l1.version}: ${money(l1.price_tenge)} by ${l1.author}`);
  const c1 = card("landing");
  await c1.locator('[data-testid="base-history"] summary').click(); await sleep(400);
  const hText = norm(await c1.locator('[data-testid="base-history"]').textContent());
  ok(hText.includes(`${money(original)} → ${money(newPrice)}`) && hText.includes("E2E: проверка базовой цены") && hText.includes("текущая"), `B3 history: ${hText.slice(0, 140)}`);
  ok(sql(`SELECT count(*) FROM pricing_audit_log WHERE entity = 'base_price' AND details->>'project_type' = 'landing' AND details->>'reason' = 'E2E: проверка базовой цены'
          AND (details->>'previous_price_tenge')::bigint = ${original} AND (details->>'version')::int = ${l1.version} AND staff_user_id IS NOT NULL`) === "1",
    "B3 audit log: author, old price, reason");
  await shot(c1, "base-history-desktop");

  // B4: the same price at once everywhere: catalog, /pricing, the service page, the calculator.
  {
    const cat = await publicGet(ap, "/api/v1/pricing/catalog");
    const t = cat.project_types.find((x) => x.id === "landing");
    const cards = await publicGet(ap, "/api/v1/pricing");
    ok(t.base_price_tenge === newPrice && t.base_price_version === l1.version && cards.find((x) => x.project_type === "landing").price_from_tenge === newPrice,
      `B4 API: catalog ${money(t.base_price_tenge)} v${t.base_price_version}, pricing cards ${money(newPrice)}`);
    const { ctx, page, errors } = await context(b);
    await open(page, "/pricing");
    const pricingText = norm(await page.locator("main").textContent());
    await open(page, "/services/website-development");
    const serviceText = norm(await page.locator("main").textContent());
    await open(page, "/calculator");
    const calc = page.locator("section:has(#calc-project-type)");
    await page.locator("#calc-project-type").selectOption({ label: "Лендинг" }); await sleep(800);
    const calcText = norm(await calc.textContent());
    ok(pricingText.includes(money(newPrice)) && !pricingText.includes(`от ${money(original)}`), `B4 /pricing shows ${money(newPrice)}`);
    ok(serviceText.includes(money(newPrice)), `B4 /services/website-development shows ${money(newPrice)}`);
    ok(calcText.includes(money(s.proposed.minimum_tenge)) && calcText.includes(money(s.proposed.maximum_tenge)),
      `B4 calculator (Лендинг, defaults) = server: ${money(s.proposed.minimum_tenge)} – ${money(s.proposed.maximum_tenge)}`);
    ok(errors.length === 0, `B4 no browser errors (${errors.length})`);
    await ctx.close();
  }

  // B5: two administrators — the second saves over a stale version and is told to reload.
  {
    const { ctx, page } = await context(b);
    await login(page, admin.ADMIN_EMAIL, admin.ADMIN_PW);
    await open(page, "/manager/pricing#prices");
    const c2 = page.locator('[data-testid="base-prices"] article[data-base-price="landing"]');
    await c2.waitFor();
    await c2.getByRole("button", { name: "Изменить цену" }).click();
    await c2.locator('input[name="base-price"]').fill(String(newPrice + 5000));
    await c2.locator('textarea[name="base-reason"]').fill("E2E: второй администратор");
    await c2.getByRole("button", { name: "Проверить расчёт" }).click();
    await c2.locator('[data-testid="base-preview"]').waitFor();
    const first = await call(ap, "POST", "/pricing/base-prices/landing", { price_tenge: newPrice + 20000, reason: "E2E: первый администратор", expected_version: l1.version });
    await c2.getByRole("button", { name: "Сохранить цену…" }).click();
    const r = page.waitForResponse((x) => x.url().endsWith("/base-prices/landing") && x.request().method() === "POST");
    await page.getByRole("button", { name: "Подтвердить изменение" }).click();
    const status = (await r).status();
    await sleep(900);
    const t2 = norm(await page.locator('[data-testid="base-prices"] article[data-base-price="landing"]').textContent());
    ok(first.status === 200 && status === 409 && t2.includes("Цену уже изменил другой администратор") && t2.includes(money(newPrice + 20000)),
      `B5 concurrent change: first ${first.status}, second ${status}; the card reloaded with ${money(newPrice + 20000)}`);
    ok((await landing()).version === l1.version + 1, "B5 only one new version");
    await ctx.close();
  }
  const l2 = await landing();

  // B6: a visitor fills in the form while the base price changes: refused with old → new, confirmed, saved.
  const nameA = `E2E база старая ${tag}`, nameB = `E2E база смена ${tag}`;
  {
    const { ctx, page } = await context(b);
    await open(page, "/contact"); await sleep(2200);
    let r = await submit(page, await fillForm(page, nameA, "Лендинг"));
    ok(r.status === 201 && r.sent.expected_base_price_tenge === l2.price_tenge && stored(nameA) === `${l2.price_tenge}@v${l2.version}`,
      `B6 request before the change: ${r.status}, sent ${r.sent.expected_base_price_tenge}, stored ${stored(nameA)}`);
    await ctx.close();
  }
  {
    const { ctx, page, errors } = await context(b);
    await open(page, "/contact"); await sleep(2200);
    const form = await fillForm(page, nameB, "Лендинг");
    const preview = page.locator("div.lg\\:sticky").first();
    await sleep(500);
    const shownText = norm(await preview.textContent());
    ok(shownText.includes(`от ${money(l2.price_tenge)}`), `B6 the visitor sees от ${money(l2.price_tenge)}`);
    const changedPrice = l2.price_tenge + 10000;
    const ch = await call(ap, "POST", "/pricing/base-prices/landing", { price_tenge: changedPrice, reason: "E2E: изменение во время заполнения формы", expected_version: l2.version });
    ok(ch.status === 200 && norm(await preview.textContent()).includes(`от ${money(l2.price_tenge)}`), "B6 the administrator changes it; the open form still shows the old price");
    const first = await submit(page, form);
    const notice = page.locator('[data-testid="price-changed"]');
    await notice.waitFor(); await sleep(700);
    const nText = norm(await notice.textContent());
    const button = norm(await form.locator('button[type="submit"]').textContent());
    const seen = await notice.evaluate((el) => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= window.innerHeight && document.activeElement === el; });
    ok(first.status === 409 && first.sent.expected_base_price_tenge === l2.price_tenge, `B6 sent with the price on screen (${first.sent.expected_base_price_tenge}): ${first.status}`);
    ok(nText.includes(`было от ${money(l2.price_tenge)}, теперь от ${money(changedPrice)}`) && button === "Подтвердить новую цену и отправить" && seen,
      `B6 the visitor sees: "${nText.slice(0, 110)}" / "${button}", in view and focused`);
    ok(norm(await preview.textContent()).includes(`от ${money(changedPrice)}`) && stored(nameB) === "-", "B6 the preview shows the new price; nothing stored");
    if (SHOTS) await page.locator("section:has(form)").first().screenshot({ path: `${SHOTS}/base-request-changed.png` });
    const second = await submit(page, form);
    ok(second.status === 201 && second.sent.expected_base_price_tenge === changedPrice && stored(nameB) === `${changedPrice}@v${l2.version + 1}` && errors.length === 0,
      `B6 confirmed: ${second.status}, sent ${second.sent.expected_base_price_tenge}, stored ${stored(nameB)}`);
    ok(stored(nameA) === `${l2.price_tenge}@v${l2.version}`, `B6 the earlier request keeps ${money(l2.price_tenge)} (v${l2.version})`);
    await ctx.close();
  }

  // B7: a page without the price preview sends no price (none was shown) and is priced as in force.
  {
    const { ctx, page } = await context(b, 375);
    await open(page, "/services/mobile-app-development"); await sleep(2200);
    const r = await submit(page, await fillForm(page, `E2E без превью ${tag}`, null));
    ok(r.status === 201 && r.sent.expected_base_price_tenge === undefined && (await overflow(page)) <= 0, `B7 no preview: ${r.status}, nothing sent as shown price`);
    await ctx.close();
  }

  // B8: straight to the API (after resetting the test backend's rate limiter).
  if (fs.existsSync(__dirname + "/restart-backend.sh")) execFileSync(__dirname + "/restart-backend.sh", { stdio: "ignore" });
  {
    const cur = await landing();
    const post = (extra) => ap.evaluate(async ([u, body]) => {
      const r = await fetch(u, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      return { status: r.status, body: await r.json().catch(() => null) };
    }, [API + "/api/v1/project-requests", {
      name: `E2E API база ${tag}`, phone: "7000000001", email: "e2e-test@example.test", company: "", project_type: "landing",
      description: "Base prices E2E: прямой запрос к API.", budget_range: "", desired_timeline: "", contact_method: "phone", consent: true,
      calculator: { scale_tier_id: "site-s", selected_module_ids: [], external_api_count: 0, multilingual: false, design_level_id: "basic", complexity_id: "standard", urgency_id: "normal", base_price_tenge: 1 },
      meta: null, ...extra,
    }]);
    const stale = await post({ expected_base_price_tenge: original });
    const lower = await post({ expected_base_price_tenge: 1000 });
    const zero = await post({ expected_base_price_tenge: 0 });
    const old = await post({});
    ok(stale.status === 409 && lower.status === 409 && zero.status === 422, `B8 stale, made-up, zero: ${stale.status}, ${lower.status}, ${zero.status}`);
    ok(old.status === 201 && old.body.data.estimate.minimum_tenge === Math.round(cur.price_tenge / 10000) * 10000,
      `B8 an older client (no price sent; forged base ignored): ${old.status}, ${money(old.body?.data?.estimate?.minimum_tenge ?? 0)}`);
  }

  // B9: SEO texts carry the base price, never the promotional tariff price.
  {
    for (const slug of ["start", "business", "pro"]) await call(ap, "PATCH", `/pricing/tariffs/${slug}`, { is_active: true });
    await call(ap, "PUT", "/pricing/tariffs/start/cost", { cost_tenge: 30000 });
    const now = Date.now();
    await call(ap, "PATCH", "/pricing/promotions/start-launch", { starts_at: new Date(now - 3600e3).toISOString(), ends_at: new Date(now + 7 * 864e5).toISOString(), is_active: true });
    const tariffs = await publicGet(ap, "/api/v1/tariffs");
    const promo = tariffs.find((x) => x.slug === "start")?.promotion?.price_tenge;
    const cards = await publicGet(ap, "/api/v1/pricing");
    const websiteTypes = new Set(["landing", "business-card", "corporate", "catalog", "online-store"]);
    const minWebsite = Math.min(...cards.filter((x) => websiteTypes.has(x.project_type) && x.price_from_tenge !== null).map((x) => x.price_from_tenge));
    const bases = (await call(ap, "GET", "/pricing/base-prices")).body.data;
    const minBase = Math.min(...bases.filter((x) => websiteTypes.has(x.project_type)).map((x) => x.price_tenge));
    ok(promo && minWebsite === minBase && minWebsite !== promo,
      `B9 the "from" price the website page's SEO texts use (/api/v1/pricing) = the minimum base price ${money(minBase)}, not the promotional ${money(promo ?? 0)}`);
    const { ctx, page } = await context(b);
    const metas = [];
    for (const path of ["/pricing", "/services/website-development", "/calculator", "/"]) {
      await page.goto(SITE + path); await page.waitForLoadState("domcontentloaded");
      metas.push(norm(await page.title()) + " " + norm(await page.locator('meta[name="description"]').getAttribute("content")));
    }
    ok(metas.every((m) => !m.includes(money(promo)) && !m.includes("49 000")), "B9 page titles and descriptions: no promotional price");
    await ctx.close();
    await call(ap, "PATCH", "/pricing/promotions/start-launch", { is_active: false, clear_dates: true });
    for (const slug of ["start", "business", "pro"]) await call(ap, "PATCH", `/pricing/tariffs/${slug}`, { is_active: false });
  }

  // B10: 375 px — the section, the preview, the dialog and the history fit.
  {
    const { ctx, page, errors } = await context(b, 375);
    await login(page, admin.ADMIN_EMAIL, admin.ADMIN_PW);
    await open(page, "/manager/pricing#prices");
    const m = page.locator('[data-testid="base-prices"] article[data-base-price="corporate"]');
    await m.waitFor();
    await m.scrollIntoViewIfNeeded();
    ok((await overflow(page)) <= 0, `B10 375 px: no horizontal scroll (${await overflow(page)} px)`);
    const cur = (await call(page, "GET", "/pricing/base-prices")).body.data.find((x) => x.project_type === "corporate");
    await m.getByRole("button", { name: "Изменить цену" }).click();
    await m.locator('input[name="base-price"]').fill(String(cur.price_tenge + 20000));
    await m.locator('textarea[name="base-reason"]').fill("E2E: мобильный экран");
    await m.getByRole("button", { name: "Проверить расчёт" }).click();
    await m.locator('[data-testid="base-preview"]').waitFor();
    ok((await overflow(page)) <= 0, `B10 375 px preview: no horizontal scroll (${await overflow(page)} px)`);
    await shot(m, "base-preview-mobile");
    await m.getByRole("button", { name: "Сохранить цену…" }).click();
    const d = page.getByRole("dialog"); await d.waitFor();
    const box = await d.boundingBox();
    ok(box && box.x >= 0 && box.x + box.width <= 375, `B10 375 px dialog fits (${Math.round(box.x)}–${Math.round(box.x + box.width)} px)`);
    await shot(page, "base-confirm-mobile");
    await d.getByRole("button", { name: "Отмена" }).click();
    const l = page.locator('[data-testid="base-prices"] article[data-base-price="landing"]');
    await l.locator('[data-testid="base-history"] summary').click(); await sleep(400);
    ok((await overflow(page)) <= 0, "B10 375 px history: no horizontal scroll");
    await shot(l, "base-history-mobile");
    ok(errors.length === 0 && (await call(page, "GET", "/pricing/base-prices")).body.data.find((x) => x.project_type === "corporate").version === cur.version,
      `B10 nothing saved, ${errors.length} browser errors`);
    await ctx.close();
  }

  // B11: the public API exposes no internal fields; the admin page had no errors.
  {
    const raw = await ap.evaluate(async (u) => (await fetch(u, { cache: "no-store" })).text(), `${API}/api/v1/pricing/catalog`);
    ok(!/cost|margin|reason|author/.test(raw), "B11 public catalog: no cost, margin, reason or author");
    ok(adminErrors.length === 0, `B11 admin page: ${adminErrors.length} browser errors`);
  }

  // Landing back to its original price (a new version) for the next runs.
  const end = await landing();
  if (end.price_tenge !== original) {
    const r = await call(ap, "POST", "/pricing/base-prices/landing", { price_tenge: original, reason: "Стенд: возврат исходной цены после E2E", expected_version: end.version });
    ok(r.status === 200, `restored Лендинг to ${money(original)}`);
  }
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
