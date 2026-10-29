import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import DevOpsPage from "@/components/services/DevOpsPage";
import { DEVOPS_PATH } from "@/data/devops";
import { devopsTranslations } from "@/data/i18n/devops";
import { heroVisualAlts } from "@/data/i18n/heroVisuals";
import { getRequestLocale } from "@/lib/i18n.server";

const ogLocales = { ru: "ru_RU", kk: "kk_KZ", en: "en_US" } as const;

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const t = devopsTranslations[locale];
  return {
    title: t.seo.title,
    description: t.seo.description,
    // Routes are not localized (the language comes from a cookie): one
    // canonical URL for every language, no hreflang alternates.
    alternates: { canonical: DEVOPS_PATH },
    openGraph: {
      type: "website",
      url: DEVOPS_PATH,
      siteName: "COMPNET",
      locale: ogLocales[locale],
      title: t.seo.title,
      description: t.seo.description,
    },
  };
}

export default async function DevOpsService() {
  const locale = await getRequestLocale();
  return (
    <>
      <Header />
      <DevOpsPage t={devopsTranslations[locale]} heroAlt={heroVisualAlts[locale].devops} />
      <Footer />
    </>
  );
}
