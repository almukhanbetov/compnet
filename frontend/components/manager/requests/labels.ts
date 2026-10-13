import { byId } from "@/lib/i18n";
import {
  appScaleTiers,
  complexityLevels,
  designLevels,
  projectPricingList,
  siteScaleTiers,
  urgencyLevels,
} from "@/data/projectPricing";
import type { Translations } from "@/types/i18n";
import type { ApiRequestEstimate } from "@/types/api/managerRequests";

/**
 * Labels for what the client selected. Selections (project type, budget,
 * timeline) are catalog values and are translated; unknown values are shown
 * exactly as stored. Free text the client wrote is never translated.
 */

/** Project type id ("corporate") → translated label. */
export function projectTypeLabel(t: Translations, id: string): string {
  const entry = projectPricingList.find((item) => item.projectType === id);
  if (!entry) return id;
  return byId(t.contactPage.form.options.projectType, entry.label) ?? entry.label;
}

/** A form option stored as its Russian label → translated, or as stored. */
export function optionLabel(map: Record<string, string>, value: string): string {
  return byId(map, value) ?? value;
}

/** "1 500 000 ₸" */
export function formatTenge(amount: number): string {
  return `${new Intl.NumberFormat("ru-RU").format(amount)} ₸`;
}

/**
 * The website form sends only the project type; the rest of the calculator
 * is filled with the first catalog entry of each list
 * (lib/api/projectRequestMapping.ts). True when the saved parameters are
 * exactly those base values, so the manager is not misled into thinking
 * the client chose them.
 */
export function usesBaseParameters(breakdown: ApiRequestEstimate["breakdown"]): boolean {
  const entry = projectPricingList.find((item) => item.projectType === breakdown.project_type);
  const baseScale = entry?.category === "site" ? siteScaleTiers[0].id : entry?.category === "app" ? appScaleTiers[0].id : "";
  return (
    breakdown.modules.length === 0 &&
    !breakdown.multilingual &&
    (breakdown.scale_tier_id ?? "") === baseScale &&
    breakdown.design_level_id === designLevels[0].id &&
    breakdown.complexity_id === complexityLevels[0].id &&
    breakdown.urgency_id === urgencyLevels[0].id
  );
}

/** Badge colours per status (working statuses first, earlier ones muted). */
export const statusTone: Record<string, string> = {
  new: "border-pink-400/30 bg-pink-500/15 text-pink-200 light:text-pink-700",
  in_progress: "border-amber-400/30 bg-amber-400/15 text-amber-200 light:text-amber-800",
  completed: "border-emerald-400/30 bg-emerald-400/15 text-emerald-200 light:text-emerald-800",
  rejected: "border-slate-400/30 bg-slate-400/15 text-slate-300 light:text-slate-700",
};
export const legacyTone = "border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 text-slate-300 light:text-slate-700";
