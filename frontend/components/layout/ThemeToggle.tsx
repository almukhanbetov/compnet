"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isLight ? "Включить тёмную тему" : "Включить светлую тему"}
      aria-pressed={isLight}
      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 text-slate-200 light:text-slate-800 transition hover:bg-[var(--text-primary)]/10"
    >
      {isLight ? (
        <Moon className="h-4 w-4 text-cyan-300 light:text-cyan-700" aria-hidden="true" />
      ) : (
        <Sun className="h-4 w-4 text-cyan-300 light:text-cyan-700" aria-hidden="true" />
      )}
    </button>
  );
}
