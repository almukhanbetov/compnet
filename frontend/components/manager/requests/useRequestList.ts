"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useManagerEvents, useManagerRealtime, useReconcileOnReconnect } from "@/components/manager/ManagerRealtime";
import { isRequestEvent } from "@/components/manager/requests/useNewRequestCount";
import { backoff, usePollingLoop } from "@/components/manager/usePollingLoop";
import type { AuthErrorHandler } from "@/components/manager/useInbox";
import { fetchRequests } from "@/lib/api/manager";
import type { ApiRequestItem, ApiRequestListMeta, RequestListQuery } from "@/types/api/managerRequests";
import type { RealtimeEvent } from "@/types/api/realtime";

/** Re-read cadence: a safety net while live, the fallback while not. */
const LIVE_POLL_MS = 60_000;
const OFFLINE_POLL_MS = 10_000;

interface Loaded {
  key: string;
  items: ApiRequestItem[];
  meta: ApiRequestListMeta;
}

export type ListConnection = { kind: "online" } | { kind: "offline" } | { kind: "rate_limited"; until: number };

/**
 * One page of requests for the given query. PostgreSQL is the truth: a
 * realtime event only tells the page to re-read it, as does every
 * (re)connect; while the socket is down the page polls.
 */
export function useRequestList(query: RequestListQuery, onAuthError: AuthErrorHandler) {
  const key = JSON.stringify(query);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const [connection, setConnection] = useState<ListConnection>({ kind: "online" });
  const failuresRef = useRef(0);
  const onAuthErrorRef = useRef(onAuthError);
  const realtime = useManagerRealtime();
  const liveRef = useRef(false);

  useEffect(() => {
    onAuthErrorRef.current = onAuthError;
  }, [onAuthError]);
  useEffect(() => {
    liveRef.current = realtime.status === "open";
  }, [realtime.status]);

  const step = useCallback(
    async (signal: AbortSignal): Promise<number | null> => {
      const result = await fetchRequests(JSON.parse(key) as RequestListQuery, signal);
      if (signal.aborted) return null;
      switch (result.kind) {
        case "ok":
          failuresRef.current = 0;
          setConnection({ kind: "online" });
          setFailedKey(null);
          setLoaded({ key, items: result.data.data, meta: result.data.meta });
          return liveRef.current ? LIVE_POLL_MS : OFFLINE_POLL_MS;
        case "aborted":
          return null;
        case "unauthorized":
          onAuthErrorRef.current("unauthorized");
          return null;
        case "forbidden":
          onAuthErrorRef.current("forbidden", result.message);
          return null;
        case "rate_limited":
          setConnection({ kind: "rate_limited", until: Date.now() + result.retryAfterSeconds * 1000 });
          return result.retryAfterSeconds * 1000;
        case "validation_error":
          setFailedKey(key);
          return null;
        default:
          failuresRef.current += 1;
          setConnection({ kind: "offline" });
          setFailedKey(key);
          return backoff(failuresRef.current);
      }
    },
    [key],
  );

  const refresh = usePollingLoop(step, { enabled: true, resetKey: key });
  useReconcileOnReconnect(refresh);
  useManagerEvents(
    useCallback(
      (event: RealtimeEvent) => {
        if (isRequestEvent(event)) refresh();
      },
      [refresh],
    ),
  );

  const current = loaded?.key === key;
  return {
    /** The last loaded page (possibly of the previous query while loading). */
    items: loaded?.items ?? [],
    meta: loaded?.meta ?? null,
    state: current ? "ready" : failedKey === key ? "error" : "loading",
    connection,
    refresh,
  } as const;
}
