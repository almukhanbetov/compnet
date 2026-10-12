"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, Check, Copy, Loader2, Lock, RefreshCw, Unlock, WifiOff } from "lucide-react";
import ChatComposer from "@/components/chat/ChatComposer";
import { useCountdown } from "@/components/chat/useCountdown";
import { useDocumentVisible } from "@/components/chat/useBrowserState";
import { useLocale } from "@/components/providers/LocaleProvider";
import ManagerMessageBubble from "@/components/manager/ManagerMessageBubble";
import { contactHref, formatFull, visitorLabel } from "@/components/manager/format";
import { useConversation, type UnsentStore } from "@/components/manager/useConversation";
import type { AuthErrorHandler } from "@/components/manager/useInbox";
import { fill } from "@/lib/i18n";
import type { ApiManagerConversation } from "@/types/api/manager";

interface ConversationViewProps {
  conversationId: string;
  staffName: string;
  staffId: string;
  unsentStore: UnsentStore;
  /** Reply drafts per conversation; they outlive the view. */
  drafts: Map<string, string>;
  visitorOnline: boolean;
  onBack: () => void;
  onAuthError: AuthErrorHandler;
  onConversationChange: (conv: ApiManagerConversation) => void;
  onRead: () => void;
}

/** Mount with key={conversationId}: one instance per conversation. */
export default function ConversationView({
  conversationId,
  staffName,
  staffId,
  unsentStore,
  drafts,
  visitorOnline,
  onBack,
  onAuthError,
  onConversationChange,
  onRead,
}: ConversationViewProps) {
  const { t } = useLocale();
  const v = t.manager.view;
  const chat = useConversation({ conversationId, staffName, staffId, unsentStore, onAuthError, onConversationChange, onRead });
  const { conv, messages, markRead } = chat;
  const isTabVisible = useDocumentVisible();
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const anchorRef = useRef<{ height: number; top: number } | null>(null);
  const lastKeyRef = useRef("");
  const [maxSeenVisitorId, setMaxSeenVisitorId] = useState(0);
  const [hasNewBelow, setHasNewBelow] = useState(false);
  const [copied, setCopied] = useState(false);
  const sendLimit = useCountdown(chat.sendLimitedUntil);
  const pollLimit = useCountdown(chat.connection.kind === "rate_limited" ? chat.connection.until : null);

  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const lastKey = lastMessage?.key ?? "";

  // New messages at the bottom: follow them unless the manager scrolled up
  // to read; then offer a button instead.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const appended = lastKeyRef.current !== "" && lastKey !== lastKeyRef.current;
    lastKeyRef.current = lastKey;
    if (stickToBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    } else if (appended && lastMessage?.author === "visitor") {
      setHasNewBelow(true);
    }
  }, [lastKey, lastMessage?.author, chat.loadState]);

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
      if (stickToBottomRef.current) setHasNewBelow(false);
    }
  };

  const scrollToEnd = () => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    stickToBottomRef.current = true;
    setHasNewBelow(false);
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
    scrollToEnd();
    drafts.delete(conversationId);
    chat.send(text);
  };

  const copyContact = async () => {
    if (!conv?.visitor_contact) return;
    try {
      await navigator.clipboard.writeText(conv.visitor_contact);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable (permissions, insecure context): the value is selectable.
    }
  };

  if (chat.loadState === "not_found") {
    return (
      <div className="flex h-full flex-col">
        <BackBar onBack={onBack} label={v.back} />
        <p className="m-auto p-8 text-center text-sm text-slate-400 light:text-slate-600">{v.notFound}</p>
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
            {v.back}
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold text-slate-100 light:text-slate-900">
              {conv ? visitorLabel(conv.visitor_name, conv.id, t.manager.visitorFallback) : v.dialog}
            </h2>
            <p className="flex items-center gap-1.5 text-[11px] text-slate-400 light:text-slate-600">
              <span
                aria-hidden="true"
                className={`h-1.5 w-1.5 rounded-full ${visitorOnline ? "bg-emerald-400" : "bg-slate-500"}`}
              />
              {visitorOnline ? v.visitorOnline : v.visitorOffline}
            </p>
          </div>
          {conv ? (
            <button
              type="button"
              disabled={chat.statusBusy}
              onClick={() => void chat.setStatus(isClosed ? "open" : "closed")}
              aria-label={isClosed ? v.reopenAria : v.closeAria}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 px-3 py-2 text-sm font-medium text-slate-200 light:text-slate-800 transition hover:bg-[var(--text-primary)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 disabled:opacity-60"
            >
              {isClosed ? <Unlock className="h-4 w-4" aria-hidden="true" /> : <Lock className="h-4 w-4" aria-hidden="true" />}
              <span className="hidden sm:inline">{isClosed ? v.reopen : v.close}</span>
            </button>
          ) : null}
        </div>
        {conv ? (
          <dl className="mt-2 grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1 text-xs text-slate-400 light:text-slate-600">
            <dt>{v.contact}</dt>
            <dd className="flex min-w-0 items-center gap-2">
              {conv.visitor_contact ? (
                <>
                  {href ? (
                    <a
                      href={href}
                      className="truncate font-medium text-cyan-300 underline-offset-2 hover:underline light:text-cyan-700"
                    >
                      {conv.visitor_contact}
                    </a>
                  ) : (
                    <span className="truncate font-medium text-slate-200 light:text-slate-800">{conv.visitor_contact}</span>
                  )}
                  <button
                    type="button"
                    onClick={() => void copyContact()}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[var(--text-primary)]/15 px-2 py-0.5 text-[11px] text-slate-300 light:text-slate-700 transition hover:bg-[var(--text-primary)]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
                  >
                    {copied ? <Check className="h-3 w-3" aria-hidden="true" /> : <Copy className="h-3 w-3" aria-hidden="true" />}
                    {copied ? v.copied : v.copy}
                  </button>
                </>
              ) : (
                v.noContact
              )}
            </dd>
            {conv.page_url ? (
              <>
                <dt>{v.page}</dt>
                <dd className="min-w-0 truncate">{conv.page_url}</dd>
              </>
            ) : null}
            <dt>{v.started}</dt>
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
          {v.offline}
        </p>
      ) : null}
      {pollLimit > 0 ? (
        <p role="status" className="border-b border-amber-400/20 bg-amber-400/10 px-4 py-2 text-xs text-amber-200 light:text-amber-800">
          {fill(t.manager.shell.rateLimited, { seconds: String(pollLimit) })}
        </p>
      ) : null}

      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          aria-label={v.logLabel}
          className="h-full space-y-3 overflow-y-auto overscroll-contain px-4 py-4"
        >
          {chat.loadState === "loading" ? (
            <p className="flex h-full items-center justify-center gap-2 text-sm text-slate-400 light:text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              {v.loading}
            </p>
          ) : null}
          {chat.loadState === "error" ? (
            <div role="alert" className="flex h-full flex-col items-center justify-center gap-3 text-center text-sm text-slate-400 light:text-slate-600">
              <WifiOff className="h-5 w-5" aria-hidden="true" />
              <p>{v.loadFailed}</p>
              <button
                type="button"
                onClick={chat.refresh}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 px-3.5 py-2 text-xs font-medium text-slate-200 light:text-slate-800 transition hover:bg-[var(--text-primary)]/10"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                {v.retryNow}
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
                {chat.loadingOlder ? v.loadingOlder : v.loadOlder}
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
        {hasNewBelow ? (
          <button
            type="button"
            onClick={scrollToEnd}
            className="absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-600 to-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-[0_6px_20px_rgba(37,99,235,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
          >
            <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
            {v.newMessages}
          </button>
        ) : null}
      </div>

      {chat.visitorTyping || chat.otherTyping ? (
        <p role="status" className="px-4 pb-1 pt-2 text-xs italic text-slate-400 light:text-slate-600">
          {chat.visitorTyping ? v.visitorTyping : fill(v.managerTyping, { name: chat.otherTyping ?? "" })}
        </p>
      ) : null}

      {chat.loadState === "ready" ? (
        isClosed ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--text-primary)]/10 p-4 text-sm text-slate-400 light:text-slate-600">
            <span>{v.closedNote}</span>
            <button
              type="button"
              disabled={chat.statusBusy}
              onClick={() => void chat.setStatus("open")}
              className="rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 disabled:opacity-60"
            >
              {v.openDialog}
            </button>
          </div>
        ) : (
          <ChatComposer
            rateLimitSeconds={sendLimit}
            onSend={handleSend}
            onTyping={chat.notifyTyping}
            initialDraft={drafts.get(conversationId) ?? ""}
            onDraftChange={(draft) => (draft ? drafts.set(conversationId, draft) : drafts.delete(conversationId))}
          />
        )
      ) : null}
    </div>
  );
}

function BackBar({ onBack, label }: { onBack: () => void; label: string }) {
  return (
    <div className="border-b border-[var(--text-primary)]/10 px-4 py-3 md:hidden">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 rounded-xl border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 px-3 py-2 text-sm text-slate-200 light:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {label}
      </button>
    </div>
  );
}
