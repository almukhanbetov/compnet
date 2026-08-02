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

export const metadata: Metadata = {
  title: "Цены на разработку | COMPNET",
  description:
    "Ориентировочная стоимость разработки сайтов, web- и мобильных приложений, AI-решений, backend и поддержки в COMPNET.",
};

export default function PricingPage() {
  return (
    <>
      <Header />

      <main>
        <PricingHero />
        <PricingGrid />
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
