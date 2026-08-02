import Link from "next/link";
import { Mail, Phone, MapPin } from "lucide-react";

interface FooterLink {
  label: string;
  href: string;
}

interface FooterColumn {
  title: string;
  links: FooterLink[];
}

const footerColumns: FooterColumn[] = [
  {
    title: "Компания",
    links: [
      { label: "Услуги", href: "/services" },
      { label: "Решения", href: "/solutions" },
      { label: "О компании", href: "/about" },
      { label: "Портфолио", href: "/portfolio" },
    ],
  },
  {
    title: "Клиентам",
    links: [
      { label: "Цены", href: "/pricing" },
      { label: "Калькулятор", href: "/calculator" },
      { label: "Отзывы", href: "/reviews" },
      { label: "Контакты", href: "/contact" },
      { label: "Войти", href: "/login" },
    ],
  },
  {
    title: "Правовая информация",
    links: [
      { label: "Условия использования", href: "/terms" },
      { label: "Конфиденциальность", href: "/privacy" },
      { label: "Cookie", href: "/cookies" },
    ],
  },
];

export default function Footer() {
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
              IT-студия полного цикла: создаём сайты, web- и мобильные
              приложения, CRM и AI-решения для бизнеса.
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
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-6 border-t border-[var(--text-primary)]/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500 light:text-slate-600">
            © 2026 COMPNET. Визуальный прототип, все данные демонстрационные.
          </p>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500 light:text-slate-600">
            <span className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-cyan-300 light:text-cyan-700" aria-hidden="true" />
              hello@compnet.kz
            </span>
            <span className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-cyan-300 light:text-cyan-700" aria-hidden="true" />
              +7 (700) 000-00-00
            </span>
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-cyan-300 light:text-cyan-700" aria-hidden="true" />
              Алматы, Казахстан
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
