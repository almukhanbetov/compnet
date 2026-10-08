import { AlertCircle, Check, Clock, RotateCcw, X } from "lucide-react";
import type { ChatMessage } from "@/types/message";

interface MessageBubbleProps {
  message: ChatMessage;
  retryDisabled: boolean;
  onRetry: (clientMessageId: string) => void;
  onDiscard: (clientMessageId: string) => void;
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

export default function MessageBubble({ message, retryDisabled, onRetry, onDiscard }: MessageBubbleProps) {
  if (message.author === "system") {
    return (
      <div className="flex justify-center">
        <div className="max-w-[85%] rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2.5 text-center text-xs leading-5 text-cyan-100 light:border-cyan-600/30 light:bg-cyan-500/10 light:text-cyan-900">
          {message.body}
        </div>
      </div>
    );
  }

  const isOwn = message.author === "visitor";
  const isFailed = message.status === "failed";
  const isSending = message.status === "sending";

  return (
    <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
      {!isOwn ? (
        <span className="mb-1 px-1 text-[11px] font-medium text-slate-400 light:text-slate-500">
          Менеджер COMPNET
        </span>
      ) : null}

      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-6 ${
          isOwn
            ? `rounded-br-sm bg-gradient-to-r from-violet-600 to-blue-600 text-white ${isSending ? "opacity-70" : ""} ${isFailed ? "opacity-60" : ""}`
            : "rounded-bl-sm border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.05] text-slate-200 light:text-slate-800"
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.body}</p>
        <p
          className={`mt-1 flex items-center justify-end gap-1 text-[11px] ${
            isOwn ? "text-white/75" : "text-slate-500"
          }`}
        >
          <span>{formatTime(message.createdAt)}</span>
          {isOwn && isSending ? (
            <>
              <Clock className="h-3 w-3" aria-hidden="true" />
              <span>Отправляется…</span>
            </>
          ) : null}
          {isOwn && message.status === "sent" ? (
            <>
              <Check className="h-3 w-3" aria-hidden="true" />
              <span>Отправлено</span>
            </>
          ) : null}
        </p>
      </div>

      {isFailed && message.clientMessageId ? (
        <div role="alert" className="mt-1.5 flex max-w-[85%] flex-col items-end gap-1.5 text-right">
          <p className="text-xs leading-5 text-rose-300 light:text-rose-700">
            <AlertCircle className="mr-1 inline h-3.5 w-3.5 -translate-y-px align-middle" aria-hidden="true" />
            {message.error ?? "Сообщение не отправлено."}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => message.clientMessageId && onRetry(message.clientMessageId)}
              disabled={retryDisabled}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 px-2.5 py-1 text-xs font-medium text-slate-200 light:text-slate-800 transition hover:bg-[var(--text-primary)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RotateCcw className="h-3 w-3" aria-hidden="true" />
              Повторить
            </button>
            <button
              type="button"
              onClick={() => message.clientMessageId && onDiscard(message.clientMessageId)}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-400 light:text-slate-600 transition hover:bg-[var(--text-primary)]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
            >
              <X className="h-3 w-3" aria-hidden="true" />
              Удалить
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
