export type ServiceOverviewIcon = "Globe" | "AppWindow" | "Smartphone" | "Bot";

export interface ServiceOverview {
  id: string;
  title: string;
  description: string;
  features: string[];
  icon: ServiceOverviewIcon;
}
