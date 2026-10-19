import type { Metadata } from "next";
import LegalPageTemplate from "@/components/layout/LegalPageTemplate";
import { getServerTranslations } from "@/lib/i18n.server";
import { withCanonical } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return withCanonical("/cookies", (await getServerTranslations()).common.seo.cookies);
}

export default async function CookiesPage() {
  const { common } = await getServerTranslations();

  return <LegalPageTemplate {...common.legal.cookies} />;
}
