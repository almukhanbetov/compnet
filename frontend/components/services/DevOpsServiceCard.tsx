import Link from "next/link";
import { ArrowRight, Settings2 } from "lucide-react";
import DevOpsPipeline from "@/components/services/DevOpsPipeline";
import { DEVOPS_PATH } from "@/data/devops";
import type { DevOpsTranslations } from "@/data/i18n/devops";

/** The DevOps and CI/CD card on /services: the short description, the
 * pipeline in brief and a link to the service page. */
export default function DevOpsServiceCard({ t }: { t: DevOpsTranslations }) {
  return (
    <section className="px-6 py-16 md:py-20">
      <div className="mx-auto max-w-[1440px] rounded-[28px] border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.03] p-7 backdrop-blur-xl md:p-10">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-2xl">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600/30 to-cyan-400/20 text-cyan-300 light:text-cyan-700">
              <Settings2 className="h-6 w-6" aria-hidden="true" />
            </span>
            <h2 className="mt-5 text-2xl font-bold leading-tight md:text-3xl">{t.servicesCard.title}</h2>
            <p className="mt-3 text-base leading-7 text-slate-400 light:text-slate-600">{t.servicesCard.description}</p>
          </div>
          <Link
            href={DEVOPS_PATH}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 px-6 py-3.5 font-semibold transition hover:bg-[var(--text-primary)]/10"
          >
            {t.servicesCard.link}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <div className="mt-8">
          <DevOpsPipeline steps={t.pipeline.steps} compact />
        </div>
      </div>
    </section>
  );
}
