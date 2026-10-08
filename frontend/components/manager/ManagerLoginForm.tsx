"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, LogIn } from "lucide-react";
import ThemeToggle from "@/components/layout/ThemeToggle";
import { useCountdown } from "@/components/chat/useCountdown";
import { fetchMe, login } from "@/lib/api/manager";

const notices: Record<string, string> = {
  expired: "Сессия завершилась. Войдите снова.",
  logout: "Вы вышли из раздела менеджера.",
};

const fieldClass =
  "w-full rounded-xl border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 px-4 py-3 text-base text-[var(--text-primary)] placeholder:text-slate-500 outline-none transition focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20 sm:text-sm";

/**
 * Staff login. The password lives only in this component's state for the
 * duration of the request and is cleared after every attempt; it is never
 * stored or logged.
 */
export default function ManagerLoginForm() {
  const router = useRouter();
  const reason = useSearchParams().get("reason") ?? "";
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitedUntil, setLimitedUntil] = useState<number | null>(null);
  const waitSeconds = useCountdown(limitedUntil);

  // Already signed in? Go straight to the inbox.
  useEffect(() => {
    const controller = new AbortController();
    void fetchMe(controller.signal).then((result) => {
      if (result.kind === "ok") {
        router.replace("/manager");
      } else if (result.kind !== "aborted") {
        setChecking(false);
      }
    });
    return () => controller.abort();
  }, [router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting || waitSeconds > 0) return;
    if (!email.trim() || !password) {
      setError("Введите email и пароль.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await login(email.trim(), password);
    setPassword("");
    setSubmitting(false);

    switch (result.kind) {
      case "ok":
        router.replace("/manager");
        return;
      case "unauthorized":
        setError("Неверный email или пароль.");
        return;
      case "rate_limited":
        setLimitedUntil(Date.now() + result.retryAfterSeconds * 1000);
        setError(null);
        return;
      case "validation_error":
        setError(result.message);
        return;
      case "network_error":
        setError("Нет связи с сервером. Проверьте подключение и попробуйте снова.");
        return;
      case "forbidden":
        setError("Вход отклонён. Обновите страницу и попробуйте снова.");
        return;
      default:
        setError("Не удалось войти. Попробуйте позже.");
    }
  };

  const notice = notices[reason];

  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[var(--background)] px-4 py-10">
      <div aria-hidden="true" className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-violet-600/20 blur-[100px]" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-cyan-400/15 blur-[100px]" />
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="relative w-full max-w-sm rounded-[28px] border border-[var(--text-primary)]/10 bg-[var(--surface)]/80 p-6 shadow-[0_20px_60px_rgba(7,11,23,0.35)] backdrop-blur-xl sm:p-8">
        <p className="text-lg font-bold tracking-tight">
          COMP
          <span className="bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent">NET</span>
        </p>
        <h1 className="mt-4 text-2xl font-bold text-slate-100 light:text-slate-900">Вход для менеджера</h1>
        <p className="mt-1 text-sm text-slate-400 light:text-slate-600">Диалоги с посетителями сайта.</p>

        {notice ? (
          <p role="status" className="mt-4 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-sm text-cyan-100 light:border-cyan-600/30 light:bg-cyan-500/10 light:text-cyan-900">
            {notice}
          </p>
        ) : null}

        {checking ? (
          <p className="mt-6 flex items-center gap-2 text-sm text-slate-400 light:text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            Проверяем вход…
          </p>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
            <div>
              <label htmlFor="manager-email" className="mb-1.5 block text-sm font-medium text-slate-300 light:text-slate-700">
                Email
              </label>
              <input
                id="manager-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={fieldClass}
                required
              />
            </div>
            <div>
              <label htmlFor="manager-password" className="mb-1.5 block text-sm font-medium text-slate-300 light:text-slate-700">
                Пароль
              </label>
              <input
                id="manager-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={fieldClass}
                required
              />
            </div>

            {error ? (
              <p role="alert" className="text-sm text-rose-300 light:text-rose-700">
                {error}
              </p>
            ) : null}
            {waitSeconds > 0 ? (
              <p role="status" className="text-sm text-amber-300 light:text-amber-700">
                Слишком много попыток входа. Повторите через {waitSeconds} с.
              </p>
            ) : null}

            <button
              type="submit"
              disabled={submitting || waitSeconds > 0}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_0_24px_rgba(124,58,237,0.35)] transition hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              ) : (
                <LogIn className="h-4 w-4" aria-hidden="true" />
              )}
              {submitting ? "Входим…" : "Войти"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
