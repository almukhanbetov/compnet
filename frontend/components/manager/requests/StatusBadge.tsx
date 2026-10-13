"use client";

import { useLocale } from "@/components/providers/LocaleProvider";
import { legacyTone, statusTone } from "@/components/manager/requests/labels";

/** A request status with its label (earlier statuses get their own label). */
export default function StatusBadge({ status }: { status: string }) {
  const { t } = useLocale();
  const labels: Record<string, string> = t.manager.requests.statuses;
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusTone[status] ?? legacyTone}`}>
      {labels[status] ?? status}
    </span>
  );
}
