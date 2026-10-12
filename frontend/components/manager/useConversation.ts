"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchMessages,
  markConversationRead,
  sendReply,
  setConversationStatus,
  type ManagerApiResult,
} from "@/lib/api/manager";
import { REALTIME_POLL_MS, TYPING_SEND_MS, TYPING_TTL_MS } from "@/lib/chat/config";
import { RealtimeError } from "@/lib/chat/realtime";
import { uuidV4 } from "@/lib/chat/uuid";
import { fill } from "@/lib/i18n";
import { useLocale } from "@/components/providers/LocaleProvider";
import { backoff, usePollingLoop, useSerialQueue } from "@/components/manager/usePollingLoop";
import { useManagerEvents, useManagerRealtime, useReconcileOnReconnect } from "@/components/manager/ManagerRealtime";
import type { AuthErrorHandler, Connection } from "@/components/manager/useInbox";
import type { ManagerTranslations } from "@/data/i18n/manager";
import type { ApiManagerConversation, ApiManagerMessage } from "@/types/api/manager";
import type {
  AckData,
  ManagerConversationData,
  ManagerNewMessageData,
  ManagerReadData,
  RealtimeErrorData,
  RealtimeEvent,
  TypingData,
} from "@/types/api/realtime";

/** Without a realtime socket the open conversation is polled about every 4 seconds. */
export const CONVERSATION_POLL_MS = 4_000;
const PAGE_SIZE = 30;

export interface ManagerMessage {
  key: string;
  id: number | null;
  clientMessageId: string;
  author: ApiManagerMessage["author"];
  body: string;
  staffName: string;
  createdAt: string;
  /** "sent" only after the server confirmed; "read" once the visitor has seen it. */
  status: "sending" | "sent" | "read" | "failed";
  error?: string;
}

/**
 * Replies not yet stored by the server, per conversation. It outlives the
 * conversation view, so switching away and back keeps a failed reply (and
 * its client_message_id) available for retry.
 */
export type UnsentStore = Map<string, ManagerMessage[]>;

function fromApi(m: ApiManagerMessage): ManagerMessage {
  return {
    key: m.client_message_id || `m-${m.id}`,
    id: m.id,
    clientMessageId: m.client_message_id,
    author: m.author,
    body: m.body,
    staffName: m.staff_name ?? "",
    createdAt: m.created_at,
    status: "sent",
  };
}

function mergeById(prev: ManagerMessage[], incoming: ApiManagerMessage[]): ManagerMessage[] {
  if (incoming.length === 0) return prev;
  const byId = new Map(prev.map((m) => [m.id, m]));
  for (const item of incoming) {
    byId.set(item.id, fromApi(item));
  }
  return [...byId.values()].sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
}

/** Translated reason for a failed HTTP send; server texts are never shown. */
function sendFailureText(result: ManagerApiResult<unknown>, e: ManagerTranslations["errors"]): string {
  switch (result.kind) {
    case "network_error":
      return e.network;
    case "conflict":
      return e.closed;
    case "not_found":
      return e.notFound;
    case "validation_error":
      return e.invalid;
    case "forbidden":
      return e.forbidden;
    case "rate_limited":
      return fill(e.rateLimited, { seconds: String(result.retryAfterSeconds) });
    default:
      return e.failed;
  }
}

interface Options {
  conversationId: string;
  staffName: string;
  staffId: string;
  unsentStore: UnsentStore;
  onAuthError: AuthErrorHandler;
  /** Called with every fresh server view of the conversation. */
  onConversationChange: (conv: ApiManagerConversation) => void;
  /** Called after the read marker moved (the total unread count changed). */
  onRead: () => void;
}

/**
 * Data and actions for one open conversation. The view using it is keyed by
 * the conversation id, so switching conversations unmounts it: the polling
 * loop is aborted and no response for another conversation can be applied.
 *
 * Realtime events of this conversation are applied at once; the HTTP
 * cursor (maxIdRef) only advances over contiguous HTTP pages, so after a
 * reconnect "after <cursor>" fills any gap left by missed events.
 */
