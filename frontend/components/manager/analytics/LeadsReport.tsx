"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { Info, Loader2, RefreshCw } from "lucide-react";
import { useManagerEvents } from "@/components/manager/ManagerRealtime";
import { shortDay } from "@/components/manager/analytics/periods";
import { projectTypeLabel } from "@/components/manager/requests/labels";
import { isRequestEvent } from "@/components/manager/requests/useNewRequestCount";
import type { AuthErrorHandler } from "@/components/manager/useInbox";
import { useLocale } from "@/components/providers/LocaleProvider";
import { projectPricingList } from "@/data/projectPricing";
import { fetchLeadsReport } from "@/lib/api/manager";
import { fill } from "@/lib/i18n";
import type { ApiLeadCount, ApiLeadsReport, LeadsFilter } from "@/types/api/analytics";
import { LEAD_CHANNELS, type LeadChannel } from "@/types/api/managerRequests";
import type { RealtimeEvent } from "@/types/api/realtime";

const card = "rounded-2xl border border-[var(--text-primary)]/10 bg-[var(--surface)]/60 p-4";
const select =
  "rounded-lg border border-[var(--text-primary)]/15 bg-[var(--surface)] px-2 py-1.5 text-sm text-slate-200 light:text-slate-800";

function pct(part: number, whole: number): string {
  if (whole === 0) return "—";
  return `${((part / whole) * 100).toFixed(1).replace(".0", "")}%`;
}

/**
 * Requests of the period by status, source, page and project type — every
 * request, with or without analytics consent (those without a stored
 * source count as "unknown"). Shares the dashboard's period; has its own
 * filters. Counts only: no contacts or texts reach this view.
 */
