import type {
  PricingCardItem,
  PriceFactor,
  WorkFormat,
  PricingProcessStep,
} from "@/types/pricingPage";
import type { FaqItem } from "@/types/faqItem";
import { getProjectPricing, formatPriceFrom } from "@/data/projectPricing";
import type { ProjectPricingLabel } from "@/types/projectPricing";

function priceCard(
  id: string,
  label: ProjectPricingLabel,
  description: string,
  features: string[],
): PricingCardItem {
  const entry = getProjectPricing(label);
  if (!entry) {
    throw new Error(`Unknown project pricing label: ${label}`);
  }

  return {
    id,
    title: label,
    priceFrom: formatPriceFrom(entry.basePrice),
    duration: entry.defaultDuration,
    description,
    features,
    serviceHref: "/services",
  };
}

export const pricingCardItems: PricingCardItem[] = [
  priceCard(
    "price-landing",
    "Лендинг",
    "Одностраничный сайт для запуска продукта, услуги или рекламной кампании.",
    [
      "До 5 экранов",
      "Адаптивная вёрстка",
      "Форма заявки",
      "Базовая SEO-настройка",
    ],
  ),
  priceCard(
    "price-business-card",
    "Сайт-визитка",
    "Компактное представительство компании или специалиста в интернете.",
    [
      "До 5 страниц",
      "Адаптивная вёрстка",
      "Контакты и карта проезда",
      "Базовая SEO-настройка",
    ],
  ),
  priceCard(
    "price-corporate",
    "Корпоративный сайт",
    "Многостраничный сайт с разделами о компании, услугах и новостях.",
    [
      "До 15 страниц",
      "CMS для самостоятельного редактирования",
      "Мультиязычность",
      "SEO-структура",
      "Интеграция с аналитикой",
    ],
  ),
  priceCard(
    "price-catalog",
    "Сайт-каталог",
    "Многостраничный каталог товаров или услуг без онлайн-оплаты — с фильтрами и карточками позиций.",
    [
      "До 30 карточек товаров/услуг",
      "Фильтры и поиск по каталогу",
      "Адаптивная вёрстка",
      "Базовая SEO-настройка",
    ],
  ),
  priceCard(
    "price-online-store",
    "Интернет-магазин",
    "E-commerce решение — от каталога и корзины до приёма онлайн-оплаты.",
    [
      "Каталог с карточками позиций",
      "Оформление покупки и онлайн-оплата",
      "Личный кабинет клиента",
      "Админ-панель для управления",
      "Интеграция с доставкой",
    ],
  ),
  priceCard(
    "price-web-app",
    "Web-приложение",
    "Индивидуальный web-сервис с собственной бизнес-логикой — личный кабинет или платформа.",
    [
      "Индивидуальная архитектура",
      "Личный кабинет или админ-панель",
      "Интеграции с внешними системами",
      "API для мобильных клиентов",
    ],
  ),
  priceCard(
    "price-crm",
    "CRM-система",
    "Учёт клиентов, сделок и задач с ролями пользователей — под процессы вашей команды.",
    [
      "Карточки клиентов и сделок",
      "Воронка продаж",
      "Роли и права доступа",
      "Уведомления и напоминания",
    ],
  ),
  priceCard(
    "price-mobile-app",
    "Мобильное приложение",
    "Приложение для iOS и Android с публикацией в сторах.",
    [
      "Нативная или кроссплатформенная разработка",
      "Push-уведомления",
      "Интеграция с backend",
      "Публикация в App Store и Google Play",
    ],
  ),
  priceCard(
    "price-ai-solution",
    "AI-решение",
    "Чат-бот, автоматизация процессов или интеграция AI-модели в продукт.",
    [
      "Чат-бот для сайта или мессенджера",
      "Автоматизация рутинных процессов",
      "Интеграция AI-модели",
      "Аналитика и рекомендации",
    ],
  ),
  priceCard(
    "price-backend-api",
    "Backend/API",
    "Серверная часть и API для веб- и мобильных клиентов — авторизация, бизнес-логика, интеграции.",
    [
      "REST или GraphQL API",
      "Авторизация и роли пользователей",
      "Интеграция с внешними сервисами",
      "Документация API",
    ],
  ),
  priceCard(
    "price-devops",
    "DevOps/VPS",
    "Настройка серверной инфраструктуры, CI/CD и сопровождение проекта после запуска.",
    [
      "Настройка VPS и окружения",
      "CI/CD пайплайны",
      "Мониторинг и бэкапы",
      "Техническая поддержка",
    ],
  ),
];

