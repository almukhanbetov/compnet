import type { Locale } from "@/types/i18n";

/**
 * The DevOps and CI/CD service (/services/devops-ci-cd) and its short
 * mentions on other pages. Confirmed: every COMPNET application uses
 * GitHub, GitHub Actions, Docker and a VPS; the release rule (which branch,
 * manual run) is set per project, so no text says every push goes live.
 * Extras are listed only where COMPNET's own workflows already do them
 * (.github/workflows/ci.yml, deploy.yml, DEPLOY.md § 6): checks before the
 * release, migrations, a backup before migrations, a manual return to
 * earlier images, a check after start, secrets outside the code. Not
 * listed (not confirmed): a test environment, monitoring. No promises of
 * no failures, zero downtime, 24/7 support or guaranteed recovery.
 */

interface Card {
  title: string;
  description: string;
}

export interface DevOpsTranslations {
  seo: { title: string; description: string };
  breadcrumb: { label: string; home: string; services: string; current: string };
  hero: { badge: string; title: string; description: string; discuss: string };
  pipeline: { eyebrow: string; title: string; description: string; steps: Card[]; note: string };
  scenarios: { eyebrow: string; title: string; items: Card[] };
  fit: { eyebrow: string; title: string; items: Card[] };
  works: { eyebrow: string; title: string; description: string; items: Card[] };
  extras: { eyebrow: string; title: string; description: string; items: Card[] };
  handover: { eyebrow: string; title: string; items: Card[] };
  requestForm: { eyebrow: string; title: string; description: string; asideTitle: string; asideText: string };
  /** The card on /services. */
  servicesCard: { eyebrow: string; title: string; description: string; link: string };
  /** The compact stage on the website and mobile app pages. */
  stage: {
    eyebrow: string;
    title: string;
    link: string;
    website: string;
    mobile: { backend: Card; client: Card };
  };
}

