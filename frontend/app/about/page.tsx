import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import AboutPage, { type AboutWorkExample } from "@/components/about/AboutPage";
import { caseStudyPages } from "@/data/caseStudyPages";
import { aboutTranslations } from "@/data/i18n/about";
import { websiteDevelopmentTranslations, websiteExampleSlugs } from "@/data/i18n/websiteDevelopment";
import { fetchPortfolioCases } from "@/lib/api/content";
import { byId, fill } from "@/lib/i18n";
import { getRequestLocale, getServerTranslations } from "@/lib/i18n.server";
import { withCanonical } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return withCanonical("/about", aboutTranslations[await getRequestLocale()].seo);
}

export default async function AboutRoutePage() {
  const locale = await getRequestLocale();
  // Falls back to [] on failure, so the page always renders.
  const [cases, { portfolio, homeContacts }] = await Promise.all([
    fetchPortfolioCases(locale),
    getServerTranslations(),
  ]);

  // The owner-confirmed cases, in their fixed order; no durations or results.
  const fromApi: AboutWorkExample[] = websiteExampleSlugs.flatMap((slug) => {
    const item = cases.find((c) => c.slug === slug);
    if (!item?.screenshotUrl) return [];
    return [
      {
        title: item.title,
        summary: item.summary,
        imageSrc: item.screenshotUrl,
        imageAlt: fill(portfolio.card.screenshotAlt, { title: item.title }),
        href: byId(caseStudyPages, slug) ?? `/portfolio/${slug}`,
      },
    ];
  });
  // Without the portfolio API, still show BASTAS from local data.
  const bastas = websiteDevelopmentTranslations[locale].works;
  const examples: AboutWorkExample[] =
    fromApi.length > 0
      ? fromApi
      : [
          {
            title: bastas.bastasTitle,
            summary: bastas.bastasText,
            imageSrc: "/portfolio/bastas-stone-catalog.jpg",
            imageAlt: bastas.bastasImageAlt,
            href: "/portfolio/bastas",
          },
        ];

  return (
    <>
      <Header />
      <AboutPage t={aboutTranslations[locale]} city={homeContacts.city} examples={examples} />
      <Footer />
    </>
  );
}
