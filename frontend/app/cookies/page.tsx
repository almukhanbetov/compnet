import type { Metadata } from "next";
import LegalPageTemplate from "@/components/layout/LegalPageTemplate";

export const metadata: Metadata = {
  title: "Политика использования Cookie | COMPNET",
  description:
    "Как COMPNET использует cookie и локальное хранилище браузера — демонстрационная версия документа.",
};

const sections = [
  {
    heading: "Что такое cookie",
    body: "Cookie — небольшие текстовые файлы, которые сайт сохраняет в браузере для запоминания настроек и повышения удобства использования.",
  },
  {
    heading: "Какие cookie мы используем",
    body: "Технические cookie и локальное хранилище браузера — для сохранения выбранной темы оформления и языка интерфейса. Аналитические cookie в этом прототипе не подключены.",
  },
  {
    heading: "Управление cookie",
    body: "Вы можете очистить или заблокировать cookie в настройках браузера — это может ограничить часть функциональности сайта, например сохранение темы оформления.",
  },
  {
    heading: "Согласие на использование cookie",
    body: "Продолжая пользоваться сайтом, вы соглашаетесь с использованием технических cookie, описанных в этом документе.",
  },
];

export default function CookiesPage() {
  return (
    <LegalPageTemplate
      eyebrow="Cookie"
      title="Политика использования Cookie"
      intro="Cookie помогают сайту работать корректно и запоминать ваши настройки. Ниже — демонстрационное описание их использования."
      sections={sections}
    />
  );
}
