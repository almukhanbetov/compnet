import type { Metadata } from "next";
import PlaceholderPage from "@/components/layout/PlaceholderPage";
import { getServerTranslations } from "@/lib/i18n.server";
import { placeholderRobots } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return { ...(await getServerTranslations()).common.seo.reviews, robots: placeholderRobots };
}

export default async function ReviewsPage() {
  const { common } = await getServerTranslations();

  return <PlaceholderPage {...common.placeholders.reviews} />;
}
