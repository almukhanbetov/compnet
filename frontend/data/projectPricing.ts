import type {
  ProjectPricingEntry,
  ProjectPricingLabel,
  CalculatorModule,
  DesignLevel,
  ComplexityLevel,
  UrgencyLevel,
  ScaleTier,
} from "@/types/projectPricing";

/**
 * The calculator's structure: ids, Russian labels (translated through
 * t.catalog and the contact form options), categories and order. No prices,
 * percentages or multipliers — those come only from the server's catalog,
 * GET /api/v1/pricing/catalog (lib/api/pricingCatalog.ts). An id here that
 * the catalog does not know is simply never priced.
 */

export const projectPricingList: ProjectPricingEntry[] = [
  {
    projectType: "landing",
    label: "Лендинг",
    category: "site",
  },
  {
    projectType: "business-card",
    label: "Сайт-визитка",
    category: "site",
  },
  {
    projectType: "corporate",
    label: "Корпоративный сайт",
    category: "site",
  },
  {
    projectType: "catalog",
    label: "Сайт-каталог",
    category: "site",
  },
  {
    projectType: "online-store",
    label: "Интернет-магазин",
    category: "site",
  },
  {
    projectType: "web-app",
    label: "Web-приложение",
    category: "app",
  },
  {
    projectType: "crm",
    label: "CRM-система",
    category: "app",
  },
  {
    projectType: "mobile-app",
    label: "Мобильное приложение",
    category: "app",
  },
  {
    projectType: "ai-solution",
    label: "AI-решение",
    category: "app",
  },
  {
    projectType: "backend-api",
    label: "Backend/API",
    category: "none",
  },
  {
    projectType: "devops-vps",
    label: "DevOps/VPS",
    category: "none",
  },
  {
    projectType: "other",
    label: "Другое",
    category: "none",
  },
];

export const calculatorModules: CalculatorModule[] = [
  { id: "auth", label: "Авторизация" },
  { id: "roles", label: "Роли и права" },
  { id: "cabinet", label: "Личный кабинет" },
  { id: "admin-panel", label: "Админ-панель" },
  { id: "online-payment", label: "Онлайн-оплата" },
  { id: "search-filters", label: "Поиск и фильтры" },
  { id: "notifications", label: "Уведомления" },
  { id: "file-upload", label: "Загрузка файлов/документов" },
  { id: "maps-geo", label: "Карты/геолокация" },
  { id: "chat", label: "Чат" },
  { id: "realtime", label: "Realtime/WebSocket" },
  { id: "crm-integration", label: "CRM-интеграция" },
  { id: "erp-integration", label: "1С/ERP-интеграция" },
  { id: "external-api", label: "Внешний API", perUnit: true },
  { id: "ai-chatbot", label: "AI-чатбот" },
  { id: "rag-ai", label: "RAG/AI по базе знаний" },
  { id: "analytics-dashboard", label: "Аналитика/dashboard" },
];

export const designLevels: DesignLevel[] = [
  { id: "basic", label: "Базовый" },
  { id: "custom", label: "Индивидуальный UI/UX" },
  { id: "premium", label: "Премиальный дизайн" },
];

export const complexityLevels: ComplexityLevel[] = [
  { id: "standard", label: "Стандартная" },
  { id: "medium", label: "Средняя" },
  { id: "high", label: "Высокая" },
];

export const urgencyLevels: UrgencyLevel[] = [
  { id: "normal", label: "Обычный срок" },
  { id: "fast", label: "Ускоренный" },
  { id: "urgent", label: "Срочный" },
];

export const siteScaleTiers: ScaleTier[] = [
  { id: "site-s", label: "До 5 страниц" },
  { id: "site-m", label: "6–15 страниц" },
  { id: "site-l", label: "16–30 страниц" },
  { id: "site-xl", label: "Более 30 страниц" },
];

export const appScaleTiers: ScaleTier[] = [
  { id: "app-s", label: "До 8 экранов" },
  { id: "app-m", label: "9–20 экранов" },
  { id: "app-l", label: "21–40 экранов" },
  { id: "app-xl", label: "Более 40 экранов" },
];

