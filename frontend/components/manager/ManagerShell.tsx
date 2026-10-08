"use client";

import { useCallback, useEffect, useState } from "react";
import { LogOut, MessagesSquare, WifiOff } from "lucide-react";
import ThemeToggle from "@/components/layout/ThemeToggle";
import { useCountdown } from "@/components/chat/useCountdown";
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

const BASE_TITLE = "Диалоги · COMPNET";

export default function ManagerShell({ user, onAuthError, onLogout }: ManagerShellProps) {
  const [filter, setFilter] = useState<InboxFilter>("open");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [unsentStore] = useState<UnsentStore>(() => new Map());
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const inbox = useInbox(filter, onAuthError);
  const pollLimit = useCountdown(inbox.connection.kind === "rate_limited" ? inbox.connection.until : null);

  const unreadMessages = inbox.unread?.messages ?? 0;

  // Unread count in the tab title, restored when leaving the section.
  useEffect(() => {
    document.title = unreadMessages > 0 ? `(${unreadMessages}) ${BASE_TITLE}` : BASE_TITLE;
  }, [unreadMessages]);
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
      <header className="border-b border-[var(--text-primary)]/10 bg-[var(--background)]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-3 px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="shrink-0 text-lg font-bold tracking-tight">
              COMP
              <span className="bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent">NET</span>
            </span>
            <span className="hidden text-sm text-slate-400 light:text-slate-600 sm:inline">Раздел менеджера</span>
            <span
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--text-primary)]/15 px-2.5 py-1 text-xs text-slate-300 light:text-slate-700"
              title="Непрочитанные сообщения посетителей"
            >
              <MessagesSquare className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only">Непрочитанных сообщений:</span>
              <span className={unreadMessages > 0 ? "font-semibold text-pink-400 light:text-pink-600" : ""}>{unreadMessages}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden max-w-[16rem] truncate text-sm text-slate-300 light:text-slate-700 md:inline">
              {user.display_name}
            </span>
            <ThemeToggle />
            <button
              type="button"
              onClick={() => void handleLogout()}
              disabled={loggingOut}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 px-3 text-sm font-medium text-slate-200 light:text-slate-800 transition hover:bg-[var(--text-primary)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 disabled:opacity-60"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Выйти</span>
              <span className="sr-only sm:hidden">Выйти</span>
            </button>
          </div>
        </div>
      </header>

      {logoutError ? (
        <p role="alert" className="bg-rose-500/10 px-4 py-2 text-center text-sm text-rose-300 light:text-rose-700">
          {logoutError}
        </p>
      ) : null}
      {inbox.connection.kind === "offline" && inbox.loadState === "ready" ? (
        <p role="status" className="flex items-center justify-center gap-2 bg-amber-400/10 px-4 py-2 text-xs text-amber-200 light:text-amber-800">
          <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
          Нет связи с сервером. Список обновится, когда связь восстановится.
        </p>
      ) : null}
      {pollLimit > 0 ? (
        <p role="status" className="bg-amber-400/10 px-4 py-2 text-center text-xs text-amber-200 light:text-amber-800">
          Слишком много запросов. Обновление продолжится через {pollLimit} с.
        </p>
      ) : null}

      <main className="mx-auto grid min-h-0 w-full max-w-[1440px] flex-1 md:grid-cols-[320px_1fr] md:gap-4 md:p-4 lg:grid-cols-[380px_1fr]">
        <section
          aria-label="Список диалогов"
          className={`${selectedId ? "hidden md:flex" : "flex"} min-h-0 flex-col overflow-hidden md:rounded-[24px] md:border md:border-[var(--text-primary)]/10 md:bg-[var(--surface)]/60`}
        >
          <ConversationList
            inbox={inbox}
            filter={filter}
            selectedId={selectedId}
            onFilterChange={setFilter}
            onSelect={setSelectedId}
          />
        </section>

        <section
          aria-label="Переписка"
          className={`${selectedId ? "flex" : "hidden md:flex"} min-h-0 flex-col overflow-hidden md:rounded-[24px] md:border md:border-[var(--text-primary)]/10 md:bg-[var(--surface)]/60`}
        >
          {selectedId ? (
            <ConversationView
              key={selectedId}
              conversationId={selectedId}
              staffName={user.display_name}
              unsentStore={unsentStore}
              onBack={() => setSelectedId(null)}
              onAuthError={onAuthError}
              onConversationChange={patchItem}
              onRead={handleRead}
            />
          ) : (
            <p className="m-auto p-8 text-center text-sm text-slate-400 light:text-slate-600">
              Выберите диалог слева, чтобы прочитать переписку и ответить.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
