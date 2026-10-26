"use client";

import { useEffect, useState } from "react";
import type { AuthErrorHandler } from "@/components/manager/useInbox";
import { useLocale } from "@/components/providers/LocaleProvider";
import { pricingAdminTranslations } from "@/data/i18n/pricingAdmin";
import { changeTariffPrice, fetchTariffPriceHistory, previewTariffPrice } from "@/lib/api/manager";
import { byId, fill } from "@/lib/i18n";
import { tenge } from "@/components/tariffs/format";
import { button, card, input, primary } from "@/components/manager/pricing/ui";
import BasePrices from "@/components/manager/pricing/BasePrices";
import { ConfirmDialog, History, almatyDateTime, failure } from "@/components/manager/pricing/shared";
import type { Message } from "@/components/manager/pricing/shared";
import type { ApiAdminTariff, ApiPriceHistoryEntry, ApiPricePreview, ApiPricingAdmin } from "@/types/api/pricingAdmin";

/**
 * "Управление ценами": an administrator changes a tariff's price after
 * checking the server's calculation and confirming. Every amount shown here
 * is the server's (preview endpoint, the same rules as the site and the
 * requests); the change is a new version, refused when another
 * administrator changed the tariff meanwhile.
 */
export default function PriceManagement({
  data,
  onChanged,
  onAuthError,
}: {
  data: ApiPricingAdmin;
  /** Reloads the tariffs (after a change, or when they turned out stale). */
  onChanged: () => void;
  onAuthError: AuthErrorHandler;
}) {
  const { locale } = useLocale();
  const p = pricingAdminTranslations[locale].prices;
  return (
    <div className="space-y-4">
      <p className="max-w-3xl text-xs leading-5 text-slate-400 light:text-slate-600">{p.intro}</p>
      <section aria-labelledby="price-tariffs" className="space-y-3">
        <h2 id="price-tariffs" className="text-base font-semibold text-slate-100 light:text-slate-900">{p.tariffsTitle}</h2>
        {data.tariffs.map((tariff) => (
          <PriceCard key={tariff.slug} tariff={tariff} modules={data.modules} onChanged={onChanged} onAuthError={onAuthError} />
        ))}
      </section>
      <BasePrices onAuthError={onAuthError} />
      <ModulePrices modules={data.modules} />
    </div>
  );
}

