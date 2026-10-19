import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CtaSection from "@/components/home/CtaSection";
import PortfolioHero from "@/components/portfolio/PortfolioHero";
import PortfolioGrid from "@/components/portfolio/PortfolioGrid";
import { fetchPortfolioCases } from "@/lib/api/content";
import { getRequestLocale, getServerTranslations } from "@/lib/i18n.server";
import { withCanonical } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return withCanonical("/portfolio", (await getServerTranslations()).common.seo.portfolio);
}

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  const projects = await fetchPortfolioCases(await getRequestLocale());

  return (
    <>
      <Header />

      <main>
        <PortfolioHero />
        <PortfolioGrid projects={projects} />
        <CtaSection />
      </main>

      <Footer />
    </>
  );
}
