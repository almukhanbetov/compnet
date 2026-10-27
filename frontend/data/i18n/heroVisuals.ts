import type { Locale } from "@/types/i18n";
import type { HeroVisualKey } from "@/data/heroVisuals";

/** What each hero image shows, for screen readers and search engines. */
export const heroVisualAlts: Record<Locale, Record<HeroVisualKey, string>> = {
  ru: {
    home: "Цифровая экосистема: сайт, мобильное приложение, сервер и аналитика вокруг единого ядра разработки",
    services: "Ноутбук с интерфейсом сайта и смартфон с мобильным приложением",
    solutions: "Панель CRM с воронкой сделок и графиком, подключённая к интеграциям, автоматизации и аналитике",
    pricing: "Сравнение трёх тарифов с перечнем того, что входит в стоимость",
    calculator: "Конструктор проекта: выбор типа, модулей и параметров с расчётом стоимости",
    portfolio: "Готовый проект на мониторе, планшете и смартфоне",
    about: "Процесс разработки: команда, код и этапы от анализа до запуска",
    contact: "Переписка с менеджером, звонок, письмо и выбор времени консультации",
    websiteDevelopment: "Сайт-каталог в браузере и его мобильная версия, скорость загрузки и поиск",
  },
  kk: {
    home: "Цифрлық экожүйе: сайт, мобильді қосымша, сервер және аналитика бір әзірлеу ядросының айналасында",
    services: "Сайт интерфейсі бар ноутбук және мобильді қосымшасы бар смартфон",
    solutions: "Мәмілелер воронкасы мен графигі бар CRM панелі, интеграцияларға, автоматтандыруға және аналитикаға қосылған",
    pricing: "Бағаға не кіретінін көрсететін үш тарифті салыстыру",
    calculator: "Жоба конструкторы: түрін, модульдерін және параметрлерін таңдап, құнын есептеу",
    portfolio: "Монитордағы, планшеттегі және смартфондағы дайын жоба",
    about: "Әзірлеу процесі: команда, код және талдаудан іске қосуға дейінгі кезеңдер",
    contact: "Менеджермен хат алмасу, қоңырау, хат және кеңес уақытын таңдау",
    websiteDevelopment: "Браузердегі каталог сайт және оның мобильді нұсқасы, жүктелу жылдамдығы мен іздеу",
  },
  en: {
    home: "A digital ecosystem: website, mobile app, server and analytics around one development core",
    services: "A laptop with a website interface and a smartphone with a mobile app",
    solutions: "A CRM dashboard with a deal pipeline and a chart, connected to integrations, automation and analytics",
    pricing: "Three plans compared, with what each price includes",
    calculator: "A project builder: choosing the type, modules and options with the price calculated",
    portfolio: "A finished project on a monitor, a tablet and a smartphone",
    about: "The development process: the team, the code and the stages from analysis to launch",
    contact: "A chat with a manager, a call, an email and picking a consultation time",
    websiteDevelopment: "A catalog website in a browser and its mobile version, load speed and search",
  },
};
