"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";
import { portfolioProjects } from "@/data/portfolio";

export default function PortfolioSection() {
  return (
    <section className="px-6 py-20 md:py-28">
      <div className="mx-auto max-w-[1440px]">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            align="left"
            eyebrow="Портфолио"
            title="Реализованные проекты"
            description="Несколько кейсов из разных направлений — web, mobile, CRM и AI."
          />

          <Link
            href="/portfolio"
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 px-5 py-2.5 text-sm font-semibold text-slate-200 light:text-slate-800 transition hover:bg-[var(--text-primary)]/10"
          >
            Все проекты
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {portfolioProjects.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.03] backdrop-blur-xl transition hover:-translate-y-1 hover:border-violet-400/30 hover:shadow-[0_0_30px_rgba(124,58,237,0.2)]"
            >
              <div
                className={`h-32 bg-gradient-to-br ${project.gradientFrom} ${project.gradientTo}`}
              />

              <div className="flex flex-1 flex-col p-6">
                <span className="inline-flex w-fit rounded-full border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/5 px-3 py-1 text-xs font-medium text-slate-300 light:text-slate-700">
                  {project.category}
                </span>

                <p className="mt-4 font-semibold leading-snug text-slate-100 light:text-slate-900">
                  {project.title}
                </p>
                <p className="mt-2 flex-1 text-sm leading-6 text-slate-400 light:text-slate-600">
                  {project.description}
                </p>

                <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--text-primary)]/10 pt-4">
                  {project.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-[var(--text-primary)]/5 px-2.5 py-1 text-xs text-slate-400 light:text-slate-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
