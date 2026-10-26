// "Управление ценами" (/manager/pricing#prices) end to end, on the isolated stack (artificial
// data, see e2e/lead-attribution/README.md): access, preview, confirmation and history, two
// administrators at once, a price changed while a visitor fills in the form, promotion rules,
// the API unavailable, and the 375 px layout. The tariffs and the promotion are switched on for
// the run and off again at the end; prices are taken from the API, so the run can be repeated.
// usage: node price-management-ui.cjs <playwright> [screenshot-dir]   (needs staff.env and
// admin.env next to this script; sends artificial requests — restart the test backend first)
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
const norm = (s) => (s ?? "").replace(/[\u00a0\u202f]/g, " ").replace(/\s+/g, " ");
const money = (n) => `${n.toLocaleString("ru-RU")} ₸`.replace(/[\u00a0\u202f]/g, " ");
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
async function open(page, path) { await page.goto(SITE + path); await page.waitForLoadState("networkidle"); await sleep(400); }
// A manager API call from a signed-in page (its session cookie).
const call = (page, method, path, body) => page.evaluate(async ([m, u, b]) => {
  const r = await fetch(u, { method: m, credentials: "include", headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined });
  return { status: r.status, body: await r.json().catch(() => null) };
}, [method, API + "/api/v1/manager" + path, body]);
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

