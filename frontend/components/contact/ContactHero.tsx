"use client";

import {
  Clock,
  ShieldCheck,
  MessageSquare,
  Sparkles,
  ArrowDown,
  type LucideIcon,
} from "lucide-react";
import { useLocale } from "@/components/providers/LocaleProvider";
import PageHeroVisual from "@/components/ui/PageHeroVisual";
import { heroVisuals } from "@/data/heroVisuals";
import { heroVisualAlts } from "@/data/i18n/heroVisuals";
import type { ContactAdvantageKey } from "@/types/i18n";

const advantages: Array<{ key: ContactAdvantageKey; icon: LucideIcon }> = [
  { key: "reply", icon: Clock },
  { key: "estimate", icon: Sparkles },
  { key: "nda", icon: ShieldCheck },
  { key: "format", icon: MessageSquare },
];

export default function ContactHero() {
  const { t, locale } = useLocale();
  const hero = t.contactPage.hero;

  return (
    <PageHeroVisual
      badge={hero.badge}
      title={
        <>
          {hero.titleStart}{" "}
          <span className="bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent">
            {hero.titleAccent}
          </span>
        </>
      }
      description={hero.description}
      image={heroVisuals.contact}
      alt={heroVisualAlts[locale].contact}
      primaryCTA={{ label: hero.ctaPrimary, href: "#estimate-form", icon: <ArrowDown className="h-4 w-4" aria-hidden="true" /> }}
      secondaryCTA={{ label: hero.ctaSecondary, href: "/calculator" }}
    >
      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {advantages.map(({ key, icon: Icon }) => (
          <li
            key={key}
            className="flex items-center gap-2 rounded-xl border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.03] px-4 py-2.5 text-sm text-slate-300 light:text-slate-700"
          >
            <Icon className="h-4 w-4 shrink-0 text-cyan-300 light:text-cyan-700" aria-hidden="true" />
            {hero.advantages[key]}
          </li>
        ))}
      </ul>
    </PageHeroVisual>
  );
}
