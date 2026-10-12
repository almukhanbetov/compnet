/**
 * Consent to optional analytics, remembered in this browser only
 * (localStorage, never sent anywhere). Until the visitor chooses, nothing
 * optional is collected; "declined" is final until they change it in the
 * cookie settings. The site, forms and chat work the same either way.
 */

export type ConsentChoice = "granted" | "declined" | null;

const KEY = "compnet-consent";
const EVENT = "compnet-consent-change";
const VERSION = 1;

interface Stored {
  v: number;
  analytics: boolean;
  at: string;
}

export function readConsent(): ConsentChoice {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as Stored;
    if (stored.v !== VERSION) return null; // the text changed: ask again
    return stored.analytics ? "granted" : "declined";
  } catch {
    return null;
  }
}

export function writeConsent(analytics: boolean): void {
  try {
    const value: Stored = { v: VERSION, analytics, at: new Date().toISOString() };
    window.localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    // Storage blocked: the choice lasts for this page only.
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: analytics ? "granted" : "declined" }));
}

/** Calls fn whenever the choice changes (also in other tabs). */
export function onConsentChange(fn: (choice: ConsentChoice) => void): () => void {
  const local = (event: Event) => fn((event as CustomEvent<ConsentChoice>).detail);
  const storage = (event: StorageEvent) => {
    if (event.key === KEY) fn(readConsent());
  };
  window.addEventListener(EVENT, local);
  window.addEventListener("storage", storage);
  return () => {
    window.removeEventListener(EVENT, local);
    window.removeEventListener("storage", storage);
  };
}

const OPEN_SETTINGS = "compnet-consent-open";

/** Asks the banner to reopen (the "Cookie settings" link). */
export function openConsentSettings(): void {
  window.dispatchEvent(new Event(OPEN_SETTINGS));
}

export function onOpenConsentSettings(fn: () => void): () => void {
  window.addEventListener(OPEN_SETTINGS, fn);
  return () => window.removeEventListener(OPEN_SETTINGS, fn);
}
