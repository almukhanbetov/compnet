import type { Locale } from "@/types/i18n";

/**
 * Translations for content served by the backend (seeded in Russian). Entries
 * are keyed by stable identifiers — slug, project_type or author name — and
 * applied in lib/api/content.ts. Anything without an entry is shown as the
 * API returns it. Brand and company names stay untranslated.
 */
export interface ServiceOverviewText {
  title: string;
  description: string;
  features: string[];
}

export interface ServiceDetailText {
  eyebrow: string;
  title: string;
  description: string;
  points: string[];
  highlights: string[];
}

export interface PricingCardText {
  description: string;
  features: string[];
}

export interface PortfolioCaseText {
  title: string;
  subcategory: string;
  summary: string;
  task: string;
  process: string[];
  solution: string;
  technologies: string[];
  result: string;
  duration: string;
}

export interface TestimonialText {
  role: string;
  quote: string;
}

export interface ContentTranslations {
  services: Record<string, ServiceOverviewText>;
  serviceDetails: Record<string, ServiceDetailText>;
  pricing: Record<string, PricingCardText>;
  portfolio: Record<string, PortfolioCaseText>;
  /** Keyed by author name. */
  testimonials: Record<string, TestimonialText>;
}

export const contentTranslations: Record<Locale, ContentTranslations> = {
  // The seed is Russian; only the two reviews written in English need a
  // Russian version.
  ru: {
    services: {},
    serviceDetails: {},
    pricing: {},
    portfolio: {},
    testimonials: {
      "Elena Volkova": {
        role: "Продакт-менеджер",
        quote:
          "Мобильное приложение выпустили в срок, и оно прошло проверку App Store с первой попытки — коммуникация на протяжении всего проекта была отличной.",
      },
      "Sophie Turner": {
        role: "Руководитель операционного отдела",
        quote:
          "Поддержка отвечает в течение часа даже в выходные — за полгода у нас не было ни одного сбоя дольше нескольких минут.",
      },
    },
  },

  kk: {
    services: {
      "web-development": {
        title: "Сайттар әзірлеу",
        description: "Лендингтер, визитка-сайттар, корпоративтік сайттар мен интернет-дүкендер толық дайын күйінде.",
        features: ["Адаптивті беттеу", "SEO-құрылым", "Өз бетінше өңдеуге арналған CMS"],
      },
      "web-apps": {
        title: "Web-қосымшалар",
        description: "Өз бизнес-логикасы бар сервистер — CRM, жеке кабинеттер, платформалар.",
        features: ["Жеке архитектура", "Жеке кабинет немесе әкімші панелі", "Сыртқы жүйелермен интеграциялар"],
      },
      "mobile-apps": {
        title: "Мобильді қосымшалар",
        description: "Сторларда жарияланатын iOS және Android қосымшалары.",
        features: ["Нативті және кроссплатформалы әзірлеу", "Push-хабарландырулар", "Backend-пен интеграция"],
      },
      "ai-automation": {
        title: "ЖИ және автоматтандыру",
        description: "Чат-боттар және күнделікті бизнес-процестерді автоматтандыру.",
        features: ["ЖИ чат-боттары", "Процестерді автоматтандыру", "ЖИ модельдерін интеграциялау"],
      },
    },
    serviceDetails: {
      "web-development": {
        eyebrow: "Сайттар әзірлеу",
        title: "Нәтижеге жұмыс істейтін сайттар",
        description:
          "Жылдам жүктелетін, кез келген құрылғыда дұрыс жұмыс істейтін және іздеуде оңай табылатын сайттар жасаймыз.",
        points: [
          "Лендингтер мен визитка-сайттар",
          "Корпоративтік сайттар мен каталогтар",
          "Тапсырыс берушілерге арналған интернет-дүкендер",
          "SEO-құрылым және семантикалық беттеу",
        ],
        highlights: ["Адаптивті беттеу", "SEO-оңтайландыру", "Жоғары жылдамдық"],
      },
      "web-apps": {
        eyebrow: "Web-қосымшалар",
        title: "Нақты бизнес-логикасы бар сервистер",
        description:
          "Толыққанды бизнес-логикасы бар web-сервистер әзірлейміз — CRM-нан бастап көпжақты платформаларға дейін.",
        points: [
          "Клиенттер мен мәмілелерді есепке алуға арналған CRM-жүйелер",
          "Жеке кабинеттер мен пайдаланушы панельдері",
          "Брондау және кесте жүйелері",
          "Тапсырыс берушілерге арналған маркетплейстер",
        ],
        highlights: ["CRM және клиенттер", "Жеке кабинеттер", "Маркетплейстер"],
      },
      "mobile-apps": {
        eyebrow: "Мобильді қосымшалар",
        title: "Идеядан сторларда жариялауға дейін",
        description:
          "iOS және Android үшін мобильді қосымшаларды нативті немесе кроссплатформалы әзірлеу арқылы жасаймыз.",
        points: [
          "Нативті және кроссплатформалы қосымшалар",
          "Push-хабарландырулар және офлайн режим",
          "Backend және API-мен интеграция",
          "App Store мен Google Play-де жариялау",
        ],
        highlights: ["iOS және Android", "Push-хабарландырулар", "Кроссплатформалылық"],
      },
      "ai-automation": {
        eyebrow: "ЖИ және автоматтандыру",
        title: "Күнделікті жұмысты ЖИ көмегімен автоматтандырамыз",
        description:
          "Бизнес-процестер жылдамырақ және қол еңбегінсіз жұмыс істеуі үшін ЖИ шешімдері мен автоматтандыруды енгіземіз.",
        points: [
          "Сайт пен мессенджерлерге арналған чат-боттар",
          "Күнделікті бизнес-процестерді автоматтандыру",
          "ЖИ модельдерін өнімге интеграциялау",
          "Аналитика және ұсынымдық жүйелер",
        ],
        highlights: ["ЖИ чат-боттары", "Процестерді автоматтандыру", "ЖИ интеграциялары"],
      },
    },
    pricing: {
      landing: {
        description: "Өнімді, қызметті немесе жарнамалық науқанды іске қосуға арналған бір беттік сайт.",
        features: ["5 экранға дейін", "Адаптивті беттеу", "Өтінім формасы", "Базалық SEO-баптау"],
      },
      "business-card": {
        description: "Компанияның немесе маманның интернеттегі ықшам өкілдігі.",
        features: ["5 бетке дейін", "Адаптивті беттеу", "Байланыстар және жол картасы", "Базалық SEO-баптау"],
      },
      corporate: {
        description: "Компания, қызметтер және жаңалықтар бөлімдері бар көпбеттік сайт.",
        features: [
          "15 бетке дейін",
          "Өз бетінше өңдеуге арналған CMS",
          "Көптілділік",
          "SEO-құрылым",
          "Аналитикамен интеграция",
        ],
      },
      catalog: {
        description: "Онлайн-төлемсіз тауарлар немесе қызметтердің көпбеттік каталогы — сүзгілер мен позиция карточкаларымен.",
        features: [
          "30 тауар/қызмет карточкасына дейін",
          "Каталог бойынша сүзгілер мен іздеу",
          "Адаптивті беттеу",
          "Базалық SEO-баптау",
        ],
      },
      "online-store": {
        description: "E-commerce шешімі — каталог пен себеттен бастап онлайн-төлем қабылдауға дейін.",
        features: [
          "Позиция карточкалары бар каталог",
          "Сатып алуды рәсімдеу және онлайн-төлем",
          "Клиенттің жеке кабинеті",
          "Басқаруға арналған әкімші панелі",
          "Жеткізумен интеграция",
        ],
      },
      "web-app": {
        description: "Өз бизнес-логикасы бар жеке web-сервис — жеке кабинет немесе платформа.",
        features: [
          "Жеке архитектура",
          "Жеке кабинет немесе әкімші панелі",
          "Сыртқы жүйелермен интеграциялар",
          "Мобильді клиенттерге арналған API",
        ],
      },
      crm: {
        description: "Клиенттерді, мәмілелер мен тапсырмаларды пайдаланушы рөлдерімен есепке алу — командаңыздың процестеріне бейімделген.",
        features: [
          "Клиенттер мен мәмілелер карточкалары",
          "Сату воронкасы",
          "Рөлдер мен қолжетімділік құқықтары",
          "Хабарландырулар мен еске салғыштар",
        ],
      },
      "mobile-app": {
        description: "Сторларда жарияланатын iOS және Android қосымшасы.",
        features: [
          "Нативті немесе кроссплатформалы әзірлеу",
          "Push-хабарландырулар",
          "Backend-пен интеграция",
          "App Store мен Google Play-де жариялау",
        ],
      },
      "ai-solution": {
        description: "Чат-бот, процестерді автоматтандыру немесе ЖИ моделін өнімге интеграциялау.",
        features: [
          "Сайтқа немесе мессенджерге арналған чат-бот",
          "Күнделікті процестерді автоматтандыру",
          "ЖИ моделін интеграциялау",
          "Аналитика және ұсынымдар",
        ],
      },
      "backend-api": {
        description: "Web және мобильді клиенттерге арналған серверлік бөлік пен API — авторизация, бизнес-логика, интеграциялар.",
        features: [
          "REST немесе GraphQL API",
          "Авторизация және пайдаланушы рөлдері",
          "Сыртқы сервистермен интеграция",
          "API құжаттамасы",
        ],
      },
      "devops-vps": {
        description: "Серверлік инфрақұрылымды, CI/CD баптау және іске қосқаннан кейін жобаны сүйемелдеу.",
        features: ["VPS пен ортаны баптау", "CI/CD пайплайндары", "Мониторинг және бэкаптар", "Техникалық қолдау"],
      },
    },
    portfolio: {
      "bastas-stone-catalog": {
        title: "BASTAS — табиғи тас каталогы",
        subcategory: "Каталог",
        summary:
          "Табиғи тасты өңдеу және сату компаниясының материалдар каталогы мен құн калькуляторы бар корпоративтік сайты.",
        task:
          "Табиғи тасты өңдеу және сату компаниясына заманауи сайт жасау. Материалдар мен бұйымдар каталогын, компания қызметтерін, артықшылықтарын, байланыстарын көрсету және клиентке тапсырыс құнын алдын ала есептеу мүмкіндігін беру.",
        process: [
          "Компания қызметтерін талдау",
          "Құрылымды жобалау",
          "Дизайн жасау",
          "Каталог пен калькуляторды әзірлеу",
          "Мобильді құрылғыларға бейімдеу",
          "SEO-баптау және іске қосу",
        ],
        solution:
          "Тас каталогы, бұйым беттері, компания туралы ақпарат және құн калькуляторы бар адаптивті корпоративтік сайт әзірленді. Сайт құрылымы материалдарды іздеуді жеңілдетіп, клиентке тасты таңдаудан өтінімге көшуге көмектеседі.",
        technologies: ["Next.js", "TypeScript", "адаптивті беттеу", "Docker", "Nginx", "SEO"],
        result:
          "Компания өнім каталогы, құн калькуляторы және өтінім жіберудің ыңғайлы тәсілі бар заманауи онлайн-витринаға ие болды.",
        duration: "Шамамен 5 апта",
      },
      "avtobirzhasi-car-marketplace": {
        title: "Автобиржа — автомобиль маркетплейсі",
        subcategory: "Marketplace",
        summary: "Сатушы мен сатып алушы бағаларын жақындастыру механикасы бар автомобиль хабарландыруларының платформасы.",
        task:
          "Ерекше механикасы бар автомобиль хабарландыруларының платформасын жасау: сатушының бағасы біртіндеп төмендейді, сатып алушының бағасы көтеріледі, ал мәміле шарттары жақындаған кезде жүйе сәйкестікті қалыптастырады.",
        process: [
          "Бизнес-логиканы пысықтау",
          "Интерфейсті жобалау",
          "Каталог пен автомобиль карточкасын жасау",
          "Сәйкестік механикасын әзірлеу",
          "Backend API мен дерекқорды қосу",
          "Контейнерлеу және орналастыру",
        ],
        solution:
          "Автомобильдер каталогы, сүзгілер, хабарландыру карточкалары, жеке кабинет, хабарландырулар және сатып алушы мен сатушы бағаларының жақындау механикасының визуализациясы бар заманауи автомобиль маркетплейсі әзірленді.",
        technologies: ["Next.js", "TypeScript", "Go", "Gin", "PostgreSQL", "Docker", "REST API", "Caddy немесе Nginx"],
        result:
          "Сатып алушы мен сатушы үшін тиімді баға іздеудің бірегей механикасы бар толыққанды автомобиль маркетплейсінің негізі жасалды.",
        duration: "Шамамен 10–12 апта",
      },
      "mereytoi-event-agency": {
        title: "MEREYTOI — іс-шараларды ұйымдастыру сервисі",
        subcategory: "Сервис",
        summary: "Іс-шараларды ұйымдастыру агенттігінің галереясы мен өтінім формасы бар таныстырылым сайты.",
        task:
          "Іс-шараларды ұйымдастыру қызметтеріне арналған таныстырылым сайтын жасау: келуші жұмыс бағыттарымен, безендіру мысалдарымен танысып, компаниямен жылдам байланыса алуы керек.",
        process: [
          "Аудиторияны талдау",
          "Құрылымды әзірлеу",
          "Визуалды стиль жасау",
          "Негізгі беттерді беттеу",
          "Бейімдеу",
          "Өтініш формасын қосу",
          "Жариялау",
        ],
        solution:
          "Әсерлі басты беті, қызметтер блоктары, артықшылықтары, галереясы және түсінікті әрекетке шақырулары бар адаптивті сайт жасалды. Интерфейс қызметтермен жылдам танысуға және өтінім жіберуге бағытталған.",
        technologies: ["Заманауи frontend", "адаптивті беттеу", "Docker", "Nginx", "HTTPS"],
        result:
          "Компания қызметтері бірыңғай заманауи интерфейсте ұсынылған, ал келуші іс-шараны талқылауға жылдам көше алады.",
        duration: "Шамамен 4–6 апта",
      },
      "ddldecor-interior-design": {
        title: "DDL Decor — интерьер дизайны мен декоры",
        subcategory: "Портфолио",
        summary: "Дизайн және декор студиясының орындалған жобалар портфолиосы бар визуалды сайты.",
        task:
          "Дизайн және декор саласындағы компанияға визуалды сайт жасау, жұмыс бағыттары мен орындалған жобаларды көрсету және брендке сенім қалыптастыру.",
        process: [
          "Материалдар жинау",
          "Құрылымды қалыптастыру",
          "Визуалды тұжырымдаманы әзірлеу",
          "Қызметтер мен портфолио беттерін жасау",
          "Адаптивті беттеу",
          "Тестілеу және іске қосу",
        ],
        solution:
          "Ірі суреттерге, портфолиоға, қызметтерге және байланыс әрекеттеріне басымдық берілген заманауи сайт әзірленді. Дизайн жұмыстардың визуалды жағын ерекшелеп, жоба фотосуреттерінен назар аудартпайды.",
        technologies: ["Заманауи frontend", "адаптивті беттеу", "суреттерді оңтайландыру", "Docker", "HTTPS"],
        result:
          "Компания жобаларды көрсетуге және әлеуетті клиенттерден өтініштер қабылдауға көмектесетін ұқыпты цифрлық портфолиоға ие болды.",
        duration: "Шамамен 4–5 апта",
      },
      "edu-zhso-education-platform": {
        title: "EDU ZHSO — білім беру платформасы",
        subcategory: "Білім беру сайты",
        summary: "Бағдарламалар, оқу бағыттары және байланыстар бөлімдері бар оқу орталығының сайты.",
        task:
          "Білім беру ұйымының түсінікті сайтын жасау, бағдарламаларды, оқу бағыттарын, білім алушыларға арналған ақпаратты және байланыс тәсілдерін ұсыну.",
        process: [
          "Ақпараттық құрылымды талдау",
          "Бөлімдерді жобалау",
          "Интерфейсті әзірлеу",
          "Білім беру контентімен толтыру",
          "Бейімдеу",
          "Тестілеу",
          "Іске қосу",
        ],
        solution:
          "Түсінікті навигациясы, ақпараттық бөлімдері, бағдарламалар туралы материалдары және мобильді құрылғыларда адаптивті көрсетілуі бар құрылымдалған білім беру платформасы әзірленді.",
        technologies: ["Web-әзірлеу", "адаптивті беттеу", "CMS немесе заманауи frontend", "HTTPS"],
        result:
          "Келушілер білім беру бағдарламалары, оқу шарттары және ұйымның қызметі туралы бірыңғай ақпарат көзіне ие болды.",
        duration: "Шамамен 5–7 апта",
      },
      "parasat-center-education": {
        title: "Parasat Center — білім беру орталығы",
        subcategory: "Білім беру",
        summary: "Білім алушылар мен ата-аналарға арналған курстар мен бағыттардың сипаттамасы бар білім беру орталығының сайты.",
        task:
          "Курстар мен бағыттарды түсінікті ұсынатын, ата-аналар мен білім алушыларға бағдарлама таңдауға және әкімшілікпен байланысуға көмектесетін білім беру орталығының сайтын әзірлеу.",
        process: [
          "Орталық қызметтерін зерттеу",
          "Құрылымды әзірлеу",
          "Дизайн жасау",
          "Беттерді беттеу",
          "Әртүрлі құрылғыларға бейімдеу",
          "Форма мен сілтемелерді тестілеу",
          "Жариялау",
        ],
        solution:
          "Білім беру бағыттарының сипаттамасы, орталықтың артықшылықтары, ақпараттық блоктары және өтініш жіберуге арналған көрнекі батырмалары бар заманауи адаптивті сайт жасалды.",
        technologies: ["Заманауи frontend", "адаптивті беттеу", "өнімділікті оңтайландыру", "Docker", "HTTPS"],
        result:
          "Білім беру орталығы бағдарламалар туралы ақпаратты жүйелейтін және алғашқы өтініш жіберуді жеңілдететін ыңғайлы онлайн-таныстырылымға ие болды.",
        duration: "Шамамен 4–6 апта",
      },
    },
    testimonials: {
      "Айгерим Смагулова": {
        role: "IT-директор",
        quote:
          "COMPNET бізге корпоративтік сайтты алты аптада әзірледі — мерзімге сыйды және артық қоңыраусыз барлық түзетулерді ескерді.",
      },
      "Данияр Ахметов": {
        role: "Негізін қалаушы",
        quote:
          "Бізге жасалған CRM сату мен қолдауды бір интерфейске біріктірді — команда клиенттердің өтінімдерін жоғалтуды қойды.",
      },
      "Elena Volkova": {
        role: "Өнім менеджері",
        quote:
          "Мобильді қосымша мерзімінде шығарылды және App Store тексерісінен бірінші әрекеттен өтті — жоба бойы байланыс керемет болды.",
      },
      "Марат Кенжебаев": {
        role: "Негізін қалаушы",
        quote:
          "Интернет-дүкенді сатып алуды ыңғайлы рәсімдеумен және онлайн-төлеммен екі айда іске қостық — конверсия алғашқы айда-ақ өсті.",
      },
      "Sophie Turner": {
        role: "Операциялық бөлімнің басшысы",
        quote:
          "Қолдау қызметі демалыс күндері де бір сағат ішінде жауап береді — алты ай ішінде бізде бірнеше минуттан ұзақ бірде-бір іркіліс болған жоқ.",
      },
    },
  },

  en: {
    services: {
      "web-development": {
        title: "Website development",
        description: "Turnkey landing pages, business card websites, corporate websites and online stores.",
        features: ["Responsive layout", "SEO-friendly structure", "CMS for editing content yourself"],
      },
      "web-apps": {
        title: "Web applications",
        description: "Services with their own business logic — CRM systems, user accounts, platforms.",
        features: ["Custom architecture", "User account or admin panel", "Integrations with external systems"],
      },
      "mobile-apps": {
        title: "Mobile apps",
        description: "iOS and Android apps published to the app stores.",
        features: ["Native and cross-platform development", "Push notifications", "Backend integration"],
      },
      "ai-automation": {
        title: "AI and automation",
        description: "Chatbots and automation of routine business processes.",
        features: ["AI chatbots", "Process automation", "AI model integration"],
      },
    },
    serviceDetails: {
      "web-development": {
        eyebrow: "Website development",
        title: "Websites that deliver results",
        description:
          "We build websites that load fast, work properly on any device and are easy to find in search.",
        points: [
          "Landing pages and business card websites",
          "Corporate websites and catalogs",
          "Online stores for our clients",
          "SEO-friendly structure and semantic markup",
        ],
        highlights: ["Responsive layout", "SEO optimization", "High speed"],
      },
      "web-apps": {
        eyebrow: "Web applications",
        title: "Services with real business logic",
        description:
          "We develop web services with full-fledged business logic — from CRM systems to multi-sided platforms.",
        points: [
          "CRM systems for tracking clients and deals",
          "User accounts and dashboards",
          "Booking and scheduling systems",
          "Marketplaces for our clients",
        ],
        highlights: ["CRM and clients", "User accounts", "Marketplaces"],
      },
      "mobile-apps": {
        eyebrow: "Mobile apps",
        title: "From idea to app store release",
        description: "We build mobile apps for iOS and Android using native or cross-platform development.",
        points: [
          "Native and cross-platform apps",
          "Push notifications and offline mode",
          "Backend and API integration",
          "Publishing to the App Store and Google Play",
        ],
        highlights: ["iOS and Android", "Push notifications", "Cross-platform"],
      },
      "ai-automation": {
        eyebrow: "AI and automation",
        title: "We automate routine work with AI",
        description:
          "We implement AI solutions and automation so that business processes run faster and without manual work.",
        points: [
          "Chatbots for websites and messengers",
          "Automation of routine business processes",
          "AI model integration into your product",
          "Analytics and recommendation systems",
        ],
        highlights: ["AI chatbots", "Process automation", "AI integrations"],
      },
    },
    pricing: {
      landing: {
        description: "A single-page website to launch a product, service or advertising campaign.",
        features: ["Up to 5 screens", "Responsive layout", "Request form", "Basic SEO setup"],
      },
      "business-card": {
        description: "A compact online presence for a company or a specialist.",
        features: ["Up to 5 pages", "Responsive layout", "Contacts and directions map", "Basic SEO setup"],
      },
      corporate: {
        description: "A multi-page website with sections about the company, its services and news.",
        features: [
          "Up to 15 pages",
          "CMS for editing content yourself",
          "Multilingual",
          "SEO-friendly structure",
          "Analytics integration",
        ],
      },
      catalog: {
        description: "A multi-page catalog of products or services without online payment — with filters and item cards.",
        features: [
          "Up to 30 product/service cards",
          "Catalog filters and search",
          "Responsive layout",
          "Basic SEO setup",
        ],
      },
      "online-store": {
        description: "An e-commerce solution — from the catalog and cart to accepting online payments.",
        features: [
          "Catalog with item cards",
          "Checkout and online payment",
          "Customer account",
          "Admin panel for management",
          "Delivery integration",
        ],
      },
      "web-app": {
        description: "A custom web service with its own business logic — a user account or a platform.",
        features: [
          "Custom architecture",
          "User account or admin panel",
          "Integrations with external systems",
          "API for mobile clients",
        ],
      },
      crm: {
        description: "Tracking of clients, deals and tasks with user roles — tailored to your team's processes.",
        features: ["Client and deal cards", "Sales pipeline", "Roles and access rights", "Notifications and reminders"],
      },
      "mobile-app": {
        description: "An iOS and Android app published to the app stores.",
        features: [
          "Native or cross-platform development",
          "Push notifications",
          "Backend integration",
          "Publishing to the App Store and Google Play",
        ],
      },
      "ai-solution": {
        description: "A chatbot, process automation or integration of an AI model into your product.",
        features: [
          "Chatbot for a website or messenger",
          "Automation of routine processes",
          "AI model integration",
          "Analytics and recommendations",
        ],
      },
      "backend-api": {
        description: "Server side and API for web and mobile clients — authentication, business logic, integrations.",
        features: [
          "REST or GraphQL API",
          "Authentication and user roles",
          "Integration with external services",
          "API documentation",
        ],
      },
      "devops-vps": {
        description: "Server infrastructure setup, CI/CD and project maintenance after launch.",
        features: ["VPS and environment setup", "CI/CD pipelines", "Monitoring and backups", "Technical support"],
      },
    },
    portfolio: {
      "bastas-stone-catalog": {
        title: "BASTAS — natural stone catalog",
        subcategory: "Catalog",
        summary:
          "A corporate website for a natural stone processing and sales company, with a materials catalog and a cost calculator.",
        task:
          "Build a modern website for a company that processes and sells natural stone. Show the catalog of materials and products, the company's services, advantages and contacts, and let clients estimate the cost of an order in advance.",
        process: [
          "Analysis of the company's services",
          "Structure design",
          "Visual design",
          "Catalog and calculator development",
          "Adaptation for mobile devices",
          "SEO setup and launch",
        ],
        solution:
          "We developed a responsive corporate website with a stone catalog, product pages, company information and a cost calculator. The site structure makes it easier to find materials and helps clients move from choosing a stone to sending a request.",
        technologies: ["Next.js", "TypeScript", "responsive layout", "Docker", "Nginx", "SEO"],
        result:
          "The company got a modern online showcase with a product catalog, a cost calculator and a convenient way to send a request.",
        duration: "About 5 weeks",
      },
      "avtobirzhasi-car-marketplace": {
        title: "Avtobirzha — car marketplace",
        subcategory: "Marketplace",
        summary: "A car listings platform with a mechanism that brings the seller's and buyer's prices closer together.",
        task:
          "Build a car listings platform with an unusual mechanism: the seller's price gradually decreases, the buyer's price increases, and the system creates a match when the deal terms converge.",
        process: [
          "Business logic design",
          "Interface design",
          "Catalog and car page development",
          "Matching mechanism development",
          "Backend API and database integration",
          "Containerization and deployment",
        ],
        solution:
          "We developed a modern car marketplace with a car catalog, filters, listing cards, a user account, notifications and a visualization of how the buyer's and seller's prices converge.",
        technologies: ["Next.js", "TypeScript", "Go", "Gin", "PostgreSQL", "Docker", "REST API", "Caddy or Nginx"],
        result:
          "We built the foundation of a full-fledged car marketplace with a unique mechanism for finding a fair price for both buyer and seller.",
        duration: "About 10–12 weeks",
      },
      "mereytoi-event-agency": {
        title: "MEREYTOI — event planning service",
        subcategory: "Service",
        summary: "A presentation website for an event planning agency with a gallery and a request form.",
        task:
          "Build a presentation website for event planning services where visitors can explore the areas of work and decoration examples and quickly contact the company.",
        process: [
          "Audience analysis",
          "Structure development",
          "Visual style creation",
          "Layout of the main pages",
          "Responsive adaptation",
          "Contact form integration",
          "Publication",
        ],
        solution:
          "We created a responsive website with an expressive home page, service blocks, advantages, a gallery and clear calls to action. The interface is designed for getting to know the services quickly and sending a request.",
        technologies: ["Modern frontend", "responsive layout", "Docker", "Nginx", "HTTPS"],
        result:
          "The company's services are presented in a single modern interface, and visitors can quickly move on to discussing their event.",
        duration: "About 4–6 weeks",
      },
      "ddldecor-interior-design": {
        title: "DDL Decor — interior design and decor",
        subcategory: "Portfolio",
        summary: "A visual website for a design and decor studio with a portfolio of completed projects.",
        task:
          "Build a visual website for a design and decor company, show its areas of work and completed projects, and build trust in the brand.",
        process: [
          "Collecting materials",
          "Defining the structure",
          "Visual concept development",
          "Service and portfolio pages",
          "Responsive layout",
          "Testing and launch",
        ],
        solution:
          "We developed a modern website focused on large images, the portfolio, services and contact actions. The design emphasizes the visual side of the work and doesn't distract from the project photos.",
        technologies: ["Modern frontend", "responsive layout", "image optimization", "Docker", "HTTPS"],
        result:
          "The company got a neat digital portfolio that helps showcase its projects and receive inquiries from potential clients.",
        duration: "About 4–5 weeks",
      },
      "edu-zhso-education-platform": {
        title: "EDU ZHSO — education platform",
        subcategory: "Education website",
        summary: "A training center website with sections on programs, areas of study and contacts.",
        task:
          "Build a clear website for an educational organization presenting its programs, areas of study, information for students and ways to get in touch.",
        process: [
          "Information structure analysis",
          "Section design",
          "Interface development",
          "Adding educational content",
          "Responsive adaptation",
          "Testing",
          "Launch",
        ],
        solution:
          "We developed a structured education platform with clear navigation, information sections, materials about the programs and responsive display on mobile devices.",
        technologies: ["Web development", "responsive layout", "CMS or modern frontend", "HTTPS"],
        result:
          "Visitors got a single source of information about the educational programs, study conditions and the organization's activities.",
        duration: "About 5–7 weeks",
      },
      "parasat-center-education": {
        title: "Parasat Center — education center",
        subcategory: "Education",
        summary: "An education center website describing courses and programs for students and parents.",
        task:
          "Develop a website for an education center that clearly presents its courses and programs and helps parents and students choose a program and contact the administration.",
        process: [
          "Studying the center's services",
          "Structure development",
          "Visual design",
          "Page layout",
          "Adaptation for different devices",
          "Testing the form and links",
          "Publication",
        ],
        solution:
          "We created a modern responsive website describing the educational programs, the center's advantages and information blocks, with prominent buttons for getting in touch.",
        technologies: ["Modern frontend", "responsive layout", "performance optimization", "Docker", "HTTPS"],
        result:
          "The education center got a convenient online presentation that organizes information about its programs and makes the first contact easier.",
        duration: "About 4–6 weeks",
      },
    },
    testimonials: {
      "Айгерим Смагулова": {
        role: "IT Director",
        quote:
          "COMPNET built our corporate website in six weeks — they met the deadline and took all our edits into account without unnecessary calls.",
      },
      "Данияр Ахметов": {
        role: "Founder",
        quote:
          "The CRM they built for us brought sales and support together in one interface — our team stopped losing client requests.",
      },
      "Марат Кенжебаев": {
        role: "Founder",
        quote:
          "We launched the online store in two months with a convenient checkout and online payments — conversion grew in the very first month.",
      },
    },
  },
};
