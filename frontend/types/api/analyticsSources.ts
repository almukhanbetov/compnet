/** GET /api/v1/manager/analytics/sources: sessions of the period by channel. */
export const SESSION_CHANNELS = ["google_organic", "google_cpc", "chatgpt", "direct", "social", "referral", "other"] as const;
export type SessionChannel = (typeof SESSION_CHANNELS)[number];

export interface ApiChannelRow {
  sessions: number;
  visitors: number;
  /** Visitors whose first stored session is in this channel; new + returning = visitors. */
  new_visitors: number;
  returning_visitors: number;
  converted_sessions: number;
  /** Percent of the channel's sessions with an inquiry, one decimal; null without sessions. */
  conversion: number | null;
  /** Percent of all sessions of the period; null when the period has none. */
  share: number | null;
}

export interface ApiSourcesReport {
  period: { from: string; to: string; time_zone: string };
  totals: ApiChannelRow;
  /** By the session's own source, every channel in report order. */
  channels: Array<ApiChannelRow & { key: SessionChannel }>;
  /** By the visitor's first source. */
  first_channels: Array<ApiChannelRow & { key: SessionChannel }>;
}
