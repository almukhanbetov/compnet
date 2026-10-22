/**
 * UTM values are free text from a URL anyone can build or share, so a link
 * may carry an email, a phone number or an ID. Values that look like
 * personal data are dropped before the tracker keeps or sends them. Same
 * rules as the server, which checks again
 * (backend/internal/service/analytics/personal.go).
 */

const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]{2,}/;
const DIGIT_RUN = /\+?\d[\d\s().-]*\d/g;

/** Email, web address, phone (KZ/RU, or any "+" number), Kazakh IIN or card number. */
export function looksPersonal(value: string): boolean {
  const v = value.toLowerCase();
  if (EMAIL.test(v) || v.includes("://") || v.startsWith("www.")) return true;
  for (const run of v.match(DIGIT_RUN) ?? []) {
    const digits = run.replace(/\D/g, "");
    const n = digits.length;
    const formatted = /[ ().-]/.test(run);
    if (run.startsWith("+") && n >= 10) return true;
    if (formatted && n === 11 && (digits[0] === "7" || digits[0] === "8")) return true;
    if (formatted && n === 10 && digits[0] === "7") return true;
    if (!formatted && n === 11 && "78".includes(digits[0]) && "79".includes(digits[1])) return true;
    if (!formatted && n === 12 && validIin(digits)) return true;
    if (!formatted && n === 16 && luhn(digits)) return true;
  }
  return false;
}

function validIin(d: string): boolean {
  const month = Number(d.slice(2, 4));
  const day = Number(d.slice(4, 6));
  if (month < 1 || month > 12 || day < 1 || day > 31 || d[6] < "1" || d[6] > "6") return false;
  const check = (weights: number[]) => weights.reduce((sum, w, i) => sum + Number(d[i]) * w, 0) % 11;
  let c = check([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  if (c === 10) c = check([3, 4, 5, 6, 7, 8, 9, 10, 11, 1, 2]);
  return c !== 10 && c === Number(d[11]);
}

function luhn(d: string): boolean {
  let sum = 0;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = Number(d[i]);
    if ((d.length - 1 - i) % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return sum % 10 === 0;
}
