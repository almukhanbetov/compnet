import type { ChatFailure } from "@/data/i18n/chat";

export type ChatAuthor = "visitor" | "manager" | "system";

/**
 * sending → sent (server confirmed) → read (the other side has shown it),
 * or sending → failed → (retry) sending → sent. Nothing is "sent" before
 * the server's confirmation.
 */
export type ChatDeliveryStatus = "sending" | "sent" | "read" | "failed";

export interface ChatMessage {
  /** Stable React key: client_message_id for own messages, server id otherwise. */
  key: string;
  /** Server id; null until the server has stored the message. */
  id: number | null;
  clientMessageId: string | null;
  author: ChatAuthor;
  body: string;
  createdAt: string;
  status: ChatDeliveryStatus;
  /** Why the last delivery attempt failed, shown under a failed bubble. */
  error?: ChatFailure;
}

export interface ChatContact {
  name: string;
  contact: string;
}
