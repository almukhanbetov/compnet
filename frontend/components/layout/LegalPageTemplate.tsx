import Link from "next/link";
import { Info } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

interface LegalSection {
  heading: string;
  body: string;
}

interface LegalPageTemplateProps {
  eyebrow: string;
  title: string;
  intro: string;
  sections: LegalSection[];
}

export default function LegalPageTemplate({
  eyebrow,
  title,
  intro,
  sections,
}: LegalPageTemplateProps) {
  return (
    <>
      <Header />

      <main className="relative overflow-hidden px-6 py-20 md:py-28">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-violet-600/20 blur-[100px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 top-10 h-80 w-80 rounded-full bg-cyan-400/15 blur-[100px]"
        />

        <div className="relative mx-auto max-w-3xl">
          <span className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-300 light:border-cyan-600/30 light:bg-cyan-500/10 light:text-cyan-700">
            {eyebrow}
          </span>

          <h1 className="mt-6 text-3xl font-bold leading-tight md:text-5xl">
            {title}
          </h1>

          <p className="mt-5 text-base leading-7 text-slate-400 light:text-slate-600 md:text-lg">
            {intro}
          </p>

          <div className="mt-6 flex items-start gap-2.5 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-6 py-4 light:border-cyan-600/30 light:bg-cyan-500/10">
            <Info
              className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300 light:text-cyan-700"
              aria-hidden="true"
            />
            <p className="text-sm leading-6 text-cyan-100 light:text-cyan-900">
              Демонстрационная версия документа. Перед публикацией требуется
              юридическая проверка.
            </p>
          </div>

          <div className="mt-12 space-y-10">
            {sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-xl font-semibold text-slate-100 light:text-slate-900">
                  {section.heading}
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-400 light:text-slate-600">
                  {section.body}
                </p>
              </section>
            ))}
          </div>

          <div className="mt-14">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 px-6 py-3.5 font-semibold transition hover:bg-[var(--text-primary)]/10"
            >
              На главную
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
