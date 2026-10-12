"use client";

import { forwardRef, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, ExternalLink, Loader2, MessageCircle, RefreshCw, UserRound, WifiOff, X } from "lucide-react";
import ChatComposer from "@/components/chat/ChatComposer";
import ChatContactForm from "@/components/chat/ChatContactForm";
import MessageBubble from "@/components/chat/MessageBubble";
import { useCountdown } from "@/components/chat/useCountdown";
import type { useVisitorChat } from "@/components/chat/useVisitorChat";
import { useLocale } from "@/components/providers/LocaleProvider";
import { whatsappLink } from "@/data/contacts";

type VisitorChat = ReturnType<typeof useVisitorChat>;

interface ChatWindowProps {
  chat: VisitorChat;
  titleId: string;
  onClose: () => void;
}

const ChatWindow = forwardRef<HTMLTextAreaElement, ChatWindowProps>(function ChatWindow(
  { chat, titleId, onClose },
  composerRef,
) {
  const { t } = useLocale();
  const w = t.chat.window;
  const [isContactOpen, setIsContactOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const anchorRef = useRef<{ height: number; top: number } | null>(null);
  const lastKeyRef = useRef("");
  const [hasNewBelow, setHasNewBelow] = useState(false);
  const [wasLive, setWasLive] = useState(false);
  const rateLimitSeconds = useCountdown(chat.rateLimitedUntil);
  const { setAtBottom } = chat;

  // "Reconnecting" is only worth saying after a live connection was lost;
  // without WebSocket at all the chat simply works over HTTP.
  if (chat.realtime === "open" && !wasLive) {
    setWasLive(true);
  }

  const scrollToEnd = () => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight });
    stickToBottomRef.current = true;
    setHasNewBelow(false);
    setAtBottom(true);
  };

  // Follow new messages only while the visitor is at the end; otherwise
  // offer a button instead of yanking them away from what they read.
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atEnd = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    stickToBottomRef.current = atEnd;
    setAtBottom(atEnd);
    if (atEnd) setHasNewBelow(false);
  };

  const lastMessage = chat.messages.length > 0 ? chat.messages[chat.messages.length - 1] : null;
  const lastKey = lastMessage?.key ?? "";

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || lastKey === lastKeyRef.current) return;
    const appended = lastKeyRef.current !== "";
    lastKeyRef.current = lastKey;
    if (stickToBottomRef.current) {
      el.scrollTo({ top: el.scrollHeight });
    } else if (appended && lastMessage?.author !== "visitor") {
      setHasNewBelow(true);
    }
  }, [lastKey, lastMessage?.author]);

  // Earlier messages prepended: keep the same message under the eye.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    const anchor = anchorRef.current;
    if (el && anchor) {
      el.scrollTop = el.scrollHeight - anchor.height + anchor.top;
      anchorRef.current = null;
    }
  }, [chat.olderLoads]);

  const loadOlder = () => {
    const el = scrollRef.current;
    if (el) anchorRef.current = { height: el.scrollHeight, top: el.scrollTop };
    void chat.loadOlder();
  };

  const handleSend = (text: string) => {
    scrollToEnd();
    chat.send(text);
  };

  const hasContact = chat.contact.contact.length > 0;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start gap-3 border-b border-[var(--text-primary)]/10 px-4 py-3.5 sm:px-5">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-blue-600 text-xs font-bold text-white"
        >
          CN
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="truncate text-sm font-semibold text-slate-100 light:text-slate-900">
            {w.title}
          </h2>
          <p className="text-xs text-slate-400 light:text-slate-600">{w.subtitle}</p>
          {chat.managersOnline ? (
            <p className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-emerald-300 light:text-emerald-700">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {w.managerOnline}
            </p>
          ) : wasLive && chat.realtime === "reconnecting" ? (
            <p role="status" className="mt-0.5 flex items-center gap-1.5 text-[11px] text-amber-300 light:text-amber-700">
              <Loader2 className="h-3 w-3 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              {w.reconnecting}
            </p>
          ) : null}
        </div>
        {chat.hasConversation ? (
          <button
            type="button"
            onClick={() => setIsContactOpen((prev) => !prev)}
            aria-expanded={isContactOpen}
            aria-label={hasContact ? w.editContact : w.addContact}
            title={hasContact ? w.editContactShort : w.addContactShort}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 text-slate-300 light:text-slate-700 transition hover:bg-[var(--text-primary)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
          >
            <UserRound className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
        <button
          type="button"
          onClick={onClose}
          aria-label={t.chat.launcher.close}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 text-slate-300 light:text-slate-700 transition hover:bg-[var(--text-primary)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {/* Alternative channel, part of the panel so it never covers the chat or the page. */}
      <div className="flex items-center justify-between gap-3 border-b border-[var(--text-primary)]/10 px-4 py-2 sm:px-5">
        <span className="min-w-0 text-xs text-slate-400 light:text-slate-600">{w.whatsappPrompt}</span>
        <a
          href={whatsappLink()}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1.5 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-400/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 light:border-emerald-600/30 light:text-emerald-800"
        >
          <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
          {w.whatsapp}
          <ExternalLink className="h-3 w-3 opacity-70" aria-hidden="true" />
          <span className="sr-only">{t.header.actions.opensInNewTab}</span>
        </a>
      </div>

      {chat.connection === "offline" && chat.loadState !== "error" ? (
        <div role="status" className="flex items-center gap-2 border-b border-amber-400/20 bg-amber-400/10 px-4 py-2 text-xs text-amber-200 light:text-amber-800">
          <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {w.offline}
        </div>
      ) : null}

      <div className="relative min-h-0 flex-1">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label={w.messages}
        className="h-full space-y-3 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5"
      >
        {chat.loadState === "ready" && chat.hasOlder ? (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={loadOlder}
              disabled={chat.loadingOlder}
              className="rounded-xl border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 px-3.5 py-1.5 text-xs font-medium text-slate-300 light:text-slate-700 transition hover:bg-[var(--text-primary)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 disabled:opacity-60"
            >
              {chat.loadingOlder ? w.loadingOlder : w.loadOlder}
            </button>
          </div>
        ) : null}

        {chat.loadState === "loading" ? (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-slate-400 light:text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            {w.loading}
          </div>
        ) : null}

        {chat.loadState === "error" ? (
          <div role="alert" className="flex h-full flex-col items-center justify-center gap-3 text-center text-sm text-slate-400 light:text-slate-600">
            <WifiOff className="h-5 w-5" aria-hidden="true" />
            <p>{w.loadFailed}<br />{w.loadRetrying}</p>
            <button
              type="button"
              onClick={chat.retryLoad}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 px-3.5 py-2 text-xs font-medium text-slate-200 light:text-slate-800 transition hover:bg-[var(--text-primary)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              {w.retryNow}
            </button>
          </div>
        ) : null}

        {chat.loadState === "ready" && chat.messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
            <p className="text-sm font-medium text-slate-200 light:text-slate-800">
              {w.emptyTitle}
            </p>
            <p className="text-xs leading-5 text-slate-400 light:text-slate-600">
              {w.emptyText}
            </p>
          </div>
        ) : null}

        {chat.loadState !== "loading" &&
          chat.messages.map((message) => (
            <MessageBubble
              key={message.key}
              message={message}
              retryDisabled={rateLimitSeconds > 0}
              onRetry={chat.retry}
              onDiscard={chat.discard}
            />
          ))}
      </div>

      {hasNewBelow ? (
        <button
          type="button"
          onClick={scrollToEnd}
          className="absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-600 to-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-[0_6px_20px_rgba(37,99,235,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
        >
          <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
          {w.newMessages}
        </button>
      ) : null}
      </div>

      {chat.managerTyping ? (
        <p role="status" className="px-4 pb-1 pt-2 text-xs italic text-slate-400 light:text-slate-600 sm:px-5">
          {w.typing}
        </p>
      ) : null}

      {chat.status === "closed" && chat.messages.length > 0 ? (
        <p className="border-t border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.03] px-4 py-2 text-xs leading-5 text-slate-400 light:text-slate-600 sm:px-5">
          {w.closedNote}
        </p>
      ) : null}

      {chat.hasConversation && !hasContact && !isContactOpen && chat.messages.length > 0 ? (
        <div className="border-t border-[var(--text-primary)]/10 px-4 py-2 text-xs text-slate-400 light:text-slate-600">
          {w.contactPrompt}{" "}
          <button
            type="button"
            onClick={() => setIsContactOpen(true)}
            className="font-medium text-cyan-300 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 light:text-cyan-700"
          >
            {w.addContactShort}
          </button>
        </div>
      ) : null}

      {isContactOpen ? (
        <ChatContactForm initial={chat.contact} onSave={chat.saveContact} onDone={() => setIsContactOpen(false)} />
      ) : (
        <>
          <ChatComposer ref={composerRef} rateLimitSeconds={rateLimitSeconds} onSend={handleSend} onTyping={chat.notifyTyping} />
          {!chat.hasConversation ? (
            <p className="px-4 pb-3 text-[11px] leading-4 text-slate-500 sm:px-5">
              {w.consentStart}{" "}
              <Link href="/privacy" className="underline underline-offset-2 hover:text-slate-300 light:hover:text-slate-700">
                {w.consentLink}
              </Link>
              {w.consentEnd}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
});

export default ChatWindow;
