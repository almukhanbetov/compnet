import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CaseStudyTemplate from "@/components/portfolio/CaseStudyTemplate";
import { caseStudyPages } from "@/data/caseStudyPages";
import { fetchPortfolioCase } from "@/lib/api/content";
import { byId, fill } from "@/lib/i18n";
import { getRequestLocale, getServerTranslations } from "@/lib/i18n.server";

export const dynamic = "force-dynamic";

interface CaseStudyPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: CaseStudyPageProps): Promise<Metadata> {
  const { slug } = await params;
  if (byId(caseStudyPages, slug)) {
    return {};
  }
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
  // Cases with their own page live there; keep the old URL working.
  const ownPage = byId(caseStudyPages, slug);
  if (ownPage) {
    permanentRedirect(ownPage);
  }
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
