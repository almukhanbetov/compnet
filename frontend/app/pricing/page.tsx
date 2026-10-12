import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CtaSection from "@/components/home/CtaSection";
import PricingHero from "@/components/pricing/PricingHero";
import PricingGrid from "@/components/pricing/PricingGrid";
import PriceFactors from "@/components/pricing/PriceFactors";
import WorkFormats from "@/components/pricing/WorkFormats";
import PricingProcess from "@/components/pricing/PricingProcess";
import PricingFaq from "@/components/pricing/PricingFaq";
import { fetchPricingCards } from "@/lib/api/content";
import { getRequestLocale, getServerTranslations } from "@/lib/i18n.server";

export async function generateMetadata(): Promise<Metadata> {
  return (await getServerTranslations()).common.seo.pricing;
}

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const pricingCards = await fetchPricingCards(await getRequestLocale());

  return (
    <>
      <Header />

      <main>
        <PricingHero />
        <PricingGrid items={pricingCards} />
        <PriceFactors />
        <WorkFormats />
        <PricingProcess />
        <PricingFaq />
        <CtaSection />
      </main>

      <Footer />
    </>
  );
}
