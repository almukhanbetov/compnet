import type { Locale } from "@/types/i18n";

/** Cookie / analytics consent banner. */
const ru = {
  title: "Аналитика посещений",
  text: "Мы хотим понимать, какие страницы полезны и откуда приходят посетители. Для этого браузеру присваивается случайный идентификатор, а мы видим просмотры страниц и нажатия кнопок — без контактов, текста сообщений и IP-адреса. Сайт, формы и чат работают и без согласия.",
  accept: "Разрешить аналитику",
  decline: "Только необходимые",
  details: "Подробнее о cookie",
  settings: "Настройки cookie",
};

export type ConsentTranslations = typeof ru;

export const consentTranslations: Record<Locale, ConsentTranslations> = {
  ru,
  kk: {
    title: "Келу аналитикасы",
    text: "Қандай беттер пайдалы екенін және келушілер қайдан келетінін түсінгіміз келеді. Ол үшін браузерге кездейсоқ идентификатор беріледі, ал біз беттерді қарау мен батырмаларды басуды көреміз — байланыс деректерінсіз, хабарлама мәтінінсіз және IP-мекенжайсыз. Сайт, формалар мен чат келісімсіз де жұмыс істейді.",
    accept: "Аналитикаға рұқсат беру",
    decline: "Тек қажеттілері",
    details: "Cookie туралы толығырақ",
    settings: "Cookie баптаулары",
  },
  en: {
    title: "Visit analytics",
    text: "We'd like to understand which pages are useful and where visitors come from. For this the browser gets a random identifier, and we see page views and button clicks — without contacts, message text or IP address. The site, forms and chat work without consent too.",
    accept: "Allow analytics",
    decline: "Necessary only",
    details: "More about cookies",
    settings: "Cookie settings",
  },
};
