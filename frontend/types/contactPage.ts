import type { ProjectPricingLabel as ProjectType } from "@/types/projectPricing";

export type { ProjectType };

export type BudgetRange =
  | "до 300 000 ₸"
  | "300 000–700 000 ₸"
  | "700 000–1 500 000 ₸"
  | "1 500 000–3 000 000 ₸"
  | "более 3 000 000 ₸"
  | "пока не определён";

export type Timeline =
  | "срочно"
  | "1 месяц"
  | "2–3 месяца"
  | "3–6 месяцев"
  | "более 6 месяцев"
  | "пока не определён";

export type ContactMethod = "Телефон" | "WhatsApp" | "Telegram" | "Email";

export interface EstimateFormState {
  name: string;
  phone: string;
  email: string;
  company: string;
  projectType: ProjectType | "";
  description: string;
  budget: BudgetRange;
  timeline: Timeline;
  contactMethod: ContactMethod;
  consent: boolean;
}

export type EstimateFormErrors = Partial<Record<keyof EstimateFormState, string>>;

export type ContactChannelIcon = "Phone" | "Mail" | "MessageCircle" | "Send";

export interface ContactChannel {
  id: string;
  label: string;
  value: string;
  href: string;
  icon: ContactChannelIcon;
  isPlaceholder?: boolean;
}

export interface WorkingHours {
  label: string;
  value: string;
}

export type ContactAdvantageIcon =
  | "Clock"
  | "ShieldCheck"
  | "MessageSquare"
  | "Sparkles";

export interface ContactAdvantage {
  id: string;
  label: string;
  icon: ContactAdvantageIcon;
}
