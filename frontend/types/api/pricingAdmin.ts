import type { ApiTariff, ApiTariffModule } from "@/types/api/tariffs";

/** GET /api/v1/manager/pricing (administrators): tariffs with costs, promotions with counts. */
export interface ApiAdminTariff extends Omit<ApiTariff, "promotion"> {
  is_active: boolean;
  sort_order: number;
  allowed_module_ids: string[];
  version_created_at: string;
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
