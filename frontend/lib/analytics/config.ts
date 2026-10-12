/**
 * Whether analytics (and the optional GA4) is switched on is decided by the
 * backend's configuration (ANALYTICS_ENABLED, GA4_MEASUREMENT_ID), read once
 * per page load from GET /api/v1/analytics/config. Without an answer
 * everything stays off.
 */

export interface AnalyticsClientConfig {
  enabled: boolean;
  ga4MeasurementId: string;
}

const OFF: AnalyticsClientConfig = { enabled: false, ga4MeasurementId: "" };
let pending: Promise<AnalyticsClientConfig> | null = null;

export function apiBase(): string | null {
  return process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? null;
}

export function loadAnalyticsConfig(): Promise<AnalyticsClientConfig> {
  if (pending) return pending;
  const base = apiBase();
  if (!base) return Promise.resolve(OFF);
  pending = fetch(`${base}/api/v1/analytics/config`, { credentials: "omit" })
    .then(async (response) => {
      if (!response.ok) return OFF;
      const body = (await response.json()) as { data?: { enabled?: boolean; ga4_measurement_id?: string } };
      const id = body.data?.ga4_measurement_id ?? "";
      return {
        enabled: body.data?.enabled === true,
        // Only a real-looking id; anything else keeps GA4 off.
        ga4MeasurementId: /^G-[A-Z0-9]{4,16}$/.test(id) ? id : "",
      };
    })
    .catch(() => OFF);
  return pending;
}
