"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Paperclip, Send, Smile } from "lucide-react";
import MessageBubble from "@/components/chat/MessageBubble";
import type { AdminContact, ChatMessage } from "@/types/message";

interface ChatWindowProps {
  contact: AdminContact;
  messages: ChatMessage[];
  isTyping: boolean;
  awaitingCallback: boolean;
  onSend: (text: string) => void;
  onSubmitCallback: (name: string, phone: string) => void;
}

const fieldClass =
  "w-full rounded-xl border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-slate-500 outline-none transition focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20";

export default function ChatWindow({
  contact,
  messages,
  isTyping,
  awaitingCallback,
  onSend,
  onSubmitCallback,
}: ChatWindowProps) {
  const [draft, setDraft] = useState("");
  const [callbackName, setCallbackName] = useState("");
  const [callbackPhone, setCallbackPhone] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length, isTyping, awaitingCallback]);

  const handleSendSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) {
      return;
    }
    onSend(text);
    setDraft("");
  };

  const handleCallbackSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = callbackName.trim();
    const phone = callbackPhone.trim();
    if (!name || !phone) {
      return;
    }
    onSubmitCallback(name, phone);
    setCallbackName("");
    setCallbackPhone("");
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3 border-b border-[var(--text-primary)]/10 px-5 py-4">
        <span className="relative shrink-0">
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${contact.avatarGradientFrom} ${contact.avatarGradientTo} text-xs font-semibold text-white`}
          >
            {contact.avatarInitials}
          </span>
          {contact.status === "online" ? (
            <span
              aria-hidden="true"
              className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[var(--surface)] bg-emerald-400"
            />
          ) : null}
        </span>

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-100 light:text-slate-900">
            {contact.name}
          </p>
          <p className="text-xs text-slate-400 light:text-slate-600">
            {contact.status === "online" ? "В сети" : contact.role}
          </p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-5">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {isTyping ? (
          <div className="flex justify-start">
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.05] px-4 py-3">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
            </div>
          </div>
        ) : null}
      </div>

      {awaitingCallback ? (
        <form
          onSubmit={handleCallbackSubmit}
          className="space-y-3 border-t border-[var(--text-primary)]/10 p-4"
        >
          <p className="text-xs text-slate-400 light:text-slate-600">
            Оставьте контакты — с вами свяжутся:
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={callbackName}
              onChange={(event) => setCallbackName(event.target.value)}
              placeholder="Ваше имя"
              aria-label="Ваше имя"
              className={fieldClass}
            />
            <input
              type="tel"
              value={callbackPhone}
              onChange={(event) => setCallbackPhone(event.target.value)}
              placeholder="Номер телефона"
              aria-label="Номер телефона"
              className={fieldClass}
            />
            <button
              type="submit"
              disabled={!callbackName.trim() || !callbackPhone.trim()}
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
            >
              Отправить
            </button>
          </div>
        </form>
      ) : (
        <form
          onSubmit={handleSendSubmit}
          className="flex items-center gap-2 border-t border-[var(--text-primary)]/10 p-4"
        >
          <button
            type="button"
            aria-label="Прикрепить файл (заглушка)"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 text-slate-400 light:text-slate-500 transition hover:bg-[var(--text-primary)]/10"
          >
            <Paperclip className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Эмодзи (заглушка)"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 text-slate-400 light:text-slate-500 transition hover:bg-[var(--text-primary)]/10"
          >
            <Smile className="h-4 w-4" aria-hidden="true" />
          </button>

          <input
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Напишите сообщение"
            aria-label="Текст сообщения"
            disabled={isTyping}
            className={`min-w-0 flex-1 ${fieldClass} disabled:opacity-60`}
          />

          <button
            type="submit"
            aria-label="Отправить сообщение"
            disabled={!draft.trim() || isTyping}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>
      )}
    </div>
  );
}
