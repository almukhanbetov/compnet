import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import TrainingPage from "@/components/training/TrainingPage";
import { heroVisualAlts } from "@/data/i18n/heroVisuals";
import { trainingTranslations } from "@/data/i18n/training";
import { TRAINING_PATH } from "@/data/training";
import { getRequestLocale } from "@/lib/i18n.server";

const ogLocales = { ru: "ru_RU", kk: "kk_KZ", en: "en_US" } as const;

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const t = trainingTranslations[locale];
  return {
    title: t.seo.title,
    description: t.seo.description,
    // Routes are not localized (the language comes from a cookie): one
    // canonical URL for every language, no hreflang alternates.
    alternates: { canonical: TRAINING_PATH },
    openGraph: {
      type: "website",
      url: TRAINING_PATH,
      siteName: "COMPNET",
      locale: ogLocales[locale],
      title: t.seo.title,
      description: t.seo.description,
    },
  };
}

export default async function Training() {
  const locale = await getRequestLocale();
  return (
    <>
      <Header />
      <TrainingPage t={trainingTranslations[locale]} heroAlt={heroVisualAlts[locale].training} />
      <Footer />
    </>
  );
}
