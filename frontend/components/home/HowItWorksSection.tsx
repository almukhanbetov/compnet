"use client";

import { motion } from "motion/react";
import {
  Search,
  Palette,
  Code2,
  Rocket,
  type LucideIcon,
} from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";
import { steps } from "@/data/steps";
import type { StepIcon } from "@/types/step";

const stepIcons: Record<StepIcon, LucideIcon> = {
  Search,
  Palette,
  Code2,
  Rocket,
};

export default function HowItWorksSection() {
  return (
    <section className="border-y border-[var(--text-primary)]/5 bg-[var(--text-primary)]/[0.02] px-6 py-20 md:py-28">
      <div className="mx-auto max-w-[1440px]">
        <SectionHeading
          eyebrow="Процесс"
          title="Этапы разработки"
          description="От брифа и дизайна до запуска и поддержки — прозрачный процесс на каждом шаге."
        />

        <div className="relative mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="absolute top-6 left-0 right-0 hidden h-px bg-gradient-to-r from-transparent via-white/15 to-transparent lg:block" />

          {steps.map((step, index) => {
            const Icon = stepIcons[step.icon];

            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                className="relative flex flex-col items-start"
              >
                <span className="relative z-10 flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--text-primary)]/10 bg-[var(--surface)] text-cyan-300 light:text-cyan-700 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>

                <span className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500 light:text-slate-600">
                  Шаг {step.number}
                </span>
                <p className="mt-1.5 text-lg font-semibold text-slate-100 light:text-slate-900">
                  {step.title}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-400 light:text-slate-600">
                  {step.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