export function useConversation({
  conversationId: id,
  staffName,
  staffId,
  unsentStore,
  onAuthError,
  onConversationChange,
  onRead,
}: Options) {
  const { t } = useLocale();
  const m = t.manager;
  const realtime = useManagerRealtime();
  const [conv, setConv] = useState<ApiManagerConversation | null>(null);
  const [stored, setStored] = useState<ManagerMessage[]>([]);
  const [unsent, setUnsentState] = useState<ManagerMessage[]>(() => unsentStore.get(id) ?? []);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error" | "not_found">("loading");
  const [hasOlder, setHasOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [olderLoads, setOlderLoads] = useState(0);
  const [connection, setConnection] = useState<Connection>({ kind: "online" });
  const [sendLimitedUntil, setSendLimitedUntil] = useState<number | null>(null);
  const [statusBusy, setStatusBusy] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [visitorTyping, setVisitorTyping] = useState(false);
  const [otherTyping, setOtherTyping] = useState<string | null>(null);

  const loadedRef = useRef(false);
  const maxIdRef = useRef(0);
  const minIdRef = useRef(0);
  const failuresRef = useRef(0);
  const markingRef = useRef(false);
  const sendChainRef = useRef<Promise<void>>(Promise.resolve());
  const callbacksRef = useRef({ onAuthError, onConversationChange, onRead });
  const liveRef = useRef(false);
  const typingTimersRef = useRef<{ visitor?: ReturnType<typeof setTimeout>; other?: ReturnType<typeof setTimeout> }>({});
  const lastTypingSentRef = useRef(0);
  const queue = useSerialQueue();

  useEffect(() => {
    callbacksRef.current = { onAuthError, onConversationChange, onRead };
  }, [onAuthError, onConversationChange, onRead]);
  useEffect(() => {
    liveRef.current = realtime.status === "open";
  }, [realtime.status]);
  useEffect(() => {
    const timers = typingTimersRef.current;
    return () => {
      clearTimeout(timers.visitor);
      clearTimeout(timers.other);
    };
  }, []);

  /** Updates the unsent list in state and in the store that outlives the view. */
  const updateUnsent = useCallback(
    (update: (prev: ManagerMessage[]) => ManagerMessage[]) => {
      const next = update(unsentStore.get(id) ?? []);
      if (next.length === 0) unsentStore.delete(id);
      else unsentStore.set(id, next);
      setUnsentState(next);
    },
    [id, unsentStore],
  );

  /** advanceCursor: only for contiguous HTTP pages, never realtime events. */
  const applyServer = useCallback(
    (items: ApiManagerMessage[], advanceCursor: boolean) => {
      if (items.length === 0) return;
      if (advanceCursor) {
        for (const item of items) {
          maxIdRef.current = Math.max(maxIdRef.current, item.id);
          minIdRef.current = minIdRef.current === 0 ? item.id : Math.min(minIdRef.current, item.id);
        }
      }
      setStored((prev) => mergeById(prev, items));
      const confirmed = new Set(items.map((item) => item.client_message_id));
      updateUnsent((prev) => prev.filter((msg) => !confirmed.has(msg.clientMessageId)));
    },
    [updateUnsent],
  );

  const applyConversation = useCallback((next: ApiManagerConversation) => {
    setConv(next);
    callbacksRef.current.onConversationChange(next);
  }, []);

  const handleFailure = useCallback((result: ManagerApiResult<unknown>): number | null => {
    switch (result.kind) {
      case "aborted":
        return null;
      case "unauthorized":
        callbacksRef.current.onAuthError("unauthorized");
        return null;
      case "forbidden":
        callbacksRef.current.onAuthError("forbidden");
        return null;
      case "not_found":
        setLoadState("not_found");
        return null;
      case "rate_limited":
        setConnection({ kind: "rate_limited", until: Date.now() + result.retryAfterSeconds * 1000 });
        return result.retryAfterSeconds * 1000;
      default:
        failuresRef.current += 1;
        setConnection({ kind: "offline" });
        if (!loadedRef.current) setLoadState("error");
        return backoff(failuresRef.current);
    }
  }, []);

  const step = useCallback(
    (signal: AbortSignal) =>
      queue(async (): Promise<number | null> => {
        if (signal.aborted) return null;
        const initial = !loadedRef.current;
        const result = await fetchMessages(
          id,
          initial ? { limit: PAGE_SIZE } : { after: maxIdRef.current, limit: 100 },
          signal,
        );
        if (signal.aborted) return null;
        if (result.kind !== "ok") return handleFailure(result);

        failuresRef.current = 0;
        setConnection({ kind: "online" });
        applyServer(result.data.data, true);
        applyConversation(result.data.meta.conversation);
        const idle = liveRef.current ? REALTIME_POLL_MS : CONVERSATION_POLL_MS;
        if (initial) {
          loadedRef.current = true;
          setHasOlder(result.data.meta.has_more);
          setLoadState("ready");
          return idle;
        }
        return result.data.meta.has_more ? 0 : idle;
      }),
    [id, queue, handleFailure, applyServer, applyConversation],
  );

  const refresh = usePollingLoop(step, { enabled: true, resetKey: id });
  useReconcileOnReconnect(refresh);

  const showTyping = useCallback((who: "visitor" | "other", value: boolean, name?: string) => {
    const timers = typingTimersRef.current;
    clearTimeout(timers[who]);
    if (who === "visitor") setVisitorTyping(value);
    else setOtherTyping(value ? name || m.bubble.manager : null);
    if (value) {
      timers[who] = setTimeout(() => (who === "visitor" ? setVisitorTyping(false) : setOtherTyping(null)), TYPING_TTL_MS);
    }
  }, [m.bubble.manager]);

  useManagerEvents(
    useCallback(
      (event: RealtimeEvent) => {
        if (event.conversation_id !== id) return;
        switch (event.type) {
          case "new_message": {
            const data = event.data as ManagerNewMessageData;
            if (loadedRef.current) applyServer([data.message], false);
            if (data.message.author === "visitor") showTyping("visitor", false);
            else if (data.message.staff_user_id && data.message.staff_user_id !== staffId) showTyping("other", false);
            break;
          }
          case "messages_read":
          case "conversation_updated":
            applyConversation((event.data as ManagerReadData | ManagerConversationData).conversation);
            break;
          case "typing": {
            const data = event.data as TypingData;
            if (data.from === "visitor") showTyping("visitor", data.is_typing);
            else if (data.staff_user_id && data.staff_user_id !== staffId) showTyping("other", data.is_typing, data.staff_name);
            break;
          }
          default:
            break;
        }
      },
      [id, staffId, applyServer, applyConversation, showTyping],
    ),
  );

  const loadOlder = useCallback(async () => {
    if (!hasOlder || loadingOlder || minIdRef.current === 0) return;
    setLoadingOlder(true);
    const result = await queue(() => fetchMessages(id, { before: minIdRef.current, limit: PAGE_SIZE }));
    setLoadingOlder(false);
    if (result.kind !== "ok") {
      handleFailure(result);
      return;
    }
    applyServer(result.data.data, true);
    setHasOlder(result.data.meta.has_more);
    setOlderLoads((n) => n + 1);
  }, [hasOlder, loadingOlder, id, queue, handleFailure, applyServer]);

  const markFailed = useCallback(
    (clientMessageId: string, error: string) => {
      updateUnsent((prev) =>
        prev.map((msg) => (msg.clientMessageId === clientMessageId ? { ...msg, status: "failed", error } : msg)),
      );
    },
    [updateUnsent],
  );

  /** Socket send with ack. "done" = stored or definitively refused; "fallback" = use HTTP. */
  const deliverRealtime = useCallback(
    async (clientMessageId: string, body: string): Promise<"done" | "fallback"> => {
      if (!liveRef.current) return "fallback";
      try {
        const ack = await realtime.request({ type: "send_message", conversation_id: id, client_message_id: clientMessageId, body });
        applyServer([(ack.data as AckData<ApiManagerMessage>).message], false);
        setConnection({ kind: "online" });
        return "done";
      } catch (error) {
        if (!(error instanceof RealtimeError) || error.kind !== "server") return "fallback";
        const data = error.event?.data as RealtimeErrorData | undefined;
        switch (data?.code) {
          case "rate_limited": {
            const seconds = data.retry_after_seconds ?? 5;
            setSendLimitedUntil(Date.now() + seconds * 1000);
            markFailed(clientMessageId, fill(m.errors.rateLimited, { seconds: String(seconds) }));
            return "done";
          }
          case "conflict":
            refresh(); // most likely closed meanwhile: pick up the new status
            markFailed(clientMessageId, m.errors.closed);
            return "done";
          case "not_found":
            markFailed(clientMessageId, m.errors.notFound);
            return "done";
          case "validation_error":
            markFailed(clientMessageId, m.errors.invalid);
            return "done";
          case "unauthorized":
            callbacksRef.current.onAuthError("unauthorized");
            return "done";
          default:
            return "fallback";
        }
      }
    },
    [id, realtime, applyServer, markFailed, refresh, m.errors],
  );

  const deliver = useCallback(
    async (clientMessageId: string, body: string) => {
      if ((await deliverRealtime(clientMessageId, body)) === "done") return;

      const result = await sendReply(id, clientMessageId, body);
      if (result.kind === "ok") {
        setConnection({ kind: "online" });
        applyServer([result.data.data], false);
        refresh();
        return;
      }
      if (result.kind === "unauthorized" || result.kind === "forbidden") {
        handleFailure(result);
        return;
      }
      if (result.kind === "rate_limited") {
        setSendLimitedUntil(Date.now() + result.retryAfterSeconds * 1000);
      }
      if (result.kind === "network_error") {
        setConnection({ kind: "offline" });
      }
      if (result.kind === "conflict") {
        refresh();
      }
      markFailed(clientMessageId, sendFailureText(result, m.errors));
    },
    [id, deliverRealtime, applyServer, refresh, handleFailure, markFailed, m.errors],
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
      if (!body) return;
      const clientMessageId = uuidV4();
      updateUnsent((prev) => [
        ...prev,
        {
          key: clientMessageId,
          id: null,
          clientMessageId,
          author: "manager",
          body,
          staffName,
          createdAt: new Date().toISOString(),
          status: "sending",
        },
      ]);
      lastTypingSentRef.current = 0;
      enqueue(clientMessageId, body);
    },
    [enqueue, staffName, updateUnsent],
  );

  /** Resends a failed reply with the same client_message_id. */
  const retry = useCallback(
    (clientMessageId: string) => {
      const message = (unsentStore.get(id) ?? []).find(
        (msg) => msg.clientMessageId === clientMessageId && msg.status === "failed",
      );
      if (!message) return;
      updateUnsent((prev) =>
        prev.map((msg) => (msg.clientMessageId === clientMessageId ? { ...msg, status: "sending", error: undefined } : msg)),
      );
      enqueue(clientMessageId, message.body);
    },
    [enqueue, id, unsentStore, updateUnsent],
  );

  const discard = useCallback(
    (clientMessageId: string) => {
      updateUnsent((prev) => prev.filter((msg) => !(msg.clientMessageId === clientMessageId && msg.status === "failed")));
    },
    [updateUnsent],
  );

  /** Tells the visitor (and other managers) that a reply is being typed. */
  const notifyTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingSentRef.current < TYPING_SEND_MS) return;
    if (realtime.send({ type: "typing", conversation_id: id, is_typing: true })) {
      lastTypingSentRef.current = now;
    }
  }, [id, realtime]);

  /** Moves the managers' read marker; callers pass only messages that were on screen. */
  const markRead = useCallback(
    async (lastMessageId: number) => {
      if (!conv || lastMessageId <= conv.manager_last_read_id || markingRef.current) return;
      markingRef.current = true;
      const result = await markConversationRead(id, lastMessageId);
      markingRef.current = false;
      if (result.kind === "ok") {
        applyConversation(result.data.data);
        callbacksRef.current.onRead();
      } else if (result.kind === "unauthorized" || result.kind === "forbidden") {
        handleFailure(result);
      }
    },
    [conv, id, applyConversation, handleFailure],
  );

  const setStatus = useCallback(
    async (status: "open" | "closed") => {
      setStatusBusy(true);
      setStatusError(null);
      const result = await setConversationStatus(id, status);
      setStatusBusy(false);
      if (result.kind === "ok") {
        applyConversation(result.data.data);
        return;
      }
      if (result.kind === "unauthorized" || result.kind === "forbidden") {
        handleFailure(result);
        return;
      }
      setStatusError(
        result.kind === "rate_limited"
          ? fill(m.errors.rateLimited, { seconds: String(result.retryAfterSeconds) })
          : result.kind === "network_error"
            ? m.errors.statusNetwork
            : m.errors.statusFailed,
      );
    },
    [id, applyConversation, handleFailure, m.errors],
  );

  const visitorReadId = conv?.visitor_last_read_id ?? 0;
  const messages = useMemo(() => {
    const storedIds = new Set(stored.map((msg) => msg.clientMessageId));
    const withRead = stored.map((msg) =>
      msg.author === "manager" && msg.id !== null && msg.id <= visitorReadId ? { ...msg, status: "read" as const } : msg,
    );
    return [...withRead, ...unsent.filter((msg) => !storedIds.has(msg.clientMessageId))];
  }, [stored, unsent, visitorReadId]);

  return {
    conv,
    messages,
    loadState,
    hasOlder,
    loadingOlder,
    olderLoads,
    connection,
    sendLimitedUntil,
    statusBusy,
    statusError,
    visitorTyping,
    otherTyping,
    loadOlder,
    send,
    retry,
    discard,
    markRead,
    setStatus,
    refresh,
    notifyTyping,
  };
}
