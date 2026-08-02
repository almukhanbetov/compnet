import type { ServiceDetail } from "@/types/serviceDetail";

export const webDevelopmentDetail: ServiceDetail = {
  id: "web-development",
  eyebrow: "Разработка сайтов",
  title: "Сайты, которые работают на результат",
  description:
    "Создаём сайты, которые быстро загружаются, корректно работают на любых устройствах и легко находятся в поиске.",
  points: [
    "Лендинги и сайты-визитки",
    "Корпоративные сайты и каталоги",
    "Интернет-магазины для заказчиков",
    "SEO-структура и семантическая вёрстка",
  ],
  highlights: [
    { icon: "LayoutTemplate", label: "Адаптивная вёрстка" },
    { icon: "Search", label: "SEO-оптимизация" },
    { icon: "Gauge", label: "Высокая скорость" },
  ],
};

export const webAppsDetail: ServiceDetail = {
  id: "web-apps",
  eyebrow: "Web-приложения",
  title: "Сервисы с реальной бизнес-логикой",
  description:
    "Разрабатываем web-сервисы с полноценной бизнес-логикой — от CRM до многосторонних платформ.",
  points: [
    "CRM-системы для учёта клиентов и сделок",
    "Личные кабинеты и пользовательские панели",
    "Системы бронирования и расписания",
    "Маркетплейсы для заказчиков",
  ],
  highlights: [
    { icon: "Users", label: "CRM и клиенты" },
    { icon: "UserCircle", label: "Личные кабинеты" },
    { icon: "Store", label: "Маркетплейсы" },
  ],
};

export const mobileAppsDetail: ServiceDetail = {
  id: "mobile-apps",
  eyebrow: "Мобильные приложения",
  title: "От идеи до публикации в сторах",
  description:
    "Создаём мобильные приложения для iOS и Android — с нативной или кроссплатформенной разработкой.",
  points: [
    "Нативные и кроссплатформенные приложения",
    "Push-уведомления и офлайн-режим",
    "Интеграция с backend и API",
    "Публикация в App Store и Google Play",
  ],
  highlights: [
    { icon: "Smartphone", label: "iOS и Android" },
    { icon: "Bell", label: "Push-уведомления" },
    { icon: "RefreshCcw", label: "Кроссплатформенность" },
  ],
};

export const aiAutomationDetail: ServiceDetail = {
  id: "ai-automation",
  eyebrow: "AI и автоматизация",
  title: "Автоматизируем рутину с помощью AI",
  description:
    "Внедряем AI-решения и автоматизацию, чтобы бизнес-процессы работали быстрее и без ручного труда.",
  points: [
    "Чат-боты для сайта и мессенджеров",
    "Автоматизация рутинных бизнес-процессов",
    "Интеграция AI-моделей в продукт",
    "Аналитика и рекомендательные системы",
  ],
  highlights: [
    { icon: "Bot", label: "AI чат-боты" },
    { icon: "Workflow", label: "Автоматизация процессов" },
    { icon: "Sparkles", label: "AI-интеграции" },
  ],
};
