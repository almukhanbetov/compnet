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
/**
 * Safety-net poll while the realtime socket is connected: events arrive
 * instantly, this only catches anything a socket might have missed.
 */
export const REALTIME_POLL_MS = 60_000;
/** A visitor tab hidden this long drops its socket (reconnects when shown). */
export const VISITOR_PAUSE_HIDDEN_MS = 120_000;
/** Older history page size (visitor). */
export const HISTORY_PAGE = 30;
/** How long a "typing…" notice stays without a fresh signal. */
export const TYPING_TTL_MS = 6_000;
/** Minimum interval between own typing signals. */
export const TYPING_SEND_MS = 2_500;
/** Upper bound for the back-off after failed polls. */
export const MAX_BACKOFF_MS = 30_000;
/** Must match chat.MaxBodyLength on the backend. */
export const MAX_MESSAGE_LENGTH = 2000;
