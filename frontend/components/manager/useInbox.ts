"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchConversations, fetchUnreadCount, type ManagerApiResult } from "@/lib/api/manager";
import { backoff, usePollingLoop, useSerialQueue } from "@/components/manager/usePollingLoop";
import { useManagerEvents, useManagerRealtime, useReconcileOnReconnect } from "@/components/manager/ManagerRealtime";
import { REALTIME_POLL_MS } from "@/lib/chat/config";
import type {
  ApiInboxItem,
  ApiInboxMeta,
  ApiManagerConversation,
  ApiUnreadCount,
  InboxFilter,
} from "@/types/api/manager";
import type { ManagerConversationData, ManagerNewMessageData, ManagerReadData, RealtimeEvent } from "@/types/api/realtime";

/** Without a realtime socket the inbox is refreshed about every 10 seconds. */
export const INBOX_POLL_MS = 10_000;
const PAGE_SIZE = 20;

export type Connection = { kind: "online" } | { kind: "offline" } | { kind: "rate_limited"; until: number };
export type AuthErrorHandler = (kind: "unauthorized" | "forbidden", message?: string) => void;

interface InboxData {
  filter: InboxFilter;
  items: ApiInboxItem[];
  nextCursor: string;
  pages: number;
  loadState: "loading" | "ready" | "error";
}

const emptyInbox = (filter: InboxFilter): InboxData => ({
  filter,
  items: [],
  nextCursor: "",
  pages: 0,
  loadState: "loading",
});

const matchesFilter = (filter: InboxFilter, status: ApiManagerConversation["status"]) =>
  filter === "all" || filter === status;

/**
 * Refreshes the first page: conversations with new activity move to the
 * top. Pages loaded further down are kept (minus anything now on the first
 * page), and so is the cursor that continues after them.
 */
function mergeFirstPage(prev: InboxData, page: { data: ApiInboxItem[]; meta: ApiInboxMeta }): InboxData {
  const first = page.data;
  if (prev.pages <= 1) {
    return { ...prev, items: first, nextCursor: page.meta.next_cursor, pages: 1, loadState: "ready" };
  }
  const firstIds = new Set(first.map((item) => item.id));
  const rest = prev.items.filter((item) => !firstIds.has(item.id) && matchesFilter(prev.filter, item.status));
  return { ...prev, items: [...first, ...rest], loadState: "ready" };
}

/** Inbox order: newest activity first, then id (as the API sorts). */
function compareItems(a: ApiInboxItem, b: ApiInboxItem): number {
  const at = a.last_message_at ?? "";
  const bt = b.last_message_at ?? "";
  if (at !== bt) return at < bt ? 1 : -1;
  return a.id < b.id ? 1 : -1;
}

/** Puts a conversation at its place (or removes it if it left the filter). */
function upsert(items: ApiInboxItem[], item: ApiInboxItem, filter: InboxFilter): ApiInboxItem[] {
  const rest = items.filter((existing) => existing.id !== item.id);
  if (!matchesFilter(filter, item.status)) return rest;
  return [...rest, item].sort(compareItems);
}

