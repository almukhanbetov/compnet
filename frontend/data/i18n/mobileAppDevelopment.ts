import type { Locale } from "@/types/i18n";

/** /services/mobile-app-development */
export const MOBILE_APP_DEVELOPMENT_PATH = "/services/mobile-app-development";

/** Ids from data/pricingPage.ts whose labels (t.pricing.factors.items) explain the final price.
 * No prices or durations are shown on this page: the owner has not confirmed them for it. */
export const mobilePriceFactorIds = [
  "factor-screens",
  "factor-design",
  "factor-logic",
  "factor-integrations",
  "factor-cabinet",
  "factor-admin",
  "factor-urgency",
  "factor-support",
] as const;

/** Platforms and approaches, in display order. */
export const mobilePlatformIds = ["android", "ios", "native", "crossPlatform"] as const;
export type MobilePlatformId = (typeof mobilePlatformIds)[number];

/** Texts of /services/mobile-app-development. Only facts already published on the
 * site are used (iOS and Android; native and cross-platform development; push
 * notifications and offline mode; backend and API integration; App Store and
 * Google Play publishing; server side and API; support after launch). Do not add
 * frameworks, prices, durations, clients, reviews or cases without the owner's
 * confirmation. */
export interface MobileAppDevelopmentTranslations {
  seo: { title: string; description: string };
  breadcrumb: { label: string; home: string; services: string; current: string };
  /** Link to this page from the "mobile apps" block on /services. */
  serviceLink: string;
  hero: {
    badge: string;
    title: string;
    description: string;
    discuss: string;
    whatsapp: string;
    /** Pre-filled WhatsApp message. */
    whatsappMessage: string;
    /** Short offer points under the description (facts from this page only). */
    highlights: string[];
    /** Texts of the CSS demo screens next to the hero; they illustrate typical
     * features and must not be presented as client products. */
    visual: {
      demoBadge: string;
      caption: string;
      android: { title: string; pushTitle: string; pushText: string; orders: { name: string; status: string }[] };
      ios: { subtitle: string; title: string; offline: string; button: string };
      chips: { push: string; api: string; stores: string };
    };
  };
  platforms: {
    eyebrow: string;
    title: string;
    description: string;
    items: Record<MobilePlatformId, { title: string; description: string }>;
  };
  tasks: {
    eyebrow: string;
    title: string;
    description: string;
    items: { title: string; description: string }[];
  };
  included: {
    eyebrow: string;
    title: string;
    description: string;
    items: { title: string; description: string }[];
  };
  steps: { eyebrow: string; title: string; items: { title: string; description: string }[] };
  advantages: {
    eyebrow: string;
    title: string;
    items: { title: string; description: string }[];
    webAppsLink: string;
  };
  pricing: {
    eyebrow: string;
    title: string;
    description: string;
    factorsTitle: string;
    note: string;
    pricingLink: string;
    calculatorLink: string;
  };
  works: { eyebrow: string; title: string; description: string; allWorks: string };
  faq: { eyebrow: string; title: string; items: { question: string; answer: string }[] };
  /** Request form section; no prices on this page, so no estimate. */
  requestForm: {
    eyebrow: string;
    title: string;
    description: string;
    /** Side column with the direct contact channels. */
    asideTitle: string;
    asideText: string;
    contactsLink: string;
  };
  cta: { title: string; description: string; discuss: string; whatsapp: string; phone: string };
}

