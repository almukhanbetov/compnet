import type {
  BudgetRange,
  Timeline,
  ContactMethod,
  ContactChannel,
  WorkingHours,
  ContactAdvantage,
} from "@/types/contactPage";
import type { FaqItem } from "@/types/faqItem";
import { projectPricingList } from "@/data/projectPricing";

export const projectTypeOptions = projectPricingList.map((item) => item.label);

export const budgetOptions: BudgetRange[] = [
  "до 300 000 ₸",
  "300 000–700 000 ₸",
  "700 000–1 500 000 ₸",
  "1 500 000–3 000 000 ₸",
  "более 3 000 000 ₸",
  "пока не определён",
];

export const timelineOptions: Timeline[] = [
  "срочно",
  "1 месяц",
  "2–3 месяца",
  "3–6 месяцев",
  "более 6 месяцев",
  "пока не определён",
];

export const contactMethodOptions: ContactMethod[] = [
  "Телефон",
  "WhatsApp",
  "Telegram",
  "Email",
];

export const contactChannels: ContactChannel[] = [
  {
    id: "phone",
    label: "Телефон",
    value: "+7 (700) 000-00-00",
    href: "tel:+77000000000",
    icon: "Phone",
  },
  {
    id: "email",
    label: "Email",
    value: "hello@compnet.kz",
    href: "mailto:hello@compnet.kz",
    icon: "Mail",
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    value: "Написать в WhatsApp",
    href: "#",
    icon: "MessageCircle",
    isPlaceholder: true,
  },
  {
    id: "telegram",
    label: "Telegram",
    value: "Написать в Telegram",
    href: "#",
    icon: "Send",
    isPlaceholder: true,
  },
];

export const workingHours: WorkingHours[] = [
  { label: "Будни", value: "09:00–19:00 (GMT+5)" },
  { label: "Выходные", value: "по предварительной договорённости" },
];

export const contactAdvantages: ContactAdvantage[] = [
  { id: "advantage-1", label: "Ответим в течение рабочего дня", icon: "Clock" },
  { id: "advantage-2", label: "Бесплатная предварительная оценка", icon: "Sparkles" },
  { id: "advantage-3", label: "Подпишем NDA по запросу", icon: "ShieldCheck" },
  {
    id: "advantage-4",
    label: "Обсудим формат: фикс или Time & Materials",
    icon: "MessageSquare",
  },
];

export const contactFaqItems: FaqItem[] = [
  {
    id: "contact-faq-1",
    question: "Сколько времени занимает оценка заявки?",
    answer:
      "Обычно отвечаем в течение рабочего дня с ориентировочной стоимостью и уточняющими вопросами по задаче.",
  },
  {
    id: "contact-faq-2",
    question: "Нужна ли предоплата, чтобы начать?",
    answer:
      "Да, работаем поэтапно: частичная предоплата на старте и оплата по завершении ключевых этапов.",
  },
  {
    id: "contact-faq-3",
    question: "Можно ли начать с MVP?",
    answer:
      "Да, часто рекомендуем стартовать с базовой версии продукта, а остальные функции добавлять на следующих этапах.",
  },
  {
    id: "contact-faq-4",
    question: "Работаете ли вы по договору?",
    answer:
      "Да, заключаем договор и, при необходимости, подписываем NDA до начала обсуждения деталей проекта.",
  },
  {
    id: "contact-faq-5",
    question: "Можно ли заказать только дизайн?",
    answer:
      "Да, можем выполнить только UI/UX дизайн — от вайрфреймов до готовых макетов — без разработки.",
  },
  {
    id: "contact-faq-6",
    question: "Можно ли заказать поддержку после запуска?",
    answer:
      "Да, предлагаем отдельный формат технической поддержки: мониторинг, обновления и доработки после релиза.",
  },
];
