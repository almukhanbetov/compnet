"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { CheckCircle2, Clock, ArrowRight, Info } from "lucide-react";
import type { PricingCardItem } from "@/types/pricingPage";

interface PricingGridProps {
  items: PricingCardItem[];
}

export default function PricingGrid({ items }: PricingGridProps) {
  return (
    <section className="px-6 py-8 md:py-12">
      <div className="mx-auto max-w-[1440px]">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              className="flex flex-col rounded-2xl border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.03] p-7 backdrop-blur-xl transition hover:-translate-y-1 hover:border-violet-400/30 hover:shadow-[0_0_30px_rgba(124,58,237,0.2)]"
            >
              <p className="text-lg font-semibold text-slate-100 light:text-slate-900">
                {item.title}
              </p>

              <div className="mt-3">
                <span className="text-2xl font-bold text-slate-100 light:text-slate-900">
                  {item.priceFrom}
                </span>
              </div>

              <span className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 light:text-slate-600">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                {item.duration}
              </span>

              <p className="mt-4 text-sm leading-6 text-slate-400 light:text-slate-600">
                {item.description}
              </p>

              <ul className="mt-5 flex-1 space-y-2.5">
                {item.features.map((feature) => (
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
                href={item.serviceHref}
                className="mt-5 -mb-1 inline-flex items-center gap-2 py-1 text-sm font-semibold text-cyan-300 light:text-cyan-700 transition hover:text-cyan-200"
              >
                Подробнее об услуге
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>

              <Link
                href="/contact"
                className="mt-4 inline-flex items-center justify-center rounded-xl border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 px-5 py-3 text-sm font-semibold transition hover:bg-[var(--text-primary)]/10"
              >
                Обсудить проект
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="mt-10 flex items-start gap-3 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-6 py-4 light:border-cyan-600/30 light:bg-cyan-500/10">
          <Info
            className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300 light:text-cyan-700"
            aria-hidden="true"
          />
          <p className="text-sm leading-6 text-cyan-100 light:text-cyan-900">
            Стоимость указана ориентировочно. Итоговая цена зависит от
            функционала, дизайна, интеграций, сроков и сложности проекта.
          </p>
        </div>
      </div>
    </section>
  );
}
