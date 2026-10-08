"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, RefreshCw, UserRound, WifiOff, X } from "lucide-react";
import ChatComposer from "@/components/chat/ChatComposer";
import ChatContactForm from "@/components/chat/ChatContactForm";
import MessageBubble from "@/components/chat/MessageBubble";
import { useCountdown } from "@/components/chat/useCountdown";
import type { useVisitorChat } from "@/components/chat/useVisitorChat";
import { workingHours } from "@/data/contactPage";

type VisitorChat = ReturnType<typeof useVisitorChat>;

interface ChatWindowProps {
  chat: VisitorChat;
  titleId: string;
  onClose: () => void;
}

const weekdayHours = workingHours[0];

const ChatWindow = forwardRef<HTMLTextAreaElement, ChatWindowProps>(function ChatWindow(
  { chat, titleId, onClose },
  composerRef,
) {
  const [isContactOpen, setIsContactOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const rateLimitSeconds = useCountdown(chat.rateLimitedUntil);

  // Keep the newest message in view unless the visitor scrolled up to read.
  const handleScroll = () => {
    const el = scrollRef.current;
    if (el) {
      stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    }
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottomRef.current) {
      el.scrollTo({ top: el.scrollHeight });
    }
  }, [chat.messages]);

  const handleSend = (text: string) => {
    stickToBottomRef.current = true;
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
            Чат с COMPNET
          </h2>
          {weekdayHours ? (
            <p className="text-xs text-slate-400 light:text-slate-600">
              Отвечаем в рабочее время: {weekdayHours.label.toLowerCase()} {weekdayHours.value}
            </p>
          ) : null}
        </div>
        {chat.hasConversation ? (
          <button
            type="button"
            onClick={() => setIsContactOpen((prev) => !prev)}
            aria-expanded={isContactOpen}
            aria-label={hasContact ? "Изменить контакт для связи" : "Оставить контакт для связи"}
            title={hasContact ? "Изменить контакт" : "Оставить контакт"}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 text-slate-300 light:text-slate-700 transition hover:bg-[var(--text-primary)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
          >
            <UserRound className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть чат"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 text-slate-300 light:text-slate-700 transition hover:bg-[var(--text-primary)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {chat.connection === "offline" && chat.loadState !== "error" ? (
        <div role="status" className="flex items-center gap-2 border-b border-amber-400/20 bg-amber-400/10 px-4 py-2 text-xs text-amber-200 light:text-amber-800">
          <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Нет связи с сервером. Переподключаемся…
        </div>
      ) : null}

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label="Сообщения"
        className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5"
      >
        {chat.loadState === "loading" ? (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-slate-400 light:text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            Загружаем переписку…
          </div>
        ) : null}

        {chat.loadState === "error" ? (
          <div role="alert" className="flex h-full flex-col items-center justify-center gap-3 text-center text-sm text-slate-400 light:text-slate-600">
            <WifiOff className="h-5 w-5" aria-hidden="true" />
            <p>Не удалось загрузить переписку.<br />Повторяем автоматически.</p>
            <button
              type="button"
              onClick={chat.retryLoad}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 px-3.5 py-2 text-xs font-medium text-slate-200 light:text-slate-800 transition hover:bg-[var(--text-primary)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Повторить сейчас
            </button>
          </div>
        ) : null}

        {chat.loadState === "ready" && chat.messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
            <p className="text-sm font-medium text-slate-200 light:text-slate-800">
              Здравствуйте! Напишите ваш вопрос.
            </p>
            <p className="text-xs leading-5 text-slate-400 light:text-slate-600">
              Менеджер ответит здесь. Переписка сохранится в этом браузере — можно закрыть окно и вернуться позже.
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

      {chat.hasConversation && !hasContact && !isContactOpen && chat.messages.length > 0 ? (
        <div className="border-t border-[var(--text-primary)]/10 px-4 py-2 text-xs text-slate-400 light:text-slate-600">
          Хотите, чтобы мы ответили, даже если вы уйдёте?{" "}
          <button
            type="button"
            onClick={() => setIsContactOpen(true)}
            className="font-medium text-cyan-300 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 light:text-cyan-700"
          >
            Оставить контакт
          </button>
        </div>
      ) : null}

      {isContactOpen ? (
        <ChatContactForm initial={chat.contact} onSave={chat.saveContact} onDone={() => setIsContactOpen(false)} />
      ) : (
        <>
          <ChatComposer ref={composerRef} rateLimitSeconds={rateLimitSeconds} onSend={handleSend} />
          {!chat.hasConversation ? (
            <p className="px-4 pb-3 text-[11px] leading-4 text-slate-500 sm:px-5">
              Отправляя сообщение, вы соглашаетесь с{" "}
              <Link href="/privacy" className="underline underline-offset-2 hover:text-slate-300 light:hover:text-slate-700">
                политикой конфиденциальности
              </Link>
              .
            </p>
          ) : null}
        </>
      )}
    </div>
  );
});

export default ChatWindow;
