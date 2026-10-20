import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Calculator,
  CheckCircle2,
  ChevronDown,
  Cpu,
  Layers,
  LifeBuoy,
  MessageCircle,
  Phone,
  Plug,
  Send,
  Server,
  Smartphone,
  type LucideIcon,
} from "lucide-react";
import MobileAppMockups from "@/components/services/MobileAppMockups";
import SectionHeading from "@/components/ui/SectionHeading";
import { companyPhone, whatsappLink } from "@/data/contacts";
import { byId } from "@/lib/i18n";
import {
  mobilePlatformIds,
  mobilePriceFactorIds,
  type MobileAppDevelopmentTranslations,
  type MobilePlatformId,
} from "@/data/i18n/mobileAppDevelopment";
import type { PricingTranslations } from "@/data/i18n/pricing";

interface MobileAppDevelopmentPageProps {
  t: MobileAppDevelopmentTranslations;
  factors: PricingTranslations["factors"]["items"];
}

const platformIcons: Record<MobilePlatformId, LucideIcon> = {
  android: Smartphone,
  ios: Smartphone,
  native: Cpu,
  crossPlatform: Layers,
};
const includedIcons: LucideIcon[] = [Bell, Plug, Server, Send, LifeBuoy];

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
const cardTitleClass = "font-semibold text-slate-100 light:text-slate-900";
const cardTextClass = "mt-2 text-sm leading-6 text-slate-400 light:text-slate-600";

export default function MobileAppDevelopmentPage({ t, factors }: MobileAppDevelopmentPageProps) {
  // tel: and wa.me clicks are counted by the existing analytics (AnalyticsProvider).
  const whatsappHref = whatsappLink(t.hero.whatsappMessage);

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

          <div className="mt-8 grid items-center gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-10">
            <div className="min-w-0">
              <span className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-1.5 text-xs font-medium uppercase tracking-wide text-cyan-300 light:border-cyan-600/30 light:bg-cyan-500/10 light:text-cyan-700">
                {t.hero.badge}
              </span>
              <h1 className="mt-6 text-4xl font-bold leading-tight md:text-6xl lg:text-5xl xl:text-6xl">{t.hero.title}</h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400 light:text-slate-600">{t.hero.description}</p>
              <ul className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-2">
                {t.hero.highlights.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm leading-6 text-slate-200 light:text-slate-800">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-cyan-300 light:text-cyan-700" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
                <Link href="/contact" className={primaryButtonClass}>
                  {t.hero.discuss}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={secondaryButtonClass}>
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  {t.hero.whatsapp}
                </a>
              </div>
            </div>

            <MobileAppMockups t={t.hero.visual} />
          </div>
        </div>
      </section>

      {/* Platforms and approach */}
      <section className="relative px-6 py-16 md:py-20">
        <div className="mx-auto max-w-[1280px]">
          <SectionHeading
            align="left"
            eyebrow={t.platforms.eyebrow}
            title={t.platforms.title}
            description={t.platforms.description}
          />
          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {mobilePlatformIds.map((id) => {
              const Icon = platformIcons[id];
              return (
                <li key={id} className={cardClass}>
                  <span className={iconClass}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className={`mt-4 ${cardTitleClass}`}>{t.platforms.items[id].title}</h3>
                  <p className={cardTextClass}>{t.platforms.items[id].description}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Use cases */}
      <section className="relative border-y border-[var(--text-primary)]/5 bg-[var(--text-primary)]/[0.02] px-6 py-16 md:py-20">
        <div className="mx-auto max-w-[1280px]">
          <SectionHeading align="left" eyebrow={t.tasks.eyebrow} title={t.tasks.title} description={t.tasks.description} />
          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {t.tasks.items.map((item) => (
              <li key={item.title} className={cardClass}>
                <h3 className={cardTitleClass}>{item.title}</h3>
                <p className={cardTextClass}>{item.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* What's included */}
      <section className="relative px-6 py-16 md:py-20">
        <div className="mx-auto max-w-[1280px]">
          <SectionHeading
            align="left"
            eyebrow={t.included.eyebrow}
            title={t.included.title}
            description={t.included.description}
          />
          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {t.included.items.map((item, index) => {
              const Icon = includedIcons[index] ?? CheckCircle2;
              return (
                <li key={item.title} className={cardClass}>
                  <span className={iconClass}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className={`mt-4 ${cardTitleClass}`}>{item.title}</h3>
                  <p className={cardTextClass}>{item.description}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Steps */}
      <section className="relative border-y border-[var(--text-primary)]/5 bg-[var(--text-primary)]/[0.02] px-6 py-16 md:py-20">
        <div className="mx-auto max-w-[1280px]">
          <SectionHeading align="left" eyebrow={t.steps.eyebrow} title={t.steps.title} />
          <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {t.steps.items.map((step, index) => (
              <li key={step.title} className={cardClass}>
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--text-primary)]/10 bg-[var(--surface)] text-sm font-semibold text-cyan-300 light:text-cyan-700">
                  {index + 1}
                </span>
                <h3 className={`mt-4 ${cardTitleClass}`}>{step.title}</h3>
                <p className={cardTextClass}>{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Advantages */}
      <section className="relative px-6 py-16 md:py-20">
        <div className="mx-auto max-w-[1280px]">
          <SectionHeading align="left" eyebrow={t.advantages.eyebrow} title={t.advantages.title} />
          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {t.advantages.items.map((item) => (
              <li key={item.title} className={cardClass}>
                <CheckCircle2 className="h-5 w-5 text-cyan-300 light:text-cyan-700" aria-hidden="true" />
                <h3 className={`mt-4 ${cardTitleClass}`}>{item.title}</h3>
                <p className={cardTextClass}>{item.description}</p>
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <Link href="/services" className={textLinkClass}>
              {t.advantages.webAppsLink}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* Cost factors (no prices: not confirmed for this page) */}
      <section className="relative border-y border-[var(--text-primary)]/5 bg-[var(--text-primary)]/[0.02] px-6 py-16 md:py-20">
        <div className="mx-auto max-w-[1280px]">
          <SectionHeading
            align="left"
            eyebrow={t.pricing.eyebrow}
            title={t.pricing.title}
            description={t.pricing.description}
          />
          <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className={cardClass}>
              <h3 className={cardTitleClass}>{t.pricing.factorsTitle}</h3>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {mobilePriceFactorIds.map((id) => (
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

      {/* Portfolio: no mobile cases are confirmed yet, so only a link */}
      <section className="relative px-6 py-16 md:py-20">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-end justify-between gap-6">
          <SectionHeading align="left" eyebrow={t.works.eyebrow} title={t.works.title} description={t.works.description} />
          <Link href="/portfolio" className={secondaryButtonClass}>
            {t.works.allWorks}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
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
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={secondaryButtonClass}>
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              {t.cta.whatsapp}
            </a>
            <a href={companyPhone.href} className={secondaryButtonClass}>
              <Phone className="h-4 w-4" aria-hidden="true" />
              {t.cta.phone}
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
