"use client";

import { motion } from "motion/react";
import {
  Globe,
  Smartphone,
  Bot,
  Server,
  Palette,
  Settings2,
  type LucideIcon,
} from "lucide-react";
import { useLocale } from "@/components/providers/LocaleProvider";
import type { HeroDirectionIcon } from "@/types/i18n";

const directionIcons: Record<HeroDirectionIcon, LucideIcon> = {
  Globe,
  Smartphone,
  Bot,
  Server,
  Palette,
  Settings2,
};

export default function HeroVisual() {
  const { t } = useLocale();
  const [webDevelopment, mobileApps, aiSolutions, backendApi, uiUxDesign, devOps] =
    t.hero.directions;
  const gridDirections = [mobileApps, backendApi, uiUxDesign, devOps].filter(
    Boolean,
  );

  return (
    <div className="relative mx-auto w-full max-w-md lg:mx-0">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative rounded-[28px] border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.04] p-6 shadow-2xl shadow-violet-950/40 backdrop-blur-xl"
      >
        <div>
          <p className="text-base font-semibold text-slate-100 light:text-slate-900">
            Направления разработки
          </p>
          <p className="text-sm text-slate-400 light:text-slate-600">
            От идеи и дизайна до запуска и поддержки
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          {gridDirections.map((direction) => {
            const Icon = directionIcons[direction.icon];

            return (
              <div
                key={direction.label}
                className="flex items-center gap-2.5 rounded-xl border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.03] px-3 py-3"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600/30 to-cyan-400/20 text-cyan-300 light:text-cyan-700">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="text-sm font-medium text-slate-200 light:text-slate-800">
                  {direction.label}
                </span>
              </div>
            );
          })}
        </div>
      </motion.div>

      {webDevelopment ? (
        <FloatingCard
          className="left-[-16px] top-8 hidden md:flex"
          delay={0.2}
          icon={directionIcons[webDevelopment.icon]}
          label={webDevelopment.label}
        />
      ) : null}

      {aiSolutions ? (
        <FloatingCard
          className="bottom-[-16px] right-[-8px] hidden md:flex"
          delay={0.35}
          icon={directionIcons[aiSolutions.icon]}
          label={aiSolutions.label}
        />
      ) : null}
    </div>
  );
}

interface FloatingCardProps {
  className: string;
  delay: number;
  icon: LucideIcon;
  label: string;
}

function FloatingCard({ className, delay, icon: Icon, label }: FloatingCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
      className={`absolute items-center gap-3 rounded-2xl border border-[var(--text-primary)]/10 bg-[var(--surface)]/90 px-4 py-3 shadow-lg shadow-black/20 backdrop-blur-xl ${className}`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600/30 to-cyan-400/20 text-cyan-300 light:text-cyan-700">
        <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
      </span>
      <span className="text-sm font-semibold text-slate-100 light:text-slate-900">{label}</span>
    </motion.div>
  );
}
