"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import ManagerHeader from "@/components/manager/ManagerHeader";
import type { AuthErrorHandler } from "@/components/manager/useInbox";
import { useLocale } from "@/components/providers/LocaleProvider";
import { pricingAdminTranslations } from "@/data/i18n/pricingAdmin";
import { createTariffVersion, fetchPricingAdmin, setTariffCost, updatePromotion, updateTariff } from "@/lib/api/manager";
import type { ManagerApiResult } from "@/lib/api/manager";
import { byId, fill } from "@/lib/i18n";
import { tenge } from "@/components/tariffs/format";
import type { ApiStaffUser } from "@/types/api/manager";
import type { ApiAdminPromotion, ApiAdminTariff, ApiPricingAdmin, PromotionPatch } from "@/types/api/pricingAdmin";

const card = "rounded-2xl border border-[var(--text-primary)]/10 bg-[var(--surface)]/60 p-4";
const input = "w-full rounded-lg border border-[var(--text-primary)]/15 bg-[var(--surface)] px-2 py-1.5 text-sm text-slate-200 light:text-slate-800";
const button = "rounded-xl border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-[var(--text-primary)]/10 disabled:opacity-50 light:text-slate-800";
const primary = "rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50";

// Promotion dates are entered and shown in Asia/Almaty (UTC+5, no DST).
const ALMATY_OFFSET = "+05:00";
const almatyParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Almaty", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
});
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const p = Object.fromEntries(almatyParts.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour === "24" ? "00" : p.hour}:${p.minute}`;
}
const fromLocalInput = (value: string) => (value ? `${value}:00${ALMATY_OFFSET}` : undefined);

type Outcome = { ok: true } | { ok: false; message: string; fields: Record<string, string> };

/**
 * Tariffs and promotions for administrators: activity, price versions,
 * costs, promotion periods and places. Every rule is checked by the server
 * (its messages are shown as they come); nothing here prices anything.
 */
export default function PricingAdmin({
  user,
  onAuthError,
  onLogout,
}: {
  user: ApiStaffUser;
  onAuthError: AuthErrorHandler;
  onLogout: () => Promise<string | null>;
}) {
  const { locale } = useLocale();
  const p = pricingAdminTranslations[locale];
  const [data, setData] = useState<ApiPricingAdmin | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void fetchPricingAdmin(controller.signal).then((result) => {
      if (result.kind === "ok") {
        setData(result.data.data);
        setState("ready");
      } else if (result.kind === "unauthorized") onAuthError("unauthorized");
      else if (result.kind === "forbidden") onAuthError("forbidden", p.forbidden);
      else if (result.kind !== "aborted") setState("error");
    });
    return () => controller.abort();
  }, [attempt, onAuthError, p.forbidden]);

  /** Runs a change; on success reloads the list. Server messages are returned as they are. */
  const run = useCallback(
    async (call: Promise<ManagerApiResult<unknown>>): Promise<Outcome> => {
      const result = await call;
      if (result.kind === "ok") {
        setAttempt((n) => n + 1);
        return { ok: true };
      }
      if (result.kind === "unauthorized") onAuthError("unauthorized");
      if (result.kind === "forbidden") onAuthError("forbidden", p.forbidden);
      if (result.kind === "validation_error") return { ok: false, message: result.message, fields: result.fields };
      return { ok: false, message: "message" in result ? result.message : p.failed, fields: {} };
    },
    [onAuthError, p.forbidden, p.failed],
  );

  return (
    <div className="min-h-[100dvh] bg-[var(--background)]">
      <ManagerHeader current="pricing" user={user} onLogout={() => void onLogout()} sticky />
      <main className="mx-auto max-w-[1200px] space-y-5 px-4 py-5 md:px-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-100 light:text-slate-900">{p.title}</h1>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-400 light:text-slate-600">{p.intro}</p>
        </div>
        {state === "loading" && !data ? (
          <p className="flex items-center gap-2 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            {p.loading}
          </p>
        ) : null}
        {state === "error" ? (
          <div role="alert" className="flex items-center gap-3 text-sm text-slate-400">
            {p.failed}
            <button type="button" className={button} onClick={() => setAttempt((n) => n + 1)}>
              <RefreshCw className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
              {p.retry}
            </button>
          </div>
        ) : null}
        {data ? (
          <>
            <section aria-labelledby="admin-tariffs" className="space-y-3">
              <h2 id="admin-tariffs" className="text-base font-semibold text-slate-100 light:text-slate-900">{p.tariffs}</h2>
              <div className="grid gap-3 lg:grid-cols-3">
                {data.tariffs.map((tariff) => (
                  <TariffCard key={`${tariff.slug}-${tariff.version}-${tariff.cost_tenge}-${tariff.is_active}`} tariff={tariff} modules={data.modules} run={run} />
                ))}
              </div>
            </section>
            <section aria-labelledby="admin-promotions" className="space-y-3">
              <h2 id="admin-promotions" className="text-base font-semibold text-slate-100 light:text-slate-900">{p.promotions}</h2>
              <p className="text-xs text-slate-400">
                {fill(p.promotion.reservationNote, { hours: String(data.reservation_hours) })} {p.promotion.activeHint}
              </p>
              <div className="grid gap-3 lg:grid-cols-2">
                {data.promotions.map((promo) => (
                  <PromotionCard key={`${promo.slug}-${promo.version}`} promo={promo} run={run} />
                ))}
              </div>
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}

type Runner = (call: Promise<ManagerApiResult<unknown>>) => Promise<Outcome>;

function TariffCard({ tariff, modules, run }: { tariff: ApiAdminTariff; modules: ApiPricingAdmin["modules"]; run: Runner }) {
  const { t, locale } = useLocale();
  const p = pricingAdminTranslations[locale];
  const [cost, setCost] = useState(tariff.cost_tenge === null ? "" : String(tariff.cost_tenge));
  const [draft, setDraft] = useState({
    price: String(tariff.price_tenge), kind: tariff.price_kind, features: tariff.features.join("\n"),
    modules: tariff.allowed_module_ids, duration: tariff.duration_label,
  });
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [busy, setBusy] = useState(false);
  const go = async (call: Promise<ManagerApiResult<unknown>>) => {
    setBusy(true);
    setOutcome(await run(call));
    setBusy(false);
  };
  return (
    <article className={`${card} space-y-3 text-sm`} data-tariff={tariff.slug}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-slate-100 light:text-slate-900">{tariff.title}</p>
          <p className="text-xs text-slate-500">{tariff.slug} · {fill(p.version, { version: String(tariff.version) })}</p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[11px] ${tariff.is_active ? "bg-emerald-400/15 text-emerald-300" : "bg-slate-400/15 text-slate-400"}`}>
          {tariff.is_active ? p.active : p.inactive}
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-400">
        <dt>{p.price}</dt>
        <dd className="text-slate-200 light:text-slate-800">{tenge(tariff.price_tenge)} ({p.priceKind[tariff.price_kind]})</dd>
        <dt>{p.projectType}</dt>
        <dd className="text-slate-200 light:text-slate-800">{tariff.project_type}</dd>
        <dt>{p.duration}</dt>
        <dd className="text-slate-200 light:text-slate-800">{tariff.duration_label}</dd>
        <dt>{p.modules}</dt>
        <dd className="text-slate-200 light:text-slate-800">{tariff.allowed_module_ids.length || p.noModules}</dd>
        <dt>{p.cost}</dt>
        <dd className="text-slate-200 light:text-slate-800">{tariff.cost_tenge === null ? p.costUnknown : tenge(tariff.cost_tenge)}</dd>
      </dl>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} className={tariff.is_active ? button : primary} onClick={() => void go(updateTariff(tariff.slug, { is_active: !tariff.is_active }))}>
          {tariff.is_active ? p.disable : p.enable}
        </button>
      </div>
      <label className="block text-xs text-slate-400">
        {p.cost}
        <span className="mt-1 flex gap-2">
          <input className={input} inputMode="numeric" value={cost} onChange={(e) => setCost(e.target.value.replace(/\D/g, ""))} />
          <button type="button" disabled={busy || cost === ""} className={button} onClick={() => void go(setTariffCost(tariff.slug, Number(cost)))}>
            {p.saveCost}
          </button>
        </span>
      </label>
      <details className="rounded-xl border border-[var(--text-primary)]/10 p-3">
        <summary className="cursor-pointer text-xs font-semibold text-slate-300">{p.newVersion}</summary>
        <div className="mt-3 space-y-2 text-xs text-slate-400">
          <label className="block">{p.price}
            <input className={input} inputMode="numeric" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value.replace(/\D/g, "") })} />
          </label>
          <label className="block">
            <select className={input} value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as "fixed" | "from" })}>
              <option value="fixed">{p.priceKind.fixed}</option>
              <option value="from">{p.priceKind.from}</option>
            </select>
          </label>
          <label className="block">{p.duration}
            <input className={input} value={draft.duration} onChange={(e) => setDraft({ ...draft, duration: e.target.value })} />
          </label>
          <label className="block">{p.features}
            <textarea className={input} rows={4} value={draft.features} onChange={(e) => setDraft({ ...draft, features: e.target.value })} />
          </label>
          <fieldset>
            <legend>{p.allowedModules}</legend>
            <div className="mt-1 grid grid-cols-2 gap-1">
              {modules.map((m) => (
                <label key={m.id} className="flex items-center gap-1.5 text-slate-300">
                  <input
                    type="checkbox"
                    checked={draft.modules.includes(m.id)}
                    onChange={() =>
                      setDraft({ ...draft, modules: draft.modules.includes(m.id) ? draft.modules.filter((x) => x !== m.id) : [...draft.modules, m.id] })
                    }
                  />
                  {byId(t.catalog.modules, m.id) ?? m.label}
                </label>
              ))}
            </div>
          </fieldset>
          <button
            type="button"
            disabled={busy}
            className={primary}
            onClick={() =>
              void go(
                createTariffVersion(tariff.slug, {
                  price_tenge: Number(draft.price), price_kind: draft.kind, project_type: tariff.project_type,
                  features: draft.features.split("\n").map((x) => x.trim()).filter(Boolean),
                  allowed_module_ids: draft.modules, duration_label: draft.duration,
                  ...(cost !== "" ? { cost_tenge: Number(cost) } : {}),
                }),
              )
            }
          >
            {p.createVersion}
          </button>
        </div>
      </details>
      <Result outcome={outcome} />
    </article>
  );
}

