import type { MetadataRoute } from "next";
import { caseStudyPages } from "@/data/caseStudyPages";
import { fetchPortfolioCases } from "@/lib/api/content";
import { byId, DEFAULT_LOCALE } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";

// Built per request like the content pages (force-dynamic + no-store
// fetches), so a backend outage at build time is never baked in.
export const dynamic = "force-dynamic";

/** Public pages with real content. Left out on purpose: sign-in, the
 * profile and manager sections, and the "coming soon" placeholders
 * (/solutions, /reviews) — add those once they have content. */
const staticPaths = [
  "/",
  "/services",
  "/services/website-development",
  "/services/mobile-app-development",
  "/pricing",
  "/calculator",
  "/portfolio",
  ...Object.values(caseStudyPages),
  "/training",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
  "/cookies",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // The API lists published cases only. Slugs only, so the locale does not
  // matter; if the backend is down they are missing from this one response.
  const cases = await fetchPortfolioCases(DEFAULT_LOCALE);
  const casePaths = cases
    // Cases with their own page are listed above; their old URL redirects.
    .filter((item) => !byId(caseStudyPages, item.slug))
    .map((item) => `/portfolio/${encodeURIComponent(item.slug)}`);

  return [...new Set([...staticPaths, ...casePaths])].map((path) => ({
    url: `${SITE_URL}${path}`,
  }));
}
