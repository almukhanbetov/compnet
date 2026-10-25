"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Info, Loader2, RefreshCw } from "lucide-react";
import { useManagerEvents } from "@/components/manager/ManagerRealtime";
import { isRequestEvent } from "@/components/manager/requests/useNewRequestCount";
import type { AuthErrorHandler } from "@/components/manager/useInbox";
import { useLocale } from "@/components/providers/LocaleProvider";
import { fetchTrafficSources } from "@/lib/api/manager";
import { fill } from "@/lib/i18n";
import type { ApiChannelRow, ApiSourcesReport, SessionChannel } from "@/types/api/analyticsSources";
import type { RealtimeEvent } from "@/types/api/realtime";

const card = "rounded-2xl border border-[var(--text-primary)]/10 bg-[var(--surface)]/60 p-4";

/** A share from the API (one decimal, null = nothing to divide by). */
function percent(value: number | null): string {
  return value === null ? "—" : `${value}%`;
}

type Row = ApiChannelRow & { key: SessionChannel };

/** Share of all sessions: one bar per channel, on the same scale. */
function ShareBar({ value }: { value: number | null }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--text-primary)]/[0.06]" aria-hidden="true">
      <div
        className="h-full rounded-full bg-gradient-to-r from-violet-600 to-blue-600"
        style={{ width: value ? `max(${value}%, 3px)` : "0" }}
      />
    </div>
  );
}

/** New (cyan) vs returning (violet) visitors of a channel. */
function VisitorsBar({ row }: { row: Row }) {
  if (row.visitors === 0) return null;
  const newShare = (row.new_visitors / row.visitors) * 100;
  return (
    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-[var(--text-primary)]/[0.06]" aria-hidden="true">
      <div className="h-full bg-cyan-400/80" style={{ width: `${newShare}%` }} />
      <div className="h-full bg-violet-500/80" style={{ width: `${100 - newShare}%` }} />
    </div>
  );
}

/**
 * Sessions of the dashboard's period by channel — of the session itself or
 * of the visitor's first session — with new and returning visitors and
 * conversion. Counts come from the server (GET /analytics/sources); the
 * channel rules are the request channels' rules, applied when reading.
 */
