import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CalculatorHero from "@/components/calculator/CalculatorHero";
import CalculatorForm from "@/components/calculator/CalculatorForm";
import { getServerTranslations } from "@/lib/i18n.server";
import { withCanonical } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return withCanonical("/calculator", (await getServerTranslations()).common.seo.calculator);
}

export default function CalculatorPage() {
  return (
    <>
      <Header />

      <main>
        <CalculatorHero />
        <CalculatorForm />
      </main>

      <Footer />
    </>
  );
}
