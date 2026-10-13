"use client";

import type { ReactNode } from "react";
import { LogOut } from "lucide-react";
import ThemeToggle from "@/components/layout/ThemeToggle";
import { useLocale } from "@/components/providers/LocaleProvider";
import { ManagerNav, type ManagerSection } from "@/components/manager/ManagerNav";
import type { ApiStaffUser } from "@/types/api/manager";

interface ManagerHeaderProps {
  current: ManagerSection;
  user: ApiStaffUser;
  onLogout: () => void;
  loggingOut?: boolean;
  /** Extra badges next to the navigation (e.g. unread messages). */
  children?: ReactNode;
  sticky?: boolean;
}

/** The manager section's top bar: logo, sections, user, theme, logout. */
export default function ManagerHeader({ current, user, onLogout, loggingOut = false, children, sticky = false }: ManagerHeaderProps) {
  const { t } = useLocale();
  return (
    <header
      className={`${sticky ? "sticky top-0 z-20 " : ""}border-b border-[var(--text-primary)]/10 bg-[var(--background)]/80 backdrop-blur-xl`}
    >
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-2 px-3 sm:gap-3 md:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <span className="hidden shrink-0 text-lg font-bold tracking-tight min-[400px]:inline">
            COMP
            <span className="bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent">NET</span>
          </span>
          <ManagerNav current={current} />
          {children}
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden max-w-[16rem] truncate text-sm text-slate-300 light:text-slate-700 md:inline">{user.display_name}</span>
          <ThemeToggle />
          <button
            type="button"
            onClick={onLogout}
            disabled={loggingOut}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 px-3 text-sm font-medium text-slate-200 transition hover:bg-[var(--text-primary)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 disabled:opacity-60 light:text-slate-800"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">{t.manager.gate.logout}</span>
            <span className="sr-only sm:hidden">{t.manager.gate.logout}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
