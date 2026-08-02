export type FeatureIcon =
  | "Sparkles"
  | "Gauge"
  | "ShieldCheck"
  | "Layers"
  | "Headset"
  | "Users";

export interface Feature {
  id: string;
  title: string;
  description: string;
  icon: FeatureIcon;
}
