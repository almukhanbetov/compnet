import type {
  BudgetRange,
  Timeline,
  ContactMethod,
  WorkingHours,
} from "@/types/contactPage";
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

export const workingHours: WorkingHours[] = [
  { label: "Будни", value: "09:00–19:00 (GMT+5)" },
  { label: "Выходные", value: "по предварительной договорённости" },
];
