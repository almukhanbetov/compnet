import type { Locale } from "@/types/i18n";

/** /pricing page. Item maps are keyed by the ids in data/pricingPage.ts. */
const ru = {
  hero: {
    badge: "Цены",
    titleStart: "Стоимость",
    titleAccent: "разработки",
    description:
      "Итоговая цена зависит от задач проекта, интеграций, сроков и сложности бизнес-логики — ниже ориентировочная стоимость по направлениям.",
    calculate: "Рассчитать точную стоимость",
  },
  factors: {
    eyebrow: "Ценообразование",
    title: "Что влияет на стоимость",
    description: "Каждый проект уникален — вот ключевые параметры, которые формируют финальную оценку.",
    items: {
      "factor-screens": "Количество экранов и страниц",
      "factor-design": "Индивидуальный дизайн",
      "factor-logic": "Сложность бизнес-логики",
      "factor-integrations": "Интеграции с внешними системами",
      "factor-cabinet": "Личный кабинет",
      "factor-mobile": "Мобильная версия",
      "factor-admin": "Админ-панель",
      "factor-urgency": "Срочность разработки",
      "factor-support": "Поддержка после запуска",
    },
  },
  formats: {
    eyebrow: "Форматы работы",
    title: "Как мы можем работать",
    description: "Выбираем формат сотрудничества под тип проекта и ваш бюджет.",
    items: {
      "format-fixed": {
        title: "Фиксированная стоимость",
        description: "Объём работ и цена зафиксированы до старта — подходит для проектов с понятным техническим заданием.",
      },
      "format-staged": {
        title: "Поэтапная разработка",
        description: "Разбиваем проект на этапы с приёмкой и оплатой каждого — удобно для крупных продуктов.",
      },
      "format-tm": {
        title: "Time & Materials",
        description: "Оплата по фактически затраченным часам — гибкий формат для задач с меняющимися требованиями.",
      },
      "format-support": {
        title: "Техническая поддержка",
        description: "Ежемесячное сопровождение после запуска — обновления, мониторинг и доработки.",
      },
    },
  },
  process: {
    eyebrow: "Процесс",
    title: "Как формируется цена",
    description: "Прозрачный путь от первого брифа до утверждённой сметы и старта работ.",
    items: {
      "process-1": { title: "Анализ задачи", description: "Изучаем цели, аудиторию и требования проекта." },
      "process-2": { title: "Прототип", description: "Собираем структуру и пользовательские сценарии перед дизайном." },
      "process-3": { title: "Оценка", description: "Считаем объём работ, сроки и предварительный бюджет." },
      "process-4": { title: "Техническое задание", description: "Фиксируем функциональность, экраны и интеграции в документе." },
      "process-5": { title: "Утверждение этапов", description: "Согласуем план работ, сроки и стоимость по этапам." },
      "process-6": { title: "Запуск работ", description: "Приступаем к разработке по утверждённому плану." },
    },
  },
  faq: {
    eyebrow: "FAQ",
    title: "Частые вопросы о цене",
    description: "Если ответа нет здесь — уточните детали в переписке, поможем разобраться.",
    items: {
      "pricing-faq-1": {
        question: "Из чего складывается итоговая стоимость?",
        answer:
          "Цена зависит от количества экранов, сложности бизнес-логики, интеграций и срочности запуска. Финальную смету готовим после брифа.",
      },
      "pricing-faq-2": {
        question: "Указанные цены — это итоговая стоимость?",
        answer:
          "Нет, это стартовые ориентиры «от». Точная цена определяется после обсуждения задач и подготовки технического задания.",
      },
      "pricing-faq-3": {
        question: "Можно ли работать по фиксированной цене?",
        answer: "Да, для проектов с понятным техническим заданием мы фиксируем стоимость и сроки до начала работ.",
      },
      "pricing-faq-4": {
        question: "Берёте ли вы предоплату?",
        answer: "Да, работаем поэтапно: частичная предоплата на старте и оплата по завершении ключевых этапов.",
      },
      "pricing-faq-5": {
        question: "Что делать, если бюджет ограничен?",
        answer: "Предложим MVP-версию с базовым набором функций, а часть возможностей вынесем в следующие этапы.",
      },
      "pricing-faq-6": {
        question: "Входит ли поддержка в стоимость проекта?",
        answer:
          "Базовый гарантийный период входит в разработку, дальнейшее сопровождение оформляется отдельным форматом поддержки.",
      },
    },
  },
};

export type PricingTranslations = typeof ru;

