import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function PricingHero() {
  return (
    <section className="relative overflow-hidden px-6 py-20 md:py-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-violet-600/20 blur-[100px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 top-10 h-80 w-80 rounded-full bg-cyan-400/15 blur-[100px]"
      />

      <div className="relative mx-auto max-w-2xl text-center">
        <span className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-300 light:border-cyan-600/30 light:bg-cyan-500/10 light:text-cyan-700">
          Цены
        </span>

        <h1 className="mt-8 text-4xl font-bold leading-tight md:text-6xl">
          Стоимость{" "}
          <span className="bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent">
            разработки
          </span>
        </h1>

        <p className="mt-6 text-lg leading-8 text-slate-400 light:text-slate-600">
          Итоговая цена зависит от задач проекта, интеграций, сроков и
          сложности бизнес-логики — ниже ориентировочная стоимость по
          направлениям.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-7 py-4 font-semibold text-white shadow-[0_0_24px_rgba(124,58,237,0.35)] transition hover:scale-105 hover:shadow-[0_0_32px_rgba(124,58,237,0.5)]"
          >
            Обсудить проект
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>

          <Link
            href="/calculator"
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 px-7 py-4 font-semibold transition hover:bg-[var(--text-primary)]/10"
          >
            Рассчитать точную стоимость
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
