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
}

export interface HeaderTranslations {
  nav: HeaderNavTranslations;
  actions: HeaderActionsTranslations;
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

export interface Translations {
  header: HeaderTranslations;
  hero: HeroTranslations;
}

export interface LocaleOption {
  value: Locale;
  label: string;
  shortLabel: string;
}
