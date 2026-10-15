import type { Locale } from "@/types/i18n";

/** /portfolio/bastas — the BASTAS case page. */
export interface BastasCaseTranslations {
  seo: { title: string; description: string };
  breadcrumb: { label: string; home: string; portfolio: string };
  badge: string;
  title: string;
  intro: string;
  imageAlt: string;
  task: { title: string; text: string };
  solution: { title: string; items: string[] };
  result: { title: string; text: string };
  cta: {
    title: string;
    description: string;
    openSite: string;
    discuss: string;
    back: string;
    opensInNewTab: string;
  };
}

export const bastasCaseTranslations: Record<Locale, BastasCaseTranslations> = {
  ru: {
    seo: {
      title: "BASTAS — сайт-каталог натурального камня | Портфолио COMPNET",
      description:
        "Кейс COMPNET: сайт компании BASTAS по обработке и продаже натурального камня — каталог материалов, калькулятор стоимости и контакты для обсуждения заказа.",
    },
    breadcrumb: { label: "Хлебные крошки", home: "Главная", portfolio: "Портфолио" },
    badge: "Сайты · Каталог",
    title: "BASTAS — каталог натурального камня",
    intro:
      "Сайт компании по обработке и продаже натурального камня: каталог материалов, калькулятор стоимости и контакты для обсуждения заказа.",
    imageAlt: "Главная страница сайта BASTAS",
    task: {
      title: "Задача",
      text: "Представить продукцию компании в интернете и помочь посетителю перейти от выбора материала к обращению за расчётом.",
    },
    solution: {
      title: "Решение",
      items: [
        "Каталог материалов",
        "Калькулятор предварительной стоимости",
        "Переход к оформлению заказа",
        "Адаптация для компьютеров и смартфонов",
      ],
    },
    result: {
      title: "Результат",
      text: "Посетитель может ознакомиться с продукцией, предварительно рассчитать стоимость и связаться с компанией для обсуждения заказа.",
    },
    cta: {
      title: "Нужен похожий сайт?",
      description: "Обсудим задачу и предложим решение с оценкой сроков и бюджета.",
      openSite: "Открыть сайт",
      discuss: "Обсудить похожий проект",
      back: "Вернуться в портфолио",
      opensInNewTab: "(откроется в новой вкладке)",
    },
  },

  kk: {
    seo: {
      title: "BASTAS — табиғи тас каталогы сайты | COMPNET портфолиосы",
      description:
        "COMPNET кейсі: табиғи тасты өңдеу және сату компаниясы BASTAS-тың сайты — материалдар каталогы, құн калькуляторы және тапсырысты талқылауға арналған байланыстар.",
    },
    breadcrumb: { label: "Навигация жолы", home: "Басты бет", portfolio: "Портфолио" },
    badge: "Сайттар · Каталог",
    title: "BASTAS — табиғи тас каталогы",
    intro:
      "Табиғи тасты өңдеу және сату компаниясының сайты: материалдар каталогы, құн калькуляторы және тапсырысты талқылауға арналған байланыстар.",
    imageAlt: "BASTAS сайтының басты беті",
    task: {
      title: "Міндет",
      text: "Компания өнімін интернетте таныстыру және келушіге материалды таңдаудан есептеу үшін хабарласуға көшуге көмектесу.",
    },
    solution: {
      title: "Шешім",
      items: [
        "Материалдар каталогы",
        "Алдын ала құн калькуляторы",
        "Тапсырысты рәсімдеуге өту",
        "Компьютерлер мен смартфондарға бейімдеу",
      ],
    },
    result: {
      title: "Нәтиже",
      text: "Келуші өніммен танысып, құнын алдын ала есептей алады және тапсырысты талқылау үшін компаниямен байланыса алады.",
    },
    cta: {
      title: "Осындай сайт керек пе?",
      description: "Міндетті талқылап, мерзімі мен бюджеті бағаланған шешім ұсынамыз.",
      openSite: "Сайтты ашу",
      discuss: "Ұқсас жобаны талқылау",
      back: "Портфолиоға оралу",
      opensInNewTab: "(жаңа қойындыда ашылады)",
    },
  },

  en: {
    seo: {
      title: "BASTAS — natural stone catalog website | COMPNET portfolio",
      description:
        "COMPNET case study: the website of BASTAS, a natural stone processing and sales company — a materials catalog, a cost calculator and contacts for discussing an order.",
    },
    breadcrumb: { label: "Breadcrumb", home: "Home", portfolio: "Portfolio" },
    badge: "Websites · Catalog",
    title: "BASTAS — natural stone catalog",
    intro:
      "The website of a natural stone processing and sales company: a materials catalog, a cost calculator and contacts for discussing an order.",
    imageAlt: "BASTAS website home page",
    task: {
      title: "Task",
      text: "Present the company's products online and help visitors move from choosing a material to asking for a quote.",
    },
    solution: {
      title: "Solution",
      items: [
        "Materials catalog",
        "Preliminary cost calculator",
        "A path to placing an order",
        "Adaptation for desktops and smartphones",
      ],
    },
    result: {
      title: "Result",
      text: "Visitors can browse the products, get a preliminary cost estimate and contact the company to discuss an order.",
    },
    cta: {
      title: "Need a similar website?",
      description: "We'll discuss your task and propose a solution with a time and budget estimate.",
      openSite: "Open website",
      discuss: "Discuss a similar project",
      back: "Back to portfolio",
      opensInNewTab: "(opens in a new tab)",
    },
  },
};
