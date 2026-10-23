"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  EyeOff,
  Info,
  Loader2,
  MessageCircle,
  MessagesSquare,
  MonitorSmartphone,
  MousePointerClick,
  Phone,
  RefreshCw,
  Users,
  X,
} from "lucide-react";
import ManagerHeader from "@/components/manager/ManagerHeader";
import { useManagerEvents } from "@/components/manager/ManagerRealtime";
import VisitCounter from "@/components/manager/analytics/VisitCounter";
import LeadsReport from "@/components/manager/analytics/LeadsReport";
import { useLocale } from "@/components/providers/LocaleProvider";
import type { AuthErrorHandler } from "@/components/manager/useInbox";
import {
  almatyToday,
  formatAlmaty,
  formatAlmatyTime,
  presetRange,
  shortDay,
  type PeriodKey,
} from "@/components/manager/analytics/periods";
import { fetchAnalyticsReport, fetchAnalyticsSession } from "@/lib/api/manager";
import { isOptedOut, setOptedOut } from "@/lib/analytics/tracker";
import { fill } from "@/lib/i18n";
import type { ApiStaffUser } from "@/types/api/manager";
import type { RealtimeEvent } from "@/types/api/realtime";
import type { ApiAnalyticsReport, ApiAnalyticsSession, ApiAnalyticsSessionDetail, ApiAnalyticsSource } from "@/types/api/analytics";

interface Props {
  user: ApiStaffUser;
  onAuthError: AuthErrorHandler;
  onLogout: () => Promise<string | null>;
}

const presets: Array<Exclude<PeriodKey, "custom">> = ["today", "yesterday", "d7", "d30", "month"];
const card = "rounded-2xl border border-[var(--text-primary)]/10 bg-[var(--surface)]/60 p-4";

function pct(part: number, whole: number): string {
  if (whole === 0) return "—";
  return `${((part / whole) * 100).toFixed(1).replace(".0", "")}%`;
}

