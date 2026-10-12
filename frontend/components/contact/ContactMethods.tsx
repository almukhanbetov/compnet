"use client";

import { Phone, Mail, MessageCircle, Send, Clock, MapPin, type LucideIcon } from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";
import { useLocale } from "@/components/providers/LocaleProvider";
import { companyPhone, whatsappLink } from "@/data/contacts";
import type { ContactChannel, ContactChannelIcon } from "@/types/contactPage";

const channelIcons: Record<ContactChannelIcon, LucideIcon> = {
  Phone,
  Mail,
  MessageCircle,
  Send,
};

export default function ContactMethods() {
  const { t } = useLocale();
  const m = t.contactPage.methods;

  const contactChannels: ContactChannel[] = [
    { id: "phone", label: m.phone, value: companyPhone.display, href: companyPhone.href, icon: "Phone" },
    { id: "email", label: "Email", value: "hello@compnet.kz", href: "mailto:hello@compnet.kz", icon: "Mail" },
    { id: "whatsapp", label: "WhatsApp", value: m.whatsappValue, href: whatsappLink(), icon: "MessageCircle" },
    { id: "telegram", label: "Telegram", value: m.telegramValue, href: "#", icon: "Send", isPlaceholder: true },
  ];
  const workingHours = [
    { label: m.weekdays, value: "09:00–19:00 (GMT+5)" },
    { label: m.weekends, value: m.weekendsValue },
  ];

  return (
    <section className="border-y border-[var(--text-primary)]/5 bg-[var(--text-primary)]/[0.02] px-6 py-20 md:py-28">
      <div className="mx-auto max-w-[1440px]">
        <SectionHeading
          eyebrow={m.eyebrow}
          title={m.title}
          description={m.description}
        />

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {contactChannels.map((channel) => {
            const Icon = channelIcons[channel.icon];

            return (
              <a
                key={channel.id}
                href={channel.href}
                {...(channel.href.startsWith("https://") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="group flex flex-col items-start gap-3 rounded-2xl border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.03] p-6 backdrop-blur-xl transition hover:-translate-y-1 hover:border-cyan-400/30 hover:shadow-[0_0_30px_rgba(6,182,212,0.15)]"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600/30 to-cyan-400/20 text-cyan-300 light:text-cyan-700">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-slate-100 light:text-slate-900">
                    {channel.label}
                  </span>
                  <span className="mt-1 block text-sm text-slate-400 light:text-slate-600">
                    {channel.value}
                  </span>
                  {channel.isPlaceholder ? (
                    <span className="mt-1 block text-xs text-slate-500 light:text-slate-500">
                      {m.demoNote}
                    </span>
                  ) : null}
                </span>
              </a>
            );
          })}
        </div>

        <div className="mt-6 flex flex-col gap-6 rounded-2xl border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.03] p-6 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300 light:text-cyan-700" aria-hidden="true" />
            <div className="text-sm text-slate-300 light:text-slate-700">
              {workingHours.map((item) => (
                <p key={item.label}>
                  <span className="font-medium">{item.label}:</span> {item.value}
                </p>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-300 light:text-slate-700">
            <MapPin className="h-4 w-4 shrink-0 text-cyan-300 light:text-cyan-700" aria-hidden="true" />
            {t.homeContacts.city}
          </div>
        </div>
      </div>
    </section>
  );
}
