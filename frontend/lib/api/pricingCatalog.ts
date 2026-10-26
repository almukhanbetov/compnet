"use client";

import { useCallback, useEffect, useState } from "react";
import type { PricingCatalog } from "@/types/api/pricingCatalog";

/**
 * The server's pricing catalog for the calculator and the estimate preview
 * (GET /api/v1/pricing/catalog). Loaded once per page and shared; a failed
 * load is retried on the next use. Until it loads — or when it cannot — the
 * interface shows no price at all rather than a guessed or stale one.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

let pending: Promise<PricingCatalog> | null = null;

const isNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;
const isPrice = (v: unknown) => v === null || isNumber(v);
const isText = (v: unknown): v is string => typeof v === "string" && v !== "";
const isList = (v: unknown): v is Record<string, unknown>[] =>
  Array.isArray(v) && v.length > 0 && v.every((item) => typeof item === "object" && item !== null);

/** Only a complete, well-formed catalog is used; anything else counts as unavailable. */
export function isPricingCatalog(data: unknown): data is PricingCatalog {
  if (typeof data !== "object" || data === null) return false;
  const c = data as Record<string, unknown>;
  return (
    isText(c.version) &&
    isNumber(c.round_step_tenge) && c.round_step_tenge > 0 &&
    isNumber(c.multilingual_percent) &&
    isNumber(c.maximum_ratio) && c.maximum_ratio >= 1 &&
    isList(c.project_types) && c.project_types.every((p) => isText(p.id) && isPrice(p.base_price_tenge) && ["site", "app", "none"].includes(p.category as string)) &&
    isList(c.scale_tiers) && c.scale_tiers.every((t) => isText(t.id) && isPrice(t.add_price_tenge) && ["site", "app"].includes(t.category as string)) &&
    isList(c.modules) && c.modules.every((m) => isText(m.id) && isNumber(m.price_tenge) && typeof m.per_unit === "boolean") &&
    isList(c.design_levels) && c.design_levels.every((l) => isText(l.id) && isNumber(l.percent)) &&
    isList(c.complexity_levels) && c.complexity_levels.every((l) => isText(l.id) && isNumber(l.multiplier) && l.multiplier > 0) &&
    isList(c.urgency_levels) && c.urgency_levels.every((l) => isText(l.id) && isNumber(l.multiplier) && l.multiplier > 0) &&
    isList(c.duration_brackets) && c.duration_brackets.every((b) => isPrice(b.max_amount_tenge) && isText(b.label))
  );
}

async function fetchCatalog(fresh: boolean): Promise<PricingCatalog> {
  if (!API_BASE_URL) throw new Error("NEXT_PUBLIC_API_URL is not configured");
  const response = await fetch(`${API_BASE_URL}/api/v1/pricing/catalog`, { credentials: "omit", ...(fresh ? { cache: "no-store" as const } : {}) });
  if (!response.ok) throw new Error(`pricing catalog: HTTP ${response.status}`);
  const body = (await response.json()) as { data?: unknown };
  if (!isPricingCatalog(body.data)) throw new Error("pricing catalog: unexpected shape");
  return body.data;
}

/** The shared load; a failure is forgotten so the next call tries again.
 * fresh: past every cache (a base price changed; see usePricingCatalog). */
export function loadPricingCatalog(fresh = false): Promise<PricingCatalog> {
  if (fresh) pending = null;
  if (!pending) {
    pending = fetchCatalog(fresh).catch((err: unknown) => {
      pending = null;
      throw err;
    });
  }
  return pending;
}

export type PricingCatalogState =
  | { status: "loading" }
  | { status: "ready"; catalog: PricingCatalog }
  | { status: "error"; retry: () => void };

/** The catalog for this page. A new refresh value loads it again past the
 * caches (a request was refused because a base price changed): until then
 * it counts as loading, so no outdated price is shown or sent. */
export function usePricingCatalog(refresh = 0): PricingCatalogState {
  type Loaded = { key: string; status: "ready"; catalog: PricingCatalog } | { key: string; status: "error" };
  const [state, setState] = useState<Loaded | null>(null);
  const [attempt, setAttempt] = useState(0);
  const key = `${refresh}|${attempt}`;

  useEffect(() => {
    let cancelled = false;
    loadPricingCatalog(refresh > 0).then(
      (catalog) => {
        if (!cancelled) setState({ key, status: "ready", catalog });
      },
      () => {
        if (!cancelled) setState({ key, status: "error" });
      },
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the key covers refresh and attempt
  }, [key]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  if (!state || state.key !== key) return { status: "loading" };
  return state.status === "error" ? { status: "error", retry } : { status: "ready", catalog: state.catalog };
}
