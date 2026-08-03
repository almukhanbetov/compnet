-- +goose Up
CREATE TABLE services_overview (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug         TEXT NOT NULL UNIQUE,
    title        TEXT NOT NULL,
    description  TEXT NOT NULL,
    features     TEXT[] NOT NULL DEFAULT '{}',
    icon         TEXT NOT NULL,
    sort_order   INTEGER NOT NULL DEFAULT 0,
    published_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_services_overview_sort ON services_overview (sort_order);

CREATE TABLE service_details (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug         TEXT NOT NULL UNIQUE REFERENCES services_overview(slug) ON DELETE CASCADE,
    eyebrow      TEXT NOT NULL,
    title        TEXT NOT NULL,
    description  TEXT NOT NULL,
    points       TEXT[] NOT NULL DEFAULT '{}',
    highlights   JSONB NOT NULL DEFAULT '[]',
    published_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE pricing_cards (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_type TEXT NOT NULL UNIQUE,
    description  TEXT NOT NULL,
    features     TEXT[] NOT NULL DEFAULT '{}',
    service_href TEXT NOT NULL DEFAULT '/services',
    sort_order   INTEGER NOT NULL DEFAULT 0,
    published_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pricing_cards_sort ON pricing_cards (sort_order);

-- project_type is not a foreign key: the price/duration/label catalog lives
-- in the Go binary (internal/pricing), not in PostgreSQL, so the calculator
-- and this content table can never disagree on a price.
CREATE TABLE portfolio_cases (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug           TEXT NOT NULL UNIQUE,
    title          TEXT NOT NULL,
    category       TEXT NOT NULL,
    subcategory    TEXT,
    summary        TEXT NOT NULL,
    task           TEXT NOT NULL,
    process        TEXT[] NOT NULL DEFAULT '{}',
    solution       TEXT NOT NULL,
    technologies   TEXT[] NOT NULL DEFAULT '{}',
    result         TEXT NOT NULL,
    duration       TEXT NOT NULL,
    gradient_from  TEXT NOT NULL,
    gradient_to    TEXT NOT NULL,
    screenshot_url TEXT,
    external_url   TEXT,
    sort_order     INTEGER NOT NULL DEFAULT 0,
    published_at   TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_portfolio_cases_sort ON portfolio_cases (sort_order);
CREATE INDEX idx_portfolio_cases_category ON portfolio_cases (category);

CREATE TABLE testimonials (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name         TEXT NOT NULL,
    role         TEXT NOT NULL,
    company      TEXT NOT NULL,
    quote        TEXT NOT NULL,
    rating       SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    initials     TEXT NOT NULL,
    sort_order   INTEGER NOT NULL DEFAULT 0,
    published_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_testimonials_sort ON testimonials (sort_order);

-- Seed data: the current static content from frontend/data/*.ts, moved
-- verbatim so the site's visible content does not change.

INSERT INTO services_overview (slug, title, description, features, icon, sort_order, published_at) VALUES
('web-development', 'Разработка сайтов',
 'Лендинги, визитки, корпоративные сайты и интернет-магазины под ключ.',
 ARRAY['Адаптивная вёрстка', 'SEO-структура', 'CMS для самостоятельного редактирования'],
 'Globe', 1, now()),
('web-apps', 'Web-приложения',
 'Сервисы с собственной бизнес-логикой — CRM, личные кабинеты, платформы.',
 ARRAY['Индивидуальная архитектура', 'Личный кабинет или админ-панель', 'Интеграции с внешними системами'],
 'AppWindow', 2, now()),
('mobile-apps', 'Мобильные приложения',
 'Приложения для iOS и Android с публикацией в сторах.',
 ARRAY['Нативная и кроссплатформенная разработка', 'Push-уведомления', 'Интеграция с backend'],
 'Smartphone', 3, now()),
('ai-automation', 'AI и автоматизация',
 'Чат-боты и автоматизация рутинных бизнес-процессов.',
 ARRAY['AI чат-боты', 'Автоматизация процессов', 'Интеграция AI-моделей'],
 'Bot', 4, now());

INSERT INTO service_details (slug, eyebrow, title, description, points, highlights, published_at) VALUES
('web-development', 'Разработка сайтов', 'Сайты, которые работают на результат',
 'Создаём сайты, которые быстро загружаются, корректно работают на любых устройствах и легко находятся в поиске.',
 ARRAY['Лендинги и сайты-визитки', 'Корпоративные сайты и каталоги', 'Интернет-магазины для заказчиков', 'SEO-структура и семантическая вёрстка'],
 '[{"icon":"LayoutTemplate","label":"Адаптивная вёрстка"},{"icon":"Search","label":"SEO-оптимизация"},{"icon":"Gauge","label":"Высокая скорость"}]'::jsonb,
 now()),
('web-apps', 'Web-приложения', 'Сервисы с реальной бизнес-логикой',
 'Разрабатываем web-сервисы с полноценной бизнес-логикой — от CRM до многосторонних платформ.',
 ARRAY['CRM-системы для учёта клиентов и сделок', 'Личные кабинеты и пользовательские панели', 'Системы бронирования и расписания', 'Маркетплейсы для заказчиков'],
 '[{"icon":"Users","label":"CRM и клиенты"},{"icon":"UserCircle","label":"Личные кабинеты"},{"icon":"Store","label":"Маркетплейсы"}]'::jsonb,
 now()),
('mobile-apps', 'Мобильные приложения', 'От идеи до публикации в сторах',
 'Создаём мобильные приложения для iOS и Android — с нативной или кроссплатформенной разработкой.',
 ARRAY['Нативные и кроссплатформенные приложения', 'Push-уведомления и офлайн-режим', 'Интеграция с backend и API', 'Публикация в App Store и Google Play'],
 '[{"icon":"Smartphone","label":"iOS и Android"},{"icon":"Bell","label":"Push-уведомления"},{"icon":"RefreshCcw","label":"Кроссплатформенность"}]'::jsonb,
 now()),
('ai-automation', 'AI и автоматизация', 'Автоматизируем рутину с помощью AI',
 'Внедряем AI-решения и автоматизацию, чтобы бизнес-процессы работали быстрее и без ручного труда.',
 ARRAY['Чат-боты для сайта и мессенджеров', 'Автоматизация рутинных бизнес-процессов', 'Интеграция AI-моделей в продукт', 'Аналитика и рекомендательные системы'],
 '[{"icon":"Bot","label":"AI чат-боты"},{"icon":"Workflow","label":"Автоматизация процессов"},{"icon":"Sparkles","label":"AI-интеграции"}]'::jsonb,
 now());

INSERT INTO pricing_cards (project_type, description, features, service_href, sort_order, published_at) VALUES
('landing', 'Одностраничный сайт для запуска продукта, услуги или рекламной кампании.',
 ARRAY['До 5 экранов', 'Адаптивная вёрстка', 'Форма заявки', 'Базовая SEO-настройка'], '/services', 1, now()),
('business-card', 'Компактное представительство компании или специалиста в интернете.',
 ARRAY['До 5 страниц', 'Адаптивная вёрстка', 'Контакты и карта проезда', 'Базовая SEO-настройка'], '/services', 2, now()),
('corporate', 'Многостраничный сайт с разделами о компании, услугах и новостях.',
 ARRAY['До 15 страниц', 'CMS для самостоятельного редактирования', 'Мультиязычность', 'SEO-структура', 'Интеграция с аналитикой'], '/services', 3, now()),
('catalog', 'Многостраничный каталог товаров или услуг без онлайн-оплаты — с фильтрами и карточками позиций.',
 ARRAY['До 30 карточек товаров/услуг', 'Фильтры и поиск по каталогу', 'Адаптивная вёрстка', 'Базовая SEO-настройка'], '/services', 4, now()),
('online-store', 'E-commerce решение — от каталога и корзины до приёма онлайн-оплаты.',
 ARRAY['Каталог с карточками позиций', 'Оформление покупки и онлайн-оплата', 'Личный кабинет клиента', 'Админ-панель для управления', 'Интеграция с доставкой'], '/services', 5, now()),
('web-app', 'Индивидуальный web-сервис с собственной бизнес-логикой — личный кабинет или платформа.',
 ARRAY['Индивидуальная архитектура', 'Личный кабинет или админ-панель', 'Интеграции с внешними системами', 'API для мобильных клиентов'], '/services', 6, now()),
('crm', 'Учёт клиентов, сделок и задач с ролями пользователей — под процессы вашей команды.',
 ARRAY['Карточки клиентов и сделок', 'Воронка продаж', 'Роли и права доступа', 'Уведомления и напоминания'], '/services', 7, now()),
('mobile-app', 'Приложение для iOS и Android с публикацией в сторах.',
 ARRAY['Нативная или кроссплатформенная разработка', 'Push-уведомления', 'Интеграция с backend', 'Публикация в App Store и Google Play'], '/services', 8, now()),
('ai-solution', 'Чат-бот, автоматизация процессов или интеграция AI-модели в продукт.',
 ARRAY['Чат-бот для сайта или мессенджера', 'Автоматизация рутинных процессов', 'Интеграция AI-модели', 'Аналитика и рекомендации'], '/services', 9, now()),
('backend-api', 'Серверная часть и API для веб- и мобильных клиентов — авторизация, бизнес-логика, интеграции.',
 ARRAY['REST или GraphQL API', 'Авторизация и роли пользователей', 'Интеграция с внешними сервисами', 'Документация API'], '/services', 10, now()),
('devops-vps', 'Настройка серверной инфраструктуры, CI/CD и сопровождение проекта после запуска.',
 ARRAY['Настройка VPS и окружения', 'CI/CD пайплайны', 'Мониторинг и бэкапы', 'Техническая поддержка'], '/services', 11, now());

INSERT INTO portfolio_cases (slug, title, category, subcategory, summary, task, process, solution, technologies, result, duration, gradient_from, gradient_to, screenshot_url, external_url, sort_order, published_at) VALUES
('bastas-stone-catalog', 'BASTAS — каталог натурального камня', 'Сайты', 'Каталог',
 'Корпоративный сайт компании по обработке и продаже натурального камня с каталогом материалов и калькулятором стоимости.',
 'Создать современный сайт компании по обработке и продаже натурального камня. Показать каталог материалов и изделий, услуги компании, преимущества, контакты и предоставить клиенту возможность предварительно рассчитать стоимость заказа.',
 ARRAY['Анализ услуг компании', 'Проектирование структуры', 'Создание дизайна', 'Разработка каталога и калькулятора', 'Адаптация под мобильные устройства', 'SEO-настройка и запуск'],
 'Разработан адаптивный корпоративный сайт с каталогом камня, страницами изделий, информацией о компании и калькулятором стоимости. Структура сайта упрощает поиск материалов и помогает клиенту перейти от выбора камня к заявке.',
 ARRAY['Next.js', 'TypeScript', 'адаптивная вёрстка', 'Docker', 'Nginx', 'SEO'],
 'Компания получила современную онлайн-витрину с каталогом продукции, калькулятором стоимости и удобным способом отправки заявки.',
 'Около 5 недель', 'from-rose-600/40', 'to-stone-500/30', '/portfolio/bastas-stone-catalog.jpg', 'https://bastas.kz', 1, now()),
('avtobirzhasi-car-marketplace', 'Автобиржа — автомобильный маркетплейс', 'Web-приложения', 'Marketplace',
 'Платформа автомобильных объявлений с механикой сближения цены продавца и покупателя.',
 'Создать платформу автомобильных объявлений с необычной механикой: цена продавца постепенно снижается, цена покупателя повышается, а система формирует совпадение при сближении условий сделки.',
 ARRAY['Проработка бизнес-логики', 'Проектирование интерфейса', 'Создание каталога и карточки автомобиля', 'Разработка механики совпадений', 'Подключение backend API и базы данных', 'Контейнеризация и развёртывание'],
 'Разработан современный автомобильный маркетплейс с каталогом автомобилей, фильтрами, карточками объявлений, личным кабинетом, уведомлениями и визуализацией механики схождения цен покупателя и продавца.',
 ARRAY['Next.js', 'TypeScript', 'Go', 'Gin', 'PostgreSQL', 'Docker', 'REST API', 'Caddy или Nginx'],
 'Создана основа полноценного автомобильного маркетплейса с уникальной механикой поиска выгодной цены для покупателя и продавца.',
 'Около 10–12 недель', 'from-blue-600/40', 'to-slate-700/30', '/portfolio/avtobirzhasi-car-marketplace.jpg', 'https://avtobirzhasi.kz', 2, now()),
('mereytoi-event-agency', 'MEREYTOI — сервис организации мероприятий', 'Сайты', 'Сервис',
 'Презентационный сайт агентства по организации мероприятий с галереей и формой заявки.',
 'Создать презентационный сайт для услуг по организации мероприятий, на котором посетитель сможет ознакомиться с направлениями работы, примерами оформления и быстро связаться с компанией.',
 ARRAY['Анализ аудитории', 'Разработка структуры', 'Создание визуального стиля', 'Вёрстка основных страниц', 'Адаптация', 'Подключение формы обращения', 'Публикация'],
 'Создан адаптивный сайт с выразительной главной страницей, блоками услуг, преимуществами, галереей и понятными призывами к действию. Интерфейс ориентирован на быстрое знакомство с услугами и отправку заявки.',
 ARRAY['Современный frontend', 'адаптивная вёрстка', 'Docker', 'Nginx', 'HTTPS'],
 'Услуги компании представлены в едином современном интерфейсе, а посетитель может быстро перейти к обсуждению мероприятия.',
 'Около 4–6 недель', 'from-amber-600/40', 'to-rose-700/30', '/portfolio/mereytoi-event-agency.jpg', 'https://mereytoi.kz', 3, now()),
('ddldecor-interior-design', 'DDL Decor — дизайн и декор интерьеров', 'Сайты', 'Портфолио',
 'Визуальный сайт студии дизайна и декора с портфолио выполненных проектов.',
 'Создать визуальный сайт для компании в сфере дизайна и декора, показать направления работы, выполненные проекты и сформировать доверие к бренду.',
 ARRAY['Сбор материалов', 'Формирование структуры', 'Разработка визуальной концепции', 'Создание страниц услуг и портфолио', 'Адаптивная вёрстка', 'Тестирование и запуск'],
 'Разработан современный сайт с акцентом на крупные изображения, портфолио, услуги и контактные действия. Дизайн подчёркивает визуальную составляющую работ и не отвлекает от фотографий проектов.',
 ARRAY['Современный frontend', 'адаптивная вёрстка', 'оптимизация изображений', 'Docker', 'HTTPS'],
 'Компания получила аккуратное цифровое портфолио, которое помогает демонстрировать проекты и принимать обращения от потенциальных клиентов.',
 'Около 4–5 недель', 'from-orange-600/30', 'to-stone-600/30', '/portfolio/ddldecor-interior-design.jpg', 'https://ddldecor.kz', 4, now()),
('edu-zhso-education-platform', 'EDU ZHSO — образовательная платформа', 'Сайты', 'Образовательный сайт',
 'Сайт учебного центра с разделами по программам, направлениям обучения и контактами.',
 'Создать понятный сайт образовательной организации, представить программы, направления обучения, информацию для учащихся и способы связи.',
 ARRAY['Анализ информационной структуры', 'Проектирование разделов', 'Разработка интерфейса', 'Наполнение образовательным контентом', 'Адаптация', 'Тестирование', 'Запуск'],
 'Разработана структурированная образовательная платформа с понятной навигацией, информационными разделами, материалами о программах и адаптивным отображением на мобильных устройствах.',
 ARRAY['Web-разработка', 'адаптивная вёрстка', 'CMS или современный frontend', 'HTTPS'],
 'Посетители получили единый источник информации об образовательных программах, условиях обучения и деятельности организации.',
 'Около 5–7 недель', 'from-sky-700/40', 'to-blue-900/30', '/portfolio/edu-zhso-education-platform.jpg', 'https://edu-zhso.kz', 5, now()),
('parasat-center-education', 'Parasat Center — образовательный центр', 'Сайты', 'Образование',
 'Сайт образовательного центра с описанием курсов и направлений для учащихся и родителей.',
 'Разработать сайт образовательного центра, который понятно представляет курсы и направления, помогает родителям и учащимся выбрать программу и связаться с администрацией.',
 ARRAY['Изучение услуг центра', 'Разработка структуры', 'Создание дизайна', 'Вёрстка страниц', 'Адаптация под разные устройства', 'Тестирование формы и ссылок', 'Публикация'],
 'Создан современный адаптивный сайт с описанием образовательных направлений, преимуществами центра, информационными блоками и заметными кнопками для обращения.',
 ARRAY['Современный frontend', 'адаптивная вёрстка', 'оптимизация производительности', 'Docker', 'HTTPS'],
 'Образовательный центр получил удобную онлайн-презентацию, которая систематизирует информацию о программах и облегчает первичное обращение.',
 'Около 4–6 недель', 'from-emerald-700/40', 'to-teal-800/30', '/portfolio/parasat-center-education.jpg', 'https://parasatcenter.kz', 6, now());

INSERT INTO testimonials (name, role, company, quote, rating, initials, sort_order, published_at) VALUES
('Айгерим Смагулова', 'IT-директор', 'NovaTech',
 'COMPNET разработали для нас корпоративный сайт за шесть недель — уложились в срок и учли все правки без лишних созвонов.',
 5, 'АС', 1, now()),
('Данияр Ахметов', 'Основатель', 'ByteCraft Studio',
 'CRM, которую нам собрали, объединила продажи и поддержку в одном интерфейсе — команда перестала терять заявки клиентов.',
 5, 'ДА', 2, now()),
('Elena Volkova', 'Product Manager', 'Nimbus Health',
 'The mobile app shipped on time and passed App Store review on the first try — communication throughout the project was excellent.',
 4, 'EV', 3, now()),
('Марат Кенжебаев', 'Основатель', 'Wear&Go',
 'Интернет-магазин запустили за два месяца с удобным оформлением покупки и онлайн-оплатой — конверсия выросла уже в первый месяц.',
 5, 'МК', 4, now()),
('Sophie Turner', 'Operations Lead', 'Loop Fitness',
 'Support responds within an hour even on weekends — over six months we haven''t had a single outage longer than a few minutes.',
 4, 'ST', 5, now());

-- +goose Down
DROP TABLE IF EXISTS testimonials;
DROP TABLE IF EXISTS portfolio_cases;
DROP TABLE IF EXISTS pricing_cards;
DROP TABLE IF EXISTS service_details;
DROP TABLE IF EXISTS services_overview;
