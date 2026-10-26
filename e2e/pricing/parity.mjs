// Parity of the browser's estimate (frontend/lib/pricingCalculator.ts) with the server's
// (backend internal/pricing), on the catalog the API publishes.
// usage:
//   (cd backend && PRICING_PARITY_OUT=/path/cases.jsonl go test ./internal/pricing -run TestWriteParityCases)
//   node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON e2e/pricing/parity.mjs /path/cases.jsonl http://127.0.0.1:8096/api/v1/pricing/catalog
// Every case carries the server's outcome; the browser's must be identical (amounts, duration,
// individual / invalid). Node strips the calculator's TypeScript types itself (Node ≥ 22.18).
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { calculateProjectEstimate } from "../../frontend/lib/pricingCalculator.ts";

const [casesFile, catalogUrl] = process.argv.slice(2);
if (!casesFile || !catalogUrl) {
  console.error("usage: node parity.mjs <cases.jsonl> <catalog-url>");
  process.exit(2);
}
const catalog = (await (await fetch(catalogUrl)).json()).data;

let total = 0, mismatches = 0;
const kinds = { estimate: 0, individual: 0, invalid: 0 };
const shown = [];
for await (const line of createInterface({ input: createReadStream(casesFile) })) {
  if (!line) continue;
  const c = JSON.parse(line);
  total++;
  kinds[c.k]++;
  const got = calculateProjectEstimate(catalog, {
    projectType: c.p, scaleTierId: c.t, selectedModuleIds: c.m ?? [], externalApiCount: c.n,
    multilingual: c.ml, designLevelId: c.d, complexityId: c.c, urgencyId: c.u,
  });
  const same = got.kind === c.k && (c.k !== "estimate" || (got.minimum === c.min && got.maximum === c.max && got.durationLabel === c.dur));
  if (!same) {
    mismatches++;
    if (shown.length < 10) shown.push({ case: c, browser: got });
  }
}
console.log(`${mismatches === 0 ? "PASS" : "FAIL"} ${total} cases (estimate ${kinds.estimate}, individual ${kinds.individual}, invalid ${kinds.invalid}), catalog ${catalog.version}: ${mismatches} differ`);
for (const s of shown) console.log("  ", JSON.stringify(s));
process.exit(mismatches === 0 ? 0 : 1);
