import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CaseStudyTemplate from "@/components/portfolio/CaseStudyTemplate";
import { fetchPortfolioCase } from "@/lib/api/content";
import { fill } from "@/lib/i18n";
import { getRequestLocale, getServerTranslations } from "@/lib/i18n.server";

export const dynamic = "force-dynamic";

interface CaseStudyPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: CaseStudyPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await fetchPortfolioCase(slug, await getRequestLocale());

  if (!project) {
    return {};
  }

  const { common } = await getServerTranslations();
  return {
    title: fill(common.seo.portfolioCase, { title: project.title }),
    description: project.summary,
  };
}

export default async function CaseStudyPage({ params }: CaseStudyPageProps) {
  const { slug } = await params;
  const project = await fetchPortfolioCase(slug, await getRequestLocale());

  if (!project) {
    notFound();
  }

  return (
    <>
      <Header />
      <CaseStudyTemplate project={project} />
      <Footer />
    </>
  );
}
