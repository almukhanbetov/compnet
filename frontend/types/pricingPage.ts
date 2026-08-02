export interface PricingCardItem {
  id: string;
  title: string;
  priceFrom: string;
  duration: string;
  description: string;
  features: string[];
  serviceHref: string;
}

export type PriceFactorIcon =
  | "Layout"
  | "Palette"
  | "Workflow"
  | "Plug"
  | "User"
  | "Smartphone"
  | "LayoutDashboard"
  | "Zap"
  | "LifeBuoy";

export interface PriceFactor {
  id: string;
  label: string;
  icon: PriceFactorIcon;
}

export type WorkFormatIcon = "Wallet" | "Layers" | "Clock" | "Headset";

export interface WorkFormat {
  id: string;
  title: string;
  description: string;
  icon: WorkFormatIcon;
}

export type PricingProcessIcon =
  | "Search"
  | "PenTool"
  | "Calculator"
  | "FileText"
  | "ClipboardCheck"
  | "Rocket";

export interface PricingProcessStep {
  id: string;
  number: number;
  title: string;
  description: string;
  icon: PricingProcessIcon;
}
