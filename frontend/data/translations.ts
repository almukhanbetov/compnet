import type { Locale, LocaleOption, Translations } from "@/types/i18n";
import { contactPageTranslations } from "@/data/i18n/contactPage";
import { commonTranslations } from "@/data/i18n/common";
import { homeTranslations } from "@/data/i18n/home";
import { catalogTranslations } from "@/data/i18n/catalog";
import { pricingTranslations } from "@/data/i18n/pricing";
import { portfolioTranslations } from "@/data/i18n/portfolio";
import { chatTranslations } from "@/data/i18n/chat";

export const localeOptions: LocaleOption[] = [
  { value: "kk", label: "Қазақша", shortLabel: "KZ" },
  { value: "ru", label: "Русский", shortLabel: "RU" },
  { value: "en", label: "English", shortLabel: "EN" },
];

export const translations: Record<Locale, Translations> = {
  kk: {
    common: commonTranslations.kk,
    home: homeTranslations.kk,
    catalog: catalogTranslations.kk,
    pricing: pricingTranslations.kk,
    portfolio: portfolioTranslations.kk,
    chat: chatTranslations.kk,
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
        call: "Қоңырау шалу",
        whatsapp: "WhatsApp-қа жазу",
        opensInNewTab: "(жаңа қойындыда ашылады)",
      },
      mobile: {
        language: "Тіл",
        theme: "Тақырып",
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
    promo: {
      announcementBadge: "Акция",
      label: "Арнайы ұсыныс",
      title: "Бизнеске арналған цифрлық бастау",
      subtitle: "Веб-қосымша + мобильді қосымша + жылжытуды бастапқы баптау",
      priceLabel: "Құны",
      priceNote: "негізгі пакет үшін",
      description:
        "Клиенттеріңізге браузерде де, смартфонда да ыңғайлы сервис іске қосыңыз. Негізгі функцияларды анықтауға және жобаны алғашқы пайдаланушыларды тартуға дайындауға көмектесеміз.",
      features: {
        web: {
          title: "Веб-қосымша",
          description: "Компьютер мен телефонға ыңғайлы интерфейс. Бизнесіңіздің міндеттеріне сай негізгі функциялар.",
        },
        mobile: {
          title: "Мобильді қосымша",
          description: "Келісілген негізгі функционалы бар сервистің мобильді нұсқасы.",
        },
        promotion: {
          title: "Жылжытуды бастау",
          description: "Негізгі SEO-дайындық, аналитиканы қосу және жарнамалық науқанды бастапқы баптау.",
        },
      },
      termsLabel: "Шарттар.",
      terms:
        "Баға негізгі пакетке қолданылады. Функционал, мобильді қосымшаның платформалары, мерзімдер мен жұмыс құрамы әзірлеу басталғанға дейін келісіледі. Жарнама бюджеті, домен, хостинг және қосымшалар дүкендерінің алымдары бөлек төленеді.",
      whatsappButton: "Жобаны WhatsApp-та талқылау",
      callButton: "Қоңырау шалу",
      whatsappMessage:
        "Сәлеметсіз бе! “Бизнеске арналған цифрлық бастау” пакеті 200 000 ₸ бағасымен қызықтырады. Жобаны талқылағым келеді",
    },
    homeContacts: {
      eyebrow: "Байланыс",
      title: "Бізбен байланысыңыз",
      description:
        "Пошта, телефон немесе Алматыдағы кеңсе — ыңғайлы байланыс тәсілін таңдаңыз, жұмыс күні ішінде жауап береміз.",
      city: "Алматы, Қазақстан",
    },
    contactPage: contactPageTranslations.kk,
  },
  ru: {
    common: commonTranslations.ru,
    home: homeTranslations.ru,
    catalog: catalogTranslations.ru,
    pricing: pricingTranslations.ru,
    portfolio: portfolioTranslations.ru,
    chat: chatTranslations.ru,
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
        call: "Позвонить",
        whatsapp: "Написать в WhatsApp",
        opensInNewTab: "(откроется в новой вкладке)",
      },
      mobile: {
        language: "Язык",
        theme: "Тема",
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
    promo: {
      announcementBadge: "Акция",
      label: "Специальное предложение",
      title: "Цифровой старт для бизнеса",
      subtitle: "Веб-приложение + мобильное приложение + стартовая настройка продвижения",
      priceLabel: "Стоимость",
      priceNote: "за базовый пакет",
      description:
        "Запустите удобный сервис для ваших клиентов: в браузере и на смартфоне. Поможем определить основные функции и подготовить проект к привлечению первых пользователей.",
      features: {
        web: {
          title: "Веб-приложение",
          description: "Удобный интерфейс для компьютеров и телефонов. Основные функции под задачи вашего бизнеса.",
        },
        mobile: {
          title: "Мобильное приложение",
          description: "Мобильная версия сервиса с согласованным базовым функционалом.",
        },
        promotion: {
          title: "Старт продвижения",
          description: "Базовая SEO-подготовка, подключение аналитики и первоначальная настройка рекламной кампании.",
        },
      },
      termsLabel: "Условия.",
      terms:
        "Стоимость действует для базового пакета. Функционал, платформы мобильного приложения, сроки и состав работ согласовываются до начала разработки. Рекламный бюджет, домен, хостинг и сборы магазинов приложений оплачиваются отдельно.",
      whatsappButton: "Обсудить проект в WhatsApp",
      callButton: "Позвонить",
      whatsappMessage:
        "Здравствуйте! Интересует пакет “Цифровой старт для бизнеса” за 200 000 ₸. Хочу обсудить проект",
    },
    homeContacts: {
      eyebrow: "Контакты",
      title: "Свяжитесь с нами",
      description:
        "Почта, телефон и офис в Алматы — выберите удобный способ связи, ответим в течение рабочего дня.",
      city: "Алматы, Казахстан",
    },
    contactPage: contactPageTranslations.ru,
  },
  en: {
    common: commonTranslations.en,
    home: homeTranslations.en,
    catalog: catalogTranslations.en,
    pricing: pricingTranslations.en,
    portfolio: portfolioTranslations.en,
    chat: chatTranslations.en,
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
        call: "Call",
        whatsapp: "Message us on WhatsApp",
        opensInNewTab: "(opens in a new tab)",
      },
      mobile: {
        language: "Language",
        theme: "Theme",
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
    promo: {
      announcementBadge: "Offer",
      label: "Special offer",
      title: "Digital Start for Business",
      subtitle: "Web app + mobile app + initial marketing setup",
      priceLabel: "Price",
      priceNote: "for the basic package",
      description:
        "Launch a convenient service for your customers, in the browser and on smartphones. We will help you define the core features and get the project ready to attract its first users.",
      features: {
        web: {
          title: "Web app",
          description: "A convenient interface for desktop and mobile. Core features tailored to your business needs.",
        },
        mobile: {
          title: "Mobile app",
          description: "A mobile version of the service with an agreed set of core features.",
        },
        promotion: {
          title: "Marketing kick-off",
          description: "Basic SEO preparation, analytics setup and the initial setup of an advertising campaign.",
        },
      },
      termsLabel: "Terms.",
      terms:
        "The price applies to the basic package. Features, mobile app platforms, timelines and scope of work are agreed before development starts. Advertising budget, domain, hosting and app store fees are paid separately.",
      whatsappButton: "Discuss your project on WhatsApp",
      callButton: "Call us",
      whatsappMessage:
        "Hello! I'm interested in the “Digital Start for Business” package for 200 000 ₸. I'd like to discuss my project",
    },
    homeContacts: {
      eyebrow: "Contacts",
      title: "Get in touch",
      description:
        "Email, phone or our office in Almaty — choose whatever suits you, and we will reply within one business day.",
      city: "Almaty, Kazakhstan",
    },
    contactPage: contactPageTranslations.en,
  },
};
