const timeFormat = new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" });
const dayFormat = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit" });
const fullFormat = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function parse(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "14:05" for today, "08.10" otherwise — for the inbox. */
export function formatListDate(iso: string | null | undefined): string {
  const date = parse(iso);
  if (!date) return "";
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
  return sameDay ? timeFormat.format(date) : dayFormat.format(date);
}

export function formatTime(iso: string | null | undefined): string {
  const date = parse(iso);
  return date ? timeFormat.format(date) : "";
}

export function formatFull(iso: string | null | undefined): string {
  const date = parse(iso);
  return date ? fullFormat.format(date) : "";
}

/** A readable label when the visitor left no name. */
export function visitorLabel(name: string, id: string): string {
  return name.trim() || `Посетитель ${id.slice(0, 4).toUpperCase()}`;
}

/** tel:/mailto: link for a contact the visitor left, if it looks like one. */
export function contactHref(contact: string): string | null {
  const value = contact.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return `mailto:${value}`;
  const digits = value.replace(/[^\d+]/g, "");
  if (/^\+?\d{7,15}$/.test(digits) && /^[\d\s()+-]+$/.test(value)) return `tel:${digits}`;
  return null;
}
