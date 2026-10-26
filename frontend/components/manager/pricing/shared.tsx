"use client";

/** Parts shared by the price tabs of /manager/pricing (tariffs and base prices). */

import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import type { AuthErrorHandler } from "@/components/manager/useInbox";
import { useLocale } from "@/components/providers/LocaleProvider";
import { pricingAdminTranslations } from "@/data/i18n/pricingAdmin";
import type { ManagerApiResult } from "@/lib/api/manager";
import { fill } from "@/lib/i18n";
import { tenge } from "@/components/tariffs/format";
import { button, primary } from "@/components/manager/pricing/ui";
import type { Locale } from "@/types/i18n";
import type { ApiPriceHistoryEntry } from "@/types/api/pricingAdmin";

const dateTags: Record<Locale, string> = { ru: "ru-RU", kk: "kk-KZ", en: "en-GB" };

/** "26 окт. 2026 г., 23:40" in Asia/Almaty. */
export function almatyDateTime(iso: string, locale: Locale): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(dateTags[locale], { timeZone: "Asia/Almaty", dateStyle: "medium", timeStyle: "short" }).format(d);
}

export type Message = { kind: "ok" | "error"; text: string; details?: string[] } | null;

/** Turns an API failure into a message; auth failures leave the section. */
export function failure(
  result: ManagerApiResult<unknown>,
  p: (typeof pricingAdminTranslations)["ru"],
  onAuthError: AuthErrorHandler,
  onChanged: () => void,
): Message {
  switch (result.kind) {
    case "unauthorized":
      onAuthError("unauthorized");
      return null;
    case "forbidden":
      onAuthError("forbidden", p.forbidden);
      return null;
    case "conflict":
      onChanged();
      return { kind: "error", text: p.prices.conflict };
    case "validation_error":
      return { kind: "error", text: result.message, details: Object.values(result.fields) };
    case "not_found":
    case "error":
      return { kind: "error", text: result.message || p.prices.failed };
    default:
      return { kind: "error", text: p.prices.failed };
  }
}

/** The confirmation of a price change: what changes (lines) and what it means (notes). */
export function ConfirmDialog({
  lines,
  notes,
  busy,
  onCancel,
  onConfirm,
}: {
  lines: string[];
  notes: string[];
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { locale } = useLocale();
  const p = pricingAdminTranslations[locale].prices;
  const confirmRef = useRef<HTMLButtonElement>(null);
  // Escape cancels (not while saving); the latest props, without re-running the focus.
  const latest = useRef({ busy, onCancel });
  useEffect(() => {
    latest.current = { busy, onCancel };
  });
  useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !latest.current.busy) latest.current.onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="price-confirm-title"
        className="w-full max-w-md space-y-3 rounded-2xl border border-[var(--text-primary)]/15 bg-[var(--background)] p-5 text-sm shadow-xl"
      >
        <h2 id="price-confirm-title" className="text-base font-semibold text-slate-100 light:text-slate-900">{p.confirmTitle}</h2>
        {lines.map((line) => (
          <p key={line} className="text-slate-200 light:text-slate-800">{line}</p>
        ))}
        {notes.map((note) => (
          <p key={note} className="break-words text-xs text-slate-400 light:text-slate-600">{note}</p>
        ))}
        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <button type="button" className={button} disabled={busy} onClick={onCancel}>{p.cancel}</button>
          <button ref={confirmRef} type="button" className={primary} disabled={busy} onClick={onConfirm}>
            {busy ? (
              <>
                <Loader2 className="mr-1 inline h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                {p.saving}
              </>
            ) : p.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}

export function History({
  history,
  onRetry,
}: {
  history: { state: "ready" | "error"; items: ApiPriceHistoryEntry[] } | null;
  onRetry: () => void;
}) {
  const { locale } = useLocale();
  const pa = pricingAdminTranslations[locale];
  const p = pa.prices;
  if (!history) return <p className="mt-2 text-xs text-slate-400">{p.historyLoading}</p>;
  if (history.state === "error") {
    return (
      <p role="alert" className="mt-2 flex items-center gap-2 text-xs text-slate-400">
        {p.historyFailed}
        <button type="button" className={button} onClick={onRetry}>{pa.retry}</button>
      </p>
    );
  }
  if (history.items.length === 0) return <p className="mt-2 text-xs text-slate-400">{p.historyEmpty}</p>;
  return (
    <ol className="mt-2 space-y-2">
      {history.items.map((h) => (
        <li key={h.version} className="rounded-lg border border-[var(--text-primary)]/5 p-2 text-xs text-slate-400">
          <p className="flex flex-wrap items-baseline gap-x-2 text-slate-200 light:text-slate-800">
            <span className="font-semibold">{pa.version.replace("{version}", String(h.version))}</span>
            <span className="tabular-nums">
              {h.previous_price_tenge === null ? tenge(h.price_tenge) : `${tenge(h.previous_price_tenge)} → ${tenge(h.price_tenge)}`}
            </span>
            {h.is_current ? <span className="rounded-full bg-emerald-400/15 px-1.5 text-[10px] text-emerald-300">{p.currentBadge}</span> : null}
          </p>
          <p className="mt-0.5">{almatyDateTime(h.created_at, locale)} · {h.author || p.system}</p>
          <p className="mt-0.5 break-words text-slate-300 light:text-slate-700">{h.reason || p.noReason}</p>
          <p className="mt-0.5">{fill(p.historyRequests, { count: String(h.requests) })}</p>
        </li>
      ))}
    </ol>
  );
}
