import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CtaSection from "@/components/home/CtaSection";
import PricingHero from "@/components/pricing/PricingHero";
import PricingGrid from "@/components/pricing/PricingGrid";
import TariffCards from "@/components/tariffs/TariffCards";
import PriceFactors from "@/components/pricing/PriceFactors";
import WorkFormats from "@/components/pricing/WorkFormats";
import PricingProcess from "@/components/pricing/PricingProcess";
import PricingFaq from "@/components/pricing/PricingFaq";
import { fetchPricingCards, fetchTariffs } from "@/lib/api/content";
import { getRequestLocale, getServerTranslations } from "@/lib/i18n.server";
import { withCanonical } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return withCanonical("/pricing", (await getServerTranslations()).common.seo.pricing);
}

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const [pricingCards, tariffs] = await Promise.all([fetchPricingCards(await getRequestLocale()), fetchTariffs()]);

  return (
    <>
      <Header />

      <main>
        <PricingHero />
        {/* Tariffs appear only once an administrator activates them. */}
        <TariffCards tariffs={tariffs} />
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