export const pricingTranslations: Record<Locale, PricingTranslations> = {
  ru,

  kk: {
    hero: {
      badge: "Бағалар",
      titleStart: "Әзірлеу",
      titleAccent: "құны",
      description:
        "Түпкілікті баға жобаның міндеттеріне, интеграцияларға, мерзімдерге және бизнес-логиканың күрделілігіне байланысты — төменде бағыттар бойынша болжамды құн берілген.",
      calculate: "Нақты құнды есептеу",
    },
    factors: {
      eyebrow: "Баға белгілеу",
      title: "Құнға не әсер етеді",
      description: "Әр жоба бірегей — түпкілікті бағаны қалыптастыратын негізгі параметрлер мыналар.",
      items: {
        "factor-screens": "Экрандар мен беттер саны",
        "factor-design": "Жеке дизайн",
        "factor-logic": "Бизнес-логиканың күрделілігі",
        "factor-integrations": "Сыртқы жүйелермен интеграциялар",
        "factor-cabinet": "Жеке кабинет",
        "factor-mobile": "Мобильді нұсқа",
        "factor-admin": "Әкімші панелі",
        "factor-urgency": "Әзірлеудің шұғылдығы",
        "factor-support": "Іске қосқаннан кейінгі қолдау",
      },
    },
    formats: {
      eyebrow: "Жұмыс форматтары",
      title: "Қалай жұмыс істей аламыз",
      description: "Ынтымақтастық форматын жоба түріне және бюджетіңізге қарай таңдаймыз.",
      items: {
        "format-fixed": {
          title: "Тұрақты баға",
          description: "Жұмыс көлемі мен бағасы басталғанға дейін бекітіледі — техникалық тапсырмасы түсінікті жобаларға қолайлы.",
        },
        "format-staged": {
          title: "Кезең-кезеңімен әзірлеу",
          description: "Жобаны әрқайсысын қабылдау және төлеу арқылы кезеңдерге бөлеміз — ірі өнімдерге ыңғайлы.",
        },
        "format-tm": {
          title: "Time & Materials",
          description: "Нақты жұмсалған сағаттар бойынша төлем — талаптары өзгеріп отыратын міндеттерге икемді формат.",
        },
        "format-support": {
          title: "Техникалық қолдау",
          description: "Іске қосқаннан кейінгі ай сайынғы сүйемелдеу — жаңартулар, мониторинг және жетілдірулер.",
        },
      },
    },
    process: {
      eyebrow: "Процесс",
      title: "Баға қалай қалыптасады",
      description: "Алғашқы брифтен бекітілген сметаға және жұмыстың басталуына дейінгі ашық жол.",
      items: {
        "process-1": { title: "Міндетті талдау", description: "Жобаның мақсаттарын, аудиториясын және талаптарын зерттейміз." },
        "process-2": { title: "Прототип", description: "Дизайнға дейін құрылым мен пайдаланушы сценарийлерін жинаймыз." },
        "process-3": { title: "Бағалау", description: "Жұмыс көлемін, мерзімдерді және алдын ала бюджетті есептейміз." },
        "process-4": { title: "Техникалық тапсырма", description: "Функционалды, экрандар мен интеграцияларды құжатта бекітеміз." },
        "process-5": { title: "Кезеңдерді бекіту", description: "Жұмыс жоспарын, мерзімдер мен кезеңдер бойынша құнды келісеміз." },
        "process-6": { title: "Жұмысты бастау", description: "Бекітілген жоспар бойынша әзірлеуге кірісеміз." },
      },
    },
    faq: {
      eyebrow: "FAQ",
      title: "Баға туралы жиі қойылатын сұрақтар",
      description: "Мұнда жауап таппасаңыз — хат алмасу барысында нақтылаңыз, көмектесеміз.",
      items: {
        "pricing-faq-1": {
          question: "Түпкілікті құн неден құралады?",
          answer:
            "Баға экрандар санына, бизнес-логиканың күрделілігіне, интеграцияларға және іске қосудың шұғылдығына байланысты. Түпкілікті сметаны брифтен кейін дайындаймыз.",
        },
        "pricing-faq-2": {
          question: "Көрсетілген бағалар — түпкілікті құн ба?",
          answer:
            "Жоқ, бұл «бастап» деген бастапқы бағдарлар. Нақты баға міндеттерді талқылап, техникалық тапсырманы дайындағаннан кейін анықталады.",
        },
        "pricing-faq-3": {
          question: "Тұрақты бағамен жұмыс істеуге бола ма?",
          answer: "Иә, техникалық тапсырмасы түсінікті жобалар үшін құн мен мерзімді жұмыс басталғанға дейін бекітеміз.",
        },
        "pricing-faq-4": {
          question: "Алдын ала төлем аласыздар ма?",
          answer: "Иә, кезең-кезеңімен жұмыс істейміз: басында ішінара алдын ала төлем, ал негізгі кезеңдер аяқталғанда — төлем.",
        },
        "pricing-faq-5": {
          question: "Бюджет шектеулі болса, не істеу керек?",
          answer: "Функциялардың базалық жиынтығы бар MVP-нұсқасын ұсынамыз, ал кейбір мүмкіндіктерді келесі кезеңдерге қалдырамыз.",
        },
        "pricing-faq-6": {
          question: "Қолдау жобаның құнына кіре ме?",
          answer:
            "Базалық кепілдік кезеңі әзірлеуге кіреді, одан әрі сүйемелдеу қолдаудың жеке форматы ретінде рәсімделеді.",
        },
      },
    },
  },

  en: {
    hero: {
      badge: "Pricing",
      titleStart: "Development",
      titleAccent: "pricing",
      description:
        "The final price depends on the project's tasks, integrations, timeline and business logic complexity — below is the estimated cost for each area.",
      calculate: "Calculate the exact cost",
    },
    factors: {
      eyebrow: "Pricing factors",
      title: "What affects the cost",
      description: "Every project is unique — these are the key parameters that shape the final estimate.",
      items: {
        "factor-screens": "Number of screens and pages",
        "factor-design": "Custom design",
        "factor-logic": "Business logic complexity",
        "factor-integrations": "Integrations with external systems",
        "factor-cabinet": "User account",
        "factor-mobile": "Mobile version",
        "factor-admin": "Admin panel",
        "factor-urgency": "Development urgency",
        "factor-support": "Support after launch",
      },
    },
    formats: {
      eyebrow: "Engagement models",
      title: "How we can work together",
      description: "We choose the engagement model based on the type of project and your budget.",
      items: {
        "format-fixed": {
          title: "Fixed price",
          description: "Scope and price are fixed before the start — suitable for projects with a clear technical specification.",
        },
        "format-staged": {
          title: "Staged development",
          description: "We split the project into stages, each with its own acceptance and payment — convenient for large products.",
        },
        "format-tm": {
          title: "Time & Materials",
          description: "Payment for the hours actually spent — a flexible model for tasks with changing requirements.",
        },
        "format-support": {
          title: "Technical support",
          description: "Monthly maintenance after launch — updates, monitoring and improvements.",
        },
      },
    },
    process: {
      eyebrow: "Process",
      title: "How the price is formed",
      description: "A transparent path from the first brief to an approved estimate and the start of work.",
      items: {
        "process-1": { title: "Task analysis", description: "We study the project's goals, audience and requirements." },
        "process-2": { title: "Prototype", description: "We put together the structure and user scenarios before design." },
        "process-3": { title: "Estimate", description: "We calculate the scope of work, timeline and preliminary budget." },
        "process-4": { title: "Technical specification", description: "We document the features, screens and integrations." },
        "process-5": { title: "Stage approval", description: "We agree on the work plan, timeline and cost of each stage." },
        "process-6": { title: "Kick-off", description: "We start development according to the approved plan." },
      },
    },
    faq: {
      eyebrow: "FAQ",
      title: "Frequently asked questions about pricing",
      description: "If you can't find the answer here, ask us in a message and we will help.",
      items: {
        "pricing-faq-1": {
          question: "What makes up the final cost?",
          answer:
            "The price depends on the number of screens, business logic complexity, integrations and how urgent the launch is. We prepare the final estimate after the brief.",
        },
        "pricing-faq-2": {
          question: "Are the listed prices the final cost?",
          answer:
            "No, they are “from” starting points. The exact price is determined after discussing the tasks and preparing the technical specification.",
        },
        "pricing-faq-3": {
          question: "Can we work at a fixed price?",
          answer: "Yes, for projects with a clear technical specification we fix the cost and timeline before work starts.",
        },
        "pricing-faq-4": {
          question: "Do you take a prepayment?",
          answer: "Yes, we work in stages: a partial prepayment at the start and payments as key stages are completed.",
        },
        "pricing-faq-5": {
          question: "What if my budget is limited?",
          answer: "We will suggest an MVP with a basic set of features and move some capabilities to later stages.",
        },
        "pricing-faq-6": {
          question: "Is support included in the project cost?",
          answer:
            "A basic warranty period is included in development; further maintenance is arranged as a separate support format.",
        },
      },
    },
  },
};
