import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock, ExternalLink, TrendingUp } from "lucide-react";
import { useLocale } from "@/components/providers/LocaleProvider";
import { byId, fill } from "@/lib/i18n";
import { caseStudyPages } from "@/data/caseStudyPages";
import type { PortfolioCaseStudy } from "@/types/portfolioPage";

interface PortfolioCardProps {
  project: PortfolioCaseStudy;
}

const cardClass =
  "group flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.03] backdrop-blur-xl transition hover:-translate-y-1 hover:border-violet-400/30 hover:shadow-[0_0_30px_rgba(124,58,237,0.2)]";
const ctaClass =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 px-5 py-3 text-sm font-semibold transition group-hover:bg-[var(--text-primary)]/10";

export default function PortfolioCard({ project }: PortfolioCardProps) {
  const { t } = useLocale();
  const isExternal = Boolean(project.externalUrl);
  // A case with its own page gets two buttons, so the card itself can't be
  // the external link (links can't be nested).
  const detailsHref = byId(caseStudyPages, project.slug);
  const externalLabel = (
    <>
      {t.portfolio.card.openSite}
      <ExternalLink className="h-4 w-4" aria-hidden="true" />
    </>
  );

  const body = (
    <>
      <div
        className={`relative overflow-hidden ${project.screenshotUrl ? "h-56" : "h-32"}`}
      >
        {project.screenshotUrl ? (
          <>
            <Image
              src={project.screenshotUrl}
              alt={fill(t.portfolio.card.screenshotAlt, { title: project.title })}
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover object-top"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent"
            />
          </>
        ) : (
          <div
            className={`h-full w-full bg-gradient-to-br ${project.gradientFrom} ${project.gradientTo}`}
          />
        )}
      </div>

      <div className="flex flex-1 flex-col p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex w-fit rounded-full border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/5 px-3 py-1 text-xs font-medium text-slate-300 light:text-slate-700">
            {t.portfolio.categories[project.category] ?? project.category}
          </span>
          {project.subcategory ? (
            <span className="text-xs text-slate-500 light:text-slate-500">
              {project.subcategory}
            </span>
          ) : null}
        </div>

        <p className="mt-4 font-semibold leading-snug text-slate-100 light:text-slate-900">
          {project.title}
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-400 light:text-slate-600">
          {project.summary}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {project.technologies.map((tech) => (
            <span
              key={tech}
              className="rounded-full bg-[var(--text-primary)]/5 px-2.5 py-1 text-xs text-slate-400 light:text-slate-600"
            >
              {tech}
            </span>
          ))}
        </div>

        <div className="mt-5 flex flex-col gap-2 border-t border-[var(--text-primary)]/10 pt-4 text-sm">
          <span className="flex items-center gap-2 text-slate-400 light:text-slate-600">
            <Clock className="h-4 w-4 shrink-0 text-cyan-300 light:text-cyan-700" aria-hidden="true" />
            {project.duration}
          </span>
          <span className="flex items-start gap-2 text-slate-300 light:text-slate-700">
            <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300 light:text-cyan-700" aria-hidden="true" />
            {project.result}
          </span>
        </div>

        {detailsHref ? (
          <div className="mt-6 flex flex-col gap-2">
            <Link href={detailsHref} className={ctaClass}>
              {t.portfolio.card.details}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            {isExternal ? (
              <a
                href={project.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={ctaClass}
              >
                {externalLabel}
              </a>
            ) : null}
          </div>
        ) : isExternal ? (
          <span className={`mt-6 ${ctaClass}`}>{externalLabel}</span>
        ) : (
          <Link href={`/portfolio/${project.slug}`} className={`mt-6 ${ctaClass}`}>
            {t.portfolio.card.more}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}
      </div>
    </>
  );

  if (isExternal && !detailsHref) {
    return (
      <a
        href={project.externalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cardClass}
      >
        {body}
      </a>
    );
  }

  return <div className={cardClass}>{body}</div>;
}
