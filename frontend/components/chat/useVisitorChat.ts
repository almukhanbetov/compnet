"use client";

import type { ChatFailure } from "@/data/i18n/chat";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchConversation,
  fetchHistory,
  fetchMessages,
  markRead,
  sendMessage,
  startSession,
  updateContact,
  type ChatApiResult,
} from "@/lib/api/chat";
import {
  CLOSED_POLL_MS,
  HISTORY_PAGE,
  MAX_BACKOFF_MS,
  OPEN_POLL_MS,
  REALTIME_POLL_MS,
  TYPING_SEND_MS,
  TYPING_TTL_MS,
  VISITOR_PAUSE_HIDDEN_MS,
} from "@/lib/chat/config";
import { RealtimeError } from "@/lib/chat/realtime";
import { analyticsSessionId } from "@/lib/analytics/tracker";
import { uuidV4 } from "@/lib/chat/uuid";
import { useDocumentVisible } from "@/components/chat/useBrowserState";
import { useRealtime } from "@/components/chat/useRealtime";
import type { ApiChatConversation, ApiChatMessage } from "@/types/api/chat";
import type {
  AckData,
  PresenceData,
  RealtimeErrorData,
  RealtimeEvent,
  TypingData,
  VisitorConversationData,
  VisitorNewMessageData,
  VisitorReadData,
} from "@/types/api/realtime";
import type { ChatContact, ChatMessage } from "@/types/message";

export type ChatLoadState = "loading" | "ready" | "error";
export type ChatConnection = "online" | "offline";

export type SaveContactResult =
  | { kind: "ok" }
  | { kind: "error"; failure: ChatFailure; fields: Record<string, string> };

/** Newest messages loaded when the widget starts. */
const INITIAL_PAGE = 50;

function fromApi(m: ApiChatMessage): ChatMessage {
  return {
    key: m.client_message_id ?? `m-${m.id}`,
    id: m.id,
    clientMessageId: m.client_message_id ?? null,
    author: m.author,
    body: m.body,
    createdAt: m.created_at,
    status: "sent",
  };
}

/**
 * Merges server messages into the list without duplicates, whichever way
 * they arrived (HTTP page, realtime event, ack): a server message replaces
 * the local pending/failed bubble with the same client_message_id, and a
 * message already present by id is skipped. Stored messages are kept in
 * server-id order, unsent ones after them in the order they were written.
 */
function mergeMessages(prev: ChatMessage[], incoming: ApiChatMessage[]): ChatMessage[] {
  if (incoming.length === 0) {
    return prev;
  }
  const next = [...prev];
  const knownIds = new Set(next.map((m) => m.id).filter((id): id is number => id !== null));

  for (const item of incoming) {
    if (knownIds.has(item.id)) {
      continue;
    }
    const local = item.client_message_id
      ? next.findIndex((m) => m.clientMessageId === item.client_message_id)
      : -1;
    if (local >= 0) {
      next[local] = fromApi(item);
    } else {
      next.push(fromApi(item));
    }
    knownIds.add(item.id);
  }

  const stored = next.filter((m) => m.id !== null).sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
  const unsent = next.filter((m) => m.id === null);
  return [...stored, ...unsent];
}

function deliveryFailure(result: ChatApiResult<unknown>): ChatFailure {
  switch (result.kind) {
    case "network_error":
      return { code: "network" };
    case "rate_limited":
      return { code: "rateLimited", seconds: result.retryAfterSeconds };
    case "validation_error":
      return result.fields.body
        ? { code: "field", field: "body", message: result.fields.body }
        : { code: "invalid" };
    default:
      return { code: "sendFailed" };
  }
}

