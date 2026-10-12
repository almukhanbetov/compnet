import Link from "next/link";
import CookieSettingsButton from "@/components/analytics/CookieSettingsButton";
import { Mail, Phone, MapPin } from "lucide-react";
import { companyPhone } from "@/data/contacts";
import { getServerTranslations } from "@/lib/i18n.server";

export default async function Footer() {
  const t = await getServerTranslations();
  const f = t.common.footer;
  const footerColumns = [
    {
      title: f.company,
      links: [
        { label: f.links.services, href: "/services" },
        { label: f.links.solutions, href: "/solutions" },
        { label: f.links.about, href: "/about" },
        { label: f.links.portfolio, href: "/portfolio" },
      ],
    },
    {
      title: f.clients,
      links: [
        { label: f.links.pricing, href: "/pricing" },
        { label: f.links.calculator, href: "/calculator" },
        { label: f.links.reviews, href: "/reviews" },
        { label: f.links.contacts, href: "/contact" },
        { label: f.links.login, href: "/login" },
      ],
    },
    {
      title: f.legal,
      links: [
        { label: f.links.terms, href: "/terms" },
        { label: f.links.privacy, href: "/privacy" },
        { label: f.links.cookies, href: "/cookies" },
      ],
    },
  ];

  return (
    <footer className="border-t border-[var(--text-primary)]/10 bg-[#05070f] px-6 py-16 light:bg-slate-50">
      <div className="mx-auto max-w-[1440px]">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:grid-cols-4">
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <Link href="/" className="text-lg font-bold tracking-tight">
              COMP
              <span className="bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent">
                NET
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-6 text-slate-400 light:text-slate-600">
              {f.tagline}
            </p>
          </div>

          {footerColumns.map((column) => (
            <div key={column.title}>
              <p className="text-sm font-semibold text-slate-100 light:text-slate-900">
                {column.title}
              </p>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="inline-block -my-1.5 py-1.5 text-sm text-slate-400 light:text-slate-600 transition hover:text-cyan-300 light:text-cyan-700"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
                {column.title === f.legal ? (
                  <li>
                    <CookieSettingsButton className="inline-block -my-1.5 py-1.5 text-left text-sm text-slate-400 transition hover:text-cyan-300 light:text-slate-600 light:hover:text-cyan-700" />
                  </li>
                ) : null}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-6 border-t border-[var(--text-primary)]/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500 light:text-slate-600">
            © 2026 COMPNET.
          </p>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500 light:text-slate-600">
            <span className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-cyan-300 light:text-cyan-700" aria-hidden="true" />
              hello@compnet.kz
            </span>
            <a
              href={companyPhone.href}
              className="flex items-center gap-2 py-1 transition hover:text-cyan-300 light:hover:text-cyan-700"
            >
              <Phone className="h-4 w-4 text-cyan-300 light:text-cyan-700" aria-hidden="true" />
              {companyPhone.display}
            </a>
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-cyan-300 light:text-cyan-700" aria-hidden="true" />
              {t.homeContacts.city}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