function PromotionCard({ promo, run }: { promo: ApiAdminPromotion; run: Runner }) {
  const { locale } = useLocale();
  const p = pricingAdminTranslations[locale];
  const [form, setForm] = useState({
    discount: String(promo.discount_tenge), starts: toLocalInput(promo.starts_at), ends: toLocalInput(promo.ends_at), max: String(promo.max_orders),
  });
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [busy, setBusy] = useState(false);
  const patch = (extra: PromotionPatch): PromotionPatch => ({
    discount_tenge: Number(form.discount), max_orders: Number(form.max),
    ...(form.starts && form.ends ? { starts_at: fromLocalInput(form.starts), ends_at: fromLocalInput(form.ends) } : {}),
    ...extra,
  });
  const go = async (body: PromotionPatch) => {
    setBusy(true);
    setOutcome(await run(updatePromotion(promo.slug, body)));
    setBusy(false);
  };
  return (
    <article className={`${card} space-y-3 text-sm`} data-promotion={promo.slug}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-slate-100 light:text-slate-900">{promo.title}</p>
          <p className="text-xs text-slate-500">{promo.slug} · {p.promotion.tariff}: {promo.tariff_slug}</p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[11px] ${promo.is_active ? "bg-emerald-400/15 text-emerald-300" : "bg-slate-400/15 text-slate-400"}`}>
          {promo.is_active ? p.active : p.inactive}
        </span>
      </div>
      <p className="text-xs text-slate-400" data-testid="promotion-places">
        {fill(p.promotion.places, { taken: String(promo.taken), max: String(promo.max_orders), confirmed: String(promo.confirmed) })}
      </p>
      <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
        <label>{p.promotion.discount}<input className={input} inputMode="numeric" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value.replace(/\D/g, "") })} /></label>
        <label>{p.promotion.maxOrders}<input className={input} inputMode="numeric" value={form.max} onChange={(e) => setForm({ ...form, max: e.target.value.replace(/\D/g, "") })} /></label>
        <label>{p.promotion.startsAt}<input className={input} type="datetime-local" value={form.starts} onChange={(e) => setForm({ ...form, starts: e.target.value })} /></label>
        <label>{p.promotion.endsAt}<input className={input} type="datetime-local" value={form.ends} onChange={(e) => setForm({ ...form, ends: e.target.value })} /></label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} className={button} onClick={() => void go(patch({}))}>{p.promotion.save}</button>
        <button type="button" disabled={busy} className={promo.is_active ? button : primary} onClick={() => void go(patch({ is_active: !promo.is_active }))}>
          {promo.is_active ? p.disable : p.enable}
        </button>
        {promo.starts_at || promo.ends_at ? (
          <button type="button" disabled={busy || promo.is_active} className={button} onClick={() => void go({ clear_dates: true })}>{p.promotion.clearDates}</button>
        ) : null}
      </div>
      <Result outcome={outcome} />
    </article>
  );
}

function Result({ outcome }: { outcome: Outcome | null }) {
  const { locale } = useLocale();
  const p = pricingAdminTranslations[locale];
  if (!outcome) return null;
  if (outcome.ok) return <p role="status" className="text-xs text-emerald-300">{p.saved}</p>;
  return (
    <div role="alert" className="text-xs text-rose-300 light:text-rose-700">
      <p>{outcome.message}</p>
      {Object.values(outcome.fields).map((m) => (
        <p key={m}>{m}</p>
      ))}
    </div>
  );
}