/**
 * State and server sync for the visitor chat widget.
 *
 * - PostgreSQL (through the HTTP API) is the source of truth. The realtime
 *   socket delivers changes instantly; after every (re)connect the hook
 *   re-reads the API, so nothing missed while disconnected is lost.
 * - The HTTP cursor only advances over contiguous HTTP pages ("after <id>"),
 *   never on a realtime event, so a gap can always be filled.
 * - Polling never stops: every 4/20 s without a socket (the fallback), once
 *   a minute as a safety net with one. Paused in hidden tabs.
 * - Messages are delivered one at a time with a client_message_id reused on
 *   every retry (socket or HTTP), so the server never stores a duplicate.
 *   A bubble is "sent" only after the server's confirmation.
 * - The conversation (cookie) is created by POST /chat/session before the
 *   first message, never as a side effect of sending.
 */
export function useVisitorChat(isOpen: boolean) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadState, setLoadState] = useState<ChatLoadState>("loading");
  const [connection, setConnection] = useState<ChatConnection>("online");
  const [hasConversation, setHasConversation] = useState(false);
  const [serverUnread, setServerUnread] = useState(0);
  const [lastReadId, setLastReadId] = useState(0);
  const [peerReadId, setPeerReadId] = useState(0);
  const [status, setStatus] = useState<"open" | "closed">("open");
  const [contact, setContact] = useState<ChatContact>({ name: "", contact: "" });
  const [rateLimitedUntil, setRateLimitedUntil] = useState<number | null>(null);
  const [managersOnline, setManagersOnline] = useState(false);
  const [managerTyping, setManagerTyping] = useState(false);
  const [hasOlder, setHasOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [olderLoads, setOlderLoads] = useState(0);
  const [atBottom, setAtBottom] = useState(true);
  const isTabVisible = useDocumentVisible();

  const cursorRef = useRef(0);
  const bootstrappedRef = useRef(false);
  const historyLoadedRef = useRef(false);
  const refreshConversationRef = useRef(false);
  const hasConversationRef = useRef(false);
  const isOpenRef = useRef(isOpen);
  const kickRef = useRef<() => void>(() => undefined);
  const sendChainRef = useRef<Promise<void>>(Promise.resolve());
  const markingRef = useRef(false);
  const messagesRef = useRef<ChatMessage[]>([]);
  const realtimeOpenRef = useRef(false);
  const socketBoundRef = useRef(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentRef = useRef(0);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const applyConversation = useCallback((conv: ApiChatConversation) => {
    setServerUnread(conv.unread_count);
    // Read markers only move forward; a slow, stale response must not
    // bring back an unread badge or un-read a message.
    setLastReadId((prev) => Math.max(prev, conv.last_read_id));
    setPeerReadId((prev) => Math.max(prev, conv.manager_last_read_id ?? 0));
    setStatus(conv.status);
    setContact({ name: conv.visitor_name, contact: conv.visitor_contact });
  }, []);

  const markConversation = useCallback((exists: boolean) => {
    hasConversationRef.current = exists;
    setHasConversation(exists);
  }, []);

  const showManagerTyping = useCallback((typing: boolean) => {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    setManagerTyping(typing);
    if (typing) {
      typingTimerRef.current = setTimeout(() => setManagerTyping(false), TYPING_TTL_MS);
    }
  }, []);

  // Realtime events: applied at once, deduplicated by the same merge.
  const handleEvent = useCallback(
    (event: RealtimeEvent) => {
      switch (event.type) {
        case "new_message": {
          const data = event.data as VisitorNewMessageData;
          setMessages((prev) => mergeMessages(prev, [data.message]));
          setServerUnread(data.unread_count);
          if (data.message.author !== "visitor") showManagerTyping(false);
          if (data.message.author === "visitor") setStatus("open"); // a visitor message reopens
          break;
        }
        case "messages_read": {
          const data = event.data as VisitorReadData;
          if (data.reader === "manager") setPeerReadId((prev) => Math.max(prev, data.last_read_id));
          else setLastReadId((prev) => Math.max(prev, data.last_read_id));
          setServerUnread(data.unread_count);
          break;
        }
        case "conversation_updated":
          applyConversation((event.data as VisitorConversationData).conversation);
          break;
        case "typing": {
          const data = event.data as TypingData;
          if (data.from === "manager") showManagerTyping(data.is_typing);
          break;
        }
        case "presence": {
          const data = event.data as PresenceData;
          if (data.subject === "managers") setManagersOnline(Boolean(data.managers_online));
          break;
        }
        default:
          break; // acks/errors are answered through request()
      }
    },
    [applyConversation, showManagerTyping],
  );

  const realtime = useRealtime({
    path: "/api/v1/chat/ws",
    // Only visitors who opened the chat or already have a conversation hold
    // a socket; others never connect.
    enabled: hasConversation || isOpen,
    // Reconnect once the conversation exists, so the socket is bound to it.
    connectionKey: hasConversation ? "conversation" : "none",
    pauseWhenHiddenMs: VISITOR_PAUSE_HIDDEN_MS,
    onEvent: handleEvent,
    onOpen: () => {
      socketBoundRef.current = hasConversationRef.current;
      refreshConversationRef.current = true;
      kickRef.current(); // reconcile with PostgreSQL after every (re)connect
    },
  });
  const realtimeOpen = realtime.status === "open";

  useEffect(() => {
    realtimeOpenRef.current = realtimeOpen;
    if (!realtimeOpen) socketBoundRef.current = false;
    // Socket lost: poll now and at the fallback rate until it is back.
    kickRef.current();
  }, [realtimeOpen]);

  // Polling loop: the fallback without a socket, a safety net with one.
  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let inFlight = false;
    let rerun = false;
    let failures = 0;
    let controller: AbortController | null = null;

    const clear = () => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    };
    const schedule = (ms: number) => {
      clear();
      if (!disposed) {
        timer = setTimeout(run, ms);
      }
    };
    const idleDelay = () =>
      realtimeOpenRef.current ? REALTIME_POLL_MS : isOpenRef.current ? OPEN_POLL_MS : CLOSED_POLL_MS;

    const onFailure = (result: ChatApiResult<unknown>): number => {
      if (result.kind === "rate_limited") {
        return result.retryAfterSeconds * 1000;
      }
      failures += 1;
      setConnection("offline");
      if (messagesRef.current.length === 0) {
        setLoadState((prev) => (prev === "ready" ? prev : "error"));
      }
      return Math.min(MAX_BACKOFF_MS, 2000 * 2 ** (failures - 1));
    };

    const onSuccess = () => {
      failures = 0;
      setConnection("online");
    };

    const resetConversation = () => {
      markConversation(false);
      historyLoadedRef.current = false;
      cursorRef.current = 0;
      setMessages([]);
      setLoadState("ready");
    };

    // Returns the delay before the next poll, or null to go idle until kicked.
    const step = async (signal: AbortSignal): Promise<number | null> => {
      if (!bootstrappedRef.current || refreshConversationRef.current) {
        refreshConversationRef.current = false;
        const result = await fetchConversation(signal);
        if (result.kind === "aborted") return null;
        if (result.kind !== "ok") return onFailure(result);

        onSuccess();
        bootstrappedRef.current = true;
        setManagersOnline(result.data.meta?.managers_online ?? false);
        const conv = result.data.data;
        if (conv === null) {
          // No conversation yet: nothing can arrive until the visitor writes.
          if (hasConversationRef.current) resetConversation();
          setLoadState("ready");
          return null;
        }
        markConversation(true);
        applyConversation(conv);
      }

      if (!hasConversationRef.current) {
        return null;
      }

      if (!historyLoadedRef.current) {
        // First load: the newest page; older history on demand.
        const result = await fetchHistory(0, INITIAL_PAGE, signal);
        if (result.kind === "aborted") return null;
        if (result.kind === "not_found") {
          onSuccess();
          resetConversation();
          return null;
        }
        if (result.kind !== "ok") return onFailure(result);

        onSuccess();
        const items = result.data.data;
        historyLoadedRef.current = true;
        cursorRef.current = items.length > 0 ? items[items.length - 1].id : 0;
        setMessages((prev) => mergeMessages(prev, items));
        setHasOlder(result.data.meta.has_more);
        setServerUnread(result.data.meta.unread_count);
        setLastReadId((prev) => Math.max(prev, result.data.meta.last_read_id));
        setPeerReadId((prev) => Math.max(prev, result.data.meta.manager_last_read_id ?? 0));
        setStatus(result.data.meta.status ?? "open");
        setLoadState("ready");
        return idleDelay();
      }

      const result = await fetchMessages(cursorRef.current, signal);
      if (result.kind === "aborted") return null;
      if (result.kind === "not_found") {
        // Cookie expired or was cleared: start over as a new visitor.
        onSuccess();
        resetConversation();
        return null;
      }
      if (result.kind !== "ok") return onFailure(result);

      onSuccess();
      const items = result.data.data;
      if (items.length > 0) {
        cursorRef.current = Math.max(cursorRef.current, items[items.length - 1].id);
        setMessages((prev) => mergeMessages(prev, items));
      }
      setServerUnread(result.data.meta.unread_count);
      setLastReadId((prev) => Math.max(prev, result.data.meta.last_read_id));
      setPeerReadId((prev) => Math.max(prev, result.data.meta.manager_last_read_id ?? 0));
      if (result.data.meta.status) setStatus(result.data.meta.status);
      setLoadState("ready");
      return result.data.meta.has_more ? 0 : idleDelay();
    };

    const run = async () => {
      timer = null;
      if (disposed || document.visibilityState === "hidden") {
        return; // the visibility handler resumes polling
      }
      if (inFlight) {
        rerun = true;
        return;
      }
      inFlight = true;
      controller = new AbortController();
      const delay = await step(controller.signal);
      inFlight = false;
      controller = null;
      if (disposed) {
        return;
      }
      if (rerun) {
        rerun = false;
        schedule(0);
      } else if (delay !== null) {
        schedule(delay);
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        schedule(0);
      } else {
        clear();
      }
    };
    const onOnline = () => schedule(0);

    kickRef.current = () => schedule(0);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);
    schedule(0);

    return () => {
      disposed = true;
      clear();
      controller?.abort();
      kickRef.current = () => undefined;
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
    };
  }, [applyConversation, markConversation]);

  // Poll right away when the window opens; the loop picks the faster rate.
  useEffect(() => {
    isOpenRef.current = isOpen;
    if (isOpen) {
      kickRef.current();
    }
  }, [isOpen]);

  useEffect(
    () => () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    },
    [],
  );

  const updateLocal = useCallback((clientMessageId: string, patch: Partial<ChatMessage>) => {
    setMessages((prev) =>
      prev.map((m) => (m.clientMessageId === clientMessageId && m.id === null ? { ...m, ...patch } : m)),
    );
  }, []);

  /** Makes sure a conversation (and cookie) exists before sending. */
  const ensureSession = useCallback(async (): Promise<ChatApiResult<unknown> | null> => {
    if (hasConversationRef.current) {
      return null;
    }
    const result = await startSession(`${window.location.origin}${window.location.pathname}`);
    if (result.kind !== "ok") {
      return result;
    }
    bootstrappedRef.current = true;
    historyLoadedRef.current = true; // a new conversation has no history
    markConversation(true);
    applyConversation(result.data.data);
    setLoadState("ready");
    return null;
  }, [applyConversation, markConversation]);

  /**
   * Sends over the socket when it is bound to the conversation. Returns
   * "done" (stored or definitively refused) or "fallback" (try HTTP).
   */
  const deliverRealtime = useCallback(
    async (clientMessageId: string, body: string): Promise<"done" | "fallback"> => {
      if (!socketBoundRef.current || !realtimeOpenRef.current) return "fallback";
      try {
        const ack = await realtime.request({
          type: "send_message",
          client_message_id: clientMessageId,
          body,
          analytics_session_id: analyticsSessionId(),
        });
        const data = ack.data as AckData<ApiChatMessage>;
        setMessages((prev) => mergeMessages(prev, [data.message]));
        setConnection("online");
        return "done";
      } catch (error) {
        if (!(error instanceof RealtimeError) || error.kind !== "server") {
          return "fallback"; // timeout or socket closed: HTTP with the same id
        }
        const data = error.event?.data as RealtimeErrorData | undefined;
        switch (data?.code) {
          case "rate_limited": {
            const seconds = data.retry_after_seconds ?? 5;
            setRateLimitedUntil(Date.now() + seconds * 1000);
            updateLocal(clientMessageId, { status: "failed", error: { code: "rateLimited", seconds } });
            return "done";
          }
          case "validation_error":
            updateLocal(clientMessageId, {
              status: "failed",
              error: data.fields?.body ? { code: "field", field: "body", message: data.fields.body } : { code: "invalid" },
            });
            return "done";
          case "conflict":
            updateLocal(clientMessageId, { status: "failed", error: { code: "sendFailed" } });
            return "done";
          default:
            return "fallback"; // not_found (session gone) or internal: HTTP handles both
        }
      }
    },
    [realtime, updateLocal],
  );

  const deliver = useCallback(
    async (clientMessageId: string, body: string) => {
      updateLocal(clientMessageId, { status: "sending", error: undefined });

      let failure = await ensureSession();
      if (failure === null && (await deliverRealtime(clientMessageId, body)) === "done") {
        return;
      }

      let result: ChatApiResult<{ data: ApiChatMessage }> | null = null;
      if (failure === null) {
        result = await sendMessage(clientMessageId, body, analyticsSessionId());
        if (result.kind === "not_found") {
          // The session vanished (cookie expired or cleared): start a new
          // one and retry with the same client_message_id.
          markConversation(false);
          failure = await ensureSession();
          result = failure === null ? await sendMessage(clientMessageId, body, analyticsSessionId()) : null;
        }
      }

      const outcome = failure ?? result;
      if (outcome?.kind === "ok" && result?.kind === "ok") {
        const saved = result.data.data;
        setMessages((prev) => mergeMessages(prev, [saved]));
        setConnection("online");
        kickRef.current(); // fetch anything that arrived meanwhile
        return;
      }
      if (outcome === null) {
        return;
      }
      if (outcome.kind === "rate_limited") {
        setRateLimitedUntil(Date.now() + outcome.retryAfterSeconds * 1000);
      }
      if (outcome.kind === "network_error") {
        setConnection("offline");
      }
      const sessionLimited = failure !== null && outcome.kind === "rate_limited";
      updateLocal(clientMessageId, {
        status: "failed",
        error: sessionLimited
          ? { code: "sessionRateLimited", seconds: outcome.retryAfterSeconds }
          : deliveryFailure(outcome),
      });
    },
    [deliverRealtime, ensureSession, markConversation, updateLocal],
  );

  const enqueue = useCallback(
    (clientMessageId: string, body: string) => {
      sendChainRef.current = sendChainRef.current.then(() => deliver(clientMessageId, body));
    },
    [deliver],
  );

  const send = useCallback(
    (text: string) => {
      const body = text.trim();
      if (!body) {
        return;
      }
      const clientMessageId = uuidV4();
      setMessages((prev) => [
        ...prev,
        {
          key: clientMessageId,
          id: null,
          clientMessageId,
          author: "visitor",
          body,
          createdAt: new Date().toISOString(),
          status: "sending",
        },
      ]);
      lastTypingSentRef.current = 0;
      enqueue(clientMessageId, body);
    },
    [enqueue],
  );

  /** Resends a failed message with the same client_message_id. */
  const retry = useCallback(
    (clientMessageId: string) => {
      const message = messagesRef.current.find(
        (m) => m.clientMessageId === clientMessageId && m.status === "failed",
      );
      if (message) {
        updateLocal(clientMessageId, { status: "sending", error: undefined });
        enqueue(clientMessageId, message.body);
      }
    },
    [enqueue, updateLocal],
  );

  /** Removes a failed message from the screen (it was never stored). */
  const discard = useCallback((clientMessageId: string) => {
    setMessages((prev) =>
      prev.filter((m) => !(m.clientMessageId === clientMessageId && m.status === "failed")),
    );
  }, []);

  /** Tells the manager the visitor is typing (throttled, socket only). */
  const notifyTyping = useCallback(() => {
    if (!socketBoundRef.current) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current < TYPING_SEND_MS) return;
    lastTypingSentRef.current = now;
    realtime.send({ type: "typing", is_typing: true });
  }, [realtime]);

  const loadOlder = useCallback(async () => {
    const oldest = messagesRef.current.find((m) => m.id !== null)?.id ?? 0;
    if (!hasOlder || loadingOlder || oldest === 0) return;
    setLoadingOlder(true);
    const result = await fetchHistory(oldest, HISTORY_PAGE);
    setLoadingOlder(false);
    if (result.kind !== "ok") {
      if (result.kind === "network_error") setConnection("offline");
      return;
    }
    setMessages((prev) => mergeMessages(prev, result.data.data));
    setHasOlder(result.data.meta.has_more);
    setOlderLoads((n) => n + 1);
  }, [hasOlder, loadingOlder]);

  const saveContact = useCallback(
    async (name: string, value: string): Promise<SaveContactResult> => {
      const result = await updateContact(name.trim(), value.trim());
      if (result.kind === "ok") {
        applyConversation(result.data.data);
        return { kind: "ok" };
      }
      if (result.kind === "validation_error") {
        return { kind: "error", failure: { code: "invalid" }, fields: result.fields };
      }
      if (result.kind === "rate_limited") {
        return {
          kind: "error",
          failure: { code: "contactRateLimited", seconds: result.retryAfterSeconds },
          fields: {},
        };
      }
      return { kind: "error", failure: { code: "contactFailed" }, fields: {} };
    },
    [applyConversation],
  );

  const maxServerId = useMemo(
    () => messages.reduce((max, m) => (m.id !== null && m.id > max ? m.id : max), 0),
    [messages],
  );

  // Unread = loaded incoming messages after the read marker. Until the
  // history is loaded, fall back to the server's count.
  const unreadCount = useMemo(() => {
    if (loadState !== "ready") {
      return serverUnread;
    }
    return messages.filter((m) => m.id !== null && m.author !== "visitor" && m.id > lastReadId).length;
  }, [loadState, serverUnread, messages, lastReadId]);

  // "Read" only when the visitor can actually see the newest messages: the
  // window is open, the tab visible and the list scrolled to the end.
  useEffect(() => {
    if (!isOpen || !isTabVisible || !atBottom || unreadCount === 0 || maxServerId === 0 || markingRef.current) {
      return;
    }
    markingRef.current = true;
    void markRead(maxServerId).then((result) => {
      markingRef.current = false;
      if (result.kind === "ok") {
        applyConversation(result.data.data);
      }
    });
  }, [isOpen, isTabVisible, atBottom, unreadCount, maxServerId, applyConversation]);

  // Own messages the managers have read show as "read".
  const visibleMessages = useMemo(
    () =>
      messages.map((m) =>
        m.author === "visitor" && m.status === "sent" && m.id !== null && m.id <= peerReadId
          ? { ...m, status: "read" as const }
          : m,
      ),
    [messages, peerReadId],
  );

  const retryLoad = useCallback(() => kickRef.current(), []);

  return {
    messages: visibleMessages,
    loadState,
    connection,
    realtime: realtime.status,
    hasConversation,
    status,
    unreadCount,
    contact,
    rateLimitedUntil,
    // Only claimed while our own socket confirms it.
    managersOnline: realtimeOpen && managersOnline,
    managerTyping: realtimeOpen && managerTyping,
    hasOlder,
    loadingOlder,
    olderLoads,
    send,
    retry,
    discard,
    saveContact,
    retryLoad,
    loadOlder,
    notifyTyping,
    setAtBottom,
  };
}
