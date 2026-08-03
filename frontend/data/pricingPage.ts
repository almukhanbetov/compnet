import type {
  PriceFactor,
  WorkFormat,
  PricingProcessStep,
} from "@/types/pricingPage";
import type { FaqItem } from "@/types/faqItem";

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
