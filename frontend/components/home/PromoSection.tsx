"use client";

import { motion } from "motion/react";
import { Info, MessageCircle, MonitorSmartphone, Phone, Smartphone, TrendingUp, type LucideIcon } from "lucide-react";
import { useLocale } from "@/components/providers/LocaleProvider";
import { companyPhone, whatsappLink } from "@/data/contacts";
import { PROMO_PRICE, promoFeatureOrder } from "@/data/promo";
import type { PromoFeatureIcon } from "@/types/promo";

const featureIcons: Record<PromoFeatureIcon, LucideIcon> = {
  web: MonitorSmartphone,
  mobile: Smartphone,
  promotion: TrendingUp,
};

const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
};

/** "Цифровой старт для бизнеса" offer, right after the hero (anchor #promo). */
export default function PromoSection() {
  const { t } = useLocale();
  const promo = t.promo;

  return (
    <section
      id="promo"
      aria-labelledby="promo-title"
      className="scroll-mt-24 px-4 py-16 sm:px-6 md:py-24"
    >
      <motion.div
        {...reveal}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative mx-auto max-w-[1440px] overflow-hidden rounded-[28px] border border-[var(--text-primary)]/10 bg-[var(--surface)]/70 p-5 backdrop-blur-xl sm:p-10 lg:rounded-[36px] lg:p-14"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-violet-600/15 blur-[110px] light:bg-violet-500/10"
        />

        <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-center lg:gap-14">
          <div>
            <span className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-300 light:border-cyan-600/30 light:bg-cyan-500/10 light:text-cyan-700">
              {promo.label}
            </span>
            <h2 id="promo-title" className="mt-6 text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">
              {promo.title}
            </h2>
            <p className="mt-4 text-lg font-medium leading-7 text-slate-200 light:text-slate-800 md:text-xl">
              {promo.subtitle}
            </p>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-400 light:text-slate-600">
              {promo.description}
            </p>
          </div>

          <div className="rounded-3xl border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.03] p-5 sm:p-8">
            <p className="text-sm font-medium uppercase tracking-wider text-slate-400 light:text-slate-600">{promo.priceLabel}</p>
            <p className="mt-2 text-4xl font-bold leading-none sm:text-5xl">
              <span className="bg-gradient-to-r from-violet-300 via-blue-300 to-cyan-200 bg-clip-text text-transparent light:from-violet-600 light:via-blue-600 light:to-cyan-600">
                {PROMO_PRICE}
              </span>
            </p>
            <p className="mt-2 text-base text-slate-300 light:text-slate-700">{promo.priceNote}</p>

            <div className="mt-8 flex flex-col gap-3">
              <a
                href={whatsappLink(promo.whatsappMessage)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-6 py-3.5 text-center font-semibold text-white shadow-[0_0_24px_rgba(124,58,237,0.3)] transition hover:shadow-[0_0_32px_rgba(124,58,237,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
              >
                <MessageCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
                {promo.whatsappButton}
                <span className="sr-only">{t.header.actions.opensInNewTab}</span>
              </a>
              <a
                href={companyPhone.href}
                className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 px-6 py-3.5 font-semibold transition hover:bg-[var(--text-primary)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
              >
                <Phone className="h-5 w-5 shrink-0" aria-hidden="true" />
                {promo.callButton}
                <span className="hidden font-normal text-slate-400 light:text-slate-600 sm:inline">{companyPhone.display}</span>
              </a>
            </div>
          </div>
        </div>

        <ul className="relative mt-10 grid gap-4 md:grid-cols-3 lg:mt-14 lg:gap-6">
          {promoFeatureOrder.map((id, index) => {
            const Icon = featureIcons[id];
            const feature = promo.features[id];
            return (
              <motion.li
                key={id}
                {...reveal}
                transition={{ duration: 0.45, ease: "easeOut", delay: 0.08 * index }}
                className="rounded-2xl border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.03] p-5 transition duration-300 sm:p-6 hover:-translate-y-1 hover:border-cyan-400/30 hover:shadow-[0_0_30px_rgba(6,182,212,0.12)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600/30 to-cyan-400/20 text-cyan-300 light:text-cyan-700">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-lg font-semibold text-slate-100 light:text-slate-900">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400 light:text-slate-600">{feature.description}</p>
              </motion.li>
            );
          })}
        </ul>

        <div className="relative mt-8 flex gap-3 rounded-2xl border border-[var(--text-primary)]/10 px-5 py-4 lg:mt-10">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-slate-400 light:text-slate-500" aria-hidden="true" />
          <p className="text-sm leading-6 text-slate-300 light:text-slate-700">
            <span className="font-semibold text-slate-200 light:text-slate-800">{promo.termsLabel} </span>
            {promo.terms}
          </p>
        </div>
      </motion.div>
    </section>
  );
}
