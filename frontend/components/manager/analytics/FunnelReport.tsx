"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Info, Loader2, RefreshCw } from "lucide-react";
import { useManagerEvents } from "@/components/manager/ManagerRealtime";
import { almatyToday, formatAlmatyFull } from "@/components/manager/analytics/periods";
import { isRequestEvent } from "@/components/manager/requests/useNewRequestCount";
import type { AuthErrorHandler } from "@/components/manager/useInbox";
import { useLocale } from "@/components/providers/LocaleProvider";
import { fetchFunnel } from "@/lib/api/manager";
import { fill } from "@/lib/i18n";
import type { ApiFunnel } from "@/types/api/analytics";
import type { RealtimeEvent } from "@/types/api/realtime";

const card = "rounded-2xl border border-[var(--text-primary)]/10 bg-[var(--surface)]/60 p-4";

/** A share from the API (one decimal, null = nothing to compare with). */
function percent(value: number | null): string {
  return value === null ? "—" : `${value}%`;
}

/**
 * Conversion funnel of the sessions started in the dashboard's period:
 * visit → interest → started → intent → inquiry. Counts come from the
 * server; a session counts once per step and only after every earlier
 * step (see analytics.Funnel). Shows honestly what the data cannot tell:
 * when the step events started to be collected, and inquiries that did
 * not pass every step.
 */
export default function FunnelReport({
  range,
  onAuthError,
}: {
  range: { from: string; to: string };
  onAuthError: AuthErrorHandler;
}) {
  const { t } = useLocale();
  const f = t.manager.analytics.funnel;
  const [data, setData] = useState<ApiFunnel | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<{ key: string; ok: boolean } | null>(null);
  const requestKey = `${range.from}|${range.to}|${attempt}`;
  const state: "loading" | "ready" | "error" = settled?.key !== requestKey ? "loading" : settled.ok ? "ready" : "error";

  // The quiet re-read in flight; a new period or re-read cancels it, so a
  // late answer for another period never replaces the current figures.
  const quiet = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetchFunnel(range.from, range.to, controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      if (result.kind === "ok") {
        setData(result.data.data);
        setSettled({ key: requestKey, ok: true });
      } else if (result.kind === "unauthorized") {
        onAuthError("unauthorized");
      } else if (result.kind === "forbidden") {
        onAuthError("forbidden");
      } else if (result.kind !== "aborted") {
        setSettled({ key: requestKey, ok: false });
      }
    });
    return () => {
      controller.abort();
      quiet.current?.abort();
    };
  }, [range, requestKey, onAuthError]);

  // New visits or requests: re-read quietly.
  useManagerEvents(
    useCallback(
      (event: RealtimeEvent) => {
        if ((event.type !== "analytics_updated" && !isRequestEvent(event)) || settled?.key !== requestKey) return;
        quiet.current?.abort();
        const controller = new AbortController();
        quiet.current = controller;
        void fetchFunnel(range.from, range.to, controller.signal).then((result) => {
          if (result.kind === "ok" && !controller.signal.aborted) setData(result.data.data);
        });
      },
      [range, requestKey, settled],
    ),
  );

  // Figures of another period are never shown, not even while loading.
  const shown = data && data.period.from === range.from && data.period.to === range.to ? data : null;
  const since = shown?.step_events_since ?? null;
  const notice = !shown || shown.steps[0].sessions === 0
    ? null
    : since === null
      ? f.notYet
      : almatyToday(new Date(since)) > range.from
        ? fill(f.since, { date: formatAlmatyFull(since) })
        : null;

  return (
    <section className={`${card} space-y-4`} aria-labelledby="funnel-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl">
          <h2 id="funnel-title" className="text-base font-semibold text-slate-100 light:text-slate-900">{f.title}</h2>
          <p className="mt-1 flex items-start gap-1.5 text-xs leading-5 text-slate-400 light:text-slate-600">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {f.hint}
          </p>
        </div>
        {state === "loading" ? (
          <Loader2 className="h-4 w-4 animate-spin text-slate-400 motion-reduce:animate-none" aria-label={t.manager.analytics.loading} />
        ) : null}
      </div>

      {state === "error" ? (
        <div role="alert" className="flex items-center gap-3 text-sm text-slate-400 light:text-slate-600">
          {f.failed}
          <button
            type="button"
            onClick={() => setAttempt((n) => n + 1)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--text-primary)]/15 px-3 py-1.5 text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            {t.manager.analytics.retry}
          </button>
        </div>
      ) : null}

      {shown && shown.steps[0].sessions === 0 ? (
        <p className="text-sm text-slate-400 light:text-slate-600">{f.empty}</p>
      ) : null}

      {shown && shown.steps[0].sessions > 0 ? (
        <>
          {notice ? (
            <p role="note" className="flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs leading-5 text-amber-200 light:text-amber-800">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {notice}
            </p>
          ) : null}

          <ol aria-label={f.label} className="space-y-3">
            {shown.steps.map((step, i) => (
              <li key={step.key} data-step={step.key} className="space-y-1.5">
                {i > 0 ? (
                  <p className="text-[11px] text-slate-500 light:text-slate-500">
                    {fill(f.lost, { count: String(step.lost), value: percent(step.lost_pct) })}
                  </p>
                ) : null}
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <p className="min-w-0 text-sm font-medium text-slate-200 light:text-slate-800">
                    <span className="mr-1.5 text-slate-500">{i + 1}.</span>
                    {f.steps[step.key]}
                    <span className="ml-2 text-xs font-normal text-slate-500">{f.stepHints[step.key]}</span>
                  </p>
                  <p className="text-xs tabular-nums text-slate-400 light:text-slate-600">
                    <span className="font-semibold text-slate-100 light:text-slate-900">{fill(f.sessions, { count: String(step.sessions) })}</span>
                    {" · "}
                    {fill(f.ofFirst, { value: percent(step.of_first) })}
                    {i > 0 ? <>{" · "}{fill(f.ofPrevious, { value: percent(step.of_previous) })}</> : null}
                  </p>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-[var(--text-primary)]/[0.06]" aria-hidden="true">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-600 to-blue-600"
                    style={{ width: step.sessions > 0 ? `max(${step.of_first ?? 0}%, 4px)` : "0" }}
                  />
                </div>
              </li>
            ))}
          </ol>

          <p className="text-xs leading-5 text-slate-400 light:text-slate-600">
            {fill(f.outside, { total: String(shown.converted_sessions), outside: String(shown.conversions_outside_funnel) })}
          </p>
        </>
      ) : null}
    </section>
  );
}
