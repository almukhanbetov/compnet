"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, RefreshCw, Search, WifiOff, X } from "lucide-react";
import { useCountdown } from "@/components/chat/useCountdown";
import ManagerHeader from "@/components/manager/ManagerHeader";
import { RealtimeBar } from "@/components/manager/ManagerShell";
import { almatyToday, formatAlmatyFull, presetRange } from "@/components/manager/analytics/periods";
import RequestDetail from "@/components/manager/requests/RequestDetail";
import { optionLabel, projectTypeLabel } from "@/components/manager/requests/labels";
import StatusBadge from "@/components/manager/requests/StatusBadge";
import { useRequestList } from "@/components/manager/requests/useRequestList";
import type { AuthErrorHandler } from "@/components/manager/useInbox";
import { useLocale } from "@/components/providers/LocaleProvider";
import { fill } from "@/lib/i18n";
import type { ApiStaffUser } from "@/types/api/manager";
import { REQUEST_STATUSES, type ApiRequestItem, type RequestStatus } from "@/types/api/managerRequests";

interface Props {
  user: ApiStaffUser;
  onAuthError: AuthErrorHandler;
  onLogout: () => Promise<string | null>;
}

type Preset = "all" | "today" | "d7" | "d30" | "month";
const PRESETS: Preset[] = ["all", "today", "d7", "d30", "month"];
const PAGE_SIZE = 20;
const SEARCH_DELAY_MS = 350;

