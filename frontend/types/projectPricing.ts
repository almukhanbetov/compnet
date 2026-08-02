export type ProjectPricingLabel =
  | "Лендинг"
  | "Сайт-визитка"
  | "Корпоративный сайт"
  | "Сайт-каталог"
  | "Интернет-магазин"
  | "Web-приложение"
  | "CRM-система"
  | "Мобильное приложение"
  | "AI-решение"
  | "Backend/API"
  | "DevOps/VPS"
  | "Другое";

export type ProjectPricingScale = "site" | "app" | "none";

export interface ProjectPricingEntry {
  projectType: string;
  label: ProjectPricingLabel;
  basePrice: number | null;
  defaultDuration: string;
  category: ProjectPricingScale;
}

export type CalculatorModuleId =
  | "auth"
  | "roles"
  | "cabinet"
  | "admin-panel"
  | "online-payment"
  | "search-filters"
  | "notifications"
  | "file-upload"
  | "maps-geo"
  | "chat"
  | "realtime"
  | "crm-integration"
  | "erp-integration"
  | "external-api"
  | "ai-chatbot"
  | "rag-ai"
  | "analytics-dashboard";

export interface CalculatorModule {
  id: CalculatorModuleId;
  label: string;
  price: number;
  perUnit?: boolean;
}

export type DesignLevelId = "basic" | "custom" | "premium";

export interface DesignLevel {
  id: DesignLevelId;
  label: string;
  percent: number;
}

export type ComplexityId = "standard" | "medium" | "high";

export interface ComplexityLevel {
  id: ComplexityId;
  label: string;
  multiplier: number;
}

export type UrgencyId = "normal" | "fast" | "urgent";

export interface UrgencyLevel {
  id: UrgencyId;
  label: string;
  multiplier: number;
}

export interface ScaleTier {
  id: string;
  label: string;
  addPrice: number | null;
}

export interface DurationBracket {
  maxAmount: number | null;
  label: string;
}

export interface CalculatorResult {
  minimum: number;
  maximum: number;
  durationLabel: string;
}
