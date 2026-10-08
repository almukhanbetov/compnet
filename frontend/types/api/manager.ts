// Wire types for the manager API (backend/internal/http/dto/manager.go).

export type ApiConversationStatus = "open" | "closed";

export interface ApiStaffUser {
  id: string;
  email: string;
  display_name: string;
  role: string;
}

export interface ApiManagerSession {
  user: ApiStaffUser;
  expires_at: string;
}

export interface ApiManagerConversation {
  id: string;
  status: ApiConversationStatus;
  visitor_name: string;
  visitor_contact: string;
  page_url: string;
  unread_count: number;
  manager_last_read_id: number;
  visitor_last_read_id: number;
  last_message_id: number;
  last_message_at: string | null;
  created_at: string;
}

export interface ApiLastMessagePreview {
  id: number;
  author: "visitor" | "manager" | "system";
  body: string;
  created_at: string;
}

export interface ApiInboxItem extends ApiManagerConversation {
  last_message: ApiLastMessagePreview | null;
}

export interface ApiManagerMessage {
  id: number;
  author: "visitor" | "manager" | "system";
  body: string;
  client_message_id: string;
  staff_user_id?: string;
  staff_name?: string;
  created_at: string;
}

export interface ApiEnvelope<T, M = null> {
  data: T;
  meta: M;
}

export interface ApiInboxMeta {
  next_cursor: string;
  has_more: boolean;
}

export interface ApiMessagesMeta {
  has_more: boolean;
  conversation: ApiManagerConversation;
}

export interface ApiUnreadCount {
  conversations: number;
  messages: number;
}

export type InboxFilter = "open" | "closed" | "all";
