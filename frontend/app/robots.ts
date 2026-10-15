import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** Everything is crawlable (including /_next assets) except sign-in, the
 * private sections and the backend API, which shares this origin. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/manager", "/login", "/profile/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
