"use client";

import { motion } from "motion/react";
import {
  LayoutTemplate,
  Search,
  Gauge,
  Users,
  UserCircle,
  Store,
  Smartphone,
  Bell,
  RefreshCcw,
  Bot,
  Workflow,
  Sparkles,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";
import type { ServiceDetail, ServiceDetailIcon } from "@/types/serviceDetail";

const detailIcons: Record<ServiceDetailIcon, LucideIcon> = {
  LayoutTemplate,
  Search,
  Gauge,
  Users,
  UserCircle,
  Store,
  Smartphone,
  Bell,
  RefreshCcw,
  Bot,
  Workflow,
  Sparkles,
};

interface ServiceDetailSectionProps {
  detail: ServiceDetail;
  reversed?: boolean;
  tinted?: boolean;
}

export default function ServiceDetailSection({
  detail,
  reversed = false,
  tinted = false,
}: ServiceDetailSectionProps) {
  return (
    <section
      className={`px-6 py-20 md:py-28 ${
        tinted ? "border-y border-[var(--text-primary)]/5 bg-[var(--text-primary)]/[0.02]" : ""
      }`}
    >
      <div className="mx-auto max-w-[1440px]">
        <div
          className={`grid items-center gap-12 lg:grid-cols-2 lg:gap-16 ${
            reversed ? "lg:[&>*:first-child]:order-2" : ""
          }`}
        >
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
          >
            <SectionHeading
              align="left"
              eyebrow={detail.eyebrow}
              title={detail.title}
              description={detail.description}
            />

            <ul className="mt-8 space-y-3">
              {detail.points.map((point) => (
                <li key={point} className="flex items-start gap-3 text-sm text-slate-300 light:text-slate-700">
                  <CheckCircle2
                    className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300 light:text-cyan-700"
                    aria-hidden="true"
                  />
                  {point}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-[28px] border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.04] p-8 backdrop-blur-xl"
          >
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 lg:gap-4">
              {detail.highlights.map((highlight) => {
                const Icon = detailIcons[highlight.icon];

                return (
                  <div
                    key={highlight.label}
                    className="flex items-center gap-3 rounded-2xl border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.03] px-4 py-4"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600/30 to-cyan-400/20 text-cyan-300 light:text-cyan-700">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="text-sm font-medium text-slate-200 light:text-slate-800">
                      {highlight.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
