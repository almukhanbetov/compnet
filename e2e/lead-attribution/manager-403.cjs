// The 403 message names the section the manager tried to open (Stage 8.6D), in RU/KZ/EN.
const { chromium } = require(process.argv[2]); const fs = require("fs");
const env = Object.fromEntries(fs.readFileSync(__dirname + "/staff.env", "utf8").trim().split("\n").map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
const SITE = "http://compnet.test:3006";
const want = {
  ru: { analytics: "просмотр статистики", requests: "работу с заявками" },
  kk: { analytics: "статистиканы көруге", requests: "өтінімдермен жұмыс" },
  en: { analytics: "view statistics", requests: "work with requests" },
};
let fails = 0;
(async () => {
  const b = await chromium.launch({ args: ["--host-resolver-rules=MAP compnet.test 127.0.0.1, MAP api.compnet.test 127.0.0.1"] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
  const p = await ctx.newPage();
  await p.goto(SITE + "/manager/login"); await p.locator("#manager-email").waitFor();
  await p.locator("#manager-email").fill(env.MGR_EMAIL); await p.locator("#manager-password").fill(env.MGR_PW);
  await p.locator('form button[type="submit"]').click(); await p.waitForURL((u) => !u.pathname.endsWith("/login"));
  const forbid = (r) => r.fulfill({ status: 403, contentType: "application/json", headers: { "Access-Control-Allow-Origin": SITE, "Access-Control-Allow-Credentials": "true" }, body: '{"error":{"code":"forbidden","message":"недостаточно прав"}}' });
  await p.route("**/api/v1/manager/analytics/**", forbid);
  await p.route("**/api/v1/manager/project-requests**", forbid);
  for (const loc of ["ru", "kk", "en"]) {
    await ctx.addCookies([{ name: "compnet-locale", value: loc, url: SITE }]);
    for (const section of ["analytics", "requests"]) {
      await p.goto(`${SITE}/manager/${section}`); await new Promise((r) => setTimeout(r, 2500));
      const t = (await p.locator("main").innerText()).replace(/\s+/g, " ");
      const okText = t.includes(want[loc][section]) && !/диалог|conversation|диалогтар/i.test(t);
      if (!okText) fails++;
      console.log(`${okText ? "PASS" : "FAIL"} 403 on /manager/${section} [${loc}]: ${t.slice(0, 150)}`);
      if (loc === "ru" && section === "analytics") { await p.screenshot({ path: __dirname + "/manager-403-analytics.png" }); await p.setViewportSize({ width: 375, height: 800 }); await p.screenshot({ path: __dirname + "/manager-403-analytics-375.png" }); await p.setViewportSize({ width: 1440, height: 1000 }); }
    }
  }
  await b.close(); process.exitCode = fails ? 1 : 0;
})();
