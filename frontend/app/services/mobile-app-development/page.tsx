import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileAppDevelopmentPage from "@/components/services/MobileAppDevelopmentPage";
import { MOBILE_APP_DEVELOPMENT_PATH, mobileAppDevelopmentTranslations } from "@/data/i18n/mobileAppDevelopment";
import { devopsTranslations } from "@/data/i18n/devops";
import { getRequestLocale, getServerTranslations } from "@/lib/i18n.server";

const ogLocales = { ru: "ru_RU", kk: "kk_KZ", en: "en_US" } as const;

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const t = mobileAppDevelopmentTranslations[locale];
  return {
    title: t.seo.title,
    description: t.seo.description,
    // Routes are not localized (the language comes from a cookie), so every
    // language shares one canonical URL and no hreflang alternates are emitted.
    alternates: { canonical: MOBILE_APP_DEVELOPMENT_PATH },
    openGraph: {
      type: "website",
      url: MOBILE_APP_DEVELOPMENT_PATH,
      siteName: "COMPNET",
      locale: ogLocales[locale],
      title: t.seo.title,
      description: t.seo.description,
    },
  };
}

export default async function MobileAppDevelopmentServicePage() {
  const locale = await getRequestLocale();
  const { pricing } = await getServerTranslations();

  return (
    <>
      <Header />
      <MobileAppDevelopmentPage t={mobileAppDevelopmentTranslations[locale]} devops={devopsTranslations[locale]} factors={pricing.factors.items} />
      <Footer />
    </>
  );
}
