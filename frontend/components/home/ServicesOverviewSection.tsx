"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  Globe,
  AppWindow,
  Smartphone,
  Bot,
  CheckCircle2,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";
import type { ServiceOverview, ServiceOverviewIcon } from "@/types/serviceOverview";

const serviceIcons: Record<ServiceOverviewIcon, LucideIcon> = {
  Globe,
  AppWindow,
  Smartphone,
  Bot,
};

interface ServicesOverviewSectionProps {
  items: ServiceOverview[];
}

export default function ServicesOverviewSection({ items }: ServicesOverviewSectionProps) {
  return (
    <section className="px-6 py-20 md:py-28">
      <div className="mx-auto max-w-[1440px]">
        <SectionHeading
          eyebrow="Основные услуги"
          title="Чем мы можем помочь вашему бизнесу"
          description="Четыре ключевых направления разработки — подробности и остальные услуги на отдельной странице."
        />

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {items.map((service, index) => {
            const Icon = serviceIcons[service.icon];

            return (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                className="flex h-full flex-col rounded-2xl border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.03] p-8 backdrop-blur-xl transition hover:-translate-y-1 hover:border-violet-400/30 hover:shadow-[0_0_30px_rgba(124,58,237,0.2)]"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600/30 to-cyan-400/20 text-cyan-300 light:text-cyan-700">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>

                <p className="mt-5 text-xl font-semibold text-slate-100 light:text-slate-900">
                  {service.title}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-400 light:text-slate-600">
                  {service.description}
                </p>

                <ul className="mt-5 space-y-2.5">
                  {service.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2.5 text-sm text-slate-300 light:text-slate-700"
                    >
                      <CheckCircle2
                        className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300 light:text-cyan-700"
                        aria-hidden="true"
                      />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/services"
                  className="mt-5 -mb-1 inline-flex items-center gap-2 py-1 text-sm font-semibold text-cyan-300 light:text-cyan-700 transition hover:text-cyan-200"
                >
                  Подробнее об услуге
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
