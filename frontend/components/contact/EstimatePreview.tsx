"use client";

import { Wallet, Info } from "lucide-react";
import { useLocale } from "@/components/providers/LocaleProvider";
import { projectPricingList } from "@/data/projectPricing";
import { usePricingCatalog } from "@/lib/api/pricingCatalog";
import type { PricingCatalogState } from "@/lib/api/pricingCatalog";
import { fill } from "@/lib/i18n";
import type { ProjectType } from "@/types/contactPage";
import type { ApiTariff, ApiTariffQuote } from "@/types/api/tariffs";
import { tariffTexts, tariffTranslations } from "@/data/i18n/tariffs";
import { tenge } from "@/components/tariffs/format";

interface EstimatePreviewProps {
  projectType: ProjectType | "";
  /** The form's catalog (the base price it sends is the one shown here). */
  pricing?: PricingCatalogState;
  /** A request for a tariff: its server quote (the form's, the amount it
   * sends) replaces the project type's price. */
  tariff?: { tariff: ApiTariff; quote: { status: "idle" | "loading" | "ready" | "error"; quote: ApiTariffQuote | null } };
}

export default function EstimatePreview({ projectType, pricing: given, tariff }: EstimatePreviewProps) {
  const { t, locale } = useLocale();
  const quote = tariff?.quote ?? { status: "idle", quote: null };
  const e = t.contactPage.estimate;
  const entry = projectPricingList.find((item) => item.label === projectType);
  // The starting price comes only from the server's catalog; none is shown
  // while it loads or when it cannot be loaded.
  const own = usePricingCatalog();
  const pricing = given ?? own;
  const catalogType =
    pricing.status === "ready" && entry ? pricing.catalog.project_types.find((p) => p.id === entry.projectType) : undefined;

  return (
    <div className="rounded-2xl border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.03] p-7 backdrop-blur-xl lg:sticky lg:top-24">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600/30 to-cyan-400/20 text-cyan-300 light:text-cyan-700">
        <Wallet className="h-5 w-5" aria-hidden="true" />
      </span>

      <p className="mt-4 text-lg font-semibold text-slate-100 light:text-slate-900">
        {e.title}
      </p>

      {tariff ? (
        <>
          <p className="mt-2 text-sm text-slate-400 light:text-slate-600">{tariffTexts(tariff.tariff, locale).title}</p>
          {quote.status === "ready" && quote.quote ? (
            <p className="mt-3 bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-300 bg-clip-text text-3xl font-bold text-transparent light:from-violet-600 light:via-blue-600 light:to-cyan-600">
              {quote.quote.price_kind === "from"
                ? fill(tariffTranslations[locale].from, { price: tenge(quote.quote.final_price_tenge) })
                : tenge(quote.quote.final_price_tenge)}
            </p>
          ) : quote.status === "error" ? (
            <p className="mt-3 text-sm leading-6 text-slate-300 light:text-slate-700">{e.unavailable}</p>
          ) : (
            <p className="mt-3 text-sm text-slate-400 light:text-slate-600" role="status">{e.loading}</p>
          )}
        </>
      ) : entry ? (
        <>
          <p className="mt-2 text-sm text-slate-400 light:text-slate-600">
            {t.contactPage.form.options.projectType[entry.label]}
          </p>
          {pricing.status === "loading" ? (
            <p className="mt-3 text-sm text-slate-400 light:text-slate-600" role="status">{e.loading}</p>
          ) : pricing.status === "error" ? (
            <p className="mt-3 text-sm leading-6 text-slate-300 light:text-slate-700">{e.unavailable}</p>
          ) : (
            <p className="mt-3 bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-300 bg-clip-text text-3xl font-bold text-transparent light:from-violet-600 light:via-blue-600 light:to-cyan-600">
              {!catalogType || catalogType.base_price_tenge === null
                ? e.individual
                : fill(e.from, { price: `${catalogType.base_price_tenge.toLocaleString("ru-RU")} ₸` })}
            </p>
          )}
        </>
      ) : (
        <p className="mt-3 text-sm leading-6 text-slate-400 light:text-slate-600">
          {e.choose}
        </p>
      )}

      <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 light:border-cyan-600/30 light:bg-cyan-500/10">
        <Info
          className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300 light:text-cyan-700"
          aria-hidden="true"
        />
        <p className="text-xs leading-5 text-cyan-100 light:text-cyan-900">
          {e.disclaimer}
        </p>
      </div>
    </div>
  );
}
