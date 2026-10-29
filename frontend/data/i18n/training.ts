import type { Locale } from "@/types/i18n";

/**
 * The /training page: paid hands-on training with a mentor. No prices,
 * durations, numbers of lessons, reviews, certificates or graduate figures —
 * none are confirmed; the conditions are agreed before the training starts.
 * Technologies are not listed either: they are agreed per participant,
 * within what the mentor works with.
 */
export const trainingLevelIds = ["beginner", "basics", "developer"] as const;
export type TrainingLevelId = (typeof trainingLevelIds)[number];

export const trainingDirectionIds = ["web", "mobile", "apiDb", "gitReview", "devops", "undecided"] as const;
export type TrainingDirectionId = (typeof trainingDirectionIds)[number];

interface Card {
  title: string;
  description: string;
}

export interface TrainingTranslations {
  seo: { title: string; description: string };
  breadcrumb: { label: string; home: string; current: string };
  hero: { badge: string; title: string; description: string; paid: string; discuss: string };
  audience: { eyebrow: string; title: string; description: string; items: Card[] };
  format: { eyebrow: string; title: string; description: string; steps: Card[] };
  directions: { eyebrow: string; title: string; description: string; items: Card[] };
  /** A proposed practice programme, not students' results; VPS, domain and
   * third-party costs are agreed before the sessions, never said to be included. */
  devopsPractice: {
    eyebrow: string;
    title: string;
    description: string;
    beginners: string;
    steps: string[];
    resultTitle: string;
    result: string;
    resultNote: string;
    costs: string;
  };
  examples: { eyebrow: string; title: string; description: string; label: string; items: Card[] };
  cooperation: { eyebrow: string; title: string; text: string };
  terms: { eyebrow: string; title: string; description: string; items: string[] };
  form: {
    eyebrow: string;
    title: string;
    description: string;
    labels: { level: string; direction: string; goal: string };
    placeholders: { level: string; direction: string; goal: string };
    levels: Record<TrainingLevelId, string>;
    directions: Record<TrainingDirectionId, string>;
    errors: { level: string; direction: string; goal: string; goalTooLong: string };
    asideTitle: string;
    asideText: string;
  };
}

/**
 * The request is filed through the ordinary project request API as project
 * type "other"; this text (always in Russian, for the managers) opens its
 * description so it reads as a training request in the manager panel.
 */
export const trainingRequestTexts = {
  heading: "Заявка на обучение с наставником (/training)",
  level: "Текущий уровень",
  direction: "Направление",
  goal: "Цель обучения",
  levels: {
    beginner: "Начинающий",
    basics: "Базовые знания программирования",
    developer: "Разработчик: нужна практика или помощь с проектом",
  } satisfies Record<TrainingLevelId, string>,
  directions: {
    web: "Разработка сайтов и веб-сервисов",
    mobile: "Разработка мобильных приложений",
    apiDb: "Работа с API и базами данных",
    gitReview: "Git, отладка и проверка кода",
    devops: "Практика DevOps и CI/CD",
    undecided: "Пока не определено",
  } satisfies Record<TrainingDirectionId, string>,
};

/** Room left for the goal in the description (2000 characters in all). */
export const TRAINING_GOAL_MAX_LENGTH = 1500;

