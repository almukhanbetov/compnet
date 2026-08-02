"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";

export default function CtaSection() {
  return (
    <section className="px-6 py-20 md:py-28">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative mx-auto max-w-[1440px] overflow-hidden rounded-[32px] border border-[var(--text-primary)]/10 bg-gradient-to-br from-violet-700/30 via-blue-700/25 to-cyan-500/20 p-10 text-center backdrop-blur-xl md:p-16"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-violet-600/30 blur-[100px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -bottom-24 h-72 w-72 rounded-full bg-cyan-400/25 blur-[100px]"
        />

        <div className="relative mx-auto max-w-2xl">
          <h2 className="text-3xl font-bold leading-tight md:text-5xl">
            Рассчитаем стоимость вашего проекта
          </h2>
          <p className="mt-5 text-lg text-slate-300 light:text-slate-700">
            Опишите задачу — вернёмся с оценкой сроков и бюджета в течение
            рабочего дня.
          </p>

          <div className="mt-9 flex flex-wrap justify-center gap-4">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-7 py-4 font-semibold text-white shadow-[0_0_24px_rgba(124,58,237,0.35)] transition hover:scale-105 hover:shadow-[0_0_32px_rgba(124,58,237,0.5)]"
            >
              Рассчитать стоимость
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>

            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 px-7 py-4 font-semibold transition hover:bg-[var(--text-primary)]/10"
            >
              Обсудить проект
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
