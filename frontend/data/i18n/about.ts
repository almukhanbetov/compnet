import type { Locale } from "@/types/i18n";

/** Development directions on /about, in display order. */
export const aboutDirectionIds = ["websites", "stores", "webServices", "mobile", "crm", "automation"] as const;
export type AboutDirectionId = (typeof aboutDirectionIds)[number];

/** /about — the company page. Facts here are confirmed by the owner; do not
 * add team size, client counts, awards, reviews, guarantees or 24/7 support. */
export interface AboutTranslations {
  seo: { title: string; description: string };
  breadcrumb: { label: string; home: string; current: string };
  hero: {
    badge: string;
    title: string;
    intro: string;
    discuss: string;
    works: string;
  };
  facts: {
    title: string;
    company: string;
    brand: string;
    city: string;
    clients: string;
    clientsValue: string;
    site: string;
  };
  scope: { title: string; items: string[] };
  directions: {
    eyebrow: string;
    title: string;
    description: string;
    items: Record<AboutDirectionId, { title: string; description: string }>;
    websitesLink: string;
  };
  process: { eyebrow: string; title: string; items: { title: string; description: string }[] };
  works: { eyebrow: string; title: string; description: string; caseLink: string; allWorks: string };
  contacts: {
    eyebrow: string;
    title: string;
    description: string;
    phone: string;
    whatsapp: string;
    whatsappValue: string;
    email: string;
    city: string;
    discuss: string;
  };
}

