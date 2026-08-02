import { Info } from "lucide-react";

export default function ChatHero() {
  return (
    <section className="relative overflow-hidden px-6 pt-16 pb-8 md:pt-24">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-violet-600/20 blur-[100px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 top-10 h-80 w-80 rounded-full bg-cyan-400/15 blur-[100px]"
      />

      <div className="relative mx-auto max-w-2xl text-center">
        <span className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-300 light:border-cyan-600/30 light:bg-cyan-500/10 light:text-cyan-700">
          Сообщения
        </span>

        <h1 className="mt-6 text-3xl font-bold leading-tight md:text-5xl">
          Свяжитесь с{" "}
          <span className="bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent">
            администратором COMPNET
          </span>
        </h1>

        <p className="mt-4 text-base leading-7 text-slate-400 light:text-slate-600 md:text-lg">
          Напишите напрямую администратору проекта — ответит первый
          освободившийся сотрудник.
        </p>

        <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-left light:border-cyan-600/30 light:bg-cyan-500/10">
          <Info
            className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300 light:text-cyan-700"
            aria-hidden="true"
          />
          <p className="text-xs leading-5 text-cyan-100 light:text-cyan-900">
            Это демонстрационный прототип: сообщения нигде не сохраняются,
            ответы имитируются локально — реальный чат подключится вместе с
            backend.
          </p>
        </div>
      </div>
    </section>
  );
}
