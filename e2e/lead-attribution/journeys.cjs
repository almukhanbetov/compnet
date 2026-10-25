// Stage 8.6C browser journeys (extended in 8.6G/8.6I/8.6K) against the isolated local stack (never production).
// Real Chromium; external sites are local test stand-ins mapped with --host-resolver-rules,
// so every referrer is set by the browser itself after a real click.
// usage: node journeys.cjs <playwright> <out.jsonl> <scenario...>
const { chromium } = require(process.argv[2]);
const fs = require("fs");
const OUT = process.argv[3];
const WANT = process.argv.slice(4);
const SITE = "http://compnet.test:3006";
const RULES = "MAP compnet.test 127.0.0.1, MAP api.compnet.test 127.0.0.1, MAP www.google.com:443 127.0.0.1:8443, MAP mail.google.com:443 127.0.0.1:8443, MAP l.instagram.com:443 127.0.0.1:8443, MAP m.facebook.com:443 127.0.0.1:8443";
// An ordinary desktop Chrome: the site and the server ignore automation and headless browsers.
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36";
const rnd = () => Math.random().toString(16).slice(2, 8);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const UA_FOR = {
  cubot_android: "Mozilla/5.0 (Linux; Android 13; CUBOT KINGKONG 9 Build/TP1A.220624.014) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36",
};

async function visitor(browser, consent, userAgent = UA) {
  const ctx = await browser.newContext({ userAgent, ignoreHTTPSErrors: true, viewport: { width: 1366, height: 900 }, locale: "ru-RU" });
  if (consent === "granted-before") {
    // The visitor accepted analytics on an earlier visit (choice stored in this browser).
    await ctx.addInitScript(() => {
      if (location.host === "compnet.test:3006" && !localStorage.getItem("compnet-consent")) {
        localStorage.setItem("compnet-consent", JSON.stringify({ v: 1, analytics: true, at: new Date().toISOString() }));
      }
    });
  }
  const page = await ctx.newPage();
  const log = { payload: null, response: null, batches: [], errors: [], urls: [] };
  page.on("request", (r) => {
    if (r.method() === "POST" && r.url().endsWith("/api/v1/project-requests")) log.payload = JSON.parse(r.postData() || "{}");
    if (r.method() === "POST" && r.url().endsWith("/api/v1/analytics/events")) { try { log.batches.push(JSON.parse(r.postData())); } catch { /* ignore */ } }
  });
  page.on("response", async (r) => {
    if (r.request().method() === "POST" && r.url().endsWith("/api/v1/project-requests")) log.response = { status: r.status(), body: await r.json().catch(() => null) };
  });
  page.on("pageerror", (e) => log.errors.push(e.message));
  page.on("framenavigated", (f) => { if (f === page.mainFrame()) log.urls.push(f.url()); });
  return { ctx, page, log };
}

async function fromSite(page, host, target) {
  await page.goto(`https://${host}/?to=${encodeURIComponent(target)}`);
  await Promise.all([page.waitForURL(SITE + "/**"), page.click("#result")]);
  await page.waitForLoadState("networkidle");
}
async function clickLink(page, href) {
  const link = page.locator(`a[href="${href}"]:visible`).first();
  await link.scrollIntoViewIfNeeded();
  await Promise.all([page.waitForURL(SITE + href), link.click()]);
  await page.waitForLoadState("networkidle");
  await sleep(300);
}
async function consentBanner(page, choice) {
  const b = page.getByRole("dialog").filter({ has: page.locator("#consent-title") });
  await b.waitFor({ timeout: 10000 });
  await b.getByRole("button", { name: choice === "accept" ? /Разрешить|Allow/ : /Только необходимые|Necessary/ }).click();
  await sleep(300);
}
async function submitForm(page, name, projectType) {
  await sleep(2600); // the tracker flushes every ~2 s (a quick submit is covered separately)
  const form = page.locator("form:has(#description)").first();
  await form.scrollIntoViewIfNeeded();
  await form.locator("#name").fill(name);
  await form.locator("#phone").fill("7000000001"); // artificial number
  await form.locator("#email").fill("e2e-test@example.test"); // reserved test domain
  if (projectType) await form.locator("#projectType").selectOption(projectType);
  else if (!(await form.locator("#projectType").inputValue())) await form.locator("#projectType").selectOption("Корпоративный сайт");
  await form.locator("#description").fill("Stage 8.6C E2E: искусственная заявка, не обрабатывать.");
  await form.locator("#consent").check();
  await Promise.all([
    page.waitForResponse((r) => r.url().endsWith("/api/v1/project-requests") && r.request().method() === "POST"),
    form.locator('button[type="submit"]').click(),
  ]);
  await sleep(2600); // let the conversion reach the server
}
async function state(page) {
  return page.evaluate(() => {
    const j = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
    return { consent: j("compnet-consent"), visitor: localStorage.getItem("compnet-a-visitor"), session: j("compnet-a-session"), first: j("compnet-a-first"),
      referrer: document.referrer, path: location.pathname };
  });
}

