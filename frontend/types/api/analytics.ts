// Wire types for the manager statistics (backend/internal/http/handler/analytics.go).

export interface ApiAnalyticsSource {
  source: string;
  medium: string;
  campaign?: string;
  sessions: number;
  visitors: number;
  converted_sessions: number;
}

export interface ApiAnalyticsSession {
  id: string;
  started_at: string;
  last_seen_at: string;
  landing_path: string;
  source: string;
  medium: string;
  campaign: string;
  term: string;
  content: string;
  referrer_host: string;
  first_source: string;
  first_medium: string;
  first_campaign: string;
  device: "desktop" | "mobile" | "tablet";
  language: "" | "ru" | "kk" | "en";
  page_views: number;
  promo_views: number;
  promo_clicks: number;
  whatsapp_clicks: number;
  phone_clicks: number;
  chat_opens: number;
  request_ids: string[];
  conversation_ids: string[];
}

export interface ApiAnalyticsReport {
  period: { from: string; to: string; from_utc: string; to_utc: string; time_zone: string };
  settings: { enabled: boolean; retention_days: number };
  totals: {
    visitors: number;
    sessions: number;
    page_views: number;
    whatsapp_clicks: number;
    phone_clicks: number;
    requests: number;
    new_chats: number;
    linked_requests: number;
    linked_chats: number;
    converted_sessions: number;
  };
  days: Array<{ day: string; sessions: number; page_views: number; requests: number; new_chats: number; converted_sessions: number }>;
  sources: ApiAnalyticsSource[];
  first_sources: ApiAnalyticsSource[];
  campaigns: ApiAnalyticsSource[];
  pages: Array<{ path: string; views: number; sessions: number }>;
  devices: Array<{ key: string; sessions: number }>;
  languages: Array<{ key: string; sessions: number }>;
  recent_sessions: ApiAnalyticsSession[];
}

export type ApiAnalyticsEventType =
  | "page_view"
  | "promo_view"
  | "promo_click"
  | "whatsapp_click"
  | "phone_click"
  | "chat_open"
  | "calculator_start"
  | "calculator_result"
  | "form_start"
  | "cta_click"
  | "email_click"
  | "chat_first_message"
  | "lead_submit";

export interface ApiAnalyticsSessionDetail {
  session: ApiAnalyticsSession;
  events: Array<{
    id: string;
    type: ApiAnalyticsEventType;
    occurred_at: string;
    path: string;
    project_request_id?: string;
    conversation_id?: string;
  }>;
  requests: Array<{ id: string; number: number; project_type: string; status: string; created_at: string }>;
  conversations: Array<{ id: string; status: string; visitor_name: string; visitor_contact: string }>;
}

/** GET /api/v1/manager/analytics/visits — the visit counter. */
export interface ApiAnalyticsVisits {
  /** Asia/Almaty date "today" refers to. */
  today: string;
  time_zone: string;
  /** First day counted (YYYY-MM-DD), null before the first visit. */
  since: string | null;
  enabled: boolean;
  today_counts: { visits: number; visitors: number; page_views: number };
  all_time: { visits: number; page_views: number };
}

export interface ApiLeadCount {
  key: string;
  count: number;
}

/** Requests report (GET /manager/analytics/leads): counts only. */
export interface ApiLeadsReport {
  period: { from: string; to: string; time_zone: string };
  filter: { channel: string; page: string; project_type: string };
  totals: {
    requests: number;
    tracked: number;
    new: number;
    in_progress: number;
    completed: number;
    rejected: number;
    archived: number;
    google_organic: number;
    paid: number;
    social: number;
  };
  /** null when it cannot be computed correctly (filters, or no consented visits). */
  conversion: { sessions: number; sessions_with_request: number } | null;
  channels: ApiLeadCount[];
  sources: Array<{ channel: string; source: string; count: number }>;
  /** key "" = page unknown. */
  pages: ApiLeadCount[];
  service_pages: ApiLeadCount[];
  project_types: ApiLeadCount[];
  /** Every Asia/Almaty day of the period. */
  days: ApiLeadCount[];
}

export interface LeadsFilter {
  channel?: string;
  page?: string;
  project_type?: string;
}

/** GET /api/v1/manager/analytics/funnel: sessions started in the period per step. */
export type ApiFunnelStepKey = "visit" | "interest" | "start" | "intent" | "conversion";

export interface ApiFunnelStep {
  key: ApiFunnelStepKey;
  sessions: number;
  /** Percent of the first step, one decimal; null when the first step is 0. */
  of_first: number | null;
  /** Percent of the previous step; null for the first step or after a zero step. */
  of_previous: number | null;
  /** Sessions of the previous step that did not reach this one. */
  lost: number;
  lost_pct: number | null;
}

export interface ApiFunnel {
  period: { from: string; to: string; time_zone: string };
  steps: ApiFunnelStep[];
  converted_sessions: number;
  conversions_outside_funnel: number;
  /** When the first calculator/form/link step event was stored; null = none yet. */
  step_events_since: string | null;
}
