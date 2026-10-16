import type { Locale } from "@/types/i18n";

/** Project types shown on the page, in order; prices and durations for them
 * come from the pricing API (the same catalog as /pricing and the calculator). */
export const websiteTypeIds = ["landing", "corporate", "catalog", "online-store"] as const;
export type WebsiteTypeId = (typeof websiteTypeIds)[number];

/** Ids from data/pricingPage.ts whose labels (t.pricing.factors.items) explain the final price. */
export const websitePriceFactorIds = [
  "factor-screens",
  "factor-design",
  "factor-logic",
  "factor-integrations",
  "factor-cabinet",
  "factor-admin",
  "factor-urgency",
] as const;

/** /services/website-development */
export interface WebsiteDevelopmentTranslations {
  seo: { title: string; description: string };
  breadcrumb: { label: string; home: string; services: string; current: string };
  /** Link to this page from the "web development" block on /services. */
  serviceLink: string;
  hero: { badge: string; title: string; description: string; discuss: string; portfolio: string };
  types: {
    eyebrow: string;
    title: string;
    description: string;
    items: Record<WebsiteTypeId, { title: string; audience: string }>;
  };
  included: {
    eyebrow: string;
    title: string;
    description: string;
    items: { title: string; description: string }[];
  };
  pricing: {
    eyebrow: string;
    title: string;
    description: string;
    /** {price} and {duration} come from the pricing API. */
    duration: string;
    unavailable: string;
    factorsTitle: string;
    note: string;
    pricingLink: string;
    calculatorLink: string;
  };
  works: {
    eyebrow: string;
    title: string;
    description: string;
    bastasTitle: string;
    bastasText: string;
    bastasImageAlt: string;
    bastasLink: string;
    allWorks: string;
  };
  steps: { eyebrow: string; title: string; items: { title: string; description: string }[] };
  faq: { eyebrow: string; title: string; items: { question: string; answer: string }[] };
  cta: { title: string; description: string; discuss: string; portfolio: string };
}

