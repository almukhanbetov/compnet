// Stage 8.7B: funnel steps (calculator_start, calculator_result, form_start, cta_click, email_click).
// Isolated stack only. usage: node funnel.cjs <playwright>          first-party events in the test PostgreSQL
//                             node funnel.cjs <playwright> --ga4    what reaches GA4's dataLayer; needs the backend
//                                                                   started with a test GA4_MEASUREMENT_ID
// Each scenario uses a fresh browser profile. gtag.js itself is never loaded (blocked): nothing reaches Google.
const { chromium } = require(process.argv[2]);
const { execFileSync } = require("child_process");
const SITE = "http://compnet.test:3006";
const RULES = "MAP compnet.test 127.0.0.1, MAP api.compnet.test 127.0.0.1, MAP www.google.com:443 127.0.0.1:8443";
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36";
const FUNNEL = ["calculator_start", "calculator_result", "form_start", "cta_click", "email_click"];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) process.exitCode = 1; };
const sql = (q) => execFileSync("docker", ["exec", "-i", "compnet-stage86c-db", "psql", "-q", "-U", "postgres", "-d", "compnet_e2e", "-At", "-F", "|"], { input: q, encoding: "utf8" }).trim();

async function visitor(b, { block = false } = {}) {
  const ctx = await b.newContext({ userAgent: UA, ignoreHTTPSErrors: true, locale: "ru-RU", viewport: { width: 1366, height: 900 } });
  // Never load anything from Google (GA4 mode checks dataLayer only).
  await ctx.route(/googletagmanager\.com|google-analytics\.com/, (r) => r.abort());
  const page = await ctx.newPage();
  const log = { batches: [], errors: [] };
  if (block) await page.route("**/api/v1/analytics/events", (r) => r.abort("blockedbyclient"));
  page.on("request", (r) => { if (r.url().endsWith("/api/v1/analytics/events")) log.batches.push(JSON.parse(r.postData() || "{}")); });
  page.on("pageerror", (e) => log.errors.push(e.message));
  // mailto: links must not open a mail program in the test browser (the tracker still sees the click).
  await page.addInitScript(() => window.addEventListener("click", (e) => { if (e.target.closest?.('a[href^="mailto:"]')) e.preventDefault(); }, true));
  return { ctx, page, log };
}
async function open(page, path) { await page.goto(SITE + path); await page.waitForLoadState("networkidle"); }
async function consent(page, allow) {
  const d = page.getByRole("dialog").filter({ has: page.locator("#consent-title") });
  await d.waitFor({ timeout: 10000 }); await d.getByRole("button", { name: allow ? /Разрешить/ : /Только необходимые/ }).click(); await sleep(400);
}
async function flush(page) { await sleep(2600); await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange"))); await sleep(900); }
const ids = (page) => page.evaluate(() => ({
  visitor: JSON.parse(localStorage.getItem("compnet-a-visitor") || "null"),
  session: JSON.parse(localStorage.getItem("compnet-a-session") || "null")?.id ?? null,
}));
/** Funnel events this visitor stored, as "type@path" with counts. */
function stored(visitorId) {
  if (!visitorId) return {};
  const rows = sql(`SELECT type || '@' || path, count(*) FROM analytics_events WHERE visitor_id = '${visitorId}'
    AND type IN (${FUNNEL.map((t) => `'${t}'`).join(",")}) GROUP BY 1`);
  return Object.fromEntries(rows.split("\n").filter(Boolean).map((l) => { const [k, n] = l.split("|"); return [k, Number(n)]; }));
}
const sentFunnel = (log) => log.batches.flatMap((b) => b.events || []).filter((e) => FUNNEL.includes(e.type)).length;
const show = (o) => JSON.stringify(o);

// The calculator: choose a project type (start + result), then change more (no repeats).
async function useCalculator(page) {
  const select = page.locator("#calc-project-type");
  await select.scrollIntoViewIfNeeded();
  const values = await select.locator("option").evaluateAll((o) => o.map((x) => x.value).filter(Boolean));
  await select.selectOption(values[0]); await sleep(300);
  await select.selectOption(values[1]); await sleep(300);
  await page.locator("section button").first().click(); await sleep(300);
}
// The request form: focus and type in two fields (one form_start).
async function startForm(page) {
  const form = page.locator("form:has(#description)").first();
  await form.scrollIntoViewIfNeeded();
  await form.locator("#name").click(); await form.locator("#name").fill("Тест");
  await form.locator("#email").click(); await sleep(300);
}

const S = {
  async F1_no_choice_yet(b) {
    const { ctx, page, log } = await visitor(b);
    await open(page, "/calculator"); await useCalculator(page);
    await open(page, "/contact"); await startForm(page);
    await page.locator('a[href^="mailto:"]').first().click(); await flush(page);
    const id = await ids(page);
    ok(log.batches.length === 0 && !id.visitor && !id.session, `F1 banner not answered: nothing sent (${log.batches.length} batches), no ids stored`);
    await ctx.close();
  },
  async F2_consent_full_funnel(b) {
    const { ctx, page, log } = await visitor(b);
    await open(page, "/"); await consent(page, true); await flush(page);
    const before = await ids(page);
    // A double click on a link to the request form on the home page: one cta_click.
    const cta = page.locator('main a[href="/contact"]:visible').first();
    await cta.scrollIntoViewIfNeeded();
    await Promise.all([page.waitForURL(SITE + "/contact"), cta.dblclick()]); await page.waitForLoadState("networkidle");
    await startForm(page);
    const mail = page.locator('a[href^="mailto:"]').first();
    await mail.dblclick(); await sleep(300);
    // A full page load (goto) right after an action can drop the last batch of
    // the previous page (known, older than 8.7B): send it first.
    await flush(page);
    await open(page, "/calculator"); await useCalculator(page);
    await flush(page);
    const after = await ids(page);
    const got = stored(after.visitor);
    const want = { "cta_click@/": 1, "form_start@/contact": 1, "email_click@/contact": 1, "calculator_start@/calculator": 1, "calculator_result@/calculator": 1 };
    ok(Object.entries(want).every(([k, n]) => got[k] === n) && Object.keys(got).length === 5,
      `F2 after consent: each funnel step once (double clicks, two form fields, three calculator actions): ${show(got)}`);
    ok(before.visitor === after.visitor && before.session === after.session &&
      sql(`SELECT count(DISTINCT session_id) FROM analytics_events WHERE visitor_id = '${after.visitor}'`) === "1",
      "F2 the same visitor id and session id as before the funnel steps (one session)");
    const keys = log.batches.flatMap((x) => x.events || []).filter((e) => FUNNEL.includes(e.type)).map((e) => Object.keys(e).sort().join(","));
    ok(keys.length > 0 && keys.every((k) => k === "id,path,type"), `F2 funnel events carry only id, type and path: ${[...new Set(keys)]}`);
    ok(log.errors.length === 0, "F2 no browser errors");
    await ctx.close();
  },
  async F3_declined(b) {
    const { ctx, page, log } = await visitor(b);
    await open(page, "/calculator"); await consent(page, false);
    await useCalculator(page);
    await open(page, "/contact"); await startForm(page); await flush(page);
    const id = await ids(page);
    ok(log.batches.length === 0 && !id.visitor, `F3 "Necessary only": nothing sent (${log.batches.length} batches), no ids`);
    await ctx.close();
  },
  async F4_returning_and_reload(b) {
    const { ctx, page } = await visitor(b);
    await open(page, "/calculator"); await consent(page, true); await useCalculator(page); await flush(page);
    // Reload: a new page view, so the calculator counts again — once.
    await page.reload(); await page.waitForLoadState("networkidle"); await useCalculator(page); await flush(page);
    // Navigate away and back inside the site: again a new page view.
    await open(page, "/pricing"); await open(page, "/calculator"); await useCalculator(page); await flush(page);
    const first = await ids(page);
    // Returning after 31 minutes: a new session, same visitor, first source unchanged.
    await page.evaluate(() => { const s = JSON.parse(localStorage.getItem("compnet-a-session")); s.lastActivity -= 31 * 60 * 1000; localStorage.setItem("compnet-a-session", JSON.stringify(s)); });
    await open(page, "/calculator"); await useCalculator(page); await flush(page);
    const second = await ids(page);
    const got = stored(second.visitor);
    const sessions = sql(`SELECT count(*) || '|' || count(DISTINCT first_source || first_medium) FROM analytics_sessions WHERE visitor_id = '${second.visitor}'`);
    ok(got["calculator_start@/calculator"] === 4 && got["calculator_result@/calculator"] === 4,
      `F4 one start and one result per page view (first, reload, back via /pricing, returning): ${show(got)}`);
    ok(first.visitor === second.visitor && first.session !== second.session && sessions === "2|1",
      `F4 returning visitor: same visitor id, a new session, first source unchanged (sessions|first sources = ${sessions})`);
    await ctx.close();
  },
  async F5_blocker(b) {
    const { ctx, page, log } = await visitor(b, { block: true });
    await open(page, "/calculator"); await consent(page, true); await useCalculator(page);
    await open(page, "/contact"); await startForm(page); await flush(page);
    const id = await ids(page);
    ok(log.errors.length === 0 && Object.keys(stored(id.visitor)).length === 0 && (await page.locator("#name").inputValue()) === "Тест",
      `F5 blocked event intake: no errors, nothing stored, the form keeps working (${log.errors.length} errors)`);
    await ctx.close();
  },
  async F6_cta_after_idle_keeps_attribution(b) {
    const { ctx, page } = await visitor(b);
    await page.goto(`https://www.google.com/?to=${encodeURIComponent(SITE + "/services/website-development")}`);
    await Promise.all([page.waitForURL(SITE + "/**"), page.click("#result")]); await page.waitForLoadState("networkidle");
    await consent(page, true); await flush(page);
    // 31 minutes idle, then a link to the request form: the click happens on the
    // Google entry page, but the new session must not take that stale referrer.
    await page.evaluate(() => { const s = JSON.parse(localStorage.getItem("compnet-a-session")); s.lastActivity -= 31 * 60 * 1000; localStorage.setItem("compnet-a-session", JSON.stringify(s)); });
    // This page has its own form, the link is the one in the header.
    const link = page.locator('a[href="/contact"]:visible').first(); await link.scrollIntoViewIfNeeded();
    await Promise.all([page.waitForURL(SITE + "/contact"), link.click()]); await page.waitForLoadState("networkidle"); await flush(page);
    const { visitor: v } = await ids(page);
    const rows = sql(`SELECT s.source || '/' || s.medium || ' first=' || s.first_source || ' cta=' ||
        (SELECT count(*) FROM analytics_events e WHERE e.session_id = s.id AND e.type = 'cta_click' AND e.path = '/services/website-development')
      FROM analytics_sessions s WHERE s.visitor_id = '${v}' ORDER BY s.started_at`).split("\n");
    ok(rows.length === 2 && rows[0] === "google/organic first=google cta=0" && rows[1] === "(direct)/(none) first=google cta=1",
      `F6 CTA click after 30 min idle: new session (direct) as before 8.7B, the click counted in it with the page it was on: ${rows.join(" | ")}`);
    await ctx.close();
  },
};

// GA4: what the site hands to gtag (dataLayer); gtag.js itself is blocked.
const G = {
  async G1_ga4_names_and_params(b) {
    const { ctx, page } = await visitor(b);
    await open(page, "/"); await consent(page, true);
    const cta = page.locator('main a[href="/contact"]:visible').first(); await cta.scrollIntoViewIfNeeded();
    await Promise.all([page.waitForURL(SITE + "/contact"), cta.dblclick()]); await page.waitForLoadState("networkidle");
    await startForm(page); await page.locator('a[href^="mailto:"]').first().dblclick(); await sleep(300);
    // dataLayer belongs to the document: read it before the full page load.
    const read = () => page.evaluate(() => (window.dataLayer || []).map((a) => Array.from(a)).filter((a) => a[0] === "event").map(([, name, params]) => ({ name, params })));
    const layer = await read();
    await open(page, "/calculator?utm_source=x&email=test%40example.test"); await useCalculator(page);
    layer.push(...(await read()));
    const names = layer.map((e) => e.name);
    const count = (n) => names.filter((x) => x === n).length;
    ok(["calculator_start", "calculator_result", "request_form_start", "cta_click", "email_click"].every((n) => count(n) === 1) && count("form_start") === 0,
      `G1 GA4 gets each funnel step once, the form as request_form_start: ${names.filter((n) => n !== "page_view").join(", ")}`);
    const text = JSON.stringify(layer);
    ok(!/example\.test|Тест|email=|utm_source/.test(text) && layer.filter((e) => e.name !== "page_view").every((e) => Object.keys(e.params || {}).join() === "page_path"),
      "G1 GA4 funnel events carry only page_path: no query string, form values or contacts");
    await ctx.close();
  },
  async G2_ga4_excluded_browser(b) {
    const { ctx, page } = await visitor(b);
    await open(page, "/"); await page.evaluate(() => localStorage.setItem("compnet-a-optout", "1"));
    await consent(page, true); await open(page, "/calculator"); await useCalculator(page);
    const events = await page.evaluate(() => (window.dataLayer || []).filter((a) => a[0] === "event").length);
    ok(events === 0, `G2 browser excluded by the manager ("do not count"): nothing to GA4 (${events} events)`);
    await ctx.close();
  },
  async G3_ga4_declined(b) {
    const { ctx, page } = await visitor(b);
    await open(page, "/calculator"); await consent(page, false); await useCalculator(page);
    const layer = await page.evaluate(() => (window.dataLayer || []).length);
    ok(layer === 0, `G3 "Necessary only": GA4 not even set up (${layer} dataLayer entries)`);
    await ctx.close();
  },
};

(async () => {
  const ga4 = process.argv.includes("--ga4");
  const set = ga4 ? G : S;
  const b = await chromium.launch({ args: [`--host-resolver-rules=${RULES}`, "--disable-blink-features=AutomationControlled"] });
  const names = process.argv.slice(3).filter((a) => !a.startsWith("--"));
  for (const name of names.length ? names : Object.keys(set)) {
    try { await set[name](b); } catch (e) { ok(false, `${name}: ${e.message.split("\n")[0]}`); }
  }
  await b.close();
})();