const S = {
  // 4/6: Google organic → home → services → website development → form (consent given before).
  async organic_multi(page) {
    await fromSite(page, "www.google.com", SITE + "/");
    await clickLink(page, "/services");
    await clickLink(page, "/services/website-development");
    return { expect: { channel: "organic_search", source: "google", landing_page: "/", source_page: "/services/website-development", previous_page: "/services" } };
  },
  // 4: Google organic straight to the website development page, form on that page.
  async organic_direct_to_service(page) {
    await fromSite(page, "www.google.com", SITE + "/services/website-development");
    return { expect: { channel: "organic_search", source: "google", landing_page: "/services/website-development", source_page: "/services/website-development", previous_page: "" } };
  },
  // 5/6: Google Ads → mobile apps page → contacts → form.
  async ads_gclid_contact(page) {
    await fromSite(page, "www.google.com", SITE + "/services/mobile-app-development?utm_source=google&utm_medium=cpc&utm_campaign=mobile_apps_almaty&gclid=TESTGCLID-SECRET-VALUE-1");
    await clickLink(page, "/contact");
    return { projectType: "Мобильное приложение", expect: { channel: "paid_search", source: "google", landing_page: "/services/mobile-app-development", source_page: "/contact", previous_page: "/services/mobile-app-development", utm_campaign: "mobile_apps_almaty", ad_click: true } };
  },
  async ads_gbraid(page) {
    await fromSite(page, "www.google.com", SITE + "/services/mobile-app-development?gbraid=TESTGBRAID-SECRET-2");
    return { expect: { channel: "paid_search", source: "google", landing_page: "/services/mobile-app-development", ad_click: true, session: { source: "google", medium: "cpc" } } };
  },
  // A click id that is empty or not a real token is not an ad click (Stage 8.6D).
  async gclid_empty(page) {
    await fromSite(page, "www.google.com", SITE + "/services/website-development?gclid=");
    return { expect: { channel: "organic_search", source: "google", ad_click: false, session: { source: "google", medium: "organic" } } };
  },
  async gclid_junk(page) {
    await fromSite(page, "www.google.com", SITE + "/services/website-development?gclid=abc");
    return { expect: { channel: "organic_search", source: "google", ad_click: false, session: { source: "google", medium: "organic" } } };
  },
  async ads_wbraid(page) {
    await fromSite(page, "www.google.com", SITE + "/services/mobile-app-development?utm_source=google&utm_medium=cpc&utm_campaign=mobile_apps_almaty&wbraid=TESTWBRAID-SECRET-3");
    return { expect: { channel: "paid_search", source: "google", utm_campaign: "mobile_apps_almaty", ad_click: true } };
  },
  // 6: typed address → home → services → mobile apps page → form.
  async direct_multi(page) {
    await page.goto(SITE + "/"); await page.waitForLoadState("networkidle");
    await clickLink(page, "/services");
    await clickLink(page, "/services/mobile-app-development");
    return { expect: { channel: "direct", source: "(direct)", landing_page: "/", source_page: "/services/mobile-app-development", previous_page: "/services" } };
  },
  // A deep link without referrer (messenger, app): unknown by design.
  async deeplink_no_referrer(page) {
    await page.goto(SITE + "/contact"); await page.waitForLoadState("networkidle");
    return { expect: { channel: "unknown", source: "(unknown)", landing_page: "/contact" } };
  },
  async social_instagram(page) {
    await fromSite(page, "l.instagram.com", SITE + "/services/website-development");
    return { expect: { channel: "social", source: "instagram", landing_page: "/services/website-development" } };
  },
  async social_facebook(page) {
    await fromSite(page, "m.facebook.com", SITE + "/");
    await clickLink(page, "/services");
    await clickLink(page, "/services/website-development");
    return { expect: { channel: "social", source: "facebook", landing_page: "/", source_page: "/services/website-development", previous_page: "/services" } };
  },
  // Gmail app on Android opens links with "android-app://com.google.android.gm/" as referrer. Chromium cannot
  // produce that by a click, so the referrer string is set before the page loads: a check of the classification,
  // not of a real Gmail click (Stage 8.6I).
  async gmail_android(page) {
    await page.addInitScript(() => {
      if (location.pathname === "/services/website-development" && !sessionStorage.getItem("e2e-ref")) {
        sessionStorage.setItem("e2e-ref", "1");
        Object.defineProperty(Document.prototype, "referrer", { get: () => "android-app://com.google.android.gm/" });
      }
    });
    await page.goto(SITE + "/services/website-development"); await page.waitForLoadState("networkidle");
    return { expect: { channel: "email", source: "gmail", referrer_host: "com.google.android.gm", session: { source: "gmail", medium: "email" } } };
  },
  // A real browser on a CUBOT phone ("CUBOT" ends in "bot") is a visitor, not a bot (Stage 8.6I).
  async cubot_android(page) {
    await fromSite(page, "www.google.com", SITE + "/services/website-development");
    return { expect: { channel: "organic_search", source: "google", session: { source: "google", medium: "organic" } } };
  },
  // EasyPrivacy (uBlock Origin, Brave, AdGuard) blocks every URL containing "/analytics/event", so visit batches
  // never leave the browser; the request form is not blocked (Stage 8.6J).
  async blocker_easyprivacy(page) {
    await page.route("**/api/v1/analytics/events", (route) => route.abort("blockedbyclient"));
    await fromSite(page, "www.google.com", SITE + "/services/website-development");
    return { expect: { channel: "organic_search", source: "google", landing_page: "/services/website-development" } };
  },
  // Returning visitor (consent given earlier, a direct session still active) clicks an auto-tagged Google Ads
  // link (gclid, no UTM): a new paid session, not a continuation of the direct one (Stage 8.6K).
  async returning_ad_click(page) {
    await page.goto(SITE + "/"); await page.waitForLoadState("networkidle"); await sleep(2600);
    await fromSite(page, "www.google.com", SITE + "/services/mobile-app-development?gclid=TESTGCLID-SECRET-RETURNING");
    return { expect: { channel: "paid_search", source: "google", landing_page: "/services/mobile-app-development", ad_click: true, session: { source: "google", medium: "cpc", first_source: "(direct)" } } };
  },
  // Returning visitor (consent given earlier, last session over) comes from Google and follows a link before the
  // tracker has its settings (slow network): Google stays the source of the new session (Stage 8.6K).
  async returning_early_click(page) {
    await page.goto(SITE + "/"); await page.waitForLoadState("networkidle"); await sleep(2600);
    await page.evaluate(() => { const s = JSON.parse(localStorage.getItem("compnet-a-session")); s.lastActivity -= 31 * 60 * 1000; localStorage.setItem("compnet-a-session", JSON.stringify(s)); });
    await page.route("**/api/v1/analytics/config", async (route) => { await sleep(2500); await route.continue(); });
    await page.goto("https://www.google.com/?to=" + encodeURIComponent(SITE + "/"));
    await Promise.all([page.waitForURL(SITE + "/**"), page.click("#result")]);
    await page.waitForLoadState("domcontentloaded");
    await clickLink(page, "/services");
    await clickLink(page, "/contact");
    return { expect: { channel: "organic_search", source: "google", landing_page: "/", source_page: "/contact", previous_page: "/services", session: { source: "google", medium: "organic", first_source: "(direct)" } } };
  },
  async email_utm(page) {
    await page.goto(SITE + "/services/website-development?utm_source=newsletter&utm_medium=email&utm_campaign=autumn_digest"); await page.waitForLoadState("networkidle");
    return { expect: { channel: "email", source: "newsletter", utm_campaign: "autumn_digest" } };
  },
  async email_webmail(page) {
    await fromSite(page, "mail.google.com", SITE + "/services/website-development");
    return { expect: { channel: "email", source: "gmail" } };
  },
  // 7B: the visitor declines analytics.
  async consent_declined(page) {
    await fromSite(page, "www.google.com", SITE + "/services/website-development?utm_source=google&utm_medium=cpc&utm_campaign=mobile_apps_almaty&gclid=TESTGCLID-DECLINED");
    await consentBanner(page, "decline");
    await clickLink(page, "/contact");
    return { consent: "none", expect: { attribution: null } };
  },
  // 7C: accepts on the third page of the visit (no reload).
  async consent_late(page) {
    await fromSite(page, "www.google.com", SITE + "/services/website-development");
    await clickLink(page, "/services");
    await clickLink(page, "/contact");
    await consentBanner(page, "accept");
    return { consent: "none", expect: { channel: "organic_search", source: "google", landing_page: "/services/website-development", source_page: "/contact", previous_page: "/services" } };
  },
  // 7: never answers the banner (the most common real-world case) and sends the form.
  async consent_ignored(page) {
    await fromSite(page, "www.google.com", SITE + "/services/website-development?utm_source=google&utm_medium=cpc&utm_campaign=ignored_banner");
    return { consent: "none", expect: { attribution: null } };
  },
  // 7: declines, then changes their mind in "Cookie settings" on a later page.
  async consent_declined_then_accepted(page) {
    await fromSite(page, "www.google.com", SITE + "/services/website-development?utm_source=google&utm_medium=cpc&utm_campaign=decline_then_accept");
    await consentBanner(page, "decline");
    await clickLink(page, "/services");
    await page.locator("footer").getByRole("button", { name: /Настройки cookie|Cookie settings/ }).click();
    await consentBanner(page, "accept");
    await clickLink(page, "/contact");
    return { consent: "none", expect: { channel: "direct", source: "(direct)", referrer_host: "", landing_page: "/services", utm_source: "", session: { source: "(direct)", medium: "(none)" } } };
  },
  // 5/8: UTM values that look like personal data.
  async utm_personal(page) {
    await fromSite(page, "www.google.com", SITE + "/services/website-development?utm_source=google&utm_medium=cpc&utm_campaign=client%40example.com&utm_term=%2B7%20701%20123%2045%2067&utm_content=900101300007");
    return { expect: { channel: "paid_search", source: "google", utm_campaign: "", utm_term: "", utm_content: "" } };
  },
  // 6: a session that expires (30 min idle) before the form is sent.
  async session_timeout(page) {
    await page.clock.install();
    await fromSite(page, "www.google.com", SITE + "/services/website-development");
    await page.clock.fastForward("31:00");
    await clickLink(page, "/contact");
    return { expect: { channel: "direct", source: "(direct)", referrer_host: "", landing_page: "/contact", session: { source: "(direct)", medium: "(none)" } } };
  },
};

