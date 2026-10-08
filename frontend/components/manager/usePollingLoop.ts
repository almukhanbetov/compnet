"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * One polling step. Returns the delay before the next step, or null to go
 * idle until kicked. It must check `signal.aborted` after every await and
 * apply nothing once aborted.
 */
export type PollStep = (signal: AbortSignal) => Promise<number | null>;

/**
 * Runs `step` in a loop: the next run is scheduled only after the previous
 * one settled, so requests never overlap. Paused while the tab is hidden,
 * resumed right away when it becomes visible or the network comes back.
 * Changing `resetKey` (or unmounting) aborts the in-flight step and starts
 * over, so a slow response for an old key can never be applied.
 */
export function usePollingLoop(step: PollStep, options: { enabled: boolean; resetKey: string }): () => void {
  const { enabled, resetKey } = options;
  const stepRef = useRef(step);
  const kickRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let inFlight = false;
    let rerun = false;
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

    const run = async () => {
      timer = null;
      if (disposed || document.visibilityState === "hidden") {
        return;
      }
      if (inFlight) {
        rerun = true;
        return;
      }
      inFlight = true;
      controller = new AbortController();
      let delay: number | null;
      try {
        delay = await stepRef.current(controller.signal);
      } catch {
        delay = 10_000;
      }
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
  }, [enabled, resetKey]);

  return useCallback(() => kickRef.current(), []);
}

/**
 * Serializes async tasks: each starts after the previous one finished, so
 * e.g. "load more" never runs in parallel with a poll of the same data.
 */
export function useSerialQueue(): <T>(task: () => Promise<T>) => Promise<T> {
  const tailRef = useRef<Promise<unknown>>(Promise.resolve());
  return useCallback(<T,>(task: () => Promise<T>) => {
    const result = tailRef.current.then(task, task);
    tailRef.current = result.catch(() => undefined);
    return result;
  }, []);
}

/** Back-off for consecutive failures: 2s, 4s, 8s … capped at 30s. */
export function backoff(failures: number): number {
  return Math.min(30_000, 2000 * 2 ** Math.max(0, failures - 1));
}
