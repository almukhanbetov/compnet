"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { AnimatePresence, motion } from "motion/react";
import { MessageCircle, X } from "lucide-react";
import { useLocale } from "@/components/providers/LocaleProvider";
import ChatWindow from "@/components/chat/ChatWindow";
import { track } from "@/lib/analytics/tracker";
import { fill } from "@/lib/i18n";
import { useVisitorChat } from "@/components/chat/useVisitorChat";
import { useMediaQuery, useVisualViewport } from "@/components/chat/useBrowserState";

/** Below Tailwind's `sm` breakpoint the panel becomes a full-screen dialog. */
const MOBILE_QUERY = "(max-width: 639px)";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Floating visitor chat: a launcher in the bottom-right corner and a panel
 * that opens in place (a floating card from 640px, a full-screen dialog on
 * phones). Below 1024px the launcher is a 56px icon button; its name stays
 * in aria-label. Layering: launcher and desktop panel sit at z-30, under the
 * sticky header (z-50) and the mobile menu (z-40); the phone dialog covers
 * everything at z-[60].
 */
export default function ChatWidget() {
  const { t } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const chat = useVisitorChat(isOpen);
  const panelId = useId();
  const titleId = useId();
  const launcherRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const viewport = useVisualViewport();

  const close = useCallback(() => {
    setIsOpen(false);
    // Return focus to the control that opened the dialog.
    requestAnimationFrame(() => launcherRef.current?.focus());
  }, []);

  // Focus the message field once the panel is on screen.
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const id = requestAnimationFrame(() => composerRef.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(id);
  }, [isOpen]);

  // Escape closes; on phones the dialog is modal, so Tab stays inside it.
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab" || !isMobile || !panelRef.current) {
        return;
      }
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) {
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, isMobile, close]);

  // Lock page scroll behind the full-screen phone dialog.
  useEffect(() => {
    if (!isOpen || !isMobile) {
      return;
    }
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [isOpen, isMobile]);

  const unread = chat.unreadCount;
  const launcherLabel = isOpen
    ? t.chat.launcher.close
    : unread > 0
      ? fill(t.chat.launcher.openUnread, { count: String(unread) })
      : t.chat.launcher.open;

  const mobileStyle: CSSProperties | undefined =
    isMobile && viewport ? { height: viewport.height, top: viewport.offsetTop } : undefined;

  return (
    <>
      <AnimatePresence>
        {isOpen ? (
          <motion.div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-modal={isMobile}
            aria-labelledby={titleId}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            style={mobileStyle}
            className="fixed inset-x-0 top-0 z-[60] flex h-[100dvh] flex-col overflow-hidden bg-[var(--surface)] pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] sm:p-0 sm:inset-x-auto sm:top-auto sm:right-6 sm:bottom-24 sm:z-30 sm:h-[min(600px,calc(100dvh-11.5rem))] sm:w-[380px] sm:rounded-[28px] sm:border sm:border-[var(--text-primary)]/10 sm:bg-[var(--surface)]/95 sm:shadow-[0_20px_60px_rgba(7,11,23,0.45)] sm:backdrop-blur-xl light:sm:shadow-[0_20px_60px_rgba(15,23,42,0.18)]"
          >
            <ChatWindow ref={composerRef} chat={chat} titleId={titleId} onClose={close} />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.6 }}
        className={`fixed right-[calc(1rem+env(safe-area-inset-right))] bottom-[calc(1rem+env(safe-area-inset-bottom))] z-30 sm:right-[calc(1.5rem+env(safe-area-inset-right))] sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom))] ${
          isOpen && isMobile ? "hidden" : ""
        }`}
      >
        <button
          ref={launcherRef}
          type="button"
          onClick={() => {
            if (isOpen) {
              close();
            } else {
              setIsOpen(true);
              track("chat_open");
            }
          }}
          aria-label={launcherLabel}
          aria-expanded={isOpen}
          aria-controls={isOpen ? panelId : undefined}
          className={`relative flex h-14 w-14 items-center justify-center gap-2.5 rounded-full bg-gradient-to-br from-violet-600 to-blue-600 text-white shadow-[0_0_25px_rgba(124,58,237,0.45)] transition hover:scale-105 hover:shadow-[0_0_35px_rgba(124,58,237,0.6)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-400/50 ${
            isOpen ? "" : "lg:w-auto lg:pl-4 lg:pr-5"
          }`}
        >
          {isOpen ? (
            <X className="h-6 w-6" aria-hidden="true" />
          ) : (
            <>
              <MessageCircle className="h-6 w-6 shrink-0" aria-hidden="true" />
              <span className="hidden whitespace-nowrap text-sm font-semibold lg:inline">{t.chat.launcher.label}</span>
            </>
          )}
          {!isOpen && unread > 0 ? (
            <span
              aria-hidden="true"
              className="absolute -top-1 -right-1 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-[var(--background)] bg-pink-500 px-1.5 text-[11px] font-bold leading-none text-white"
            >
              {unread > 99 ? "99+" : unread}
            </span>
          ) : null}
        </button>
      </motion.div>
    </>
  );
}
