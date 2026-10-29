import Link from "next/link";
import {
  ArrowRight,
  Code2,
  Database,
  GitBranch,
  GraduationCap,
  Handshake,
  Info,
  ListChecks,
  Smartphone,
  Sprout,
  Wallet,
  Workflow,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import PageHeroVisual from "@/components/ui/PageHeroVisual";
import SectionHeading from "@/components/ui/SectionHeading";
import TrainingRequestForm from "@/components/training/TrainingRequestForm";
import { heroVisuals } from "@/data/heroVisuals";
import type { TrainingTranslations } from "@/data/i18n/training";
import { TRAINING_FORM_ID } from "@/data/training";

interface TrainingPageProps {
  t: TrainingTranslations;
  heroAlt: string;
}

const audienceIcons: LucideIcon[] = [Sprout, GraduationCap, Wrench];
const directionIcons: LucideIcon[] = [Code2, Smartphone, Database, GitBranch, Workflow];

const cardClass =
  "rounded-2xl border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.03] p-7 backdrop-blur-xl";
const iconClass =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600/30 to-cyan-400/20 text-cyan-300 light:text-cyan-700";
const crumbClass = "inline-block -my-1.5 py-1.5 transition hover:text-cyan-300 light:hover:text-cyan-700";
const cardTitleClass = "font-semibold text-slate-100 light:text-slate-900";
const cardTextClass = "mt-2 text-sm leading-6 text-slate-400 light:text-slate-600";
const noteClass = "rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-7 light:border-cyan-600/30 light:bg-cyan-500/10";
const pillClass =
  "inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-300 light:border-cyan-600/30 light:bg-cyan-500/10 light:text-cyan-700";

/**
 * /training: paid hands-on training with a mentor. Only what is agreed is
 * stated — no prices, durations, lessons, reviews, certificates or graduate
 * figures, no photos of people; the examples are labelled as training
 * projects, not students' work.
 */
export default function TrainingPage({ t, heroAlt }: TrainingPageProps) {
  return (
    <main className="relative overflow-hidden">
      <PageHeroVisual
        before={
          <nav aria-label={t.breadcrumb.label} className="text-sm text-slate-400 light:text-slate-600">
            <ol className="flex flex-wrap items-center gap-2">
              <li>
                <Link href="/" className={crumbClass}>
                  {t.breadcrumb.home}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-slate-300 light:text-slate-700">
                {t.breadcrumb.current}
              </li>
            </ol>
          </nav>
        }
        badge={t.hero.badge}
        title={t.hero.title}
        description={t.hero.description}
        image={heroVisuals.training}
        alt={heroAlt}
        primaryCTA={{ label: t.hero.discuss, href: `#${TRAINING_FORM_ID}`, icon: <ArrowRight className="h-4 w-4" aria-hidden="true" /> }}
      >
        <p className="mt-6 inline-flex max-w-2xl items-start gap-2.5 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm leading-6 text-slate-200 light:border-cyan-600/30 light:bg-cyan-500/10 light:text-slate-800">
          <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300 light:text-cyan-700" aria-hidden="true" />
          {t.hero.paid}
        </p>
      </PageHeroVisual>

      {/* Who it is for */}
      <section className="relative border-y border-[var(--text-primary)]/5 bg-[var(--text-primary)]/[0.02] px-6 py-16 md:py-20">
        <div className="mx-auto max-w-[1280px]">
          <SectionHeading align="left" eyebrow={t.audience.eyebrow} title={t.audience.title} description={t.audience.description} />
          <ul className="mt-10 grid gap-6 md:grid-cols-3">
            {t.audience.items.map((item, index) => {
              const Icon = audienceIcons[index] ?? GraduationCap;
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

      {/* The practice cycle */}
      <section className="relative px-6 py-16 md:py-20">
        <div className="mx-auto max-w-[1280px]">
          <SectionHeading align="left" eyebrow={t.format.eyebrow} title={t.format.title} description={t.format.description} />
          <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {t.format.steps.map((step, index) => (
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

      {/* Areas */}
      <section className="relative border-y border-[var(--text-primary)]/5 bg-[var(--text-primary)]/[0.02] px-6 py-16 md:py-20">
        <div className="mx-auto max-w-[1280px]">
          <SectionHeading align="left" eyebrow={t.directions.eyebrow} title={t.directions.title} description={t.directions.description} />
          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {t.directions.items.map((item, index) => {
              const Icon = directionIcons[index] ?? Code2;
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

      {/* DevOps and CI/CD practice: a proposed programme, not students' results */}
      <section className="relative px-6 py-16 md:py-20">
        <div className="mx-auto max-w-[1280px]">
          <SectionHeading align="left" eyebrow={t.devopsPractice.eyebrow} title={t.devopsPractice.title} description={t.devopsPractice.description} />
          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-400 light:text-slate-600">{t.devopsPractice.beginners}</p>
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {t.devopsPractice.steps.map((step, index) => (
              <li key={step} className="flex items-start gap-3 rounded-2xl border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.03] p-5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--text-primary)]/10 bg-[var(--surface)] text-sm font-semibold text-cyan-300 light:text-cyan-700">
                  {index + 1}
                </span>
                <span className="pt-1 text-sm font-medium leading-6 text-slate-200 light:text-slate-800">{step}</span>
              </li>
            ))}
          </ol>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className={noteClass}>
              <span className={iconClass}>
                <ListChecks className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className={`mt-4 ${cardTitleClass}`}>{t.devopsPractice.resultTitle}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300 light:text-slate-700">{t.devopsPractice.result}</p>
              <p className="mt-2 text-sm leading-6 text-slate-400 light:text-slate-600">{t.devopsPractice.resultNote}</p>
            </div>
            <div className={cardClass}>
              <span className={iconClass}>
                <Wallet className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="mt-4 text-sm leading-6 text-slate-300 light:text-slate-700">{t.devopsPractice.costs}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Training project examples (not students' work) */}
      <section className="relative border-y border-[var(--text-primary)]/5 bg-[var(--text-primary)]/[0.02] px-6 py-16 md:py-20">
        <div className="mx-auto max-w-[1280px]">
          <SectionHeading align="left" eyebrow={t.examples.eyebrow} title={t.examples.title} description={t.examples.description} />
          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {t.examples.items.map((item) => (
              <li key={item.title} className={cardClass}>
                <span className={pillClass}>{t.examples.label}</span>
                <h3 className={`mt-4 ${cardTitleClass}`}>{item.title}</h3>
                <p className={cardTextClass}>{item.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Paid cooperation and the terms */}
      <section className="relative px-6 py-16 md:py-20">
        <div className="mx-auto grid max-w-[1280px] gap-6 lg:grid-cols-2">
          <div className={noteClass}>
            <span className={iconClass}>
              <Handshake className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="mt-4 text-xs font-medium uppercase tracking-wide text-cyan-300 light:text-cyan-700">{t.cooperation.eyebrow}</p>
            <h2 className="mt-2 text-2xl font-bold leading-tight">{t.cooperation.title}</h2>
            <p className="mt-4 text-sm leading-7 text-slate-300 light:text-slate-700">{t.cooperation.text}</p>
          </div>
          <div className={cardClass}>
            <span className={iconClass}>
              <Info className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="mt-4 text-xs font-medium uppercase tracking-wide text-cyan-300 light:text-cyan-700">{t.terms.eyebrow}</p>
            <h2 className="mt-2 text-2xl font-bold leading-tight">{t.terms.title}</h2>
            <p className="mt-4 text-sm leading-7 text-slate-400 light:text-slate-600">{t.terms.description}</p>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {t.terms.items.map((item) => (
                <li
                  key={item}
                  className="rounded-xl border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.03] px-4 py-3 text-sm font-medium text-slate-200 light:text-slate-800"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <TrainingRequestForm
        aside={
          <aside aria-labelledby="training-aside-title" className={`${cardClass} self-start lg:sticky lg:top-24`}>
            <span className={iconClass}>
              <Info className="h-5 w-5" aria-hidden="true" />
            </span>
            <h3 id="training-aside-title" className={`mt-4 text-lg ${cardTitleClass}`}>
              {t.form.asideTitle}
            </h3>
            <p className={cardTextClass}>{t.form.asideText}</p>
          </aside>
        }
      />
    </main>
  );
}
