import type { RealtimeEvent, RealtimeFrame } from "@/types/api/realtime";

/**
 * One self-healing WebSocket to the chat backend.
 *
 * - Reconnects with exponential backoff and full jitter (so a restarted
 *   server is not hit by every tab at the same moment).
 * - Sends an application ping every 25 s and reconnects if the pong does
 *   not come back: browsers do not surface protocol pings, and a dead
 *   network can otherwise leave a socket "open" for minutes.
 * - Close code 4401 (session ended) stops for good: the page must log in.
 * - It never decides what is true: after every (re)connect the owner
 *   re-reads the HTTP API (onOpen), so events missed while disconnected —
 *   or lost between a commit and its publish — are recovered from
 *   PostgreSQL. Until then, and whenever the socket is down, the owner keeps
 *   its HTTP polling running as the fallback.
 */

export type RealtimeStatus = "idle" | "connecting" | "open" | "reconnecting" | "stopped";

export interface RealtimeOptions {
  /** Absolute ws:// or wss:// URL. */
  url: string;
  onEvent: (event: RealtimeEvent) => void;
  onStatus: (status: RealtimeStatus) => void;
  /** Called on every successful (re)connect, before any event. */
  onOpen?: () => void;
  /** The server ended the session (logout, expiry). No reconnect. */
  onSessionEnded?: () => void;
  /** Close the socket after the tab has been hidden this long (ms). */
  pauseWhenHiddenMs?: number;
}

export class RealtimeError extends Error {
  constructor(
    readonly kind: "timeout" | "closed" | "server",
    readonly event?: RealtimeEvent,
  ) {
    super(kind);
  }
}

const HEARTBEAT_MS = 25_000;
const PONG_TIMEOUT_MS = 10_000;
const BACKOFF_BASE_MS = 1_000;
const BACKOFF_MAX_MS = 30_000;
const SESSION_ENDED = 4401;

