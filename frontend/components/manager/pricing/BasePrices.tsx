"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import type { AuthErrorHandler } from "@/components/manager/useInbox";
import { useLocale } from "@/components/providers/LocaleProvider";
import { pricingAdminTranslations } from "@/data/i18n/pricingAdmin";
import { changeBasePrice, fetchBasePriceHistory, fetchBasePrices, previewBasePrice } from "@/lib/api/manager";
import { byId, fill } from "@/lib/i18n";
import { tenge } from "@/components/tariffs/format";
import { button, card, input, primary } from "@/components/manager/pricing/ui";
import { ConfirmDialog, History, almatyDateTime, failure } from "@/components/manager/pricing/shared";
import type { Message } from "@/components/manager/pricing/shared";
import type { ApiBasePrice, ApiBasePricePreview, ApiEstimateRange, ApiPriceHistoryEntry } from "@/types/api/pricingAdmin";

/**
 * "Базовые цены услуг": the starting price of every project type of the
 * server's catalog. An administrator changes one after the server's
 * calculation (the calculator itself, on every scale tier) and a
 * confirmation; it is a new version, refused when another administrator
 * changed the price meanwhile. Nothing here prices anything.
 */
export default function BasePrices({ onAuthError }: { onAuthError: AuthErrorHandler }) {
  const { locale } = useLocale();
  const pa = pricingAdminTranslations[locale];
  const b = pa.prices.base;
  const [items, setItems] = useState<ApiBasePrice[] | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    void fetchBasePrices(controller.signal).then((result) => {
      if (result.kind === "ok") {
        setItems(result.data.data);
        setState("ready");
      } else if (result.kind === "unauthorized") onAuthError("unauthorized");
      else if (result.kind === "forbidden") onAuthError("forbidden", pa.forbidden);
      else if (result.kind !== "aborted") setState("error");
    });
    return () => controller.abort();
  }, [attempt, onAuthError, pa.forbidden]);

  return (
    <section aria-labelledby="base-prices" className="space-y-3" data-testid="base-prices">
      <h2 id="base-prices" className="text-base font-semibold text-slate-100 light:text-slate-900">{b.title}</h2>
      <p className="max-w-3xl text-xs leading-5 text-slate-400 light:text-slate-600">{b.intro}</p>
      {state === "loading" && !items ? (
        <p className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          {b.loading}
        </p>
      ) : null}
      {state === "error" ? (
        <div role="alert" className="flex items-center gap-3 text-sm text-slate-400">
          {b.failed}
          <button type="button" className={button} onClick={reload}>
            <RefreshCw className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
            {pa.retry}
          </button>
        </div>
      ) : null}
      {items ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {items.map((item) => (
            <BasePriceCard key={item.project_type} item={item} onChanged={reload} onAuthError={onAuthError} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function BasePriceCard({ item, onChanged, onAuthError }: { item: ApiBasePrice; onChanged: () => void; onAuthError: AuthErrorHandler }) {
  const { t, locale } = useLocale();
  const pa = pricingAdminTranslations[locale];
  const p = pa.prices;
  const b = p.base;
  const label = byId(t.contactPage.form.options.projectType, item.label) ?? item.label;
  const from = (n: number) => fill(b.from, { price: tenge(n) });
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ price: "", reason: "" });
  const [preview, setPreview] = useState<{ key: string; data: ApiBasePricePreview } | null>(null);
  const [busy, setBusy] = useState<"preview" | "save" | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const [history, setHistory] = useState<{ state: "ready" | "error"; items: ApiPriceHistoryEntry[] } | null>(null);
  const [historyAttempt, setHistoryAttempt] = useState(0);

  useEffect(() => {
    if (!item.editable) return;
    const controller = new AbortController();
    void fetchBasePriceHistory(item.project_type, controller.signal).then((result) => {
      if (result.kind === "ok") setHistory({ state: "ready", items: result.data.data });
      else if (result.kind === "unauthorized") onAuthError("unauthorized");
      else if (result.kind === "forbidden") onAuthError("forbidden", pa.forbidden);
      else if (result.kind !== "aborted") setHistory({ state: "error", items: [] });
    });
    return () => controller.abort();
  }, [item.project_type, item.editable, item.version, historyAttempt, onAuthError, pa.forbidden]);

  // What the preview was computed for: the price and the version it applies to.
  const key = `${item.version}|${form.price}`;
  const fresh = preview !== null && preview.key === key;
  const reasonOk = form.reason.trim().length >= 3 && form.reason.trim().length <= 500;

  const runPreview = async () => {
    setBusy("preview");
    setMessage(null);
    const result = await previewBasePrice(item.project_type, Number(form.price));
    setBusy(null);
    if (result.kind === "ok") setPreview({ key, data: result.data.data });
    else {
      setPreview(null);
      setMessage(failure(result, pa, onAuthError, onChanged));
    }
  };

  const save = async () => {
    setBusy("save");
    const result = await changeBasePrice(item.project_type, { price_tenge: Number(form.price), reason: form.reason.trim(), expected_version: item.version });
    setBusy(null);
    setConfirming(false);
    setPreview(null);
    if (result.kind === "ok") {
      setMessage({ kind: "ok", text: fill(p.saved, { version: String(result.data.data.version) }) });
      setEditing(false);
      setForm({ price: "", reason: "" });
      onChanged();
      return;
    }
    setMessage(failure(result, pa, onAuthError, onChanged));
  };

  return (
    <article className={`${card} min-w-0 space-y-3 text-sm`} data-base-price={item.project_type}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-slate-100 light:text-slate-900">{label}</h3>
          <p className="text-xs text-slate-500">{item.project_type}</p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[11px] ${item.editable ? "bg-emerald-400/15 text-emerald-300" : "bg-slate-400/15 text-slate-400"}`}>
          {item.editable ? b.inCalculator : b.individualOnly}
        </span>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs text-slate-400 sm:grid-cols-[auto_1fr_auto_1fr]">
        <dt>{p.current}</dt>
        <dd className="font-semibold text-slate-100 light:text-slate-900" data-testid="base-current">
          {item.price_tenge === null ? b.noPrice : from(item.price_tenge)}
        </dd>
        <dt>{p.version}</dt>
        <dd className="text-slate-200 light:text-slate-800">{item.version || "—"}</dd>
        <dt>{p.changedAt}</dt>
        <dd className="text-slate-200 light:text-slate-800">{item.changed_at ? almatyDateTime(item.changed_at, locale) : "—"}</dd>
        <dt>{p.author}</dt>
        <dd className="text-slate-200 light:text-slate-800">{item.editable ? item.author || p.system : "—"}</dd>
      </dl>

      {item.editable && editing ? (
        <div className="space-y-3 rounded-xl border border-[var(--text-primary)]/10 p-3">
          <label className="block text-xs text-slate-400">
            {b.newPrice}
            <input
              className={`${input} mt-1`}
              inputMode="numeric"
              name="base-price"
              autoComplete="off"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value.replace(/\D/g, "").slice(0, 9) })}
            />
          </label>
          <label className="block text-xs text-slate-400">
            {p.reason}
            <textarea className={`${input} mt-1`} name="base-reason" rows={2} maxLength={500} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            <span className="mt-1 block text-[11px] text-slate-500">{p.reasonHint}</span>
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={button} disabled={busy !== null || form.price === ""} onClick={() => void runPreview()}>
              {busy === "preview" ? p.checking : p.check}
            </button>
            <button type="button" className={primary} disabled={busy !== null || !fresh || !preview?.data.can_save || !reasonOk} onClick={() => setConfirming(true)}>
              {p.save}
            </button>
            <button type="button" className={button} disabled={busy !== null} onClick={() => { setEditing(false); setPreview(null); setMessage(null); }}>
              {p.cancel}
            </button>
          </div>
          {preview ? <BasePreview preview={preview.data} stale={!fresh} /> : null}
        </div>
      ) : item.editable ? (
        <button
          type="button"
          className={primary}
          onClick={() => {
            setEditing(true);
            setMessage(null);
            setPreview(null);
            setForm({ price: String(item.price_tenge ?? ""), reason: "" });
          }}
        >
          {p.change}
        </button>
      ) : null}

      {message ? (
        <div role={message.kind === "ok" ? "status" : "alert"} className={`text-xs ${message.kind === "ok" ? "text-emerald-300 light:text-emerald-700" : "text-rose-300 light:text-rose-700"}`}>
          <p>{message.text}</p>
          {message.details?.map((d) => <p key={d}>{d}</p>)}
        </div>
      ) : null}

      {item.editable ? (
        <details className="rounded-xl border border-[var(--text-primary)]/10 p-3" data-testid="base-history">
          <summary className="cursor-pointer text-xs font-semibold text-slate-300 light:text-slate-700">{p.history}</summary>
          <History history={history} onRetry={() => setHistoryAttempt((n) => n + 1)} />
        </details>
      ) : null}

      {confirming && preview && item.price_tenge !== null ? (
        <ConfirmDialog
          lines={[fill(b.confirmText, { title: label, from: from(item.price_tenge), to: from(preview.data.new_price_tenge), version: String(preview.data.new_version) })]}
          notes={[b.confirmEffect, fill(p.confirmReason, { reason: form.reason.trim() })]}
          busy={busy === "save"}
          onCancel={() => setConfirming(false)}
          onConfirm={() => void save()}
        />
      ) : null}
    </article>
  );
}

function BasePreview({ preview, stale }: { preview: ApiBasePricePreview; stale: boolean }) {
  const { t, locale } = useLocale();
  const pa = pricingAdminTranslations[locale];
  const p = pa.prices;
  const b = p.base;
  const range = (r: ApiEstimateRange) =>
    r.individual || r.minimum_tenge === null || r.maximum_tenge === null ? b.individual : fill(b.range, { min: tenge(r.minimum_tenge), max: tenge(r.maximum_tenge) });
  return (
    <section aria-label={p.previewTitle} className="space-y-2 rounded-xl bg-[var(--text-primary)]/[0.03] p-3 text-xs" data-testid="base-preview">
      <p className="font-semibold text-slate-200 light:text-slate-800">
        {p.previewTitle} · {pa.version.replace("{version}", String(preview.current_version))} → {preview.new_version}
      </p>
      {stale ? <p role="alert" className="text-amber-300 light:text-amber-700">{p.previewStale}</p> : null}
      <p className="text-slate-500">{b.standardNote}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="text-slate-500">
            <tr>
              <th scope="col" className="py-1 font-normal">{b.tier}</th>
              <th scope="col" className="py-1 text-right font-normal">{p.was}</th>
              <th scope="col" className="py-1 text-right font-normal">{p.becomes}</th>
            </tr>
          </thead>
          <tbody className="text-slate-300 light:text-slate-700">
            {preview.rows.map((row) => (
              <tr key={row.tier_id || "none"} className="border-t border-[var(--text-primary)]/5">
                <th scope="row" className="py-1 pr-2 font-normal text-slate-400">
                  {row.tier_id ? (byId(t.catalog.scale, row.tier_id) ?? row.tier_label) : b.noTiers}
                </th>
                <td className="py-1 text-right tabular-nums">{range(row.current)}</td>
                <td className="py-1 text-right font-semibold tabular-nums text-slate-100 light:text-slate-900">{range(row.proposed)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {Object.keys(preview.problems).length > 0 ? (
        <div role="alert" className="text-rose-300 light:text-rose-700" data-testid="base-problems">
          <p className="font-semibold">{p.problems}</p>
          <ul className="list-disc pl-4">{Object.values(preview.problems).map((m) => <li key={m}>{m}</li>)}</ul>
        </div>
      ) : null}
      {preview.warnings.length > 0 ? (
        <div className="text-amber-300 light:text-amber-700" data-testid="base-warnings">
          <p className="font-semibold">{p.warnings}</p>
          <ul className="list-disc pl-4">{preview.warnings.map((m) => <li key={m}>{m}</li>)}</ul>
        </div>
      ) : null}
    </section>
  );
}
