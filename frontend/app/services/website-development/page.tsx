import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import WebsiteDevelopmentPage, { type WebsiteExample } from "@/components/services/WebsiteDevelopmentPage";
import { caseStudyPages } from "@/data/caseStudyPages";
import { websiteDevelopmentTranslations, websiteExampleSlugs } from "@/data/i18n/websiteDevelopment";
import { fetchPortfolioCases, fetchPricingCards } from "@/lib/api/content";
import { heroVisualAlts } from "@/data/i18n/heroVisuals";
import { byId, fill } from "@/lib/i18n";
import { devopsTranslations } from "@/data/i18n/devops";
import { getRequestLocale, getServerTranslations } from "@/lib/i18n.server";

const PATH = "/services/website-development";
const ogLocales = { ru: "ru_RU", kk: "kk_KZ", en: "en_US" } as const;

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const t = websiteDevelopmentTranslations[locale];
  return {
    title: t.seo.title,
    description: t.seo.description,
    // Routes are not localized (the language comes from a cookie), so every
    // language shares one canonical URL.
    alternates: { canonical: PATH },
    openGraph: {
      type: "website",
      url: PATH,
      siteName: "COMPNET",
      locale: ogLocales[locale],
      title: t.seo.title,
      description: t.seo.description,
    },
  };
}

export default async function WebsiteDevelopmentServicePage() {
  const locale = await getRequestLocale();
  // Both API calls fall back to [] on failure, so the page always renders.
  const [pricing, cases, { pricing: pricingTexts, portfolio }] = await Promise.all([
    fetchPricingCards(locale),
    fetchPortfolioCases(locale),
    getServerTranslations(),
  ]);

  // Only the confirmed cases, in their fixed order; no durations or results.
  const examples: WebsiteExample[] = websiteExampleSlugs.flatMap((slug) => {
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

  return (
    <>
      <Header />
      <WebsiteDevelopmentPage
        t={websiteDevelopmentTranslations[locale]}
        devops={devopsTranslations[locale]}
        factors={pricingTexts.factors.items}
        pricing={pricing}
        examples={examples}
        heroVisualAlt={heroVisualAlts[locale].websiteDevelopment}
      />
      <Footer />
    </>
  );
}
