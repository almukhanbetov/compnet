// WebSocket wire format (backend/internal/realtime, docs/CHAT_REALTIME.md).

import type { ApiChatConversation, ApiChatMessage } from "@/types/api/chat";
import type {
  ApiInboxItem,
  ApiManagerConversation,
  ApiManagerMessage,
  ApiUnreadCount,
} from "@/types/api/manager";

export type RealtimeEventType =
  | "new_message"
  | "message_ack"
  | "messages_read"
  | "conversation_updated"
  | "typing"
  | "presence"
  | "error"
  | "pong"
  | "project_request_created"
  | "project_request_updated"
  | "analytics_updated";

/** Envelope of every server → client message. */
export interface RealtimeEvent<T = unknown> {
  v: number;
  type: RealtimeEventType;
  event_id: string;
  /** Server time, UTC. */
  ts: string;
  /** Manager-side events about one conversation; never sent to visitors. */
  conversation_id?: string;
  /** Echo of the client frame an ack/error/pong answers. */
  request_id?: string;
  data?: T;
}

export interface RealtimeErrorData {
  code: string;
  message?: string;
  fields?: Record<string, string>;
  retry_after_seconds?: number;
  client_message_id?: string;
}

export interface AckData<M> {
  client_message_id: string;
  created: boolean;
  message: M;
}

export interface TypingData {
  from: "visitor" | "manager";
  is_typing: boolean;
  staff_user_id?: string;
  staff_name?: string;
}

export interface PresenceData {
  subject: "managers" | "visitor" | "visitors";
  managers_online?: boolean;
  online_managers?: number;
  conversation_id?: string;
  visitor_online?: boolean;
  online_conversation_ids?: string[];
}

// Visitor payloads.
export interface VisitorNewMessageData {
  message: ApiChatMessage;
  unread_count: number;
}
export interface VisitorReadData {
  reader: "visitor" | "manager";
  last_read_id: number;
  unread_count: number;
}
export interface VisitorConversationData {
  conversation: ApiChatConversation;
}

// Manager payloads.
export interface ManagerNewMessageData {
  message: ApiManagerMessage;
  conversation: ApiInboxItem;
  unread_total: ApiUnreadCount;
}
export interface ManagerReadData {
  reader: "visitor" | "manager";
  last_read_id: number;
  conversation: ApiManagerConversation;
  unread_total: ApiUnreadCount;
}
export interface ManagerConversationData {
  conversation: ApiManagerConversation;
  unread_total: ApiUnreadCount;
}

/** project_request_created / project_request_updated: ids and counters only. */
export interface ProjectRequestEventData {
  request_id: string;
  new_count: number;
}

/** Client → server frames. */
export type RealtimeFrame =
  | {
      type: "send_message";
      client_message_id: string;
      body: string;
      conversation_id?: string;
      /** Visitor only, with analytics consent: links the first message to the visit. */
      analytics_session_id?: string;
    }
  | { type: "mark_read"; last_message_id: number; conversation_id?: string }
  | { type: "typing"; is_typing: boolean; conversation_id?: string }
  | { type: "ping" };
