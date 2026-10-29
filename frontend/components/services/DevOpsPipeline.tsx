import { ArrowDown, ArrowRight, Container, GitBranch, Server, Workflow, type LucideIcon } from "lucide-react";

const stepIcons: LucideIcon[] = [GitBranch, Workflow, Container, Server];

interface DevOpsPipelineProps {
  steps: { title: string; description: string }[];
  /** Smaller cards without descriptions (the /services card). */
  compact?: boolean;
}

/**
 * GitHub → GitHub Actions → Docker image → VPS, in HTML so the text stays
 * readable and translated. A row on wide screens, a column on phones.
 */
export default function DevOpsPipeline({ steps, compact = false }: DevOpsPipelineProps) {
  return (
    <ol className={`flex flex-col gap-2 ${compact ? "sm:flex-row sm:flex-wrap sm:items-center" : "lg:flex-row lg:items-stretch"}`}>
      {steps.map((step, index) => {
        const Icon = stepIcons[index] ?? Server;
        const last = index === steps.length - 1;
        return (
          <li key={step.title} className={`flex flex-col gap-2 ${compact ? "sm:flex-row sm:items-center" : "lg:flex-1 lg:flex-row lg:items-center"}`}>
            <div
              className={`flex flex-1 rounded-2xl border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.03] backdrop-blur-xl ${
                compact ? "items-center gap-2.5 px-3 py-2.5" : "h-full flex-col gap-3 p-5"
              }`}
            >
              <span
                className={`flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600/30 to-cyan-400/20 text-cyan-300 light:text-cyan-700 ${
                  compact ? "h-8 w-8" : "h-10 w-10"
                }`}
              >
                <Icon className={compact ? "h-4 w-4" : "h-5 w-5"} aria-hidden="true" />
              </span>
              <div>
                <p className={`font-semibold text-slate-100 light:text-slate-900 ${compact ? "text-sm" : ""}`}>
                  {compact ? null : <span className="mr-1.5 text-cyan-300 light:text-cyan-700">{index + 1}.</span>}
                  {step.title}
                </p>
                {compact ? null : <p className="mt-1.5 text-sm leading-6 text-slate-400 light:text-slate-600">{step.description}</p>}
              </div>
            </div>
            {last ? null : (
              <span aria-hidden="true" className="flex justify-center text-cyan-300/70 light:text-cyan-700/70">
                <ArrowDown className={`h-4 w-4 ${compact ? "sm:hidden" : "lg:hidden"}`} />
                <ArrowRight className={`hidden h-4 w-4 ${compact ? "sm:block" : "lg:block"}`} />
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
