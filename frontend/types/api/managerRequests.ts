// Wire types for the managers' project requests
// (backend/internal/http/dto/manager_requests.go).

/** Working statuses a manager sets. */
export type RequestStatus = "new" | "in_progress" | "completed" | "rejected";
/** Earlier values the database still accepts; shown with their own labels. */
export type LegacyRequestStatus = "contacted" | "qualified" | "proposal_sent" | "accepted" | "archived";
export type AnyRequestStatus = RequestStatus | LegacyRequestStatus;

export const REQUEST_STATUSES: readonly RequestStatus[] = ["new", "in_progress", "completed", "rejected"];

export interface ApiRequestItem {
  id: string;
  number: number;
  name: string;
  /** "" when not given. */
  phone: string;
  email: string;
  company: string;
  project_type: string;
  budget_range: string;
  desired_timeline: string;
  contact_method: "phone" | "whatsapp" | "telegram" | "email";
  status: AnyRequestStatus;
  created_at: string;
  updated_at: string;
}

export interface ApiRequestListMeta {
  total: number;
  page: number;
  limit: number;
  new_count: number;
}

export interface ApiStaffRef {
  id: string;
  name: string;
}

export interface ApiRequestEstimate {
  pricing_version: string;
  is_individual: boolean;
  minimum_tenge: number | null;
  maximum_tenge: number | null;
  duration_label: string;
  breakdown: {
    project_type: string;
    scale_tier_id?: string;
    design_level_id: string;
    complexity_id: string;
    urgency_id: string;
    multilingual: boolean;
    base_price_tenge: number | null;
    scale_price_tenge: number | null;
    modules: Array<{ module_id: string; quantity: number; unit_price_tenge: number; total_tenge: number }>;
    modules_total_tenge: number;
    design_amount_tenge: number;
    multilingual_amount_tenge: number;
    subtotal_tenge: number | null;
    estimated_raw_tenge: number | null;
  };
  created_at: string;
}

export interface ApiRequestStatusChange {
  id: number;
  old_status: AnyRequestStatus;
  new_status: AnyRequestStatus;
  staff: ApiStaffRef;
  changed_at: string;
}

export interface ApiRequestAnalytics {
  session_id: string;
  linked_at: string;
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
}

export interface ApiRequestDetail extends ApiRequestItem {
  description: string;
  consent: boolean;
  /** International number for wa.me; "" when the country code is not certain. */
  whatsapp_phone: string;
  note: { text: string; updated_at: string | null; updated_by: ApiStaffRef | null };
  estimate: ApiRequestEstimate | null;
  /** Newest first. */
  history: ApiRequestStatusChange[];
  /** null: no analytics session (no consent, or removed after retention). */
  analytics: ApiRequestAnalytics | null;
  /** null: sent without analytics consent, or before sources were recorded. */
  attribution: ApiRequestAttribution | null;
}

/** Marketing channels decided by the backend (internal/attribution). */
export const LEAD_CHANNELS = [
  "organic_search",
  "paid_search",
  "social",
  "paid_social",
  "referral",
  "direct",
  "email",
  "other",
  "unknown",
] as const;
export type LeadChannel = (typeof LEAD_CHANNELS)[number];

/** A request's stored source; "" = not reported. No click id values. */
export interface ApiRequestAttribution {
  channel: LeadChannel;
  source: string;
  source_page: string;
  previous_page: string;
  landing_page: string;
  referrer_host: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  utm_term: string;
  ad_click: boolean;
}

export interface RequestListQuery {
  q?: string;
  status?: RequestStatus | "";
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}
