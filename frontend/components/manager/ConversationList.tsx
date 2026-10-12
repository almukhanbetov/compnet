"use client";

import { Loader2, RefreshCw, WifiOff } from "lucide-react";
import { useLocale } from "@/components/providers/LocaleProvider";
import { formatListDate, visitorLabel } from "@/components/manager/format";
import { fill } from "@/lib/i18n";
import type { useInbox } from "@/components/manager/useInbox";
import type { InboxFilter } from "@/types/api/manager";

type Inbox = ReturnType<typeof useInbox>;

interface ConversationListProps {
  inbox: Inbox;
  filter: InboxFilter;
  selectedId: string | null;
  onFilterChange: (filter: InboxFilter) => void;
  onSelect: (id: string) => void;
  /** Conversations whose visitor has a live connection. */
  onlineVisitors: ReadonlySet<string>;
}

const filterIds: InboxFilter[] = ["open", "closed", "all"];

export default function ConversationList({ inbox, filter, selectedId, onFilterChange, onSelect, onlineVisitors }: ConversationListProps) {
  const { t } = useLocale();
  const l = t.manager.list;
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div role="group" aria-label={l.filterLabel} className="flex gap-1 border-b border-[var(--text-primary)]/10 p-3">
        {filterIds.map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={filter === id}
            onClick={() => onFilterChange(id)}
            className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 ${
              filter === id
                ? "bg-gradient-to-r from-violet-600 to-blue-600 text-white"
                : "text-slate-400 hover:bg-[var(--text-primary)]/5 light:text-slate-600"
            }`}
          >
            {l.filters[id]}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {inbox.loadState === "loading" ? (
          <p className="flex items-center justify-center gap-2 p-8 text-sm text-slate-400 light:text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            {l.loading}
          </p>
        ) : null}

        {inbox.loadState === "error" ? (
          <div role="alert" className="flex flex-col items-center gap-3 p-8 text-center text-sm text-slate-400 light:text-slate-600">
            <WifiOff className="h-5 w-5" aria-hidden="true" />
            <p>{l.loadFailed}</p>
            <button
              type="button"
              onClick={inbox.refresh}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 px-3.5 py-2 text-xs font-medium text-slate-200 light:text-slate-800 transition hover:bg-[var(--text-primary)]/10"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              {l.retryNow}
            </button>
          </div>
        ) : null}

        {inbox.loadState === "ready" && inbox.items.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-400 light:text-slate-600">{l.empty[filter]}</p>
        ) : null}

        <ul aria-label={l.listAria}>
          {inbox.items.map((item) => {
            const active = item.id === selectedId;
            const last = item.last_message;
            const prefix = last?.author === "manager" ? l.managerPrefix : "";
            const online = onlineVisitors.has(item.id);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelect(item.id)}
                  aria-current={active ? "true" : undefined}
                  className={`flex w-full gap-3 border-b border-[var(--text-primary)]/5 px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-400/60 ${
                    active ? "bg-[var(--text-primary)]/[0.07]" : "hover:bg-[var(--text-primary)]/[0.04]"
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span
                        className={`truncate text-sm ${item.unread_count > 0 ? "font-semibold text-slate-100 light:text-slate-900" : "font-medium text-slate-200 light:text-slate-800"}`}
                      >
                        {online ? (
                          <span
                            aria-label={l.visitorOnline}
                            title={l.visitorOnline}
                            className="mr-1.5 inline-block h-2 w-2 rounded-full bg-emerald-400 align-middle"
                          />
                        ) : null}
                        {visitorLabel(item.visitor_name, item.id, t.manager.visitorFallback)}
                      </span>
                      <span className="shrink-0 text-[11px] text-slate-500">{formatListDate(item.last_message_at)}</span>
                    </span>
                    <span className="mt-0.5 flex items-center justify-between gap-2">
                      <span className="truncate text-xs text-slate-400 light:text-slate-600">
                        {prefix}
                        {last?.body ?? ""}
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        {item.status === "closed" ? (
                          <span className="rounded-full border border-[var(--text-primary)]/15 px-2 py-0.5 text-[10px] text-slate-400 light:text-slate-600">
                            {l.closedBadge}
                          </span>
                        ) : null}
                        {item.unread_count > 0 ? (
                          <span
                            className="flex h-5 min-w-5 items-center justify-center rounded-full bg-pink-500 px-1.5 text-[11px] font-bold text-white"
                            aria-label={fill(l.unreadAria, { count: String(item.unread_count) })}
                          >
                            {item.unread_count}
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {inbox.hasMore ? (
          <div className="p-3">
            <button
              type="button"
              onClick={() => void inbox.loadMore()}
              disabled={inbox.loadingMore}
              className="w-full rounded-xl border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 px-4 py-2.5 text-sm font-medium text-slate-200 light:text-slate-800 transition hover:bg-[var(--text-primary)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 disabled:opacity-60"
            >
              {inbox.loadingMore ? l.loadingMore : l.showMore}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