export const devopsTranslations: Record<Locale, DevOpsTranslations> = {
  ru: {
    seo: {
      title: "DevOps и CI/CD — сборка и развёртывание на VPS | COMPNET",
      description:
        "Настраиваем сборку и развёртывание сайтов, API и приложений через GitHub Actions, Docker и VPS — для нового приложения или существующего проекта.",
    },
    breadcrumb: { label: "Хлебные крошки", home: "Главная", services: "Услуги", current: "DevOps и CI/CD" },
    hero: {
      badge: "DevOps и CI/CD",
      title: "Сборка и развёртывание приложений на VPS",
      description:
        "Настраиваем процесс, в котором изменения из GitHub собираются в Docker-образы через GitHub Actions и выпускаются на ваш VPS — для нового приложения или существующего проекта.",
      discuss: "Обсудить развёртывание",
    },
    pipeline: {
      eyebrow: "Схема",
      title: "Как проходит доставка обновления",
      description: "Базовый процесс, который настраиваем для проекта.",
      steps: [
        { title: "Изменения в GitHub", description: "Код и конфигурация хранятся в репозитории, изменения вносятся через ветки." },
        { title: "Запуск GitHub Actions", description: "Workflow запускается по правилу выпуска, согласованному для проекта." },
        { title: "Сборка Docker-образа", description: "Приложение собирается в Docker-образ, который сохраняется в реестре образов." },
        { title: "Развёртывание на VPS", description: "Сервер получает новые образы и перезапускает контейнеры приложения." },
      ],
      note:
        "Не каждое изменение сразу попадает на рабочий сервер: правило выпуска согласуем для проекта — например, публикация только после слияния в основную ветку или по ручному запуску.",
    },
    scenarios: {
      eyebrow: "Сценарии",
      title: "Новое приложение или существующий проект",
      items: [
        {
          title: "Новое приложение",
          description: "Настраиваем сборку и развёртывание в рамках разработки, чтобы обновления выпускались по согласованному процессу.",
        },
        {
          title: "Существующий проект",
          description:
            "Сначала изучаем инфраструктуру: репозиторий, сервер и текущий способ запуска. Затем предлагаем, что настроить или доработать, и согласуем объём работ.",
        },
      ],
    },
    fit: {
      eyebrow: "Для каких проектов",
      title: "Каким проектам подходит",
      items: [
        { title: "Сайты и веб-приложения", description: "Frontend и серверная часть, которые работают на вашем VPS." },
        { title: "Backend и API", description: "Серверная часть для сайтов, веб-сервисов и мобильных приложений." },
        {
          title: "Серверная часть мобильных приложений",
          description: "API и backend на VPS. Сборка и публикация самого приложения в App Store и Google Play — отдельный процесс.",
        },
        { title: "Проекты на собственном сервере", description: "Когда приложение должно работать на вашем VPS." },
      ],
    },
    works: {
      eyebrow: "Работы",
      title: "Какие работы выполняем",
      description: "Базовый процесс сборки и развёртывания.",
      items: [
        { title: "Репозиторий и ветки", description: "Организуем работу с репозиторием GitHub: основная ветка и ветки для изменений." },
        { title: "Docker-образы", description: "Готовим Dockerfile для частей приложения и настраиваем их сборку." },
        { title: "Workflow GitHub Actions", description: "Описываем сборку и выпуск в workflow, который запускается по правилу проекта." },
        { title: "Развёртывание на VPS", description: "Настраиваем запуск контейнеров на сервере через Docker Compose и их обновление до новых образов." },
      ],
    },
    extras: {
      eyebrow: "Дополнительно",
      title: "Дополнительные работы — по согласованию",
      description: "Подключаем, если это нужно проекту. Объём и условия согласуем отдельно.",
      items: [
        { title: "Автоматические проверки", description: "Тесты, проверка типов и сборка до выпуска." },
        { title: "Миграции базы данных", description: "Применение миграций при обновлении." },
        { title: "Резервная копия перед миграциями", description: "Копия базы данных перед изменением её структуры." },
        { title: "Возврат к предыдущей версии", description: "Запуск предыдущих Docker-образов, сохранённых по версии, — вручную, по инструкции." },
        { title: "Проверка после запуска", description: "Проверка, что приложение отвечает после обновления." },
        { title: "Секреты и настройки", description: "Ключи и пароли хранятся в GitHub Secrets и на сервере, а не в коде." },
      ],
    },
    handover: {
      eyebrow: "Результат",
      title: "Что передаём заказчику",
      items: [
        { title: "Конфигурацию в репозитории", description: "Dockerfile, файлы Docker Compose и workflow GitHub Actions." },
        { title: "Описание процесса", description: "Как выпускается обновление и как запустить выпуск вручную, если это предусмотрено." },
        { title: "Перечень настроек", description: "Какие секреты и переменные окружения нужно задать — без их значений в описании." },
      ],
    },
    requestForm: {
      eyebrow: "Заявка",
      title: "Обсудить развёртывание",
      description: "Расскажите о проекте: новое это приложение или уже работающее, где хранится код и на каком сервере оно должно работать.",
      asideTitle: "Для существующего проекта",
      asideText: "Сначала изучаем инфраструктуру проекта, а объём и условия работ согласуем после этого.",
    },
    servicesCard: {
      eyebrow: "DevOps и CI/CD",
      title: "DevOps и CI/CD",
      description: "Автоматизация сборки и развёртывания сайтов, API и приложений на VPS",
      link: "Подробнее об услуге",
    },
    stage: {
      eyebrow: "Выпуск",
      title: "Сборка, развёртывание и обновления",
      link: "Подробнее о DevOps и CI/CD",
      website:
        "Серверную часть сайта и API собираем в Docker-образы и выпускаем на VPS через GitHub Actions — обновления проходят по согласованному процессу.",
      mobile: {
        backend: { title: "Backend и API", description: "Серверную часть собираем в Docker-образы и развёртываем на VPS через GitHub Actions." },
        client: {
          title: "Мобильное приложение",
          description: "Сборку и выпуск приложения в App Store и Google Play выполняем отдельно от развёртывания сервера.",
        },
      },
    },
  },
  kk: {
    seo: {
      title: "DevOps және CI/CD — VPS-те құрастыру және орналастыру | COMPNET",
      description:
        "Сайттарды, API мен қосымшаларды GitHub Actions, Docker және VPS арқылы құрастыру мен орналастыруды баптаймыз — жаңа қосымша үшін де, жұмыс істеп тұрған жоба үшін де.",
    },
    breadcrumb: { label: "Навигациялық тізбек", home: "Басты бет", services: "Қызметтер", current: "DevOps және CI/CD" },
    hero: {
      badge: "DevOps және CI/CD",
      title: "Қосымшаларды VPS-те құрастыру және орналастыру",
      description:
        "GitHub-тағы өзгерістер GitHub Actions арқылы Docker-бейнелерге құрастырылып, сіздің VPS-ке шығарылатын процесті баптаймыз — жаңа қосымша үшін де, жұмыс істеп тұрған жоба үшін де.",
      discuss: "Орналастыруды талқылау",
    },
    pipeline: {
      eyebrow: "Сызба",
      title: "Жаңарту қалай жеткізіледі",
      description: "Жоба үшін баптайтын негізгі процесс.",
      steps: [
        { title: "GitHub-тағы өзгерістер", description: "Код пен конфигурация репозиторийде сақталады, өзгерістер тармақтар арқылы енгізіледі." },
        { title: "GitHub Actions іске қосылуы", description: "Workflow жоба үшін келісілген шығару ережесі бойынша іске қосылады." },
        { title: "Docker-бейнені құрастыру", description: "Қосымша Docker-бейнеге құрастырылып, бейнелер тізіліміне сақталады." },
        { title: "VPS-ке орналастыру", description: "Сервер жаңа бейнелерді алып, қосымша контейнерлерін қайта іске қосады." },
      ],
      note:
        "Әр өзгеріс бірден жұмыс серверіне түспейді: шығару ережесін жоба үшін келісеміз — мысалы, тек негізгі тармаққа біріктірілгеннен кейін немесе қолмен іске қосу арқылы жариялау.",
    },
    scenarios: {
      eyebrow: "Сценарийлер",
      title: "Жаңа қосымша немесе жұмыс істеп тұрған жоба",
      items: [
        {
          title: "Жаңа қосымша",
          description: "Жаңартулар келісілген процесс бойынша шығуы үшін құрастыру мен орналастыруды әзірлеу барысында баптаймыз.",
        },
        {
          title: "Жұмыс істеп тұрған жоба",
          description:
            "Алдымен инфрақұрылымды зерттейміз: репозиторийді, серверді және қазіргі іске қосу тәсілін. Содан кейін нені баптау немесе жетілдіру керегін ұсынып, жұмыс көлемін келісеміз.",
        },
      ],
    },
    fit: {
      eyebrow: "Қандай жобаларға",
      title: "Қандай жобаларға сәйкес келеді",
      items: [
        { title: "Сайттар мен веб-қосымшалар", description: "Сіздің VPS-те жұмыс істейтін frontend пен серверлік бөлік." },
        { title: "Backend және API", description: "Сайттарға, веб-сервистерге және мобильді қосымшаларға арналған серверлік бөлік." },
        {
          title: "Мобильді қосымшалардың серверлік бөлігі",
          description: "VPS-тегі API мен backend. Қосымшаның өзін App Store мен Google Play-ге құрастыру және жариялау — бөлек процесс.",
        },
        { title: "Өз серверіндегі жобалар", description: "Қосымша сіздің VPS-те жұмыс істеуі керек болғанда." },
      ],
    },
    works: {
      eyebrow: "Жұмыстар",
      title: "Қандай жұмыстарды орындаймыз",
      description: "Құрастыру мен орналастырудың негізгі процесі.",
      items: [
        { title: "Репозиторий және тармақтар", description: "GitHub репозиторийімен жұмысты ұйымдастырамыз: негізгі тармақ және өзгерістерге арналған тармақтар." },
        { title: "Docker-бейнелер", description: "Қосымша бөліктеріне Dockerfile дайындап, оларды құрастыруды баптаймыз." },
        { title: "GitHub Actions workflow", description: "Құрастыру мен шығаруды жоба ережесі бойынша іске қосылатын workflow-да сипаттаймыз." },
        { title: "VPS-ке орналастыру", description: "Серверде контейнерлерді Docker Compose арқылы іске қосуды және оларды жаңа бейнелерге жаңартуды баптаймыз." },
      ],
    },
    extras: {
      eyebrow: "Қосымша",
      title: "Қосымша жұмыстар — келісім бойынша",
      description: "Жобаға қажет болса қосамыз. Көлемі мен шарттарын бөлек келісеміз.",
      items: [
        { title: "Автоматты тексерулер", description: "Шығаруға дейін тесттер, типтерді тексеру және құрастыру." },
        { title: "Дерекқор миграциялары", description: "Жаңарту кезінде миграцияларды қолдану." },
        { title: "Миграция алдындағы сақтық көшірме", description: "Дерекқор құрылымы өзгергенге дейінгі көшірмесі." },
        { title: "Алдыңғы нұсқаға қайту", description: "Нұсқасы бойынша сақталған алдыңғы Docker-бейнелерді іске қосу — қолмен, нұсқаулық бойынша." },
        { title: "Іске қосқаннан кейінгі тексеру", description: "Жаңартудан кейін қосымшаның жауап беретінін тексеру." },
        { title: "Құпиялар мен баптаулар", description: "Кілттер мен құпиясөздер кодта емес, GitHub Secrets-те және серверде сақталады." },
      ],
    },
    handover: {
      eyebrow: "Нәтиже",
      title: "Тапсырыс берушіге не тапсырамыз",
      items: [
        { title: "Репозиторийдегі конфигурация", description: "Dockerfile, Docker Compose файлдары және GitHub Actions workflow." },
        { title: "Процестің сипаттамасы", description: "Жаңарту қалай шығатыны және қарастырылған болса, шығаруды қолмен қалай іске қосу керегі." },
        { title: "Баптаулар тізімі", description: "Қандай құпиялар мен орта айнымалыларын беру керек — сипаттамада олардың мәндерінсіз." },
      ],
    },
    requestForm: {
      eyebrow: "Өтінім",
      title: "Орналастыруды талқылау",
      description: "Жоба туралы айтыңыз: бұл жаңа қосымша ма, әлде жұмыс істеп тұрған ба, код қайда сақталады және ол қандай серверде жұмыс істеуі керек.",
      asideTitle: "Жұмыс істеп тұрған жоба үшін",
      asideText: "Алдымен жобаның инфрақұрылымын зерттейміз, ал жұмыс көлемі мен шарттарын содан кейін келісеміз.",
    },
    servicesCard: {
      eyebrow: "DevOps және CI/CD",
      title: "DevOps және CI/CD",
      description: "Сайттарды, API мен қосымшаларды VPS-те құрастыру мен орналастыруды автоматтандыру",
      link: "Қызмет туралы толығырақ",
    },
    stage: {
      eyebrow: "Шығару",
      title: "Құрастыру, орналастыру және жаңартулар",
      link: "DevOps және CI/CD туралы толығырақ",
      website:
        "Сайт пен API-дің серверлік бөлігін Docker-бейнелерге құрастырып, GitHub Actions арқылы VPS-ке шығарамыз — жаңартулар келісілген процесс бойынша өтеді.",
      mobile: {
        backend: { title: "Backend және API", description: "Серверлік бөлікті Docker-бейнелерге құрастырып, GitHub Actions арқылы VPS-ке орналастырамыз." },
        client: {
          title: "Мобильді қосымша",
          description: "Қосымшаны App Store мен Google Play-ге құрастыру және шығару сервердегі орналастырудан бөлек орындалады.",
        },
      },
    },
  },
  en: {
    seo: {
      title: "DevOps and CI/CD — build and deployment to a VPS | COMPNET",
      description:
        "We set up building and deploying websites, APIs and apps with GitHub Actions, Docker and a VPS — for a new app or an existing project.",
    },
    breadcrumb: { label: "Breadcrumb", home: "Home", services: "Services", current: "DevOps and CI/CD" },
    hero: {
      badge: "DevOps and CI/CD",
      title: "Building and deploying apps to a VPS",
      description:
        "We set up a process in which changes from GitHub are built into Docker images by GitHub Actions and released to your VPS — for a new app or an existing project.",
      discuss: "Discuss deployment",
    },
    pipeline: {
      eyebrow: "Diagram",
      title: "How an update is delivered",
      description: "The basic process we set up for a project.",
      steps: [
        { title: "Changes in GitHub", description: "The code and configuration live in a repository; changes are made in branches." },
        { title: "GitHub Actions runs", description: "The workflow starts according to the release rule agreed for the project." },
        { title: "Docker image is built", description: "The app is built into a Docker image, stored in an image registry." },
        { title: "Deployment to the VPS", description: "The server pulls the new images and restarts the app's containers." },
      ],
      note:
        "Not every change goes straight to the production server: the release rule is agreed per project — for example, publishing only after a merge into the main branch or on a manual run.",
    },
    scenarios: {
      eyebrow: "Scenarios",
      title: "A new app or an existing project",
      items: [
        {
          title: "New app",
          description: "We set up building and deployment as part of development, so updates are released through an agreed process.",
        },
        {
          title: "Existing project",
          description:
            "First we study the infrastructure: the repository, the server and how the app is started today. Then we suggest what to set up or improve and agree on the scope.",
        },
      ],
    },
    fit: {
      eyebrow: "Which projects",
      title: "What projects it suits",
      items: [
        { title: "Websites and web apps", description: "A frontend and a server side running on your VPS." },
        { title: "Backend and APIs", description: "The server side for websites, web services and mobile apps." },
        {
          title: "The server side of mobile apps",
          description: "The API and backend on a VPS. Building and publishing the app itself in the App Store and Google Play is a separate process.",
        },
        { title: "Projects on your own server", description: "When the app has to run on your VPS." },
      ],
    },
    works: {
      eyebrow: "Work",
      title: "What we do",
      description: "The basic build and deployment process.",
      items: [
        { title: "Repository and branches", description: "We organise the GitHub repository: the main branch and branches for changes." },
        { title: "Docker images", description: "We write Dockerfiles for the parts of the app and set up their build." },
        { title: "GitHub Actions workflow", description: "We describe the build and release in a workflow that runs by the project's rule." },
        { title: "Deployment to the VPS", description: "We set up running the containers on the server with Docker Compose and updating them to new images." },
      ],
    },
    extras: {
      eyebrow: "Optional",
      title: "Additional work — by agreement",
      description: "Added when the project needs it. Scope and terms are agreed separately.",
      items: [
        { title: "Automated checks", description: "Tests, type checks and a build before the release." },
        { title: "Database migrations", description: "Applying migrations during an update." },
        { title: "Backup before migrations", description: "A copy of the database before its structure changes." },
        { title: "Return to a previous version", description: "Starting the previous Docker images, kept by version — manually, following instructions." },
        { title: "Check after start", description: "Checking that the app responds after an update." },
        { title: "Secrets and settings", description: "Keys and passwords are kept in GitHub Secrets and on the server, not in the code." },
      ],
    },
    handover: {
      eyebrow: "Result",
      title: "What we hand over",
      items: [
        { title: "Configuration in the repository", description: "Dockerfiles, Docker Compose files and the GitHub Actions workflow." },
        { title: "Process description", description: "How an update is released and how to start a release manually, if that is provided." },
        { title: "List of settings", description: "Which secrets and environment variables have to be set — without their values in the description." },
      ],
    },
    requestForm: {
      eyebrow: "Request",
      title: "Discuss deployment",
      description: "Tell us about the project: is it a new app or one already running, where is the code kept and which server should it run on.",
      asideTitle: "For an existing project",
      asideText: "We study the project's infrastructure first and agree on the scope and terms after that.",
    },
    servicesCard: {
      eyebrow: "DevOps and CI/CD",
      title: "DevOps and CI/CD",
      description: "Automating the build and deployment of websites, APIs and apps to a VPS",
      link: "More about the service",
    },
    stage: {
      eyebrow: "Release",
      title: "Build, deployment and updates",
      link: "More about DevOps and CI/CD",
      website:
        "We build the server side of the website and API into Docker images and release it to a VPS with GitHub Actions — updates go through an agreed process.",
      mobile: {
        backend: { title: "Backend and API", description: "We build the server side into Docker images and deploy it to a VPS with GitHub Actions." },
        client: {
          title: "Mobile app",
          description: "Building and releasing the app in the App Store and Google Play is done separately from deploying the server.",
        },
      },
    },
  },
};