export const mobileAppDevelopmentTranslations: Record<Locale, MobileAppDevelopmentTranslations> = {
  ru: {
    seo: {
      title: "Разработка мобильных приложений в Алматы | COMPNET",
      description:
        "Мобильные приложения для Android и iOS в Алматы: нативная и кроссплатформенная разработка, интеграция с backend и публикация в сторах. Обсудите проект с COMPNET.",
    },
    breadcrumb: { label: "Хлебные крошки", home: "Главная", services: "Услуги", current: "Мобильные приложения" },
    serviceLink: "Подробнее о разработке мобильных приложений",
    hero: {
      badge: "Мобильные приложения",
      title: "Разработка мобильных приложений в Алматы",
      description:
        "Проектируем и разрабатываем приложения для Android и iOS под задачи вашего бизнеса — от интерфейсов и серверной части до публикации в App Store и Google Play и поддержки после запуска. Функции, платформы, сроки и стоимость фиксируем до начала разработки.",
      discuss: "Обсудить проект",
      whatsapp: "Написать в WhatsApp",
      whatsappMessage: "Здравствуйте! Хочу обсудить разработку мобильного приложения.",
      highlights: [
        "Android и iOS — нативно или кроссплатформенно",
        "Приложение, backend и API в одной команде",
        "Публикация в сторах и поддержка после запуска",
        "Объём и стоимость — до начала работ",
      ],
      visual: {
        demoBadge: "Демо",
        caption: "Демонстрационные интерфейсы: иллюстрация типовых функций, не проекты клиентов.",
        android: {
          title: "Мои заказы",
          pushTitle: "Статус заказа обновлён",
          pushText: "Заказ передан в доставку",
          orders: [
            { name: "Заказ 1024", status: "В пути" },
            { name: "Заказ 1019", status: "Готов" },
          ],
        },
        ios: { subtitle: "Онлайн-запись", title: "Выберите время", offline: "Данные доступны без интернета", button: "Записаться" },
        chips: { push: "Push-уведомления", api: "Интеграция с API", stores: "App Store и Google Play" },
      },
    },
    platforms: {
      eyebrow: "Платформы",
      title: "Android, iOS и выбор подхода",
      description: "Платформы и способ разработки выбираем вместе с вами на первом обсуждении — от этого зависят состав работ и бюджет.",
      items: {
        android: {
          title: "Android",
          description: "Приложение для смартфонов на Android с публикацией в Google Play.",
        },
        ios: {
          title: "iOS",
          description: "Приложение для iPhone с публикацией в App Store.",
        },
        native: {
          title: "Нативная разработка",
          description: "Отдельное приложение под каждую платформу — когда важны возможности конкретной системы и устройства.",
        },
        crossPlatform: {
          title: "Кроссплатформенная разработка",
          description: "Общая кодовая база для Android и iOS — когда приложение нужно выпустить сразу на обеих платформах.",
        },
      },
    },
    tasks: {
      eyebrow: "Задачи",
      title: "Когда бизнесу нужно мобильное приложение",
      description: "Приложение оправдано, когда клиенты или сотрудники регулярно пользуются вашим сервисом с телефона.",
      items: [
        {
          title: "Сервис для клиентов",
          description: "Заказы, запись, бронирование или личный кабинет, которыми удобно пользоваться со смартфона.",
        },
        {
          title: "Инструмент для сотрудников",
          description: "Приложение для работы команды в поле: задачи, статусы и данные под рукой.",
        },
        {
          title: "Мобильная версия веб-сервиса",
          description: "Приложение к уже работающему сайту, CRM или платформе через их API.",
        },
        {
          title: "Связь с клиентами",
          description: "Push-уведомления о статусах, акциях и важных событиях прямо на телефон.",
        },
      ],
    },
    included: {
      eyebrow: "Что входит в работу",
      title: "От идеи до публикации в сторах",
      description: "Точный состав работ фиксируем до начала разработки.",
      items: [
        { title: "Push-уведомления и офлайн-режим", description: "Уведомления пользователям и работа приложения при нестабильной связи — если это нужно задаче." },
        { title: "Интеграция с backend и API", description: "Подключаем приложение к вашей серверной части, сайту или внешним сервисам." },
        { title: "Серверная часть", description: "Если backend ещё нет — разрабатываем API с авторизацией, ролями пользователей и бизнес-логикой." },
        { title: "Публикация в App Store и Google Play", description: "Готовим сборки и публикуем приложение в магазинах приложений." },
        { title: "Поддержка после запуска", description: "Сопровождаем приложение после публикации." },
      ],
    },
    steps: {
      eyebrow: "Как работаем",
      title: "Этапы разработки",
      items: [
        { title: "Обсуждение задачи", description: "Разбираемся в целях, аудитории и сценариях, ради которых нужно приложение." },
        { title: "Согласование объёма", description: "Фиксируем функции, платформы, сроки и стоимость до начала разработки." },
        { title: "Проектирование и разработка", description: "Проектируем интерфейсы и разрабатываем согласованные функции приложения и серверной части." },
        { title: "Проверка", description: "Проверяем работу приложения на разных устройствах и в разных сценариях." },
        { title: "Публикация и поддержка", description: "Публикуем приложение в сторах и сопровождаем его после запуска." },
      ],
    },
    advantages: {
      eyebrow: "Почему COMPNET",
      title: "С чем вы работаете",
      items: [
        { title: "Весь путь проекта", description: "Берём на себя проектирование, разработку, запуск и техническую поддержку." },
        { title: "Приложение и серверная часть", description: "Разрабатываем мобильное приложение, backend и API в одной команде — без поиска отдельных подрядчиков." },
        { title: "Объём фиксируем заранее", description: "Состав работ, сроки и стоимость согласуем до начала разработки." },
        { title: "Алматы и Казахстан", description: "Находимся в Алматы и работаем с заказчиками из Казахстана." },
      ],
      webAppsLink: "Все услуги COMPNET",
    },
    pricing: {
      eyebrow: "Стоимость",
      title: "От чего зависит цена приложения",
      description: "Стоимость рассчитываем под ваш проект — она зависит от функций, платформ и объёма работ.",
      factorsTitle: "Что влияет на стоимость",
      note: "Ориентиры по услугам — на странице цен, предварительный расчёт — в калькуляторе. Точную стоимость фиксируем после обсуждения задачи. Сборы магазинов приложений оплачиваются отдельно.",
      pricingLink: "Цены на услуги",
      calculatorLink: "Калькулятор стоимости",
    },
    works: {
      eyebrow: "Работы",
      title: "Наши проекты",
      description: "Реализованные проекты COMPNET собраны в портфолио.",
      allWorks: "Смотреть портфолио",
    },
    faq: {
      eyebrow: "FAQ",
      title: "Частые вопросы",
      items: [
        {
          question: "Вы разрабатываете приложения и для Android, и для iOS?",
          answer: "Да. Разрабатываем приложения для Android и iOS и публикуем их в Google Play и App Store.",
        },
        {
          question: "Что выбрать: нативную или кроссплатформенную разработку?",
          answer:
            "Нативная разработка — отдельное приложение под каждую платформу, кроссплатформенная — общая кодовая база для Android и iOS. Подход выбираем вместе на этапе обсуждения, исходя из функций приложения и бюджета.",
        },
        {
          question: "Можно подключить приложение к нашему сайту или CRM?",
          answer: "Да, интегрируем приложение с backend и API. Если серверной части ещё нет, можем разработать её.",
        },
        {
          question: "Сколько стоит разработка мобильного приложения?",
          answer:
            "Стоимость зависит от количества экранов, дизайна, сложности логики, интеграций и срочности. Предварительно оценить проект можно в калькуляторе, точную стоимость фиксируем до начала разработки.",
        },
        {
          question: "Кто публикует приложение в App Store и Google Play?",
          answer: "Публикация в магазинах приложений входит в работу. Сборы магазинов оплачиваются отдельно.",
        },
        {
          question: "Вы поддерживаете приложение после запуска?",
          answer: "Да, сопровождаем приложение после публикации.",
        },
      ],
    },
    requestForm: {
      eyebrow: "Заявка",
      title: "Расскажите о вашем приложении",
      description:
        "Тип проекта уже выбран — опишите идею и нужные платформы. Менеджер свяжется с вами, чтобы уточнить детали и предложить следующий шаг.",
      asideTitle: "Удобнее связаться напрямую?",
      asideText: "Напишите нам в WhatsApp или позвоните — ответим на вопросы о приложении.",
      contactsLink: "Все контакты",
    },
    cta: {
      title: "Обсудим ваше приложение?",
      description: "Расскажите о задаче — предложим подход, состав работ и следующий шаг.",
      discuss: "Оставить заявку",
      whatsapp: "Написать в WhatsApp",
      phone: "Позвонить",
    },
  },
  kk: {
    seo: {
      title: "Алматыда мобильді қосымшалар әзірлеу | COMPNET",
      description:
        "Алматыда Android және iOS үшін мобильді қосымшалар: нативті және кроссплатформалық әзірлеу, backend-пен интеграция және сторларда жариялау. Жобаны COMPNET-пен талқылаңыз.",
    },
    breadcrumb: { label: "Навигация жолы", home: "Басты бет", services: "Қызметтер", current: "Мобильді қосымшалар" },
    serviceLink: "Мобильді қосымшалар әзірлеу туралы толығырақ",
    hero: {
      badge: "Мобильді қосымшалар",
      title: "Алматыда мобильді қосымшалар әзірлеу",
      description:
        "Бизнесіңіздің міндеттеріне арналған Android және iOS қосымшаларын жобалап, әзірлейміз — интерфейстер мен серверлік бөліктен бастап App Store мен Google Play-де жариялауға және іске қосылғаннан кейінгі қолдауға дейін. Функцияларды, платформаларды, мерзімі мен құнын әзірлеу басталғанға дейін бекітеміз.",
      discuss: "Жобаны талқылау",
      whatsapp: "WhatsApp-қа жазу",
      whatsappMessage: "Сәлеметсіз бе! Мобильді қосымша әзірлеуді талқылағым келеді.",
      highlights: [
        "Android және iOS — нативті немесе кроссплатформалық",
        "Қосымша, backend және API — бір командада",
        "Сторларда жариялау және іске қосылғаннан кейінгі қолдау",
        "Көлемі мен құны — жұмыс басталғанға дейін",
      ],
      visual: {
        demoBadge: "Демо",
        caption: "Демонстрациялық интерфейстер: типтік функциялардың көрінісі, клиенттердің жобалары емес.",
        android: {
          title: "Тапсырыстарым",
          pushTitle: "Тапсырыс мәртебесі жаңартылды",
          pushText: "Тапсырыс жеткізуге берілді",
          orders: [
            { name: "№ 1024", status: "Жолда" },
            { name: "№ 1019", status: "Дайын" },
          ],
        },
        ios: { subtitle: "Онлайн жазылу", title: "Уақытты таңдаңыз", offline: "Деректер интернетсіз қолжетімді", button: "Жазылу" },
        chips: { push: "Push-хабарламалар", api: "API интеграциясы", stores: "App Store және Google Play" },
      },
    },
    platforms: {
      eyebrow: "Платформалар",
      title: "Android, iOS және тәсілді таңдау",
      description: "Платформалар мен әзірлеу тәсілін алғашқы талқылауда сізбен бірге таңдаймыз — жұмыс құрамы мен бюджет осыған байланысты.",
      items: {
        android: {
          title: "Android",
          description: "Android смартфондарына арналған қосымша, Google Play-де жариялаумен.",
        },
        ios: {
          title: "iOS",
          description: "iPhone-ға арналған қосымша, App Store-да жариялаумен.",
        },
        native: {
          title: "Нативті әзірлеу",
          description: "Әр платформаға жеке қосымша — нақты жүйе мен құрылғының мүмкіндіктері маңызды болғанда.",
        },
        crossPlatform: {
          title: "Кроссплатформалық әзірлеу",
          description: "Android және iOS үшін ортақ код базасы — қосымшаны бірден екі платформада шығару қажет болғанда.",
        },
      },
    },
    tasks: {
      eyebrow: "Міндеттер",
      title: "Бизнеске мобильді қосымша қашан керек",
      description: "Клиенттер немесе қызметкерлер сіздің сервисіңізді телефоннан үнемі пайдаланатын болса, қосымша өзін ақтайды.",
      items: [
        {
          title: "Клиенттерге арналған сервис",
          description: "Смартфоннан пайдалануға ыңғайлы тапсырыстар, жазылу, брондау немесе жеке кабинет.",
        },
        {
          title: "Қызметкерлерге арналған құрал",
          description: "Командаға далада жұмыс істеуге арналған қосымша: тапсырмалар, мәртебелер және деректер қол астында.",
        },
        {
          title: "Веб-сервистің мобильді нұсқасы",
          description: "Жұмыс істеп тұрған сайтқа, CRM-ге немесе платформаға олардың API арқылы қосылатын қосымша.",
        },
        {
          title: "Клиенттермен байланыс",
          description: "Мәртебелер, акциялар және маңызды оқиғалар туралы push-хабарламалар тікелей телефонға.",
        },
      ],
    },
    included: {
      eyebrow: "Жұмысқа не кіреді",
      title: "Идеядан сторларда жариялауға дейін",
      description: "Жұмыстың нақты құрамын әзірлеу басталғанға дейін бекітеміз.",
      items: [
        { title: "Push-хабарламалар және офлайн режим", description: "Пайдаланушыларға хабарламалар және байланыс тұрақсыз болғанда қосымшаның жұмысы — міндетке қажет болса." },
        { title: "Backend және API интеграциясы", description: "Қосымшаны сіздің серверлік бөлігіңізге, сайтыңызға немесе сыртқы сервистерге қосамыз." },
        { title: "Серверлік бөлік", description: "Backend әлі жоқ болса — авторизациясы, пайдаланушы рөлдері және бизнес-логикасы бар API әзірлейміз." },
        { title: "App Store мен Google Play-де жариялау", description: "Жинақтарды дайындап, қосымшаны қосымшалар дүкендерінде жариялаймыз." },
        { title: "Іске қосылғаннан кейінгі қолдау", description: "Жарияланғаннан кейін қосымшаны сүйемелдейміз." },
      ],
    },
    steps: {
      eyebrow: "Қалай жұмыс істейміз",
      title: "Әзірлеу кезеңдері",
      items: [
        { title: "Міндетті талқылау", description: "Қосымшаның мақсаттарын, аудиториясын және сценарийлерін анықтаймыз." },
        { title: "Көлемді келісу", description: "Әзірлеу басталғанға дейін функцияларды, платформаларды, мерзімі мен құнын бекітеміз." },
        { title: "Жобалау және әзірлеу", description: "Интерфейстерді жобалап, қосымша мен серверлік бөліктің келісілген функцияларын әзірлейміз." },
        { title: "Тексеру", description: "Қосымшаның әртүрлі құрылғылар мен сценарийлерде жұмысын тексереміз." },
        { title: "Жариялау және қолдау", description: "Қосымшаны сторларда жариялап, іске қосылғаннан кейін сүйемелдейміз." },
      ],
    },
    advantages: {
      eyebrow: "Неге COMPNET",
      title: "Сіз немен жұмыс істейсіз",
      items: [
        { title: "Жобаның бүкіл жолы", description: "Жобалауды, әзірлеуді, іске қосуды және техникалық қолдауды өзімізге аламыз." },
        { title: "Қосымша және серверлік бөлік", description: "Мобильді қосымшаны, backend пен API-ді бір командада әзірлейміз — бөлек мердігер іздеудің қажеті жоқ." },
        { title: "Көлемді алдын ала бекітеміз", description: "Жұмыс құрамын, мерзімі мен құнын әзірлеу басталғанға дейін келісеміз." },
        { title: "Алматы және Қазақстан", description: "Алматыда орналасқанбыз және Қазақстандағы тапсырыс берушілермен жұмыс істейміз." },
      ],
      webAppsLink: "COMPNET-тің барлық қызметтері",
    },
    pricing: {
      eyebrow: "Құны",
      title: "Қосымшаның бағасы неге байланысты",
      description: "Құнын сіздің жобаңызға қарай есептейміз — ол функцияларға, платформаларға және жұмыс көлеміне байланысты.",
      factorsTitle: "Құнына не әсер етеді",
      note: "Қызметтер бойынша бағдарлар — бағалар бетінде, алдын ала есептеу — калькуляторда. Нақты құнын міндетті талқылағаннан кейін бекітеміз. Қосымшалар дүкендерінің алымдары бөлек төленеді.",
      pricingLink: "Қызметтер бағасы",
      calculatorLink: "Құн калькуляторы",
    },
    works: {
      eyebrow: "Жұмыстар",
      title: "Біздің жобалар",
      description: "COMPNET-тің іске асырылған жобалары портфолиода жинақталған.",
      allWorks: "Портфолионы көру",
    },
    faq: {
      eyebrow: "FAQ",
      title: "Жиі қойылатын сұрақтар",
      items: [
        {
          question: "Android-қа да, iOS-қа да қосымша әзірлейсіздер ме?",
          answer: "Иә. Android және iOS үшін қосымшалар әзірлеп, оларды Google Play мен App Store-да жариялаймыз.",
        },
        {
          question: "Нативті немесе кроссплатформалық әзірлеу — қайсысын таңдау керек?",
          answer:
            "Нативті әзірлеу — әр платформаға жеке қосымша, кроссплатформалық — Android мен iOS үшін ортақ код базасы. Тәсілді қосымшаның функциялары мен бюджетке қарай талқылау кезеңінде бірге таңдаймыз.",
        },
        {
          question: "Қосымшаны біздің сайтқа немесе CRM-ге қосуға бола ма?",
          answer: "Иә, қосымшаны backend және API-мен интеграциялаймыз. Серверлік бөлік әлі жоқ болса, оны әзірлей аламыз.",
        },
        {
          question: "Мобильді қосымша әзірлеу қанша тұрады?",
          answer:
            "Құны экрандар санына, дизайнға, логиканың күрделілігіне, интеграцияларға және мерзімнің қысқалығына байланысты. Жобаны калькулятордан алдын ала бағалауға болады, нақты құнын әзірлеу басталғанға дейін бекітеміз.",
        },
        {
          question: "Қосымшаны App Store мен Google Play-де кім жариялайды?",
          answer: "Қосымшалар дүкендерінде жариялау жұмысқа кіреді. Дүкендердің алымдары бөлек төленеді.",
        },
        {
          question: "Іске қосылғаннан кейін қосымшаны қолдайсыздар ма?",
          answer: "Иә, жарияланғаннан кейін қосымшаны сүйемелдейміз.",
        },
      ],
    },
    requestForm: {
      eyebrow: "Өтінім",
      title: "Қосымшаңыз туралы айтыңыз",
      description:
        "Жоба түрі таңдалып қойған — идеяңызды және қажетті платформаларды сипаттаңыз. Менеджер мәліметтерді нақтылап, келесі қадамды ұсыну үшін сізбен хабарласады.",
      asideTitle: "Тікелей хабарласқан ыңғайлы ма?",
      asideText: "WhatsApp-қа жазыңыз немесе қоңырау шалыңыз — қосымша туралы сұрақтарыңызға жауап береміз.",
      contactsLink: "Барлық байланыстар",
    },
    cta: {
      title: "Қосымшаңызды талқылайық па?",
      description: "Міндетіңіз туралы айтыңыз — тәсілді, жұмыс құрамын және келесі қадамды ұсынамыз.",
      discuss: "Өтінім қалдыру",
      whatsapp: "WhatsApp-қа жазу",
      phone: "Қоңырау шалу",
    },
  },
  en: {
    seo: {
      title: "Mobile App Development in Almaty | COMPNET",
      description:
        "Android and iOS mobile apps in Almaty: native and cross-platform development, backend integration and app store publishing. Discuss your project with COMPNET.",
    },
    breadcrumb: { label: "Breadcrumbs", home: "Home", services: "Services", current: "Mobile apps" },
    serviceLink: "More about mobile app development",
    hero: {
      badge: "Mobile apps",
      title: "Mobile app development in Almaty",
      description:
        "We design and build Android and iOS apps for your business tasks — from interfaces and the server side to App Store and Google Play publishing and support after launch. Features, platforms, timeline and cost are fixed before development starts.",
      discuss: "Discuss a project",
      whatsapp: "Message us on WhatsApp",
      whatsappMessage: "Hello! I would like to discuss developing a mobile app.",
      highlights: [
        "Android and iOS — native or cross-platform",
        "App, backend and API from one team",
        "Store publishing and post-launch support",
        "Scope and cost agreed before work starts",
      ],
      visual: {
        demoBadge: "Demo",
        caption: "Demo interfaces illustrating typical features, not client projects.",
        android: {
          title: "My orders",
          pushTitle: "Order status updated",
          pushText: "Your order is out for delivery",
          orders: [
            { name: "Order 1024", status: "On the way" },
            { name: "Order 1019", status: "Ready" },
          ],
        },
        ios: { subtitle: "Online booking", title: "Choose a time", offline: "Data available offline", button: "Book now" },
        chips: { push: "Push notifications", api: "API integration", stores: "App Store and Google Play" },
      },
    },
    platforms: {
      eyebrow: "Platforms",
      title: "Android, iOS and choosing the approach",
      description: "We choose the platforms and development approach with you at the first discussion — they define the scope of work and the budget.",
      items: {
        android: {
          title: "Android",
          description: "An app for Android smartphones, published on Google Play.",
        },
        ios: {
          title: "iOS",
          description: "An app for iPhone, published on the App Store.",
        },
        native: {
          title: "Native development",
          description: "A separate app for each platform — when the capabilities of a specific system and device matter.",
        },
        crossPlatform: {
          title: "Cross-platform development",
          description: "One codebase for Android and iOS — when the app needs to launch on both platforms at once.",
        },
      },
    },
    tasks: {
      eyebrow: "Use cases",
      title: "When a business needs a mobile app",
      description: "An app pays off when customers or employees use your service from their phones regularly.",
      items: [
        {
          title: "A service for customers",
          description: "Orders, appointments, bookings or a personal account that are convenient to use from a smartphone.",
        },
        {
          title: "A tool for employees",
          description: "An app for teams working in the field: tasks, statuses and data at hand.",
        },
        {
          title: "A mobile version of a web service",
          description: "An app for an existing website, CRM or platform, connected through their API.",
        },
        {
          title: "Staying in touch with customers",
          description: "Push notifications about statuses, offers and important events right on the phone.",
        },
      ],
    },
    included: {
      eyebrow: "What's included",
      title: "From idea to app store release",
      description: "The exact scope of work is fixed before development starts.",
      items: [
        { title: "Push notifications and offline mode", description: "Notifications for users and app operation on an unstable connection — when the task needs it." },
        { title: "Backend and API integration", description: "We connect the app to your server side, website or external services." },
        { title: "Server side", description: "If there is no backend yet, we develop an API with authorization, user roles and business logic." },
        { title: "App Store and Google Play publishing", description: "We prepare the builds and publish the app in the app stores." },
        { title: "Support after launch", description: "We maintain the app after release." },
      ],
    },
    steps: {
      eyebrow: "How we work",
      title: "Development stages",
      items: [
        { title: "Discussing the task", description: "We learn the goals, audience and scenarios the app is needed for." },
        { title: "Agreeing on the scope", description: "We fix the features, platforms, timeline and cost before development starts." },
        { title: "Design and development", description: "We design the interfaces and develop the agreed features of the app and the server side." },
        { title: "Testing", description: "We check how the app works on different devices and in different scenarios." },
        { title: "Release and support", description: "We publish the app in the stores and maintain it after launch." },
      ],
    },
    advantages: {
      eyebrow: "Why COMPNET",
      title: "What you get",
      items: [
        { title: "The whole project path", description: "We take care of design, development, launch and technical support." },
        { title: "App and server side", description: "We develop the mobile app, backend and API in one team — no need to look for separate contractors." },
        { title: "Scope fixed upfront", description: "The scope of work, timeline and cost are agreed before development starts." },
        { title: "Almaty and Kazakhstan", description: "We are based in Almaty and work with clients from Kazakhstan." },
      ],
      webAppsLink: "All COMPNET services",
    },
    pricing: {
      eyebrow: "Cost",
      title: "What the price of an app depends on",
      description: "We estimate the cost for your project — it depends on the features, platforms and scope of work.",
      factorsTitle: "What affects the cost",
      note: "Service price guidelines are on the pricing page, a preliminary estimate is in the calculator. The exact cost is fixed after we discuss the task. App store fees are paid separately.",
      pricingLink: "Service prices",
      calculatorLink: "Cost calculator",
    },
    works: {
      eyebrow: "Work",
      title: "Our projects",
      description: "COMPNET's completed projects are collected in the portfolio.",
      allWorks: "View portfolio",
    },
    faq: {
      eyebrow: "FAQ",
      title: "Frequently asked questions",
      items: [
        {
          question: "Do you build apps for both Android and iOS?",
          answer: "Yes. We develop apps for Android and iOS and publish them on Google Play and the App Store.",
        },
        {
          question: "Native or cross-platform development — which should I choose?",
          answer:
            "Native development means a separate app for each platform; cross-platform means one codebase for Android and iOS. We choose the approach together during the discussion, based on the app's features and the budget.",
        },
        {
          question: "Can the app be connected to our website or CRM?",
          answer: "Yes, we integrate the app with your backend and API. If there is no server side yet, we can develop it.",
        },
        {
          question: "How much does mobile app development cost?",
          answer:
            "The cost depends on the number of screens, design, logic complexity, integrations and urgency. You can get a preliminary estimate in the calculator; the exact cost is fixed before development starts.",
        },
        {
          question: "Who publishes the app on the App Store and Google Play?",
          answer: "Publishing in the app stores is part of the work. App store fees are paid separately.",
        },
        {
          question: "Do you support the app after launch?",
          answer: "Yes, we maintain the app after release.",
        },
      ],
    },
    requestForm: {
      eyebrow: "Request",
      title: "Tell us about your app",
      description:
        "The project type is already selected — describe your idea and the platforms you need. A manager will contact you to clarify the details and suggest the next step.",
      asideTitle: "Prefer to contact us directly?",
      asideText: "Message us on WhatsApp or call — we will answer your questions about the app.",
      contactsLink: "All contacts",
    },
    cta: {
      title: "Shall we discuss your app?",
      description: "Tell us about your task — we will suggest an approach, the scope of work and the next step.",
      discuss: "Send a request",
      whatsapp: "Message us on WhatsApp",
      phone: "Call us",
    },
  },
};
