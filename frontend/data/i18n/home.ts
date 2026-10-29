import type { Locale } from "@/types/i18n";

/** Home page sections and the /services page heading. Keys of item maps are the ids in data/*.ts. */
const ru = {
  heroVisual: {
    title: "Направления разработки",
    subtitle: "От идеи и дизайна до запуска и поддержки",
    devops: "Настраиваем сборку и развёртывание приложений через GitHub Actions, Docker и VPS",
  },
  whatWeCreate: {
    eyebrow: "Что мы делаем",
    title: "Какие проекты мы создаём",
    description: "Полный цикл разработки — от идеи до готового продукта, под любую задачу бизнеса.",
    items: {
      "pt-1": { title: "Сайты", description: "От первого лендинга до сложного корпоративного портала" },
      "pt-2": { title: "Web-приложения", description: "Сервисы с собственной логикой для внутренних и внешних задач" },
      "pt-3": { title: "Мобильные приложения", description: "Нативный и кроссплатформенный опыт для ваших клиентов" },
      "pt-4": { title: "AI и автоматизация", description: "Умные помощники и автоматизация рутинных процессов" },
      "pt-5": { title: "Backend и API", description: "Надёжная серверная часть для любых продуктов" },
      "pt-6": { title: "DevOps и поддержка", description: "Стабильная инфраструктура и сопровождение после запуска" },
    },
  },
  servicesOverview: {
    eyebrow: "Основные услуги",
    title: "Чем мы можем помочь вашему бизнесу",
    description: "Четыре ключевых направления разработки — подробности и остальные услуги на отдельной странице.",
  },
  pricing: {
    eyebrow: "Цены",
    title: "Ориентировочная стоимость по типам проектов",
    description: "Цена зависит от объёма задач — ниже стартовые ориентиры по каждому направлению.",
    note: "Стоимость указана ориентировочно. Точная цена рассчитывается после обсуждения задач и подготовки технического задания.",
  },
  techStack: {
    eyebrow: "Технологии",
    title: "Стек, на котором мы работаем",
    description: "Подбираем инструменты под задачу — от фронтенда и бэкенда до AI и инфраструктуры.",
  },
  howItWorks: {
    eyebrow: "Процесс",
    title: "Этапы разработки",
    description: "От брифа и дизайна до запуска и поддержки — прозрачный процесс на каждом шаге.",
    steps: {
      "step-1": {
        title: "Бриф и анализ",
        description: "Обсуждаем цели проекта, аудиторию и требования, фиксируем сроки и объём работ.",
      },
      "step-2": {
        title: "Дизайн и прототип",
        description: "Прорабатываем UX-логику и визуальный стиль, согласуем макеты перед разработкой.",
      },
      "step-3": {
        title: "Разработка",
        description: "Пишем код, настраиваем интеграции и проводим тестирование на каждом этапе.",
      },
      "step-4": {
        title: "Запуск и поддержка",
        description: "Выкладываем проект в продакшн и сопровождаем его после запуска.",
      },
    },
  },
  portfolio: {
    eyebrow: "Портфолио",
    title: "Реализованные проекты",
    description: "Несколько кейсов из разных направлений — web, mobile, CRM и AI.",
    allProjects: "Все проекты",
    cases: {
      "case-1": {
        title: "Сайт для строительной компании «СтройГрад»",
        category: "Корпоративный сайт",
        description:
          "Многостраничный корпоративный сайт с портфолио объектов и формой заявки на консультацию. Результат: число заявок с сайта выросло в 2 раза за первый квартал.",
      },
      "case-2": {
        title: "CRM для отдела продаж «Альтаир Групп»",
        category: "CRM-система",
        description:
          "Учёт сделок, клиентской базы и воронки продаж с автоматическими напоминаниями менеджерам. Результат: среднее время обработки заявки сократилось с 2 дней до 4 часов.",
      },
      "case-3": {
        title: "Приложение сервиса доставки «Шустрик»",
        category: "Мобильное приложение",
        description:
          "Приложение для курьеров и клиентов с отслеживанием доставки в реальном времени. Результат: среднее время подтверждения доставки сократилось на 30%.",
      },
      "case-4": {
        title: "Интернет-магазин одежды «Wear&Go»",
        category: "Интернет-магазин",
        description:
          "Онлайн-магазин с удобным оформлением покупки, приёмом онлайн-оплаты и личным кабинетом клиента. Результат: конверсия выросла на 18% в первый месяц.",
      },
      "case-5": {
        title: "AI-ассистент поддержки «HelpDesk Pro»",
        category: "AI-решение",
        description:
          "Чат-бот на основе языковой модели, отвечающий на частые вопросы клиентов и передающий сложные обращения менеджеру. Результат: нагрузка на линию поддержки снизилась на 40%.",
      },
      "case-6": {
        title: "Web-система управления сотрудниками «Орбита»",
        category: "Web-приложение",
        description:
          "Внутренняя платформа для учёта рабочего времени, отпусков и задач с ролевым доступом. Результат: согласование отпуска сократилось с недели до одного дня.",
      },
    },
  },
  features: {
    eyebrow: "Почему мы",
    title: "Почему выбирают нас",
    description: "Работаем как продолжение вашей команды — с прозрачностью на каждом этапе.",
    items: {
      "feat-1": {
        title: "Полный цикл разработки",
        description: "От идеи и дизайна до кода, запуска и технической поддержки — без сторонних подрядчиков.",
      },
      "feat-2": {
        title: "Прозрачные сроки",
        description: "Понятный план по этапам с дедлайнами и регулярными демо промежуточных результатов.",
      },
      "feat-3": {
        title: "Выделенная команда",
        description: "Постоянные разработчики и менеджер проекта, знакомые со всеми деталями задачи.",
      },
      "feat-4": {
        title: "Безопасность и качество",
        description: "Тестирование, код-ревью и защита данных на каждом этапе разработки.",
      },
      "feat-5": {
        title: "Современный стек",
        description: "Используем актуальные технологии и AI-инструменты для быстрой и надёжной разработки.",
      },
      "feat-6": {
        title: "Поддержка после запуска",
        description: "Сопровождение и доработки после запуска проекта — на согласованных условиях.",
      },
    },
  },
  testimonials: {
    eyebrow: "Отзывы",
    title: "Клиенты нам доверяют",
    description: "Реальные истории команд, которые уже работают с COMPNET.",
    allReviews: "Все отзывы",
  },
  faq: {
    eyebrow: "FAQ",
    title: "Частые вопросы",
    description: "Если ответа нет здесь — просто напишите нам, обсудим детали проекта.",
    items: {
      "faq-1": {
        question: "Сколько времени занимает разработка сайта?",
        answer:
          "Зависит от сложности: лендинг — 2–3 недели, корпоративный сайт — 4–8 недель, web-приложение или CRM — от 8 недель. Точные сроки фиксируем на этапе брифинга.",
      },
      "faq-2": {
        question: "Как формируется стоимость проекта?",
        answer:
          "Стоимость зависит от объёма экранов, интеграций и срока запуска. После брифа готовим детальную смету с разбивкой по этапам.",
      },
      "faq-3": {
        question: "Работаете ли вы с готовым дизайном?",
        answer:
          "Да, можем разрабатывать по вашему макету или взять UI/UX дизайн на себя — от вайрфреймов до финального интерфейса.",
      },
      "faq-4": {
        question: "Что входит в поддержку после запуска?",
        answer:
          "Исправление ошибок, обновления безопасности и доработки по запросу — на условиях, которые обсуждаем индивидуально.",
      },
      "faq-5": {
        question: "Можно ли заказать только мобильное приложение без сайта?",
        answer: "Да, мобильная разработка ведётся отдельным треком — с собственным дизайном и backend при необходимости.",
      },
      "faq-6": {
        question: "Подписываете ли вы NDA?",
        answer: "Да, готовы подписать соглашение о конфиденциальности до начала обсуждения деталей проекта.",
      },
      "faq-7": {
        question: "Какие технологии вы используете?",
        answer: "Стек подбираем под задачу — подробный список инструментов есть в разделе «Технологии» на этой странице.",
      },
    },
  },
  cta: {
    title: "Рассчитаем стоимость вашего проекта",
    description: "Опишите задачу — вернёмся с оценкой сроков и бюджета в течение рабочего дня.",
    primary: "Рассчитать стоимость",
  },
  servicesPage: {
    badge: "Услуги",
    titleStart: "Услуги",
    description: "Полный цикл разработки — от идеи и дизайна до запуска и поддержки. Ниже — подробности по каждому направлению.",
  },
};

