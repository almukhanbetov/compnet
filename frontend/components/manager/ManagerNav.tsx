"use client";

import Link from "next/link";
import { BarChart3, ClipboardList, MessagesSquare, Tags } from "lucide-react";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useNewRequestCount } from "@/components/manager/requests/useNewRequestCount";

export type ManagerSection = "inbox" | "requests" | "analytics" | "pricing";

/** Dialogs ↔ Requests ↔ Statistics (↔ Tariffs for administrators), with the "new requests" badge. */
export function ManagerNav({ current, role }: { current: ManagerSection; role?: string }) {
  const { t } = useLocale();
  const n = t.manager.analytics.nav;
  const newRequests = useNewRequestCount();
  const item = (href: string, section: ManagerSection, label: string, Icon: typeof BarChart3, badge?: number | null) => (
    <Link
      href={href}
      aria-current={current === section ? "page" : undefined}
      className={`relative inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 ${
        current === section
          ? "bg-[var(--text-primary)]/10 text-slate-100 light:text-slate-900"
          : "text-slate-400 hover:bg-[var(--text-primary)]/5 light:text-slate-600"
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span className="hidden sm:inline">{label}</span>
      <span className="sr-only sm:hidden">{label}</span>
      {badge ? (
        <span className="absolute -right-1 -top-1 min-w-[1.1rem] rounded-full bg-pink-500 px-1 text-center text-[10px] font-bold leading-[1.1rem] text-white sm:static sm:ml-0.5">
          <span className="sr-only">{t.manager.requests.newBadgeSr} </span>
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </Link>
  );
  return (
    <nav aria-label={n.label} className="flex items-center gap-1">
      {item("/manager", "inbox", n.inbox, MessagesSquare)}
      {item("/manager/requests", "requests", n.requests, ClipboardList, newRequests)}
      {item("/manager/analytics", "analytics", n.analytics, BarChart3)}
      {role === "admin" ? item("/manager/pricing", "pricing", n.pricing, Tags) : null}
    </nav>
  );
}
