"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { CheckCircle2, Clock } from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";
import { pricingCardItems } from "@/data/pricingPage";

const teaserIds = [
  "price-landing",
  "price-corporate",
  "price-online-store",
  "price-web-app",
  "price-mobile-app",
  "price-ai-solution",
];

const pricingItems = pricingCardItems.filter((item) =>
  teaserIds.includes(item.id),
);

export default function PricingSection() {
  return (
    <section className="border-y border-[var(--text-primary)]/5 bg-[var(--text-primary)]/[0.02] px-6 py-20 md:py-28">
      <div className="mx-auto max-w-[1440px]">
        <SectionHeading
          eyebrow="Цены"
          title="Ориентировочная стоимость по типам проектов"
          description="Цена зависит от объёма задач — ниже стартовые ориентиры по каждому направлению."
        />

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {pricingItems.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: index * 0.06 }}
              className="flex flex-col rounded-2xl border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.03] p-7 backdrop-blur-xl transition hover:-translate-y-1 hover:border-violet-400/30 hover:shadow-[0_0_30px_rgba(124,58,237,0.2)]"
            >
              <p className="text-lg font-semibold text-slate-100 light:text-slate-900">{item.title}</p>

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
                href="/contact"
                className="mt-7 inline-flex items-center justify-center rounded-xl border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 px-5 py-3 text-sm font-semibold transition hover:bg-[var(--text-primary)]/10"
              >
                Обсудить проект
              </Link>
            </motion.div>
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-slate-500 light:text-slate-600">
          Стоимость указана ориентировочно. Точная цена рассчитывается после
          обсуждения задач и подготовки технического задания.
        </p>
      </div>
    </section>
  );
}
