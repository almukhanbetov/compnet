import type { Locale } from "@/types/i18n";

interface PageMeta {
  title: string;
  description: string;
}

interface PlaceholderText {
  eyebrow: string;
  title: string;
  description: string;
}

interface LegalText {
  eyebrow: string;
  title: string;
  intro: string;
  sections: Array<{ heading: string; body: string }>;
}

/** Texts shared across pages: buttons, footer, placeholders, 404, SEO, legal pages. */
export interface CommonTranslations {
  toHome: string;
  discussProject: string;
  learnMore: string;
  serviceDetails: string;
  /** {n} is the step number. */
  step: string;
  themeToDark: string;
  themeToLight: string;
  openMenu: string;
  closeMenu: string;
  footer: {
    tagline: string;
    company: string;
    clients: string;
    legal: string;
    links: {
      services: string;
      solutions: string;
      about: string;
      portfolio: string;
      pricing: string;
      calculator: string;
      reviews: string;
      contacts: string;
      login: string;
      terms: string;
      privacy: string;
      cookies: string;
    };
  };
  placeholders: {
    about: PlaceholderText;
    solutions: PlaceholderText;
    reviews: PlaceholderText;
    login: PlaceholderText;
  };
  notFound: PlaceholderText;
  legalNotice: string;
  legal: { privacy: LegalText; terms: LegalText; cookies: LegalText };
  seo: {
    root: PageMeta;
    home: PageMeta;
    about: PageMeta;
    calculator: PageMeta;
    contact: PageMeta;
    cookies: PageMeta;
    login: PageMeta;
    portfolio: PageMeta;
    /** {title} is the case title. */
    portfolioCase: string;
    pricing: PageMeta;
    privacy: PageMeta;
    reviews: PageMeta;
    services: PageMeta;
    solutions: PageMeta;
    terms: PageMeta;
    notFound: PageMeta;
  };
}

