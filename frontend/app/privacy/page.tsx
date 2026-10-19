import type { Metadata } from "next";
import LegalPageTemplate from "@/components/layout/LegalPageTemplate";
import { getServerTranslations } from "@/lib/i18n.server";
import { withCanonical } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return withCanonical("/privacy", (await getServerTranslations()).common.seo.privacy);
}

export default async function PrivacyPage() {
  const { common } = await getServerTranslations();

  return <LegalPageTemplate {...common.legal.privacy} />;
}
