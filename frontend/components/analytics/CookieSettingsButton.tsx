"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/components/providers/LocaleProvider";
import { loadAnalyticsConfig } from "@/lib/analytics/config";
import { openConsentSettings } from "@/lib/analytics/consent";

/** "Cookie settings": reopens the consent banner. Shown only when there is
 *  something optional to consent to (analytics or GA4 configured). */
export default function CookieSettingsButton({ className }: { className?: string }) {
  const { t } = useLocale();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void loadAnalyticsConfig().then((config) => {
      if (!cancelled) setVisible(config.enabled || config.ga4MeasurementId !== "");
    });
    return () => {
      cancelled = true;
    };
  }, []);
  if (!visible) return null;
  return (
    <button type="button" onClick={openConsentSettings} className={className}>
      {t.consent.settings}
    </button>
  );
}
