import type { Metadata } from "next";
import PlaceholderPage from "@/components/layout/PlaceholderPage";
import { heroVisuals } from "@/data/heroVisuals";
import { heroVisualAlts } from "@/data/i18n/heroVisuals";
import { getRequestLocale, getServerTranslations } from "@/lib/i18n.server";
import { placeholderRobots } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return { ...(await getServerTranslations()).common.seo.solutions, robots: placeholderRobots };
}

export default async function SolutionsPage() {
  const [{ common }, locale] = await Promise.all([getServerTranslations(), getRequestLocale()]);

  return (
    <PlaceholderPage
      {...common.placeholders.solutions}
      showDiscussCta
      visual={{ image: heroVisuals.solutions, alt: heroVisualAlts[locale].solutions }}
    />
  );
}