export default function SourcesReport({
  range,
  onAuthError,
}: {
  range: { from: string; to: string };
  onAuthError: AuthErrorHandler;
}) {
  const { t } = useLocale();
  const s = t.manager.analytics.trafficSources;
  const [view, setView] = useState<"session" | "first">("session");
  const [data, setData] = useState<ApiSourcesReport | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<{ key: string; ok: boolean } | null>(null);
  const requestKey = `${range.from}|${range.to}|${attempt}`;
  const state: "loading" | "ready" | "error" = settled?.key !== requestKey ? "loading" : settled.ok ? "ready" : "error";

  // The quiet re-read in flight; a new period or re-read cancels it, so a
  // late answer for another period never replaces the current figures.
  const quiet = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetchTrafficSources(range.from, range.to, controller.signal).then((result) => {
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
        void fetchTrafficSources(range.from, range.to, controller.signal).then((result) => {
          if (result.kind === "ok" && !controller.signal.aborted) setData(result.data.data);
        });
      },
      [range, requestKey, settled],
    ),
  );

  // Figures of another period are never shown, not even while loading.
  const shown = data && data.period.from === range.from && data.period.to === range.to ? data : null;
  const rows: Row[] = shown ? (view === "session" ? shown.channels : shown.first_channels) : [];
  const c = s.columns;
  const totals = shown?.totals;

  return (
    <section className={`${card} space-y-4`} aria-labelledby="traffic-sources-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl">
          <h2 id="traffic-sources-title" className="text-base font-semibold text-slate-100 light:text-slate-900">{s.title}</h2>
          <p className="mt-1 flex items-start gap-1.5 text-xs leading-5 text-slate-400 light:text-slate-600">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {s.hint}
          </p>
        </div>
        {state === "loading" ? (
          <Loader2 className="h-4 w-4 animate-spin text-slate-400 motion-reduce:animate-none" aria-label={t.manager.analytics.loading} />
        ) : null}
      </div>

      <div role="group" aria-label={s.views.label} className="inline-flex flex-wrap gap-1 rounded-xl border border-[var(--text-primary)]/15 p-1">
        {(["session", "first"] as const).map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={view === key}
            onClick={() => setView(key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              view === key ? "bg-gradient-to-r from-violet-600 to-blue-600 text-white" : "text-slate-300 hover:bg-[var(--text-primary)]/10 light:text-slate-700"
            }`}
          >
            {s.views[key]}
          </button>
        ))}
      </div>

      {state === "error" ? (
        <div role="alert" className="flex items-center gap-3 text-sm text-slate-400 light:text-slate-600">
          {s.failed}
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

      {totals && totals.sessions === 0 ? <p className="text-sm text-slate-400 light:text-slate-600">{s.empty}</p> : null}

      {totals && totals.sessions > 0 ? (
        <>
          <p data-testid="traffic-totals" className="text-xs text-slate-400 light:text-slate-600">
            {fill(s.totals, {
              sessions: String(totals.sessions),
              visitors: String(totals.visitors),
              new: String(totals.new_visitors),
              returning: String(totals.returning_visitors),
              converted: String(totals.converted_sessions),
              conversion: percent(totals.conversion),
            })}
          </p>
          <p className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500" aria-hidden="true">
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-cyan-400/80" />{c.newVisitors}</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-violet-500/80" />{c.returning}</span>
          </p>

          {/* Wide screens: a table. */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-xs [&_td]:px-2 [&_th]:px-2 [&_td:first-child]:pl-0 [&_th:first-child]:pl-0">
              <thead className="text-slate-500">
                <tr>
                  <th className="py-1.5 font-medium">{c.channel}</th>
                  <th className="py-1.5 text-right font-medium">{c.sessions}</th>
                  <th className="py-1.5 text-right font-medium">{c.visitors}</th>
                  <th className="py-1.5 text-right font-medium">{c.newVisitors}</th>
                  <th className="py-1.5 text-right font-medium">{c.returning}</th>
                  <th className="py-1.5 text-right font-medium">{c.converted}</th>
                  <th className="py-1.5 text-right font-medium">{c.conversion}</th>
                  <th className="w-[22%] py-1.5 font-medium">{c.share}</th>
                </tr>
              </thead>
              <tbody className="text-slate-300 light:text-slate-700">
                {rows.map((row) => (
                  <tr key={row.key} data-channel={row.key} className={`border-t border-[var(--text-primary)]/5 ${row.sessions === 0 ? "text-slate-500" : ""}`}>
                    <td className="py-2">
                      <span className="block">{s.channels[row.key]}</span>
                      <span className="mt-1 block max-w-[10rem]"><VisitorsBar row={row} /></span>
                    </td>
                    <td className="py-2 text-right tabular-nums">{row.sessions}</td>
                    <td className="py-2 text-right tabular-nums">{row.visitors}</td>
                    <td className="py-2 text-right tabular-nums">{row.new_visitors}</td>
                    <td className="py-2 text-right tabular-nums">{row.returning_visitors}</td>
                    <td className="py-2 text-right tabular-nums">{row.converted_sessions}</td>
                    <td className="py-2 text-right tabular-nums">{percent(row.conversion)}</td>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <span className="flex-1"><ShareBar value={row.share} /></span>
                        <span className="w-12 text-right tabular-nums">{percent(row.share)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phones: one card per channel, nothing to scroll sideways. */}
          <ul className="space-y-2 md:hidden" aria-label={s.title}>
            {rows.map((row) => (
              <li key={row.key} data-channel={row.key} className={`rounded-xl border border-[var(--text-primary)]/10 p-3 ${row.sessions === 0 ? "opacity-60" : ""}`}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-slate-200 light:text-slate-800">{s.channels[row.key]}</span>
                  <span className="text-xs tabular-nums text-slate-400">{percent(row.share)}</span>
                </div>
                <div className="mt-1.5"><ShareBar value={row.share} /></div>
                <dl className="mt-2 grid grid-cols-3 gap-x-3 gap-y-1 text-[11px] text-slate-400 light:text-slate-600">
                  <div><dt>{c.sessions}</dt><dd className="tabular-nums text-slate-200 light:text-slate-800">{row.sessions}</dd></div>
                  <div><dt>{c.newVisitors}</dt><dd className="tabular-nums text-slate-200 light:text-slate-800">{row.new_visitors}</dd></div>
                  <div><dt>{c.returning}</dt><dd className="tabular-nums text-slate-200 light:text-slate-800">{row.returning_visitors}</dd></div>
                  <div><dt>{c.visitors}</dt><dd className="tabular-nums text-slate-200 light:text-slate-800">{row.visitors}</dd></div>
                  <div><dt>{c.converted}</dt><dd className="tabular-nums text-slate-200 light:text-slate-800">{row.converted_sessions}</dd></div>
                  <div><dt>{c.conversion}</dt><dd className="tabular-nums text-slate-200 light:text-slate-800">{percent(row.conversion)}</dd></div>
                </dl>
                <div className="mt-2"><VisitorsBar row={row} /></div>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