export function useInbox(filter: InboxFilter, onAuthError: AuthErrorHandler) {
  const [data, setData] = useState<InboxData>(() => emptyInbox(filter));
  // A new filter starts from scratch (state adjusted during render, so no
  // stale list of the previous filter is ever shown).
  if (data.filter !== filter) {
    setData(emptyInbox(filter));
  }
  const [loadingMore, setLoadingMore] = useState(false);
  const [connection, setConnection] = useState<Connection>({ kind: "online" });
  const [unread, setUnread] = useState<ApiUnreadCount | null>(null);

  const failuresRef = useRef(0);
  const onAuthErrorRef = useRef(onAuthError);
  const queue = useSerialQueue();
  const realtime = useManagerRealtime();
  const liveRef = useRef(false);
  const dataRef = useRef(data);
  useEffect(() => {
    liveRef.current = realtime.status === "open";
  }, [realtime.status]);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    onAuthErrorRef.current = onAuthError;
  }, [onAuthError]);

  /** Handles a non-ok result; returns the delay before retrying, or null to stop. */
  const handleFailure = useCallback((result: ManagerApiResult<unknown>, forFilter: InboxFilter): number | null => {
    switch (result.kind) {
      case "aborted":
        return null;
      case "unauthorized":
        onAuthErrorRef.current("unauthorized");
        return null;
      case "forbidden":
        onAuthErrorRef.current("forbidden");
        return null;
      case "rate_limited":
        setConnection({ kind: "rate_limited", until: Date.now() + result.retryAfterSeconds * 1000 });
        return result.retryAfterSeconds * 1000;
      default:
        failuresRef.current += 1;
        setConnection({ kind: "offline" });
        setData((prev) =>
          prev.filter === forFilter && prev.loadState === "loading" ? { ...prev, loadState: "error" } : prev,
        );
        return backoff(failuresRef.current);
    }
  }, []);

  const step = useCallback(
    (signal: AbortSignal) =>
      queue(async (): Promise<number | null> => {
        if (signal.aborted) return null;
        const page = await fetchConversations({ status: filter, limit: PAGE_SIZE }, signal);
        if (signal.aborted) return null;
        if (page.kind !== "ok") return handleFailure(page, filter);

        const count = await fetchUnreadCount(signal);
        if (signal.aborted) return null;
        if (count.kind !== "ok") return handleFailure(count, filter);

        failuresRef.current = 0;
        setConnection({ kind: "online" });
        setUnread(count.data.data);
        setData((prev) => (prev.filter === filter ? mergeFirstPage(prev, page.data) : prev));
        return liveRef.current ? REALTIME_POLL_MS : INBOX_POLL_MS;
      }),
    [filter, handleFailure, queue],
  );

  const refresh = usePollingLoop(step, { enabled: true, resetKey: filter });
  useReconcileOnReconnect(refresh);

  // Realtime: new conversations and new activity appear at once, in order.
  useManagerEvents(
    useCallback(
      (event: RealtimeEvent) => {
        switch (event.type) {
          case "new_message": {
            const data = event.data as ManagerNewMessageData;
            setUnread(data.unread_total);
            setData((prev) =>
              prev.loadState === "ready" ? { ...prev, items: upsert(prev.items, data.conversation, prev.filter) } : prev,
            );
            break;
          }
          case "messages_read":
          case "conversation_updated": {
            const data = event.data as ManagerReadData | ManagerConversationData;
            setUnread(data.unread_total);
            const current = dataRef.current;
            if (!current.items.some((item) => item.id === data.conversation.id)) {
              // Not in the list (e.g. reopened while "open" is shown): its
              // last message is unknown here, so re-read the first page.
              if (current.loadState === "ready" && matchesFilter(current.filter, data.conversation.status)) refresh();
              break;
            }
            setData((prev) => {
              const existing = prev.items.find((item) => item.id === data.conversation.id);
              return existing
                ? { ...prev, items: upsert(prev.items, { ...existing, ...data.conversation }, prev.filter) }
                : prev;
            });
            break;
          }
          default:
            break;
        }
      },
      [refresh],
    ),
  );

  const loadMore = useCallback(async () => {
    const cursor = data.nextCursor;
    const forFilter = data.filter;
    if (loadingMore || !cursor) return;
    setLoadingMore(true);
    const page = await queue(() => fetchConversations({ status: forFilter, cursor, limit: PAGE_SIZE }));
    setLoadingMore(false);
    if (page.kind !== "ok") {
      handleFailure(page, forFilter);
      return;
    }
    setData((prev) => {
      if (prev.filter !== forFilter) return prev;
      const known = new Set(prev.items.map((item) => item.id));
      return {
        ...prev,
        items: [...prev.items, ...page.data.data.filter((item) => !known.has(item.id))],
        nextCursor: page.data.meta.next_cursor,
        pages: prev.pages + 1,
      };
    });
  }, [data.nextCursor, data.filter, loadingMore, queue, handleFailure]);

  /** Applies a conversation update from the open dialog to its list row. */
  const patchItem = useCallback((conv: ApiManagerConversation) => {
    setData((prev) => ({
      ...prev,
      items: prev.items.flatMap((item) => {
        if (item.id !== conv.id) return [item];
        return matchesFilter(prev.filter, conv.status) ? [{ ...item, ...conv }] : [];
      }),
    }));
  }, []);

  return {
    items: data.items,
    hasMore: data.nextCursor !== "",
    loadState: data.loadState,
    loadingMore,
    connection,
    unread,
    loadMore,
    patchItem,
    refresh,
  };
}
