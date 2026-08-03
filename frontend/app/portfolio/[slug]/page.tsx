import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CaseStudyTemplate from "@/components/portfolio/CaseStudyTemplate";
import { fetchPortfolioCase } from "@/lib/api/content";

export const dynamic = "force-dynamic";

interface CaseStudyPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: CaseStudyPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await fetchPortfolioCase(slug);

  if (!project) {
    return {};
  }

  return {
    title: `${project.title} | Портфолио COMPNET`,
    description: project.summary,
  };
}

export default async function CaseStudyPage({ params }: CaseStudyPageProps) {
  const { slug } = await params;
  const project = await fetchPortfolioCase(slug);

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