export const commonTranslations: Record<Locale, CommonTranslations> = {
  ru: {
    toHome: "На главную",
    discussProject: "Обсудить проект",
    learnMore: "Подробнее",
    serviceDetails: "Подробнее об услуге",
    step: "Шаг {n}",
    themeToDark: "Включить тёмную тему",
    themeToLight: "Включить светлую тему",
    openMenu: "Открыть меню",
    closeMenu: "Закрыть меню",
    footer: {
      tagline: "IT-студия полного цикла: создаём сайты, web- и мобильные приложения, CRM и AI-решения для бизнеса.",
      company: "Компания",
      clients: "Клиентам",
      legal: "Правовая информация",
      links: {
        services: "Услуги",
        solutions: "Решения",
        about: "О компании",
        portfolio: "Портфолио",
        pricing: "Цены",
        calculator: "Калькулятор",
        reviews: "Отзывы",
        contacts: "Контакты",
        login: "Войти",
        terms: "Условия использования",
        privacy: "Конфиденциальность",
        cookies: "Cookie",
      },
    },
    placeholders: {
      about: {
        eyebrow: "О компании",
        title: "О компании",
        description: "COMPNET — IT-студия полного цикла: от идеи и дизайна до разработки, DevOps и технической поддержки.",
      },
      solutions: {
        eyebrow: "Решения",
        title: "Решения",
        description:
          "Готовые архитектурные решения для CRM-систем, маркетплейсов, систем бронирования и AI-автоматизации — адаптируем под задачи вашего бизнеса.",
      },
      reviews: {
        eyebrow: "Отзывы",
        title: "Отзывы клиентов",
        description: "Полная лента отзывов с фильтрами по категориям и рейтингу появится на следующем этапе прототипа.",
      },
      login: {
        eyebrow: "Вход",
        title: "Вход в аккаунт",
        description: "Настоящая форма авторизации подключится, когда в проекте появится backend.",
      },
    },
    notFound: {
      eyebrow: "Ошибка 404",
      title: "Страница не найдена",
      description: "Возможно, ссылка устарела или в адресе есть опечатка. Вернитесь на главную или выберите раздел в меню.",
    },
    legalNotice: "Демонстрационная версия документа. Перед публикацией требуется юридическая проверка.",
    legal: {
      privacy: {
        eyebrow: "Конфиденциальность",
        title: "Политика конфиденциальности",
        intro:
          "Мы уважаем конфиденциальность посетителей сайта. Ниже — демонстрационное описание того, какие данные и как мы бы обрабатывали в реальном продукте.",
        sections: [
          {
            heading: "Какие данные мы собираем",
            body: "Из формы заявки — имя, телефон, email и описание задачи; из чата — сообщения и контакт, который вы оставили сами. Аналитика посещений — только если вы её разрешили: случайный идентификатор браузера, просмотренные страницы (без параметров адреса), нажатия на телефон, WhatsApp, акцию и чат, источник перехода (UTM-метки или сайт, с которого вы пришли), тип устройства и язык сайта. В аналитику не попадают IP-адрес, содержимое форм, текст сообщений и контакты; местоположение не определяется.",
          },
          {
            heading: "Как мы используем данные",
            body: "Данные используются для связи с клиентом по заявке, подготовки коммерческого предложения и улучшения качества сервиса. Если аналитика разрешена, сохранённая заявка или первое сообщение в чате связываются с посещением по внутреннему номеру — так менеджер видит, какие страницы привели к обращению. Контакты при этом в аналитику не копируются.",
          },
          {
            heading: "Передача данных третьим лицам",
            body: "Мы не продаём и не передаём личные данные третьим лицам, за исключением случаев, предусмотренных законодательством.",
          },
          {
            heading: "Хранение и защита данных",
            body: "Данные хранятся в защищённом виде и удаляются по запросу пользователя или по истечении срока, необходимого для обработки заявки. Подробные данные аналитики посещений хранятся не более 90 дней и затем удаляются автоматически.",
          },
          {
            heading: "Права пользователя",
            body: "Вы можете запросить удаление, изменение или уточнение своих данных, написав нам на почту, указанную в разделе «Контакты».",
          },
        ],
      },
      terms: {
        eyebrow: "Условия использования",
        title: "Условия использования",
        intro:
          "Настоящие условия регулируют использование сайта и сервисов COMPNET. Ниже — демонстрационная структура документа для визуального прототипа.",
        sections: [
          {
            heading: "Общие положения",
            body: "Используя сайт COMPNET, вы соглашаетесь с условиями данного документа. Мы вправе обновлять условия по мере развития продукта — актуальная версия всегда доступна на этой странице.",
          },
          {
            heading: "Использование сайта",
            body: "Материалы сайта предназначены для ознакомления с услугами компании. Запрещено использовать сайт для действий, нарушающих законодательство или права третьих лиц.",
          },
          {
            heading: "Интеллектуальная собственность",
            body: "Тексты, дизайн, логотип и иные материалы сайта принадлежат COMPNET или используются с разрешения правообладателей. Копирование без согласия не допускается.",
          },
          {
            heading: "Ограничение ответственности",
            body: "COMPNET не несёт ответственности за косвенные убытки, возникшие в результате использования сайта. Информация на сайте предоставляется «как есть».",
          },
          {
            heading: "Изменение условий",
            body: "Мы можем время от времени обновлять данный документ. Продолжая пользоваться сайтом после изменений, вы принимаете обновлённые условия.",
          },
        ],
      },
      cookies: {
        eyebrow: "Cookie",
        title: "Политика использования Cookie",
        intro:
          "Cookie помогают сайту работать корректно и запоминать ваши настройки. Ниже — демонстрационное описание их использования.",
        sections: [
          {
            heading: "Что такое cookie",
            body: "Cookie — небольшие текстовые файлы, которые сайт сохраняет в браузере для запоминания настроек и повышения удобства использования.",
          },
          {
            heading: "Какие cookie мы используем",
            body: "Необходимые: язык сайта (cookie compnet-locale, 1 год), идентификатор чата (cookie compnet_chat, 90 дней — чтобы сохранялась переписка), тема оформления и ваш выбор по аналитике (локальное хранилище браузера). Аналитические — только после согласия: случайные идентификаторы браузера и сессии и первый источник перехода в локальном хранилище браузера. Если владелец сайта подключит Google Analytics 4, его cookie (_ga) тоже устанавливаются только после согласия.",
          },
          {
            heading: "Управление cookie",
            body: "Решение об аналитике можно изменить в любой момент по ссылке «Настройки cookie» внизу сайта; при отказе аналитические идентификаторы удаляются из браузера. Также можно очистить или заблокировать cookie в настройках браузера — это может ограничить часть функциональности, например сохранение темы или истории чата.",
          },
          {
            heading: "Согласие на использование cookie",
            body: "Необходимые cookie нужны для работы сайта и используются без отдельного согласия. Аналитика включается только после того, как вы нажмёте «Разрешить аналитику». Сайт, формы и чат работают одинаково и без согласия.",
          },
        ],
      },
    },
    seo: {
      root: { title: "COMPNET AI Platform", description: "Современная маркетинговая, торговая и клиентская платформа" },
      home: {
        title: "Разработка сайтов и мобильных приложений в Алматы | COMPNET",
        description:
          "Разработка сайтов, веб- и мобильных приложений, CRM и автоматизация бизнеса в Алматы и Казахстане. COMPNET: от проектирования до запуска и поддержки.",
      },
      about: {
        title: "О компании | COMPNET",
        description: "COMPNET — IT-студия полного цикла: от идеи и дизайна до разработки, DevOps и технической поддержки.",
      },
      calculator: {
        title: "Калькулятор стоимости | COMPNET",
        description:
          "Рассчитайте ориентировочную стоимость и сроки разработки сайта, web- или мобильного приложения с учётом модулей, дизайна и сложности.",
      },
      contact: {
        title: "Контакты и расчёт стоимости | COMPNET",
        description:
          "Оставьте заявку на сайт, web- или мобильное приложение, CRM либо AI-решение — получите ориентировочную стоимость и свяжитесь с COMPNET удобным способом.",
      },
      cookies: {
        title: "Политика использования Cookie | COMPNET",
        description: "Как COMPNET использует cookie и локальное хранилище браузера — демонстрационная версия документа.",
      },
      login: { title: "Вход в аккаунт | COMPNET", description: "Вход в личный кабинет COMPNET." },
      portfolio: {
        title: "Портфолио | COMPNET",
        description:
          "Реализованные проекты COMPNET — сайты, web- и мобильные приложения, CRM-системы и AI-решения с описанием задачи, процесса и результата.",
      },
      portfolioCase: "{title} | Портфолио COMPNET",
      pricing: {
        title: "Цены на разработку | COMPNET",
        description:
          "Ориентировочная стоимость разработки сайтов, web- и мобильных приложений, AI-решений, backend и поддержки в COMPNET.",
      },
      privacy: {
        title: "Политика конфиденциальности | COMPNET",
        description: "Политика конфиденциальности COMPNET — демонстрационная версия документа о работе с персональными данными.",
      },
      reviews: {
        title: "Отзывы клиентов | COMPNET",
        description: "Отзывы клиентов COMPNET о разработке сайтов, web- и мобильных приложений, CRM и AI-решений.",
      },
      services: {
        title: "Услуги | COMPNET",
        description: "Разработка сайтов, web- и мобильных приложений, AI-решений и автоматизации — полный цикл от идеи до поддержки.",
      },
      solutions: {
        title: "Решения | COMPNET",
        description: "Готовые архитектурные решения для CRM-систем, маркетплейсов, систем бронирования и AI-автоматизации от COMPNET.",
      },
      terms: {
        title: "Условия использования | COMPNET",
        description: "Условия использования сайта и сервисов COMPNET — демонстрационная версия документа.",
      },
      notFound: { title: "Страница не найдена | COMPNET", description: "Запрошенная страница не найдена." },
    },
  },

  kk: {
    toHome: "Басты бетке",
    discussProject: "Жобаны талқылау",
    learnMore: "Толығырақ",
    serviceDetails: "Қызмет туралы толығырақ",
    step: "{n}-қадам",
    themeToDark: "Қараңғы тақырыпты қосу",
    themeToLight: "Жарық тақырыпты қосу",
    openMenu: "Мәзірді ашу",
    closeMenu: "Мәзірді жабу",
    footer: {
      tagline: "Толық циклді IT-студия: бизнеске арналған сайттар, web және мобильді қосымшалар, CRM және ЖИ-шешімдер жасаймыз.",
      company: "Компания",
      clients: "Клиенттерге",
      legal: "Құқықтық ақпарат",
      links: {
        services: "Қызметтер",
        solutions: "Шешімдер",
        about: "Компания туралы",
        portfolio: "Портфолио",
        pricing: "Бағалар",
        calculator: "Есептегіш",
        reviews: "Пікірлер",
        contacts: "Байланыс",
        login: "Кіру",
        terms: "Пайдалану шарттары",
        privacy: "Құпиялылық",
        cookies: "Cookie",
      },
    },
    placeholders: {
      about: {
        eyebrow: "Компания туралы",
        title: "Компания туралы",
        description: "COMPNET — толық циклді IT-студия: идея мен дизайннан бастап әзірлеуге, DevOps пен техникалық қолдауға дейін.",
      },
      solutions: {
        eyebrow: "Шешімдер",
        title: "Шешімдер",
        description:
          "CRM-жүйелерге, маркетплейстерге, брондау жүйелеріне және ЖИ-автоматтандыруға арналған дайын архитектуралық шешімдер — бизнесіңіздің міндеттеріне бейімдейміз.",
      },
      reviews: {
        eyebrow: "Пікірлер",
        title: "Клиенттердің пікірлері",
        description: "Санаттар мен рейтинг бойынша сүзгілері бар толық пікірлер таспасы прототиптің келесі кезеңінде пайда болады.",
      },
      login: {
        eyebrow: "Кіру",
        title: "Аккаунтқа кіру",
        description: "Нақты авторизация формасы жобада backend пайда болғанда қосылады.",
      },
    },
    notFound: {
      eyebrow: "404 қатесі",
      title: "Бет табылмады",
      description: "Сілтеме ескірген немесе мекенжайда қате болуы мүмкін. Басты бетке оралыңыз немесе мәзірден бөлім таңдаңыз.",
    },
    legalNotice: "Құжаттың демонстрациялық нұсқасы. Жарияламас бұрын заңгерлік тексеру қажет.",
    legal: {
      privacy: {
        eyebrow: "Құпиялылық",
        title: "Құпиялылық саясаты",
        intro:
          "Біз сайтқа келушілердің құпиялылығын құрметтейміз. Төменде нақты өнімде қандай деректерді және қалай өңдейтініміздің демонстрациялық сипаттамасы берілген.",
        sections: [
          {
            heading: "Қандай деректер жинаймыз",
            body: "Өтінім формасынан — аты, телефон, email және тапсырма сипаттамасы; чаттан — хабарламалар және өзіңіз қалдырған байланыс. Келу аналитикасы — тек сіз рұқсат берсеңіз: браузердің кездейсоқ идентификаторы, қаралған беттер (мекенжай параметрлерінсіз), телефонды, WhatsApp-ты, акцияны және чатты басу, өту көзі (UTM-белгілер немесе сіз келген сайт), құрылғы түрі және сайт тілі. Аналитикаға IP-мекенжай, форма мазмұны, хабарлама мәтіні және байланыс деректері түспейді; орналасқан жер анықталмайды.",
          },
          {
            heading: "Деректерді қалай пайдаланамыз",
            body: "Деректер клиентпен өтінім бойынша байланысу, коммерциялық ұсыныс дайындау және қызмет сапасын жақсарту үшін пайдаланылады. Аналитикаға рұқсат берілсе, сақталған өтінім немесе чаттағы алғашқы хабарлама келумен ішкі нөмір арқылы байланыстырылады — менеджер қандай беттер өтінішке әкелгенін көреді. Байланыс деректері аналитикаға көшірілмейді.",
          },
          {
            heading: "Деректерді үшінші тұлғаларға беру",
            body: "Біз жеке деректерді сатпаймыз және заңнамада көзделген жағдайлардан басқа кезде үшінші тұлғаларға бермейміз.",
          },
          {
            heading: "Деректерді сақтау және қорғау",
            body: "Деректер қорғалған түрде сақталады және пайдаланушының сұрауы бойынша немесе өтінімді өңдеуге қажетті мерзім өткен соң жойылады. Келу аналитикасының толық деректері 90 күннен аспай сақталады, содан кейін автоматты түрде жойылады.",
          },
          {
            heading: "Пайдаланушының құқықтары",
            body: "«Байланыс» бөлімінде көрсетілген поштаға жазып, деректеріңізді жоюды, өзгертуді немесе нақтылауды сұрай аласыз.",
          },
        ],
      },
      terms: {
        eyebrow: "Пайдалану шарттары",
        title: "Пайдалану шарттары",
        intro:
          "Осы шарттар COMPNET сайты мен сервистерін пайдалануды реттейді. Төменде визуалды прототипке арналған құжаттың демонстрациялық құрылымы берілген.",
        sections: [
          {
            heading: "Жалпы ережелер",
            body: "COMPNET сайтын пайдалану арқылы сіз осы құжаттың шарттарымен келісесіз. Өнім дамыған сайын шарттарды жаңартуға құқылымыз — өзекті нұсқасы әрқашан осы бетте қолжетімді.",
          },
          {
            heading: "Сайтты пайдалану",
            body: "Сайт материалдары компанияның қызметтерімен танысуға арналған. Сайтты заңнаманы немесе үшінші тұлғалардың құқықтарын бұзатын әрекеттер үшін пайдалануға тыйым салынады.",
          },
          {
            heading: "Зияткерлік меншік",
            body: "Сайттағы мәтіндер, дизайн, логотип және өзге материалдар COMPNET-ке тиесілі немесе құқық иелерінің рұқсатымен пайдаланылады. Келісімсіз көшіруге жол берілмейді.",
          },
          {
            heading: "Жауапкершілікті шектеу",
            body: "COMPNET сайтты пайдалану нәтижесінде туындаған жанама шығындар үшін жауап бермейді. Сайттағы ақпарат «сол күйінде» ұсынылады.",
          },
          {
            heading: "Шарттарды өзгерту",
            body: "Біз осы құжатты мезгіл-мезгіл жаңартып отыруымыз мүмкін. Өзгерістерден кейін сайтты пайдалануды жалғастыра отырып, сіз жаңартылған шарттарды қабылдайсыз.",
          },
        ],
      },
      cookies: {
        eyebrow: "Cookie",
        title: "Cookie пайдалану саясаты",
        intro:
          "Cookie сайттың дұрыс жұмыс істеуіне және баптауларыңызды есте сақтауға көмектеседі. Төменде оларды пайдаланудың демонстрациялық сипаттамасы берілген.",
        sections: [
          {
            heading: "Cookie деген не",
            body: "Cookie — сайт баптауларды есте сақтау және пайдалану ыңғайлылығын арттыру үшін браузерде сақтайтын шағын мәтіндік файлдар.",
          },
          {
            heading: "Қандай cookie пайдаланамыз",
            body: "Қажеттілері: сайт тілі (compnet-locale cookie, 1 жыл), чат идентификаторы (compnet_chat cookie, 90 күн — хат алмасу сақталуы үшін), безендіру тақырыбы және аналитика бойынша таңдауыңыз (браузердің жергілікті жадында). Аналитикалық — тек келісімнен кейін: браузер мен сессияның кездейсоқ идентификаторлары және алғашқы өту көзі браузердің жергілікті жадында. Егер сайт иесі Google Analytics 4 қосса, оның cookie-лері (_ga) де тек келісімнен кейін орнатылады.",
          },
          {
            heading: "Cookie басқару",
            body: "Аналитика бойынша шешімді сайттың төменгі жағындағы «Cookie баптаулары» сілтемесі арқылы кез келген уақытта өзгертуге болады; бас тартқанда аналитикалық идентификаторлар браузерден жойылады. Cookie-ді браузер баптауларында тазалауға немесе бұғаттауға да болады — бұл кейбір функцияларды, мысалы, тақырыпты немесе чат тарихын сақтауды шектеуі мүмкін.",
          },
          {
            heading: "Cookie пайдалануға келісім",
            body: "Қажетті cookie-лер сайттың жұмысы үшін керек және жеке келісімсіз пайдаланылады. Аналитика тек сіз «Аналитикаға рұқсат беру» батырмасын басқаннан кейін қосылады. Сайт, формалар мен чат келісімсіз де бірдей жұмыс істейді.",
          },
        ],
      },
    },
    seo: {
      root: { title: "COMPNET AI Platform", description: "Заманауи маркетингтік, сауда және клиенттік платформа" },
      home: {
        title: "Алматыда сайттар мен мобильді қосымшалар әзірлеу | COMPNET",
        description:
          "Алматы мен Қазақстанда сайттар, веб және мобильді қосымшалар, CRM әзірлеу және бизнесті автоматтандыру. COMPNET: жобалаудан бастап іске қосу мен қолдауға дейін.",
      },
      about: {
        title: "Компания туралы | COMPNET",
        description: "COMPNET — толық циклді IT-студия: идея мен дизайннан бастап әзірлеуге, DevOps пен техникалық қолдауға дейін.",
      },
      calculator: {
        title: "Құн есептегіші | COMPNET",
        description:
          "Модульдерді, дизайнды және күрделілікті ескере отырып, сайт, web немесе мобильді қосымша әзірлеудің болжамды құны мен мерзімін есептеңіз.",
      },
      contact: {
        title: "Байланыс және құнды есептеу | COMPNET",
        description:
          "Сайтқа, web немесе мобильді қосымшаға, CRM-ге не ЖИ-шешімге өтінім қалдырыңыз — болжамды құнын біліп, COMPNET-пен ыңғайлы тәсілмен байланысыңыз.",
      },
      cookies: {
        title: "Cookie пайдалану саясаты | COMPNET",
        description: "COMPNET cookie мен браузердің жергілікті жадын қалай пайдаланады — құжаттың демонстрациялық нұсқасы.",
      },
      login: { title: "Аккаунтқа кіру | COMPNET", description: "COMPNET жеке кабинетіне кіру." },
      portfolio: {
        title: "Портфолио | COMPNET",
        description:
          "COMPNET жүзеге асырған жобалар — сайттар, web және мобильді қосымшалар, CRM-жүйелер мен ЖИ-шешімдер: міндет, процесс және нәтиже.",
      },
      portfolioCase: "{title} | COMPNET портфолиосы",
      pricing: {
        title: "Әзірлеу бағалары | COMPNET",
        description:
          "COMPNET-те сайттарды, web және мобильді қосымшаларды, ЖИ-шешімдерді, backend пен қолдауды әзірлеудің болжамды құны.",
      },
      privacy: {
        title: "Құпиялылық саясаты | COMPNET",
        description: "COMPNET құпиялылық саясаты — дербес деректермен жұмыс туралы құжаттың демонстрациялық нұсқасы.",
      },
      reviews: {
        title: "Клиенттердің пікірлері | COMPNET",
        description: "Сайттарды, web және мобильді қосымшаларды, CRM мен ЖИ-шешімдерді әзірлеу туралы COMPNET клиенттерінің пікірлері.",
      },
      services: {
        title: "Қызметтер | COMPNET",
        description: "Сайттарды, web және мобильді қосымшаларды, ЖИ-шешімдер мен автоматтандыруды әзірлеу — идеядан қолдауға дейінгі толық цикл.",
      },
      solutions: {
        title: "Шешімдер | COMPNET",
        description: "COMPNET-тің CRM-жүйелерге, маркетплейстерге, брондау жүйелеріне және ЖИ-автоматтандыруға арналған дайын архитектуралық шешімдері.",
      },
      terms: {
        title: "Пайдалану шарттары | COMPNET",
        description: "COMPNET сайты мен сервистерін пайдалану шарттары — құжаттың демонстрациялық нұсқасы.",
      },
      notFound: { title: "Бет табылмады | COMPNET", description: "Сұралған бет табылмады." },
    },
  },

  en: {
    toHome: "Back to home",
    discussProject: "Discuss a project",
    learnMore: "Learn more",
    serviceDetails: "More about the service",
    step: "Step {n}",
    themeToDark: "Switch to dark theme",
    themeToLight: "Switch to light theme",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    footer: {
      tagline: "A full-cycle IT studio: we build websites, web and mobile apps, CRMs and AI solutions for businesses.",
      company: "Company",
      clients: "For clients",
      legal: "Legal",
      links: {
        services: "Services",
        solutions: "Solutions",
        about: "About",
        portfolio: "Portfolio",
        pricing: "Pricing",
        calculator: "Calculator",
        reviews: "Reviews",
        contacts: "Contacts",
        login: "Log In",
        terms: "Terms of use",
        privacy: "Privacy",
        cookies: "Cookies",
      },
    },
    placeholders: {
      about: {
        eyebrow: "About",
        title: "About us",
        description: "COMPNET is a full-cycle IT studio: from idea and design to development, DevOps and technical support.",
      },
      solutions: {
        eyebrow: "Solutions",
        title: "Solutions",
        description:
          "Ready-made architectures for CRM systems, marketplaces, booking systems and AI automation, adapted to your business needs.",
      },
      reviews: {
        eyebrow: "Reviews",
        title: "Client reviews",
        description: "A full review feed with category and rating filters will appear in the next stage of the prototype.",
      },
      login: {
        eyebrow: "Log In",
        title: "Log in to your account",
        description: "The real sign-in form will be connected once the project has a backend for it.",
      },
    },
    notFound: {
      eyebrow: "Error 404",
      title: "Page not found",
      description: "The link may be outdated or the address may contain a typo. Go back to the home page or choose a section in the menu.",
    },
    legalNotice: "This is a demo version of the document. A legal review is required before publication.",
    legal: {
      privacy: {
        eyebrow: "Privacy",
        title: "Privacy policy",
        intro:
          "We respect the privacy of our visitors. Below is a demo description of what data we would process in a real product, and how.",
        sections: [
          {
            heading: "What data we collect",
            body: "From the request form — your name, phone number, email and task description; from the chat — the messages and any contact you chose to leave. Visit analytics only if you allowed them: a random browser identifier, the pages you viewed (without URL parameters), clicks on the phone number, WhatsApp, the promo and the chat, where you came from (UTM tags or the referring site), device type and site language. Analytics never include your IP address, form contents, message text or contacts; your location is not determined.",
          },
          {
            heading: "How we use the data",
            body: "The data is used to contact you about your request, prepare a commercial proposal and improve the quality of our service. If analytics are allowed, a saved request or a first chat message is linked to the visit by an internal number, so a manager can see which pages led to the inquiry. Contacts are not copied into the analytics.",
          },
          {
            heading: "Sharing data with third parties",
            body: "We do not sell or share personal data with third parties, except as required by law.",
          },
          {
            heading: "Storing and protecting data",
            body: "Data is stored securely and deleted at the user's request or once it is no longer needed to process the request. Detailed visit analytics are kept for at most 90 days and then deleted automatically.",
          },
          {
            heading: "Your rights",
            body: "You can ask us to delete, change or clarify your data by writing to the email address listed in the “Contacts” section.",
          },
        ],
      },
      terms: {
        eyebrow: "Terms of use",
        title: "Terms of use",
        intro:
          "These terms govern the use of the COMPNET website and services. Below is a demo structure of the document for the visual prototype.",
        sections: [
          {
            heading: "General provisions",
            body: "By using the COMPNET website, you agree to the terms of this document. We may update the terms as the product evolves; the current version is always available on this page.",
          },
          {
            heading: "Use of the website",
            body: "The website materials are intended to introduce the company's services. Using the website for actions that violate the law or the rights of third parties is prohibited.",
          },
          {
            heading: "Intellectual property",
            body: "The texts, design, logo and other materials on the website belong to COMPNET or are used with the permission of their owners. Copying without consent is not allowed.",
          },
          {
            heading: "Limitation of liability",
            body: "COMPNET is not liable for indirect losses arising from the use of the website. The information on the website is provided “as is”.",
          },
          {
            heading: "Changes to the terms",
            body: "We may update this document from time to time. By continuing to use the website after changes, you accept the updated terms.",
          },
        ],
      },
      cookies: {
        eyebrow: "Cookies",
        title: "Cookie policy",
        intro: "Cookies help the website work correctly and remember your settings. Below is a demo description of how they are used.",
        sections: [
          {
            heading: "What cookies are",
            body: "Cookies are small text files that a website stores in your browser to remember settings and make it more convenient to use.",
          },
          {
            heading: "Which cookies we use",
            body: "Necessary: the site language (cookie compnet-locale, 1 year), the chat identifier (cookie compnet_chat, 90 days, so your conversation is kept), the colour theme and your analytics choice (browser local storage). Analytics, only after consent: random browser and session identifiers and the first referral source in the browser's local storage. If the site owner enables Google Analytics 4, its cookies (_ga) are also set only after consent.",
          },
          {
            heading: "Managing cookies",
            body: "You can change your analytics choice at any time with the “Cookie settings” link at the bottom of the site; declining removes the analytics identifiers from your browser. You can also clear or block cookies in your browser settings, which may limit some features, such as remembering the theme or the chat history.",
          },
          {
            heading: "Consent to cookies",
            body: "Necessary cookies are required for the site to work and are used without separate consent. Analytics are turned on only after you click “Allow analytics”. The site, forms and chat work the same without consent.",
          },
        ],
      },
    },
    seo: {
      root: { title: "COMPNET AI Platform", description: "A modern marketing, commerce and customer platform" },
      home: {
        title: "Website and mobile app development in Almaty | COMPNET",
        description:
          "Development of websites, web and mobile apps, CRM and business automation in Almaty and Kazakhstan. COMPNET: from design to launch and support.",
      },
      about: {
        title: "About | COMPNET",
        description: "COMPNET is a full-cycle IT studio: from idea and design to development, DevOps and technical support.",
      },
      calculator: {
        title: "Cost calculator | COMPNET",
        description:
          "Estimate the cost and timeline of a website, web or mobile app, taking into account modules, design and complexity.",
      },
      contact: {
        title: "Contacts and cost estimate | COMPNET",
        description:
          "Send a request for a website, web or mobile app, CRM or AI solution, get an estimated cost and contact COMPNET in the way that suits you.",
      },
      cookies: {
        title: "Cookie policy | COMPNET",
        description: "How COMPNET uses cookies and the browser's local storage — a demo version of the document.",
      },
      login: { title: "Log in | COMPNET", description: "Log in to your COMPNET account." },
      portfolio: {
        title: "Portfolio | COMPNET",
        description:
          "Projects delivered by COMPNET — websites, web and mobile apps, CRM systems and AI solutions, with the task, process and result.",
      },
      portfolioCase: "{title} | COMPNET portfolio",
      pricing: {
        title: "Development pricing | COMPNET",
        description:
          "Estimated cost of developing websites, web and mobile apps, AI solutions, backend and support at COMPNET.",
      },
      privacy: {
        title: "Privacy policy | COMPNET",
        description: "COMPNET privacy policy — a demo version of the document on handling personal data.",
      },
      reviews: {
        title: "Client reviews | COMPNET",
        description: "What COMPNET clients say about our websites, web and mobile apps, CRMs and AI solutions.",
      },
      services: {
        title: "Services | COMPNET",
        description: "Development of websites, web and mobile apps, AI solutions and automation — the full cycle from idea to support.",
      },
      solutions: {
        title: "Solutions | COMPNET",
        description: "Ready-made architectures from COMPNET for CRM systems, marketplaces, booking systems and AI automation.",
      },
      terms: {
        title: "Terms of use | COMPNET",
        description: "Terms of use of the COMPNET website and services — a demo version of the document.",
      },
      notFound: { title: "Page not found | COMPNET", description: "The requested page was not found." },
    },
  },
};