export const trainingTranslations: Record<Locale, TrainingTranslations> = {
  ru: {
    seo: {
      title: "Практическое обучение с наставником | COMPNET",
      description:
        "Платное практическое обучение разработке сайтов и приложений: задания, проверка кода и разбор ошибок с наставником. Условия обсуждаются до начала обучения.",
    },
    breadcrumb: { label: "Навигационная цепочка", home: "Главная", current: "Обучение" },
    hero: {
      badge: "Обучение",
      title: "Практическое обучение с наставником",
      description:
        "Учитесь разрабатывать сайты и приложения: выполняйте практические задания, получайте проверку кода и разбирайте ошибки с наставником.",
      paid: "Обучение платное. Стоимость и условия обсуждаем до начала занятий.",
      discuss: "Обсудить обучение",
    },
    audience: {
      eyebrow: "Для кого",
      title: "Кому подойдёт обучение",
      description: "Задания и начальные требования согласуем после того, как обсудим ваш уровень.",
      items: [
        { title: "Начинающие", description: "Тем, кто только начинает и хочет учиться разработке на практических задачах." },
        {
          title: "С базовыми знаниями программирования",
          description: "Тем, кто знает основы и хочет применить их в практических заданиях.",
        },
        {
          title: "Разработчики",
          description: "Тем, кому нужна практика, проверка кода или помощь с собственным проектом.",
        },
      ],
    },
    format: {
      eyebrow: "Формат",
      title: "Как устроена практика",
      description: "Каждое задание проходит один и тот же цикл — от постановки задачи до готового результата.",
      steps: [
        { title: "Задача", description: "Получаете задание, согласованное с вашим уровнем." },
        { title: "Самостоятельная работа", description: "Выполняете задание сами." },
        { title: "Проверка кода", description: "Наставник проверяет ваш код." },
        { title: "Разбор ошибок", description: "Вместе разбираете найденные ошибки и причины, по которым они возникли." },
        { title: "Исправления", description: "Исправляете код по итогам разбора." },
        { title: "Демонстрация результата", description: "Показываете, как работает готовое решение." },
      ],
    },
    directions: {
      eyebrow: "Направления",
      title: "Чему можно учиться",
      description:
        "Конкретные технологии и инструменты согласуем на первом обсуждении — в пределах того, с чем работает наставник.",
      items: [
        { title: "Разработка сайтов и веб-сервисов", description: "Страницы, формы, логика и работа с данными в веб-приложениях." },
        { title: "Разработка мобильных приложений", description: "Приложения для смартфонов и их связь с серверной частью." },
        { title: "Работа с API и базами данных", description: "Серверная часть: API, хранение данных и интеграции." },
        { title: "Git, отладка и проверка кода", description: "Работа с репозиторием, поиск ошибок и проверка кода." },
        { title: "Практика DevOps и CI/CD", description: "Пройдите путь от изменения кода до запуска приложения на сервере: GitHub, GitHub Actions, Docker и VPS." },
      ],
    },
    devopsPractice: {
      eyebrow: "Программа практики",
      title: "Практика DevOps и CI/CD",
      description: "Предлагаемая программа практики — план занятий, а не результаты учеников.",
      beginners: "Начинающим объясняем необходимые основы, сложность заданий согласуем по уровню.",
      steps: [
        "Работа с репозиторием и веткой",
        "Подготовка Dockerfile",
        "Настройка workflow GitHub Actions",
        "Сборка приложения и Docker-образа",
        "Развёртывание учебного приложения на VPS",
        "Просмотр логов и разбор ошибки сборки или запуска",
      ],
      resultTitle: "Результат практики",
      result: "Учебный проект с настроенным процессом сборки и развёртывания и описанием выполненной работы.",
      resultNote: "Это учебная практика, а не коммерческий опыт.",
      costs: "Расходы на VPS, домен и сторонние сервисы согласуются до начала занятий.",
    },
    examples: {
      eyebrow: "Примеры задач",
      title: "Примеры учебных проектов",
      description: "Это примеры учебных заданий, а не выполненные работы учеников.",
      label: "Учебный пример",
      items: [
        { title: "Каталог с заявками", description: "Каталог товаров или услуг с формой заявки." },
        { title: "Запись клиентов", description: "Выбор услуги, даты и времени и подтверждение записи." },
        { title: "Личный кабинет", description: "Вход пользователя и раздел с его данными." },
        { title: "Приложение заказов", description: "Мобильное приложение со списком заказов и их статусами." },
      ],
    },
    cooperation: {
      eyebrow: "Сотрудничество",
      title: "Возможность оплачиваемого сотрудничества",
      text: "После оценки навыков участник может быть приглашён к отдельным оплачиваемым задачам при наличии подходящих проектов. Участие и оплата согласуются отдельно. Обучение не гарантирует трудоустройство, доход или получение проекта.",
    },
    terms: {
      eyebrow: "Условия",
      title: "Условия обучения",
      description: "Обучение платное. Эти условия обсуждаются до начала обучения:",
      items: ["Стоимость", "Длительность", "Расписание", "Объём сопровождения"],
    },
    form: {
      eyebrow: "Заявка",
      title: "Обсудить обучение",
      description: "Расскажите о своём уровне и цели — обсудим формат и условия обучения.",
      labels: { level: "Текущий уровень", direction: "Интересующее направление", goal: "Цель обучения" },
      placeholders: {
        level: "Выберите уровень",
        direction: "Выберите направление",
        goal: "Например: хочу научиться делать сайты с формами заявок или нужна помощь с моим проектом",
      },
      levels: {
        beginner: "Начинающий",
        basics: "Есть базовые знания программирования",
        developer: "Разработчик: нужна практика или помощь с проектом",
      },
      directions: {
        web: "Разработка сайтов и веб-сервисов",
        mobile: "Разработка мобильных приложений",
        apiDb: "Работа с API и базами данных",
        gitReview: "Git, отладка и проверка кода",
        devops: "Практика DevOps и CI/CD",
        undecided: "Пока не определился(-ась)",
      },
      errors: {
        level: "Выберите текущий уровень",
        direction: "Выберите направление",
        goal: "Опишите цель обучения",
        goalTooLong: "Слишком длинный текст",
      },
      asideTitle: "Что будет дальше",
      asideText:
        "Мы свяжемся с вами удобным способом, уточним уровень и цель, а затем обсудим стоимость, длительность, расписание и объём сопровождения.",
    },
  },
  kk: {
    seo: {
      title: "Тәлімгермен практикалық оқыту | COMPNET",
      description:
        "Сайттар мен қосымшаларды әзірлеуге ақылы практикалық оқыту: тапсырмалар, кодты тексеру және тәлімгермен қателерді талдау. Шарттар оқу басталғанға дейін талқыланады.",
    },
    breadcrumb: { label: "Навигациялық тізбек", home: "Басты бет", current: "Оқыту" },
    hero: {
      badge: "Оқыту",
      title: "Тәлімгермен практикалық оқыту",
      description:
        "Сайттар мен қосымшаларды әзірлеуді үйреніңіз: практикалық тапсырмаларды орындаңыз, кодыңызды тексертіп, қателерді тәлімгермен бірге талдаңыз.",
      paid: "Оқыту ақылы. Құны мен шарттарын сабақ басталғанға дейін талқылаймыз.",
      discuss: "Оқытуды талқылау",
    },
    audience: {
      eyebrow: "Кімге арналған",
      title: "Оқыту кімге сәйкес келеді",
      description: "Тапсырмалар мен бастапқы талаптарды деңгейіңізді талқылағаннан кейін келісеміз.",
      items: [
        { title: "Жаңадан бастаушылар", description: "Енді ғана бастап, әзірлеуді практикалық тапсырмалар арқылы үйренгісі келетіндерге." },
        {
          title: "Бағдарламалаудың негізін білетіндер",
          description: "Негіздерді біліп, оларды практикалық тапсырмаларда қолданғысы келетіндерге.",
        },
        {
          title: "Әзірлеушілер",
          description: "Практика, кодты тексеру немесе өз жобасына көмек қажет болғандарға.",
        },
      ],
    },
    format: {
      eyebrow: "Формат",
      title: "Практика қалай өтеді",
      description: "Әр тапсырма бірдей циклден өтеді — тапсырма қоюдан дайын нәтижеге дейін.",
      steps: [
        { title: "Тапсырма", description: "Деңгейіңізге сай келісілген тапсырма аласыз." },
        { title: "Өзіндік жұмыс", description: "Тапсырманы өзіңіз орындайсыз." },
        { title: "Кодты тексеру", description: "Тәлімгер кодыңызды тексереді." },
        { title: "Қателерді талдау", description: "Табылған қателер мен олардың себептерін бірге талдайсыздар." },
        { title: "Түзетулер", description: "Талдау нәтижесі бойынша кодты түзетесіз." },
        { title: "Нәтижені көрсету", description: "Дайын шешімнің қалай жұмыс істейтінін көрсетесіз." },
      ],
    },
    directions: {
      eyebrow: "Бағыттар",
      title: "Нені үйренуге болады",
      description: "Нақты технологиялар мен құралдарды алғашқы талқылауда келісеміз — тәлімгер жұмыс істейтін аясында.",
      items: [
        { title: "Сайттар мен веб-сервистерді әзірлеу", description: "Веб-қосымшалардағы беттер, формалар, логика және деректермен жұмыс." },
        { title: "Мобильді қосымшаларды әзірлеу", description: "Смартфонға арналған қосымшалар және олардың серверлік бөлікпен байланысы." },
        { title: "API және дерекқорлармен жұмыс", description: "Серверлік бөлік: API, деректерді сақтау және интеграциялар." },
        { title: "Git, жөндеу және кодты тексеру", description: "Репозиториймен жұмыс, қателерді іздеу және кодты тексеру." },
        { title: "DevOps және CI/CD практикасы", description: "Код өзгерісінен қосымшаны серверде іске қосуға дейінгі жолдан өтіңіз: GitHub, GitHub Actions, Docker және VPS." },
      ],
    },
    devopsPractice: {
      eyebrow: "Практика бағдарламасы",
      title: "DevOps және CI/CD практикасы",
      description: "Ұсынылатын практика бағдарламасы — оқушылардың нәтижесі емес, сабақтардың жоспары.",
      beginners: "Жаңадан бастаушыларға қажетті негіздерді түсіндіреміз, тапсырмалардың күрделілігін деңгейге қарай келісеміз.",
      steps: [
        "Репозиторий мен тармақпен жұмыс",
        "Dockerfile дайындау",
        "GitHub Actions workflow баптау",
        "Қосымша мен Docker-бейнені құрастыру",
        "Оқу қосымшасын VPS-ке орналастыру",
        "Логтарды қарау және құрастыру немесе іске қосу қатесін талдау",
      ],
      resultTitle: "Практиканың нәтижесі",
      result: "Құрастыру мен орналастыру процесі бапталған және орындалған жұмыстың сипаттамасы бар оқу жобасы.",
      resultNote: "Бұл — коммерциялық тәжірибе емес, оқу практикасы.",
      costs: "VPS, домен және үшінші тарап сервистерінің шығындары сабақ басталғанға дейін келісіледі.",
    },
    examples: {
      eyebrow: "Тапсырма мысалдары",
      title: "Оқу жобаларының мысалдары",
      description: "Бұл — оқу тапсырмаларының мысалдары, оқушылардың орындаған жұмыстары емес.",
      label: "Оқу мысалы",
      items: [
        { title: "Өтінімдері бар каталог", description: "Өтінім формасы бар тауарлар немесе қызметтер каталогы." },
        { title: "Клиенттерді жазу", description: "Қызметті, күн мен уақытты таңдау және жазылуды растау." },
        { title: "Жеке кабинет", description: "Пайдаланушының кіруі және оның деректері бар бөлім." },
        { title: "Тапсырыстар қосымшасы", description: "Тапсырыстар тізімі мен олардың мәртебелері бар мобильді қосымша." },
      ],
    },
    cooperation: {
      eyebrow: "Ынтымақтастық",
      title: "Ақылы ынтымақтастық мүмкіндігі",
      text: "Дағдылар бағаланғаннан кейін қатысушы қолайлы жобалар болған жағдайда жекелеген ақылы тапсырмаларға шақырылуы мүмкін. Қатысу және төлем жеке келісіледі. Оқыту жұмысқа орналасуға, табысқа немесе жоба алуға кепілдік бермейді.",
    },
    terms: {
      eyebrow: "Шарттар",
      title: "Оқыту шарттары",
      description: "Оқыту ақылы. Келесі шарттар оқу басталғанға дейін талқыланады:",
      items: ["Құны", "Ұзақтығы", "Кестесі", "Сүйемелдеу көлемі"],
    },
    form: {
      eyebrow: "Өтінім",
      title: "Оқытуды талқылау",
      description: "Деңгейіңіз бен мақсатыңыз туралы айтыңыз — оқыту форматы мен шарттарын талқылаймыз.",
      labels: { level: "Қазіргі деңгей", direction: "Қызықтыратын бағыт", goal: "Оқу мақсаты" },
      placeholders: {
        level: "Деңгейді таңдаңыз",
        direction: "Бағытты таңдаңыз",
        goal: "Мысалы: өтінім формалары бар сайттар жасауды үйренгім келеді немесе жобама көмек керек",
      },
      levels: {
        beginner: "Жаңадан бастаушы",
        basics: "Бағдарламалаудың негізін білемін",
        developer: "Әзірлеуші: практика немесе жобаға көмек керек",
      },
      directions: {
        web: "Сайттар мен веб-сервистерді әзірлеу",
        mobile: "Мобильді қосымшаларды әзірлеу",
        apiDb: "API және дерекқорлармен жұмыс",
        gitReview: "Git, жөндеу және кодты тексеру",
        devops: "DevOps және CI/CD практикасы",
        undecided: "Әзірге шешпедім",
      },
      errors: {
        level: "Қазіргі деңгейді таңдаңыз",
        direction: "Бағытты таңдаңыз",
        goal: "Оқу мақсатын сипаттаңыз",
        goalTooLong: "Мәтін тым ұзын",
      },
      asideTitle: "Әрі қарай не болады",
      asideText:
        "Сізбен ыңғайлы тәсілмен байланысып, деңгейіңіз бен мақсатыңызды нақтылаймыз, содан кейін құнын, ұзақтығын, кестесін және сүйемелдеу көлемін талқылаймыз.",
    },
  },
  en: {
    seo: {
      title: "Hands-on training with a mentor | COMPNET",
      description:
        "Paid hands-on training in website and app development: assignments, code review and going through mistakes with a mentor. Terms are agreed before the training starts.",
    },
    breadcrumb: { label: "Breadcrumb", home: "Home", current: "Training" },
    hero: {
      badge: "Training",
      title: "Hands-on training with a mentor",
      description:
        "Learn to build websites and apps: complete hands-on assignments, get your code reviewed and go through your mistakes with a mentor.",
      paid: "The training is paid. The price and terms are agreed before the sessions start.",
      discuss: "Discuss the training",
    },
    audience: {
      eyebrow: "Who it is for",
      title: "Who the training suits",
      description: "Assignments and entry requirements are agreed once we have discussed your level.",
      items: [
        { title: "Beginners", description: "For those just starting out who want to learn development through hands-on tasks." },
        {
          title: "Basic programming knowledge",
          description: "For those who know the basics and want to apply them in hands-on assignments.",
        },
        {
          title: "Developers",
          description: "For those who need practice, a code review or help with their own project.",
        },
      ],
    },
    format: {
      eyebrow: "Format",
      title: "How the practice works",
      description: "Every assignment goes through the same cycle — from the task to a working result.",
      steps: [
        { title: "Task", description: "You get an assignment matched to your level." },
        { title: "Independent work", description: "You complete the assignment yourself." },
        { title: "Code review", description: "The mentor reviews your code." },
        { title: "Going through mistakes", description: "Together you go through the mistakes found and why they happened." },
        { title: "Fixes", description: "You fix the code based on the review." },
        { title: "Showing the result", description: "You demonstrate how the finished solution works." },
      ],
    },
    directions: {
      eyebrow: "Areas",
      title: "What you can learn",
      description: "Specific technologies and tools are agreed at the first discussion — within what the mentor works with.",
      items: [
        { title: "Websites and web services", description: "Pages, forms, logic and working with data in web applications." },
        { title: "Mobile apps", description: "Smartphone apps and how they connect to the server side." },
        { title: "APIs and databases", description: "The server side: APIs, data storage and integrations." },
        { title: "Git, debugging and code review", description: "Working with a repository, finding bugs and reviewing code." },
        { title: "DevOps and CI/CD practice", description: "Go from a code change to the app running on a server: GitHub, GitHub Actions, Docker and a VPS." },
      ],
    },
    devopsPractice: {
      eyebrow: "Practice programme",
      title: "DevOps and CI/CD practice",
      description: "A proposed practice programme — a plan for the sessions, not students' results.",
      beginners: "For beginners we explain the basics needed; the difficulty of the assignments is agreed by level.",
      steps: [
        "Working with a repository and a branch",
        "Writing a Dockerfile",
        "Setting up a GitHub Actions workflow",
        "Building the app and a Docker image",
        "Deploying a training app to a VPS",
        "Reading the logs and going through a build or start-up error",
      ],
      resultTitle: "Result of the practice",
      result: "A training project with a configured build and deployment process and a description of the work done.",
      resultNote: "This is training practice, not commercial experience.",
      costs: "Costs of the VPS, domain and third-party services are agreed before the sessions start.",
    },
    examples: {
      eyebrow: "Sample tasks",
      title: "Examples of training projects",
      description: "These are examples of training assignments, not work completed by students.",
      label: "Training example",
      items: [
        { title: "Catalog with requests", description: "A catalog of products or services with a request form." },
        { title: "Client booking", description: "Choosing a service, a date and a time, and confirming the booking." },
        { title: "User account", description: "User sign-in and a section with the user's data." },
        { title: "Orders app", description: "A mobile app with a list of orders and their statuses." },
      ],
    },
    cooperation: {
      eyebrow: "Cooperation",
      title: "Possibility of paid cooperation",
      text: "After a skills assessment, a participant may be invited to separate paid tasks when suitable projects are available. Participation and payment are agreed separately. The training does not guarantee employment, income or a project.",
    },
    terms: {
      eyebrow: "Terms",
      title: "Training terms",
      description: "The training is paid. These terms are agreed before the training starts:",
      items: ["Price", "Duration", "Schedule", "Amount of mentoring"],
    },
    form: {
      eyebrow: "Request",
      title: "Discuss the training",
      description: "Tell us about your level and goal — we will discuss the format and terms of the training.",
      labels: { level: "Current level", direction: "Area of interest", goal: "Training goal" },
      placeholders: {
        level: "Choose your level",
        direction: "Choose an area",
        goal: "For example: I want to learn to build websites with request forms, or I need help with my project",
      },
      levels: {
        beginner: "Beginner",
        basics: "Basic programming knowledge",
        developer: "Developer: need practice or help with a project",
      },
      directions: {
        web: "Websites and web services",
        mobile: "Mobile apps",
        apiDb: "APIs and databases",
        gitReview: "Git, debugging and code review",
        devops: "DevOps and CI/CD practice",
        undecided: "Not decided yet",
      },
      errors: {
        level: "Choose your current level",
        direction: "Choose an area",
        goal: "Describe your training goal",
        goalTooLong: "The text is too long",
      },
      asideTitle: "What happens next",
      asideText:
        "We will contact you the way you prefer, clarify your level and goal, and then discuss the price, duration, schedule and amount of mentoring.",
    },
  },
};
