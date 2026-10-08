"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2, Lock, RefreshCw, Unlock, WifiOff } from "lucide-react";
import ChatComposer from "@/components/chat/ChatComposer";
import { useCountdown } from "@/components/chat/useCountdown";
import { useDocumentVisible } from "@/components/chat/useBrowserState";
import ManagerMessageBubble from "@/components/manager/ManagerMessageBubble";
import { contactHref, formatFull, visitorLabel } from "@/components/manager/format";
import { useConversation, type UnsentStore } from "@/components/manager/useConversation";
import type { AuthErrorHandler } from "@/components/manager/useInbox";
import type { ApiManagerConversation } from "@/types/api/manager";

interface ConversationViewProps {
  conversationId: string;
  staffName: string;
  unsentStore: UnsentStore;
  onBack: () => void;
  onAuthError: AuthErrorHandler;
  onConversationChange: (conv: ApiManagerConversation) => void;
  onRead: () => void;
}

/** Mount with key={conversationId}: one instance per conversation. */
export default function ConversationView({
  conversationId,
  staffName,
  unsentStore,
  onBack,
  onAuthError,
  onConversationChange,
  onRead,
}: ConversationViewProps) {
  const chat = useConversation({ conversationId, staffName, unsentStore, onAuthError, onConversationChange, onRead });
  const { conv, messages, markRead } = chat;
  const isTabVisible = useDocumentVisible();
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const anchorRef = useRef<{ height: number; top: number } | null>(null);
  const [maxSeenVisitorId, setMaxSeenVisitorId] = useState(0);
  const sendLimit = useCountdown(chat.sendLimitedUntil);
  const pollLimit = useCountdown(chat.connection.kind === "rate_limited" ? chat.connection.until : null);

  const lastKey = messages.length > 0 ? messages[messages.length - 1].key : "";

  // New messages at the bottom: follow them unless the manager scrolled up.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [lastKey, chat.loadState]);

  // Older messages prepended: keep the same message under the eye.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    const anchor = anchorRef.current;
    if (el && anchor) {
      el.scrollTop = el.scrollHeight - anchor.height + anchor.top;
      anchorRef.current = null;
    }
  }, [chat.olderLoads]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (el) {
      stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    }
  };

  const loadOlder = () => {
    const el = scrollRef.current;
    if (el) {
      anchorRef.current = { height: el.scrollHeight, top: el.scrollTop };
    }
    void chat.loadOlder();
  };

  // Track which visitor messages are actually on screen.
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        let max = 0;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            max = Math.max(max, Number((entry.target as HTMLElement).dataset.visitorMessageId));
          }
        }
        if (max > 0) {
          setMaxSeenVisitorId((prev) => Math.max(prev, max));
        }
      },
      { root, threshold: 0.6 },
    );
    root.querySelectorAll<HTMLElement>("[data-visitor-message-id]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [messages, chat.loadState]);

  // Mark read only what was shown, and only while the tab is visible.
  useEffect(() => {
    if (!isTabVisible || !conv || maxSeenVisitorId <= conv.manager_last_read_id) return;
    const timer = window.setTimeout(() => void markRead(maxSeenVisitorId), 400);
    return () => window.clearTimeout(timer);
  }, [isTabVisible, conv, maxSeenVisitorId, markRead]);

  const handleSend = (text: string) => {
    stickToBottomRef.current = true;
    chat.send(text);
  };

  if (chat.loadState === "not_found") {
    return (
      <div className="flex h-full flex-col">
        <BackBar onBack={onBack} />
        <p className="m-auto p-8 text-center text-sm text-slate-400 light:text-slate-600">Диалог не найден.</p>
      </div>
    );
  }

  const isClosed = conv?.status === "closed";
  const href = conv ? contactHref(conv.visitor_contact) : null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-[var(--text-primary)]/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 px-3 py-2 text-sm text-slate-200 light:text-slate-800 transition hover:bg-[var(--text-primary)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 md:hidden"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Назад
          </button>
          <h2 className="min-w-0 flex-1 truncate text-base font-semibold text-slate-100 light:text-slate-900">
            {conv ? visitorLabel(conv.visitor_name, conv.id) : "Диалог"}
          </h2>
          {conv ? (
            <button
              type="button"
              disabled={chat.statusBusy}
              onClick={() => void chat.setStatus(isClosed ? "open" : "closed")}
              aria-label={isClosed ? "Открыть диалог снова" : "Закрыть диалог"}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 px-3 py-2 text-sm font-medium text-slate-200 light:text-slate-800 transition hover:bg-[var(--text-primary)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 disabled:opacity-60"
            >
              {isClosed ? <Unlock className="h-4 w-4" aria-hidden="true" /> : <Lock className="h-4 w-4" aria-hidden="true" />}
              <span className="hidden sm:inline">{isClosed ? "Открыть снова" : "Закрыть диалог"}</span>
            </button>
          ) : null}
        </div>
        {conv ? (
          <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs text-slate-400 light:text-slate-600">
            <dt>Контакт</dt>
            <dd className="min-w-0 truncate">
              {conv.visitor_contact ? (
                href ? (
                  <a href={href} className="text-cyan-300 underline-offset-2 hover:underline light:text-cyan-700">
                    {conv.visitor_contact}
                  </a>
                ) : (
                  <span className="text-slate-200 light:text-slate-800">{conv.visitor_contact}</span>
                )
              ) : (
                "не оставлен"
              )}
            </dd>
            {conv.page_url ? (
              <>
                <dt>Страница</dt>
                <dd className="min-w-0 truncate">{conv.page_url}</dd>
              </>
            ) : null}
            <dt>Начат</dt>
            <dd>{formatFull(conv.created_at)}</dd>
          </dl>
        ) : null}
        {chat.statusError ? (
          <p role="alert" className="mt-1 text-xs text-rose-300 light:text-rose-700">
            {chat.statusError}
          </p>
        ) : null}
      </div>

      {chat.connection.kind === "offline" && chat.loadState === "ready" ? (
        <p role="status" className="flex items-center gap-2 border-b border-amber-400/20 bg-amber-400/10 px-4 py-2 text-xs text-amber-200 light:text-amber-800">
          <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
          Нет связи с сервером. Переподключаемся…
        </p>
      ) : null}
      {pollLimit > 0 ? (
        <p role="status" className="border-b border-amber-400/20 bg-amber-400/10 px-4 py-2 text-xs text-amber-200 light:text-amber-800">
          Слишком много запросов. Обновление продолжится через {pollLimit} с.
        </p>
      ) : null}

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label="Переписка"
        className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4"
      >
        {chat.loadState === "loading" ? (
          <p className="flex h-full items-center justify-center gap-2 text-sm text-slate-400 light:text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            Загружаем переписку…
          </p>
        ) : null}
        {chat.loadState === "error" ? (
          <div role="alert" className="flex h-full flex-col items-center justify-center gap-3 text-center text-sm text-slate-400 light:text-slate-600">
            <WifiOff className="h-5 w-5" aria-hidden="true" />
            <p>Не удалось загрузить переписку. Повторяем автоматически.</p>
            <button
              type="button"
              onClick={chat.refresh}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 px-3.5 py-2 text-xs font-medium text-slate-200 light:text-slate-800 transition hover:bg-[var(--text-primary)]/10"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Повторить сейчас
            </button>
          </div>
        ) : null}

        {chat.loadState === "ready" && chat.hasOlder ? (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={loadOlder}
              disabled={chat.loadingOlder}
              className="rounded-xl border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 px-3.5 py-1.5 text-xs font-medium text-slate-300 light:text-slate-700 transition hover:bg-[var(--text-primary)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 disabled:opacity-60"
            >
              {chat.loadingOlder ? "Загружаем…" : "Показать ранние сообщения"}
            </button>
          </div>
        ) : null}

        {chat.loadState === "ready"
          ? messages.map((message) => (
              <ManagerMessageBubble
                key={message.key}
                message={message}
                retryDisabled={sendLimit > 0}
                onRetry={chat.retry}
                onDiscard={chat.discard}
              />
            ))
          : null}
      </div>

      {chat.loadState === "ready" ? (
        isClosed ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--text-primary)]/10 p-4 text-sm text-slate-400 light:text-slate-600">
            <span>Диалог закрыт — новый ответ отправить нельзя. Сообщение посетителя откроет его автоматически.</span>
            <button
              type="button"
              disabled={chat.statusBusy}
              onClick={() => void chat.setStatus("open")}
              className="rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 disabled:opacity-60"
            >
              Открыть диалог
            </button>
          </div>
        ) : (
          <ChatComposer rateLimitSeconds={sendLimit} onSend={handleSend} />
        )
      ) : null}
    </div>
  );
}

function BackBar({ onBack }: { onBack: () => void }) {
  return (
    <div className="border-b border-[var(--text-primary)]/10 px-4 py-3 md:hidden">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 rounded-xl border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 px-3 py-2 text-sm text-slate-200 light:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Назад
      </button>
    </div>
  );
}
