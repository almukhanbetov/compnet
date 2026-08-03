import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CtaSection from "@/components/home/CtaSection";
import PortfolioHero from "@/components/portfolio/PortfolioHero";
import PortfolioGrid from "@/components/portfolio/PortfolioGrid";
import { fetchPortfolioCases } from "@/lib/api/content";

export const metadata: Metadata = {
  title: "Портфолио | COMPNET",
  description:
    "Реализованные проекты COMPNET — сайты, web- и мобильные приложения, CRM-системы и AI-решения с описанием задачи, процесса и результата.",
};

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  const projects = await fetchPortfolioCases();

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
