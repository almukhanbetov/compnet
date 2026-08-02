"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import LanguageSwitcher from "@/components/layout/LanguageSwitcher";
import MobileNav from "@/components/layout/MobileNav";
import ThemeToggle from "@/components/layout/ThemeToggle";
import { useLocale } from "@/components/providers/LocaleProvider";

export default function Header() {
  const { t } = useLocale();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

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
    <header className="sticky top-0 z-50 border-b border-[var(--text-primary)]/10 bg-[var(--background)]/80 shadow-[0_1px_0_0_rgba(124,58,237,0.15)] backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between gap-6 px-6">
        <Link href="/" className="shrink-0 text-lg font-bold tracking-tight">
          COMP
          <span className="bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent">
            NET
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-slate-400 light:text-slate-600 xl:flex">
          {links.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="relative py-1 transition hover:text-slate-100 light:hover:text-slate-900 after:absolute after:-bottom-1 after:left-0 after:h-px after:w-0 after:bg-gradient-to-r after:from-violet-400 after:to-cyan-300 after:transition-all after:duration-300 hover:after:w-full"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden md:block">
            <LanguageSwitcher />
          </div>

          <ThemeToggle />

          <Link
            href="/login"
            className="hidden rounded-xl border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 px-4 py-2.5 text-sm font-semibold text-slate-200 light:text-slate-800 transition hover:border-[var(--text-primary)]/25 hover:bg-[var(--text-primary)]/10 sm:inline-flex"
          >
            {t.header.actions.login}
          </Link>

          <Link
            href="/contact"
            className="hidden rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(124,58,237,0.35)] transition hover:scale-105 hover:shadow-[0_0_28px_rgba(124,58,237,0.5)] sm:inline-flex"
          >
            {t.header.actions.discuss}
          </Link>

          <button
            type="button"
            aria-label={isMobileNavOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMobileNavOpen}
            onClick={() => setIsMobileNavOpen((prev) => !prev)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 text-slate-200 light:text-slate-800 transition hover:bg-[var(--text-primary)]/10 xl:hidden"
          >
            {isMobileNavOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      <MobileNav
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
      />
    </header>
  );
}
