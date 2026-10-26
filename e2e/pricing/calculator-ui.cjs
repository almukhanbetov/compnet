// The calculator and the request form's estimate preview on the server's catalog
// (GET /api/v1/pricing/catalog). Isolated stack only (artificial data), see
// e2e/lead-attribution/README.md. usage: node calculator-ui.cjs <playwright>
// Sends one request (restart the test backend first if its per-IP request limit was used up).
const { chromium } = require(process.argv[2]);
const SITE = "http://compnet.test:3006";
const RULES = "MAP compnet.test 127.0.0.1, MAP api.compnet.test 127.0.0.1";
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36";
const CATALOG = "**/api/v1/pricing/catalog";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) process.exitCode = 1; };
const tenge = /\d[\d\s  ]*\s?₸/;

async function page(b, { blockCatalog = false } = {}) {
  const ctx = await b.newContext({ userAgent: UA, locale: "ru-RU", viewport: { width: 1366, height: 900 } });
  const p = await ctx.newPage();
  const state = { errors: [], blocked: blockCatalog, catalogCalls: 0 };
  await p.route(CATALOG, (r) => { state.catalogCalls++; return state.blocked ? r.abort("failed") : r.continue(); });
  p.on("pageerror", (e) => state.errors.push(e.message));
  return { ctx, p, state };
}
const section = (p) => p.locator("section:has(#calc-project-type)");
async function choose(p, { type, tier, modules = [], api = 1, design, complexity, urgency, multilingual = false }) {
  await p.locator("#calc-project-type").selectOption({ label: type });
  if (tier) await section(p).getByRole("button", { name: tier, exact: true }).click();
  for (const m of modules) await section(p).locator("label", { hasText: m }).first().locator('input[type="checkbox"]').check();
  for (let i = 1; i < api; i++) await section(p).getByRole("button", { name: /Увеличить/ }).click();
  if (multilingual) await section(p).locator("label", { hasText: "Мультиязычность" }).locator("input").check();
  for (const name of [design, complexity, urgency]) if (name) await section(p).getByRole("button", { name: new RegExp(`^${name}`) }).click();
  await sleep(200);
}
const resultText = async (p) => (await section(p).locator("div.lg\\:sticky").textContent()).replace(/\s+/g, " ");

(async () => {
  const b = await chromium.launch({ args: [`--host-resolver-rules=${RULES}`, "--disable-blink-features=AutomationControlled"] });

  // C1: prices and hints come from the catalog.
  {
    const { ctx, p, state } = await page(b);
    await p.goto(SITE + "/calculator"); await p.waitForLoadState("networkidle");
    await choose(p, { type: "Лендинг" });
    ok(/от 120 000 ₸ до 140 000 ₸/.test(await resultText(p)), `C1 landing, up to 5 pages: ${(await resultText(p)).match(/от [^А-Я]*₸ до [^А-Я]*₸/)?.[0]}`);
    const text = (await section(p).textContent()).replace(/[  ]/g, " ");
    ok(/Авторизация\s*\+80 000 ₸/.test(text) && /Индивидуальный UI\/UX \+15%/.test(text) && !/15\.0000/.test(text) && /×1\.10/.test(text) && /\(\+10%\)/.test(text),
      "C1 hints from the catalog: module +80 000 ₸, design +15% (not 15.000000000000002%), ×1.10, multilingual (+10%)");
    // The rounding case the old browser formula got 10 000 ₸ too low (800 000 instead of the server's 810 000).
    await choose(p, { type: "Лендинг", modules: ["Авторизация", "Админ-панель", "Поиск и фильтры", "Внешний API"], complexity: "Высокая", urgency: "Ускоренный" });
    ok(/от 810 000 ₸ до 970 000 ₸/.test(await resultText(p)), `C1 rounding case equals the server: ${(await resultText(p)).match(/от [^А-Я]*₸ до [^А-Я]*₸/)?.[0]} (server 810 000 – 970 000)`);
    await choose(p, { type: "Другое" });
    ok(/Индивидуальная оценка/.test(await resultText(p)) && !tenge.test(await resultText(p)), "C1 'Другое': individual estimate, no amount");
    ok(state.errors.length === 0 && state.catalogCalls === 1, `C1 no browser errors, one catalog request (${state.catalogCalls})`);
    await ctx.close();
  }

  // C2: the catalog cannot be loaded — no amount anywhere; "Повторить" recovers.
  {
    const { ctx, p, state } = await page(b, { blockCatalog: true });
    await p.goto(SITE + "/calculator"); await p.waitForLoadState("networkidle");
    await choose(p, { type: "Корпоративный сайт" });
    const text = (await section(p).textContent()).replace(/[  ]/g, " ");
    ok(/Не удалось загрузить актуальные цены/.test(text) && !tenge.test(text) && !/×1\.|\+15%|\+10%/.test(text),
      "C2 catalog unavailable: message shown, no amount, percentage or multiplier anywhere in the calculator");
    state.blocked = false;
    await section(p).getByRole("button", { name: "Повторить" }).click(); await sleep(800);
    ok(/от 300 000 ₸ до 360 000 ₸/.test(await resultText(p)), `C2 after "Повторить" the estimate appears: ${(await resultText(p)).match(/от [^А-Я]*₸ до [^А-Я]*₸/)?.[0]}`);
    ok(state.errors.length === 0, "C2 no browser errors");
    await ctx.close();
  }

  // C3: the request form's preview, with and without the catalog; the request itself never needs it.
  {
    const { ctx, p, state } = await page(b);
    await p.goto(SITE + "/contact"); await p.waitForLoadState("networkidle");
    const form = p.locator("form:has(#description)").first();
    await form.locator("#projectType").selectOption("Сайт-визитка"); await sleep(400);
    const preview = async () => (await p.locator("div.lg\\:sticky", { hasText: /Ориентировочная|стоимост/i }).first().textContent()).replace(/[  ]/g, " ");
    ok(/от 180 000 ₸/.test(await preview()), "C3 form preview: 'от 180 000 ₸' from the catalog");
    await ctx.close();

    const blocked = await page(b, { blockCatalog: true });
    const q = blocked.p;
    await q.goto(SITE + "/contact"); await q.waitForLoadState("networkidle");
    const f2 = q.locator("form:has(#description)").first();
    await f2.locator("#projectType").selectOption("Сайт-визитка"); await sleep(400);
    const pv = (await q.locator("div.lg\\:sticky").first().textContent()).replace(/[  ]/g, " ");
    ok(/не удалось загрузить цены/i.test(pv) && !tenge.test(pv), "C3 catalog unavailable: preview says so, shows no amount");
    await sleep(2600);
    await f2.locator("#name").fill("E2E-PRICING-1"); await f2.locator("#phone").fill("7000000001"); await f2.locator("#email").fill("e2e-test@example.test");
    await f2.locator("#description").fill("Pricing E2E: искусственная заявка, не обрабатывать."); await f2.locator("#consent").check();
    const answer = q.waitForResponse((r) => r.url().endsWith("/api/v1/project-requests") && r.request().method() === "POST");
    await f2.locator('button[type="submit"]').click();
    const res = await answer;
    const body = await res.json();
    ok(res.status() === 201 && body.data?.estimate?.minimum_tenge === 180000, `C3 request without the catalog: HTTP ${res.status()}, server estimate from ${body.data?.estimate?.minimum_tenge}`);
    ok(blocked.state.errors.length === 0 && state.errors.length === 0, "C3 no browser errors");
    await blocked.ctx.close();
  }
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
