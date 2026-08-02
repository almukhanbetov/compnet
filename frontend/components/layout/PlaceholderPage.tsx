import Link from "next/link";
import { ArrowLeft, ArrowRight, Construction } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

interface PlaceholderPageProps {
  eyebrow: string;
  title: string;
  description: string;
  meta?: string;
  showDiscussCta?: boolean;
}

export default function PlaceholderPage({
  eyebrow,
  title,
  description,
  meta,
  showDiscussCta = false,
}: PlaceholderPageProps) {
  return (
    <>
      <Header />

      <main className="relative overflow-hidden px-6 py-24 md:py-32">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-violet-600/20 blur-[100px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 top-10 h-80 w-80 rounded-full bg-cyan-400/15 blur-[100px]"
        />

        <div className="relative mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-1.5 text-xs font-medium uppercase tracking-wide text-cyan-300 light:border-cyan-600/30 light:bg-cyan-500/10 light:text-cyan-700">
            <Construction className="h-3.5 w-3.5" aria-hidden="true" />
            {eyebrow}
          </span>

          <h1 className="mt-6 text-4xl font-bold leading-tight md:text-5xl">
            {title}
          </h1>

          <p className="mt-5 text-base leading-7 text-slate-400 light:text-slate-600 md:text-lg">
            {description}
          </p>

          {meta ? (
            <p className="mt-4 inline-flex rounded-xl border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/5 px-4 py-2 text-sm text-slate-300 light:text-slate-700">
              {meta}
            </p>
          ) : null}

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            {showDiscussCta ? (
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-6 py-3.5 font-semibold text-white shadow-[0_0_24px_rgba(124,58,237,0.35)] transition hover:scale-105 hover:shadow-[0_0_32px_rgba(124,58,237,0.5)]"
              >
                Обсудить проект
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : null}

            <Link
              href="/"
              className={
                showDiscussCta
                  ? "inline-flex items-center gap-2 rounded-xl border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 px-6 py-3.5 font-semibold transition hover:bg-[var(--text-primary)]/10"
                  : "inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-6 py-3.5 font-semibold text-white shadow-[0_0_24px_rgba(124,58,237,0.35)] transition hover:scale-105 hover:shadow-[0_0_32px_rgba(124,58,237,0.5)]"
              }
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              На главную
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
