// Test-only: lets the Next.js server process resolve the local test domains (*.compnet.test).
const dns = require("dns");
const orig = dns.lookup;
dns.lookup = function (host, opts, cb) {
  if (typeof opts === "function") { cb = opts; opts = {}; }
  if (/(^|\.)compnet\.test$/.test(host)) {
    const o = typeof opts === "number" ? { family: opts } : opts || {};
    return process.nextTick(() => (o.all ? cb(null, [{ address: "127.0.0.1", family: 4 }]) : cb(null, "127.0.0.1", 4)));
  }
  return orig.call(dns, host, opts, cb);
};