export const websiteDevelopmentTranslations: Record<Locale, WebsiteDevelopmentTranslations> = {
  ru: {
    seo: {
      title: "Создание сайтов в Алматы для бизнеса | COMPNET",
      description:
        "Разработка лендингов, корпоративных сайтов, каталогов и интернет-магазинов в Алматы: дизайн, адаптация для телефонов, согласованные функции и запуск. Стартовые цены и сроки — по типу сайта.",
    },
    breadcrumb: { label: "Хлебные крошки", home: "Главная", services: "Услуги", current: "Создание сайтов" },
    serviceLink: "Подробнее о создании сайтов",
    hero: {
      badge: "Разработка сайтов",
      title: "Создание сайтов в Алматы для бизнеса",
      description:
        "Разрабатываем сайты с каталогами, калькуляторами, формами и интеграциями. Состав функций согласовываем под задачу — вы платите за то, что действительно нужно вашему бизнесу.",
      discuss: "Обсудить проект",
      portfolio: "Посмотреть работы",
    },
    types: {
      eyebrow: "Типы сайтов",
      title: "Какой сайт подходит вашей задаче",
      description: "Поможем выбрать формат на первом обсуждении — от этого зависят структура, сроки и бюджет.",
      items: {
        landing: {
          title: "Лендинг",
          audience: "Одна страница под конкретный продукт, услугу или рекламную кампанию, когда нужно быстро собрать обращения.",
        },
        corporate: {
          title: "Корпоративный сайт",
          audience: "Компаниям, которым нужно подробно рассказать об услугах, команде и опыте на нескольких страницах.",
        },
        catalog: {
          title: "Сайт-каталог",
          audience: "Бизнесу с большим ассортиментом товаров или услуг, которые важно показать с карточками и фильтрами, без онлайн-оплаты.",
        },
        "online-store": {
          title: "Интернет-магазин",
          audience: "Тем, кто продаёт онлайн: каталог, корзина и оформление покупки с оплатой на сайте.",
        },
      },
    },
    included: {
      eyebrow: "Что входит в работу",
      title: "От дизайна до запуска",
      description: "Точный состав работ фиксируем до начала разработки.",
      items: [
        { title: "Дизайн", description: "Структура страниц и визуальное оформление под ваш бизнес и аудиторию." },
        { title: "Адаптация для телефонов", description: "Сайт корректно отображается на смартфонах, планшетах и компьютерах." },
        {
          title: "Согласованные функции",
          description: "Каталог, калькулятор, формы или интеграции — то, что вошло в согласованный состав работ.",
        },
        {
          title: "Техническая SEO-подготовка",
          description: "Заголовки, описания страниц и структура, которые помогают поисковым системам правильно понять сайт.",
        },
        { title: "Запуск", description: "Публикуем готовый сайт и проверяем его работу после запуска." },
      ],
    },
    pricing: {
      eyebrow: "Цены и сроки",
      title: "Сколько стоит сайт",
      description: "Стартовые цены и ориентировочные сроки по типам сайтов — те же, что на странице цен.",
      duration: "Срок: {duration}",
      unavailable: "Не удалось загрузить цены. Актуальные цены и сроки — на странице цен.",
      factorsTitle: "От чего зависит итоговая стоимость",
      note: "Указаны цены «от». Итоговую стоимость и сроки определяем после обсуждения задачи и согласования состава работ.",
      pricingLink: "Все цены",
      calculatorLink: "Рассчитать стоимость",
    },
    works: {
      eyebrow: "Работы",
      title: "Пример реализованного сайта",
      description: "Реальный проект из нашего портфолио.",
      bastasTitle: "BASTAS — каталог натурального камня",
      bastasText: "Сайт компании по обработке и продаже натурального камня: каталог материалов и калькулятор стоимости.",
      bastasImageAlt: "Главная страница сайта BASTAS",
      bastasLink: "Смотреть кейс",
      allWorks: "Все работы",
    },
    steps: {
      eyebrow: "Этапы",
      title: "Как проходит работа",
      items: [
        { title: "Обсуждение задачи", description: "Узнаём цели, аудиторию и пожелания к сайту." },
        { title: "Состав работ и стоимость", description: "Согласуем функции, сроки и цену до начала работ." },
        { title: "Дизайн", description: "Готовим структуру и оформление страниц." },
        { title: "Разработка и проверка", description: "Делаем сайт и проверяем его на разных устройствах." },
        { title: "Запуск", description: "Публикуем готовый сайт." },
      ],
    },
    faq: {
      eyebrow: "FAQ",
      title: "Частые вопросы",
      items: [
        {
          question: "Сколько стоит сайт?",
          answer:
            "Зависит от типа сайта и состава функций. Стартовые цены указаны выше; точную стоимость называем после обсуждения задачи и согласования состава работ.",
        },
        {
          question: "Сколько занимает разработка?",
          answer:
            "Ориентировочные сроки по типам сайтов указаны выше. Точный срок зависит от объёма работ и фиксируется при согласовании.",
        },
        {
          question: "Можно ли доработать существующий сайт?",
          answer: "Опишите задачу — посмотрим текущий сайт и скажем, возможна ли доработка и на каких условиях.",
        },
        {
          question: "Кто оплачивает домен и хостинг?",
          answer: "Этот вопрос согласуем до начала работ и фиксируем в условиях проекта.",
        },
        {
          question: "Что входит в поддержку?",
          answer:
            "Базовый гарантийный период входит в разработку. Дальнейшее сопровождение — мониторинг, исправление ошибок, обновления безопасности и доработки по запросу — оформляется отдельно, на условиях, которые обсуждаем индивидуально.",
        },
      ],
    },
    cta: {
      title: "Обсудим ваш сайт?",
      description: "Расскажите о задаче — предложим формат, состав работ и оценку сроков и бюджета.",
      discuss: "Обсудить проект",
      portfolio: "Посмотреть работы",
    },
  },

  kk: {
    seo: {
      title: "Алматыда бизнеске арналған сайт жасау | COMPNET",
      description:
        "Алматыда лендинг, корпоративтік сайт, каталог және интернет-дүкен әзірлеу: дизайн, телефонға бейімдеу, келісілген функциялар және іске қосу. Сайт түрі бойынша бастапқы бағалар.",
    },
    breadcrumb: { label: "Навигация жолы", home: "Басты бет", services: "Қызметтер", current: "Сайт жасау" },
    serviceLink: "Сайт жасау туралы толығырақ",
    hero: {
      badge: "Сайт әзірлеу",
      title: "Алматыда бизнеске арналған сайт жасау",
      description:
        "Каталогтары, калькуляторлары, формалары және интеграциялары бар сайттар әзірлейміз. Функциялар құрамын міндетке қарай келісеміз — бизнесіңізге шын мәнінде керек нәрсеге ғана төлейсіз.",
      discuss: "Жобаны талқылау",
      portfolio: "Жұмыстарды көру",
    },
    types: {
      eyebrow: "Сайт түрлері",
      title: "Міндетіңізге қай сайт сәйкес келеді",
      description: "Алғашқы талқылауда форматты таңдауға көмектесеміз — құрылым, мерзім және бюджет соған байланысты.",
      items: {
        landing: {
          title: "Лендинг",
          audience: "Нақты өнімге, қызметке немесе жарнамалық науқанға арналған бір бет — өтініштерді тез жинау керек болғанда.",
        },
        corporate: {
          title: "Корпоративтік сайт",
          audience: "Қызметтері, командасы мен тәжірибесі туралы бірнеше бетте толық айтқысы келетін компанияларға.",
        },
        catalog: {
          title: "Сайт-каталог",
          audience: "Тауарлары немесе қызметтері көп, оларды карточкалар мен сүзгілер арқылы онлайн-төлемсіз көрсету маңызды бизнеске.",
        },
        "online-store": {
          title: "Интернет-дүкен",
          audience: "Онлайн сататындарға: каталог, себет және сайтта төлей отырып сатып алуды рәсімдеу.",
        },
      },
    },
    included: {
      eyebrow: "Жұмысқа не кіреді",
      title: "Дизайннан іске қосуға дейін",
      description: "Жұмыстың нақты құрамын әзірлеу басталғанға дейін бекітеміз.",
      items: [
        { title: "Дизайн", description: "Бизнесіңіз бен аудиторияңызға сай беттер құрылымы мен көрнекі безендіру." },
        { title: "Телефонға бейімдеу", description: "Сайт смартфонда, планшетте және компьютерде дұрыс көрсетіледі." },
        {
          title: "Келісілген функциялар",
          description: "Каталог, калькулятор, формалар немесе интеграциялар — келісілген жұмыс құрамына кірген нәрселер.",
        },
        {
          title: "Техникалық SEO-дайындық",
          description: "Іздеу жүйелеріне сайтты дұрыс түсінуге көмектесетін тақырыптар, бет сипаттамалары және құрылым.",
        },
        { title: "Іске қосу", description: "Дайын сайтты жариялап, іске қосқаннан кейін жұмысын тексереміз." },
      ],
    },
    pricing: {
      eyebrow: "Бағалар мен мерзімдер",
      title: "Сайт қанша тұрады",
      description: "Сайт түрлері бойынша бастапқы бағалар мен болжамды мерзімдер — бағалар бетіндегідей.",
      duration: "Мерзімі: {duration}",
      unavailable: "Бағаларды жүктеу мүмкін болмады. Өзекті бағалар мен мерзімдер — бағалар бетінде.",
      factorsTitle: "Түпкілікті құн неге байланысты",
      note: "Бағалар «бастап» көрсетілген. Түпкілікті құн мен мерзімді міндетті талқылап, жұмыс құрамын келіскеннен кейін анықтаймыз.",
      pricingLink: "Барлық бағалар",
      calculatorLink: "Құнды есептеу",
    },
    works: {
      eyebrow: "Жұмыстар",
      title: "Іске асырылған сайт мысалы",
      description: "Портфолиомыздағы нақты жоба.",
      bastasTitle: "BASTAS — табиғи тас каталогы",
      bastasText: "Табиғи тасты өңдеу және сату компаниясының сайты: материалдар каталогы және құн калькуляторы.",
      bastasImageAlt: "BASTAS сайтының басты беті",
      bastasLink: "Кейсті көру",
      allWorks: "Барлық жұмыстар",
    },
    steps: {
      eyebrow: "Кезеңдер",
      title: "Жұмыс қалай өтеді",
      items: [
        { title: "Міндетті талқылау", description: "Сайтқа қатысты мақсаттарды, аудиторияны және тілектерді анықтаймыз." },
        { title: "Жұмыс құрамы мен құны", description: "Жұмыс басталғанға дейін функцияларды, мерзімді және бағаны келісеміз." },
        { title: "Дизайн", description: "Беттердің құрылымы мен безендіруін дайындаймыз." },
        { title: "Әзірлеу және тексеру", description: "Сайтты жасап, әртүрлі құрылғыларда тексереміз." },
        { title: "Іске қосу", description: "Дайын сайтты жариялаймыз." },
      ],
    },
    faq: {
      eyebrow: "FAQ",
      title: "Жиі қойылатын сұрақтар",
      items: [
        {
          question: "Сайт қанша тұрады?",
          answer:
            "Сайт түрі мен функциялар құрамына байланысты. Бастапқы бағалар жоғарыда көрсетілген; нақты құнын міндетті талқылап, жұмыс құрамын келіскеннен кейін айтамыз.",
        },
        {
          question: "Әзірлеу қанша уақыт алады?",
          answer:
            "Сайт түрлері бойынша болжамды мерзімдер жоғарыда көрсетілген. Нақты мерзім жұмыс көлеміне байланысты және келісу кезінде бекітіледі.",
        },
        {
          question: "Бар сайтты жетілдіруге бола ма?",
          answer: "Міндетті сипаттаңыз — қазіргі сайтты қарап, жетілдіру мүмкін бе және қандай шарттармен екенін айтамыз.",
        },
        {
          question: "Домен мен хостингті кім төлейді?",
          answer: "Бұл мәселені жұмыс басталғанға дейін келісіп, жоба шарттарында бекітеміз.",
        },
        {
          question: "Қолдауға не кіреді?",
          answer:
            "Негізгі кепілдік кезеңі әзірлеуге кіреді. Әрі қарайғы сүйемелдеу — мониторинг, қателерді түзету, қауіпсіздік жаңартулары және сұраныс бойынша жетілдірулер — бөлек, жеке талқыланатын шарттармен рәсімделеді.",
        },
      ],
    },
    cta: {
      title: "Сайтыңызды талқылайық па?",
      description: "Міндет туралы айтыңыз — формат, жұмыс құрамы, мерзім мен бюджет бағасын ұсынамыз.",
      discuss: "Жобаны талқылау",
      portfolio: "Жұмыстарды көру",
    },
  },

  en: {
    seo: {
      title: "Website development in Almaty for business | COMPNET",
      description:
        "Landing pages, corporate websites, catalogs and online stores in Almaty: design, mobile adaptation, agreed features and launch. Starting prices by website type.",
    },
    breadcrumb: { label: "Breadcrumb", home: "Home", services: "Services", current: "Website development" },
    serviceLink: "More about website development",
    hero: {
      badge: "Website development",
      title: "Website development in Almaty for business",
      description:
        "We build websites with catalogs, calculators, forms and integrations. The feature set is agreed for your task, so you pay for what your business actually needs.",
      discuss: "Discuss a project",
      portfolio: "View our work",
    },
    types: {
      eyebrow: "Website types",
      title: "Which website fits your task",
      description: "We'll help you choose the format at the first discussion — it defines the structure, timeline and budget.",
      items: {
        landing: {
          title: "Landing page",
          audience: "A single page for a specific product, service or ad campaign, when you need to collect inquiries quickly.",
        },
        corporate: {
          title: "Corporate website",
          audience: "For companies that need several pages to present their services, team and experience in detail.",
        },
        catalog: {
          title: "Catalog website",
          audience: "For businesses with a wide range of products or services to show with cards and filters, without online payment.",
        },
        "online-store": {
          title: "Online store",
          audience: "For selling online: a catalog, a cart and checkout with payment on the site.",
        },
      },
    },
    included: {
      eyebrow: "What's included",
      title: "From design to launch",
      description: "We fix the exact scope of work before development starts.",
      items: [
        { title: "Design", description: "Page structure and visual design for your business and audience." },
        { title: "Mobile adaptation", description: "The site works properly on smartphones, tablets and desktops." },
        {
          title: "Agreed features",
          description: "A catalog, a calculator, forms or integrations — whatever is in the agreed scope of work.",
        },
        {
          title: "Technical SEO preparation",
          description: "Headings, page descriptions and structure that help search engines understand the site correctly.",
        },
        { title: "Launch", description: "We publish the finished site and check that it works after launch." },
      ],
    },
    pricing: {
      eyebrow: "Prices and timelines",
      title: "How much a website costs",
      description: "Starting prices and estimated timelines by website type — the same as on the pricing page.",
      duration: "Timeline: {duration}",
      unavailable: "Prices could not be loaded. See the pricing page for current prices and timelines.",
      factorsTitle: "What the final price depends on",
      note: "Prices are “from”. We set the final price and timeline after discussing the task and agreeing on the scope of work.",
      pricingLink: "All prices",
      calculatorLink: "Estimate the cost",
    },
    works: {
      eyebrow: "Our work",
      title: "An example of a website we built",
      description: "A real project from our portfolio.",
      bastasTitle: "BASTAS — natural stone catalog",
      bastasText: "The website of a natural stone processing and sales company: a materials catalog and a cost calculator.",
      bastasImageAlt: "BASTAS website home page",
      bastasLink: "View case study",
      allWorks: "All projects",
    },
    steps: {
      eyebrow: "Steps",
      title: "How we work",
      items: [
        { title: "Discussing the task", description: "We learn your goals, audience and wishes for the site." },
        { title: "Scope and price", description: "We agree on features, timeline and price before work starts." },
        { title: "Design", description: "We prepare the page structure and design." },
        { title: "Development and testing", description: "We build the site and test it on different devices." },
        { title: "Launch", description: "We publish the finished site." },
      ],
    },
    faq: {
      eyebrow: "FAQ",
      title: "Frequently asked questions",
      items: [
        {
          question: "How much does a website cost?",
          answer:
            "It depends on the website type and features. Starting prices are listed above; we give the exact price after discussing the task and agreeing on the scope.",
        },
        {
          question: "How long does development take?",
          answer:
            "Estimated timelines by website type are listed above. The exact timeline depends on the scope and is fixed when we agree on it.",
        },
        {
          question: "Can you improve an existing website?",
          answer: "Describe the task — we'll look at the current site and tell you whether it can be improved and on what terms.",
        },
        {
          question: "Who pays for the domain and hosting?",
          answer: "We agree on this before work starts and fix it in the project terms.",
        },
        {
          question: "What does support include?",
          answer:
            "A basic warranty period is included in development. Further maintenance — monitoring, bug fixes, security updates and changes on request — is arranged separately on terms we discuss individually.",
        },
      ],
    },
    cta: {
      title: "Shall we discuss your website?",
      description: "Tell us about your task — we'll suggest a format, scope, timeline and budget estimate.",
      discuss: "Discuss a project",
      portfolio: "View our work",
    },
  },
};
