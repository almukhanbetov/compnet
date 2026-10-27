import { ArrowRight } from "lucide-react";
import PageHeroVisual from "@/components/ui/PageHeroVisual";
import { heroVisuals } from "@/data/heroVisuals";
import { heroVisualAlts } from "@/data/i18n/heroVisuals";
import { getRequestLocale, getServerTranslations } from "@/lib/i18n.server";

export default async function PortfolioHero() {
  const [{ portfolio, common }, locale] = await Promise.all([getServerTranslations(), getRequestLocale()]);

  return (
    <PageHeroVisual
      badge={portfolio.hero.badge}
      title={
        <>
          {portfolio.hero.titleStart}{" "}
          <span className="bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent">COMPNET</span>
        </>
      }
      description={portfolio.hero.description}
      image={heroVisuals.portfolio}
      alt={heroVisualAlts[locale].portfolio}
      primaryCTA={{ label: common.discussProject, href: "/contact", icon: <ArrowRight className="h-4 w-4" aria-hidden="true" /> }}
    />
  );
}
