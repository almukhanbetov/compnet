"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale } from "@/components/providers/LocaleProvider";
import CalculatorForm from "@/components/calculator/CalculatorForm";
import TariffCalculator from "@/components/calculator/TariffCalculator";
import { tariffChoiceFromUrl, useTariffs } from "@/lib/api/tariffs";
import { tariffTranslations } from "@/data/i18n/tariffs";
import type { TariffChoice } from "@/types/api/tariffs";

/**
 * /calculator: the individual calculator, and — only when active tariffs
 * exist — a switch to the tariffs. Both stay mounted (the other one
 * hidden), so switching back and forth keeps the visitor's choices.
 */
export default function CalculatorModes() {
  const { locale } = useLocale();
  const c = tariffTranslations[locale].calculator;
  const { tariffs } = useTariffs();
  // A link like /calculator?tariff=start opens that tariff (the route's own
  // parameters: after a client-side navigation window.location may lag).
  const searchParams = useSearchParams();
  const fromUrl = useMemo<TariffChoice | null>(() => tariffChoiceFromUrl(searchParams.toString()), [searchParams]);
  const [picked, setMode] = useState<"tariffs" | "individual" | null>(null);
  const initial = fromUrl && tariffs.some((t) => t.slug === fromUrl.slug) ? fromUrl : null;
  const mode = picked ?? (initial ? "tariffs" : "individual");

  if (tariffs.length === 0) return <CalculatorForm />;

  return (
    <>
      <div className="px-6 pt-4">
        <div role="group" aria-label={c.modes} className="mx-auto flex max-w-[1200px] flex-wrap gap-2">
          {(["tariffs", "individual"] as const).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={mode === key}
              onClick={() => setMode(key)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                mode === key
                  ? "bg-gradient-to-r from-violet-600 to-blue-600 text-white"
                  : "border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 text-slate-300 hover:bg-[var(--text-primary)]/10 light:text-slate-700"
              }`}
            >
              {c[key]}
            </button>
          ))}
        </div>
      </div>
      <div hidden={mode !== "tariffs"}>
        <TariffCalculator key={initial?.slug ?? "default"} tariffs={tariffs} initial={initial} />
      </div>
      <div hidden={mode !== "individual"}>
        <CalculatorForm />
      </div>
    </>
  );
}
