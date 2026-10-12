"use client";

import { byId } from "@/lib/i18n";
import { useLocale } from "@/components/providers/LocaleProvider";
import { motion } from "motion/react";
import {
  Layout,
  Palette,
  Workflow,
  Plug,
  User,
  Smartphone,
  LayoutDashboard,
  Zap,
  LifeBuoy,
  type LucideIcon,
} from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";
import { priceFactors } from "@/data/pricingPage";
import type { PriceFactorIcon } from "@/types/pricingPage";

const factorIcons: Record<PriceFactorIcon, LucideIcon> = {
  Layout,
  Palette,
  Workflow,
  Plug,
  User,
  Smartphone,
  LayoutDashboard,
  Zap,
  LifeBuoy,
};

export default function PriceFactors() {
  const { t } = useLocale();
  return (
    <section className="border-y border-[var(--text-primary)]/5 bg-[var(--text-primary)]/[0.02] px-6 py-20 md:py-28">
      <div className="mx-auto max-w-[1440px]">
        <SectionHeading
          eyebrow={t.pricing.factors.eyebrow}
          title={t.pricing.factors.title}
          description={t.pricing.factors.description}
        />

        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {priceFactors.map((factor, index) => {
            const Icon = factorIcons[factor.icon];

            return (
              <motion.div
                key={factor.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: index * 0.04 }}
                className="flex items-center gap-4 rounded-xl border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.03] px-5 py-4"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600/30 to-cyan-400/20 text-cyan-300 light:text-cyan-700">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="text-sm font-medium text-slate-200 light:text-slate-800">
                  {byId(t.pricing.factors.items, factor.id) ?? factor.label}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
