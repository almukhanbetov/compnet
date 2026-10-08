/**
 * The visitor chat widget stays off until the manager section exists, so
 * visitors never write into a chat nobody can read. Enable it with
 * NEXT_PUBLIC_CHAT_WIDGET_ENABLED=true at build time (Next.js inlines
 * NEXT_PUBLIC_* values into the bundle; changing it later needs a rebuild).
 */
export const chatWidgetEnabled =
  process.env.NEXT_PUBLIC_CHAT_WIDGET_ENABLED === "true";

/** Poll interval while the chat window is open and the tab is visible. */
export const OPEN_POLL_MS = 4_000;
/** Poll interval while the window is closed (keeps the unread badge fresh). */
export const CLOSED_POLL_MS = 20_000;
/** Upper bound for the back-off after failed polls. */
export const MAX_BACKOFF_MS = 30_000;
/** Must match chat.MaxBodyLength on the backend. */
export const MAX_MESSAGE_LENGTH = 2000;
