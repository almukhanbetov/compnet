// Wire types for the visitor chat API (backend/internal/http/dto/chat.go).

export type ApiChatAuthor = "visitor" | "manager" | "system";

export interface ApiChatMessage {
  id: number;
  author: ApiChatAuthor;
  body: string;
  /** Present only on the visitor's own messages. */
  client_message_id?: string;
  created_at: string;
}

export interface ApiChatConversation {
  status: "open" | "closed";
  visitor_name: string;
  visitor_contact: string;
  last_message_id: number;
  last_read_id: number;
  unread_count: number;
  created_at: string;
}

export interface ApiChatMessagesMeta {
  has_more: boolean;
  unread_count: number;
  last_read_id: number;
}

export interface ApiChatEnvelope<T, M = null> {
  data: T;
  meta: M;
}

export interface ApiChatErrorEnvelope {
  error: {
    code: string;
    message: string;
    fields: Record<string, string>;
  };
}
