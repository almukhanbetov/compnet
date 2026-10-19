import type { Metadata } from "next";
import PlaceholderPage from "@/components/layout/PlaceholderPage";
import { getServerTranslations } from "@/lib/i18n.server";
import { placeholderRobots } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return { ...(await getServerTranslations()).common.seo.solutions, robots: placeholderRobots };
}

export default async function SolutionsPage() {
  const { common } = await getServerTranslations();

  return <PlaceholderPage {...common.placeholders.solutions} showDiscussCta />;
}