interface Pending {
  resolve: (event: RealtimeEvent) => void;
  reject: (error: RealtimeError) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class RealtimeConnection {
  private socket: WebSocket | null = null;
  private status: RealtimeStatus = "idle";
  private attempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private hiddenTimer: ReturnType<typeof setTimeout> | null = null;
  private pausedForHidden = false;
  private stopped = false;
  private pending = new Map<string, Pending>();
  private seq = 0;

  constructor(private readonly options: RealtimeOptions) {}

  start(): void {
    this.stopped = false;
    document.addEventListener("visibilitychange", this.onVisibility);
    window.addEventListener("online", this.onOnline);
    this.connect();
  }

  stop(): void {
    this.stopped = true;
    document.removeEventListener("visibilitychange", this.onVisibility);
    window.removeEventListener("online", this.onOnline);
    this.clearTimers();
    this.failPending();
    const socket = this.socket;
    this.socket = null;
    if (socket && socket.readyState <= WebSocket.OPEN) {
      socket.close(1000, "");
    }
    this.setStatus("stopped");
  }

  get isOpen(): boolean {
    return this.status === "open";
  }

  /** Fire-and-forget frame; false if the socket is not open. */
  send(frame: RealtimeFrame): boolean {
    if (!this.socket || this.status !== "open") return false;
    this.socket.send(JSON.stringify(frame));
    return true;
  }

  /**
   * Sends a frame and resolves with the server's answer (ack or pong);
   * rejects with "server" on an error event, "timeout" or "closed".
   */
  request(frame: RealtimeFrame, timeoutMs = 8_000): Promise<RealtimeEvent> {
    if (!this.socket || this.status !== "open") {
      return Promise.reject(new RealtimeError("closed"));
    }
    const requestId = `r${Date.now().toString(36)}${(this.seq += 1)}`;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new RealtimeError("timeout"));
      }, timeoutMs);
      this.pending.set(requestId, { resolve, reject, timer });
      this.socket?.send(JSON.stringify({ ...frame, request_id: requestId }));
    });
  }

  private connect(): void {
    if (this.stopped || this.pausedForHidden) return;
    this.clearReconnect();
    this.setStatus(this.attempts === 0 ? "connecting" : "reconnecting");

    let socket: WebSocket;
    try {
      socket = new WebSocket(this.options.url);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.socket = socket;

    socket.onopen = () => {
      if (this.socket !== socket) return;
      this.attempts = 0;
      this.setStatus("open");
      this.startHeartbeat();
      this.options.onOpen?.();
    };
    socket.onmessage = (message) => {
      if (this.socket !== socket || typeof message.data !== "string") return;
      let event: RealtimeEvent;
      try {
        event = JSON.parse(message.data) as RealtimeEvent;
      } catch {
        return;
      }
      if (event.request_id && this.pending.has(event.request_id)) {
        const entry = this.pending.get(event.request_id);
        this.pending.delete(event.request_id);
        if (entry) {
          clearTimeout(entry.timer);
          if (event.type === "error") entry.reject(new RealtimeError("server", event));
          else entry.resolve(event);
        }
        if (event.type === "pong") return;
      }
      this.options.onEvent(event);
    };
    socket.onclose = (close) => {
      if (this.socket !== socket) return;
      this.socket = null;
      this.stopHeartbeat();
      this.failPending();
      if (close.code === SESSION_ENDED) {
        this.stopped = true;
        this.setStatus("stopped");
        this.options.onSessionEnded?.();
        return;
      }
      if (!this.stopped && !this.pausedForHidden) {
        this.scheduleReconnect();
      }
    };
    // onerror is always followed by onclose, which handles everything.
    socket.onerror = () => undefined;
  }

  private scheduleReconnect(): void {
    if (this.stopped) return;
    this.attempts += 1;
    const ceiling = Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** Math.min(this.attempts - 1, 10));
    const delay = Math.max(300, Math.random() * ceiling); // full jitter
    this.setStatus("reconnecting");
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.request({ type: "ping" }, PONG_TIMEOUT_MS).catch((error: RealtimeError) => {
        if (error.kind === "timeout" && this.socket) {
          // No pong: the connection is dead even if the browser has not
          // noticed yet. Drop it and reconnect.
          this.forceReconnect();
        }
      });
    }, HEARTBEAT_MS);
  }

  private forceReconnect(): void {
    const socket = this.socket;
    this.socket = null;
    this.stopHeartbeat();
    this.failPending();
    socket?.close(4000, "heartbeat timeout");
    this.scheduleReconnect();
  }

  private readonly onVisibility = () => {
    const delay = this.options.pauseWhenHiddenMs;
    if (delay === undefined) return;
    if (document.visibilityState === "hidden") {
      this.hiddenTimer = setTimeout(() => {
        this.pausedForHidden = true;
        const socket = this.socket;
        this.socket = null;
        this.stopHeartbeat();
        this.failPending();
        socket?.close(1000, "hidden");
        this.setStatus("idle");
      }, delay);
      return;
    }
    if (this.hiddenTimer) {
      clearTimeout(this.hiddenTimer);
      this.hiddenTimer = null;
    }
    if (this.pausedForHidden) {
      this.pausedForHidden = false;
      this.attempts = 0;
      this.connect();
    }
  };

  private readonly onOnline = () => {
    if (!this.stopped && !this.socket && !this.pausedForHidden) {
      this.attempts = 0;
      this.connect();
    }
  };

  private setStatus(status: RealtimeStatus): void {
    if (this.status === status) return;
    this.status = status;
    this.options.onStatus(status);
  }

  private failPending(): void {
    for (const entry of this.pending.values()) {
      clearTimeout(entry.timer);
      entry.reject(new RealtimeError("closed"));
    }
    this.pending.clear();
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private clearReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private clearTimers(): void {
    this.clearReconnect();
    this.stopHeartbeat();
    if (this.hiddenTimer) {
      clearTimeout(this.hiddenTimer);
      this.hiddenTimer = null;
    }
  }
}

/** ws(s):// URL for an API path, derived from NEXT_PUBLIC_API_URL. */
export function realtimeUrl(path: string): string | null {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) return null;
  return base.replace(/^http/, "ws").replace(/\/$/, "") + path;
}
