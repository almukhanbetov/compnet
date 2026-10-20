import {
  BatteryFull,
  Bell,
  CalendarDays,
  House,
  ListChecks,
  Plug,
  Signal,
  Store,
  UserRound,
  Wifi,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import type { MobileAppDevelopmentTranslations } from "@/data/i18n/mobileAppDevelopment";

interface MobileAppMockupsProps {
  t: MobileAppDevelopmentTranslations["hero"]["visual"];
}

/* Every size inside is in em, so the whole composition scales with the
 * container's font-size (10px on phones, 13px from sm, 12px in the narrower lg column). */
const frameClass =
  "absolute rounded-[2.2em] border border-white/10 bg-slate-900 p-[0.45em] shadow-2xl shadow-violet-950/50 light:border-slate-300 light:bg-slate-800 light:shadow-slate-400/40";
const screenClass = "relative flex flex-col overflow-hidden rounded-[1.8em] bg-[var(--surface)]";
const statusBarClass =
  "flex items-center justify-between px-[1.3em] pt-[0.9em] text-[0.85em] font-semibold text-slate-300 light:text-slate-700";
const cardClass = "rounded-[1em] border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.04]";
const strongTextClass = "font-semibold text-slate-100 light:text-slate-900";
const mutedTextClass = "text-slate-400 light:text-slate-600";
const accentIconClass = "text-cyan-300 light:text-cyan-700";

const demoDays = ["14", "15", "16", "17", "18"];
const demoSlots = ["10:00", "12:30", "15:00", "17:30"];

/** Demo Android and iOS screens drawn with CSS. They illustrate typical app
 * features (push, orders, booking, offline mode) and are not client products. */
export default function MobileAppMockups({ t }: MobileAppMockupsProps) {
  return (
    <figure className="mx-auto w-full max-w-[33em] text-[10px] sm:text-[13px] lg:mx-0 lg:text-[12px] xl:text-[13px] lg:ml-auto">
      <div aria-hidden="true" className="relative h-[36em] w-full select-none">
        <div className="pointer-events-none absolute inset-x-[10%] top-[15%] h-[60%] rounded-full bg-gradient-to-br from-violet-600/30 to-cyan-400/20 blur-[60px]" />

        {/* Android */}
        <div className={`${frameClass} left-[1.2em] top-[3em] w-[15em] -rotate-[4deg]`}>
          <div className={`${screenClass} h-[30em]`}>
            <div className={statusBarClass}>
              <span>12:00</span>
              <span className="absolute left-1/2 top-[0.8em] h-[0.9em] w-[0.9em] -translate-x-1/2 rounded-full bg-slate-950 ring-1 ring-white/10" />
              <span className="flex items-center gap-[0.3em]">
                <Signal className="h-[1em] w-[1em]" />
                <BatteryFull className="h-[1.1em] w-[1.1em]" />
              </span>
            </div>

            <div className="flex flex-1 flex-col gap-[0.9em] px-[1em] pt-[1.2em]">
              <div className="flex items-center justify-between gap-[0.5em]">
                <p className={`min-w-0 truncate text-[1.3em] ${strongTextClass}`}>{t.android.title}</p>
                <span className="h-[2.2em] w-[2.2em] shrink-0 rounded-full bg-gradient-to-br from-violet-600/60 to-cyan-400/50" />
              </div>

              <div className="flex gap-[0.7em] rounded-[1em] border border-cyan-400/25 bg-cyan-400/10 p-[0.8em] light:border-cyan-600/30 light:bg-cyan-500/10">
                <span className="flex h-[2.4em] w-[2.4em] shrink-0 items-center justify-center rounded-[0.7em] bg-gradient-to-br from-violet-600 to-blue-600 text-white">
                  <Bell className="h-[1.2em] w-[1.2em]" />
                </span>
                <span className="min-w-0">
                  <span className={`block text-[0.95em] leading-tight ${strongTextClass}`}>{t.android.pushTitle}</span>
                  <span className={`mt-[0.2em] block text-[0.85em] leading-tight ${mutedTextClass}`}>
                    {t.android.pushText}
                  </span>
                </span>
              </div>

              {t.android.orders.map((order, index) => (
                <div key={order.name} className={`${cardClass} p-[0.8em]`}>
                  <div className="flex items-center justify-between gap-[0.5em]">
                    <span className={`truncate text-[0.95em] ${strongTextClass}`}>{order.name}</span>
                    <span
                      className={`shrink-0 rounded-full px-[0.7em] py-[0.2em] text-[0.75em] font-semibold ${
                        index === 0
                          ? "bg-violet-500/20 text-violet-200 light:text-violet-700"
                          : "bg-emerald-500/15 text-emerald-300 light:text-emerald-700"
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                  <div className="mt-[0.7em] h-[0.4em] w-3/4 rounded-full bg-[var(--text-primary)]/10" />
                  <div className="mt-[0.4em] h-[0.4em] w-1/2 rounded-full bg-[var(--text-primary)]/10" />
                </div>
              ))}
            </div>

            <div className="mt-auto border-t border-[var(--text-primary)]/10 px-[1.5em] pb-[0.6em] pt-[0.8em]">
              <div className="flex items-center justify-between">
                <House className={`h-[1.4em] w-[1.4em] ${accentIconClass}`} />
                <ListChecks className={`h-[1.4em] w-[1.4em] ${mutedTextClass}`} />
                <UserRound className={`h-[1.4em] w-[1.4em] ${mutedTextClass}`} />
              </div>
              <div className="mx-auto mt-[0.7em] h-[0.3em] w-[5em] rounded-full bg-[var(--text-primary)]/25" />
            </div>
          </div>
        </div>

        {/* iOS */}
        <div className={`${frameClass} right-[1.2em] top-0 z-10 w-[15.5em] rotate-[3deg]`}>
          <div className={`${screenClass} h-[31em]`}>
            <div className={statusBarClass}>
              <span>9:41</span>
              <span className="absolute left-1/2 top-[0.6em] h-[1.6em] w-[5.5em] -translate-x-1/2 rounded-full bg-slate-950" />
              <span className="flex items-center gap-[0.3em]">
                <Wifi className="h-[1em] w-[1em]" />
                <BatteryFull className="h-[1.1em] w-[1.1em]" />
              </span>
            </div>

            <div className="flex flex-1 flex-col px-[1.1em] pt-[1.6em]">
              <p className={`text-[0.8em] ${mutedTextClass}`}>{t.ios.subtitle}</p>
              <p className={`mt-[0.1em] text-[1.4em] leading-tight ${strongTextClass}`}>{t.ios.title}</p>

              <div className="mt-[1em] flex items-center gap-[0.4em]">
                <CalendarDays className={`h-[1.1em] w-[1.1em] shrink-0 ${accentIconClass}`} />
                <div className="grid flex-1 grid-cols-5 gap-[0.35em]">
                  {demoDays.map((day, index) => (
                    <span
                      key={day}
                      className={`rounded-[0.6em] py-[0.5em] text-center text-[0.9em] font-semibold ${
                        index === 1
                          ? "bg-gradient-to-br from-violet-600 to-blue-600 text-white"
                          : "bg-[var(--text-primary)]/[0.06] text-slate-300 light:text-slate-700"
                      }`}
                    >
                      {day}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-[1em] grid grid-cols-2 gap-[0.5em]">
                {demoSlots.map((slot, index) => (
                  <span
                    key={slot}
                    className={`rounded-[0.8em] border py-[0.6em] text-center text-[0.95em] font-semibold ${
                      index === 2
                        ? "border-cyan-400/50 bg-cyan-400/15 text-cyan-200 light:border-cyan-600/50 light:text-cyan-800"
                        : "border-[var(--text-primary)]/10 text-slate-300 light:text-slate-700"
                    }`}
                  >
                    {slot}
                  </span>
                ))}
              </div>

              <div className={`${cardClass} mt-[1em] flex items-center gap-[0.6em] p-[0.8em]`}>
                <WifiOff className={`h-[1.2em] w-[1.2em] shrink-0 ${accentIconClass}`} />
                <span className={`text-[0.85em] leading-tight ${mutedTextClass}`}>{t.ios.offline}</span>
              </div>

              <span className="mt-auto rounded-[1em] bg-gradient-to-r from-violet-600 to-blue-600 py-[0.8em] text-center text-[0.95em] font-semibold text-white">
                {t.ios.button}
              </span>
              <span className="mx-auto mb-[0.6em] mt-[0.9em] h-[0.35em] w-[7em] rounded-full bg-[var(--text-primary)]/30" />
            </div>
          </div>
        </div>

        <FloatingChip className="left-0 top-0" icon={Bell} label={t.chips.push} />
        <FloatingChip className="bottom-[1em] left-[0.5em]" icon={Plug} label={t.chips.api} />
        <FloatingChip className="bottom-0 right-[0.5em]" icon={Store} label={t.chips.stores} />
      </div>

      <figcaption className="mt-[1.2em] flex items-start justify-center gap-2 text-center text-xs leading-5 text-slate-500 light:text-slate-600">
        <span className="shrink-0 rounded-full border border-[var(--text-primary)]/15 px-2 font-semibold uppercase tracking-wide">
          {t.demoBadge}
        </span>
        <span>{t.caption}</span>
      </figcaption>
    </figure>
  );
}

interface FloatingChipProps {
  className: string;
  icon: LucideIcon;
  label: string;
}

function FloatingChip({ className, icon: Icon, label }: FloatingChipProps) {
  return (
    <div
      className={`absolute z-20 hidden items-center gap-[0.6em] rounded-[1.1em] border border-[var(--text-primary)]/10 bg-[var(--surface)]/90 py-[0.6em] pl-[0.6em] pr-[1em] shadow-lg shadow-black/20 backdrop-blur-xl sm:flex ${className}`}
    >
      <span className="flex h-[2.2em] w-[2.2em] shrink-0 items-center justify-center rounded-[0.7em] bg-gradient-to-br from-violet-600/30 to-cyan-400/20 text-cyan-300 light:text-cyan-700">
        <Icon className="h-[1.1em] w-[1.1em]" />
      </span>
      <span className="whitespace-nowrap text-[0.95em] font-semibold text-slate-100 light:text-slate-900">{label}</span>
    </div>
  );
}
