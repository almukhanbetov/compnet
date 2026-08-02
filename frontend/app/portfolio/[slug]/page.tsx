import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CaseStudyTemplate from "@/components/portfolio/CaseStudyTemplate";
import { portfolioCaseStudies } from "@/data/portfolioPage";

interface CaseStudyPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return portfolioCaseStudies.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({
  params,
}: CaseStudyPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = portfolioCaseStudies.find((item) => item.slug === slug);

  if (!project) {
    notFound();
  }

  return {
    title: `${project.title} | Портфолио COMPNET`,
    description: project.summary,
  };
}

export default async function CaseStudyPage({ params }: CaseStudyPageProps) {
  const { slug } = await params;
  const project = portfolioCaseStudies.find((item) => item.slug === slug);

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
