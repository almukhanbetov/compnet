"use client";

import { ChevronDown } from "lucide-react";

const fieldClass =
  "w-full rounded-xl border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-slate-500 transition outline-none focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20";

const errorFieldClass =
  "border-rose-400/60 focus:border-rose-400/60 focus:ring-rose-400/20";

interface SelectFieldProps<T extends string> {
  id: string;
  value: T;
  onChange: (value: T) => void;
  options: readonly T[];
  placeholder?: string;
  hasError?: boolean;
}

export default function SelectField<T extends string>({
  id,
  value,
  onChange,
  options,
  placeholder,
  hasError = false,
}: SelectFieldProps<T>) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className={`${fieldClass} appearance-none pr-10 ${
          hasError ? errorFieldClass : ""
        }`}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 light:text-slate-500"
        aria-hidden="true"
      />
    </div>
  );
}

export { fieldClass, errorFieldClass };
