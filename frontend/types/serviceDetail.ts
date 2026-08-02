export type ServiceDetailIcon =
  | "LayoutTemplate"
  | "Search"
  | "Gauge"
  | "Users"
  | "UserCircle"
  | "Store"
  | "Smartphone"
  | "Bell"
  | "RefreshCcw"
  | "Bot"
  | "Workflow"
  | "Sparkles";

export interface ServiceDetailHighlight {
  icon: ServiceDetailIcon;
  label: string;
}

export interface ServiceDetail {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  points: string[];
  highlights: ServiceDetailHighlight[];
}
