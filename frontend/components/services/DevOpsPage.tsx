import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Container,
  FileText,
  FolderGit2,
  GitBranch,
  Info,
  KeyRound,
  ListChecks,
  Rocket,
  Search,
  Server,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import PageHeroVisual from "@/components/ui/PageHeroVisual";
import SectionHeading from "@/components/ui/SectionHeading";
import ProjectEstimateForm from "@/components/contact/ProjectEstimateForm";
import DevOpsPipeline from "@/components/services/DevOpsPipeline";
import { ESTIMATE_FORM_ID } from "@/data/contactPage";
import { heroVisuals } from "@/data/heroVisuals";
import type { DevOpsTranslations } from "@/data/i18n/devops";

interface DevOpsPageProps {
  t: DevOpsTranslations;
  heroAlt: string;
}

const scenarioIcons: LucideIcon[] = [Rocket, Search];
const workIcons: LucideIcon[] = [GitBranch, Container, Workflow, Server];
const handoverIcons: LucideIcon[] = [FolderGit2, FileText, KeyRound];

const cardClass =
  "rounded-2xl border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.03] p-7 backdrop-blur-xl";
const iconClass =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600/30 to-cyan-400/20 text-cyan-300 light:text-cyan-700";
const crumbClass = "inline-block -my-1.5 py-1.5 transition hover:text-cyan-300 light:hover:text-cyan-700";
const cardTitleClass = "font-semibold text-slate-100 light:text-slate-900";
const cardTextClass = "mt-2 text-sm leading-6 text-slate-400 light:text-slate-600";
const tintedSectionClass = "relative border-y border-[var(--text-primary)]/5 bg-[var(--text-primary)]/[0.02] px-6 py-16 md:py-20";

function IconCards({ items, icons, columns }: { items: { title: string; description: string }[]; icons: LucideIcon[]; columns: string }) {
  return (
    <ul className={`mt-10 grid gap-6 ${columns}`}>
      {items.map((item, index) => {
        const Icon = icons[index] ?? CheckCircle2;
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
  );
}

/**
 * /services/devops-ci-cd. The basic process (GitHub → GitHub Actions →
 * Docker image → VPS) is kept apart from the additional work, which is
 * listed only where confirmed and agreed per project (data/i18n/devops.ts).
 */
export default function DevOpsPage({ t, heroAlt }: DevOpsPageProps) {
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
        }
        badge={t.hero.badge}
        title={t.hero.title}
        description={t.hero.description}
        image={heroVisuals.devops}
        alt={heroAlt}
        primaryCTA={{ label: t.hero.discuss, href: `#${ESTIMATE_FORM_ID}`, icon: <ArrowRight className="h-4 w-4" aria-hidden="true" /> }}
      />

      {/* How an update is delivered */}
      <section className={tintedSectionClass}>
        <div className="mx-auto max-w-[1280px]">
          <SectionHeading align="left" eyebrow={t.pipeline.eyebrow} title={t.pipeline.title} description={t.pipeline.description} />
          <div className="mt-10">
            <DevOpsPipeline steps={t.pipeline.steps} />
          </div>
          <p className="mt-6 flex max-w-3xl items-start gap-2.5 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm leading-6 text-slate-200 light:border-cyan-600/30 light:bg-cyan-500/10 light:text-slate-800">
            <Info className="mt-1 h-4 w-4 shrink-0 text-cyan-300 light:text-cyan-700" aria-hidden="true" />
            {t.pipeline.note}
          </p>
        </div>
      </section>

      {/* Two scenarios */}
      <section className="relative px-6 py-16 md:py-20">
        <div className="mx-auto max-w-[1280px]">
          <SectionHeading align="left" eyebrow={t.scenarios.eyebrow} title={t.scenarios.title} />
          <IconCards items={t.scenarios.items} icons={scenarioIcons} columns="md:grid-cols-2" />
        </div>
      </section>

      {/* Which projects */}
      <section className={tintedSectionClass}>
        <div className="mx-auto max-w-[1280px]">
          <SectionHeading align="left" eyebrow={t.fit.eyebrow} title={t.fit.title} />
          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {t.fit.items.map((item) => (
              <li key={item.title} className={cardClass}>
                <CheckCircle2 className="h-5 w-5 text-cyan-300 light:text-cyan-700" aria-hidden="true" />
                <h3 className={`mt-4 ${cardTitleClass}`}>{item.title}</h3>
                <p className={cardTextClass}>{item.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* The basic work */}
      <section className="relative px-6 py-16 md:py-20">
        <div className="mx-auto max-w-[1280px]">
          <SectionHeading align="left" eyebrow={t.works.eyebrow} title={t.works.title} description={t.works.description} />
          <IconCards items={t.works.items} icons={workIcons} columns="sm:grid-cols-2 lg:grid-cols-4" />
        </div>
      </section>

      {/* Additional work, by agreement */}
      <section className={tintedSectionClass}>
        <div className="mx-auto max-w-[1280px]">
          <SectionHeading align="left" eyebrow={t.extras.eyebrow} title={t.extras.title} description={t.extras.description} />
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {t.extras.items.map((item) => (
              <li key={item.title} className="flex items-start gap-3 rounded-2xl border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.03] p-5">
                <ListChecks className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300 light:text-cyan-700" aria-hidden="true" />
                <div>
                  <h3 className={`text-sm ${cardTitleClass}`}>{item.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-400 light:text-slate-600">{item.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* What is handed over */}
      <section className="relative px-6 py-16 md:py-20">
        <div className="mx-auto max-w-[1280px]">
          <SectionHeading align="left" eyebrow={t.handover.eyebrow} title={t.handover.title} />
          <IconCards items={t.handover.items} icons={handoverIcons} columns="md:grid-cols-3" />
        </div>
      </section>

      <ProjectEstimateForm
        heading={{ eyebrow: t.requestForm.eyebrow, title: t.requestForm.title, description: t.requestForm.description }}
        initialProjectType="DevOps/VPS"
        showPrices={false}
        aside={
          <aside aria-labelledby="devops-aside-title" className={`${cardClass} self-start lg:sticky lg:top-24`}>
            <span className={iconClass}>
              <Search className="h-5 w-5" aria-hidden="true" />
            </span>
            <h3 id="devops-aside-title" className={`mt-4 text-lg ${cardTitleClass}`}>
              {t.requestForm.asideTitle}
            </h3>
            <p className={cardTextClass}>{t.requestForm.asideText}</p>
          </aside>
        }
      />
    </main>
  );
}
