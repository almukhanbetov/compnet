import type { ReactNode } from "react";

interface FieldWrapperProps {
  label: string;
  htmlFor: string;
  error?: string;
  children: ReactNode;
}

export default function FieldWrapper({
  label,
  htmlFor,
  error,
  children,
}: FieldWrapperProps) {
  return (
    <div>
      <label htmlFor={htmlFor} className="text-sm font-medium text-slate-300 light:text-slate-700">
        {label}
      </label>
      <div className="mt-2">{children}</div>
      {error ? <p className="mt-1.5 text-xs text-rose-400">{error}</p> : null}
    </div>
  );
}
