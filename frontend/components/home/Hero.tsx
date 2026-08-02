"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useLocale } from "@/components/providers/LocaleProvider";
import HeroBackground from "@/components/home/HeroBackground";
import HeroVisual from "@/components/home/HeroVisual";

export default function Hero() {
  const { t } = useLocale();

  return (
    <section className="relative overflow-hidden px-6 py-20 md:py-28">
      <HeroBackground />

      <section className="relative mx-auto grid max-w-[1440px] items-center gap-16 lg:grid-cols-2 lg:gap-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <span className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-300 light:border-cyan-600/30 light:bg-cyan-500/10 light:text-cyan-700">
            {t.hero.badge}
          </span>

          <h1 className="mt-8 max-w-2xl text-5xl font-bold leading-tight md:text-7xl">
            {t.hero.titleLine1}
            <span className="block bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent">
              {t.hero.titleLine2}
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-400 light:text-slate-600">
            {t.hero.description}
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/pricing"
              className="rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-7 py-4 font-semibold text-white shadow-[0_0_24px_rgba(124,58,237,0.35)] transition hover:scale-105 hover:shadow-[0_0_32px_rgba(124,58,237,0.5)]"
            >
              {t.hero.ctaPrimary}
            </Link>

            <Link
              href="/services"
              className="rounded-xl border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 px-7 py-4 font-semibold transition hover:bg-[var(--text-primary)]/10"
            >
              {t.hero.ctaSecondary}
            </Link>
          </div>

          <div className="mt-14 flex max-w-xl flex-wrap gap-x-10 gap-y-6 border-t border-[var(--text-primary)]/10 pt-8">
            {t.hero.stats.map((stat) => (
              <div key={stat.label}>
                <p className="bg-gradient-to-r from-violet-300 via-blue-300 to-cyan-200 bg-clip-text text-3xl font-bold text-transparent light:from-violet-600 light:via-blue-600 light:to-cyan-600">
                  {stat.value}
                </p>
                <p className="mt-1 text-sm text-slate-400 light:text-slate-600">{stat.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <HeroVisual />
      </section>
    </section>
  );
}
