"use client";

import { useEffect } from "react";
import Link from "next/link";
import { MessageCircle, Phone } from "lucide-react";
import { companyPhone, whatsappLink } from "@/data/contacts";
import { TRAINING_PATH } from "@/data/training";
import { localeOptions } from "@/data/translations";
import { useLocale } from "@/components/providers/LocaleProvider";
import ThemeToggle from "@/components/layout/ThemeToggle";

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const { t, locale, setLocale } = useLocale();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = overflow;
    };
  }, [isOpen]);

  const links: Array<{ href: string; label: string }> = [
    { href: "/services", label: t.header.nav.services },
    { href: "/solutions", label: t.header.nav.solutions },
    { href: "/pricing", label: t.header.nav.pricing },
    { href: "/calculator", label: t.header.nav.calculator },
    { href: "/portfolio", label: t.header.nav.portfolio },
    { href: "/about", label: t.header.nav.about },
    { href: "/contact", label: t.header.nav.contacts },
  ];

  return (
    <div
      className={`fixed inset-x-0 top-[72px] z-40 origin-top overflow-y-auto border-b border-[var(--text-primary)]/10 bg-[var(--background)]/95 backdrop-blur-xl transition-all duration-300 xl:hidden ${
        isOpen
          ? "pointer-events-auto h-[calc(100vh-72px)] opacity-100"
          : "pointer-events-none h-0 opacity-0"
      }`}
    >
      <nav className="flex flex-col gap-1 px-6 py-6">
        {links.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            onClick={onClose}
            className="rounded-xl px-4 py-3 text-base text-slate-300 light:text-slate-700 transition hover:bg-[var(--text-primary)]/5 hover:text-slate-100 light:hover:text-slate-900"
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="flex flex-col gap-3 border-t border-[var(--text-primary)]/10 px-6 py-6">
        <div className="flex items-center justify-between gap-4">
          <span id="mobile-language-label" className="text-sm text-slate-400 light:text-slate-600">
            {t.header.mobile.language}
          </span>
          <div
            role="group"
            aria-labelledby="mobile-language-label"
            className="inline-flex rounded-xl border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 p-1"
          >
            {localeOptions.map((option) => {
              const active = option.value === locale;
              return (
                <button
                  key={option.value}
                  type="button"
                  lang={option.value}
                  aria-pressed={active}
                  aria-label={option.label}
                  onClick={() => setLocale(option.value)}
                  className={`min-h-10 min-w-12 rounded-lg px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 ${
                    active
                      ? "bg-gradient-to-r from-violet-600 to-blue-600 text-white"
                      : "text-slate-300 hover:bg-[var(--text-primary)]/10 light:text-slate-700"
                  }`}
                >
                  {option.shortLabel}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-400 light:text-slate-600">{t.header.mobile.theme}</span>
          <ThemeToggle />
        </div>

        <a
          href={companyPhone.href}
          aria-label={`${t.header.actions.call}: ${companyPhone.display}`}
          className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-5 py-3 text-base font-semibold text-slate-100 light:border-cyan-600/30 light:text-slate-900 transition hover:bg-cyan-400/15"
        >
          <Phone className="h-4 w-4 text-cyan-300 light:text-cyan-700" aria-hidden="true" />
          {companyPhone.display}
        </a>
        <a
          href={whatsappLink()}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 px-5 py-3 text-sm font-semibold text-slate-200 light:text-slate-800 transition hover:bg-[var(--text-primary)]/10"
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          {t.header.actions.whatsapp}
          <span className="sr-only">{t.header.actions.opensInNewTab}</span>
        </a>

        <Link
          href="/login"
          onClick={onClose}
          className="rounded-xl border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 px-5 py-3 text-center text-sm font-semibold text-slate-200 light:text-slate-800 transition hover:bg-[var(--text-primary)]/10"
        >
          {t.header.actions.login}
        </Link>
        <Link
          href={TRAINING_PATH}
          onClick={onClose}
          className="rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-5 py-3 text-center text-sm font-semibold text-white transition hover:scale-[1.02]"
        >
          {t.header.actions.training}
        </Link>
      </div>
    </div>
  );
}
