"use client";

import { motion } from "motion/react";
import {
  Sparkles,
  Gauge,
  ShieldCheck,
  Layers,
  Headset,
  Users,
  type LucideIcon,
} from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";
import { features } from "@/data/features";
import type { FeatureIcon } from "@/types/feature";

const featureIcons: Record<FeatureIcon, LucideIcon> = {
  Sparkles,
  Gauge,
  ShieldCheck,
  Layers,
  Headset,
  Users,
};

export default function FeaturesSection() {
  return (
    <section className="border-y border-[var(--text-primary)]/5 bg-[var(--text-primary)]/[0.02] px-6 py-20 md:py-28">
      <div className="mx-auto max-w-[1440px]">
        <SectionHeading
          eyebrow="Почему мы"
          title="Почему выбирают нас"
          description="Работаем как продолжение вашей команды — с прозрачностью на каждом этапе."
        />

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = featureIcons[feature.icon];

            return (
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                className="group rounded-2xl border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.03] p-7 backdrop-blur-xl transition hover:-translate-y-1 hover:border-cyan-400/30 hover:shadow-[0_0_30px_rgba(6,182,212,0.15)]"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600/30 to-cyan-400/20 text-cyan-300 light:text-cyan-700 transition group-hover:from-violet-600/50 group-hover:to-cyan-400/30">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>

                <p className="mt-5 text-lg font-semibold text-slate-100 light:text-slate-900">
                  {feature.title}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-400 light:text-slate-600">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