export const aboutTranslations: Record<Locale, AboutTranslations> = {
  ru: {
    seo: {
      title: "О компании COMPNET — разработка сайтов и приложений в Алматы",
      description:
        "COMPNET — бренд компании Complex Services из Алматы. Разрабатываем сайты, интернет-магазины, веб-сервисы, мобильные приложения, CRM и автоматизацию бизнеса для заказчиков из Казахстана.",
    },
    breadcrumb: { label: "Хлебные крошки", home: "Главная", current: "О компании" },
    hero: {
      badge: "О компании",
      title: "COMPNET — разработка цифровых продуктов в Алматы",
      intro:
        "COMPNET — бренд компании Complex Services. Мы находимся в Алматы и работаем с заказчиками из Казахстана: создаём сайты, веб-сервисы и мобильные приложения, которые помогают бизнесу представить себя в интернете, принимать обращения и автоматизировать рутинные процессы.",
      discuss: "Обсудить проект",
      works: "Наши работы",
    },
    facts: {
      title: "Коротко о нас",
      company: "Компания",
      brand: "Бренд",
      city: "Город",
      clients: "Заказчики",
      clientsValue: "Казахстан",
      site: "Сайт",
    },
    scope: {
      title: "Берём на себя весь путь проекта",
      items: ["Проектирование", "Разработка", "Запуск", "Техническая поддержка"],
    },
    directions: {
      eyebrow: "Направления",
      title: "Что мы разрабатываем",
      description: "Берёмся за проекты разного масштаба — от сайта компании до сервиса со своей бизнес-логикой.",
      items: {
        websites: {
          title: "Сайты",
          description: "Лендинги, сайты-визитки, корпоративные сайты и каталоги.",
        },
        stores: {
          title: "Интернет-магазины",
          description: "Каталог, корзина и оформление покупки для продаж онлайн.",
        },
        webServices: {
          title: "Веб-сервисы",
          description: "Приложения с собственной бизнес-логикой, личными кабинетами и панелями управления.",
        },
        mobile: {
          title: "Мобильные приложения",
          description: "Приложения для Android и iOS.",
        },
        crm: {
          title: "CRM-системы",
          description: "Учёт клиентов, заявок и сделок под процессы вашей команды.",
        },
        automation: {
          title: "Интеграции и автоматизация",
          description: "Связываем сервисы между собой и автоматизируем рутинные процессы бизнеса.",
        },
      },
      websitesLink: "Подробнее о создании сайтов",
    },
    process: {
      eyebrow: "Как работаем",
      title: "Этапы работы",
      items: [
        { title: "Обсуждение задачи", description: "Разбираемся в целях, аудитории и требованиях к проекту." },
        { title: "Согласование объёма", description: "Фиксируем состав работ, сроки и стоимость до начала разработки." },
        { title: "Разработка", description: "Проектируем и разрабатываем согласованные функции." },
        { title: "Проверка", description: "Проверяем работу проекта на разных устройствах и сценариях." },
        { title: "Запуск и поддержка", description: "Запускаем проект и сопровождаем его после запуска." },
      ],
    },
    works: {
      eyebrow: "Работы",
      title: "Примеры наших работ",
      description: "Проекты, которые мы сделали для наших клиентов.",
      caseLink: "Смотреть кейс",
      allWorks: "Все работы",
    },
    contacts: {
      eyebrow: "Контакты",
      title: "Расскажите о вашей задаче",
      description: "Ответим на вопросы и предложим, с чего начать проект.",
      phone: "Телефон",
      whatsapp: "WhatsApp",
      whatsappValue: "Написать в WhatsApp",
      email: "Email",
      city: "Город",
      discuss: "Обсудить проект",
    },
  },

  kk: {
    seo: {
      title: "COMPNET компаниясы туралы — Алматыда сайттар мен қосымшалар әзірлеу",
      description:
        "COMPNET — Алматыдағы Complex Services компаниясының бренді. Қазақстандық тапсырыс берушілерге сайттар, интернет-дүкендер, веб-сервистер, мобильді қосымшалар, CRM әзірлейміз және бизнесті автоматтандырамыз.",
    },
    breadcrumb: { label: "Навигация жолы", home: "Басты бет", current: "Компания туралы" },
    hero: {
      badge: "Компания туралы",
      title: "COMPNET — Алматыда цифрлық өнімдер әзірлеу",
      intro:
        "COMPNET — Complex Services компаниясының бренді. Біз Алматыда орналасқанбыз және Қазақстандағы тапсырыс берушілермен жұмыс істейміз: бизнеске интернетте өзін таныстыруға, өтініштер қабылдауға және күнделікті процестерді автоматтандыруға көмектесетін сайттар, веб-сервистер мен мобильді қосымшалар жасаймыз.",
      discuss: "Жобаны талқылау",
      works: "Біздің жұмыстар",
    },
    facts: {
      title: "Біз туралы қысқаша",
      company: "Компания",
      brand: "Бренд",
      city: "Қала",
      clients: "Тапсырыс берушілер",
      clientsValue: "Қазақстан",
      site: "Сайт",
    },
    scope: {
      title: "Жобаның бүкіл жолын өзімізге аламыз",
      items: ["Жобалау", "Әзірлеу", "Іске қосу", "Техникалық қолдау"],
    },
    directions: {
      eyebrow: "Бағыттар",
      title: "Біз не әзірлейміз",
      description: "Әртүрлі ауқымдағы жобаларды аламыз — компания сайтынан бастап өз бизнес-логикасы бар сервиске дейін.",
      items: {
        websites: {
          title: "Сайттар",
          description: "Лендингтер, сайт-визиткалар, корпоративтік сайттар және каталогтар.",
        },
        stores: {
          title: "Интернет-дүкендер",
          description: "Онлайн сатуға арналған каталог, себет және сатып алуды рәсімдеу.",
        },
        webServices: {
          title: "Веб-сервистер",
          description: "Өз бизнес-логикасы, жеке кабинеттері және басқару панельдері бар қосымшалар.",
        },
        mobile: {
          title: "Мобильді қосымшалар",
          description: "Android және iOS қосымшалары.",
        },
        crm: {
          title: "CRM-жүйелер",
          description: "Командаңыздың процестеріне сай клиенттерді, өтініштер мен мәмілелерді есепке алу.",
        },
        automation: {
          title: "Интеграциялар және автоматтандыру",
          description: "Сервистерді бір-бірімен байланыстырып, бизнестің күнделікті процестерін автоматтандырамыз.",
        },
      },
      websitesLink: "Сайт жасау туралы толығырақ",
    },
    process: {
      eyebrow: "Қалай жұмыс істейміз",
      title: "Жұмыс кезеңдері",
      items: [
        { title: "Міндетті талқылау", description: "Жобаның мақсаттарын, аудиториясын және талаптарын анықтаймыз." },
        { title: "Көлемді келісу", description: "Әзірлеу басталғанға дейін жұмыс құрамын, мерзімі мен құнын бекітеміз." },
        { title: "Әзірлеу", description: "Келісілген функцияларды жобалап, әзірлейміз." },
        { title: "Тексеру", description: "Жобаның әртүрлі құрылғылар мен сценарийлерде жұмысын тексереміз." },
        { title: "Іске қосу және қолдау", description: "Жобаны іске қосып, кейін сүйемелдейміз." },
      ],
    },
    works: {
      eyebrow: "Жұмыстар",
      title: "Жұмыстарымыздың мысалдары",
      description: "Клиенттеріміз үшін жасаған жобаларымыз.",
      caseLink: "Кейсті көру",
      allWorks: "Барлық жұмыстар",
    },
    contacts: {
      eyebrow: "Байланыс",
      title: "Міндетіңіз туралы айтыңыз",
      description: "Сұрақтарға жауап беріп, жобаны неден бастау керегін ұсынамыз.",
      phone: "Телефон",
      whatsapp: "WhatsApp",
      whatsappValue: "WhatsApp-қа жазу",
      email: "Email",
      city: "Қала",
      discuss: "Жобаны талқылау",
    },
  },

  en: {
    seo: {
      title: "About COMPNET — website and app development in Almaty",
      description:
        "COMPNET is a brand of Complex Services, based in Almaty. We build websites, online stores, web services, mobile apps, CRM systems and business automation for clients in Kazakhstan.",
    },
    breadcrumb: { label: "Breadcrumb", home: "Home", current: "About" },
    hero: {
      badge: "About",
      title: "COMPNET — digital product development in Almaty",
      intro:
        "COMPNET is a brand of Complex Services. We are based in Almaty and work with clients from Kazakhstan: we build websites, web services and mobile apps that help businesses present themselves online, receive inquiries and automate routine processes.",
      discuss: "Discuss a project",
      works: "Our work",
    },
    facts: {
      title: "In short",
      company: "Company",
      brand: "Brand",
      city: "City",
      clients: "Clients",
      clientsValue: "Kazakhstan",
      site: "Website",
    },
    scope: {
      title: "We cover the whole project",
      items: ["Design and planning", "Development", "Launch", "Technical support"],
    },
    directions: {
      eyebrow: "Directions",
      title: "What we build",
      description: "We take on projects of different scale — from a company website to a service with its own business logic.",
      items: {
        websites: {
          title: "Websites",
          description: "Landing pages, business card websites, corporate websites and catalogs.",
        },
        stores: {
          title: "Online stores",
          description: "A catalog, a cart and checkout for selling online.",
        },
        webServices: {
          title: "Web services",
          description: "Applications with their own business logic, user accounts and admin panels.",
        },
        mobile: {
          title: "Mobile apps",
          description: "Apps for Android and iOS.",
        },
        crm: {
          title: "CRM systems",
          description: "Tracking clients, requests and deals around your team's processes.",
        },
        automation: {
          title: "Integrations and automation",
          description: "We connect services with each other and automate routine business processes.",
        },
      },
      websitesLink: "More about website development",
    },
    process: {
      eyebrow: "How we work",
      title: "Steps",
      items: [
        { title: "Discussing the task", description: "We learn the project's goals, audience and requirements." },
        { title: "Agreeing on the scope", description: "We fix the scope, timeline and price before development starts." },
        { title: "Development", description: "We design and build the agreed features." },
        { title: "Testing", description: "We check how the project works on different devices and scenarios." },
        { title: "Launch and support", description: "We launch the project and support it afterwards." },
      ],
    },
    works: {
      eyebrow: "Our work",
      title: "Examples of our work",
      description: "Projects we have built for our clients.",
      caseLink: "View case study",
      allWorks: "All projects",
    },
    contacts: {
      eyebrow: "Contacts",
      title: "Tell us about your task",
      description: "We'll answer your questions and suggest where to start.",
      phone: "Phone",
      whatsapp: "WhatsApp",
      whatsappValue: "Message on WhatsApp",
      email: "Email",
      city: "City",
      discuss: "Discuss a project",
    },
  },
};
