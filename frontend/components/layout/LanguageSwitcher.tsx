"use client";

import { useState } from "react";
import { Globe, ChevronDown } from "lucide-react";
import { localeOptions } from "@/data/translations";
import { useLocale } from "@/components/providers/LocaleProvider";

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();
  const [isOpen, setIsOpen] = useState(false);

  const active = localeOptions.find((option) => option.value === locale);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        onBlur={() => setIsOpen(false)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="flex items-center gap-2 rounded-xl border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 px-3 py-2 text-sm font-medium text-slate-300 light:text-slate-700 transition hover:bg-[var(--text-primary)]/10"
      >
        <Globe className="h-4 w-4 text-cyan-300 light:text-cyan-700" />
        {active?.shortLabel}
        <ChevronDown className="h-3.5 w-3.5 text-slate-400 light:text-slate-600" />
      </button>

      {isOpen ? (
        <ul
          role="listbox"
          className="absolute right-0 top-full z-20 mt-2 w-40 overflow-hidden rounded-xl border border-[var(--text-primary)]/10 bg-[var(--surface)] shadow-xl"
        >
          {localeOptions.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                role="option"
                aria-selected={option.value === locale}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setLocale(option.value);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition hover:bg-[var(--text-primary)]/10 ${
                  option.value === locale
                    ? "text-cyan-300 light:text-cyan-700"
                    : "text-slate-300 light:text-slate-700"
                }`}
              >
                {option.label}
                <span className="text-xs text-slate-500 light:text-slate-600">
                  {option.shortLabel}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