export type HomeTranslations = typeof ru;

export const homeTranslations: Record<Locale, HomeTranslations> = {
  ru,

  kk: {
    heroVisual: {
      title: "Әзірлеу бағыттары",
      subtitle: "Идея мен дизайннан бастап іске қосу мен қолдауға дейін",
      devops: "Қосымшаларды GitHub Actions, Docker және VPS арқылы құрастыру мен орналастыруды баптаймыз",
    },
    whatWeCreate: {
      eyebrow: "Не істейміз",
      title: "Қандай жобалар жасаймыз",
      description: "Әзірлеудің толық циклі — идеядан дайын өнімге дейін, бизнестің кез келген міндеті үшін.",
      items: {
        "pt-1": { title: "Сайттар", description: "Алғашқы лендингтен күрделі корпоративтік порталға дейін" },
        "pt-2": { title: "Web-қосымшалар", description: "Ішкі және сыртқы міндеттерге арналған өз логикасы бар сервистер" },
        "pt-3": { title: "Мобильді қосымшалар", description: "Клиенттеріңізге арналған нативті және кроссплатформалы тәжірибе" },
        "pt-4": { title: "ЖИ және автоматтандыру", description: "Ақылды көмекшілер және күнделікті процестерді автоматтандыру" },
        "pt-5": { title: "Backend және API", description: "Кез келген өнімге арналған сенімді серверлік бөлік" },
        "pt-6": { title: "DevOps және қолдау", description: "Тұрақты инфрақұрылым және іске қосқаннан кейінгі сүйемелдеу" },
      },
    },
    servicesOverview: {
      eyebrow: "Негізгі қызметтер",
      title: "Бизнесіңізге қалай көмектесе аламыз",
      description: "Әзірлеудің төрт негізгі бағыты — толығырақ ақпарат пен басқа қызметтер жеке бетте.",
    },
    pricing: {
      eyebrow: "Бағалар",
      title: "Жоба түрлері бойынша болжамды құн",
      description: "Баға міндеттердің көлеміне байланысты — төменде әр бағыт бойынша бастапқы бағдарлар.",
      note: "Құны болжамды түрде көрсетілген. Нақты баға міндеттерді талқылап, техникалық тапсырманы дайындағаннан кейін есептеледі.",
    },
    techStack: {
      eyebrow: "Технологиялар",
      title: "Біз жұмыс істейтін стек",
      description: "Құралдарды міндетке қарай таңдаймыз — фронтенд пен бэкендтен бастап ЖИ мен инфрақұрылымға дейін.",
    },
    howItWorks: {
      eyebrow: "Процесс",
      title: "Әзірлеу кезеңдері",
      description: "Брифтен және дизайннан іске қосу мен қолдауға дейін — әр қадамда ашық процесс.",
      steps: {
        "step-1": {
          title: "Бриф және талдау",
          description: "Жобаның мақсаттарын, аудиториясын және талаптарын талқылап, мерзімдер мен жұмыс көлемін бекітеміз.",
        },
        "step-2": {
          title: "Дизайн және прототип",
          description: "UX-логика мен визуалды стильді әзірлеп, макеттерді әзірлеуден бұрын келісеміз.",
        },
        "step-3": {
          title: "Әзірлеу",
          description: "Код жазамыз, интеграцияларды баптаймыз және әр кезеңде тестілеу жүргіземіз.",
        },
        "step-4": {
          title: "Іске қосу және қолдау",
          description: "Жобаны продакшнға шығарып, іске қосылғаннан кейін сүйемелдейміз.",
        },
      },
    },
    portfolio: {
      eyebrow: "Портфолио",
      title: "Жүзеге асырылған жобалар",
      description: "Әртүрлі бағыттардағы бірнеше кейс — web, mobile, CRM және ЖИ.",
      allProjects: "Барлық жобалар",
      cases: {
        "case-1": {
          title: "«СтройГрад» құрылыс компаниясына арналған сайт",
          category: "Корпоративтік сайт",
          description:
            "Нысандар портфолиосы мен кеңеске өтінім формасы бар көп беттік корпоративтік сайт. Нәтиже: сайттан түсетін өтінімдер саны бірінші тоқсанда 2 есе өсті.",
        },
        "case-2": {
          title: "«Альтаир Групп» сату бөліміне арналған CRM",
          category: "CRM-жүйе",
          description:
            "Менеджерлерге автоматты еске салғыштары бар мәмілелерді, клиенттік базаны және сату воронкасын есепке алу. Нәтиже: өтінімді өңдеудің орташа уақыты 2 күннен 4 сағатқа дейін қысқарды.",
        },
        "case-3": {
          title: "«Шустрик» жеткізу сервисінің қосымшасы",
          category: "Мобильді қосымша",
          description:
            "Жеткізуді нақты уақытта бақылау мүмкіндігі бар курьерлер мен клиенттерге арналған қосымша. Нәтиже: жеткізуді растаудың орташа уақыты 30%-ға қысқарды.",
        },
        "case-4": {
          title: "«Wear&Go» киім интернет-дүкені",
          category: "Интернет-дүкен",
          description:
            "Сатып алуды ыңғайлы рәсімдейтін, онлайн-төлем қабылдайтын және клиенттің жеке кабинеті бар онлайн-дүкен. Нәтиже: конверсия бірінші айда 18%-ға өсті.",
        },
        "case-5": {
          title: "«HelpDesk Pro» қолдау қызметінің ЖИ-ассистенті",
          category: "ЖИ-шешім",
          description:
            "Клиенттердің жиі қойылатын сұрақтарына жауап беретін және күрделі өтініштерді менеджерге жіберетін тілдік модельге негізделген чат-бот. Нәтиже: қолдау желісіне түсетін жүктеме 40%-ға азайды.",
        },
        "case-6": {
          title: "«Орбита» қызметкерлерді басқарудың web-жүйесі",
          category: "Web-қосымша",
          description:
            "Жұмыс уақытын, демалыстар мен тапсырмаларды рөлдік қолжетімділікпен есепке алатын ішкі платформа. Нәтиже: демалысты келісу бір аптадан бір күнге дейін қысқарды.",
        },
      },
    },
    features: {
      eyebrow: "Неге біз",
      title: "Бізді неге таңдайды",
      description: "Командаңыздың жалғасы ретінде жұмыс істейміз — әр кезеңде ашықтықпен.",
      items: {
        "feat-1": {
          title: "Әзірлеудің толық циклі",
          description: "Идея мен дизайннан бастап код, іске қосу және техникалық қолдауға дейін — бөгде мердігерлерсіз.",
        },
        "feat-2": {
          title: "Ашық мерзімдер",
          description: "Дедлайндары бар кезеңдік түсінікті жоспар және аралық нәтижелердің тұрақты демолары.",
        },
        "feat-3": {
          title: "Бөлінген команда",
          description: "Міндеттің барлық егжей-тегжейін білетін тұрақты әзірлеушілер мен жоба менеджері.",
        },
        "feat-4": {
          title: "Қауіпсіздік және сапа",
          description: "Әзірлеудің әр кезеңінде тестілеу, код-ревью және деректерді қорғау.",
        },
        "feat-5": {
          title: "Заманауи стек",
          description: "Жылдам әрі сенімді әзірлеу үшін өзекті технологиялар мен ЖИ-құралдарды пайдаланамыз.",
        },
        "feat-6": {
          title: "Іске қосқаннан кейінгі қолдау",
          description: "Жоба іске қосылғаннан кейін сүйемелдеу және жетілдірулер — келісілген шарттармен.",
        },
      },
    },
    testimonials: {
      eyebrow: "Пікірлер",
      title: "Клиенттер бізге сенеді",
      description: "COMPNET-пен жұмыс істеп жүрген командалардың нақты тарихтары.",
      allReviews: "Барлық пікірлер",
    },
    faq: {
      eyebrow: "FAQ",
      title: "Жиі қойылатын сұрақтар",
      description: "Мұнда жауап таппасаңыз — бізге жазыңыз, жобаның егжей-тегжейін талқылаймыз.",
      items: {
        "faq-1": {
          question: "Сайт әзірлеу қанша уақыт алады?",
          answer:
            "Күрделілігіне байланысты: лендинг — 2–3 апта, корпоративтік сайт — 4–8 апта, web-қосымша немесе CRM — 8 аптадан бастап. Нақты мерзімдерді бриф кезеңінде бекітеміз.",
        },
        "faq-2": {
          question: "Жобаның құны қалай қалыптасады?",
          answer:
            "Құны экрандар көлеміне, интеграцияларға және іске қосу мерзіміне байланысты. Брифтен кейін кезеңдерге бөлінген толық смета дайындаймыз.",
        },
        "faq-3": {
          question: "Дайын дизайнмен жұмыс істейсіздер ме?",
          answer:
            "Иә, сіздің макетіңіз бойынша әзірлей аламыз немесе UI/UX дизайнды өзімізге аламыз — вайрфреймдерден соңғы интерфейске дейін.",
        },
        "faq-4": {
          question: "Іске қосқаннан кейінгі қолдауға не кіреді?",
          answer:
            "Қателерді түзету, қауіпсіздік жаңартулары және сұраныс бойынша жетілдірулер — жеке талқыланатын шарттармен.",
        },
        "faq-5": {
          question: "Сайтсыз тек мобильді қосымшаға тапсырыс беруге бола ма?",
          answer: "Иә, мобильді әзірлеу жеке бағыт ретінде жүргізіледі — қажет болса, өз дизайны мен backend-імен.",
        },
        "faq-6": {
          question: "NDA-ға қол қоясыздар ма?",
          answer: "Иә, жобаның егжей-тегжейін талқылауды бастамас бұрын құпиялылық туралы келісімге қол қоюға дайынбыз.",
        },
        "faq-7": {
          question: "Қандай технологияларды пайдаланасыздар?",
          answer: "Стекті міндетке қарай таңдаймыз — құралдардың толық тізімі осы беттегі «Технологиялар» бөлімінде бар.",
        },
      },
    },
    cta: {
      title: "Жобаңыздың құнын есептейміз",
      description: "Міндетті сипаттаңыз — жұмыс күні ішінде мерзім мен бюджетті бағалап, жауап береміз.",
      primary: "Құнын есептеу",
    },
    servicesPage: {
      badge: "Қызметтер",
      titleStart: "Қызметтер",
      description: "Әзірлеудің толық циклі — идея мен дизайннан іске қосу мен қолдауға дейін. Төменде әр бағыт бойынша толығырақ.",
    },
  },

  en: {
    heroVisual: {
      title: "What we develop",
      subtitle: "From idea and design to launch and support",
      devops: "We set up building and deploying apps with GitHub Actions, Docker and a VPS",
    },
    whatWeCreate: {
      eyebrow: "What we do",
      title: "Projects we build",
      description: "The full development cycle, from idea to finished product, for any business need.",
      items: {
        "pt-1": { title: "Websites", description: "From a first landing page to a complex corporate portal" },
        "pt-2": { title: "Web applications", description: "Services with their own logic for internal and customer-facing needs" },
        "pt-3": { title: "Mobile apps", description: "Native and cross-platform experiences for your customers" },
        "pt-4": { title: "AI and automation", description: "Smart assistants and automation of routine processes" },
        "pt-5": { title: "Backend and API", description: "A reliable server side for any product" },
        "pt-6": { title: "DevOps and support", description: "Stable infrastructure and maintenance after launch" },
      },
    },
    servicesOverview: {
      eyebrow: "Core services",
      title: "How we can help your business",
      description: "Four key areas of development — details and other services are on a separate page.",
    },
    pricing: {
      eyebrow: "Pricing",
      title: "Estimated cost by project type",
      description: "The price depends on the scope of work — below are starting points for each area.",
      note: "Prices are approximate. The exact price is calculated after discussing the tasks and preparing the technical specification.",
    },
    techStack: {
      eyebrow: "Technologies",
      title: "Our technology stack",
      description: "We choose tools for the task — from frontend and backend to AI and infrastructure.",
    },
    howItWorks: {
      eyebrow: "Process",
      title: "Development stages",
      description: "From brief and design to launch and support — a transparent process at every step.",
      steps: {
        "step-1": {
          title: "Brief and analysis",
          description: "We discuss the project goals, audience and requirements, and agree on the timeline and scope.",
        },
        "step-2": {
          title: "Design and prototype",
          description: "We work out the UX logic and visual style and approve the mockups before development.",
        },
        "step-3": {
          title: "Development",
          description: "We write the code, set up integrations and test at every stage.",
        },
        "step-4": {
          title: "Launch and support",
          description: "We release the project to production and support it after launch.",
        },
      },
    },
    portfolio: {
      eyebrow: "Portfolio",
      title: "Delivered projects",
      description: "A few cases from different areas — web, mobile, CRM and AI.",
      allProjects: "All projects",
      cases: {
        "case-1": {
          title: "Website for the construction company «СтройГрад»",
          category: "Corporate website",
          description:
            "A multi-page corporate website with a portfolio of properties and a consultation request form. Result: the number of requests from the website doubled in the first quarter.",
        },
        "case-2": {
          title: "CRM for the sales department of «Альтаир Групп»",
          category: "CRM system",
          description:
            "Tracking of deals, the customer base and the sales funnel, with automatic reminders for managers. Result: average request handling time dropped from 2 days to 4 hours.",
        },
        "case-3": {
          title: "App for the delivery service «Шустрик»",
          category: "Mobile app",
          description:
            "An app for couriers and customers with real-time delivery tracking. Result: average delivery confirmation time fell by 30%.",
        },
        "case-4": {
          title: "Online clothing store «Wear&Go»",
          category: "Online store",
          description:
            "An online store with easy checkout, online payments and a customer account. Result: conversion grew by 18% in the first month.",
        },
        "case-5": {
          title: "AI support assistant «HelpDesk Pro»",
          category: "AI solution",
          description:
            "A chatbot based on a language model that answers frequent customer questions and passes complex requests to a manager. Result: the load on the support line decreased by 40%.",
        },
        "case-6": {
          title: "Employee management web system «Орбита»",
          category: "Web application",
          description:
            "An internal platform for tracking working hours, leave and tasks with role-based access. Result: leave approval went from a week to one day.",
        },
      },
    },
    features: {
      eyebrow: "Why us",
      title: "Why clients choose us",
      description: "We work as an extension of your team, with transparency at every stage.",
      items: {
        "feat-1": {
          title: "Full development cycle",
          description: "From idea and design to code, launch and technical support — without third-party contractors.",
        },
        "feat-2": {
          title: "Transparent timelines",
          description: "A clear stage-by-stage plan with deadlines and regular demos of interim results.",
        },
        "feat-3": {
          title: "Dedicated team",
          description: "Permanent developers and a project manager who know every detail of the task.",
        },
        "feat-4": {
          title: "Security and quality",
          description: "Testing, code review and data protection at every stage of development.",
        },
        "feat-5": {
          title: "Modern stack",
          description: "We use up-to-date technologies and AI tools for fast and reliable development.",
        },
        "feat-6": {
          title: "Support after launch",
          description: "Maintenance and improvements after the project launches, on agreed terms.",
        },
      },
    },
    testimonials: {
      eyebrow: "Reviews",
      title: "Clients trust us",
      description: "Real stories of teams that already work with COMPNET.",
      allReviews: "All reviews",
    },
    faq: {
      eyebrow: "FAQ",
      title: "Frequently asked questions",
      description: "If you can't find the answer here, just write to us and we will discuss the details of your project.",
      items: {
        "faq-1": {
          question: "How long does it take to build a website?",
          answer:
            "It depends on complexity: a landing page takes 2–3 weeks, a corporate website 4–8 weeks, a web app or CRM from 8 weeks. We fix the exact timeline at the briefing stage.",
        },
        "faq-2": {
          question: "How is the project cost calculated?",
          answer:
            "The cost depends on the number of screens, integrations and the launch date. After the brief, we prepare a detailed estimate broken down by stage.",
        },
        "faq-3": {
          question: "Do you work with an existing design?",
          answer:
            "Yes, we can build from your mockups or take on the UI/UX design ourselves — from wireframes to the final interface.",
        },
        "faq-4": {
          question: "What does support after launch include?",
          answer:
            "Bug fixes, security updates and improvements on request, on terms we agree individually.",
        },
        "faq-5": {
          question: "Can I order only a mobile app without a website?",
          answer: "Yes, mobile development runs as a separate track, with its own design and a backend if needed.",
        },
        "faq-6": {
          question: "Do you sign an NDA?",
          answer: "Yes, we are ready to sign a non-disclosure agreement before discussing the details of your project.",
        },
        "faq-7": {
          question: "What technologies do you use?",
          answer: "We choose the stack for the task — the full list of tools is in the “Technologies” section on this page.",
        },
      },
    },
    cta: {
      title: "We will estimate the cost of your project",
      description: "Describe your task and we will get back to you with a timeline and budget estimate within one business day.",
      primary: "Estimate the cost",
    },
    servicesPage: {
      badge: "Services",
      titleStart: "Services",
      description: "The full development cycle — from idea and design to launch and support. Details on each area are below.",
    },
  },
};
