"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { MessageCircle } from "lucide-react";

export default function FloatingChatButton() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: 0.6 }}
      className="group fixed bottom-6 right-6 z-40"
    >
      <span className="pointer-events-none absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg border border-[var(--text-primary)]/10 bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-slate-200 light:text-slate-800 opacity-0 shadow-lg transition group-hover:opacity-100">
        Открыть чат с администратором
      </span>

      <Link
        href="/profile/messages"
        aria-label="Открыть чат с администратором"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-blue-600 text-white shadow-[0_0_25px_rgba(124,58,237,0.45)] transition hover:scale-110 hover:shadow-[0_0_35px_rgba(124,58,237,0.6)]"
      >
        <MessageCircle className="h-6 w-6" aria-hidden="true" />
      </Link>
    </motion.div>
  );
}
