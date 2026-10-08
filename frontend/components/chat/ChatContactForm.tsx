"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Check } from "lucide-react";
import type { SaveContactResult } from "@/components/chat/useVisitorChat";
import type { ChatContact } from "@/types/message";

interface ChatContactFormProps {
  initial: ChatContact;
  onSave: (name: string, contact: string) => Promise<SaveContactResult>;
  onDone: () => void;
}

const fieldClass =
  "w-full rounded-xl border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 px-3.5 py-2.5 text-base text-[var(--text-primary)] placeholder:text-slate-500 outline-none transition focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20 sm:text-sm";

export default function ChatContactForm({ initial, onSave, onDone }: ChatContactFormProps) {
  const [name, setName] = useState(initial.name);
  const [contact, setContact] = useState(initial.contact);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!contact.trim()) {
      setFields({ contact: "Укажите телефон, email или мессенджер" });
      return;
    }
    setState("saving");
    setError(null);
    setFields({});
    const result = await onSave(name, contact);
    if (result.kind === "ok") {
      setState("saved");
      return;
    }
    setState("idle");
    setError(result.message);
    setFields(result.fields);
  };

  if (state === "saved") {
    return (
      <div role="status" className="flex items-center justify-between gap-3 border-t border-[var(--text-primary)]/10 px-4 py-3 text-sm">
        <span className="flex items-center gap-2 text-emerald-300 light:text-emerald-700">
          <Check className="h-4 w-4" aria-hidden="true" />
          Контакт сохранён
        </span>
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-400 light:text-slate-600 transition hover:bg-[var(--text-primary)]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
        >
          Готово
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-2.5 border-t border-[var(--text-primary)]/10 p-3 sm:p-4">
      <p className="text-xs leading-5 text-slate-400 light:text-slate-600">
        Оставьте контакт — менеджер сможет ответить, даже если вы закроете страницу. Это необязательно.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label htmlFor="chat-contact-name" className="sr-only">Ваше имя</label>
          <input
            id="chat-contact-name"
            type="text"
            autoComplete="name"
            maxLength={100}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Имя (необязательно)"
            className={fieldClass}
          />
          {fields.name ? <p className="mt-1 text-xs text-rose-300 light:text-rose-700">{fields.name}</p> : null}
        </div>
        <div>
          <label htmlFor="chat-contact-value" className="sr-only">Телефон, email или мессенджер</label>
          <input
            id="chat-contact-value"
            type="text"
            autoComplete="tel"
            maxLength={200}
            value={contact}
            onChange={(event) => setContact(event.target.value)}
            placeholder="Телефон, email или @мессенджер"
            aria-invalid={Boolean(fields.contact)}
            aria-describedby={fields.contact ? "chat-contact-value-error" : undefined}
            className={fieldClass}
          />
          {fields.contact ? (
            <p id="chat-contact-value-error" className="mt-1 text-xs text-rose-300 light:text-rose-700">
              {fields.contact}
            </p>
          ) : null}
        </div>
      </div>
      {error && !fields.contact && !fields.name ? (
        <p role="alert" className="text-xs text-rose-300 light:text-rose-700">{error}</p>
      ) : null}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onDone}
          className="rounded-xl px-4 py-2 text-sm font-medium text-slate-400 light:text-slate-600 transition hover:bg-[var(--text-primary)]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
        >
          Отмена
        </button>
        <button
          type="submit"
          disabled={state === "saving"}
          className="rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 disabled:cursor-wait disabled:opacity-60 disabled:hover:scale-100"
        >
          {state === "saving" ? "Сохраняем…" : "Сохранить"}
        </button>
      </div>
    </form>
  );
}
