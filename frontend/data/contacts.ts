/** Primary company phone: shown in the header, contacts, mobile menu and footer. */
export const companyPhone = {
  display: "+7 (707) 780-10-11",
  href: "tel:+77077801011",
} as const;

const WHATSAPP_NUMBER = "77077801011";

/** wa.me link, optionally with a pre-filled message (URL-encoded). */
export function whatsappLink(message?: string): string {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/** Public company email (the same address the footer and /contact show). */
export const companyEmail = {
  display: "hello@compnet.kz",
  href: "mailto:hello@compnet.kz",
} as const;
