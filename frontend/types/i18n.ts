import type { BudgetRange, ContactMethod, Timeline } from "@/types/contactPage";
import type { ProjectPricingLabel } from "@/types/projectPricing";

export type Locale = "kk" | "ru" | "en";

export interface HeaderNavTranslations {
  services: string;
  solutions: string;
  pricing: string;
  calculator: string;
  portfolio: string;
  about: string;
  contacts: string;
}

export interface HeaderActionsTranslations {
  login: string;
  discuss: string;
  /** Accessible label prefix for the phone link, e.g. "Позвонить". */
  call: string;
  whatsapp: string;
  opensInNewTab: string;
}

export interface MobileNavTranslations {
  language: string;
  theme: string;
}

export interface HeaderTranslations {
  nav: HeaderNavTranslations;
  actions: HeaderActionsTranslations;
  mobile: MobileNavTranslations;
}

export interface HeroStat {
  value: string;
  label: string;
}

export type HeroDirectionIcon =
  | "Globe"
  | "Smartphone"
  | "Bot"
  | "Server"
  | "Palette"
  | "Settings2";

export interface HeroDirection {
  icon: HeroDirectionIcon;
  label: string;
}

export interface HeroTranslations {
  badge: string;
  titleLine1: string;
  titleLine2: string;
  description: string;
  ctaPrimary: string;
  ctaSecondary: string;
  stats: HeroStat[];
  directions: HeroDirection[];
}

export interface PromoFeatureTranslations {
  title: string;
  description: string;
}

export interface PromoTranslations {
  announcementBadge: string;
  label: string;
  title: string;
  subtitle: string;
  priceLabel: string;
  priceNote: string;
  description: string;
  features: {
    web: PromoFeatureTranslations;
    mobile: PromoFeatureTranslations;
    promotion: PromoFeatureTranslations;
  };
  termsLabel: string;
  terms: string;
  whatsappButton: string;
  callButton: string;
  /** Pre-filled WhatsApp message in this language. */
  whatsappMessage: string;
}

export interface HomeContactsTranslations {
  eyebrow: string;
  title: string;
  description: string;
  city: string;
}

export type ContactAdvantageKey = "reply" | "estimate" | "nda" | "format";

export interface ContactPageTranslations {
  hero: {
    badge: string;
    titleStart: string;
    titleAccent: string;
    description: string;
    ctaPrimary: string;
    ctaSecondary: string;
    advantages: Record<ContactAdvantageKey, string>;
  };
  form: {
    labels: {
      name: string;
      company: string;
      phone: string;
      email: string;
      projectType: string;
      contactMethod: string;
      budget: string;
      timeline: string;
      description: string;
      consent: string;
    };
    placeholders: {
      name: string;
      company: string;
      projectType: string;
      description: string;
    };
    contactHint: string;
    submit: string;
    submitting: string;
    errors: {
      name: string;
      phoneOrEmail: string;
      phone: string;
      email: string;
      projectType: string;
      description: string;
      consent: string;
      chooseFromList: string;
      network: string;
      unexpected: string;
      config: string;
      nameTooLong: string;
      descriptionTooLong: string;
      /** Shown for a backend validation error without a specific translation. */
      invalid: string;
    };
    /** {id}, {min}, {max}, {duration} are filled in by the form. */
    success: {
      title: string;
      individual: string;
      estimate: string;
      duration: string;
      followUp: string;
      again: string;
    };
    /** Display labels only — the submitted values stay the canonical ones. */
    options: {
      projectType: Record<ProjectPricingLabel, string>;
      budget: Record<BudgetRange, string>;
      timeline: Record<Timeline, string>;
      contactMethod: Record<ContactMethod, string>;
    };
  };
  estimate: {
    title: string;
    choose: string;
    /** {price} is the formatted amount. */
    from: string;
    individual: string;
    disclaimer: string;
  };
  methods: {
    eyebrow: string;
    title: string;
    description: string;
    phone: string;
    whatsappValue: string;
    telegramValue: string;
    demoNote: string;
    weekdays: string;
    weekends: string;
    weekendsValue: string;
  };
  faq: {
    eyebrow: string;
    title: string;
    description: string;
    items: Array<{ question: string; answer: string }>;
  };
}

export interface Translations {
  common: import("@/data/i18n/common").CommonTranslations;
  home: import("@/data/i18n/home").HomeTranslations;
  catalog: import("@/data/i18n/catalog").CatalogTranslations;
  pricing: import("@/data/i18n/pricing").PricingTranslations;
  portfolio: import("@/data/i18n/portfolio").PortfolioTranslations;
  chat: import("@/data/i18n/chat").ChatTranslations;
  manager: import("@/data/i18n/manager").ManagerTranslations;
  header: HeaderTranslations;
  hero: HeroTranslations;
  promo: PromoTranslations;
  homeContacts: HomeContactsTranslations;
  contactPage: ContactPageTranslations;
}

export interface LocaleOption {
  value: Locale;
  label: string;
  shortLabel: string;
}
