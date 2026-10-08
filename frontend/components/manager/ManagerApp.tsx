"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldAlert, WifiOff } from "lucide-react";
import ManagerShell from "@/components/manager/ManagerShell";
import { fetchMe, logout } from "@/lib/api/manager";
import type { ApiStaffUser } from "@/types/api/manager";

type Gate =
  | { kind: "checking" }
  | { kind: "authed"; user: ApiStaffUser }
  | { kind: "forbidden"; message: string }
  | { kind: "unreachable" }
  | { kind: "leaving" };

/**
 * Entry of /manager. The session cookie is HttpOnly and scoped to the API
 * path, so the page asks GET /auth/me whether it is signed in. Any 401 later
 * on (expired, revoked, deactivated) unmounts the whole section — polling
 * stops and loaded data is dropped — and sends the user to the login page.
 */
export default function ManagerApp() {
  const router = useRouter();
  const [gate, setGate] = useState<Gate>({ kind: "checking" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void fetchMe(controller.signal).then((result) => {
      switch (result.kind) {
        case "ok":
          setGate({ kind: "authed", user: result.data.data });
          break;
        case "unauthorized":
          setGate({ kind: "leaving" });
          router.replace("/manager/login");
          break;
        case "forbidden":
          setGate({ kind: "forbidden", message: result.message });
          break;
        case "aborted":
          break;
        default:
          setGate({ kind: "unreachable" });
      }
    });
    return () => controller.abort();
  }, [attempt, router]);

  const handleAuthError = useCallback(
    (kind: "unauthorized" | "forbidden", message?: string) => {
      if (kind === "unauthorized") {
        setGate({ kind: "leaving" });
        router.replace("/manager/login?reason=expired");
      } else {
        setGate({ kind: "forbidden", message: message ?? "Недостаточно прав." });
      }
    },
    [router],
  );

  const handleLogout = useCallback(async (): Promise<string | null> => {
    const result = await logout();
    if (result.kind === "ok" || result.kind === "unauthorized") {
      setGate({ kind: "leaving" });
      router.replace("/manager/login?reason=logout");
      return null;
    }
    return result.kind === "network_error"
      ? "Не удалось выйти: нет связи с сервером. Попробуйте ещё раз."
      : "Не удалось выйти. Попробуйте ещё раз.";
  }, [router]);

  if (gate.kind === "authed") {
    return <ManagerShell user={gate.user} onAuthError={handleAuthError} onLogout={handleLogout} />;
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[var(--background)] p-6">
      {gate.kind === "checking" || gate.kind === "leaving" ? (
        <p className="flex items-center gap-2 text-sm text-slate-400 light:text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          Проверяем вход…
        </p>
      ) : null}
      {gate.kind === "unreachable" ? (
        <div role="alert" className="flex max-w-sm flex-col items-center gap-3 text-center text-sm text-slate-400 light:text-slate-600">
          <WifiOff className="h-6 w-6" aria-hidden="true" />
          <p>Нет связи с сервером. Проверьте подключение.</p>
          <button
            type="button"
            onClick={() => {
              setGate({ kind: "checking" });
              setAttempt((n) => n + 1);
            }}
            className="rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Повторить
          </button>
        </div>
      ) : null}
      {gate.kind === "forbidden" ? (
        <div role="alert" className="flex max-w-sm flex-col items-center gap-3 text-center">
          <ShieldAlert className="h-7 w-7 text-amber-300 light:text-amber-600" aria-hidden="true" />
          <h1 className="text-lg font-semibold text-slate-100 light:text-slate-900">Нет доступа к разделу менеджера</h1>
          <p className="text-sm text-slate-400 light:text-slate-600">
            Ваша учётная запись не имеет прав на работу с диалогами. Обратитесь к администратору.
          </p>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="rounded-xl border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 px-4 py-2 text-sm font-medium text-slate-200 light:text-slate-800"
          >
            Выйти
          </button>
        </div>
      ) : null}
    </main>
  );
}
