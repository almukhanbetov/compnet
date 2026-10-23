// Production, read-only: open public pages, do not click anything, send nothing.
const { chromium } = require(process.argv[2]);
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ locale: "ru-RU", viewport: { width: 1366, height: 900 } })).newPage();
  const seen = []; p.on("request", (r) => { if (r.method() !== "GET" || /analytics\/events|google-analytics|googletagmanager|collect/.test(r.url())) seen.push(r.method() + " " + r.url().split("?")[0]); });
  for (const path of ["/services/website-development", "/services/mobile-app-development"]) {
    await p.goto("https://compnet.kz" + path, { waitUntil: "networkidle" });
    const banner = await p.locator("#consent-title").isVisible().catch(() => false);
    const st = await p.evaluate(() => ({ consent: localStorage.getItem("compnet-consent"), session: localStorage.getItem("compnet-a-session"), visitor: localStorage.getItem("compnet-a-visitor") }));
    console.log(`${path}: consent banner ${banner ? "shown" : "NOT shown"}; storage before choice ${JSON.stringify(st)}; form ${await p.locator("form #description").count()}`);
  }
  console.log("non-GET / analytics requests before any choice:", seen.length ? seen : "none");
  await b.close();
})();
