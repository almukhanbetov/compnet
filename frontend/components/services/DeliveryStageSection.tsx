import Link from "next/link";
import { ArrowRight, Server, Smartphone, Workflow, type LucideIcon } from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";
import { DEVOPS_PATH } from "@/data/devops";
import type { DevOpsTranslations } from "@/data/i18n/devops";

const cardClass =
  "rounded-2xl border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.03] p-7 backdrop-blur-xl";
const iconClass =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600/30 to-cyan-400/20 text-cyan-300 light:text-cyan-700";

/**
 * "Build, deployment and updates" on a service page, linking to the DevOps
 * and CI/CD page. Websites: the server side goes to a VPS. Mobile apps: the
 * backend on a VPS and the app's own release kept apart (no Docker or VPS
 * for the stores, no claim of automated mobile builds).
 */
export default function DeliveryStageSection({ t, variant }: { t: DevOpsTranslations; variant: "website" | "mobile" }) {
  const s = t.stage;
  const cards: { icon: LucideIcon; title?: string; description: string }[] =
    variant === "website"
      ? [{ icon: Workflow, description: s.website }]
      : [
          { icon: Server, ...s.mobile.backend },
          { icon: Smartphone, ...s.mobile.client },
        ];
  return (
    <section className="relative px-6 py-16 md:py-20">
      <div className="mx-auto max-w-[1280px]">
        <SectionHeading align="left" eyebrow={s.eyebrow} title={s.title} />
        <ul className={`mt-10 grid gap-6 ${cards.length > 1 ? "md:grid-cols-2" : ""}`}>
          {cards.map(({ icon: Icon, title, description }) => (
            <li key={description} className={`${cardClass} flex items-start gap-4`}>
              <span className={iconClass}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                {title ? <h3 className="font-semibold text-slate-100 light:text-slate-900">{title}</h3> : null}
                <p className={`text-sm leading-6 text-slate-400 light:text-slate-600 ${title ? "mt-2" : "mt-0.5"}`}>{description}</p>
              </div>
            </li>
          ))}
        </ul>
        <Link
          href={DEVOPS_PATH}
          className="mt-6 inline-flex min-h-11 items-center gap-2 py-2 text-sm font-semibold text-cyan-300 transition hover:text-cyan-200 light:text-cyan-700 light:hover:text-cyan-800"
        >
          {s.link}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