(async () => {
  const b = await chromium.launch({ args: [`--host-resolver-rules=${RULES}`, "--disable-blink-features=AutomationControlled"] });

  // P1: a manager cannot change prices, in the page or straight through the API.
  {
    const { ctx, page } = await context(b);
    await login(page, staff.MGR_EMAIL, staff.MGR_PW);
    await open(page, "/manager/pricing#prices");
    ok(/только администратор/.test(norm(await page.locator("main").textContent())) && (await page.getByRole("tab").count()) === 0,
      "P1 manager opening /manager/pricing#prices: refused, no tabs");
    const r = [
      await call(page, "POST", "/pricing/tariffs/business/price", { price_tenge: 1000, reason: "Попытка менеджера", expected_version: 1 }),
      await call(page, "POST", "/pricing/tariffs/business/price/preview", { price_tenge: 1000, module_ids: [], external_api_count: 0 }),
      await call(page, "GET", "/pricing/tariffs/business/history"),
      await call(page, "POST", "/pricing/tariffs/business/versions", { price_tenge: 1000 }),
      await call(page, "PUT", "/pricing/tariffs/business/cost", { cost_tenge: 1 }),
    ];
    ok(r.every((x) => x.status === 403), `P1 manager API calls: ${r.map((x) => x.status).join(", ")} (all 403)`);
    await ctx.close();
  }

  const { ctx: actx, page: ap, errors: adminErrors } = await context(b);
  await login(ap, admin.ADMIN_EMAIL, admin.ADMIN_PW);
  // For the run: Start and Business on, Start's cost, the promotion live for two weeks.
  const before = (await call(ap, "GET", "/pricing")).body.data;
  const startT = () => before.tariffs.find((t) => t.slug === "start");
  for (const slug of ["start", "business"]) await call(ap, "PATCH", `/pricing/tariffs/${slug}`, { is_active: true });
  const startCost = Math.max(1000, Math.round(startT().price_tenge / 2));
  await call(ap, "PUT", "/pricing/tariffs/start/cost", { cost_tenge: startCost });
  const now = Date.now();
  const promoOn = await call(ap, "PATCH", "/pricing/promotions/start-launch", {
    starts_at: new Date(now - 3600e3).toISOString(), ends_at: new Date(now + 14 * 864e5).toISOString(), is_active: true,
  });
  ok(promoOn.status === 200, `P2 setup: tariffs and the promotion on (${promoOn.status})`);
  const business = () => call(ap, "GET", "/pricing").then((r) => r.body.data.tariffs.find((t) => t.slug === "business"));
  const b0 = await business();
  const oldRequests = sql(`SELECT count(*) || ':' || coalesce(sum(final_price_tenge), 0) FROM project_request_tariffs WHERE tariff_slug = 'business'`);

  // P2: the tab — every tariff with its price, status, version, date and author.
  await open(ap, "/manager/pricing");
  await ap.getByRole("tab", { name: "Управление ценами" }).click();
  await ap.locator('article[data-price-tariff="business"]').waitFor();
  ok(ap.url().endsWith("#prices"), "P2 the tab is kept in the address (#prices)");
  const card = (slug) => ap.locator(`article[data-price-tariff="${slug}"]`);
  const cards = await ap.locator("article[data-price-tariff]").count();
  const bText = norm(await card("business").textContent());
  ok(cards === 3 && bText.includes(money(b0.price_tenge)) && bText.includes("Включён") && bText.includes(`Версия${b0.version}`) &&
    /Изменена\d{1,2} \S+ \d{4}/.test(bText) && /Автор(начальная версия|\S)/.test(bText),
    `P2 tariff cards: ${cards}; Business: ${bText.slice(0, 150)}`);
  ok(/Цены дополнительных модулей/.test(norm(await ap.locator("main").textContent())), "P2 module prices shown for reference (server catalog)");
  await shot(ap.locator("main"), "prices-tab-desktop");

  // P3: change Business's price — preview first (server's numbers), save only after it, with confirmation.
  const newPrice = b0.price_tenge + 10000;
  const c = card("business");
  await c.getByRole("button", { name: "Изменить цену" }).click();
  const save = c.getByRole("button", { name: "Сохранить цену…" });
  await c.locator('input[name="price"]').fill(String(newPrice));
  await c.locator('textarea[name="reason"]').fill("E2E: проверка изменения цены");
  await c.locator("label", { hasText: "CRM" }).locator('input[type="checkbox"]').check();
  ok(await save.isDisabled(), "P3 'Сохранить цену' disabled before the calculation is checked");
  const previewRes = ap.waitForResponse((r) => r.url().includes("/price/preview"));
  await c.getByRole("button", { name: "Проверить расчёт" }).click();
  const server = (await (await previewRes).json()).data;
  const panel = c.locator('[data-testid="price-preview"]');
  await panel.waitFor();
  const pText = norm(await panel.textContent());
  const quoteNow = await ap.evaluate(async (u) => (await (await fetch(u)).json()).data.final_price_tenge, `${API}/api/v1/tariffs/business/quote?modules=crm-integration`);
  ok(server.current.final_price_tenge === quoteNow && server.proposed.final_price_tenge === quoteNow + 10000 &&
    pText.includes(money(server.current.final_price_tenge)) && pText.includes(money(server.proposed.final_price_tenge)),
    `P3 preview = server: ${money(server.current.final_price_tenge)} → ${money(server.proposed.final_price_tenge)} (public quote now ${money(quoteNow)})`);
  ok(await save.isEnabled(), "P3 'Сохранить цену' enabled after a successful check");
  await shot(c, "prices-preview-desktop");
  // Changing an input makes the check stale.
  await c.locator('input[name="price"]').fill(String(newPrice + 1));
  ok(await save.isDisabled() && /проверьте расчёт ещё раз/.test(norm(await panel.textContent())), "P3 an input changed after the check: save disabled, check again");
  await c.locator('input[name="price"]').fill(String(newPrice));
  await c.getByRole("button", { name: "Проверить расчёт" }).click();
  await sleep(500);
  await save.click();
  const dialog = ap.getByRole("dialog");
  await dialog.waitFor();
  const dText = norm(await dialog.textContent());
  ok(dText.includes(`${money(b0.price_tenge)} → ${money(newPrice)}`) && dText.includes(`версия ${b0.version + 1}`) && dText.includes("сохранят свою цену"),
    `P3 confirmation: ${dText.slice(0, 140)}`);
  await shot(dialog, "prices-confirm-desktop");
  await ap.keyboard.press("Escape");
  ok((await dialog.count()) === 0 && (await business()).version === b0.version, "P3 Escape: nothing saved");
  await save.click();
  const changed = ap.waitForResponse((r) => r.url().endsWith("/tariffs/business/price") && r.request().method() === "POST");
  await ap.getByRole("button", { name: "Подтвердить изменение" }).click();
  ok((await changed).status() === 200, "P3 confirmed: saved");
  await sleep(800);
  const b1 = await business();
  ok(b1.version === b0.version + 1 && b1.price_tenge === newPrice && b1.change_reason === "E2E: проверка изменения цены",
    `P3 new version ${b1.version}: ${money(b1.price_tenge)}`);
  ok(norm(await c.textContent()).includes(`Цена сохранена: версия ${b1.version}`) && norm(await c.locator('[data-testid="current-price"]').textContent()).includes(money(newPrice)),
    "P3 the card shows the new price and the saved version");
  await c.locator('[data-testid="price-history"] summary').click();
  await sleep(300);
  const hText = norm(await c.locator('[data-testid="price-history"]').textContent());
  ok(hText.includes(`${money(b0.price_tenge)} → ${money(newPrice)}`) && hText.includes("E2E: проверка изменения цены") && hText.includes("текущая") &&
    /Заявок с этой ценой: \d+/.test(hText), `P3 history: ${hText.slice(0, 200)}`);
  ok(sql(`SELECT count(*) FROM pricing_audit_log WHERE entity = 'tariff_version' AND details->>'tariff' = 'business'
          AND details->>'reason' = 'E2E: проверка изменения цены' AND (details->>'previous_price_tenge')::bigint = ${b0.price_tenge} AND staff_user_id IS NOT NULL`) === "1",
    "P3 audit log: author, old price, reason");
  ok(sql(`SELECT count(*) || ':' || coalesce(sum(final_price_tenge), 0) FROM project_request_tariffs WHERE tariff_slug = 'business'`) === oldRequests,
    `P3 earlier Business requests unchanged (${oldRequests})`);
  await shot(c, "prices-history-desktop");

  // P4: two administrators — the second one saves over a stale version and is told to reload.
  {
    const { ctx, page } = await context(b);
    await login(page, admin.ADMIN_EMAIL, admin.ADMIN_PW);
    await open(page, "/manager/pricing#prices");
    const c2 = page.locator('article[data-price-tariff="business"]');
    await c2.waitFor();
    await c2.getByRole("button", { name: "Изменить цену" }).click();
    await c2.locator('input[name="price"]').fill(String(newPrice + 5000));
    await c2.locator('textarea[name="reason"]').fill("E2E: второй администратор");
    await c2.getByRole("button", { name: "Проверить расчёт" }).click();
    await c2.locator('[data-testid="price-preview"]').waitFor();
    // Meanwhile the first one changes it.
    const first = await call(ap, "POST", "/pricing/tariffs/business/price", { price_tenge: newPrice + 20000, reason: "E2E: первый администратор", expected_version: b1.version });
    await c2.getByRole("button", { name: "Сохранить цену…" }).click();
    const res = page.waitForResponse((r) => r.url().endsWith("/tariffs/business/price"));
    await page.getByRole("button", { name: "Подтвердить изменение" }).click();
    const status = (await res).status();
    await sleep(800);
    const t2 = norm(await c2.textContent());
    ok(first.status === 200 && status === 409 && t2.includes("Цену уже изменил другой администратор") && t2.includes(money(newPrice + 20000)),
      `P4 concurrent change: first ${first.status}, second ${status}; the card reloaded with ${money(newPrice + 20000)}`);
    ok((await business()).version === b1.version + 1, "P4 only one new version");
    await ctx.close();
  }
  const b2 = await business();

  // P5: a visitor fills in the form while the price changes: refused with the new amount, then saved at it.
  {
    const { ctx, page, errors } = await context(b);
    await open(page, "/contact?tariff=business");
    const previewBox = page.locator("div.lg\\:sticky").first();
    await sleep(1200);
    ok(norm(await previewBox.textContent()).includes(money(b2.price_tenge)), `P5 form preview: ${money(b2.price_tenge)}`);
    const changedPrice = b2.price_tenge + 10000;
    const r = await call(ap, "POST", "/pricing/tariffs/business/price", { price_tenge: changedPrice, reason: "E2E: изменение во время заполнения формы", expected_version: b2.version });
    ok(r.status === 200, `P5 the administrator changes the price meanwhile (${r.status})`);
    await sleep(2600);
    const form = page.locator("form:has(#description)").first();
    await form.locator("#name").fill("E2E цена " + Math.random().toString(16).slice(2, 6)); await form.locator("#phone").fill("7000000001");
    await form.locator("#email").fill("e2e-test@example.test");
    await form.locator("#description").fill("Price management E2E: искусственная заявка, не обрабатывать."); await form.locator("#consent").check();
    let answer = page.waitForResponse((x) => x.url().endsWith("/api/v1/project-requests") && x.request().method() === "POST");
    await form.locator('button[type="submit"]').click();
    const first = await answer;
    const sent = JSON.parse(first.request().postData()).tariff;
    await sleep(1200);
    const alert = norm(await page.locator("form [role=alert], [role=alert]").allTextContents().then((x) => x.join(" ")));
    ok(first.status() === 409 && sent.expected_final_price_tenge === b2.price_tenge && /Стоимость тарифа изменилась/.test(alert),
      `P5 sent with the amount shown (${money(sent.expected_final_price_tenge)}): ${first.status()}, "${alert.slice(0, 90)}"`);
    ok(norm(await previewBox.textContent()).includes(money(changedPrice)), `P5 the preview now shows ${money(changedPrice)}`);
    answer = page.waitForResponse((x) => x.url().endsWith("/api/v1/project-requests") && x.request().method() === "POST");
    await form.locator('button[type="submit"]').click();
    const second = await answer;
    const body = await second.json();
    await sleep(500);
    ok(second.status() === 201 && body.data.tariff.final_price_tenge === changedPrice && body.data.tariff.version === b2.version + 1,
      `P5 sent again: ${second.status()}, ${money(body.data.tariff.final_price_tenge)}, version ${body.data.tariff.version}`);
    ok(/Тариф «Бизнес»: /.test(norm(await page.locator("[role=status]").first().textContent())) && errors.length === 0, "P5 success text, no browser errors");
    ok(sql(`SELECT count(*) FROM project_request_tariffs WHERE project_request_id = '${body.data.id}' AND final_price_tenge = ${changedPrice} AND tariff_version = ${b2.version + 1}`) === "1",
      "P5 stored terms: the new price and version");
    await ctx.close();
  }

  // P6: Start under its live promotion: a price that breaks the promotion's rules cannot be saved.
  {
    await open(ap, "/manager/pricing#prices");
    const s = card("start");
    await s.getByRole("button", { name: "Изменить цену" }).click();
    await s.locator('input[name="price"]').fill(String(startCost + 1000)); // promotional price below the cost
    await s.locator('textarea[name="reason"]').fill("E2E: нарушение правил акции");
    await s.getByRole("button", { name: "Проверить расчёт" }).click();
    await s.locator('[data-testid="preview-problems"]').waitFor();
    const t = norm(await s.locator('[data-testid="price-preview"]').textContent());
    ok(/ниже себестоимости/.test(t) && /акция действует/.test(t) && (await s.getByRole("button", { name: "Сохранить цену…" }).isDisabled()),
      `P6 below the cost under the live promotion: blocked (${t.slice(t.indexOf("Сохранить нельзя"), t.indexOf("Сохранить нельзя") + 80)})`);
    const direct = await call(ap, "POST", "/pricing/tariffs/start/price", { price_tenge: startCost + 1000, reason: "E2E: в обход интерфейса", expected_version: startT().version });
    ok(direct.status === 422, `P6 the same through the API: ${direct.status}`);
    await shot(s, "prices-blocked-desktop");
    await s.getByRole("button", { name: "Отмена" }).click();
  }

  // P7: the API unavailable — the page says so and nothing is sent or stored.
  {
    await ap.route("**/price/preview", (route) => route.abort());
    const s = card("business");
    await s.getByRole("button", { name: "Изменить цену" }).click();
    await s.locator('input[name="price"]').fill("150000");
    await s.locator('textarea[name="reason"]').fill("E2E: сеть недоступна");
    await s.getByRole("button", { name: "Проверить расчёт" }).click();
    await sleep(600);
    ok(/Не удалось выполнить запрос/.test(norm(await s.textContent())) && (await s.getByRole("button", { name: "Сохранить цену…" }).isDisabled()),
      "P7 preview unreachable: error shown, save disabled");
    await ap.unroute("**/price/preview");
    await s.getByRole("button", { name: "Отмена" }).click();
    const { ctx, page } = await context(b);
    await page.route("**/quote*", (route) => route.abort());
    let posted = 0;
    page.on("request", (r) => { if (r.url().endsWith("/api/v1/project-requests")) posted++; });
    await open(page, "/contact?tariff=business");
    await sleep(2600);
    const form = page.locator("form:has(#description)").first();
    await form.locator("#name").fill("E2E без расчёта"); await form.locator("#phone").fill("7000000001");
    await form.locator("#description").fill("Price management E2E: не отправляется."); await form.locator("#consent").check();
    await form.locator('button[type="submit"]').click();
    await sleep(800);
    ok(posted === 0 && /непредвиденную ошибку|расчёта стоимости/.test(norm(await page.locator("[role=alert]").allTextContents().then((x) => x.join(" ")))),
      "P7 form without a server quote: nothing sent, the visitor is told");
    await ctx.close();
  }

  // P8: 375 px — the tab, the editor with the preview, the dialog and the history fit.
  {
    const { ctx, page, errors } = await context(b, 375);
    await login(page, admin.ADMIN_EMAIL, admin.ADMIN_PW);
    await open(page, "/manager/pricing#prices");
    await page.locator('article[data-price-tariff="business"]').waitFor();
    ok((await overflow(page)) <= 0, `P8 375 px tab: no horizontal scroll (${await overflow(page)} px)`);
    await shot(page.locator("main"), "prices-tab-mobile");
    const m = page.locator('article[data-price-tariff="business"]');
    const cur = await business();
    await m.getByRole("button", { name: "Изменить цену" }).click();
    await m.locator('input[name="price"]').fill(String(cur.price_tenge + 1000));
    await m.locator('textarea[name="reason"]').fill("E2E: мобильный экран");
    await m.locator("label", { hasText: "CRM" }).locator('input[type="checkbox"]').check();
    await m.getByRole("button", { name: "Проверить расчёт" }).click();
    await m.locator('[data-testid="price-preview"]').waitFor();
    ok((await overflow(page)) <= 0, `P8 375 px preview: no horizontal scroll (${await overflow(page)} px)`);
    await shot(m, "prices-preview-mobile");
    await m.getByRole("button", { name: "Сохранить цену…" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    const box = await dialog.boundingBox();
    ok(box && box.x >= 0 && box.x + box.width <= 375 && (await overflow(page)) <= 0, `P8 375 px dialog fits (${Math.round(box.x)}–${Math.round(box.x + box.width)} px)`);
    await shot(page, "prices-confirm-mobile");
    await dialog.getByRole("button", { name: "Отмена" }).click();
    await m.locator('[data-testid="price-history"] summary').click();
    await sleep(300);
    ok((await overflow(page)) <= 0, "P8 375 px history: no horizontal scroll");
    await shot(m.locator('[data-testid="price-history"]'), "prices-history-mobile");
    ok(errors.length === 0 && (await business()).version === cur.version, `P8 nothing saved, ${errors.length} browser errors`);
    await ctx.close();
  }

  // P9: the public API never shows costs, margins or reasons; the admin page had no errors.
  {
    const pub = await ap.evaluate(async (u) => await (await fetch(u, { cache: "no-store" })).text(), `${API}/api/v1/tariffs`);
    ok(!/cost|margin|reason|change_/.test(pub) && pub.includes('"slug":"business"'), "P9 public tariffs: no cost, margin or reason");
    ok(adminErrors.length === 0, `P9 admin page: ${adminErrors.length} browser errors`);
  }

  // Back to drafts (prices stay as new versions of the test database). The public list is
  // cached for 30 s by browsers: read past the cache.
  await call(ap, "PATCH", "/pricing/promotions/start-launch", { is_active: false, clear_dates: true });
  for (const slug of ["start", "business", "pro"]) await call(ap, "PATCH", `/pricing/tariffs/${slug}`, { is_active: false });
  const after = await ap.evaluate(async (u) => (await (await fetch(u, { cache: "no-store" })).json()).data, `${API}/api/v1/tariffs`);
  ok(Array.isArray(after) && after.length === 0, "switched off again: nothing public");
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
