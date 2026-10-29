import Image from "next/image";
import Link from "next/link";
import {
  AppWindow,
  ArrowRight,
  Globe,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShoppingCart,
  Smartphone,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";
import PageHeroVisual from "@/components/ui/PageHeroVisual";
import { heroVisuals } from "@/data/heroVisuals";
import { DEVOPS_PATH } from "@/data/devops";
import { aboutDirectionIds, type AboutDirectionId, type AboutTranslations } from "@/data/i18n/about";
import { companyEmail, companyPhone, whatsappLink } from "@/data/contacts";

/** One card in "Examples of our work"; built from the portfolio API by the page. */
export interface AboutWorkExample {
  title: string;
  summary: string;
  imageSrc: string;
  imageAlt: string;
  href: string;
}

interface AboutPageProps {
  t: AboutTranslations;
  /** "Almaty, Kazakhstan" from the shared contact texts. */
  city: string;
  examples: AboutWorkExample[];
  /** What the hero image shows, in the page's language. */
  heroVisualAlt: string;
}

const directionIcons: Record<AboutDirectionId, LucideIcon> = {
  websites: Globe,
  stores: ShoppingCart,
  webServices: AppWindow,
  mobile: Smartphone,
  crm: Users,
  automation: Workflow,
};

const SCREENSHOT_SIZE = { width: 1440, height: 900 };

const cardClass =
  "rounded-2xl border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.03] p-7 backdrop-blur-xl";
const iconClass =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600/30 to-cyan-400/20 text-cyan-300 light:text-cyan-700";
const primaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-6 py-3.5 font-semibold text-white shadow-[0_0_24px_rgba(124,58,237,0.35)] transition hover:scale-105 hover:shadow-[0_0_32px_rgba(124,58,237,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60";
const secondaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 px-6 py-3.5 font-semibold transition hover:bg-[var(--text-primary)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60";
const crumbClass = "inline-block -my-1.5 py-1.5 transition hover:text-cyan-300 light:hover:text-cyan-700";

export default function AboutPage({ t, city, examples, heroVisualAlt }: AboutPageProps) {
  const facts = [
    { label: t.facts.company, value: "Complex Services" },
    { label: t.facts.brand, value: "COMPNET" },
    { label: t.facts.city, value: city },
    { label: t.facts.clients, value: t.facts.clientsValue },
    { label: t.facts.site, value: "compnet.kz" },
  ];
  const contacts = [
    { icon: Phone, label: t.contacts.phone, value: companyPhone.display, href: companyPhone.href },
    { icon: MessageCircle, label: t.contacts.whatsapp, value: t.contacts.whatsappValue, href: whatsappLink() },
    { icon: Mail, label: t.contacts.email, value: companyEmail.display, href: companyEmail.href },
  ];

  return (
    <main className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-violet-600/20 blur-[100px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 top-10 h-80 w-80 rounded-full bg-cyan-400/15 blur-[100px]"
      />

      {/* Who we are */}
      <PageHeroVisual
        before={
            <nav aria-label={t.breadcrumb.label} className="text-sm text-slate-400 light:text-slate-600">
              <ol className="flex flex-wrap items-center gap-2">
                <li>
                  <Link href="/" className={crumbClass}>
                    {t.breadcrumb.home}
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li aria-current="page" className="text-slate-300 light:text-slate-700">
                  {t.breadcrumb.current}
                </li>
              </ol>
            </nav>
        }
        badge={t.hero.badge}
        title={t.hero.title}
        titleClassName="mt-6 text-4xl font-bold leading-tight md:text-5xl"
        description={t.hero.intro}
        image={heroVisuals.about}
        alt={heroVisualAlt}
        primaryCTA={{ label: t.hero.discuss, href: "/contact", icon: <ArrowRight className="h-4 w-4" aria-hidden="true" /> }}
        secondaryCTA={{ label: t.hero.works, href: "#works" }}
      />

      {/* Company facts, under the hero */}
      <section className="relative px-6 pb-16 md:pb-20">
        <div className="mx-auto max-w-[1280px] rounded-[28px] border border-[var(--text-primary)]/10 bg-gradient-to-br from-violet-700/20 via-blue-700/10 to-cyan-500/10 p-7 backdrop-blur-xl md:p-8 lg:grid lg:grid-cols-2 lg:gap-14">
          <div>
            <h2 className="text-lg font-semibold text-slate-100 light:text-slate-900">{t.facts.title}</h2>
            <dl className="mt-5 divide-y divide-[var(--text-primary)]/10">
              {facts.map((fact) => (
                // 640–1023px: label | value columns, so values stay clear of the
                // chat launcher in the bottom-right corner of tablet screens.
                <div key={fact.label} className="flex items-baseline justify-between gap-4 py-3 sm:justify-start lg:justify-between">
                  <dt className="text-sm text-slate-400 sm:w-40 sm:shrink-0 lg:w-auto light:text-slate-600">{fact.label}</dt>
                  <dd className="text-right font-semibold text-slate-100 sm:text-left lg:text-right light:text-slate-900">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div>
            <h3 className="mt-6 text-sm font-semibold text-slate-300 lg:mt-0 light:text-slate-700">{t.scope.title}</h3>
            <ul className="mt-3 flex flex-wrap gap-2">
              {t.scope.items.map((item) => (
                <li
                  key={item}
                  className="rounded-full border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/5 px-3 py-1.5 text-sm text-slate-200 light:text-slate-800"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Directions */}
      <section className="relative border-y border-[var(--text-primary)]/5 bg-[var(--text-primary)]/[0.02] px-6 py-16 md:py-20">
        <div className="mx-auto max-w-[1280px]">
          <SectionHeading
            align="left"
            eyebrow={t.directions.eyebrow}
            title={t.directions.title}
            description={t.directions.description}
          />
          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {aboutDirectionIds.map((id) => {
              const Icon = directionIcons[id];
              const item = t.directions.items[id];
              return (
                <li key={id} className={cardClass}>
                  <span className={iconClass}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 font-semibold text-slate-100 light:text-slate-900">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400 light:text-slate-600">{item.description}</p>
                  {id === "websites" ? (
                    <Link
                      href="/services/website-development"
                      className="mt-3 inline-flex min-h-11 items-center gap-2 py-2 text-sm font-semibold text-cyan-300 transition hover:text-cyan-200 light:text-cyan-700 light:hover:text-cyan-800"
                    >
                      {t.directions.websitesLink}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* How we work */}
      <section className="relative px-6 py-16 md:py-20">
        <div className="mx-auto max-w-[1280px]">
          <SectionHeading align="left" eyebrow={t.process.eyebrow} title={t.process.title} />
          <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {t.process.items.map((step, index) => (
              <li key={step.title} className={cardClass}>
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--text-primary)]/10 bg-[var(--surface)] text-sm font-semibold text-cyan-300 light:text-cyan-700">
                  {index + 1}
                </span>
                <h3 className="mt-4 font-semibold text-slate-100 light:text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400 light:text-slate-600">{step.description}</p>
              </li>
            ))}
          </ol>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-6 py-4 light:border-cyan-600/30 light:bg-cyan-500/10">
            <p className="text-sm leading-6 text-slate-200 light:text-slate-800">{t.process.delivery}</p>
            <Link
              href={DEVOPS_PATH}
              className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-cyan-300 transition hover:text-cyan-200 light:text-cyan-700 light:hover:text-cyan-800"
            >
              {t.process.deliveryLink}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* Examples of our work */}
      <section
        id="works"
        className="relative scroll-mt-24 border-y border-[var(--text-primary)]/5 bg-[var(--text-primary)]/[0.02] px-6 py-16 md:py-20"
      >
        <div className="mx-auto max-w-[1280px]">
          <SectionHeading align="left" eyebrow={t.works.eyebrow} title={t.works.title} description={t.works.description} />
          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {examples.map((work) => (
              <li key={work.href}>
                <Link
                  href={work.href}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.03] backdrop-blur-xl transition hover:-translate-y-1 hover:border-violet-400/30 hover:shadow-[0_0_30px_rgba(124,58,237,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
                >
                  <Image
                    src={work.imageSrc}
                    width={SCREENSHOT_SIZE.width}
                    height={SCREENSHOT_SIZE.height}
                    alt={work.imageAlt}
                    sizes="(min-width: 1280px) 400px, (min-width: 1024px) 31vw, (min-width: 640px) 48vw, 100vw"
                    className="h-auto w-full border-b border-[var(--text-primary)]/10"
                  />
                  <div className="flex flex-1 flex-col p-6">
                    <h3 className="font-semibold leading-snug text-slate-100 light:text-slate-900">{work.title}</h3>
                    <p className="mt-2 flex-1 text-sm leading-6 text-slate-400 light:text-slate-600">{work.summary}</p>
                    <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 light:text-cyan-700">
                      {t.works.caseLink}
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <Link href="/portfolio" className={secondaryButtonClass}>
              {t.works.allWorks}
            </Link>
          </div>
        </div>
      </section>

      {/* Contacts */}
      <section className="relative px-6 py-16 md:py-20">
        <div className="mx-auto max-w-[1280px] rounded-[28px] border border-[var(--text-primary)]/10 bg-gradient-to-br from-violet-700/30 via-blue-700/25 to-cyan-500/20 p-8 backdrop-blur-xl md:p-10">
          <SectionHeading
            align="left"
            eyebrow={t.contacts.eyebrow}
            title={t.contacts.title}
            description={t.contacts.description}
          />
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {contacts.map((contact) => (
              <li key={contact.label}>
                <a
                  href={contact.href}
                  {...(contact.href.startsWith("https://") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="flex h-full items-center gap-3 rounded-2xl border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/5 p-4 transition hover:bg-[var(--text-primary)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
                >
                  <span className={iconClass}>
                    <contact.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs text-slate-400 light:text-slate-600">{contact.label}</span>
                    <span className="block truncate font-semibold text-slate-100 light:text-slate-900">{contact.value}</span>
                  </span>
                </a>
              </li>
            ))}
            <li className="flex items-center gap-3 rounded-2xl border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/5 p-4">
              <span className={iconClass}>
                <MapPin className="h-5 w-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-xs text-slate-400 light:text-slate-600">{t.contacts.city}</span>
                <span className="block font-semibold text-slate-100 light:text-slate-900">{city}</span>
              </span>
            </li>
          </ul>
          <div className="mt-8">
            <Link href="/contact" className={primaryButtonClass}>
              {t.contacts.discuss}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
