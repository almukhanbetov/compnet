import type { ApiTariff, ApiTariffModule } from "@/types/api/tariffs";

/** GET /api/v1/manager/pricing (administrators): tariffs with costs, promotions with counts. */
export interface ApiAdminTariff extends Omit<ApiTariff, "promotion"> {
  is_active: boolean;
  sort_order: number;
  allowed_module_ids: string[];
  version_created_at: string;
  /** Why the administrator made the current version ("" for the seeded ones). */
  change_reason: string;
  /** Internal cost of the current version; null when unknown. */
  cost_tenge: number | null;
}

export interface ApiAdminPromotion {
  slug: string;
  title: string;
  tariff_slug: string;
  discount_tenge: number;
  starts_at: string | null;
  ends_at: string | null;
  max_orders: number;
  is_active: boolean;
  version: number;
  /** Places held (reserved + confirmed), confirmed ones, and free ones. */
  taken: number;
  confirmed: number;
  remaining: number;
}

export interface ApiPricingAdmin {
  tariffs: ApiAdminTariff[];
  promotions: ApiAdminPromotion[];
  /** Every catalog module (for a version's allowed modules). */
  modules: ApiTariffModule[];
  reservation_hours: number;
}

export interface TariffVersionInput {
  price_tenge: number;
  price_kind: "fixed" | "from";
  project_type: string;
  features: string[];
  allowed_module_ids: string[];
  duration_label: string;
  cost_tenge?: number;
  reason?: string;
  /** The version being edited: refused (409) when another one became current. */
  expected_version?: number;
}

/** POST /pricing/tariffs/:slug/price — a new price, everything else kept. */
export interface PriceChangeInput {
  price_tenge: number;
  /** Omitted: the current version's cost is kept. */
  cost_tenge?: number;
  reason: string;
  expected_version: number;
}

/** POST /pricing/tariffs/:slug/price/preview — nothing is stored. */
export interface PricePreviewInput {
  price_tenge: number;
  cost_tenge?: number;
  module_ids: string[];
  external_api_count: number;
}

export interface ApiQuoteSummary {
  version: number;
  base_price_tenge: number;
  modules_total_tenge: number;
  final_price_tenge: number;
}

/** What a new price would do, by the server's rules (the same as saving it). */
export interface ApiPricePreview {
  slug: string;
  current_version: number;
  new_version: number;
  current_price_tenge: number;
  new_price_tenge: number;
  price_kind: "fixed" | "from";
  /** Cost of the new version (kept or entered); null when unknown. */
  cost_tenge: number | null;
  margin_tenge: number | null;
  promo_margin_tenge: number | null;
  /** The selection at the current and at the new price (regular price). */
  current: ApiQuoteSummary;
  proposed: ApiQuoteSummary;
  promotion: {
    slug: string;
    title: string;
    is_active: boolean;
    live: boolean;
    discount_tenge: number;
    /** The selection with the discount; null when it would not apply. */
    final_price_tenge: number | null;
    ends_at: string | null;
    remaining: number;
  } | null;
  /** Block saving: field → message. */
  problems: Record<string, string>;
  warnings: string[];
  can_save: boolean;
}

/** GET /pricing/base-prices — every project type of the catalog. */
export interface ApiBasePrice {
  project_type: string;
  label: string;
  category: "site" | "app" | "none";
  /** null: individual estimate only (not editable). */
  price_tenge: number | null;
  /** 0: no stored version. */
  version: number;
  changed_at: string | null;
  /** "" for the seeded versions. */
  author: string;
  reason: string;
  editable: boolean;
}

export interface ApiEstimateRange {
  individual: boolean;
  minimum_tenge: number | null;
  maximum_tenge: number | null;
}

/** POST /pricing/base-prices/:type/preview — the calculator itself; nothing stored. */
export interface ApiBasePricePreview {
  project_type: string;
  label: string;
  current_version: number;
  new_version: number;
  current_price_tenge: number | null;
  new_price_tenge: number;
  /** The standard estimate (basic design, standard complexity, normal urgency,
   * no modules) of every scale tier; tier_id "" for types without tiers. */
  rows: Array<{ tier_id: string; tier_label: string; current: ApiEstimateRange; proposed: ApiEstimateRange }>;
  problems: Record<string, string>;
  warnings: string[];
  can_save: boolean;
}

/** GET /pricing/tariffs/:slug/history and /pricing/base-prices/:type/history — newest first. */
export interface ApiPriceHistoryEntry {
  version: number;
  price_tenge: number;
  previous_price_tenge: number | null;
  price_kind: "fixed" | "from";
  reason: string;
  /** "" for the seeded versions. */
  author: string;
  created_at: string;
  is_current: boolean;
  /** Requests saved with this version (they keep its price). */
  requests: number;
}

export interface PromotionPatch {
  title?: string;
  discount_tenge?: number;
  starts_at?: string;
  ends_at?: string;
  clear_dates?: boolean;
  max_orders?: number;
  is_active?: boolean;
}
