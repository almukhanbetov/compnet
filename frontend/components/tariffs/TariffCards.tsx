"use client";

import Link from "next/link";
import { CheckCircle2, Clock, Tag } from "lucide-react";
import { useLocale } from "@/components/providers/LocaleProvider";
import SectionHeading from "@/components/ui/SectionHeading";
import { translateDuration } from "@/data/i18n/catalog";
import { tariffTexts, tariffTranslations } from "@/data/i18n/tariffs";
import { fill } from "@/lib/i18n";
import { tariffHref } from "@/lib/api/tariffs";
import type { ApiTariff } from "@/types/api/tariffs";
import { promoDate, tenge } from "@/components/tariffs/format";

/**
 * The active tariffs as cards (on /pricing). Renders nothing without any:
 * tariffs exist only once an administrator activates them. A promotional
 * price is shown only while the API offers it (live promotion).
 */
export default function TariffCards({ tariffs }: { tariffs: ApiTariff[] }) {
  const { t, locale } = useLocale();
  const tt = tariffTranslations[locale];
  if (tariffs.length === 0) return null;

  return (
    <section id="tariffs" aria-labelledby="tariffs-title" className="scroll-mt-24 px-6 py-8 md:py-12">
      <div className="mx-auto max-w-[1440px]">
        <SectionHeading align="left" eyebrow={tt.section.eyebrow} title={tt.section.title} description={tt.section.description} titleId="tariffs-title" />
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tariffs.map((tariff) => {
            const text = tariffTexts(tariff, locale);
            const promo = tariff.promotion;
            const regular = tariff.price_kind === "from" ? fill(tt.from, { price: tenge(tariff.price_tenge) }) : tenge(tariff.price_tenge);
            return (
              <article
                key={tariff.slug}
                data-tariff={tariff.slug}
                className="flex flex-col rounded-2xl border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.03] p-7 backdrop-blur-xl"
              >
                <h3 className="text-lg font-semibold text-slate-100 light:text-slate-900">{text.title}</h3>
                {promo ? (
                  <div className="mt-3">
                    <p className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-2xl font-bold text-slate-100 light:text-slate-900">{tenge(promo.price_tenge)}</span>
                      <span className="text-sm text-slate-500 line-through">{tenge(tariff.price_tenge)}</span>
                    </p>
                    <p className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-0.5 text-xs text-cyan-200 light:text-cyan-800">
                      <Tag className="h-3 w-3" aria-hidden="true" />
                      {fill(tt.promoUntil, { date: promoDate(promo.ends_at) })}
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 text-2xl font-bold text-slate-100 light:text-slate-900">{regular}</p>
                )}
                <span className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 light:text-slate-600">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  {translateDuration(t.catalog, tariff.duration_label)}
                </span>
                <p className="mt-4 text-sm leading-6 text-slate-400 light:text-slate-600">{text.description}</p>
                <ul className="mt-5 flex-1 space-y-2.5">
                  {text.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm text-slate-300 light:text-slate-700">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300 light:text-cyan-700" aria-hidden="true" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href={tariffHref("/contact", { slug: tariff.slug, moduleIds: [], externalApiCount: 0 })}
                  className="mt-6 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:scale-[1.02]"
                >
                  {tt.order}
                </Link>
                {tariff.modules.length > 0 ? (
                  <Link
                    href={tariffHref("/calculator", { slug: tariff.slug, moduleIds: [], externalApiCount: 0 })}
                    className="mt-3 inline-flex items-center justify-center rounded-xl border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 px-5 py-3 text-sm font-semibold transition hover:bg-[var(--text-primary)]/10"
                  >
                    {tt.addModules}
                  </Link>
                ) : null}
              </article>
            );
          })}
        </div>
        <p className="mt-6 text-sm text-slate-400 light:text-slate-600">
          {tt.section.individual}{" "}
          <Link href="/calculator" className="font-semibold text-cyan-300 hover:text-cyan-200 light:text-cyan-700">
            {tt.section.individualLink}
          </Link>
        </p>
      </div>
    </section>
  );
}
