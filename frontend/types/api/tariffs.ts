/** GET /api/v1/tariffs: active tariffs in display order (no costs). A
 * promotion is present only while it is live (active, in its period, with
 * places left). Prices are the server's; requests are priced again on save. */
export interface ApiTariffModule {
  id: string;
  label: string;
  price_tenge: number;
  per_unit: boolean;
}

export interface ApiTariffPromotion {
  slug: string;
  title: string;
  discount_tenge: number;
  /** The tariff's price with the discount. */
  price_tenge: number;
  ends_at: string;
  remaining: number;
}

export interface ApiTariff {
  slug: string;
  title: string;
  description: string;
  version: number;
  price_tenge: number;
  /** fixed: the price; from: the lower bound (final price after the brief). */
  price_kind: "fixed" | "from";
  /** Catalog project type the request is filed under. */
  project_type: string;
  features: string[];
  duration_label: string;
  /** Extra modules this tariff offers, at the catalog's prices. */
  modules: ApiTariffModule[];
  promotion: ApiTariffPromotion | null;
}

/** GET /api/v1/tariffs/:slug/quote */
export interface ApiTariffQuote {
  slug: string;
  version: number;
  price_kind: "fixed" | "from";
  base_price_tenge: number;
  modules: Array<{ id: string; quantity: number; unit_price_tenge: number; total_tenge: number }>;
  modules_total_tenge: number;
  promotion_slug?: string;
  discount_tenge: number;
  final_price_tenge: number;
  duration_label: string;
}

/** A visitor's tariff choice (what is sent with a request). */
export interface TariffChoice {
  slug: string;
  moduleIds: string[];
  externalApiCount: number;
}
