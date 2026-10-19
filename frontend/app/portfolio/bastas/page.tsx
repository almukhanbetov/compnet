import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import BastasCaseStudy, { BASTAS_SCREENSHOT } from "@/components/portfolio/BastasCaseStudy";
import { bastasCaseTranslations } from "@/data/i18n/bastasCase";
import { getRequestLocale } from "@/lib/i18n.server";

const PATH = "/portfolio/bastas";
const ogLocales = { ru: "ru_RU", kk: "kk_KZ", en: "en_US" } as const;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const t = bastasCaseTranslations[locale];
  return {
    title: t.seo.title,
    description: t.seo.description,
    // Routes are not localized (the language comes from a cookie), so every
    // language shares one canonical URL.
    alternates: { canonical: PATH },
    openGraph: {
      type: "article",
      url: PATH,
      siteName: "COMPNET",
      locale: ogLocales[locale],
      title: t.seo.title,
      description: t.seo.description,
      images: [
        {
          url: BASTAS_SCREENSHOT.src,
          width: BASTAS_SCREENSHOT.width,
          height: BASTAS_SCREENSHOT.height,
          alt: t.imageAlt,
        },
      ],
    },
  };
}

export default async function BastasCasePage() {
  const t = bastasCaseTranslations[await getRequestLocale()];

  return (
    <>
      <Header />
      <BastasCaseStudy t={t} />
      <Footer />
    </>
  );
}
