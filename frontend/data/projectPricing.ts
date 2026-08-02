import type {
  ProjectPricingEntry,
  ProjectPricingLabel,
  CalculatorModule,
  DesignLevel,
  ComplexityLevel,
  UrgencyLevel,
  ScaleTier,
  DurationBracket,
} from "@/types/projectPricing";

export const projectPricingList: ProjectPricingEntry[] = [
  {
    projectType: "landing",
    label: "Лендинг",
    basePrice: 120000,
    defaultDuration: "1–2 недели",
    category: "site",
  },
  {
    projectType: "business-card",
    label: "Сайт-визитка",
    basePrice: 180000,
    defaultDuration: "1–2 недели",
    category: "site",
  },
  {
    projectType: "corporate",
    label: "Корпоративный сайт",
    basePrice: 300000,
    defaultDuration: "3–5 недель",
    category: "site",
  },
  {
    projectType: "catalog",
    label: "Сайт-каталог",
    basePrice: 400000,
    defaultDuration: "4–6 недель",
    category: "site",
  },
  {
    projectType: "online-store",
    label: "Интернет-магазин",
    basePrice: 500000,
    defaultDuration: "6–10 недель",
    category: "site",
  },
  {
    projectType: "web-app",
    label: "Web-приложение",
    basePrice: 700000,
    defaultDuration: "8–12 недель",
    category: "app",
  },
  {
    projectType: "crm",
    label: "CRM-система",
    basePrice: 800000,
    defaultDuration: "8–12 недель",
    category: "app",
  },
  {
    projectType: "mobile-app",
    label: "Мобильное приложение",
    basePrice: 900000,
    defaultDuration: "10–14 недель",
    category: "app",
  },
  {
    projectType: "ai-solution",
    label: "AI-решение",
    basePrice: 500000,
    defaultDuration: "4–8 недель",
    category: "app",
  },
  {
    projectType: "backend-api",
    label: "Backend/API",
    basePrice: 450000,
    defaultDuration: "4–8 недель",
    category: "none",
  },
  {
    projectType: "devops-vps",
    label: "DevOps/VPS",
    basePrice: 150000,
    defaultDuration: "1–3 недели",
    category: "none",
  },
  {
    projectType: "other",
    label: "Другое",
    basePrice: null,
    defaultDuration: "по договорённости",
    category: "none",
  },
];

export function formatPriceFrom(basePrice: number | null): string {
  if (basePrice === null) {
    return "Индивидуальная оценка";
  }
  return `от ${basePrice.toLocaleString("ru-RU")} ₸`;
}

export function getProjectPricing(
  label: ProjectPricingLabel,
): ProjectPricingEntry | undefined {
  return projectPricingList.find((item) => item.label === label);
}

export const calculatorModules: CalculatorModule[] = [
  { id: "auth", label: "Авторизация", price: 80000 },
  { id: "roles", label: "Роли и права", price: 100000 },
  { id: "cabinet", label: "Личный кабинет", price: 150000 },
  { id: "admin-panel", label: "Админ-панель", price: 180000 },
  { id: "online-payment", label: "Онлайн-оплата", price: 120000 },
  { id: "search-filters", label: "Поиск и фильтры", price: 80000 },
  { id: "notifications", label: "Уведомления", price: 70000 },
  { id: "file-upload", label: "Загрузка файлов/документов", price: 80000 },
  { id: "maps-geo", label: "Карты/геолокация", price: 120000 },
  { id: "chat", label: "Чат", price: 180000 },
  { id: "realtime", label: "Realtime/WebSocket", price: 200000 },
  { id: "crm-integration", label: "CRM-интеграция", price: 150000 },
  { id: "erp-integration", label: "1С/ERP-интеграция", price: 180000 },
  { id: "external-api", label: "Внешний API", price: 100000, perUnit: true },
  { id: "ai-chatbot", label: "AI-чатбот", price: 250000 },
  { id: "rag-ai", label: "RAG/AI по базе знаний", price: 350000 },
  { id: "analytics-dashboard", label: "Аналитика/dashboard", price: 150000 },
];

export const MULTILINGUAL_PERCENT = 0.1;

export const designLevels: DesignLevel[] = [
  { id: "basic", label: "Базовый", percent: 0 },
  { id: "custom", label: "Индивидуальный UI/UX", percent: 0.15 },
  { id: "premium", label: "Премиальный дизайн", percent: 0.25 },
];

export const complexityLevels: ComplexityLevel[] = [
  { id: "standard", label: "Стандартная", multiplier: 1.0 },
  { id: "medium", label: "Средняя", multiplier: 1.1 },
  { id: "high", label: "Высокая", multiplier: 1.25 },
];

export const urgencyLevels: UrgencyLevel[] = [
  { id: "normal", label: "Обычный срок", multiplier: 1.0 },
  { id: "fast", label: "Ускоренный", multiplier: 1.15 },
  { id: "urgent", label: "Срочный", multiplier: 1.25 },
];

export const siteScaleTiers: ScaleTier[] = [
  { id: "site-s", label: "До 5 страниц", addPrice: 0 },
  { id: "site-m", label: "6–15 страниц", addPrice: 80000 },
  { id: "site-l", label: "16–30 страниц", addPrice: 180000 },
  { id: "site-xl", label: "Более 30 страниц", addPrice: null },
];

export const appScaleTiers: ScaleTier[] = [
  { id: "app-s", label: "До 8 экранов", addPrice: 0 },
  { id: "app-m", label: "9–20 экранов", addPrice: 150000 },
  { id: "app-l", label: "21–40 экранов", addPrice: 300000 },
  { id: "app-xl", label: "Более 40 экранов", addPrice: null },
];

export const durationBrackets: DurationBracket[] = [
  { maxAmount: 300000, label: "1–2 недели" },
  { maxAmount: 600000, label: "2–4 недели" },
  { maxAmount: 1000000, label: "4–7 недель" },
  { maxAmount: 1500000, label: "6–10 недель" },
  { maxAmount: 2500000, label: "8–14 недель" },
  { maxAmount: null, label: "индивидуальный срок" },
];

export function getDurationLabel(amount: number): string {
  const bracket = durationBrackets.find(
    (item) => item.maxAmount === null || amount <= item.maxAmount,
  );
  return bracket ? bracket.label : "индивидуальный срок";
}
