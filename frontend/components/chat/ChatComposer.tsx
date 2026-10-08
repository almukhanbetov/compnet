"use client";

import { forwardRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { Send } from "lucide-react";
import { MAX_MESSAGE_LENGTH } from "@/lib/chat/config";

interface ChatComposerProps {
  rateLimitSeconds: number;
  onSend: (text: string) => void;
}

const COUNTER_FROM = MAX_MESSAGE_LENGTH - 200;

const ChatComposer = forwardRef<HTMLTextAreaElement, ChatComposerProps>(function ChatComposer(
  { rateLimitSeconds, onSend },
  ref,
) {
  const [draft, setDraft] = useState("");
  const length = [...draft].length;
  const isTooLong = length > MAX_MESSAGE_LENGTH;
  const isBlocked = rateLimitSeconds > 0;
  const canSend = draft.trim().length > 0 && !isTooLong && !isBlocked;

  const submit = () => {
    if (!canSend) {
      return;
    }
    onSend(draft);
    setDraft("");
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit();
  };

  // Enter sends, Shift+Enter adds a line; never send mid-IME composition.
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-[var(--text-primary)]/10 p-3 sm:p-4">
      {isBlocked ? (
        <p role="status" className="mb-2 text-xs text-amber-300 light:text-amber-700">
          Слишком много сообщений подряд. Отправить снова можно через {rateLimitSeconds} с.
        </p>
      ) : null}

      <div className="flex items-end gap-2">
        <label htmlFor="chat-composer" className="sr-only">
          Текст сообщения
        </label>
        <textarea
          id="chat-composer"
          ref={ref}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Напишите сообщение"
          aria-describedby={isTooLong ? "chat-composer-error" : undefined}
          aria-invalid={isTooLong}
          className="max-h-32 min-h-[44px] min-w-0 flex-1 resize-none rounded-xl border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 px-4 py-2.5 text-base text-[var(--text-primary)] placeholder:text-slate-500 outline-none transition [field-sizing:content] focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20 sm:text-sm"
        />
        <button
          type="submit"
          aria-label="Отправить сообщение"
          disabled={!canSend}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {length >= COUNTER_FROM ? (
        <p
          id="chat-composer-error"
          className={`mt-1.5 text-right text-[11px] ${isTooLong ? "text-rose-300 light:text-rose-700" : "text-slate-500"}`}
        >
          {length} / {MAX_MESSAGE_LENGTH}
          {isTooLong ? " — сообщение слишком длинное" : ""}
        </p>
      ) : null}
    </form>
  );
});

export default ChatComposer;
