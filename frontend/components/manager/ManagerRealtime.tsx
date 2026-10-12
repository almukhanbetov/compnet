"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { RealtimeStatus } from "@/lib/chat/realtime";
import { useRealtime } from "@/components/chat/useRealtime";
import type { PresenceData, RealtimeEvent, RealtimeFrame } from "@/types/api/realtime";

type Listener = (event: RealtimeEvent) => void;

interface ManagerRealtimeValue {
  status: RealtimeStatus;
  /** The socket has been open at least once in this session. */
  wasLive: boolean;
  /** Incremented on every (re)connect: consumers re-read the API then. */
  connects: number;
  onlineManagers: number;
  onlineVisitors: ReadonlySet<string>;
  subscribe: (listener: Listener) => () => void;
  request: (frame: RealtimeFrame, timeoutMs?: number) => Promise<RealtimeEvent>;
  send: (frame: RealtimeFrame) => boolean;
}

const ManagerRealtimeContext = createContext<ManagerRealtimeValue | null>(null);

/**
 * One WebSocket for the whole manager section, shared by the inbox and the
 * open conversation. Authenticated by the HttpOnly session cookie; a
 * logout or expired session closes it with 4401 (onSessionEnded).
 */
export function ManagerRealtimeProvider({ children, onSessionEnded }: { children: ReactNode; onSessionEnded: () => void }) {
  const listenersRef = useRef(new Set<Listener>());
  const [connects, setConnects] = useState(0);
  const [onlineManagers, setOnlineManagers] = useState(0);
  const [onlineVisitors, setOnlineVisitors] = useState<ReadonlySet<string>>(() => new Set());

  const handleEvent = useCallback((event: RealtimeEvent) => {
    if (event.type === "presence") {
      const data = event.data as PresenceData;
      if (data.subject === "managers" && typeof data.online_managers === "number") {
        setOnlineManagers(data.online_managers);
      } else if (data.subject === "visitors") {
        setOnlineVisitors(new Set(data.online_conversation_ids ?? []));
      } else if (data.subject === "visitor" && data.conversation_id) {
        const id = data.conversation_id;
        setOnlineVisitors((prev) => {
          const next = new Set(prev);
          if (data.visitor_online) next.add(id);
          else next.delete(id);
          return next;
        });
      }
    }
    for (const listener of listenersRef.current) listener(event);
  }, []);

  const realtime = useRealtime({
    path: "/api/v1/manager/ws",
    enabled: true,
    onEvent: handleEvent,
    onOpen: () => setConnects((n) => n + 1),
    onSessionEnded,
  });

  const subscribe = useCallback((listener: Listener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const live = realtime.status === "open";
  const value = useMemo<ManagerRealtimeValue>(
    () => ({
      status: realtime.status,
      wasLive: connects > 0,
      connects,
      // Presence is only trustworthy while our own socket is up.
      onlineManagers: live ? onlineManagers : 0,
      onlineVisitors: live ? onlineVisitors : new Set<string>(),
      subscribe,
      request: realtime.request,
      send: realtime.send,
    }),
    [realtime.status, realtime.request, realtime.send, connects, live, onlineManagers, onlineVisitors, subscribe],
  );

  return <ManagerRealtimeContext.Provider value={value}>{children}</ManagerRealtimeContext.Provider>;
}

export function useManagerRealtime(): ManagerRealtimeValue {
  const value = useContext(ManagerRealtimeContext);
  if (!value) throw new Error("useManagerRealtime outside ManagerRealtimeProvider");
  return value;
}

/** Calls handler for every realtime event while mounted. */
export function useManagerEvents(handler: Listener): void {
  const { subscribe } = useManagerRealtime();
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);
  useEffect(() => subscribe((event) => handlerRef.current(event)), [subscribe]);
}

/**
 * Runs `refresh` after every realtime (re)connect (to re-read what may have
 * been missed) and whenever the socket goes down (so the polling fallback
 * restarts at its fast rate right away).
 */
export function useReconcileOnReconnect(refresh: () => void): void {
  const { connects, status } = useManagerRealtime();
  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);
  useEffect(() => {
    if (connects > 0) refreshRef.current();
  }, [connects]);
  const live = status === "open";
  useEffect(() => {
    if (!live) refreshRef.current();
  }, [live]);
}
