import type { ReactNode } from "react";

interface FieldWrapperProps {
  label: string;
  htmlFor: string;
  error?: string;
  children: ReactNode;
}

/** Id of the error text rendered under the field with this id. */
export function fieldErrorId(fieldId: string): string {
  return `${fieldId}-error`;
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
      {/* The field points at this id with aria-describedby (see fieldErrorId). */}
      {error ? (
        <p id={fieldErrorId(htmlFor)} className="mt-1.5 text-xs text-rose-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
