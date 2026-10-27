import Link from "next/link";
import { ArrowLeft, ArrowRight, Construction } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { getServerTranslations } from "@/lib/i18n.server";
import HeroImage from "@/components/ui/HeroImage";
import type { HeroVisual } from "@/data/heroVisuals";

interface PlaceholderPageProps {
  eyebrow: string;
  title: string;
  description: string;
  meta?: string;
  showDiscussCta?: boolean;
  /** A semantic image beside the text (two columns on wide screens). */
  visual?: { image: HeroVisual; alt: string };
}

export default async function PlaceholderPage({
  eyebrow,
  title,
  description,
  meta,
  showDiscussCta = false,
  visual,
}: PlaceholderPageProps) {
  const { common } = await getServerTranslations();

  return (
    <>
      <Header />

      <main className={`relative overflow-hidden px-6 md:py-32 ${visual ? "pb-24 pt-16" : "py-24"}`}>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-violet-600/20 blur-[100px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 top-10 h-80 w-80 rounded-full bg-cyan-400/15 blur-[100px]"
        />

        <div
          className={
            visual
              ? "relative mx-auto grid max-w-[1280px] items-center gap-6 sm:gap-12 lg:grid-cols-2 lg:gap-14"
              : "relative mx-auto max-w-2xl text-center"
          }
        >
          <div className={visual ? `min-w-0 ${visual.image.position === "left" ? "lg:order-2" : ""}` : undefined}>
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

            <div className={`flex flex-wrap gap-4 ${visual ? "mt-8 sm:mt-10" : "mt-10 justify-center"}`}>
              {showDiscussCta ? (
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-6 py-3.5 font-semibold text-white shadow-[0_0_24px_rgba(124,58,237,0.35)] transition hover:scale-105 hover:shadow-[0_0_32px_rgba(124,58,237,0.5)]"
                >
                  {common.discussProject}
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
                {common.toHome}
              </Link>
            </div>
          </div>
          {visual ? (
            <div className={visual.image.position === "left" ? "lg:order-1" : ""}>
              <HeroImage visual={visual.image} alt={visual.alt} />
            </div>
          ) : null}
        </div>
      </main>

      <Footer />
    </>
  );
}
