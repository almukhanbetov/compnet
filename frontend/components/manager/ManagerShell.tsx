"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, MessagesSquare, WifiOff } from "lucide-react";
import { useCountdown } from "@/components/chat/useCountdown";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useManagerRealtime } from "@/components/manager/ManagerRealtime";
import ManagerHeader from "@/components/manager/ManagerHeader";
import { fill } from "@/lib/i18n";
import ConversationList from "@/components/manager/ConversationList";
import ConversationView from "@/components/manager/ConversationView";
import { useInbox, type AuthErrorHandler } from "@/components/manager/useInbox";
import type { UnsentStore } from "@/components/manager/useConversation";
import type { ApiStaffUser, InboxFilter } from "@/types/api/manager";

interface ManagerShellProps {
  user: ApiStaffUser;
  onAuthError: AuthErrorHandler;
  onLogout: () => Promise<string | null>;
}

export default function ManagerShell({ user, onAuthError, onLogout }: ManagerShellProps) {
  const { t } = useLocale();
  const sh = t.manager.shell;
  const BASE_TITLE = t.manager.title;
  const realtime = useManagerRealtime();
  const [filter, setFilter] = useState<InboxFilter>("open");
  // ?conversation=<id> (link from the statistics) opens that conversation.
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("conversation"),
  );
  const [unsentStore] = useState<UnsentStore>(() => new Map());
  const [drafts] = useState<Map<string, string>>(() => new Map());
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const inbox = useInbox(filter, onAuthError);
  const pollLimit = useCountdown(inbox.connection.kind === "rate_limited" ? inbox.connection.until : null);

  const unreadMessages = inbox.unread?.messages ?? 0;

  // Unread count in the tab title, restored when leaving the section.
  useEffect(() => {
    document.title = unreadMessages > 0 ? `(${unreadMessages}) ${BASE_TITLE}` : BASE_TITLE;
  }, [unreadMessages, BASE_TITLE]);
  useEffect(() => {
    const previous = document.title;
    return () => {
      document.title = previous;
    };
  }, []);

  const { patchItem, refresh } = inbox;
  const handleRead = useCallback(() => refresh(), [refresh]);

  const handleLogout = async () => {
    setLoggingOut(true);
    setLogoutError(null);
    const error = await onLogout();
    setLoggingOut(false);
    setLogoutError(error);
  };

  return (
    <div className="flex h-[100dvh] flex-col bg-[var(--background)]">
      <ManagerHeader current="inbox" user={user} onLogout={() => void handleLogout()} loggingOut={loggingOut}>
        <span
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--text-primary)]/15 px-2.5 py-1 text-xs text-slate-300 light:text-slate-700"
          title={sh.unreadTitle}
        >
          <MessagesSquare className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="sr-only">{sh.unreadSr}</span>
          <span className={unreadMessages > 0 ? "font-semibold text-pink-400 light:text-pink-600" : ""}>{unreadMessages}</span>
        </span>
      </ManagerHeader>

      <RealtimeBar />

      {logoutError ? (
        <p role="alert" className="bg-rose-500/10 px-4 py-2 text-center text-sm text-rose-300 light:text-rose-700">
          {logoutError}
        </p>
      ) : null}
      {inbox.connection.kind === "offline" && inbox.loadState === "ready" ? (
        <p role="status" className="flex items-center justify-center gap-2 bg-amber-400/10 px-4 py-2 text-xs text-amber-200 light:text-amber-800">
          <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
          {sh.inboxOffline}
        </p>
      ) : null}
      {pollLimit > 0 ? (
        <p role="status" className="bg-amber-400/10 px-4 py-2 text-center text-xs text-amber-200 light:text-amber-800">
          {fill(sh.rateLimited, { seconds: String(pollLimit) })}
        </p>
      ) : null}

      <main className="mx-auto grid min-h-0 w-full max-w-[1440px] flex-1 md:grid-cols-[320px_1fr] md:gap-4 md:p-4 lg:grid-cols-[380px_1fr]">
        <section
          aria-label={sh.listLabel}
          className={`${selectedId ? "hidden md:flex" : "flex"} min-h-0 flex-col overflow-hidden md:rounded-[24px] md:border md:border-[var(--text-primary)]/10 md:bg-[var(--surface)]/60`}
        >
          <ConversationList
            inbox={inbox}
            filter={filter}
            selectedId={selectedId}
            onFilterChange={setFilter}
            onSelect={setSelectedId}
            onlineVisitors={realtime.onlineVisitors}
          />
        </section>

        <section
          aria-label={sh.conversationLabel}
          className={`${selectedId ? "flex" : "hidden md:flex"} min-h-0 flex-col overflow-hidden md:rounded-[24px] md:border md:border-[var(--text-primary)]/10 md:bg-[var(--surface)]/60`}
        >
          {selectedId ? (
            <ConversationView
              key={selectedId}
              conversationId={selectedId}
              staffName={user.display_name}
              staffId={user.id}
              unsentStore={unsentStore}
              drafts={drafts}
              visitorOnline={realtime.onlineVisitors.has(selectedId)}
              onBack={() => setSelectedId(null)}
              onAuthError={onAuthError}
              onConversationChange={patchItem}
              onRead={handleRead}
            />
          ) : (
            <p className="m-auto p-8 text-center text-sm text-slate-400 light:text-slate-600">
              {sh.selectHint}
            </p>
          )}
        </section>
      </main>
    </div>
  );
}

/**
 * Connection state in plain words: live (events arrive at once), connecting,
 * or the polling fallback — so a manager always knows whether the list is
 * instant or refreshed every few seconds.
 */
export function RealtimeBar() {
  const { t } = useLocale();
  const r = t.manager.realtime;
  const { status, wasLive, onlineManagers } = useManagerRealtime();
  const live = status === "open";
  const text = live
    ? r.live
    : status === "connecting" && !wasLive
      ? r.connecting
      : wasLive
        ? r.reconnecting
        : r.unavailable;
  return (
    <div
      role="status"
      className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 border-b px-4 py-1.5 text-[11px] ${
        live
          ? "border-emerald-400/15 bg-emerald-400/[0.06] text-emerald-200 light:text-emerald-800"
          : "border-amber-400/20 bg-amber-400/10 text-amber-200 light:text-amber-800"
      }`}
    >
      <span className="inline-flex items-center gap-1.5">
        {live ? (
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        ) : (
          <Loader2 className="h-3 w-3 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        )}
        {text}
      </span>
      {live && onlineManagers > 0 ? (
        <span className="text-slate-400 light:text-slate-600">{fill(r.onlineManagers, { count: String(onlineManagers) })}</span>
      ) : null}
    </div>
  );
}
