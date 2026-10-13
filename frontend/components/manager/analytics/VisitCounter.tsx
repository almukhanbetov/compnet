"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, Info, Loader2, MousePointer2, RefreshCw, Users } from "lucide-react";
import { useManagerEvents, useManagerRealtime, useReconcileOnReconnect } from "@/components/manager/ManagerRealtime";
import type { AuthErrorHandler } from "@/components/manager/useInbox";
import { formatAlmatyTime } from "@/components/manager/analytics/periods";
import { useLocale } from "@/components/providers/LocaleProvider";
import { fetchAnalyticsVisits } from "@/lib/api/manager";
import { fill } from "@/lib/i18n";
import type { ApiAnalyticsVisits } from "@/types/api/analytics";
import type { RealtimeEvent } from "@/types/api/realtime";

/** Re-read cadence: a safety net while live (also turns "today" over at
 *  midnight), the fallback while the socket is down. */
const LIVE_REFRESH_MS = 60_000;
const OFFLINE_REFRESH_MS = 20_000;

const number = new Intl.NumberFormat("ru-RU");

function shortDate(day: string): string {
  return `${day.slice(8, 10)}.${day.slice(5, 7)}.${day.slice(0, 4)}`;
}

/**
 * "Посещаемость": today (Asia/Almaty) and all time, independent of the
 * period chosen below. Updated without a reload: the manager WebSocket says
 * "analytics_updated" (no data), the block re-reads the API; also after
 * every reconnect and on a timer.
 */
export default function VisitCounter({ onAuthError }: { onAuthError: AuthErrorHandler }) {
  const { t } = useLocale();
  const v = t.manager.analytics.visits;
  const [data, setData] = useState<ApiAnalyticsVisits | null>(null);
  const [failed, setFailed] = useState(false);
  const [loadedAt, setLoadedAt] = useState<string | null>(null);
  const { status } = useManagerRealtime();
  const live = status === "open";

  const load = useCallback(() => {
    void fetchAnalyticsVisits().then((result) => {
      if (result.kind === "ok") {
        setData(result.data.data);
        setFailed(false);
        setLoadedAt(new Date().toISOString());
      } else if (result.kind === "unauthorized") {
        onAuthError("unauthorized");
      } else if (result.kind === "forbidden") {
        onAuthError("forbidden");
      } else if (result.kind !== "aborted") {
        setFailed(true);
      }
    });
  }, [onAuthError]);

  useEffect(load, [load]);
  useReconcileOnReconnect(load);
  useManagerEvents(
    useCallback(
      (event: RealtimeEvent) => {
        if (event.type === "analytics_updated") load();
      },
      [load],
    ),
  );
  useEffect(() => {
    const timer = setInterval(load, live ? LIVE_REFRESH_MS : OFFLINE_REFRESH_MS);
    return () => clearInterval(timer);
  }, [live, load]);

  const cards = data
    ? [
        { key: "today", icon: MousePointer2, label: v.todayVisits, value: data.today_counts.visits, hint: v.visitHint, accent: true },
        {
          key: "all",
          icon: RefreshCw,
          label: v.allVisits,
          value: data.all_time.visits,
          hint: data.since ? fill(v.since, { date: shortDate(data.since) }) : v.noData,
          accent: false,
        },
        { key: "visitors", icon: Users, label: v.todayVisitors, value: data.today_counts.visitors, hint: v.visitorHint, accent: false },
        { key: "views", icon: Eye, label: v.todayViews, value: data.today_counts.page_views, hint: v.viewHint, accent: false },
      ]
    : [];

  return (
    <section aria-labelledby="visits-title" className="rounded-[24px] border border-violet-400/20 bg-gradient-to-br from-violet-600/10 via-blue-600/5 to-cyan-500/5 p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="visits-title" className="text-base font-semibold text-slate-100 light:text-slate-900">{v.title}</h2>
        <p role="status" className="flex items-center gap-1.5 text-[11px] text-slate-400 light:text-slate-600">
          {live ? <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> : <Loader2 className="h-3 w-3 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
          {live ? v.live : v.polling}
          {loadedAt ? <span className="tabular-nums">· {fill(v.updated, { time: formatAlmatyTime(loadedAt) })}</span> : null}
        </p>
      </div>

      {!data && !failed ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />{v.loading}</p>
      ) : null}
      {failed && !data ? (
        <p role="alert" className="mt-4 flex items-center gap-3 text-sm text-slate-400 light:text-slate-600">
          {v.failed}
          <button type="button" onClick={load} className="rounded-xl border border-[var(--text-primary)]/15 px-3 py-1 text-xs">{t.manager.analytics.retry}</button>
        </p>
      ) : null}

      {data ? (
        <>
          {!data.enabled ? (
            <p role="status" className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-200 light:text-amber-800">{v.disabled}</p>
          ) : null}
          <dl className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {cards.map(({ key, icon: Icon, label, value, hint, accent }) => (
              <div
                key={key}
                className={`rounded-2xl border p-3 md:p-4 ${accent ? "border-violet-400/30 bg-violet-600/10" : "border-[var(--text-primary)]/10 bg-[var(--surface)]/60"}`}
              >
                <dt className="flex items-center gap-1.5 text-xs text-slate-400 light:text-slate-600">
                  <Icon className="h-3.5 w-3.5 shrink-0 text-cyan-300 light:text-cyan-700" aria-hidden="true" />
                  {label}
                </dt>
                <dd className="mt-1.5 text-2xl font-bold tabular-nums text-slate-100 md:text-3xl light:text-slate-900" data-testid={`visits-${key}`}>
                  {number.format(value ?? 0)}
                </dd>
                <dd className="mt-0.5 text-[11px] leading-4 text-slate-500">{hint}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-400 light:text-slate-600">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300 light:text-cyan-700" aria-hidden="true" />
            <span>{v.scope}</span>
          </p>
        </>
      ) : null}
    </section>
  );
}
