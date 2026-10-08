export type ChatAuthor = "visitor" | "manager" | "system";

/** sending → sent, or sending → failed → (retry) sending → sent. */
export type ChatDeliveryStatus = "sending" | "sent" | "failed";

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
  error?: string;
}

export interface ChatContact {
  name: string;
  contact: string;
}
