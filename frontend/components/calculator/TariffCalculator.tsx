"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Minus, Plus } from "lucide-react";
import { useLocale } from "@/components/providers/LocaleProvider";
import { byId, fill } from "@/lib/i18n";
import { tariffHref, useTariffQuote } from "@/lib/api/tariffs";
import { tariffTexts, tariffTranslations } from "@/data/i18n/tariffs";
import { tenge } from "@/components/tariffs/format";
import type { ApiTariff, TariffChoice } from "@/types/api/tariffs";

const pill = (active: boolean) =>
  `rounded-2xl border p-4 text-left transition ${
    active
      ? "border-cyan-400/40 bg-cyan-400/10"
      : "border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.03] hover:bg-[var(--text-primary)]/[0.06]"
  }`;

/**
 * Pricing a tariff with its extra modules. Every amount comes from the
 * server's quote (GET /api/v1/tariffs/:slug/quote); the request is priced
 * again when it is saved.
 */
export default function TariffCalculator({ tariffs, initial }: { tariffs: ApiTariff[]; initial: TariffChoice | null }) {
  const { t, locale } = useLocale();
  const tt = tariffTranslations[locale];
  const c = tt.calculator;
  const [choice, setChoice] = useState<TariffChoice>(
    () => initial ?? { slug: tariffs[0].slug, moduleIds: [], externalApiCount: 0 },
  );
  const tariff = tariffs.find((item) => item.slug === choice.slug) ?? tariffs[0];
  const { status, quote } = useTariffQuote(choice);
  const perUnit = tariff.modules.find((m) => m.per_unit && choice.moduleIds.includes(m.id));

  const chooseTariff = (slug: string) => setChoice({ slug, moduleIds: [], externalApiCount: 0 });
  const toggle = (id: string, isPerUnit: boolean) =>
    setChoice((prev) => {
      const on = prev.moduleIds.includes(id);
      return {
        ...prev,
        moduleIds: on ? prev.moduleIds.filter((m) => m !== id) : [...prev.moduleIds, id],
        externalApiCount: isPerUnit ? (on ? 0 : Math.max(prev.externalApiCount, 1)) : prev.externalApiCount,
      };
    });

  return (
    <section className="px-6 py-8 md:py-12" data-testid="tariff-calculator">
      <div className="mx-auto grid max-w-[1200px] gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8 rounded-[28px] border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.03] p-7 backdrop-blur-xl md:p-10">
          <div>
            <p className="text-sm font-medium text-slate-300 light:text-slate-700">{c.chooseTariff}</p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {tariffs.map((item) => (
                <button key={item.slug} type="button" aria-pressed={item.slug === choice.slug} onClick={() => chooseTariff(item.slug)} className={pill(item.slug === choice.slug)}>
                  <span className="block text-sm font-semibold text-slate-100 light:text-slate-900">{tariffTexts(item, locale).title}</span>
                  <span className="mt-1 block text-xs text-slate-400 light:text-slate-600">
                    {item.promotion
                      ? fill(tt.promoPrice, { price: tenge(item.promotion.price_tenge), old: tenge(item.price_tenge) })
                      : item.price_kind === "from"
                        ? fill(tt.from, { price: tenge(item.price_tenge) })
                        : tenge(item.price_tenge)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-slate-300 light:text-slate-700">{c.modules}</p>
            {tariff.modules.length === 0 ? (
              <p className="mt-3 text-sm text-slate-400 light:text-slate-600">{c.noModules}</p>
            ) : (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {tariff.modules.map((m) => {
                  const checked = choice.moduleIds.includes(m.id);
                  return (
                    <label
                      key={m.id}
                      className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 transition ${
                        checked ? "border-cyan-400/40 bg-cyan-400/10" : "border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.03]"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <input type="checkbox" checked={checked} onChange={() => toggle(m.id, m.per_unit)} className="h-4 w-4 shrink-0 accent-violet-500" />
                        <span className="text-sm text-slate-200 light:text-slate-800">{byId(t.catalog.modules, m.id) ?? m.label}</span>
                      </span>
                      <span className="shrink-0 text-xs text-slate-400 light:text-slate-600">
                        +{tenge(m.price_tenge)}
                        {m.per_unit ? t.catalog.form.perIntegration : ""}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
            {perUnit ? (
              <div className="mt-4 flex items-center gap-3">
                <span className="text-sm text-slate-400 light:text-slate-600">{c.integrations}</span>
                <button type="button" aria-label={t.catalog.form.decrease} onClick={() => setChoice((p) => ({ ...p, externalApiCount: Math.max(1, p.externalApiCount - 1) }))} className="rounded-lg border border-[var(--text-primary)]/15 p-1.5">
                  <Minus className="h-4 w-4" aria-hidden="true" />
                </button>
                <span className="w-6 text-center text-sm tabular-nums">{choice.externalApiCount}</span>
                <button type="button" aria-label={t.catalog.form.increase} onClick={() => setChoice((p) => ({ ...p, externalApiCount: Math.min(50, p.externalApiCount + 1) }))} className="rounded-lg border border-[var(--text-primary)]/15 p-1.5">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.03] p-7 backdrop-blur-xl lg:sticky lg:top-24" data-testid="tariff-quote">
          <p className="text-lg font-semibold text-slate-100 light:text-slate-900">{tariffTexts(tariff, locale).title}</p>
          {status === "loading" ? (
            <p className="mt-3 flex items-center gap-2 text-sm text-slate-400" role="status">
              <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              {c.loading}
            </p>
          ) : status === "error" || !quote ? (
            <p role="alert" className="mt-3 text-sm leading-6 text-slate-300 light:text-slate-700">{c.failed}</p>
          ) : (
            <>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-3 text-slate-300 light:text-slate-700">
                  <dt>{c.base}</dt>
                  <dd className="tabular-nums">{tenge(quote.base_price_tenge)}</dd>
                </div>
                {quote.discount_tenge > 0 ? (
                  <div className="flex justify-between gap-3 text-cyan-200 light:text-cyan-800">
                    <dt>{c.promo}</dt>
                    <dd className="tabular-nums">−{tenge(quote.discount_tenge)}</dd>
                  </div>
                ) : null}
                {quote.modules_total_tenge > 0 ? (
                  <div className="flex justify-between gap-3 text-slate-300 light:text-slate-700">
                    <dt>{c.modulesTotal}</dt>
                    <dd className="tabular-nums">+{tenge(quote.modules_total_tenge)}</dd>
                  </div>
                ) : null}
              </dl>
              <p className="mt-4 border-t border-[var(--text-primary)]/10 pt-4 text-sm text-slate-400">{c.total}</p>
              <p className="bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-300 bg-clip-text text-3xl font-bold text-transparent light:from-violet-600 light:via-blue-600 light:to-cyan-600" data-testid="tariff-total">
                {quote.price_kind === "from" ? fill(tt.from, { price: tenge(quote.final_price_tenge) }) : tenge(quote.final_price_tenge)}
              </p>
              {quote.price_kind === "from" ? <p className="mt-2 text-xs text-slate-400">{c.fromNote}</p> : null}
            </>
          )}
          <Link
            href={tariffHref("/contact", choice)}
            className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-5 py-3 text-sm font-semibold text-white"
          >
            {c.order}
          </Link>
        </div>
      </div>
    </section>
  );
}
