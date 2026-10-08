"use client";

import { useCallback, useSyncExternalStore } from "react";

/** Whether a CSS media query matches; false during server rendering. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

function subscribeVisibility(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

/** Whether the tab is currently visible. */
export function useDocumentVisible(): boolean {
  return useSyncExternalStore(
    subscribeVisibility,
    () => document.visibilityState === "visible",
    () => true,
  );
}

function subscribeViewport(onChange: () => void) {
  const viewport = window.visualViewport;
  if (!viewport) {
    return () => undefined;
  }
  viewport.addEventListener("resize", onChange);
  viewport.addEventListener("scroll", onChange);
  return () => {
    viewport.removeEventListener("resize", onChange);
    viewport.removeEventListener("scroll", onChange);
  };
}

/**
 * Visible height and top offset of the page. On phones the on-screen
 * keyboard shrinks the visual viewport but not the layout viewport (iOS
 * Safari), so a full-screen panel sized with these values keeps its input
 * above the keyboard. Null when the API is unavailable.
 */
export function useVisualViewport(): { height: number; offsetTop: number } | null {
  const height = useSyncExternalStore(
    subscribeViewport,
    () => window.visualViewport?.height ?? 0,
    () => 0,
  );
  const offsetTop = useSyncExternalStore(
    subscribeViewport,
    () => window.visualViewport?.offsetTop ?? 0,
    () => 0,
  );
  return height > 0 ? { height, offsetTop } : null;
}
