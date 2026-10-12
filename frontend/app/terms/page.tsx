import type { Metadata } from "next";
import LegalPageTemplate from "@/components/layout/LegalPageTemplate";
import { getServerTranslations } from "@/lib/i18n.server";

export async function generateMetadata(): Promise<Metadata> {
  return (await getServerTranslations()).common.seo.terms;
}

export default async function TermsPage() {
  const { common } = await getServerTranslations();

  return <LegalPageTemplate {...common.legal.terms} />;
}