export default function LeadsReport({
  range,
  onAuthError,
}: {
  range: { from: string; to: string };
  onAuthError: AuthErrorHandler;
}) {
  const { t } = useLocale();
  const l = t.manager.analytics.leads;
  const [filter, setFilter] = useState<LeadsFilter>({});
  const [data, setData] = useState<ApiLeadsReport | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<{ key: string; ok: boolean } | null>(null);
  // Pages seen without a page filter, so the page list does not shrink to
  // the one chosen.
  const [knownPages, setKnownPages] = useState<string[]>([]);
  const requestKey = `${range.from}|${range.to}|${filter.channel ?? ""}|${filter.page ?? ""}|${filter.project_type ?? ""}|${attempt}`;
  const state: "loading" | "ready" | "error" = settled?.key !== requestKey ? "loading" : settled.ok ? "ready" : "error";

  const remember = useCallback((report: ApiLeadsReport) => {
    if (report.filter.page) return;
    setKnownPages((prev) => {
      const next = new Set(prev);
      for (const row of report.pages) if (row.key) next.add(row.key);
      return next.size === prev.length ? prev : [...next].sort();
    });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetchLeadsReport(range.from, range.to, filter, controller.signal).then((result) => {
      if (result.kind === "ok") {
        setData(result.data.data);
        remember(result.data.data);
        setSettled({ key: requestKey, ok: true });
      } else if (result.kind === "unauthorized") {
        onAuthError("unauthorized");
      } else if (result.kind === "forbidden") {
        onAuthError("forbidden");
      } else if (result.kind !== "aborted") {
        setSettled({ key: requestKey, ok: false });
      }
    });
    return () => controller.abort();
  }, [range, filter, requestKey, onAuthError, remember]);

  // A new or changed request: re-read quietly.
  useManagerEvents(
    useCallback(
      (event: RealtimeEvent) => {
        if (!isRequestEvent(event) || settled?.key !== requestKey) return;
        void fetchLeadsReport(range.from, range.to, filter).then((result) => {
          if (result.kind === "ok") setData(result.data.data);
        });
      },
      [range, filter, requestKey, settled],
    ),
  );

  const setField = (key: keyof LeadsFilter, value: string) =>
    setFilter((prev) => ({ ...prev, [key]: value || undefined }));
  const filtered = Boolean(filter.channel || filter.page || filter.project_type);
  const channelLabel = (key: string) => t.manager.analytics.channels[key as LeadChannel] ?? key;

  return (
    <section className={`${card} space-y-4`} aria-labelledby="leads-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl">
          <h2 id="leads-title" className="text-base font-semibold text-slate-100 light:text-slate-900">{l.title}</h2>
          <p className="mt-1 flex items-start gap-1.5 text-xs leading-5 text-slate-400 light:text-slate-600">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {l.hint}
          </p>
        </div>
        {state === "loading" ? <Loader2 className="h-4 w-4 animate-spin text-slate-400 motion-reduce:animate-none" aria-label={t.manager.analytics.loading} /> : null}
      </div>

      <div role="group" aria-label={l.filters.label} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-slate-400 light:text-slate-600">
          {l.filters.channel}
          <select className={select} value={filter.channel ?? ""} onChange={(e) => setField("channel", e.target.value)}>
            <option value="">{l.filters.all}</option>
            {LEAD_CHANNELS.map((c) => (
              <option key={c} value={c}>{channelLabel(c)}</option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 max-w-full flex-col gap-1 text-xs text-slate-400 light:text-slate-600">
          {l.filters.page}
          <select className={`${select} max-w-[18rem]`} value={filter.page ?? ""} onChange={(e) => setField("page", e.target.value)}>
            <option value="">{l.filters.all}</option>
            {[...new Set([...knownPages, ...(filter.page ? [filter.page] : [])])].map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-400 light:text-slate-600">
          {l.filters.projectType}
          <select className={select} value={filter.project_type ?? ""} onChange={(e) => setField("project_type", e.target.value)}>
            <option value="">{l.filters.all}</option>
            {projectPricingList.map((p) => (
              <option key={p.projectType} value={p.projectType}>{projectTypeLabel(t, p.projectType)}</option>
            ))}
          </select>
        </label>
        {filtered ? (
          <button
            type="button"
            onClick={() => setFilter({})}
            className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-[var(--text-primary)]/5 light:text-cyan-700"
          >
            {l.filters.reset}
          </button>
        ) : null}
      </div>

      {state === "error" ? (
        <div role="alert" className="flex items-center gap-3 text-sm text-slate-400 light:text-slate-600">
          {l.failed}
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

      {/* After a failed load the earlier figures belong to another period
          or filter: they are not shown as if they were current. */}
      {data && state !== "error" ? (
        <div className={`space-y-4 transition-opacity ${state === "loading" ? "opacity-60" : ""}`}>
          <LeadCards data={data} filtered={filtered} />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[3fr_2fr]">
            <LeadDays days={data.days} />
            <Bars
              title={l.channels}
              rows={data.channels}
              total={data.totals.requests}
              labelOf={channelLabel}
              extra={
                data.sources.length > 0 ? (
                  <div className="mt-4">
                    <h4 className="text-xs font-semibold text-slate-300 light:text-slate-700">{l.sources}</h4>
                    <ul className="mt-1.5 space-y-1 text-xs text-slate-300 light:text-slate-700">
                      {data.sources.map((row) => (
                        <li key={`${row.channel}|${row.source}`} className="flex justify-between gap-3">
                          <span className="min-w-0 truncate">
                            {row.source.startsWith("(") ? channelLabel(row.channel) : `${row.source} / ${channelLabel(row.channel)}`}
                          </span>
                          <span className="tabular-nums text-slate-400">{row.count}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null
              }
            />
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Bars title={l.servicePages} rows={data.service_pages} total={data.totals.requests} labelOf={(k) => k} />
            <Bars title={l.pages} rows={data.pages} total={data.totals.requests} labelOf={(k) => k || l.pageUnknown} ranked />
            <Bars title={l.projectTypes} rows={data.project_types} total={data.totals.requests} labelOf={(k) => projectTypeLabel(t, k)} />
          </div>
        </div>
      ) : null}
    </section>
  );
}

function LeadCards({ data, filtered }: { data: ApiLeadsReport; filtered: boolean }) {
  const { t } = useLocale();
  const l = t.manager.analytics.leads;
  const c = l.cards;
  const x = data.totals;
  const list = (status?: string) =>
    `/manager/requests?from=${data.period.from}&to=${data.period.to}${status ? `&status=${status}` : ""}`;
  const items: Array<{ label: string; value: number; href?: string }> = [
    { label: c.total, value: x.requests, href: filtered ? undefined : list() },
    { label: c.new, value: x.new, href: filtered ? undefined : list("new") },
    { label: c.inProgress, value: x.in_progress, href: filtered ? undefined : list("in_progress") },
    { label: c.completed, value: x.completed, href: filtered ? undefined : list("completed") },
    { label: c.rejected, value: x.rejected, href: filtered ? undefined : list("rejected") },
    ...(x.archived > 0 ? [{ label: c.archived, value: x.archived }] : []),
    { label: c.google, value: x.google_organic },
    { label: c.paid, value: x.paid },
    { label: c.social, value: x.social },
  ];
  const conv = data.conversion;
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-10">
        {items.map(({ label, value, href }) => {
          const body = (
            <>
              <p className="text-xs text-slate-400 light:text-slate-600">{label}</p>
              <p className="mt-1.5 text-2xl font-bold tabular-nums text-slate-100 light:text-slate-900">{value}</p>
            </>
          );
          return href ? (
            <Link
              key={label}
              href={href}
              className={`${card} block transition hover:border-cyan-400/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60`}
            >
              {body}
            </Link>
          ) : (
            <div key={label} className={card}>{body}</div>
          );
        })}
        <div className={`${card} col-span-2 border-violet-400/30 bg-gradient-to-br from-violet-600/15 to-blue-600/10 sm:col-span-3 lg:col-span-5 xl:col-span-1`}>
          <p className="text-xs text-slate-300 light:text-slate-700">{l.conversion}</p>
          {conv ? (
            <>
              <p className="mt-1.5 text-2xl font-bold tabular-nums text-slate-100 light:text-slate-900">
                {pct(conv.sessions_with_request, conv.sessions)}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400 light:text-slate-600">
                {fill(l.conversionHint, { converted: String(conv.sessions_with_request), sessions: String(conv.sessions) })}
              </p>
            </>
          ) : (
            <>
              <p className="mt-1.5 text-base font-semibold text-slate-200 light:text-slate-800">{l.noData}</p>
              <p className="mt-0.5 text-[11px] leading-4 text-slate-400 light:text-slate-600">
                {filtered ? l.noDataFiltered : l.noDataSessions}
              </p>
            </>
          )}
        </div>
      </div>
      <p className="text-xs text-slate-500">
        {fill(l.tracked, { tracked: String(x.tracked), total: String(x.requests) })}
      </p>
      <p className="text-xs leading-5 text-slate-500">{l.cardsNote}</p>
    </div>
  );
}

function LeadDays({ days }: { days: ApiLeadCount[] }) {
  const { t } = useLocale();
  const l = t.manager.analytics.leads;
  const max = Math.max(1, ...days.map((d) => d.count));
  const width = Math.max(320, days.length * 28);
  const height = 120;
  const step = width / Math.max(1, days.length);
  const barW = Math.max(6, Math.min(22, step - 6));
  const labelEvery = Math.ceil(days.length / 10);
  const total = days.reduce((sum, d) => sum + d.count, 0);
  return (
    <section className={card} aria-label={l.chart}>
      <h3 className="text-sm font-semibold text-slate-100 light:text-slate-900">{l.chart}</h3>
      {total === 0 ? (
        <p className="py-8 text-center text-xs text-slate-500">{l.empty}</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <svg viewBox={`0 0 ${width} ${height + 22}`} width="100%" height={height + 22} preserveAspectRatio="none" role="img" aria-label={l.chart}>
            {days.map((d, i) => {
              const h = (d.count / max) * (height - 10);
              const x = i * step + (step - barW) / 2;
              return (
                <g key={d.key}>
                  <title>{`${shortDay(d.key)}: ${d.count}`}</title>
                  <rect x={x} y={height - h} width={barW} height={Math.max(h, d.count ? 2 : 0)} rx="3" className="fill-pink-500/80" />
                  {i % labelEvery === 0 ? (
                    <text x={x + barW / 2} y={height + 15} textAnchor="middle" className="fill-slate-500 text-[10px]">
                      {shortDay(d.key)}
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

function Bars({
  title,
  rows,
  total,
  labelOf,
  ranked = false,
  extra,
}: {
  title: string;
  rows: ApiLeadCount[];
  total: number;
  labelOf: (key: string) => string;
  ranked?: boolean;
  extra?: ReactNode;
}) {
  const { t } = useLocale();
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <section className={card} aria-label={title}>
      <h3 className="text-sm font-semibold text-slate-100 light:text-slate-900">{title}</h3>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-xs text-slate-500">{t.manager.analytics.leads.empty}</p>
      ) : (
        <ol className="mt-2 space-y-2">
          {rows.map((row, i) => (
            <li key={row.key || "none"}>
              <div className="flex justify-between gap-3 text-xs text-slate-300 light:text-slate-700">
                <span className="min-w-0 truncate">{ranked ? `${i + 1}. ` : ""}{labelOf(row.key)}</span>
                <span className="shrink-0 tabular-nums">{row.count} · {pct(row.count, total)}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-[var(--text-primary)]/10">
                <div className="h-1.5 rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" style={{ width: `${(row.count / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ol>
      )}
      {extra}
    </section>
  );
}
