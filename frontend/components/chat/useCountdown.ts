"use client";

import { useEffect, useState } from "react";

/** Whole seconds left until `until` (epoch ms), ticking once a second; 0 when passed or null. */
export function useCountdown(until: number | null): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (until === null) {
      return;
    }
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [until]);

  if (until === null) {
    return 0;
  }
  return Math.max(0, Math.ceil((until - now) / 1000));
}
