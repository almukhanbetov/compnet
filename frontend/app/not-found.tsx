import type { Metadata } from "next";
import PlaceholderPage from "@/components/layout/PlaceholderPage";
import { getServerTranslations } from "@/lib/i18n.server";

export async function generateMetadata(): Promise<Metadata> {
  return (await getServerTranslations()).common.seo.notFound;
}

export default async function NotFound() {
  const { common } = await getServerTranslations();

  return <PlaceholderPage {...common.notFound} />;
}
