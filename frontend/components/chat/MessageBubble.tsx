import type { ChatMessage } from "@/types/message";

interface MessageBubbleProps {
  message: ChatMessage;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  if (message.author === "system") {
    return (
      <div className="flex justify-center">
        <div className="max-w-[85%] rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2.5 text-center text-xs leading-5 text-cyan-100 light:border-cyan-600/30 light:bg-cyan-500/10 light:text-cyan-900">
          {message.text}
        </div>
      </div>
    );
  }

  const isUser = message.author === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-6 ${
          isUser
            ? "rounded-br-sm bg-gradient-to-r from-violet-600 to-blue-600 text-white"
            : "rounded-bl-sm border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.05] text-slate-200 light:text-slate-800"
        }`}
      >
        <p>{message.text}</p>
        <p
          className={`mt-1 text-right text-[11px] ${
            isUser ? "text-white/70" : "text-slate-500 light:text-slate-500"
          }`}
        >
          {message.time}
        </p>
      </div>
    </div>
  );
}
