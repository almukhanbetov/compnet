"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchMessages,
  markConversationRead,
  sendReply,
  setConversationStatus,
  type ManagerApiResult,
} from "@/lib/api/manager";
import { uuidV4 } from "@/lib/chat/uuid";
import { backoff, usePollingLoop, useSerialQueue } from "@/components/manager/usePollingLoop";
import type { AuthErrorHandler, Connection } from "@/components/manager/useInbox";
import type { ApiManagerConversation, ApiManagerMessage } from "@/types/api/manager";

/** The open conversation is polled about every 4 seconds. */
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
  status: "sending" | "sent" | "failed";
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

function sendFailureText(result: ManagerApiResult<unknown>): string {
  switch (result.kind) {
    case "network_error":
      return "Нет соединения с сервером. Ответ не отправлен.";
    case "conflict":
    case "validation_error":
    case "not_found":
    case "forbidden":
      return result.message;
    case "rate_limited":
      return `Слишком много запросов. Повторите через ${result.retryAfterSeconds} с.`;
    default:
      return "Не удалось отправить ответ. Попробуйте ещё раз.";
  }
}

interface Options {
  conversationId: string;
  staffName: string;
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
 */
export function useConversation({
  conversationId: id,
  staffName,
  unsentStore,
  onAuthError,
  onConversationChange,
  onRead,
}: Options) {
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

  const loadedRef = useRef(false);
  const maxIdRef = useRef(0);
  const minIdRef = useRef(0);
  const failuresRef = useRef(0);
  const markingRef = useRef(false);
  const sendChainRef = useRef<Promise<void>>(Promise.resolve());
  const callbacksRef = useRef({ onAuthError, onConversationChange, onRead });
  const queue = useSerialQueue();

  useEffect(() => {
    callbacksRef.current = { onAuthError, onConversationChange, onRead };
  }, [onAuthError, onConversationChange, onRead]);

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

  const applyServer = useCallback(
    (items: ApiManagerMessage[]) => {
      if (items.length === 0) return;
      for (const item of items) {
        maxIdRef.current = Math.max(maxIdRef.current, item.id);
        minIdRef.current = minIdRef.current === 0 ? item.id : Math.min(minIdRef.current, item.id);
      }
      setStored((prev) => mergeById(prev, items));
      const confirmed = new Set(items.map((item) => item.client_message_id));
      updateUnsent((prev) => prev.filter((m) => !confirmed.has(m.clientMessageId)));
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
        callbacksRef.current.onAuthError("forbidden", result.message);
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
        applyServer(result.data.data);
        applyConversation(result.data.meta.conversation);
        if (initial) {
          loadedRef.current = true;
          setHasOlder(result.data.meta.has_more);
          setLoadState("ready");
          return CONVERSATION_POLL_MS;
        }
        return result.data.meta.has_more ? 0 : CONVERSATION_POLL_MS;
      }),
    [id, queue, handleFailure, applyServer, applyConversation],
  );

  const refresh = usePollingLoop(step, { enabled: true, resetKey: id });

  const loadOlder = useCallback(async () => {
    if (!hasOlder || loadingOlder || minIdRef.current === 0) return;
    setLoadingOlder(true);
    const result = await queue(() => fetchMessages(id, { before: minIdRef.current, limit: PAGE_SIZE }));
    setLoadingOlder(false);
    if (result.kind !== "ok") {
      handleFailure(result);
      return;
    }
    applyServer(result.data.data);
    setHasOlder(result.data.meta.has_more);
    setOlderLoads((n) => n + 1);
  }, [hasOlder, loadingOlder, id, queue, handleFailure, applyServer]);

  const deliver = useCallback(
    async (clientMessageId: string, body: string) => {
      const result = await sendReply(id, clientMessageId, body);
      if (result.kind === "ok") {
        setConnection({ kind: "online" });
        applyServer([result.data.data]);
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
        refresh(); // most likely closed meanwhile: pick up the new status
      }
      updateUnsent((prev) =>
        prev.map((m) =>
          m.clientMessageId === clientMessageId ? { ...m, status: "failed", error: sendFailureText(result) } : m,
        ),
      );
    },
    [id, applyServer, refresh, handleFailure, updateUnsent],
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
      enqueue(clientMessageId, body);
    },
    [enqueue, staffName, updateUnsent],
  );

  /** Resends a failed reply with the same client_message_id. */
  const retry = useCallback(
    (clientMessageId: string) => {
      const message = (unsentStore.get(id) ?? []).find(
        (m) => m.clientMessageId === clientMessageId && m.status === "failed",
      );
      if (!message) return;
      updateUnsent((prev) =>
        prev.map((m) => (m.clientMessageId === clientMessageId ? { ...m, status: "sending", error: undefined } : m)),
      );
      enqueue(clientMessageId, message.body);
    },
    [enqueue, id, unsentStore, updateUnsent],
  );

  const discard = useCallback(
    (clientMessageId: string) => {
      updateUnsent((prev) => prev.filter((m) => !(m.clientMessageId === clientMessageId && m.status === "failed")));
    },
    [updateUnsent],
  );

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
          ? `Слишком много запросов. Повторите через ${result.retryAfterSeconds} с.`
          : result.kind === "network_error"
            ? "Нет соединения с сервером. Статус не изменён."
            : "Не удалось изменить статус диалога.",
      );
    },
    [id, applyConversation, handleFailure],
  );

  const messages = useMemo(() => {
    const storedIds = new Set(stored.map((m) => m.clientMessageId));
    return [...stored, ...unsent.filter((m) => !storedIds.has(m.clientMessageId))];
  }, [stored, unsent]);

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
    loadOlder,
    send,
    retry,
    discard,
    markRead,
    setStatus,
    refresh,
  };
}
