// Stage 8.6F: fast period and filter switches on the statistics page never
// leave another period's figures on screen — neither from the regular load
// nor from the quiet re-read after a realtime event. Isolated stack only.
// usage: node manager-periods.cjs <playwright>   (credentials read from staff.env; never printed)
// Triggers real events on the test stack: one analytics batch and a note on
// an existing E2E request per check; no new requests are created.
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
const PERIODS = {
  "Сегодня": { from: today, to: today },
  "Вчера": { from: addDays(today, -1), to: addDays(today, -1) },
  "7 дней": { from: addDays(today, -6), to: today },
  "30 дней": { from: addDays(today, -29), to: today },
};
const REPORTS = "**/api/v1/manager/analytics/{leads,report}?**";

(async () => {
  const browser = await chromium.launch({ args: [`--host-resolver-rules=${RULES}`, "--disable-blink-features=AutomationControlled"] });
  const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 1440, height: 1000 }, locale: "ru-RU" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const frames = [];
  page.on("websocket", (ws) => ws.on("framereceived", (f) => { const m = String(f.payload).match(/"type":"([a-z_]+)"/); if (m) frames.push(m[1]); }));

  await page.goto(SITE + "/manager/login"); await page.locator("#manager-email").waitFor();
  await page.locator("#manager-email").fill(env.MGR_EMAIL);
  await page.locator("#manager-password").fill(env.MGR_PW);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL((u) => !u.pathname.endsWith("/login"));
  await page.goto(SITE + "/manager/analytics");
  const leads = page.locator('section[aria-labelledby="leads-title"]');
  await leads.getByText("Всего заявок").first().waitFor();

  const api = (path, init) => page.evaluate(async ([url, init]) => {
    const r = await fetch(url, { credentials: "include", ...init, headers: init ? { "Content-Type": "application/json" } : undefined });
    return r.status === 200 ? (await r.json()).data : null;
  }, [API + path, init]);
  const qs = (range, filter = {}) => new URLSearchParams({ ...range, ...filter }).toString();
  const expected = async (label, filter) => ({
    requests: (await api(`/api/v1/manager/analytics/leads?${qs(PERIODS[label], filter)}`)).totals.requests,
    sessions: (await api(`/api/v1/manager/analytics/report?${qs(PERIODS[label])}`)).totals.sessions,
  });
  const shown = async () => {
    const lt = (await leads.innerText()).replace(/\s+/g, " ").match(/Всего заявок (\d+)/);
    const rt = (await page.locator("main").innerText()).replace(/\s+/g, " ").match(/Сессии (\d+)/);
    return { requests: lt ? Number(lt[1]) : null, sessions: rt ? Number(rt[1]) : null };
  };
  const pressed = () => page.getByRole("group", { name: "Период" }).locator('button[aria-pressed="true"]').innerText();
  const choose = (label) => page.getByRole("group", { name: "Период" }).getByRole("button", { name: label, exact: true }).click();
  const channel = leads.locator("select").first();
  // Delays answers of matching report requests; an answer whose request the page already cancelled is dropped.
  const delay = (match, ms) => page.route(REPORTS, async (route) => {
    const u = new URL(route.request().url());
    const wait = match(u);
    if (wait == null) return route.fallback();
    await sleep(wait ?? ms);
    await route.continue().catch(() => {});
  });
  const same = (a, b) => a.requests === b.requests && a.sessions === b.sessions;

  // Real server events: a visit (analytics_updated) and a note on an existing test request (project_request_updated).
  const anyRequest = (await api("/api/v1/manager/project-requests?q=E2E&limit=1"))?.[0]?.id;
  if (!anyRequest) throw new Error("no E2E test request in the test database");
  const visit = () => fetch(API.replace("api.compnet.test", "127.0.0.1") + "/api/v1/analytics/events", {
    method: "POST", headers: { "Content-Type": "text/plain;charset=UTF-8", Origin: SITE, "User-Agent": UA },
    body: JSON.stringify({ visitor_id: crypto.randomUUID(), session_id: crypto.randomUUID(), language: "ru",
      session: { utm: {}, referrer_host: "", landing_path: "/" }, first_touch: { utm: {}, referrer_host: "", landing_path: "/" },
      events: [{ id: crypto.randomUUID(), type: "page_view", path: "/" }] }),
  });
  const events = async (types) => {
    const start = frames.length;
    if (types.includes("analytics_updated")) await visit();
    if (types.includes("project_request_updated")) await api(`/api/v1/manager/project-requests/${anyRequest}`, { method: "PATCH", body: JSON.stringify({ note: `e2e-86f ${Date.now()}` }) });
    for (let t = 0; t < 150 && !types.every((x) => frames.slice(start).includes(x)); t++) await sleep(100);
    return types.every((x) => frames.slice(start).includes(x));
  };

  const want = {};
  for (const label of Object.keys(PERIODS)) want[label] = await expected(label);
  console.log("      figures per period (API):", JSON.stringify(want));

  // 0. Without a switch the quiet re-read still brings the new figures.
  await choose("30 дней"); await sleep(1500);
  const before0 = await shown();
  const got0 = await events(["analytics_updated"]);
  await sleep(2000);
  const after0 = await shown(), fresh0 = await expected("30 дней");
  ok(got0 && same(after0, fresh0) && after0.sessions > before0.sessions,
    `realtime update on 30 дней: sessions ${before0.sessions} → ${after0.sessions} = API ${fresh0.sessions}`);
  for (const label of Object.keys(PERIODS)) want[label] = await expected(label);

  // 1. Fast switches, answers arriving in reverse order (the first click answers last).
  for (const order of [["Сегодня", "Вчера", "7 дней", "30 дней"], ["30 дней", "7 дней", "Вчера", "Сегодня"]]) {
    await delay((u) => {
      const i = order.findIndex((l) => PERIODS[l].from === u.searchParams.get("from") && PERIODS[l].to === u.searchParams.get("to"));
      return i < 0 ? null : (order.length - 1 - i) * 900;
    });
    for (const label of order) { await choose(label); await sleep(120); }
    await sleep(order.length * 900 + 1500);
    await page.unroute(REPORTS);
    const last = order[order.length - 1], got = await shown();
    ok(same(got, want[last]) && (await pressed()) === last, `fast switch ${order.join(" → ")}: shown ${JSON.stringify(got)} = ${last} ${JSON.stringify(want[last])}`);
  }

  // 2. Fast filter switches, answers in reverse order; ends on "all channels".
  await choose("30 дней"); await sleep(1500);
  const filters = ["direct", "paid_search", ""];
  await delay((u) => {
    if (u.pathname.endsWith("/report")) return null;
    const i = filters.indexOf(u.searchParams.get("channel") ?? "");
    return i < 0 ? null : (filters.length - 1 - i) * 900;
  });
  for (const f of filters) { await channel.selectOption(f); await sleep(120); }
  await sleep(filters.length * 900 + 1500);
  await page.unroute(REPORTS);
  const all = (await shown()).requests;
  ok(all === want["30 дней"].requests, `fast filter switch direct → paid_search → all: shown ${all} = API ${want["30 дней"].requests}`);

  // 3. Realtime event while a period is shown, then a switch before the quiet re-read answers.
  for (const [from, to] of [["7 дней", "Вчера"], ["Вчера", "30 дней"], ["30 дней", "Сегодня"], ["Сегодня", "7 дней"]]) {
    await choose(from); await sleep(1500);
    let held = 0;
    await delay((u) => (u.searchParams.get("from") === PERIODS[from].from && u.searchParams.get("to") === PERIODS[from].to ? (held++, 4000) : null));
    const got = await events(["analytics_updated", "project_request_updated"]);
    await choose(to);
    await sleep(6000);
    await page.unroute(REPORTS);
    const fresh = await expected(to), now = await shown();
    const note = same(want[from], fresh) ? " (periods have equal figures: inconclusive)" : "";
    ok(got && held > 0 && same(now, fresh) && (await pressed()) === to,
      `event on ${from}, switch to ${to} before the re-read (${held} held): shown ${JSON.stringify(now)} = ${to} ${JSON.stringify(fresh)}${note}`);
  }

  // 4. Realtime event, then a filter change before the quiet re-read answers.
  await choose("30 дней"); await sleep(1500);
  await delay((u) => (u.pathname.endsWith("/leads") && !u.searchParams.has("channel") ? 4000 : null));
  const got4 = await events(["project_request_updated"]);
  await channel.selectOption("direct");
  await sleep(6000);
  await page.unroute(REPORTS);
  const direct = (await api(`/api/v1/manager/analytics/leads?${qs(PERIODS["30 дней"], { channel: "direct" })}`)).totals.requests;
  const unfiltered = (await api(`/api/v1/manager/analytics/leads?${qs(PERIODS["30 дней"])}`)).totals.requests;
  const shownDirect = (await shown()).requests;
  ok(got4 && shownDirect === direct, `event, then channel filter "direct" before the re-read: shown ${shownDirect} = filtered ${direct} (unfiltered ${unfiltered})`);
  await channel.selectOption("");
  await sleep(1500);

  // 5. Event, switch to a period whose load fails: an error, never the old figures.
  await choose("7 дней"); await sleep(1500);
  const d7 = PERIODS["7 дней"], y = PERIODS["Вчера"];
  await page.route(REPORTS, async (route) => {
    const u = new URL(route.request().url());
    if (u.searchParams.get("from") === y.from) return route.fulfill({ status: 500, contentType: "application/json", body: '{"error":{"message":"internal"}}' });
    if (u.searchParams.get("from") === d7.from) { await sleep(4000); return route.continue().catch(() => {}); }
    return route.fallback();
  });
  const got5 = await events(["analytics_updated", "project_request_updated"]);
  await choose("Вчера");
  await sleep(6000);
  const failed = await leads.getByText(/Не удалось загрузить заявки/).isVisible();
  const figures = await shown();
  await page.unroute(REPORTS);
  ok(got5 && failed && figures.requests === null && figures.sessions === null,
    `event on 7 дней, switch to Вчера whose load fails: error shown ${failed}, figures on screen ${JSON.stringify(figures)}`);

  ok(errors.length === 0, "no browser errors " + errors.join("; "));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
