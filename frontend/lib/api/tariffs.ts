"use client";

import { useEffect, useState } from "react";
import type { ApiTariff, ApiTariffQuote, TariffChoice } from "@/types/api/tariffs";

/**
 * Tariffs in the browser: the active list (loaded once per page and shared)
 * and the server's quote of a choice. Nothing is priced here: amounts come
 * from the API, and a request is priced again when it is saved. When the
 * list cannot be loaded, or is empty, tariffs are simply not offered.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

let pending: Promise<ApiTariff[]> | null = null;

const isNumber = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v >= 0;

function isTariffList(data: unknown): data is ApiTariff[] {
  return (
    Array.isArray(data) &&
    data.every(
      (t) =>
        typeof t?.slug === "string" &&
        typeof t?.title === "string" &&
        isNumber(t?.price_tenge) &&
        (t?.price_kind === "fixed" || t?.price_kind === "from") &&
        Array.isArray(t?.features) &&
        Array.isArray(t?.modules) &&
        (t?.promotion === null || (isNumber(t?.promotion?.price_tenge) && isNumber(t?.promotion?.discount_tenge))),
    )
  );
}

/** The active tariffs, loaded once per page; fresh: past every cache (a price changed). */
export function loadTariffs(fresh = false): Promise<ApiTariff[]> {
  if (fresh) pending = null;
  if (!pending) {
    pending = (async () => {
      if (!API_BASE_URL) throw new Error("NEXT_PUBLIC_API_URL is not configured");
      const response = await fetch(`${API_BASE_URL}/api/v1/tariffs`, { credentials: "omit", ...(fresh ? { cache: "no-store" as const } : {}) });
      if (!response.ok) throw new Error(`tariffs: HTTP ${response.status}`);
      const body = (await response.json()) as { data?: unknown };
      if (!isTariffList(body.data)) throw new Error("tariffs: unexpected shape");
      return body.data;
    })().catch((err: unknown) => {
      pending = null;
      throw err;
    });
  }
  return pending;
}

/** The active tariffs; [] while loading, when there are none or on error.
 * A new refresh value loads them again past the caches (a price changed);
 * the previous list stays shown meanwhile. */
export function useTariffs(refresh = 0): { ready: boolean; tariffs: ApiTariff[] } {
  const [state, setState] = useState<{ ready: boolean; tariffs: ApiTariff[] }>({ ready: false, tariffs: [] });
  useEffect(() => {
    let cancelled = false;
    loadTariffs(refresh > 0).then(
      (tariffs) => !cancelled && setState({ ready: true, tariffs }),
      () => !cancelled && setState((prev) => (refresh > 0 ? prev : { ready: true, tariffs: [] })),
    );
    return () => {
      cancelled = true;
    };
  }, [refresh]);
  return state;
}

export async function fetchTariffQuote(choice: TariffChoice, signal?: AbortSignal): Promise<ApiTariffQuote> {
  const params = new URLSearchParams();
  if (choice.moduleIds.length > 0) params.set("modules", choice.moduleIds.join(","));
  if (choice.externalApiCount > 0) params.set("external_api_count", String(choice.externalApiCount));
  const response = await fetch(`${API_BASE_URL}/api/v1/tariffs/${encodeURIComponent(choice.slug)}/quote?${params}`, {
    credentials: "omit",
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw new Error(`quote: HTTP ${response.status}`);
  const body = (await response.json()) as { data?: ApiTariffQuote };
  if (!body.data || !isNumber(body.data.final_price_tenge)) throw new Error("quote: unexpected shape");
  return body.data;
}

/** The server's quote of a choice; a newer choice cancels the older request.
 * A new refresh value asks again for the same choice (its price changed). */
export function useTariffQuote(
  choice: TariffChoice | null,
  refresh = 0,
): { status: "idle" | "loading" | "ready" | "error"; quote: ApiTariffQuote | null } {
  const key = choice ? `${choice.slug}|${choice.moduleIds.join(",")}|${choice.externalApiCount}|${refresh}` : "";
  const [state, setState] = useState<{ key: string; status: "loading" | "ready" | "error"; quote: ApiTariffQuote | null }>({
    key: "",
    status: "loading",
    quote: null,
  });
  useEffect(() => {
    if (!choice) return;
    const controller = new AbortController();
    fetchTariffQuote(choice, controller.signal).then(
      (quote) => setState({ key, status: "ready", quote }),
      () => !controller.signal.aborted && setState({ key, status: "error", quote: null }),
    );
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the key covers the choice
  }, [key]);
  if (!choice) return { status: "idle", quote: null };
  return state.key === key ? { status: state.status, quote: state.quote } : { status: "loading", quote: null };
}

/** A choice from the page's address (?tariff=start&modules=a,b&integrations=2). */
export function tariffChoiceFromUrl(search: string): TariffChoice | null {
  const params = new URLSearchParams(search);
  const slug = params.get("tariff") ?? "";
  if (!/^[a-z][a-z0-9-]{1,40}$/.test(slug)) return null;
  const moduleIds = (params.get("modules") ?? "").split(",").map((id) => id.trim()).filter(Boolean).slice(0, 20);
  const externalApiCount = Math.min(Math.max(Number(params.get("integrations")) || 0, 0), 50);
  return { slug, moduleIds, externalApiCount };
}

/** A link carrying a choice, e.g. to the request form. */
export function tariffHref(path: string, choice: TariffChoice): string {
  const params = new URLSearchParams({ tariff: choice.slug });
  if (choice.moduleIds.length > 0) params.set("modules", choice.moduleIds.join(","));
  if (choice.externalApiCount > 0) params.set("integrations", String(choice.externalApiCount));
  return `${path}?${params}`;
}
