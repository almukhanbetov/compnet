// Test-only stand-ins for external sites (search results, webmail, Instagram's link shim),
// reachable only from the test Chromium via --host-resolver-rules. Each page shows one link;
// the browser navigates by a real click and sets the referrer itself.
const https = require("https"); const fs = require("fs");
const opts = { key: fs.readFileSync(__dirname + "/ref.key"), cert: fs.readFileSync(__dirname + "/ref.crt") };
https.createServer(opts, (req, res) => {
  const u = new URL(req.url, "https://" + req.headers.host);
  const to = u.searchParams.get("to") || "http://compnet.test:3006/";
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  // Google search and Instagram's l.instagram.com send only the origin as referrer.
  res.end(`<!doctype html><meta name="referrer" content="origin"><title>${esc(req.headers.host)}</title>
<h1>${esc(req.headers.host)} (test stand-in)</h1><a id="result" href="${esc(to)}">COMPNET result</a>`);
}).listen(8443, "127.0.0.1");