(async () => {
  const browser = await chromium.launch({ args: [`--host-resolver-rules=${RULES}`, "--disable-blink-features=AutomationControlled"] });
  for (const name of WANT) {
    const consent = ["consent_declined", "consent_late", "consent_declined_then_accepted", "consent_ignored"].includes(name) ? "none" : "granted-before";
    const { ctx, page, log } = await visitor(browser, consent, UA_FOR[name]);
    const label = `E2E-86C-${name}-${rnd()}`;
    let result = { name, label };
    try {
      const plan = await S[name](page);
      const before = await state(page);
      await submitForm(page, label, plan.projectType);
      const after = await state(page);
      result = { ...result, expect: plan.expect, webdriver: await page.evaluate(() => navigator.webdriver), before, after,
        sent: log.payload ? { analytics_session_id: log.payload.analytics_session_id ?? null, attribution: log.payload.attribution ?? null } : null,
        response: log.response, batches: log.batches.map((b) => ({ session_id: b.session_id, session: b.session, first_touch: b.first_touch, events: b.events.map((e) => `${e.type} ${e.path}`) })),
        rawPayloadHasClickValue: /SECRET|DECLINED/.test(JSON.stringify(log.payload)) || /SECRET|DECLINED/.test(JSON.stringify(log.batches)),
        rawPayloadHasPersonal: /client@example\.com|701 123|900101300007/.test(JSON.stringify(log.payload) + JSON.stringify(log.batches)),
        urls: log.urls.filter((u) => u.startsWith(SITE)).map((u) => u.replace(SITE, "")), errors: log.errors };
    } catch (e) {
      result.error = e.message.split("\n")[0];
    }
    fs.appendFileSync(OUT, JSON.stringify(result) + "\n");
    console.log(`${name}: HTTP ${result.response?.status ?? "-"} | sent session=${result.sent?.analytics_session_id ? "yes" : "no"} | attribution=${result.sent?.attribution ? JSON.stringify(result.sent.attribution) : "none"}${result.error ? " | ERROR " + result.error : ""}`);
    await ctx.close();
  }
  await browser.close();
})();
