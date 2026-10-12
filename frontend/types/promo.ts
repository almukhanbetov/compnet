export type PromoFeatureIcon = "web" | "mobile" | "promotion";

export interface PromoFeature {
  id: string;
  icon: PromoFeatureIcon;
  title: string;
  description: string;
}

export interface PromoOffer {
  label: string;
  title: string;
  subtitle: string;
  price: string;
  priceNote: string;
  description: string;
  features: PromoFeature[];
  terms: string;
  whatsappMessage: string;
}
