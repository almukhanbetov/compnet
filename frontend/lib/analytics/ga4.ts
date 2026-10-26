import { readConsent } from "@/lib/analytics/consent";

/**
 * Optional Google Analytics 4. Off unless the backend provides a real
 * measurement id (GA4_MEASUREMENT_ID); loaded only after the visitor
 * accepted analytics. Sends the agreed anonymous events only: page paths
 * without query strings and action names — never contacts, chat text,
 * request or conversation ids. Google signals and ad personalisation off.
 */

type Gtag = (...args: unknown[]) => void;
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

let measurementId = "";
let loaded = false;

const EVENT_NAMES: Record<string, string> = {
  promo_view: "promo_view",
  promo_click: "promo_click",
  whatsapp_click: "whatsapp_click",
  phone_click: "phone_click",
  chat_open: "chat_open",
  calculator_start: "calculator_start",
  calculator_result: "calculator_result",
  // Not "form_start": GA4's enhanced measurement sends that one itself for
  // any form when enabled on the stream; the two would mix.
  form_start: "request_form_start",
  cta_click: "cta_click",
  email_click: "email_click",
  // Sent only after the server confirmed the request was saved.
  lead_confirmed: "generate_lead",
};

export function configureGa4(id: string): void {
  measurementId = id;
}

function load(): boolean {
  if (!measurementId || readConsent() !== "granted") return false;
  if (loaded) return true;
  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer?.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", measurementId, {
    send_page_view: false, // page views are sent on every client-side navigation instead
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);
  loaded = true;
  return true;
}

/** Forwards an agreed event to GA4 if it is configured and consented. The
 * only extra parameter is a tariff's slug (never contacts or ids). */
export function ga4Event(type: string, path: string, params: { tariff?: string } = {}): void {
  if (window.location.pathname.startsWith("/manager") || !load()) return;
  if (type === "page_view") {
    window.gtag?.("event", "page_view", { page_path: path, page_location: window.location.origin + path });
    return;
  }
  const name = EVENT_NAMES[type];
  if (name) window.gtag?.("event", name, { page_path: path, ...(params.tariff ? { tariff: params.tariff } : {}) });
}

/** Consent withdrawn: tell GA4 to stop storing analytics cookies. */
export function ga4Revoke(): void {
  if (loaded) window.gtag?.("consent", "update", { analytics_storage: "denied" });
}