function PriceCard({
  tariff,
  modules,
  onChanged,
  onAuthError,
}: {
  tariff: ApiAdminTariff;
  modules: ApiPricingAdmin["modules"];
  onChanged: () => void;
  onAuthError: AuthErrorHandler;
}) {
  const { t, locale } = useLocale();
  const pa = pricingAdminTranslations[locale];
  const p = pa.prices;
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ price: "", cost: "", reason: "", modules: [] as string[], integrations: "1" });
  const [preview, setPreview] = useState<{ key: string; data: ApiPricePreview } | null>(null);
  const [busy, setBusy] = useState<"preview" | "save" | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const [history, setHistory] = useState<{ version: number; state: "ready" | "error"; items: ApiPriceHistoryEntry[] } | null>(null);
  const [historyAttempt, setHistoryAttempt] = useState(0);

  // The history of the version shown; loaded again after every change.
  useEffect(() => {
    const controller = new AbortController();
    void fetchTariffPriceHistory(tariff.slug, controller.signal).then((result) => {
      if (result.kind === "ok") setHistory({ version: tariff.version, state: "ready", items: result.data.data });
      else if (result.kind === "unauthorized") onAuthError("unauthorized");
      else if (result.kind === "forbidden") onAuthError("forbidden", pa.forbidden);
      else if (result.kind !== "aborted") setHistory({ version: tariff.version, state: "error", items: [] });
    });
    return () => controller.abort();
  }, [tariff.slug, tariff.version, historyAttempt, onAuthError, pa.forbidden]);

  const allowed = modules.filter((m) => tariff.allowed_module_ids.includes(m.id));
  const perUnitChosen = allowed.some((m) => m.per_unit && form.modules.includes(m.id));
  const integrations = perUnitChosen ? Math.min(Math.max(Number(form.integrations) || 0, 0), 50) : 0;
  // What the preview was computed for: inputs and the version they apply to.
  const key = JSON.stringify([tariff.version, form.price, form.cost, form.modules, integrations]);
  const fresh = preview !== null && preview.key === key;
  const last = history?.state === "ready" ? history.items.find((h) => h.version === tariff.version) : undefined;
  const reasonOk = form.reason.trim().length >= 3 && form.reason.trim().length <= 500;

  const runPreview = async () => {
    setBusy("preview");
    setMessage(null);
    const result = await previewTariffPrice(tariff.slug, {
      price_tenge: Number(form.price),
      ...(form.cost !== "" ? { cost_tenge: Number(form.cost) } : {}),
      module_ids: form.modules,
      external_api_count: integrations,
    });
    setBusy(null);
    if (result.kind === "ok") setPreview({ key, data: result.data.data });
    else {
      setPreview(null);
      setMessage(failure(result, pa, onAuthError, onChanged));
    }
  };

  const save = async () => {
    setBusy("save");
    const result = await changeTariffPrice(tariff.slug, {
      price_tenge: Number(form.price),
      ...(form.cost !== "" ? { cost_tenge: Number(form.cost) } : {}),
      reason: form.reason.trim(),
      expected_version: tariff.version,
    });
    setBusy(null);
    setConfirming(false);
    if (result.kind === "ok") {
      setMessage({ kind: "ok", text: fill(p.saved, { version: String(result.data.data.version) }) });
      setEditing(false);
      setPreview(null);
      setForm({ price: "", cost: "", reason: "", modules: [], integrations: "1" });
      onChanged();
      return;
    }
    setPreview(null);
    setMessage(failure(result, pa, onAuthError, onChanged));
  };

  const startEditing = () => {
    setEditing(true);
    setMessage(null);
    setPreview(null);
    setForm({ price: String(tariff.price_tenge), cost: "", reason: "", modules: [], integrations: "1" });
  };

  return (
    <article className={`${card} space-y-3 text-sm`} data-price-tariff={tariff.slug}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-slate-100 light:text-slate-900">{tariff.title}</h3>
          <p className="text-xs text-slate-500">{tariff.slug}</p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[11px] ${tariff.is_active ? "bg-emerald-400/15 text-emerald-300" : "bg-slate-400/15 text-slate-400"}`}>
          {tariff.is_active ? pa.active : pa.inactive}
        </span>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs text-slate-400 sm:grid-cols-[auto_1fr_auto_1fr]">
        <dt>{p.current}</dt>
        <dd className="font-semibold text-slate-100 light:text-slate-900" data-testid="current-price">
          {tenge(tariff.price_tenge)} <span className="font-normal text-slate-400">({pa.priceKind[tariff.price_kind]})</span>
        </dd>
        <dt>{p.version}</dt>
        <dd className="text-slate-200 light:text-slate-800">{tariff.version}</dd>
        <dt>{p.changedAt}</dt>
        <dd className="text-slate-200 light:text-slate-800">{almatyDateTime(tariff.version_created_at, locale)}</dd>
        <dt>{p.author}</dt>
        <dd className="text-slate-200 light:text-slate-800">{last ? last.author || p.system : "…"}</dd>
        <dt>{pa.cost}</dt>
        <dd className="text-slate-200 light:text-slate-800">{tariff.cost_tenge === null ? p.costUnknown : tenge(tariff.cost_tenge)}</dd>
      </dl>

      {editing ? (
        <div className="space-y-3 rounded-xl border border-[var(--text-primary)]/10 p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-slate-400">
              {p.newPrice}
              <input
                className={`${input} mt-1`}
                inputMode="numeric"
                name="price"
                autoComplete="off"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value.replace(/\D/g, "").slice(0, 9) })}
              />
            </label>
            <label className="block text-xs text-slate-400">
              {p.cost}
              <input
                className={`${input} mt-1`}
                inputMode="numeric"
                name="cost"
                autoComplete="off"
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: e.target.value.replace(/\D/g, "").slice(0, 9) })}
              />
              <span className="mt-1 block text-[11px] text-slate-500">
                {tariff.cost_tenge === null ? p.costHintUnknown : fill(p.costHint, { cost: tenge(tariff.cost_tenge) })}
              </span>
            </label>
          </div>
          <label className="block text-xs text-slate-400">
            {p.reason}
            <textarea
              className={`${input} mt-1`}
              name="reason"
              rows={2}
              maxLength={500}
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            />
            <span className="mt-1 block text-[11px] text-slate-500">{p.reasonHint}</span>
          </label>
          {allowed.length > 0 ? (
            <fieldset className="text-xs text-slate-400">
              <legend>{p.previewModules}</legend>
              <div className="mt-1 grid gap-1 sm:grid-cols-2">
                {allowed.map((m) => (
                  <label key={m.id} className="flex items-center gap-1.5 text-slate-300 light:text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.modules.includes(m.id)}
                      onChange={() =>
                        setForm({ ...form, modules: form.modules.includes(m.id) ? form.modules.filter((x) => x !== m.id) : [...form.modules, m.id] })
                      }
                    />
                    {byId(t.catalog.modules, m.id) ?? m.label} · {tenge(m.price_tenge)}
                  </label>
                ))}
              </div>
              {perUnitChosen ? (
                <label className="mt-2 block max-w-[12rem]">
                  {p.integrations}
                  <input
                    className={`${input} mt-1`}
                    inputMode="numeric"
                    value={form.integrations}
                    onChange={(e) => setForm({ ...form, integrations: e.target.value.replace(/\D/g, "").slice(0, 2) })}
                  />
                </label>
              ) : null}
            </fieldset>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button type="button" className={button} disabled={busy !== null || form.price === ""} onClick={() => void runPreview()}>
              {busy === "preview" ? p.checking : p.check}
            </button>
            <button
              type="button"
              className={primary}
              disabled={busy !== null || !fresh || !preview?.data.can_save || !reasonOk}
              onClick={() => setConfirming(true)}
            >
              {p.save}
            </button>
            <button type="button" className={button} disabled={busy !== null} onClick={() => { setEditing(false); setPreview(null); setMessage(null); }}>
              {p.cancel}
            </button>
          </div>
          {preview ? <PreviewPanel preview={preview.data} stale={!fresh} /> : null}
        </div>
      ) : (
        <button type="button" className={primary} onClick={startEditing}>{p.change}</button>
      )}

      {message ? (
        <div role={message.kind === "ok" ? "status" : "alert"} className={`text-xs ${message.kind === "ok" ? "text-emerald-300 light:text-emerald-700" : "text-rose-300 light:text-rose-700"}`}>
          <p>{message.text}</p>
          {message.details?.map((d) => <p key={d}>{d}</p>)}
        </div>
      ) : null}

      <details className="rounded-xl border border-[var(--text-primary)]/10 p-3" data-testid="price-history">
        <summary className="cursor-pointer text-xs font-semibold text-slate-300 light:text-slate-700">{p.history}</summary>
        <History history={history} onRetry={() => setHistoryAttempt((n) => n + 1)} />
      </details>

      {confirming && preview ? (
        <ConfirmDialog
          lines={[
            fill(p.confirmText, {
              title: tariff.title, from: tenge(preview.data.current_price_tenge), to: tenge(preview.data.new_price_tenge),
              version: String(preview.data.new_version),
            }),
          ]}
          notes={[p.confirmRequests, fill(p.confirmReason, { reason: form.reason.trim() })]}
          busy={busy === "save"}
          onCancel={() => setConfirming(false)}
          onConfirm={() => void save()}
        />
      ) : null}
    </article>
  );
}

function PreviewPanel({ preview, stale }: { preview: ApiPricePreview; stale: boolean }) {
  const { locale } = useLocale();
  const pa = pricingAdminTranslations[locale];
  const p = pa.prices;
  const promo = preview.promotion;
  const money = (n: number | null) => (n === null ? p.costUnknown : tenge(n));
  const rows: Array<[string, string, string]> = [
    [p.rowTariff, tenge(preview.current.base_price_tenge), tenge(preview.proposed.base_price_tenge)],
    [p.rowModules, tenge(preview.current.modules_total_tenge), tenge(preview.proposed.modules_total_tenge)],
    [p.rowTotal, tenge(preview.current.final_price_tenge), tenge(preview.proposed.final_price_tenge)],
  ];
  return (
    <section aria-label={p.previewTitle} className="space-y-2 rounded-xl bg-[var(--text-primary)]/[0.03] p-3 text-xs" data-testid="price-preview">
      <p className="font-semibold text-slate-200 light:text-slate-800">
        {p.previewTitle} · {pa.version.replace("{version}", String(preview.current_version))} → {preview.new_version}
      </p>
      {stale ? <p role="alert" className="text-amber-300 light:text-amber-700">{p.previewStale}</p> : null}
      <table className="w-full text-left">
        <thead className="text-slate-500">
          <tr>
            <th scope="col" className="py-1 font-normal" />
            <th scope="col" className="py-1 text-right font-normal">{p.was}</th>
            <th scope="col" className="py-1 text-right font-normal">{p.becomes}</th>
          </tr>
        </thead>
        <tbody className="text-slate-300 light:text-slate-700">
          {rows.map(([label, was, becomes]) => (
            <tr key={label} className="border-t border-[var(--text-primary)]/5">
              <th scope="row" className="py-1 pr-2 font-normal text-slate-400">{label}</th>
              <td className="py-1 text-right tabular-nums">{was}</td>
              <td className="py-1 text-right font-semibold tabular-nums text-slate-100 light:text-slate-900">{becomes}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {promo ? (
        <p className="text-slate-300 light:text-slate-700" data-testid="preview-promotion">
          {fill(p.rowPromo, { title: promo.title })}:{" "}
          <span className="font-semibold">{promo.final_price_tenge === null ? p.promoNotApplied : tenge(promo.final_price_tenge)}</span>{" "}
          <span className="text-slate-500">
            (−{tenge(promo.discount_tenge)}, {promo.is_active ? (promo.live ? p.promoLive : p.promoNotLive) : p.promoOff})
          </span>
        </p>
      ) : null}
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 text-slate-400">
        <dt>{p.rowCost}</dt>
        <dd className="text-slate-300 light:text-slate-700">{money(preview.cost_tenge)}</dd>
        {preview.margin_tenge !== null ? (
          <>
            <dt>{p.rowMargin}</dt>
            <dd className="text-slate-300 light:text-slate-700">{tenge(preview.margin_tenge)}</dd>
          </>
        ) : null}
        {preview.promo_margin_tenge !== null ? (
          <>
            <dt>{p.rowPromoMargin}</dt>
            <dd className="text-slate-300 light:text-slate-700">{tenge(preview.promo_margin_tenge)}</dd>
          </>
        ) : null}
      </dl>
      {Object.keys(preview.problems).length > 0 ? (
        <div role="alert" className="text-rose-300 light:text-rose-700" data-testid="preview-problems">
          <p className="font-semibold">{p.problems}</p>
          <ul className="list-disc pl-4">
            {Object.values(preview.problems).map((m) => <li key={m}>{m}</li>)}
          </ul>
        </div>
      ) : null}
      {preview.warnings.length > 0 ? (
        <div className="text-amber-300 light:text-amber-700" data-testid="preview-warnings">
          <p className="font-semibold">{p.warnings}</p>
          <ul className="list-disc pl-4">
            {preview.warnings.map((m) => <li key={m}>{m}</li>)}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function ModulePrices({ modules }: { modules: ApiPricingAdmin["modules"] }) {
  const { t, locale } = useLocale();
  const p = pricingAdminTranslations[locale].prices;
  return (
    <section aria-labelledby="module-prices" className={`${card} space-y-2`}>
      <h3 id="module-prices" className="text-sm font-semibold text-slate-100 light:text-slate-900">{p.modulesTitle}</h3>
      <p className="text-xs leading-5 text-slate-400 light:text-slate-600">{p.modulesNote}</p>
      <ul className="grid gap-x-6 gap-y-1 text-xs text-slate-300 sm:grid-cols-2 light:text-slate-700">
        {modules.map((m) => (
          <li key={m.id} className="flex justify-between gap-3 border-b border-[var(--text-primary)]/5 py-1">
            <span>{byId(t.catalog.modules, m.id) ?? m.label}</span>
            <span className="shrink-0 tabular-nums">{tenge(m.price_tenge)}{m.per_unit ? ` ${p.perUnit}` : ""}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
