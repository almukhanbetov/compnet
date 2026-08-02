"use client";

import { useEffect, useRef, useState } from "react";
import ChatWindow from "@/components/chat/ChatWindow";
import { adminContact, initialMessages } from "@/data/messages";
import type { ChatMessage } from "@/types/message";

const NO_RESPONSE_PROBABILITY = 0.4;

function formatTime(date: Date): string {
  return date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function createMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function ChatApp() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [isTyping, setIsTyping] = useState(false);
  const [awaitingCallback, setAwaitingCallback] = useState(false);
  const timeoutsRef = useRef<number[]>([]);
  const replyIndexRef = useRef(0);

  useEffect(() => {
    const timeouts = timeoutsRef.current;
    return () => {
      timeouts.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  const handleSend = (text: string) => {
    const userMessage: ChatMessage = {
      id: createMessageId(),
      author: "user",
      text,
      time: formatTime(new Date()),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    const delay = 900 + Math.random() * 700;
    const timeoutId = window.setTimeout(() => {
      const noResponse = Math.random() < NO_RESPONSE_PROBABILITY;

      if (noResponse) {
        setMessages((prev) => [
          ...prev,
          {
            id: createMessageId(),
            author: "system",
            text: adminContact.noResponseText,
            time: formatTime(new Date()),
          },
        ]);
        setAwaitingCallback(true);
      } else {
        const replyText =
          adminContact.autoReplies[
            replyIndexRef.current % adminContact.autoReplies.length
          ];
        replyIndexRef.current += 1;

        setMessages((prev) => [
          ...prev,
          {
            id: createMessageId(),
            author: "contact",
            text: replyText,
            time: formatTime(new Date()),
          },
        ]);
      }

      setIsTyping(false);
    }, delay);

    timeoutsRef.current.push(timeoutId);
  };

  const handleSubmitCallback = (name: string, phone: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: createMessageId(),
        author: "user",
        text: `Меня зовут ${name}, мой телефон ${phone}.`,
        time: formatTime(new Date()),
      },
    ]);
    setAwaitingCallback(false);
    setIsTyping(true);

    const timeoutId = window.setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: createMessageId(),
          author: "system",
          text: `Спасибо, ${name}! Мы свяжемся с вами по номеру ${phone} в ближайшее время.`,
          time: formatTime(new Date()),
        },
      ]);
      setIsTyping(false);
    }, 900);

    timeoutsRef.current.push(timeoutId);
  };

  return (
    <section className="px-6 pb-20 md:pb-28">
      <div className="mx-auto max-w-[760px]">
        <div className="flex h-[640px] flex-col overflow-hidden rounded-[28px] border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.03] backdrop-blur-xl">
          <ChatWindow
            contact={adminContact}
            messages={messages}
            isTyping={isTyping}
            awaitingCallback={awaitingCallback}
            onSend={handleSend}
            onSubmitCallback={handleSubmitCallback}
          />
        </div>
      </div>
    </section>
  );
}
