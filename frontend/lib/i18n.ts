import type { Locale } from "@/types/i18n";

/** Cookie holding the visitor's language; read by the server for SSR. */
export const LOCALE_COOKIE = "compnet-locale";
export const DEFAULT_LOCALE: Locale = "ru";
const LOCALES: readonly Locale[] = ["kk", "ru", "en"];

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Cookie string for document.cookie: one year, whole site. */
export function localeCookie(locale: Locale): string {
  return `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

/** Fills {placeholders} in a translated string. */
export function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
}
