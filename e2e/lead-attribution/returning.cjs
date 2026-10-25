// Stage 8.6M: new and returning visitors — first touch vs session source, one session per visit.
// Isolated stack only. usage: node returning.cjs <playwright>
// Each scenario uses a fresh browser profile, allows analytics on the first page, and checks what the
// server stored for that visitor (test PostgreSQL): sessions in order, their source and first source.
const { chromium } = require(process.argv[2]);
const { execFileSync } = require("child_process");
const SITE = "http://compnet.test:3006";
const RULES = "MAP compnet.test 127.0.0.1, MAP api.compnet.test 127.0.0.1, MAP www.google.com:443 127.0.0.1:8443, MAP l.instagram.com:443 127.0.0.1:8443";
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) process.exitCode = 1; };
const sql = (q) => execFileSync("docker", ["exec", "-i", "compnet-stage86c-db", "psql", "-q", "-U", "postgres", "-d", "compnet_e2e", "-At", "-F", "|"], { input: q, encoding: "utf8" }).trim();

async function visitor(b) {
  const ctx = await b.newContext({ userAgent: UA, ignoreHTTPSErrors: true, locale: "ru-RU", viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return { ctx, page, errors };
}
async function from(page, host, path) {
  await page.goto(`https://${host}/?to=${encodeURIComponent(SITE + path)}`);
  await Promise.all([page.waitForURL(SITE + "/**"), page.click("#result")]);
  await page.waitForLoadState("networkidle");
}
async function typed(page, path) { await page.goto(SITE + path); await page.waitForLoadState("networkidle"); }
async function allow(page) {
  const b = page.getByRole("dialog").filter({ has: page.locator("#consent-title") });
  await b.waitFor({ timeout: 10000 }); await b.getByRole("button", { name: /Разрешить/ }).click(); await sleep(400);
}
async function go(page, href) {
  const l = page.locator(`a[href="${href}"]:visible`).first();
  await l.scrollIntoViewIfNeeded(); await Promise.all([page.waitForURL(SITE + href), l.click()]); await sleep(600);
}
async function flush(page) {
  await sleep(2600); await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange"))); await sleep(800);
}
// The previous session ends: 31 minutes without activity.
const expire = (page) => page.evaluate(() => { const s = JSON.parse(localStorage.getItem("compnet-a-session")); s.lastActivity -= 31 * 60 * 1000; localStorage.setItem("compnet-a-session", JSON.stringify(s)); });
async function stored(page) {
  await flush(page);
  const visitorId = await page.evaluate(() => JSON.parse(localStorage.getItem("compnet-a-visitor")));
  const rows = sql(`SELECT s.source, s.medium, s.first_source, s.first_medium,
      (SELECT count(*) FROM analytics_events e WHERE e.session_id = s.id AND e.type = 'page_view')
    FROM analytics_sessions s WHERE s.visitor_id = '${visitorId}' ORDER BY s.started_at`).split("\n").filter(Boolean)
    .map((l) => { const [source, medium, firstSource, firstMedium, views] = l.split("|"); return { src: `${source}/${medium}`, first: `${firstSource}/${firstMedium}`, views: Number(views) }; });
  return rows;
}
const show = (rows) => rows.map((r) => `[${r.src} first=${r.first} views=${r.views}]`).join(" ");

const S = {
  async A_new_google_organic(b) {
    const { ctx, page, errors } = await visitor(b);
    await from(page, "www.google.com", "/services/website-development"); await allow(page);
    const r = await stored(page);
    ok(r.length === 1 && r[0].src === "google/organic" && r[0].first === "google/organic" && errors.length === 0,
      `A new visitor from Google organic → one session google/organic, first source google/organic: ${show(r)}`);
    await ctx.close();
  },
  async B_reopen_same_page(b) {
    const { ctx, page } = await visitor(b);
    await from(page, "www.google.com", "/services/website-development"); await allow(page); await flush(page);
    await typed(page, "/services/website-development");
    const r = await stored(page);
    ok(r.length === 1 && r[0].src === "google/organic" && r[0].views === 2, `B the same page opened again in the active session → still one session, 2 page views: ${show(r)}`);
    await ctx.close();
  },
  async C_internal_pages(b) {
    const { ctx, page } = await visitor(b);
    await from(page, "www.google.com", "/"); await allow(page);
    await go(page, "/services"); await go(page, "/services/website-development"); await go(page, "/contact");
    const r = await stored(page);
    ok(r.length === 1 && r[0].src === "google/organic" && r[0].views === 4, `C three internal pages → one session google/organic, 4 page views: ${show(r)}`);
    await ctx.close();
  },
  async D_reload(b) {
    const { ctx, page } = await visitor(b);
    await from(page, "www.google.com", "/services/website-development"); await allow(page); await flush(page);
    await page.reload(); await page.waitForLoadState("networkidle"); await flush(page);
    await page.reload(); await page.waitForLoadState("networkidle");
    const r = await stored(page);
    ok(r.length === 1 && r[0].src === "google/organic" && r[0].views === 3, `D page reloaded twice → one session google/organic (source kept after reload), 3 page views: ${show(r)}`);
    await ctx.close();
  },
  async E_return_after_expiry_google(b) {
    const { ctx, page } = await visitor(b);
    await typed(page, "/"); await allow(page); await flush(page); await expire(page);
    await from(page, "www.google.com", "/services/website-development");
    const r = await stored(page);
    ok(r.length === 2 && r[0].src === "(direct)/(none)" && r[1].src === "google/organic" && r[1].first === "(direct)/(none)",
      `E returns from Google after the session expired → new session google/organic, first source stays (direct): ${show(r)}`);
    await ctx.close();
  },
  async F_google_in_active_session(b) {
    const { ctx, page } = await visitor(b);
    await typed(page, "/"); await allow(page); await flush(page);
    await from(page, "www.google.com", "/services/website-development");
    const r = await stored(page);
    ok(r.length === 1 && r[0].src === "(direct)/(none)" && r[0].views === 2,
      `F back from Google while the session is active → the session continues (agreed rule, as in GA4): ${show(r)}`);
    await ctx.close();
  },
  async G_ad_click_in_active_session(b) {
    const { ctx, page } = await visitor(b);
    await typed(page, "/"); await allow(page); await flush(page);
    await from(page, "www.google.com", "/services/mobile-app-development?gclid=TESTGCLID-SECRET-86M");
    const r = await stored(page);
    ok(r.length === 2 && r[1].src === "google/cpc" && r[1].first === "(direct)/(none)",
      `G Google Ads click (gclid, no UTM) in the active session → new session google/cpc, first source stays (direct): ${show(r)}`);
    await ctx.close();
  },
  async H_return_other_source(b) {
    const { ctx, page } = await visitor(b);
    await from(page, "www.google.com", "/"); await allow(page); await flush(page); await expire(page);
    await from(page, "l.instagram.com", "/services/website-development");
    const r = await stored(page);
    ok(r.length === 2 && r[0].src === "google/organic" && r[1].src === "instagram/social" && r[1].first === "google/organic",
      `H returns later from Instagram → new session instagram/social, first source stays google/organic: ${show(r)}`);
    await ctx.close();
  },
  async I_new_campaign_in_active_session(b) {
    const { ctx, page } = await visitor(b);
    await from(page, "www.google.com", "/"); await allow(page); await flush(page);
    await typed(page, "/services/website-development?utm_source=newsletter&utm_medium=email&utm_campaign=c86m");
    const r = await stored(page);
    ok(r.length === 2 && r[1].src === "newsletter/email" && r[1].first === "google/organic",
      `I a newsletter link (new UTM) in the active session → new session newsletter/email, first source stays google/organic: ${show(r)}`);
    await ctx.close();
  },
};

(async () => {
  const b = await chromium.launch({ args: [`--host-resolver-rules=${RULES}`, "--disable-blink-features=AutomationControlled"] });
  for (const name of process.argv.slice(3).length ? process.argv.slice(3) : Object.keys(S)) {
    try { await S[name](b); } catch (e) { ok(false, `${name}: ${e.message.split("\n")[0]}`); }
  }
  await b.close();
})();
