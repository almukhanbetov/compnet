/** Report periods in Asia/Almaty; the API takes inclusive YYYY-MM-DD dates. */

export const REPORT_TZ = "Asia/Almaty";

export type PeriodKey = "today" | "yesterday" | "d7" | "d30" | "month" | "custom";

/** Today's date in Asia/Almaty, YYYY-MM-DD. */
export function almatyToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: REPORT_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Calendar arithmetic on YYYY-MM-DD (no time zone involved). */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return t.toISOString().slice(0, 10);
}

export function presetRange(key: Exclude<PeriodKey, "custom">, now = new Date()): { from: string; to: string } {
  const today = almatyToday(now);
  switch (key) {
    case "today":
      return { from: today, to: today };
    case "yesterday": {
      const y = addDays(today, -1);
      return { from: y, to: y };
    }
    case "d7":
      return { from: addDays(today, -6), to: today };
    case "d30":
      return { from: addDays(today, -29), to: today };
    case "month":
      return { from: `${today.slice(0, 8)}01`, to: today };
  }
}

const dateTime = new Intl.DateTimeFormat("ru-RU", {
  timeZone: REPORT_TZ,
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});
const time = new Intl.DateTimeFormat("ru-RU", { timeZone: REPORT_TZ, hour: "2-digit", minute: "2-digit", second: "2-digit" });

/** "13.10, 14:05" in Asia/Almaty. */
export function formatAlmaty(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : dateTime.format(d);
}

export function formatAlmatyTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : time.format(d);
}

/** "13.10" from YYYY-MM-DD. */
export function shortDay(day: string): string {
  return `${day.slice(8, 10)}.${day.slice(5, 7)}`;
}
