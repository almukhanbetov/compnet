import Link from "next/link";
import {
  Clock,
  ShieldCheck,
  MessageSquare,
  Sparkles,
  ArrowDown,
  type LucideIcon,
} from "lucide-react";
import { contactAdvantages } from "@/data/contactPage";
import type { ContactAdvantageIcon } from "@/types/contactPage";

const advantageIcons: Record<ContactAdvantageIcon, LucideIcon> = {
  Clock,
  ShieldCheck,
  MessageSquare,
  Sparkles,
};

export default function ContactHero() {
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
          Контакты
        </span>

        <h1 className="mt-8 text-4xl font-bold leading-tight md:text-6xl">
          Обсудим{" "}
          <span className="bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent">
            ваш проект
          </span>
        </h1>

        <p className="mt-6 text-lg leading-8 text-slate-400 light:text-slate-600">
          Оставьте заявку на сайт, web- или мобильное приложение, CRM,
          AI-решение или техническую поддержку — вернёмся с ориентировочной
          стоимостью и сроками.
        </p>

        <ul className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
          {contactAdvantages.map((advantage) => {
            const Icon = advantageIcons[advantage.icon];

            return (
              <li
                key={advantage.id}
                className="flex items-center gap-2 rounded-xl border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.03] px-4 py-2.5 text-sm text-slate-300 light:text-slate-700"
              >
                <Icon
                  className="h-4 w-4 shrink-0 text-cyan-300 light:text-cyan-700"
                  aria-hidden="true"
                />
                {advantage.label}
              </li>
            );
          })}
        </ul>

        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <a
            href="#estimate-form"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-7 py-4 font-semibold text-white shadow-[0_0_24px_rgba(124,58,237,0.35)] transition hover:scale-105 hover:shadow-[0_0_32px_rgba(124,58,237,0.5)]"
          >
            Оставить заявку
            <ArrowDown className="h-4 w-4" aria-hidden="true" />
          </a>

          <Link
            href="/calculator"
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 px-7 py-4 font-semibold transition hover:bg-[var(--text-primary)]/10"
          >
            Открыть калькулятор
          </Link>
        </div>
      </div>
    </section>
  );
}
