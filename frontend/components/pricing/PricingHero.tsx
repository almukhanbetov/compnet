import { ArrowRight } from "lucide-react";
import PageHeroVisual from "@/components/ui/PageHeroVisual";
import { heroVisuals } from "@/data/heroVisuals";
import { heroVisualAlts } from "@/data/i18n/heroVisuals";
import { getRequestLocale, getServerTranslations } from "@/lib/i18n.server";

export default async function PricingHero() {
  const [{ pricing, common }, locale] = await Promise.all([getServerTranslations(), getRequestLocale()]);

  return (
    <PageHeroVisual
      badge={pricing.hero.badge}
      title={
        <>
          {pricing.hero.titleStart}{" "}
          <span className="bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent">{pricing.hero.titleAccent}</span>
        </>
      }
      description={pricing.hero.description}
      image={heroVisuals.pricing}
      alt={heroVisualAlts[locale].pricing}
      primaryCTA={{ label: common.discussProject, href: "/contact", icon: <ArrowRight className="h-4 w-4" aria-hidden="true" /> }}
      secondaryCTA={{ label: pricing.hero.calculate, href: "/calculator", icon: <ArrowRight className="h-4 w-4" aria-hidden="true" /> }}
    />
  );
}
