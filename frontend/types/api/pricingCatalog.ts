/** GET /api/v1/pricing/catalog: the server's pricing catalog (backend
 * internal/pricing), the only source of prices for the calculator and the
 * estimate preview. Requests are always recalculated on the server. */
export interface PricingCatalog {
  version: string;
  currency: string;
  round_step_tenge: number;
  multilingual_percent: number;
  maximum_ratio: number;
  project_types: Array<{
    id: string;
    label: string;
    /** null: individual estimate only. */
    base_price_tenge: number | null;
    category: "site" | "app" | "none";
    default_duration: string;
  }>;
  scale_tiers: Array<{
    id: string;
    category: "site" | "app";
    label: string;
    /** null: out of standard scope, individual estimate. */
    add_price_tenge: number | null;
  }>;
  modules: Array<{ id: string; label: string; price_tenge: number; per_unit: boolean }>;
  design_levels: Array<{ id: string; percent: number }>;
  complexity_levels: Array<{ id: string; multiplier: number }>;
  urgency_levels: Array<{ id: string; multiplier: number }>;
  /** Ascending; a null ceiling is the catch-all last bracket. */
  duration_brackets: Array<{ max_amount_tenge: number | null; label: string }>;
}
