export type MessageAuthor = "user" | "contact" | "system";

export interface ChatMessage {
  id: string;
  author: MessageAuthor;
  text: string;
  time: string;
}

export type ContactStatus = "online" | "offline";

export interface AdminContact {
  name: string;
  role: string;
  avatarInitials: string;
  avatarGradientFrom: string;
  avatarGradientTo: string;
  status: ContactStatus;
  autoReplies: string[];
  noResponseText: string;
}