interface Filters {
  q: string;
  status: RequestStatus | "";
  from: string;
  to: string;
  page: number;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Filters and the open request live in the URL, so a reload or a link
 *  from the statistics restores exactly this view. */
function readUrl(): { filters: Filters; id: string | null } {
  const empty: Filters = { q: "", status: "", from: "", to: "", page: 1 };
  if (typeof window === "undefined") return { filters: empty, id: null };
  const p = new URLSearchParams(window.location.search);
  const status = p.get("status") ?? "";
  const page = Number(p.get("page"));
  return {
    filters: {
      q: (p.get("q") ?? "").slice(0, 100),
      status: (REQUEST_STATUSES as readonly string[]).includes(status) ? (status as RequestStatus) : "",
      from: DATE.test(p.get("from") ?? "") ? (p.get("from") as string) : "",
      to: DATE.test(p.get("to") ?? "") ? (p.get("to") as string) : "",
      page: Number.isInteger(page) && page > 0 ? page : 1,
    },
    id: p.get("id"),
  };
}

function writeUrl(filters: Filters, id: string | null) {
  const p = new URLSearchParams();
  if (filters.q) p.set("q", filters.q);
  if (filters.status) p.set("status", filters.status);
  if (filters.from) p.set("from", filters.from);
  if (filters.to) p.set("to", filters.to);
  if (filters.page > 1) p.set("page", String(filters.page));
  if (id) p.set("id", id);
  const search = p.toString();
  const next = `/manager/requests${search ? `?${search}` : ""}`;
  if (next !== window.location.pathname + window.location.search) window.history.replaceState(null, "", next);
}

function presetOf(from: string, to: string): Preset | "custom" {
  if (!from && !to) return "all";
  for (const key of PRESETS) {
    if (key === "all") continue;
    const range = presetRange(key);
    if (range.from === from && range.to === to) return key;
  }
  return "custom";
}

export default function RequestsPage({ user, onAuthError, onLogout }: Props) {
  const { t } = useLocale();
  const r = t.manager.requests;
  const [initial] = useState(readUrl);
  const [filters, setFilters] = useState<Filters>(initial.filters);
  const [search, setSearch] = useState(initial.filters.q);
  const [draft, setDraft] = useState({ from: initial.filters.from, to: initial.filters.to });
  const [openId, setOpenId] = useState<string | null>(initial.id);
  const preset = presetOf(filters.from, filters.to);

  // The typed search is applied after a short pause, from page 1.
  useEffect(() => {
    const value = search.trim();
    if (value === filters.q) return;
    const timer = setTimeout(() => setFilters((prev) => ({ ...prev, q: value, page: 1 })), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [search, filters.q]);

  useEffect(() => writeUrl(filters, openId), [filters, openId]);

  const query = useMemo(
    () => ({
      q: filters.q || undefined,
      status: filters.status || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
      page: filters.page,
      limit: PAGE_SIZE,
    }),
    [filters],
  );
  const list = useRequestList(query, onAuthError);
  const pollLimit = useCountdown(list.connection.kind === "rate_limited" ? list.connection.until : null);

  const total = list.meta?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  // A page past the end (e.g. the list shrank under a filter) jumps back;
  // adjusted during render so the empty page is never shown.
  if (list.state === "ready" && total > 0 && filters.page > pages) {
    setFilters((prev) => ({ ...prev, page: pages }));
  }

  const newCount = list.meta?.new_count ?? 0;
  useEffect(() => {
    document.title = newCount > 0 ? `(${newCount}) ${r.title} · COMPNET` : `${r.title} · COMPNET`;
  }, [newCount, r.title]);

  const choosePreset = (key: Preset) => {
    const range = key === "all" ? { from: "", to: "" } : presetRange(key);
    setDraft(range);
    setFilters((prev) => ({ ...prev, ...range, page: 1 }));
  };
  const resetFilters = () => {
    setSearch("");
    setDraft({ from: "", to: "" });
    setFilters({ q: "", status: "", from: "", to: "", page: 1 });
  };
  const filtered = Boolean(filters.q || filters.status || filters.from || filters.to);

  const closeDetail = useCallback(() => setOpenId(null), []);
  const shownFrom = total === 0 ? 0 : (filters.page - 1) * PAGE_SIZE + 1;
  const shownTo = Math.min(total, filters.page * PAGE_SIZE);
  const chip = (active: boolean) =>
    `rounded-xl px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 ${
      active
        ? "bg-gradient-to-r from-violet-600 to-blue-600 text-white"
        : "border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 text-slate-300 hover:bg-[var(--text-primary)]/10 light:text-slate-700"
    }`;

  return (
    <div className="min-h-[100dvh] bg-[var(--background)]">
      <ManagerHeader current="requests" user={user} onLogout={() => void onLogout()} sticky />
      <RealtimeBar />
      {list.connection.kind === "offline" && list.meta ? (
        <p role="status" className="flex items-center justify-center gap-2 bg-amber-400/10 px-4 py-2 text-xs text-amber-200 light:text-amber-800">
          <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
          {r.offline}
        </p>
      ) : null}
      {pollLimit > 0 ? (
        <p role="status" className="bg-amber-400/10 px-4 py-2 text-center text-xs text-amber-200 light:text-amber-800">
          {fill(r.errors.rateLimited, { seconds: String(pollLimit) })}
        </p>
      ) : null}

      <main className="mx-auto max-w-[1440px] space-y-4 px-4 py-5 md:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-3 text-2xl font-bold text-slate-100 light:text-slate-900">
              {r.title}
              {newCount > 0 ? (
                <span className="rounded-full bg-pink-500/15 px-2.5 py-0.5 text-xs font-semibold text-pink-300 light:text-pink-700">
                  {fill(r.newCount, { count: String(newCount) })}
                </span>
              ) : null}
            </h1>
            <p className="mt-0.5 text-xs text-slate-400 light:text-slate-600">{r.subtitle}</p>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-[var(--text-primary)]/10 bg-[var(--surface)]/60 p-3 md:p-4">
          <div className="relative">
            <label htmlFor="rq-search" className="sr-only">{r.searchLabel}</label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
            <input
              id="rq-search"
              type="search"
              value={search}
              maxLength={100}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={r.searchPlaceholder}
              autoComplete="off"
              className="h-11 w-full rounded-xl border border-[var(--text-primary)]/15 bg-[var(--background)]/60 pl-9 pr-10 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/30 light:text-slate-900"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label={r.clearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-[var(--text-primary)]/10"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>

          <div role="group" aria-label={r.statusLabel} className="flex flex-wrap items-center gap-2">
            <span className="w-full text-xs text-slate-500 sm:w-auto">{r.statusLabel}</span>
            <button type="button" aria-pressed={filters.status === ""} onClick={() => setFilters((p) => ({ ...p, status: "", page: 1 }))} className={chip(filters.status === "")}>
              {r.allStatuses}
            </button>
            {REQUEST_STATUSES.map((status) => (
              <button
                key={status}
                type="button"
                aria-pressed={filters.status === status}
                onClick={() => setFilters((p) => ({ ...p, status, page: 1 }))}
                className={chip(filters.status === status)}
              >
                {r.statuses[status]}
              </button>
            ))}
          </div>

          <div role="group" aria-label={r.periodLabel} className="flex flex-wrap items-center gap-2">
            <span className="w-full text-xs text-slate-500 sm:w-auto">{r.periodLabel}</span>
            {PRESETS.map((key) => (
              <button key={key} type="button" aria-pressed={preset === key} onClick={() => choosePreset(key)} className={chip(preset === key)}>
                {r.periods[key]}
              </button>
            ))}
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (draft.from && draft.to && draft.from > draft.to) return;
                setFilters((prev) => ({ ...prev, from: draft.from, to: draft.to, page: 1 }));
              }}
              className={`flex flex-wrap items-center gap-2 rounded-xl border px-2 py-1 ${preset === "custom" ? "border-cyan-400/40" : "border-[var(--text-primary)]/15"}`}
            >
              <label className="text-xs text-slate-400 light:text-slate-600" htmlFor="rq-from">{r.from}</label>
              <input
                id="rq-from"
                type="date"
                value={draft.from}
                max={draft.to || almatyToday()}
                onChange={(event) => setDraft((prev) => ({ ...prev, from: event.target.value }))}
                className="rounded-lg bg-transparent px-1 py-1 text-sm text-slate-200 light:text-slate-800"
              />
              <label className="text-xs text-slate-400 light:text-slate-600" htmlFor="rq-to">{r.to}</label>
              <input
                id="rq-to"
                type="date"
                value={draft.to}
                min={draft.from || undefined}
                max={almatyToday()}
                onChange={(event) => setDraft((prev) => ({ ...prev, to: event.target.value }))}
                className="rounded-lg bg-transparent px-1 py-1 text-sm text-slate-200 light:text-slate-800"
              />
              <button type="submit" className="rounded-lg px-2.5 py-1 text-xs font-semibold text-cyan-300 light:text-cyan-700">
                {r.apply}
              </button>
            </form>
            {filtered ? (
              <button type="button" onClick={resetFilters} className="ml-auto text-xs font-medium text-slate-400 underline underline-offset-2 hover:text-slate-200 light:text-slate-600">
                {r.reset}
              </button>
            ) : null}
          </div>
        </div>

        {list.state === "loading" && !list.meta ? (
          <p className="flex items-center gap-2 py-16 text-sm text-slate-400 light:text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            {r.loading}
          </p>
        ) : null}
        {list.state === "error" && !list.meta ? (
          <div role="alert" className="flex items-center gap-3 py-10 text-sm text-slate-400 light:text-slate-600">
            {r.failed}
            <button type="button" onClick={list.refresh} className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--text-primary)]/15 px-3 py-1.5 text-xs">
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              {r.retry}
            </button>
          </div>
        ) : null}

        {list.meta ? (
          <section aria-label={r.title} aria-busy={list.state === "loading"} className={`transition-opacity ${list.state === "loading" ? "opacity-60" : ""}`}>
            {list.items.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-[var(--text-primary)]/15 px-4 py-14 text-center text-sm text-slate-400 light:text-slate-600">
                {filtered ? r.emptyFiltered : r.empty}
              </p>
            ) : (
              <>
                <RequestTable items={list.items} openId={openId} onOpen={setOpenId} />
                <RequestCards items={list.items} openId={openId} onOpen={setOpenId} />
              </>
            )}

            {total > 0 ? (
              <nav aria-label={r.pagination} className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400 light:text-slate-600">
                <span className="tabular-nums">{fill(r.shown, { from: String(shownFrom), to: String(shownTo), total: String(total) })}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={filters.page <= 1}
                    onClick={() => setFilters((p) => ({ ...p, page: p.page - 1 }))}
                    className="inline-flex h-10 items-center gap-1 rounded-xl border border-[var(--text-primary)]/15 px-3 text-slate-200 transition hover:bg-[var(--text-primary)]/10 disabled:opacity-40 light:text-slate-800"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    {r.prev}
                  </button>
                  <span className="tabular-nums">{fill(r.page, { page: String(filters.page), pages: String(pages) })}</span>
                  <button
                    type="button"
                    disabled={filters.page >= pages}
                    onClick={() => setFilters((p) => ({ ...p, page: p.page + 1 }))}
                    className="inline-flex h-10 items-center gap-1 rounded-xl border border-[var(--text-primary)]/15 px-3 text-slate-200 transition hover:bg-[var(--text-primary)]/10 disabled:opacity-40 light:text-slate-800"
                  >
                    {r.next}
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </nav>
            ) : null}
          </section>
        ) : null}
      </main>

