import type { PromoFeatureIcon } from "@/types/promo";

/** Same price in every language; non-breaking spaces keep it on one line. */
export const PROMO_PRICE = "200\u00a0000\u00a0₸";

/** Card order; texts come from translations.promo.features. */
export const promoFeatureOrder: PromoFeatureIcon[] = ["web", "mobile", "promotion"];