export default function AnalyticsDashboard({ user, onAuthError, onLogout }: Props) {
  const { t } = useLocale();
  const a = t.manager.analytics;
  const [period, setPeriod] = useState<PeriodKey>("d7");
  const [range, setRange] = useState(() => presetRange("d7"));
  const [draft, setDraft] = useState(range);
  const [report, setReport] = useState<ApiAnalyticsReport | null>(null);
  const [attempt, setAttempt] = useState(0);
  // Which request the shown data / error belongs to; anything else is loading.
  const [settled, setSettled] = useState<{ key: string; ok: boolean } | null>(null);
  // ?session=<id> (link from a request card) opens that visit's history.
  const [openSession, setOpenSession] = useState<string | null>(() =>
    typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("session"),
  );
  // Rendered only in the browser (after the sign-in check), so storage is available.
  const [optedOut, setOptedOutState] = useState(() => isOptedOut());
  const requestKey = `${range.from}|${range.to}|${attempt}`;
  const state: "loading" | "ready" | "error" = settled?.key !== requestKey ? "loading" : settled.ok ? "ready" : "error";

  // The quiet re-read in flight. A new period or re-read cancels it, so a
  // late answer for another period never replaces the current figures.
  const quiet = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetchAnalyticsReport(range.from, range.to, controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      if (result.kind === "ok") {
        setReport(result.data.data);
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

  // New visits stored: re-read the report quietly (no loading state).
  useManagerEvents(
    useCallback(
      (event: RealtimeEvent) => {
        if (event.type !== "analytics_updated" || settled?.key !== requestKey) return;
        quiet.current?.abort();
        const controller = new AbortController();
        quiet.current = controller;
        void fetchAnalyticsReport(range.from, range.to, controller.signal).then((result) => {
          if (result.kind === "ok" && !controller.signal.aborted) setReport(result.data.data);
        });
      },
      [range, requestKey, settled],
    ),
  );

  const choose = (key: Exclude<PeriodKey, "custom">) => {
    setPeriod(key);
    const next = presetRange(key);
    setRange(next);
    setDraft(next);
  };

  const closeSession = useCallback(() => {
    setOpenSession(null);
    const url = new URL(window.location.href);
    if (url.searchParams.has("session")) {
      url.searchParams.delete("session");
      window.history.replaceState(null, "", url.pathname + url.search);
    }
  }, []);

  const toggleOptOut = () => {
    setOptedOut(!optedOut);
    setOptedOutState(!optedOut);
  };

  const sourceLabel = useCallback(
    (source: string, medium: string) =>
      source === "(direct)" ? a.direct : `${source} / ${medium === "(not set)" ? a.notSet : medium}`,
    [a.direct, a.notSet],
  );

  return (
    <div className="min-h-[100dvh] bg-[var(--background)]">
      <ManagerHeader current="analytics" user={user} onLogout={() => void onLogout()} sticky />

      <main className="mx-auto max-w-[1440px] space-y-5 px-4 py-5 md:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 light:text-slate-900">{a.title}</h1>
            <p className="mt-0.5 text-xs text-slate-400 light:text-slate-600">{a.tz}</p>
          </div>
          <button
            type="button"
            onClick={toggleOptOut}
            aria-pressed={optedOut}
            title={a.exclude.hint}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition ${
              optedOut
                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200 light:text-emerald-800"
                : "border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 text-slate-300 hover:bg-[var(--text-primary)]/10 light:text-slate-700"
            }`}
          >
            <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
            {optedOut ? a.exclude.on : a.exclude.off}
          </button>
        </div>

        <VisitCounter onAuthError={onAuthError} />

        <div role="group" aria-label={a.periodLabel} className="flex flex-wrap items-center gap-2">
          {presets.map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={period === key}
              onClick={() => choose(key)}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                period === key
                  ? "bg-gradient-to-r from-violet-600 to-blue-600 text-white"
                  : "border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 text-slate-300 hover:bg-[var(--text-primary)]/10 light:text-slate-700"
              }`}
            >
              {a.periods[key]}
            </button>
          ))}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (draft.from && draft.to && draft.from <= draft.to) {
                setPeriod("custom");
                setRange(draft);
              }
            }}
            className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--text-primary)]/15 px-2 py-1"
          >
            <label className="text-xs text-slate-400 light:text-slate-600" htmlFor="an-from">{a.from}</label>
            <input
              id="an-from"
              type="date"
              value={draft.from}
              max={almatyToday()}
              onChange={(event) => setDraft((prev) => ({ ...prev, from: event.target.value }))}
              className="rounded-lg bg-transparent px-1 py-1 text-sm text-slate-200 light:text-slate-800"
            />
            <label className="text-xs text-slate-400 light:text-slate-600" htmlFor="an-to">{a.to}</label>
            <input
              id="an-to"
              type="date"
              value={draft.to}
              max={almatyToday()}
              onChange={(event) => setDraft((prev) => ({ ...prev, to: event.target.value }))}
              className="rounded-lg bg-transparent px-1 py-1 text-sm text-slate-200 light:text-slate-800"
            />
            <button
              type="submit"
              aria-pressed={period === "custom"}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${period === "custom" ? "bg-gradient-to-r from-violet-600 to-blue-600 text-white" : "text-cyan-300 light:text-cyan-700"}`}
            >
              {a.apply}
            </button>
          </form>
        </div>

        {report && !report.settings.enabled ? (
          <p role="status" className="flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-2.5 text-xs text-amber-200 light:text-amber-800">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {a.disabled}
          </p>
        ) : null}

        {/* Requests come from the requests themselves: shown even when the
            visit report is still loading or failed. */}
        <LeadsReport range={range} onAuthError={onAuthError} />

        {state === "loading" && !report ? (
          <p className="flex items-center gap-2 py-16 text-sm text-slate-400 light:text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            {a.loading}
          </p>
        ) : null}
        {state === "error" ? (
          <div role="alert" className="flex items-center gap-3 py-10 text-sm text-slate-400 light:text-slate-600">
            {a.failed}
            <button
              type="button"
              onClick={() => setAttempt((n) => n + 1)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--text-primary)]/15 px-3 py-1.5 text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              {a.retry}
            </button>
          </div>
        ) : null}

        {/* A failed load hides the earlier period's figures (see the error above). */}
        {report && state !== "error" ? (
          <div className={`space-y-5 transition-opacity ${state === "loading" ? "opacity-60" : ""}`}>
            <Cards report={report} />
            <DailyChart report={report} />
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <SourceTable title={a.sources.title} rows={report.sources} labelOf={sourceLabel} />
              <SourceTable title={a.sources.first} rows={report.first_sources} labelOf={sourceLabel} />
            </div>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[2fr_1fr]">
              <SourceTable title={a.sources.campaigns} rows={report.campaigns} labelOf={sourceLabel} withCampaign />
              <Breakdowns report={report} />
            </div>
            <PagesTable report={report} />
            <RecentSessions report={report} labelOf={sourceLabel} onOpen={setOpenSession} />
            <p className="flex items-start gap-2 text-xs leading-5 text-slate-500">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>
                {a.limitations} {fill(a.retention, { days: String(report.settings.retention_days) })}
              </span>
            </p>
          </div>
        ) : null}
      </main>

      {openSession ? (
        <SessionPanel id={openSession} labelOf={sourceLabel} onClose={closeSession} onAuthError={onAuthError} />
      ) : null}
    </div>
  );
}

function Cards({ report }: { report: ApiAnalyticsReport }) {
  const { t } = useLocale();
  const c = t.manager.analytics.cards;
  const x = report.totals;
  const requestsHref = `/manager/requests?from=${report.period.from}&to=${report.period.to}`;
  const items: Array<{ icon: typeof Users; label: string; value: number; hint?: string; href?: string }> = [
    { icon: Users, label: c.visitors, value: x.visitors, hint: c.visitorsHint },
    { icon: MonitorSmartphone, label: c.sessions, value: x.sessions },
    { icon: BarChart3, label: c.pageViews, value: x.page_views },
    { icon: MessagesSquare, label: c.requests, value: x.requests, hint: fill(c.linked, { count: String(x.linked_requests) }), href: requestsHref },
    { icon: MessageCircle, label: c.newChats, value: x.new_chats, hint: fill(c.linked, { count: String(x.linked_chats) }) },
    { icon: MousePointerClick, label: c.whatsapp, value: x.whatsapp_clicks, hint: c.clicksHint },
    { icon: Phone, label: c.phone, value: x.phone_clicks, hint: c.clicksHint },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
      {items.map(({ icon: Icon, label, value, hint, href }) => {
        const body = (
          <>
            <p className="flex items-center gap-1.5 text-xs text-slate-400 light:text-slate-600">
              <Icon className="h-3.5 w-3.5 shrink-0 text-cyan-300 light:text-cyan-700" aria-hidden="true" />
              {label}
            </p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-slate-100 light:text-slate-900">{value}</p>
            {hint ? <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p> : null}
          </>
        );
        return href ? (
          <Link
            key={label}
            href={href}
            title={c.openRequests}
            className={`${card} group block transition hover:border-cyan-400/40 hover:bg-[var(--text-primary)]/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60`}
          >
            {body}
            <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-300 light:text-cyan-700">
              {c.openRequests}
              <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" aria-hidden="true" />
            </span>
          </Link>
        ) : (
          <div key={label} className={card}>
            {body}
          </div>
        );
      })}
      <p className="col-span-2 flex items-start gap-2 rounded-xl border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.03] px-3 py-2 text-xs leading-5 text-slate-300 md:col-span-4 xl:order-last xl:col-span-8 light:text-slate-700">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300 light:text-cyan-700" aria-hidden="true" />
        {fill(c.split, {
          all: String(x.requests + x.new_chats),
          requests: String(x.requests),
          chats: String(x.new_chats),
          linked: String(x.linked_requests + x.linked_chats),
        })}
      </p>
      <div className={`${card} col-span-2 md:col-span-4 xl:col-span-1 border-violet-400/30 bg-gradient-to-br from-violet-600/15 to-blue-600/10`}>
        <p className="text-xs text-slate-300 light:text-slate-700">{c.conversion}</p>
        <p className="mt-2 text-2xl font-bold tabular-nums text-slate-100 light:text-slate-900">{pct(x.converted_sessions, x.sessions)}</p>
        <p className="mt-0.5 text-[11px] text-slate-400 light:text-slate-600">
          {fill(c.conversionHint, { converted: String(x.converted_sessions), sessions: String(x.sessions) })}
        </p>
      </div>
    </div>
  );
}

function DailyChart({ report }: { report: ApiAnalyticsReport }) {
  const { t } = useLocale();
  const ch = t.manager.analytics.chart;
  const days = report.days;
  const max = Math.max(1, ...days.map((d) => d.sessions));
  const width = Math.max(320, days.length * 28);
  const height = 160;
  const barW = Math.max(6, Math.min(22, width / days.length - 6));
  const step = width / Math.max(1, days.length);
  const labelEvery = Math.ceil(days.length / 10);
  return (
    <section className={card} aria-label={ch.title}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-100 light:text-slate-900">{ch.title}</h2>
        <div className="flex items-center gap-3 text-[11px] text-slate-400 light:text-slate-600">
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-blue-500" />{ch.sessions}</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-pink-500" />{ch.conversions}</span>
        </div>
      </div>
      {report.totals.sessions === 0 && report.totals.requests === 0 && report.totals.new_chats === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">{ch.empty}</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <svg viewBox={`0 0 ${width} ${height + 22}`} width="100%" height={height + 22} preserveAspectRatio="none" role="img" aria-label={ch.title}>
            {[0.25, 0.5, 0.75, 1].map((f) => (
              <line key={f} x1="0" x2={width} y1={height - f * (height - 10)} y2={height - f * (height - 10)} className="stroke-[var(--text-primary)]/10" strokeWidth="1" />
            ))}
            {days.map((d, i) => {
              const h = (d.sessions / max) * (height - 10);
              const x = i * step + (step - barW) / 2;
              const cy = height - (d.converted_sessions / max) * (height - 10);
              return (
                <g key={d.day}>
                  <title>{`${shortDay(d.day)}: ${ch.sessions} ${d.sessions}, ${ch.conversions} ${d.converted_sessions}`}</title>
                  <rect x={x} y={height - h} width={barW} height={Math.max(h, d.sessions ? 2 : 0)} rx="3" className="fill-blue-500/80" />
                  {d.converted_sessions > 0 ? <circle cx={x + barW / 2} cy={cy} r="4" className="fill-pink-500" /> : null}
                  {i % labelEvery === 0 ? (
                    <text x={x + barW / 2} y={height + 15} textAnchor="middle" className="fill-slate-500 text-[10px]">
                      {shortDay(d.day)}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </section>
  );
}

function SourceTable({
  title,
  rows,
  labelOf,
  withCampaign = false,
}: {
  title: string;
  rows: ApiAnalyticsSource[];
  labelOf: (source: string, medium: string) => string;
  withCampaign?: boolean;
}) {
  const { t } = useLocale();
  const s = t.manager.analytics.sources;
  return (
    <section className={card} aria-label={title}>
      <h2 className="text-sm font-semibold text-slate-100 light:text-slate-900">{title}</h2>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-xs text-slate-500">{t.manager.analytics.chart.empty}</p>
      ) : (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-xs [&_td]:px-2 [&_th]:px-2 [&_td:first-child]:pl-0 [&_th:first-child]:pl-0">
            <thead className="text-slate-500">
              <tr>
                <th className="py-1.5 font-medium">{s.source}</th>
                {withCampaign ? <th className="py-1.5 font-medium">{s.campaign}</th> : null}
                <th className="py-1.5 text-right font-medium">{s.sessions}</th>
                <th className="py-1.5 text-right font-medium">{s.visitors}</th>
                <th className="py-1.5 text-right font-medium">{s.converted}</th>
                <th className="py-1.5 text-right font-medium">{s.rate}</th>
              </tr>
            </thead>
            <tbody className="text-slate-300 light:text-slate-700">
              {rows.map((row) => (
                <tr key={`${row.source}|${row.medium}|${row.campaign ?? ""}`} className="border-t border-[var(--text-primary)]/5">
                  <td className="max-w-[14rem] truncate py-1.5">{labelOf(row.source, row.medium)}</td>
                  {withCampaign ? <td className="max-w-[12rem] truncate py-1.5">{row.campaign}</td> : null}
                  <td className="py-1.5 text-right tabular-nums">{row.sessions}</td>
                  <td className="py-1.5 text-right tabular-nums">{row.visitors}</td>
                  <td className="py-1.5 text-right tabular-nums">{row.converted_sessions}</td>
                  <td className="py-1.5 text-right tabular-nums">{pct(row.converted_sessions, row.sessions)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Breakdowns({ report }: { report: ApiAnalyticsReport }) {
  const { t } = useLocale();
  const a = t.manager.analytics;
  const total = Math.max(1, report.totals.sessions);
  const bar = (key: string, label: string, value: number) => (
    <li key={key}>
      <div className="flex justify-between text-xs text-slate-300 light:text-slate-700">
        <span>{label}</span>
        <span className="tabular-nums">{value} · {pct(value, total)}</span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-[var(--text-primary)]/10">
        <div className="h-1.5 rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" style={{ width: `${(value / total) * 100}%` }} />
      </div>
    </li>
  );
  const deviceLabel = (key: string) => a.devices[key as "desktop" | "mobile" | "tablet"] ?? key;
  const languageLabel = (key: string) => (key === "kk" ? "KZ" : key === "" ? a.languages.unknown : key.toUpperCase());
  return (
    <section className={`${card} space-y-4`}>
      <div>
        <h2 className="text-sm font-semibold text-slate-100 light:text-slate-900">{a.devices.title}</h2>
        <ul className="mt-2 space-y-2">{report.devices.map((d) => bar(d.key, deviceLabel(d.key), d.sessions))}</ul>
      </div>
      <div>
        <h2 className="text-sm font-semibold text-slate-100 light:text-slate-900">{a.languages.title}</h2>
        <ul className="mt-2 space-y-2">{report.languages.map((d) => bar(d.key || "none", languageLabel(d.key), d.sessions))}</ul>
      </div>
    </section>
  );
}

function PagesTable({ report }: { report: ApiAnalyticsReport }) {
  const { t } = useLocale();
  const p = t.manager.analytics.pages;
  const max = Math.max(1, ...report.pages.map((row) => row.views));
  return (
    <section className={card} aria-label={p.title}>
      <h2 className="text-sm font-semibold text-slate-100 light:text-slate-900">{p.title}</h2>
      {report.pages.length === 0 ? (
        <p className="py-6 text-center text-xs text-slate-500">{t.manager.analytics.chart.empty}</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {report.pages.map((row) => (
            <li key={row.path} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-xs">
              <div className="relative overflow-hidden rounded-md bg-[var(--text-primary)]/[0.04] px-2 py-1">
                <div className="absolute inset-y-0 left-0 bg-blue-500/15" style={{ width: `${(row.views / max) * 100}%` }} />
                <span className="relative block truncate text-slate-300 light:text-slate-700">{row.path}</span>
              </div>
              <span className="tabular-nums text-slate-400 light:text-slate-600">
                {row.views} {p.views.toLowerCase()} · {row.sessions} {p.sessions.toLowerCase()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ActionBadges({ s }: { s: ApiAnalyticsSession }) {
  const { t } = useLocale();
  const ac = t.manager.analytics.actions;
  const list = [
    [s.promo_views, ac.promo_view],
    [s.promo_clicks, ac.promo_click],
    [s.whatsapp_clicks, ac.whatsapp_click],
    [s.phone_clicks, ac.phone_click],
    [s.chat_opens, ac.chat_open],
  ] as const;
  const shown = list.filter(([n]) => n > 0);
  if (shown.length === 0) return <span className="text-slate-500">—</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {shown.map(([n, label]) => (
        <span key={label} className="rounded-md bg-[var(--text-primary)]/[0.06] px-1.5 py-0.5 text-[10px] text-slate-300 light:text-slate-700">
          {label}{n > 1 ? ` ×${n}` : ""}
        </span>
      ))}
    </span>
  );
}

function RecentSessions({
  report,
  labelOf,
  onOpen,
}: {
  report: ApiAnalyticsReport;
  labelOf: (source: string, medium: string) => string;
  onOpen: (id: string) => void;
}) {
  const { t } = useLocale();
  const r = t.manager.analytics.recent;
  const o = t.manager.analytics.outcome;
  return (
    <section className={card} aria-label={r.title}>
      <h2 className="text-sm font-semibold text-slate-100 light:text-slate-900">{r.title}</h2>
      {report.recent_sessions.length === 0 ? (
        <p className="py-6 text-center text-xs text-slate-500">{r.empty}</p>
      ) : (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs [&_td]:px-2 [&_th]:px-2 [&_td:first-child]:pl-0 [&_th:first-child]:pl-0">
            <thead className="text-slate-500">
              <tr>
                <th className="py-1.5 font-medium">{r.started}</th>
                <th className="py-1.5 font-medium">{r.source}</th>
                <th className="py-1.5 font-medium">{r.landing}</th>
                <th className="py-1.5 text-right font-medium">{r.pages}</th>
                <th className="py-1.5 font-medium">{r.actions}</th>
                <th className="py-1.5 font-medium">{r.outcome}</th>
                <th className="py-1.5" />
              </tr>
            </thead>
            <tbody className="text-slate-300 light:text-slate-700">
              {report.recent_sessions.map((s) => (
                <tr key={s.id} className="border-t border-[var(--text-primary)]/5 align-top">
                  <td className="whitespace-nowrap py-2 tabular-nums">{formatAlmaty(s.started_at)}</td>
                  <td className="max-w-[12rem] py-2">
                    <span className="block truncate">{labelOf(s.source, s.medium)}</span>
                    {s.campaign ? <span className="block truncate text-[10px] text-slate-500">{s.campaign}</span> : null}
                  </td>
                  <td className="max-w-[10rem] truncate py-2">{s.landing_path}</td>
                  <td className="py-2 text-right tabular-nums">{s.page_views}</td>
                  <td className="py-2"><ActionBadges s={s} /></td>
                  <td className="py-2">
                    <span className="flex flex-wrap gap-1">
                      {s.request_ids.length > 0 ? (
                        <span className="rounded-md bg-emerald-400/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-200 light:text-emerald-800">{o.request}</span>
                      ) : null}
                      {s.conversation_ids.length > 0 ? (
                        <span className="rounded-md bg-cyan-400/15 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-200 light:text-cyan-800">{o.chat}</span>
                      ) : null}
                      {s.request_ids.length + s.conversation_ids.length === 0 ? <span className="text-slate-500">—</span> : null}
                    </span>
                  </td>
                  <td className="py-2 text-right">
                    <button
                      type="button"
                      onClick={() => onOpen(s.id)}
                      className="rounded-lg border border-[var(--text-primary)]/15 px-2 py-1 text-[11px] font-medium text-cyan-300 hover:bg-[var(--text-primary)]/5 light:text-cyan-700"
                    >
                      {r.open}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function SessionPanel({
  id,
  labelOf,
  onClose,
  onAuthError,
}: {
  id: string;
  labelOf: (source: string, medium: string) => string;
  onClose: () => void;
  onAuthError: AuthErrorHandler;
}) {
  const { t } = useLocale();
  const a = t.manager.analytics;
  const d = a.detail;
  const [detail, setDetail] = useState<ApiAnalyticsSessionDetail | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void fetchAnalyticsSession(id, controller.signal).then((result) => {
      if (result.kind === "ok") setDetail(result.data.data);
      else if (result.kind === "unauthorized") onAuthError("unauthorized");
      else if (result.kind !== "aborted") setFailed(true);
    });
    return () => controller.abort();
  }, [id, onAuthError]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const s = detail?.session;
  const facts = useMemo(
    () =>
      s
        ? ([
            [a.recent.source, labelOf(s.source, s.medium) + (s.campaign ? ` · ${s.campaign}` : "")],
            [d.firstSource, labelOf(s.first_source, s.first_medium) + (s.first_campaign ? ` · ${s.first_campaign}` : "")],
            [d.referrer, s.referrer_host || "—"],
            [d.landing, s.landing_path],
            [d.device, a.devices[s.device]],
            [d.language, s.language ? (s.language === "kk" ? "KZ" : s.language.toUpperCase()) : a.languages.unknown],
          ] as const)
        : [],
    [s, a, d, labelOf],
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-title"
        onClick={(event) => event.stopPropagation()}
        className="h-full w-full max-w-lg overflow-y-auto border-l border-[var(--text-primary)]/10 bg-[var(--surface)] p-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="session-title" className="text-lg font-semibold text-slate-100 light:text-slate-900">
              {d.title}
              {s ? <span className="ml-2 text-sm font-normal text-slate-400">{formatAlmaty(s.started_at)}</span> : null}
            </h2>
            <p className="text-xs text-slate-500">{d.path}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={d.close} className="rounded-xl border border-[var(--text-primary)]/15 p-2">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {!detail && !failed ? (
          <p className="mt-6 flex items-center gap-2 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />{d.loading}</p>
        ) : null}
        {failed ? <p className="mt-6 text-sm text-rose-300 light:text-rose-700">{a.failed}</p> : null}

        {detail && s ? (
          <>
            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
              {facts.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="min-w-0 truncate text-slate-200 light:text-slate-800">{v}</dd>
                </div>
              ))}
            </dl>

            {detail.requests.length + detail.conversations.length > 0 ? (
              <div className="mt-4 space-y-2">
                {detail.requests.map((r) => (
                  <div key={r.id} className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-3 text-xs text-emerald-100 light:text-emerald-900">
                    <p className="font-semibold">{fill(d.request, { number: String(r.number) })} · {r.project_type} · {formatAlmaty(r.created_at)}</p>
                    <p className="mt-0.5 opacity-80">{d.requestNote}</p>
                    <Link href={`/manager/requests?id=${r.id}`} className="mt-1 inline-block font-semibold underline underline-offset-2">
                      {d.openRequest}
                    </Link>
                  </div>
                ))}
                {detail.conversations.map((c) => (
                  <div key={c.id} className="rounded-xl border border-cyan-400/25 bg-cyan-400/10 p-3 text-xs text-cyan-100 light:text-cyan-900">
                    <p className="font-semibold">{d.chat}</p>
                    <p className="mt-0.5">
                      {c.visitor_name || c.visitor_contact
                        ? fill(d.visitorLeft, { value: [c.visitor_name, c.visitor_contact].filter(Boolean).join(", ") })
                        : d.nothingLeft}
                    </p>
                    <Link href={`/manager?conversation=${c.id}`} className="mt-1 inline-block font-semibold underline underline-offset-2">
                      {d.openChat}
                    </Link>
                  </div>
                ))}
              </div>
            ) : null}

            <h3 className="mt-5 text-sm font-semibold text-slate-100 light:text-slate-900">{d.events}</h3>
            <ol className="mt-2 space-y-1.5 border-l border-[var(--text-primary)]/10 pl-4">
              {detail.events.map((e) => {
                const conversion = e.type === "lead_submit" || e.type === "chat_first_message";
                return (
                  <li key={e.id} className="relative text-xs">
                    <span
                      aria-hidden="true"
                      className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ${conversion ? "bg-pink-500" : e.type === "page_view" ? "bg-blue-500" : "bg-cyan-400"}`}
                    />
                    <span className="tabular-nums text-slate-500">{formatAlmatyTime(e.occurred_at)}</span>{" "}
                    <span className={conversion ? "font-semibold text-pink-300 light:text-pink-700" : "text-slate-200 light:text-slate-800"}>
                      {a.eventTypes[e.type]}
                    </span>
                    {e.path ? <span className="text-slate-400"> · {e.path}</span> : null}
                  </li>
                );
              })}
            </ol>
          </>
        ) : null}
      </aside>
    </div>
  );
}
