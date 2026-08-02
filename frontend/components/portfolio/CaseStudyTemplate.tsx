import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Target,
  Lightbulb,
  TrendingUp,
  CheckCircle2,
  Tag,
} from "lucide-react";
import type { PortfolioCaseStudy } from "@/types/portfolioPage";

interface CaseStudyTemplateProps {
  project: PortfolioCaseStudy;
}

export default function CaseStudyTemplate({ project }: CaseStudyTemplateProps) {
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

      <div className="relative mx-auto max-w-[1000px]">
        <nav className="flex items-center gap-2 text-sm text-slate-400 light:text-slate-600">
          <Link
            href="/portfolio"
            className="inline-block -my-1.5 py-1.5 transition hover:text-cyan-300 light:hover:text-cyan-700"
          >
            Портфолио
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-slate-300 light:text-slate-700">{project.title}</span>
        </nav>

        <span className="mt-6 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-1.5 text-xs font-medium uppercase tracking-wide text-cyan-300 light:border-cyan-600/30 light:bg-cyan-500/10 light:text-cyan-700">
          <Tag className="h-3.5 w-3.5" aria-hidden="true" />
          {project.category}
        </span>

        <h1 className="mt-6 text-3xl font-bold leading-tight md:text-5xl">
          {project.title}
        </h1>

        <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-400 light:text-slate-600">
          {project.summary}
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <span className="inline-flex items-center gap-2 rounded-xl border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/5 px-4 py-2 text-sm text-slate-300 light:text-slate-700">
            <Clock className="h-4 w-4 text-cyan-300 light:text-cyan-700" aria-hidden="true" />
            Срок: {project.duration}
          </span>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.03] p-7 backdrop-blur-xl">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600/30 to-cyan-400/20 text-cyan-300 light:text-cyan-700">
              <Target className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="mt-4 text-lg font-semibold text-slate-100 light:text-slate-900">
              Задача
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-400 light:text-slate-600">
              {project.task}
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.03] p-7 backdrop-blur-xl">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600/30 to-cyan-400/20 text-cyan-300 light:text-cyan-700">
              <Lightbulb className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="mt-4 text-lg font-semibold text-slate-100 light:text-slate-900">
              Решение
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-400 light:text-slate-600">
              {project.solution}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.03] p-7 backdrop-blur-xl">
          <p className="text-lg font-semibold text-slate-100 light:text-slate-900">
            Процесс работы
          </p>

          <ol className="mt-5 grid gap-4 sm:grid-cols-2">
            {project.process.map((step, index) => (
              <li key={step} className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--text-primary)]/10 bg-[var(--surface)] text-xs font-semibold text-cyan-300 light:text-cyan-700">
                  {index + 1}
                </span>
                <span className="text-sm leading-6 text-slate-300 light:text-slate-700">
                  {step}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.03] p-7 backdrop-blur-xl">
            <p className="text-lg font-semibold text-slate-100 light:text-slate-900">
              Технологии
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {project.technologies.map((tech) => (
                <span
                  key={tech}
                  className="rounded-full bg-[var(--text-primary)]/5 px-3 py-1.5 text-sm text-slate-300 light:text-slate-700"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-7 light:border-cyan-600/30 light:bg-cyan-500/10">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600/30 to-cyan-400/20 text-cyan-300 light:text-cyan-700">
              <TrendingUp className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="mt-4 text-lg font-semibold text-slate-100 light:text-slate-900">
              Результат
            </p>
            <p className="mt-2 flex items-start gap-2 text-sm leading-6 text-slate-300 light:text-slate-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300 light:text-cyan-700" aria-hidden="true" />
              {project.result}
            </p>
          </div>
        </div>

        <div className="mt-14 flex flex-wrap items-center justify-between gap-6 rounded-[28px] border border-[var(--text-primary)]/10 bg-gradient-to-br from-violet-700/30 via-blue-700/25 to-cyan-500/20 p-8 backdrop-blur-xl md:p-10">
          <div>
            <p className="text-xl font-bold leading-tight md:text-2xl">
              Хотите похожий проект?
            </p>
            <p className="mt-2 text-sm text-slate-300 light:text-slate-700">
              Обсудим задачу и предложим решение с оценкой сроков и бюджета.
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-6 py-3.5 font-semibold text-white shadow-[0_0_24px_rgba(124,58,237,0.35)] transition hover:scale-105 hover:shadow-[0_0_32px_rgba(124,58,237,0.5)]"
            >
              Обсудить похожий проект
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>

            <Link
              href="/portfolio"
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 px-6 py-3.5 font-semibold transition hover:bg-[var(--text-primary)]/10"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Ко всем проектам
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
