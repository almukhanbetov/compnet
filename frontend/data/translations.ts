import type { Locale, LocaleOption, Translations } from "@/types/i18n";

export const localeOptions: LocaleOption[] = [
  { value: "kk", label: "Қазақша", shortLabel: "KZ" },
  { value: "ru", label: "Русский", shortLabel: "RU" },
  { value: "en", label: "English", shortLabel: "EN" },
];

export const translations: Record<Locale, Translations> = {
  kk: {
    header: {
      nav: {
        services: "Қызметтер",
        solutions: "Шешімдер",
        pricing: "Бағалар",
        calculator: "Есептегіш",
        portfolio: "Портфолио",
        about: "Компания туралы",
        contacts: "Байланыс",
      },
      actions: {
        login: "Кіру",
        discuss: "Жобаны талқылау",
      },
    },
    hero: {
      badge: "COMPNET Digital Studio",
      titleLine1: "Бизнес үшін web және",
      titleLine2: "мобильді қосымшалар жасаймыз",
      description:
        "Заманауи сайттар, web-сервистер, мобильді қосымшалар, CRM, маркетплейстер және ЖИ-шешімдер әзірлейміз — идея мен дизайннан бастап іске қосу мен қолдауға дейін.",
      ctaPrimary: "Құнын есептеу",
      ctaSecondary: "Қызметтерді көру",
      stats: [
        { value: "50+", label: "жүзеге асырылған жоба" },
        { value: "7+", label: "әзірлеу бағыты" },
        { value: "24/7", label: "Қолдау" },
      ],
      directions: [
        { icon: "Globe", label: "Web Development" },
        { icon: "Smartphone", label: "Mobile Apps" },
        { icon: "Bot", label: "AI Solutions" },
        { icon: "Server", label: "Backend & API" },
        { icon: "Palette", label: "UI/UX Design" },
        { icon: "Settings2", label: "DevOps" },
      ],
    },
  },
  ru: {
    header: {
      nav: {
        services: "Услуги",
        solutions: "Решения",
        pricing: "Цены",
        calculator: "Калькулятор",
        portfolio: "Портфолио",
        about: "О компании",
        contacts: "Контакты",
      },
      actions: {
        login: "Войти",
        discuss: "Обсудить проект",
      },
    },
    hero: {
      badge: "COMPNET Digital Studio",
      titleLine1: "Создаём web и мобильные",
      titleLine2: "приложения для бизнеса",
      description:
        "Разрабатываем современные сайты, web-сервисы, мобильные приложения, CRM, маркетплейсы и AI-решения — от идеи и дизайна до запуска и поддержки.",
      ctaPrimary: "Рассчитать стоимость",
      ctaSecondary: "Смотреть услуги",
      stats: [
        { value: "50+", label: "реализованных проектов" },
        { value: "7+", label: "направлений разработки" },
        { value: "24/7", label: "Поддержка" },
      ],
      directions: [
        { icon: "Globe", label: "Web Development" },
        { icon: "Smartphone", label: "Mobile Apps" },
        { icon: "Bot", label: "AI Solutions" },
        { icon: "Server", label: "Backend & API" },
        { icon: "Palette", label: "UI/UX Design" },
        { icon: "Settings2", label: "DevOps" },
      ],
    },
  },
  en: {
    header: {
      nav: {
        services: "Services",
        solutions: "Solutions",
        pricing: "Pricing",
        calculator: "Calculator",
        portfolio: "Portfolio",
        about: "About",
        contacts: "Contacts",
      },
      actions: {
        login: "Log In",
        discuss: "Discuss a project",
      },
    },
    hero: {
      badge: "COMPNET Digital Studio",
      titleLine1: "We build web and mobile",
      titleLine2: "applications for business",
      description:
        "We design and develop modern websites, web services, mobile apps, CRMs, marketplaces and AI solutions — from idea and design to launch and support.",
      ctaPrimary: "Estimate Cost",
      ctaSecondary: "See Services",
      stats: [
        { value: "50+", label: "projects delivered" },
        { value: "7+", label: "development directions" },
        { value: "24/7", label: "Support" },
      ],
      directions: [
        { icon: "Globe", label: "Web Development" },
        { icon: "Smartphone", label: "Mobile Apps" },
        { icon: "Bot", label: "AI Solutions" },
        { icon: "Server", label: "Backend & API" },
        { icon: "Palette", label: "UI/UX Design" },
        { icon: "Settings2", label: "DevOps" },
      ],
    },
  },
};
