"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchConversation,
  fetchMessages,
  markRead,
  sendMessage,
  startSession,
  updateContact,
  type ChatApiResult,
} from "@/lib/api/chat";
import {
  CLOSED_POLL_MS,
  MAX_BACKOFF_MS,
  OPEN_POLL_MS,
} from "@/lib/chat/config";
import { uuidV4 } from "@/lib/chat/uuid";
import { useDocumentVisible } from "@/components/chat/useBrowserState";
import type { ApiChatConversation, ApiChatMessage } from "@/types/api/chat";
import type { ChatContact, ChatMessage } from "@/types/message";

export type ChatLoadState = "loading" | "ready" | "error";
export type ChatConnection = "online" | "offline";

export type SaveContactResult =
  | { kind: "ok" }
  | { kind: "error"; message: string; fields: Record<string, string> };

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
 * Merges server messages into the list without duplicates: a server message
 * replaces the local pending/failed bubble with the same client_message_id,
 * and a message already present by id is skipped. Stored messages are kept
 * in server-id order, unsent ones after them in the order they were written.
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

function failureText(result: ChatApiResult<unknown>): string {
  switch (result.kind) {
    case "network_error":
      return "Нет соединения с сервером. Сообщение не отправлено.";
    case "rate_limited":
      return `Слишком много сообщений подряд. Повторите через ${result.retryAfterSeconds} с.`;
    case "validation_error":
      return result.fields.body ?? result.message;
    default:
      return "Не удалось отправить сообщение. Попробуйте ещё раз.";
  }
}

/**
 * State and server sync for the visitor chat widget.
 *
 * - One polling loop, never two requests at once: the next poll is scheduled
 *   only after the previous one settles. Paused in hidden tabs, resumed on
 *   visibility/online events, aborted on unmount.
 * - Messages are delivered one at a time; each has a client_message_id that
 *   is reused on retry, so the server never stores a duplicate.
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
  const [contact, setContact] = useState<ChatContact>({ name: "", contact: "" });
  const [rateLimitedUntil, setRateLimitedUntil] = useState<number | null>(null);
  const isTabVisible = useDocumentVisible();

  const cursorRef = useRef(0);
  const bootstrappedRef = useRef(false);
  const hasConversationRef = useRef(false);
  const isOpenRef = useRef(isOpen);
  const kickRef = useRef<() => void>(() => undefined);
  const sendChainRef = useRef<Promise<void>>(Promise.resolve());
  const markingRef = useRef(false);
  const messagesRef = useRef<ChatMessage[]>([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const applyConversation = useCallback((conv: ApiChatConversation) => {
    setServerUnread(conv.unread_count);
    // The read marker only moves forward; a slow, stale response must not
    // bring back an unread badge the visitor already cleared.
    setLastReadId((prev) => Math.max(prev, conv.last_read_id));
    setContact({ name: conv.visitor_name, contact: conv.visitor_contact });
  }, []);

  const markConversation = useCallback((exists: boolean) => {
    hasConversationRef.current = exists;
    setHasConversation(exists);
  }, []);

  // Polling loop.
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
    const idleDelay = () => (isOpenRef.current ? OPEN_POLL_MS : CLOSED_POLL_MS);

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

    // Returns the delay before the next poll, or null to go idle until kicked.
    const step = async (signal: AbortSignal): Promise<number | null> => {
      if (!bootstrappedRef.current) {
        const result = await fetchConversation(signal);
        if (result.kind === "aborted") return null;
        if (result.kind !== "ok") return onFailure(result);

        onSuccess();
        bootstrappedRef.current = true;
        const conv = result.data.data;
        if (conv === null) {
          // No conversation yet: nothing can arrive until the visitor writes.
          setLoadState("ready");
          return null;
        }
        markConversation(true);
        applyConversation(conv);
        return 0;
      }

      if (!hasConversationRef.current) {
        return null;
      }

      const result = await fetchMessages(cursorRef.current, signal);
      if (result.kind === "aborted") return null;
      if (result.kind === "not_found") {
        // Cookie expired or was cleared: start over as a new visitor.
        onSuccess();
        markConversation(false);
        cursorRef.current = 0;
        setMessages([]);
        setLoadState("ready");
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
    markConversation(true);
    applyConversation(result.data.data);
    setLoadState("ready");
    return null;
  }, [applyConversation, markConversation]);

  const deliver = useCallback(
    async (clientMessageId: string, body: string) => {
      updateLocal(clientMessageId, { status: "sending", error: undefined });

      let failure = await ensureSession();
      let result: ChatApiResult<{ data: ApiChatMessage }> | null = null;
      if (failure === null) {
        result = await sendMessage(clientMessageId, body);
        if (result.kind === "not_found") {
          // The session vanished (cookie expired or cleared): start a new
          // one and retry with the same client_message_id.
          markConversation(false);
          failure = await ensureSession();
          result = failure === null ? await sendMessage(clientMessageId, body) : null;
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
          ? `Слишком много новых диалогов с этого адреса. Повторите через ${outcome.retryAfterSeconds} с.`
          : failureText(outcome),
      });
    },
    [ensureSession, markConversation, updateLocal],
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

  const saveContact = useCallback(
    async (name: string, value: string): Promise<SaveContactResult> => {
      const result = await updateContact(name.trim(), value.trim());
      if (result.kind === "ok") {
        applyConversation(result.data.data);
        return { kind: "ok" };
      }
      if (result.kind === "validation_error") {
        return { kind: "error", message: result.message, fields: result.fields };
      }
      if (result.kind === "rate_limited") {
        return {
          kind: "error",
          message: `Слишком много запросов. Повторите через ${result.retryAfterSeconds} с.`,
          fields: {},
        };
      }
      return { kind: "error", message: "Не удалось сохранить контакт. Попробуйте ещё раз.", fields: {} };
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

  // Mark as read only what the visitor can actually see.
  useEffect(() => {
    if (!isOpen || !isTabVisible || unreadCount === 0 || maxServerId === 0 || markingRef.current) {
      return;
    }
    markingRef.current = true;
    void markRead(maxServerId).then((result) => {
      markingRef.current = false;
      if (result.kind === "ok") {
        applyConversation(result.data.data);
      }
    });
  }, [isOpen, isTabVisible, unreadCount, maxServerId, applyConversation]);

  const retryLoad = useCallback(() => kickRef.current(), []);

  return {
    messages,
    loadState,
    connection,
    hasConversation,
    unreadCount,
    contact,
    rateLimitedUntil,
    send,
    retry,
    discard,
    saveContact,
    retryLoad,
  };
}
