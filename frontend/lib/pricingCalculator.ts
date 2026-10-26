import type { PricingCatalog } from "@/types/api/pricingCatalog";

/**
 * The estimate formula of the server (backend internal/pricing/calculator.go),
 * step for step and with the same rounding, on the catalog the server
 * publishes (GET /api/v1/pricing/catalog) — no price lives in the frontend.
 * The server still recalculates every request; this only previews it.
 * Pure (type imports only), so a parity check can run it under Node.
 */

export interface EstimateSelection {
  projectType: string;
  scaleTierId: string;
  selectedModuleIds: string[];
  /** Quantity for per-unit modules (external integrations). */
  externalApiCount: number;
  multilingual: boolean;
  designLevelId: string;
  complexityId: string;
  urgencyId: string;
}

export type EstimateOutcome =
  | { kind: "estimate"; minimum: number; maximum: number; durationLabel: string }
  /** A base or scale price the catalog leaves open: no number to show. */
  | { kind: "individual" }
  /** An id the catalog does not know (or a repeated module): no number either. */
  | { kind: "invalid" };

/** Go's math.Round: halves away from zero. */
function round(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value));
}

function roundToStep(value: number, step: number): number {
  return round(Math.max(value, 0) / step) * step;
}

export function calculateProjectEstimate(catalog: PricingCatalog, input: EstimateSelection): EstimateOutcome {
  const projectType = catalog.project_types.find((p) => p.id === input.projectType);
  const design = catalog.design_levels.find((l) => l.id === input.designLevelId);
  const complexity = catalog.complexity_levels.find((l) => l.id === input.complexityId);
  const urgency = catalog.urgency_levels.find((l) => l.id === input.urgencyId);
  if (!projectType || !design || !complexity || !urgency) return { kind: "invalid" };

  let scalePrice: number | null = 0;
  if (projectType.category !== "none") {
    const tier = catalog.scale_tiers.find((t) => t.id === input.scaleTierId);
    if (!tier || tier.category !== projectType.category) return { kind: "invalid" };
    scalePrice = tier.add_price_tenge;
  }

  let modulesTotal = 0;
  const seen = new Set<string>();
  for (const id of input.selectedModuleIds) {
    const selected = catalog.modules.find((m) => m.id === id);
    if (seen.has(id) || !selected) return { kind: "invalid" };
    seen.add(id);
    const quantity = selected.per_unit ? Math.max(input.externalApiCount, 0) : 1;
    modulesTotal += selected.price_tenge * quantity;
  }

  if (projectType.base_price_tenge === null || scalePrice === null) return { kind: "individual" };

  const subtotal = projectType.base_price_tenge + scalePrice + modulesTotal;
  const designAmount = round(subtotal * design.percent);
  const multilingualAmount = input.multilingual ? round(subtotal * catalog.multilingual_percent) : 0;
  const subtotalWithPercents = subtotal + designAmount + multilingualAmount;
  const estimatedRaw = round(subtotalWithPercents * complexity.multiplier * urgency.multiplier);

  const minimum = roundToStep(estimatedRaw, catalog.round_step_tenge);
  const maximum = roundToStep(round(minimum * catalog.maximum_ratio), catalog.round_step_tenge);
  const bracket = catalog.duration_brackets.find((b) => b.max_amount_tenge === null || minimum <= b.max_amount_tenge);
  const durationLabel = (bracket ?? catalog.duration_brackets[catalog.duration_brackets.length - 1])?.label ?? "";
  return { kind: "estimate", minimum, maximum, durationLabel };
}
