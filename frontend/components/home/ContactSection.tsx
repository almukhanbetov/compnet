import Link from "next/link";
import { Mail, Phone, MapPin, ArrowRight } from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";

export default function ContactSection() {
  return (
    <section className="px-6 py-20 md:py-28">
      <div className="mx-auto max-w-[1440px]">
        <div className="flex flex-col items-center justify-between gap-10 rounded-[32px] border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.03] p-10 backdrop-blur-xl md:flex-row md:p-14">
          <SectionHeading
            align="left"
            eyebrow="Контакты"
            title="Свяжитесь с нами"
            description="Почта, телефон и офис в Алматы — выберите удобный способ связи, ответим в течение рабочего дня."
          />

          <div className="flex w-full flex-col gap-6 md:w-auto md:items-end">
            <div className="flex flex-col gap-3 text-sm text-slate-400 light:text-slate-600">
              <span className="flex items-center gap-2 md:justify-end">
                <Mail className="h-4 w-4 text-cyan-300 light:text-cyan-700" aria-hidden="true" />
                hello@compnet.kz
              </span>
              <span className="flex items-center gap-2 md:justify-end">
                <Phone className="h-4 w-4 text-cyan-300 light:text-cyan-700" aria-hidden="true" />
                +7 (700) 000-00-00
              </span>
              <span className="flex items-center gap-2 md:justify-end">
                <MapPin className="h-4 w-4 text-cyan-300 light:text-cyan-700" aria-hidden="true" />
                Алматы, Казахстан
              </span>
            </div>

            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-6 py-3.5 font-semibold text-white shadow-[0_0_24px_rgba(124,58,237,0.35)] transition hover:scale-105 hover:shadow-[0_0_32px_rgba(124,58,237,0.5)]"
            >
              Обсудить проект
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
