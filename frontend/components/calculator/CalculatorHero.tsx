import PageHeroVisual from "@/components/ui/PageHeroVisual";
import { heroVisuals } from "@/data/heroVisuals";
import { heroVisualAlts } from "@/data/i18n/heroVisuals";
import { getRequestLocale, getServerTranslations } from "@/lib/i18n.server";

export default async function CalculatorHero() {
  const [{ catalog }, locale] = await Promise.all([getServerTranslations(), getRequestLocale()]);

  return (
    <PageHeroVisual
      badge={catalog.hero.badge}
      title={
        <>
          {catalog.hero.titleStart}{" "}
          <span className="bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent">{catalog.hero.titleAccent}</span>
        </>
      }
      description={catalog.hero.description}
      image={heroVisuals.calculator}
      alt={heroVisualAlts[locale].calculator}
    />
  );
}
