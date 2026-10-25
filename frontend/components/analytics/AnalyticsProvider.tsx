"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@/components/providers/LocaleProvider";
import { loadAnalyticsConfig } from "@/lib/analytics/config";
import {
  onConsentChange,
  onOpenConsentSettings,
  readConsent,
  writeConsent,
  type ConsentChoice,
} from "@/lib/analytics/consent";
import { configureGa4, ga4Revoke } from "@/lib/analytics/ga4";
import { flush, forgetAnalyticsIds, noteRoute, rememberLanding, setAnalyticsEnabled, track } from "@/lib/analytics/tracker";

/** Pages a call to action leads to: the request form and the calculator. */
const CTA_PATHS = new Set(["/contact", "/calculator"]);

/** A link inside the site to one of CTA_PATHS (query and hash ignored). */
function isCtaLink(link: HTMLAnchorElement): boolean {
  try {
    const url = new URL(link.href);
    return url.origin === window.location.origin && CTA_PATHS.has(url.pathname.replace(/\/$/, ""));
  } catch {
    return false;
  }
}

/**
 * Mounted once in the root layout. Reads the backend's switches, asks for
 * consent when something optional is configured, tracks page views on
 * every client-side navigation and phone/WhatsApp/email/promo and
 * call-to-action clicks anywhere.
 * Renders nothing but the consent banner.
 */
export default function AnalyticsProvider() {
  const pathname = usePathname();
  const { t } = useLocale();
  const c = t.consent;
  const [configured, setConfigured] = useState(false);
  const [choice, setChoice] = useState<ConsentChoice>(null);
  const [bannerOpen, setBannerOpen] = useState(false);

  // Backend switches: analytics and/or GA4. Nothing configured → no banner.
  useEffect(() => {
    // In memory only, before anything is decided (see rememberLanding).
    rememberLanding();
    let cancelled = false;
    void loadAnalyticsConfig().then((config) => {
      if (cancelled) return;
      setAnalyticsEnabled(config.enabled);
      configureGa4(config.ga4MeasurementId);
      const any = config.enabled || config.ga4MeasurementId !== "";
      setConfigured(any);
      const current = readConsent();
      setChoice(current);
      setBannerOpen(any && current === null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const offChange = onConsentChange((next) => {
      setChoice(next);
      if (next === "declined") {
        forgetAnalyticsIds();
        ga4Revoke();
      }
    });
    const offOpen = onOpenConsentSettings(() => setBannerOpen(true));
    return () => {
      offChange();
      offOpen();
    };
  }, []);

  // Every route the tab shows, consent or not (memory only): tells the
  // entry page, whose referrer is real, from pages reached inside the site.
  useEffect(() => {
    noteRoute(pathname);
  }, [pathname]);

  // One page view per navigation (the tracker ignores repeats of the same
  // path, e.g. effects running twice).
  useEffect(() => {
    if (configured && choice === "granted") track("page_view");
  }, [pathname, configured, choice]);

  // Clicks anywhere: tel:, wa.me and mailto: links, links to the request
  // form or the calculator (only that one was clicked, not where it led),
  // and actions inside the promo block.
  useEffect(() => {
    if (!configured) return;
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const link = target?.closest("a[href]");
      const href = link?.getAttribute("href") ?? "";
      if (href.startsWith("tel:")) track("phone_click");
      else if (href.startsWith("https://wa.me/")) track("whatsapp_click");
      else if (href.startsWith("mailto:")) track("email_click");
      else if (link instanceof HTMLAnchorElement && isCtaLink(link)) track("cta_click");
      if (target?.closest("#promo a, #promo button")) track("promo_click");
    };
    const onHide = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    document.addEventListener("click", onClick, { capture: true });
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
    };
  }, [configured]);

  if (!configured || !bannerOpen || pathname.startsWith("/manager")) return null;

  const decide = (granted: boolean) => {
    writeConsent(granted);
    setBannerOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-labelledby="consent-title"
      className="fixed inset-x-3 bottom-3 z-[45] mx-auto max-w-2xl rounded-2xl border border-[var(--text-primary)]/10 bg-[var(--surface)]/95 p-4 shadow-[0_20px_60px_rgba(7,11,23,0.45)] backdrop-blur-xl sm:inset-x-6 sm:bottom-6 sm:p-5 light:shadow-[0_20px_60px_rgba(15,23,42,0.18)]"
    >
      <p id="consent-title" className="text-sm font-semibold text-slate-100 light:text-slate-900">
        {c.title}
      </p>
      <p className="mt-1.5 text-xs leading-5 text-slate-400 light:text-slate-600">
        {c.text}{" "}
        <Link href="/cookies" className="text-cyan-300 underline-offset-2 hover:underline light:text-cyan-700">
          {c.details}
        </Link>
      </p>
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={() => decide(false)}
          className="rounded-xl border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-[var(--text-primary)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 light:text-slate-800"
        >
          {c.decline}
        </button>
        <button
          type="button"
          onClick={() => decide(true)}
          className="rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
        >
          {c.accept}
        </button>
      </div>
    </div>
  );
}
