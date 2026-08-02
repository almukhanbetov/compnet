"use client";

import { motion } from "motion/react";
import { Wallet, Layers, Clock, Headset, type LucideIcon } from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";
import { workFormats } from "@/data/pricingPage";
import type { WorkFormatIcon } from "@/types/pricingPage";

const formatIcons: Record<WorkFormatIcon, LucideIcon> = {
  Wallet,
  Layers,
  Clock,
  Headset,
};

export default function WorkFormats() {
  return (
    <section className="px-6 py-20 md:py-28">
      <div className="mx-auto max-w-[1440px]">
        <SectionHeading
          eyebrow="Форматы работы"
          title="Как мы можем работать"
          description="Выбираем формат сотрудничества под тип проекта и ваш бюджет."
        />

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {workFormats.map((format, index) => {
            const Icon = formatIcons[format.icon];

            return (
              <motion.div
                key={format.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: index * 0.06 }}
                className="rounded-2xl border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.03] p-7 backdrop-blur-xl transition hover:-translate-y-1 hover:border-cyan-400/30 hover:shadow-[0_0_30px_rgba(6,182,212,0.15)]"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600/30 to-cyan-400/20 text-cyan-300 light:text-cyan-700">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <p className="mt-5 text-lg font-semibold text-slate-100 light:text-slate-900">
                  {format.title}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-400 light:text-slate-600">
                  {format.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
