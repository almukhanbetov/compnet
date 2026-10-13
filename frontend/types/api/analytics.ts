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
