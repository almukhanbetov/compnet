import type { Locale } from "@/types/i18n";
import type { PortfolioFilterValue } from "@/types/portfolioPage";

/** /portfolio and case-study pages. Filter values stay canonical (Russian)
 * internally; `categories` translates them for display. */
export interface PortfolioTranslations {
  hero: { badge: string; titleStart: string; description: string };
  filterLabel: string;
  categories: Record<PortfolioFilterValue, string>;
  empty: string;
  card: {
    /** {title} is the project title. */
    screenshotAlt: string;
    openSite: string;
    more: string;
    /** Button to a case's own page, next to "open site". */
    details: string;
  };
  caseStudy: {
    breadcrumb: string;
    /** {duration} is the project duration. */
    duration: string;
    task: string;
    solution: string;
    process: string;
    technologies: string;
    result: string;
    ctaTitle: string;
    ctaDescription: string;
    ctaPrimary: string;
    allProjects: string;
    /** Link to /services/website-development on website cases. */
    websiteService: string;
  };
}

export const portfolioTranslations: Record<Locale, PortfolioTranslations> = {
  ru: {
    hero: {
      badge: "Портфолио",
      titleStart: "Портфолио",
      description:
        "Реализованные цифровые проекты — сайты, web- и мобильные приложения, CRM-системы и AI-решения. Ниже — кейсы с задачей, процессом и результатом.",
    },
    filterLabel: "Фильтр проектов по категории",
    categories: {
      Все: "Все",
      Сайты: "Сайты",
      "Web-приложения": "Web-приложения",
      "Мобильные приложения": "Мобильные приложения",
      CRM: "CRM",
      "AI-решения": "AI-решения",
    },
    empty: "В этой категории пока нет кейсов — уточните задачу, и мы предложим похожие проекты.",
    card: { screenshotAlt: "Скриншот сайта: {title}", openSite: "Открыть сайт", more: "Подробнее", details: "Подробнее о проекте" },
    caseStudy: {
      breadcrumb: "Портфолио",
      duration: "Срок: {duration}",
      task: "Задача",
      solution: "Решение",
      process: "Процесс работы",
      technologies: "Технологии",
      result: "Результат",
      ctaTitle: "Хотите похожий проект?",
      ctaDescription: "Обсудим задачу и предложим решение с оценкой сроков и бюджета.",
      ctaPrimary: "Обсудить похожий проект",
      allProjects: "Ко всем проектам",
      websiteService: "Услуга: создание сайтов",
    },
  },

  kk: {
    hero: {
      badge: "Портфолио",
      titleStart: "Портфолио",
      description:
        "Іске асырылған цифрлық жобалар — сайттар, web және мобильді қосымшалар, CRM-жүйелер мен ЖИ шешімдері. Төменде міндеті, процесі және нәтижесі көрсетілген кейстер берілген.",
    },
    filterLabel: "Жобаларды санат бойынша сүзу",
    categories: {
      Все: "Барлығы",
      Сайты: "Сайттар",
      "Web-приложения": "Web-қосымшалар",
      "Мобильные приложения": "Мобильді қосымшалар",
      CRM: "CRM",
      "AI-решения": "ЖИ шешімдері",
    },
    empty: "Бұл санатта әзірге кейстер жоқ — міндетті нақтылаңыз, біз ұқсас жобаларды ұсынамыз.",
    card: { screenshotAlt: "Сайттың скриншоты: {title}", openSite: "Сайтты ашу", more: "Толығырақ", details: "Жоба туралы толығырақ" },
    caseStudy: {
      breadcrumb: "Портфолио",
      duration: "Мерзімі: {duration}",
      task: "Міндет",
      solution: "Шешім",
      process: "Жұмыс процесі",
      technologies: "Технологиялар",
      result: "Нәтиже",
      ctaTitle: "Осындай жоба керек пе?",
      ctaDescription: "Міндетті талқылап, мерзім мен бюджет бағаланған шешім ұсынамыз.",
      ctaPrimary: "Ұқсас жобаны талқылау",
      allProjects: "Барлық жобаларға",
      websiteService: "Қызмет: сайт жасау",
    },
  },

  en: {
    hero: {
      badge: "Portfolio",
      titleStart: "Portfolio",
      description:
        "Completed digital projects — websites, web and mobile apps, CRM systems and AI solutions. Below are case studies with the task, process and result.",
    },
    filterLabel: "Filter projects by category",
    categories: {
      Все: "All",
      Сайты: "Websites",
      "Web-приложения": "Web apps",
      "Мобильные приложения": "Mobile apps",
      CRM: "CRM",
      "AI-решения": "AI solutions",
    },
    empty: "There are no case studies in this category yet — tell us about your task and we will suggest similar projects.",
    card: { screenshotAlt: "Website screenshot: {title}", openSite: "Open website", more: "Learn more", details: "Project details" },
    caseStudy: {
      breadcrumb: "Portfolio",
      duration: "Timeline: {duration}",
      task: "Task",
      solution: "Solution",
      process: "Work process",
      technologies: "Technologies",
      result: "Result",
      ctaTitle: "Want a similar project?",
      ctaDescription: "We will discuss your task and suggest a solution with a timeline and budget estimate.",
      ctaPrimary: "Discuss a similar project",
      allProjects: "All projects",
      websiteService: "Service: website development",
    },
  },
};
