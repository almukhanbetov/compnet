import type { ServiceOverview } from "@/types/serviceOverview";

export const servicesOverview: ServiceOverview[] = [
  {
    id: "overview-web-development",
    title: "Разработка сайтов",
    description:
      "Лендинги, визитки, корпоративные сайты и интернет-магазины под ключ.",
    features: [
      "Адаптивная вёрстка",
      "SEO-структура",
      "CMS для самостоятельного редактирования",
    ],
    icon: "Globe",
  },
  {
    id: "overview-web-apps",
    title: "Web-приложения",
    description:
      "Сервисы с собственной бизнес-логикой — CRM, личные кабинеты, платформы.",
    features: [
      "Индивидуальная архитектура",
      "Личный кабинет или админ-панель",
      "Интеграции с внешними системами",
    ],
    icon: "AppWindow",
  },
  {
    id: "overview-mobile-apps",
    title: "Мобильные приложения",
    description: "Приложения для iOS и Android с публикацией в сторах.",
    features: [
      "Нативная и кроссплатформенная разработка",
      "Push-уведомления",
      "Интеграция с backend",
    ],
    icon: "Smartphone",
  },
  {
    id: "overview-ai-automation",
    title: "AI и автоматизация",
    description: "Чат-боты и автоматизация рутинных бизнес-процессов.",
    features: [
      "AI чат-боты",
      "Автоматизация процессов",
      "Интеграция AI-моделей",
    ],
    icon: "Bot",
  },
];