      {openId ? (
        <RequestDetail key={openId} id={openId} onClose={closeDetail} onAuthError={onAuthError} onChanged={list.refresh} />
      ) : null}
    </div>
  );
}

function Missing() {
  const { t } = useLocale();
  return <span className="text-slate-500">{t.manager.requests.notSpecified}</span>;
}

function useRowLabels() {
  const { t } = useLocale();
  return {
    type: (item: ApiRequestItem) => projectTypeLabel(t, item.project_type),
    budget: (item: ApiRequestItem) => (item.budget_range ? optionLabel(t.contactPage.form.options.budget, item.budget_range) : ""),
  };
}

function RequestTable({ items, openId, onOpen }: { items: ApiRequestItem[]; openId: string | null; onOpen: (id: string) => void }) {
  const { t } = useLocale();
  const r = t.manager.requests;
  const labels = useRowLabels();
  return (
    <div className="hidden overflow-x-auto rounded-2xl border border-[var(--text-primary)]/10 bg-[var(--surface)]/60 md:block">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="text-xs text-slate-500">
          <tr className="[&>th]:px-3 [&>th]:py-2.5 [&>th]:font-medium">
            <th className="w-16">{r.columns.number}</th>
            <th>{r.columns.date}</th>
            <th>{r.columns.client}</th>
            <th>{r.columns.contacts}</th>
            <th>{r.columns.projectType}</th>
            <th>{r.columns.budget}</th>
            <th>{r.columns.status}</th>
          </tr>
        </thead>
        <tbody className="text-slate-200 light:text-slate-800">
          {items.map((item) => (
            <tr
              key={item.id}
              onClick={() => onOpen(item.id)}
              className={`cursor-pointer border-t border-[var(--text-primary)]/5 align-top transition hover:bg-[var(--text-primary)]/[0.04] [&>td]:px-3 [&>td]:py-2.5 ${
                openId === item.id ? "bg-[var(--text-primary)]/[0.06]" : ""
              } ${item.status === "new" ? "font-medium" : ""}`}
            >
              <td className="tabular-nums text-slate-400">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpen(item.id);
                  }}
                  aria-label={fill(r.open, { number: String(item.number) })}
                  className="rounded-md font-semibold text-cyan-300 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 light:text-cyan-700"
                >
                  {item.number}
                </button>
              </td>
              <td className="whitespace-nowrap tabular-nums">{formatAlmatyFull(item.created_at)}</td>
              <td className="max-w-[14rem]">
                <span translate="no" className="block truncate">{item.name}</span>
                {item.company ? <span className="block truncate text-xs text-slate-500">{item.company}</span> : null}
              </td>
              <td className="max-w-[16rem] text-xs">
                {item.phone ? <span className="block truncate tabular-nums">{item.phone}</span> : null}
                {item.email ? <span className="block truncate">{item.email}</span> : null}
                {!item.phone && !item.email ? <Missing /> : null}
              </td>
              <td className="max-w-[12rem] truncate">{labels.type(item)}</td>
              <td className="max-w-[12rem] truncate">{labels.budget(item) || <Missing />}</td>
              <td><StatusBadge status={item.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RequestCards({ items, openId, onOpen }: { items: ApiRequestItem[]; openId: string | null; onOpen: (id: string) => void }) {
  const { t } = useLocale();
  const r = t.manager.requests;
  const labels = useRowLabels();
  return (
    <ul className="space-y-2 md:hidden">
      {items.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            onClick={() => onOpen(item.id)}
            aria-label={fill(r.open, { number: String(item.number) })}
            className={`w-full rounded-2xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 ${
              openId === item.id ? "border-cyan-400/40 bg-[var(--text-primary)]/[0.06]" : "border-[var(--text-primary)]/10 bg-[var(--surface)]/60"
            }`}
          >
            <span className="flex items-start justify-between gap-2">
              <span className="min-w-0">
                <span className="block text-xs tabular-nums text-slate-500">
                  {r.columns.number}{item.number} · {formatAlmatyFull(item.created_at)}
                </span>
                <span translate="no" className={`mt-0.5 block truncate text-sm text-slate-100 light:text-slate-900 ${item.status === "new" ? "font-semibold" : ""}`}>
                  {item.name}
                </span>
              </span>
              <StatusBadge status={item.status} />
            </span>
            <span className="mt-1.5 block truncate text-xs text-slate-300 light:text-slate-700">
              {[item.phone, item.email].filter(Boolean).join(" · ") || r.notSpecified}
            </span>
            <span className="mt-0.5 block truncate text-xs text-slate-400 light:text-slate-600">
              {labels.type(item)} · {labels.budget(item) || r.notSpecified}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
