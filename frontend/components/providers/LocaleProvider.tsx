"use client";

import { createContext, startTransition, useCallback, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { translations } from "@/data/translations";
import { localeCookie } from "@/lib/i18n";
import type { Locale, Translations } from "@/types/i18n";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translations;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

interface LocaleProviderProps {
  children: ReactNode;
  /** Language the server rendered with (from the locale cookie). */
  initialLocale: Locale;
}

export function LocaleProvider({ children, initialLocale }: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const router = useRouter();

  // Remember the choice for the next visit (the server reads the cookie),
  // keep <html lang> in step, and re-render the server components (page
  // texts, API content, metadata) in the new language without a reload.
  const setLocale = useCallback(
    (next: Locale) => {
      setLocaleState(next);
      document.cookie = localeCookie(next);
      document.documentElement.lang = next;
      startTransition(() => router.refresh());
    },
    [router],
  );

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, setLocale, t: translations[locale] }),
    [locale, setLocale],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return context;
}
