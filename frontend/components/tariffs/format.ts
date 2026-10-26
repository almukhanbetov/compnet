/** "49 000 ₸", formatted like every other price on the site. */
export function tenge(amount: number): string {
  return `${amount.toLocaleString("ru-RU")} ₸`;
}

const almatyDate = new Intl.DateTimeFormat("ru-RU", { timeZone: "Asia/Almaty", day: "2-digit", month: "2-digit", year: "numeric" });

/** "30.11.2026" in Asia/Almaty. */
export function promoDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : almatyDate.format(d);
}
