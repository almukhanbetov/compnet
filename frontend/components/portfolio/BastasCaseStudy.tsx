import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Lightbulb,
  Tag,
  Target,
  TrendingUp,
} from "lucide-react";
import type { BastasCaseTranslations } from "@/data/i18n/bastasCase";

export const BASTAS_SITE_URL = "https://bastas.kz/";
export const BASTAS_SCREENSHOT = { src: "/portfolio/bastas-stone-catalog.jpg", width: 1440, height: 900 };

interface BastasCaseStudyProps {
  t: BastasCaseTranslations;
}

const cardClass =
  "rounded-2xl border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.03] p-7 backdrop-blur-xl";
const iconClass =
  "flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600/30 to-cyan-400/20 text-cyan-300 light:text-cyan-700";
const primaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-6 py-3.5 font-semibold text-white shadow-[0_0_24px_rgba(124,58,237,0.35)] transition hover:scale-105 hover:shadow-[0_0_32px_rgba(124,58,237,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60";
const secondaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 px-6 py-3.5 font-semibold transition hover:bg-[var(--text-primary)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60";
const linkClass =
  "inline-block -my-1.5 py-1.5 transition hover:text-cyan-300 light:hover:text-cyan-700";

function OpenSiteLink({ t, className }: { t: BastasCaseTranslations; className: string }) {
  return (
    <a href={BASTAS_SITE_URL} target="_blank" rel="noopener noreferrer" className={className}>
      {t.cta.openSite}
      <span className="sr-only"> {t.cta.opensInNewTab}</span>
      <ExternalLink className="h-4 w-4" aria-hidden="true" />
    </a>
  );
}

export default function BastasCaseStudy({ t }: BastasCaseStudyProps) {
  return (
    <main className="relative overflow-hidden px-6 py-20 md:py-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-violet-600/20 blur-[100px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 top-10 h-80 w-80 rounded-full bg-cyan-400/15 blur-[100px]"
      />

      <div className="relative mx-auto max-w-[1280px]">
        <nav aria-label={t.breadcrumb.label} className="text-sm text-slate-400 light:text-slate-600">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className={linkClass}>
                {t.breadcrumb.home}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/portfolio" className={linkClass}>
                {t.breadcrumb.portfolio}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-slate-300 light:text-slate-700">
              BASTAS
            </li>
          </ol>
        </nav>

        <div className="mt-8 grid items-center gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-1.5 text-xs font-medium uppercase tracking-wide text-cyan-300 light:border-cyan-600/30 light:bg-cyan-500/10 light:text-cyan-700">
              <Tag className="h-3.5 w-3.5" aria-hidden="true" />
              {t.badge}
            </span>

            <h1 className="mt-6 text-3xl font-bold leading-tight md:text-5xl">{t.title}</h1>

            <p className="mt-5 text-lg leading-8 text-slate-400 light:text-slate-600">{t.intro}</p>

            <div className="mt-8 flex flex-wrap gap-4">
              <OpenSiteLink t={t} className={primaryButtonClass} />
              <Link href="/contact" className={secondaryButtonClass}>
                {t.cta.discuss}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <figure className="overflow-hidden rounded-[28px] border border-[var(--text-primary)]/10 bg-[var(--surface)] shadow-[0_20px_60px_rgba(7,11,23,0.35)]">
            <div
              aria-hidden="true"
              className="flex items-center gap-1.5 border-b border-[var(--text-primary)]/10 px-4 py-3"
            >
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--text-primary)]/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--text-primary)]/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--text-primary)]/15" />
              <span className="ml-3 truncate text-xs text-slate-500">bastas.kz</span>
            </div>
            <Image
              src={BASTAS_SCREENSHOT.src}
              width={BASTAS_SCREENSHOT.width}
              height={BASTAS_SCREENSHOT.height}
              alt={t.imageAlt}
              sizes="(min-width: 1280px) 720px, (min-width: 1024px) 58vw, 100vw"
              preload
              className="h-auto w-full"
            />
          </figure>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <section className={cardClass}>
            <span className={iconClass}>
              <Target className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-lg font-semibold text-slate-100 light:text-slate-900">{t.task.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400 light:text-slate-600">{t.task.text}</p>
          </section>

          <section className={cardClass}>
            <span className={iconClass}>
              <Lightbulb className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-lg font-semibold text-slate-100 light:text-slate-900">{t.solution.title}</h2>
            <ul className="mt-3 space-y-2.5">
              {t.solution.items.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm leading-6 text-slate-300 light:text-slate-700">
                  <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-cyan-300 light:text-cyan-700" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-7 md:col-span-2 lg:col-span-1 light:border-cyan-600/30 light:bg-cyan-500/10">
            <span className={iconClass}>
              <TrendingUp className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-lg font-semibold text-slate-100 light:text-slate-900">{t.result.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300 light:text-slate-700">{t.result.text}</p>
          </section>
        </div>

        <div className="mt-14 flex flex-wrap items-center justify-between gap-6 rounded-[28px] border border-[var(--text-primary)]/10 bg-gradient-to-br from-violet-700/30 via-blue-700/25 to-cyan-500/20 p-8 backdrop-blur-xl md:p-10">
          <div>
            <h2 className="text-xl font-bold leading-tight md:text-2xl">{t.cta.title}</h2>
            <p className="mt-2 text-sm text-slate-300 light:text-slate-700">{t.cta.description}</p>
            <Link
              href="/services/website-development"
              className="mt-2 inline-flex min-h-11 items-center gap-2 py-2 text-sm font-semibold text-cyan-300 transition hover:text-cyan-200 light:text-cyan-700 light:hover:text-cyan-800"
            >
              {t.cta.service}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="flex w-full flex-col gap-4 sm:w-auto sm:flex-row sm:flex-wrap">
            <Link href="/contact" className={primaryButtonClass}>
              {t.cta.discuss}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <OpenSiteLink t={t} className={secondaryButtonClass} />
            <Link href="/portfolio" className={secondaryButtonClass}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {t.cta.back}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
