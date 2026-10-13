"use client";

import { useCallback, useEffect, useState } from "react";
import { useManagerEvents, useManagerRealtime, useReconcileOnReconnect } from "@/components/manager/ManagerRealtime";
import { fetchRequestSummary } from "@/lib/api/manager";
import type { ProjectRequestEventData, RealtimeEvent } from "@/types/api/realtime";

/** How often the badge is re-read while the socket is down. */
const OFFLINE_POLL_MS = 30_000;

export function isRequestEvent(event: RealtimeEvent): event is RealtimeEvent<ProjectRequestEventData> {
  return event.type === "project_request_created" || event.type === "project_request_updated";
}

/**
 * The "new requests" badge: read from the API on mount and after every
 * realtime (re)connect, updated from realtime events, polled while the
 * socket is down. null until known (or when the role has no access).
 */
export function useNewRequestCount(): number | null {
  const [count, setCount] = useState<number | null>(null);
  const { status } = useManagerRealtime();

  const load = useCallback(() => {
    void fetchRequestSummary().then((result) => {
      if (result.kind === "ok") setCount(result.data.data.new_count);
    });
  }, []);

  useEffect(load, [load]);
  useReconcileOnReconnect(load);
  useManagerEvents(
    useCallback((event: RealtimeEvent) => {
      if (isRequestEvent(event) && typeof event.data?.new_count === "number") setCount(event.data.new_count);
    }, []),
  );

  const live = status === "open";
  useEffect(() => {
    if (live) return;
    const timer = setInterval(load, OFFLINE_POLL_MS);
    return () => clearInterval(timer);
  }, [live, load]);

  return count;
}
