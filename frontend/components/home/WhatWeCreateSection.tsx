"use client";

import { motion } from "motion/react";
import {
  Globe,
  AppWindow,
  Smartphone,
  Bot,
  Server,
  Settings2,
  type LucideIcon,
} from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";
import { projectTypes } from "@/data/projectTypes";
import type { ProjectTypeIcon } from "@/types/projectType";

const projectTypeIcons: Record<ProjectTypeIcon, LucideIcon> = {
  Globe,
  AppWindow,
  Smartphone,
  Bot,
  Server,
  Settings2,
};

export default function WhatWeCreateSection() {
  return (
    <section className="px-6 py-20 md:py-28">
      <div className="mx-auto max-w-[1440px]">
        <SectionHeading
          eyebrow="Что мы делаем"
          title="Какие проекты мы создаём"
          description="Полный цикл разработки — от идеи до готового продукта, под любую задачу бизнеса."
        />

        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projectTypes.map((projectType, index) => {
            const Icon = projectTypeIcons[projectType.icon];

            return (
              <motion.div
                key={projectType.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                className="flex h-full flex-col rounded-2xl border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.03] p-6 backdrop-blur-xl transition hover:-translate-y-1 hover:border-violet-400/30 hover:bg-[var(--text-primary)]/[0.06] hover:shadow-[0_0_30px_rgba(124,58,237,0.2)]"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600/30 to-cyan-400/20 text-cyan-300 light:text-cyan-700">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>

                <p className="mt-4 font-semibold text-slate-100 light:text-slate-900">
                  {projectType.title}
                </p>
                <p className="mt-1.5 text-sm text-slate-400 light:text-slate-600">
                  {projectType.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
