import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Calculator,
  CheckCircle2,
  ChevronDown,
  Clock,
  Code2,
  Palette,
  Rocket,
  Search,
  Smartphone,
  type LucideIcon,
} from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";
import { BASTAS_SCREENSHOT } from "@/components/portfolio/BastasCaseStudy";
import { byId, fill } from "@/lib/i18n";
import {
  websitePriceFactorIds,
  websiteTypeIds,
  type WebsiteDevelopmentTranslations,
} from "@/data/i18n/websiteDevelopment";
import type { PricingTranslations } from "@/data/i18n/pricing";
import type { PricingCardItem } from "@/types/pricingPage";

interface WebsiteDevelopmentPageProps {
  t: WebsiteDevelopmentTranslations;
  factors: PricingTranslations["factors"]["items"];
  /** Pricing cards from the API; looked up by `price-<type>`. */
  pricing: PricingCardItem[];
}

const includedIcons: LucideIcon[] = [Palette, Smartphone, Code2, Search, Rocket];

const cardClass =
  "rounded-2xl border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.03] p-7 backdrop-blur-xl";
const iconClass =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600/30 to-cyan-400/20 text-cyan-300 light:text-cyan-700";
const primaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-6 py-3.5 font-semibold text-white shadow-[0_0_24px_rgba(124,58,237,0.35)] transition hover:scale-105 hover:shadow-[0_0_32px_rgba(124,58,237,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60";
const secondaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 px-6 py-3.5 font-semibold transition hover:bg-[var(--text-primary)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60";
const textLinkClass =
  "inline-flex min-h-11 items-center gap-2 py-2 text-sm font-semibold text-cyan-300 transition hover:text-cyan-200 light:text-cyan-700 light:hover:text-cyan-800";
const crumbClass = "inline-block -my-1.5 py-1.5 transition hover:text-cyan-300 light:hover:text-cyan-700";

export default function WebsiteDevelopmentPage({ t, factors, pricing }: WebsiteDevelopmentPageProps) {
  const prices = websiteTypeIds
    .map((id) => ({ id, card: pricing.find((item) => item.id === `price-${id}`) }))
    .filter((item): item is { id: (typeof websiteTypeIds)[number]; card: PricingCardItem } => Boolean(item.card));

  return (
    <main className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-violet-600/20 blur-[100px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 top-10 h-80 w-80 rounded-full bg-cyan-400/15 blur-[100px]"
      />

      {/* Hero */}
      <section className="relative px-6 pb-16 pt-20 md:pb-20 md:pt-28">
        <div className="mx-auto max-w-[1280px]">
          <nav aria-label={t.breadcrumb.label} className="text-sm text-slate-400 light:text-slate-600">
            <ol className="flex flex-wrap items-center gap-2">
              <li>
                <Link href="/" className={crumbClass}>
                  {t.breadcrumb.home}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link href="/services" className={crumbClass}>
                  {t.breadcrumb.services}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-slate-300 light:text-slate-700">
                {t.breadcrumb.current}
              </li>
            </ol>
          </nav>

          <div className="mt-8 max-w-3xl">
            <span className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-1.5 text-xs font-medium uppercase tracking-wide text-cyan-300 light:border-cyan-600/30 light:bg-cyan-500/10 light:text-cyan-700">
              {t.hero.badge}
            </span>
            <h1 className="mt-6 text-4xl font-bold leading-tight md:text-6xl">{t.hero.title}</h1>
            <p className="mt-6 text-lg leading-8 text-slate-400 light:text-slate-600">{t.hero.description}</p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
              <Link href="/contact" className={primaryButtonClass}>
                {t.hero.discuss}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link href="/portfolio" className={secondaryButtonClass}>
                {t.hero.portfolio}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Website types */}
      <section className="relative px-6 py-16 md:py-20">
        <div className="mx-auto max-w-[1280px]">
          <SectionHeading align="left" eyebrow={t.types.eyebrow} title={t.types.title} description={t.types.description} />
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {websiteTypeIds.map((id) => (
              <div key={id} className={cardClass}>
                <h3 className="text-lg font-semibold text-slate-100 light:text-slate-900">{t.types.items[id].title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400 light:text-slate-600">{t.types.items[id].audience}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What's included */}
      <section className="relative border-y border-[var(--text-primary)]/5 bg-[var(--text-primary)]/[0.02] px-6 py-16 md:py-20">
        <div className="mx-auto max-w-[1280px]">
          <SectionHeading
            align="left"
            eyebrow={t.included.eyebrow}
            title={t.included.title}
            description={t.included.description}
          />
          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {t.included.items.map((item, index) => {
              const Icon = includedIcons[index] ?? CheckCircle2;
              return (
                <li key={item.title} className={cardClass}>
                  <span className={iconClass}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 font-semibold text-slate-100 light:text-slate-900">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400 light:text-slate-600">{item.description}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Prices and timelines */}
      <section className="relative px-6 py-16 md:py-20">
        <div className="mx-auto max-w-[1280px]">
          <SectionHeading
            align="left"
            eyebrow={t.pricing.eyebrow}
            title={t.pricing.title}
            description={t.pricing.description}
          />

          {prices.length > 0 ? (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {prices.map(({ id, card }) => (
                <div key={id} className={cardClass}>
                  <h3 className="font-semibold text-slate-100 light:text-slate-900">{card.title}</h3>
                  <p className="mt-3 text-2xl font-bold text-slate-100 light:text-slate-900">{card.priceFrom}</p>
                  <p className="mt-3 flex items-center gap-2 text-sm text-slate-400 light:text-slate-600">
                    <Clock className="h-4 w-4 shrink-0 text-cyan-300 light:text-cyan-700" aria-hidden="true" />
                    {fill(t.pricing.duration, { duration: card.duration })}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-10 rounded-2xl border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.03] p-6 text-sm text-slate-300 light:text-slate-700">
              {t.pricing.unavailable}
            </p>
          )}

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className={cardClass}>
              <h3 className="font-semibold text-slate-100 light:text-slate-900">{t.pricing.factorsTitle}</h3>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {websitePriceFactorIds.map((id) => (
                  <li key={id} className="flex items-start gap-2 text-sm leading-6 text-slate-300 light:text-slate-700">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-cyan-300 light:text-cyan-700" aria-hidden="true" />
                    {byId(factors, id)}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col justify-between gap-6 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-7 light:border-cyan-600/30 light:bg-cyan-500/10">
              <p className="text-sm leading-6 text-slate-300 light:text-slate-700">{t.pricing.note}</p>
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                <Link href="/pricing" className={textLinkClass}>
                  {t.pricing.pricingLink}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link href="/calculator" className={textLinkClass}>
                  <Calculator className="h-4 w-4" aria-hidden="true" />
                  {t.pricing.calculatorLink}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Real work */}
      <section className="relative border-y border-[var(--text-primary)]/5 bg-[var(--text-primary)]/[0.02] px-6 py-16 md:py-20">
        <div className="mx-auto max-w-[1280px]">
          <SectionHeading align="left" eyebrow={t.works.eyebrow} title={t.works.title} description={t.works.description} />
          <div className="mt-10 grid items-center gap-8 overflow-hidden rounded-[28px] border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.03] p-6 backdrop-blur-xl md:grid-cols-2 md:p-8">
            <Image
              src={BASTAS_SCREENSHOT.src}
              width={BASTAS_SCREENSHOT.width}
              height={BASTAS_SCREENSHOT.height}
              alt={t.works.bastasImageAlt}
              sizes="(min-width: 1280px) 600px, (min-width: 768px) 45vw, 100vw"
              className="h-auto w-full rounded-2xl border border-[var(--text-primary)]/10"
            />
            <div>
              <h3 className="text-xl font-semibold text-slate-100 light:text-slate-900">{t.works.bastasTitle}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-400 light:text-slate-600">{t.works.bastasText}</p>
              <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
                <Link href="/portfolio/bastas" className={primaryButtonClass}>
                  {t.works.bastasLink}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link href="/portfolio" className={secondaryButtonClass}>
                  {t.works.allWorks}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="relative px-6 py-16 md:py-20">
        <div className="mx-auto max-w-[1280px]">
          <SectionHeading align="left" eyebrow={t.steps.eyebrow} title={t.steps.title} />
          <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {t.steps.items.map((step, index) => (
              <li key={step.title} className={cardClass}>
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--text-primary)]/10 bg-[var(--surface)] text-sm font-semibold text-cyan-300 light:text-cyan-700">
                  {index + 1}
                </span>
                <h3 className="mt-4 font-semibold text-slate-100 light:text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400 light:text-slate-600">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* FAQ */}
      <section className="relative px-6 py-16 md:py-20">
        <div className="mx-auto max-w-3xl">
          <SectionHeading eyebrow={t.faq.eyebrow} title={t.faq.title} />
          <div className="mt-10 space-y-3">
            {t.faq.items.map((item, index) => (
              <details
                key={item.question}
                open={index === 0}
                className="group overflow-hidden rounded-2xl border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.03] backdrop-blur-xl"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-4 text-left font-semibold text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-400/60 light:text-slate-900 [&::-webkit-details-marker]:hidden">
                  <h3>{item.question}</h3>
                  <ChevronDown
                    className="h-5 w-5 shrink-0 text-slate-400 transition group-open:rotate-180"
                    aria-hidden="true"
                  />
                </summary>
                <p className="px-6 pb-5 text-sm leading-6 text-slate-400 light:text-slate-600">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final call to action */}
      <section className="relative px-6 pb-20 md:pb-28">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-6 rounded-[28px] border border-[var(--text-primary)]/10 bg-gradient-to-br from-violet-700/30 via-blue-700/25 to-cyan-500/20 p-8 backdrop-blur-xl md:p-10">
          <div>
            <h2 className="text-xl font-bold leading-tight md:text-2xl">{t.cta.title}</h2>
            <p className="mt-2 text-sm text-slate-300 light:text-slate-700">{t.cta.description}</p>
          </div>
          <div className="flex w-full flex-col gap-4 sm:w-auto sm:flex-row sm:flex-wrap">
            <Link href="/contact" className={primaryButtonClass}>
              {t.cta.discuss}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link href="/portfolio" className={secondaryButtonClass}>
              {t.cta.portfolio}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