export const priceFactors: PriceFactor[] = [
  {
    id: "factor-screens",
    label: "Количество экранов и страниц",
    icon: "Layout",
  },
  {
    id: "factor-design",
    label: "Индивидуальный дизайн",
    icon: "Palette",
  },
  {
    id: "factor-logic",
    label: "Сложность бизнес-логики",
    icon: "Workflow",
  },
  {
    id: "factor-integrations",
    label: "Интеграции с внешними системами",
    icon: "Plug",
  },
  {
    id: "factor-cabinet",
    label: "Личный кабинет",
    icon: "User",
  },
  {
    id: "factor-mobile",
    label: "Мобильная версия",
    icon: "Smartphone",
  },
  {
    id: "factor-admin",
    label: "Админ-панель",
    icon: "LayoutDashboard",
  },
  {
    id: "factor-urgency",
    label: "Срочность разработки",
    icon: "Zap",
  },
  {
    id: "factor-support",
    label: "Поддержка после запуска",
    icon: "LifeBuoy",
  },
];

export const workFormats: WorkFormat[] = [
  {
    id: "format-fixed",
    title: "Фиксированная стоимость",
    description:
      "Объём работ и цена зафиксированы до старта — подходит для проектов с понятным техническим заданием.",
    icon: "Wallet",
  },
  {
    id: "format-staged",
    title: "Поэтапная разработка",
    description:
      "Разбиваем проект на этапы с приёмкой и оплатой каждого — удобно для крупных продуктов.",
    icon: "Layers",
  },
  {
    id: "format-tm",
    title: "Time & Materials",
    description:
      "Оплата по фактически затраченным часам — гибкий формат для задач с меняющимися требованиями.",
    icon: "Clock",
  },
  {
    id: "format-support",
    title: "Техническая поддержка",
    description:
      "Ежемесячное сопровождение после запуска — обновления, мониторинг и доработки.",
    icon: "Headset",
  },
];

export const pricingProcessSteps: PricingProcessStep[] = [
  {
    id: "process-1",
    number: 1,
    title: "Анализ задачи",
    description: "Изучаем цели, аудиторию и требования проекта.",
    icon: "Search",
  },
  {
    id: "process-2",
    number: 2,
    title: "Прототип",
    description:
      "Собираем структуру и пользовательские сценарии перед дизайном.",
    icon: "PenTool",
  },
  {
    id: "process-3",
    number: 3,
    title: "Оценка",
    description: "Считаем объём работ, сроки и предварительный бюджет.",
    icon: "Calculator",
  },
  {
    id: "process-4",
    number: 4,
    title: "Техническое задание",
    description:
      "Фиксируем функциональность, экраны и интеграции в документе.",
    icon: "FileText",
  },
  {
    id: "process-5",
    number: 5,
    title: "Утверждение этапов",
    description: "Согласуем план работ, сроки и стоимость по этапам.",
    icon: "ClipboardCheck",
  },
  {
    id: "process-6",
    number: 6,
    title: "Запуск работ",
    description: "Приступаем к разработке по утверждённому плану.",
    icon: "Rocket",
  },
];

export const pricingFaqItems: FaqItem[] = [
  {
    id: "pricing-faq-1",
    question: "Из чего складывается итоговая стоимость?",
    answer:
      "Цена зависит от количества экранов, сложности бизнес-логики, интеграций и срочности запуска. Финальную смету готовим после брифа.",
  },
  {
    id: "pricing-faq-2",
    question: "Указанные цены — это итоговая стоимость?",
    answer:
      "Нет, это стартовые ориентиры «от». Точная цена определяется после обсуждения задач и подготовки технического задания.",
  },
  {
    id: "pricing-faq-3",
    question: "Можно ли работать по фиксированной цене?",
    answer:
      "Да, для проектов с понятным техническим заданием мы фиксируем стоимость и сроки до начала работ.",
  },
  {
    id: "pricing-faq-4",
    question: "Берёте ли вы предоплату?",
    answer:
      "Да, работаем поэтапно: частичная предоплата на старте и оплата по завершении ключевых этапов.",
  },
  {
    id: "pricing-faq-5",
    question: "Что делать, если бюджет ограничен?",
    answer:
      "Предложим MVP-версию с базовым набором функций, а часть возможностей вынесем в следующие этапы.",
  },
  {
    id: "pricing-faq-6",
    question: "Входит ли поддержка в стоимость проекта?",
    answer:
      "Базовый гарантийный период входит в разработку, дальнейшее сопровождение оформляется отдельным форматом поддержки.",
  },
];
