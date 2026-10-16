import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import WebsiteDevelopmentPage from "@/components/services/WebsiteDevelopmentPage";
import { websiteDevelopmentTranslations } from "@/data/i18n/websiteDevelopment";
import { fetchPricingCards } from "@/lib/api/content";
import { getRequestLocale, getServerTranslations } from "@/lib/i18n.server";
import { SITE_URL } from "@/lib/site";

const PATH = "/services/website-development";
const ogLocales = { ru: "ru_RU", kk: "kk_KZ", en: "en_US" } as const;

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const t = websiteDevelopmentTranslations[locale];
  return {
    metadataBase: new URL(SITE_URL),
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
  const [pricing, { pricing: pricingTexts }] = await Promise.all([
    fetchPricingCards(locale),
    getServerTranslations(),
  ]);

  return (
    <>
      <Header />
      <WebsiteDevelopmentPage
        t={websiteDevelopmentTranslations[locale]}
        factors={pricingTexts.factors.items}
        pricing={pricing}
      />
      <Footer />
    </>
  );
}
