import { cookies } from "next/headers";
import { translations } from "@/data/translations";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from "@/lib/i18n";
import type { Locale, Translations } from "@/types/i18n";

/**
 * The language of the current request (from the locale cookie). Used by the
 * root layout so the server renders <html lang> and all texts in the
 * visitor's language — the client starts with the same value, so hydration
 * matches. Reading cookies makes the routes render per request.
 */
export async function getRequestLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** Translations for the current request, for server components and metadata. */
export async function getServerTranslations(): Promise<Translations> {
  return translations[await getRequestLocale()];
}
