"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  RealtimeConnection,
  RealtimeError,
  realtimeUrl,
  type RealtimeStatus,
} from "@/lib/chat/realtime";
import type { RealtimeEvent, RealtimeFrame } from "@/types/api/realtime";

interface Options {
  /** API path, e.g. "/api/v1/chat/ws". */
  path: string;
  enabled: boolean;
  /** Changing it reconnects (e.g. once the visitor has a conversation). */
  connectionKey?: string;
  pauseWhenHiddenMs?: number;
  onEvent: (event: RealtimeEvent) => void;
  /** Every (re)connect: re-read the HTTP API to recover missed events. */
  onOpen?: () => void;
  onSessionEnded?: () => void;
}

/** React lifecycle around one RealtimeConnection. */
export function useRealtime({ path, enabled, connectionKey = "", pauseWhenHiddenMs, onEvent, onOpen, onSessionEnded }: Options) {
  const [status, setStatus] = useState<RealtimeStatus>("idle");
  const connectionRef = useRef<RealtimeConnection | null>(null);
  const handlersRef = useRef({ onEvent, onOpen, onSessionEnded });
  const url = realtimeUrl(path);

  useEffect(() => {
    handlersRef.current = { onEvent, onOpen, onSessionEnded };
  }, [onEvent, onOpen, onSessionEnded]);

  useEffect(() => {
    if (!enabled || !url) return;
    const connection = new RealtimeConnection({
      url,
      pauseWhenHiddenMs,
      onStatus: setStatus,
      onEvent: (event) => handlersRef.current.onEvent(event),
      onOpen: () => handlersRef.current.onOpen?.(),
      onSessionEnded: () => handlersRef.current.onSessionEnded?.(),
    });
    connectionRef.current = connection;
    connection.start();
    return () => {
      connection.stop();
      if (connectionRef.current === connection) connectionRef.current = null;
    };
  }, [url, enabled, connectionKey, pauseWhenHiddenMs]);

  const request = useCallback(
    (frame: RealtimeFrame, timeoutMs?: number): Promise<RealtimeEvent> =>
      connectionRef.current?.isOpen
        ? connectionRef.current.request(frame, timeoutMs)
        : Promise.reject(new RealtimeError("closed")),
    [],
  );
  const send = useCallback((frame: RealtimeFrame) => connectionRef.current?.send(frame) ?? false, []);

  return { status: enabled && url ? status : ("idle" as RealtimeStatus), request, send };
}
