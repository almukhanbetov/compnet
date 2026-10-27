import Link from "next/link";
import type { ReactNode } from "react";
import HeroImage from "@/components/ui/HeroImage";
import type { HeroVisual } from "@/data/heroVisuals";

export interface HeroCTA {
  label: ReactNode;
  href: string;
  icon?: ReactNode;
  /** Opens in a new tab (WhatsApp and other external links). */
  external?: boolean;
}

interface PageHeroVisualProps {
  /** The page's H1 content (the heading element is this component's). */
  title: ReactNode;
  description?: ReactNode;
  badge?: ReactNode;
  image: HeroVisual;
  alt: string;
  /** Defaults to the image's configured side. */
  imagePosition?: "left" | "right";
  primaryCTA?: HeroCTA;
  secondaryCTA?: HeroCTA;
  /** Above the two columns (breadcrumbs). */
  before?: ReactNode;
  /** Under the description (highlights, advantages). */
  children?: ReactNode;
  titleClassName?: string;
  /**
   * Less vertical space: a short hero followed directly by content.
   * The bottom padding stays (the image glow fades out inside the clipped
   * section); the negative margin pulls the next section up over it.
   */
  compact?: boolean;
}

export const heroPrimaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-7 py-4 font-semibold text-white shadow-[0_0_24px_rgba(124,58,237,0.35)] transition hover:scale-105 hover:shadow-[0_0_32px_rgba(124,58,237,0.5)] motion-reduce:hover:scale-100";
export const heroSecondaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 px-7 py-4 font-semibold transition hover:bg-[var(--text-primary)]/10";

function CTA({ cta, className }: { cta: HeroCTA; className: string }) {
  const content = (
    <>
      {cta.label}
      {cta.icon}
    </>
  );
  if (cta.external) {
    return (
      <a href={cta.href} target="_blank" rel="noopener noreferrer" className={className}>
        {content}
      </a>
    );
  }
  // In-page anchors stay plain links (no client-side navigation).
  if (cta.href.startsWith("#")) {
    return (
      <a href={cta.href} className={className}>
        {content}
      </a>
    );
  }
  return (
    <Link href={cta.href} className={className}>
      {content}
    </Link>
  );
}

/**
 * The top of a public page: text and a semantic image in two columns on
 * wide screens (the image on the configured side), the text first on
 * phones. A server component; the image never overlays the text or the
 * buttons (its own column).
 */
export default function PageHeroVisual({
  title,
  description,
  badge,
  image,
  alt,
  imagePosition = image.position,
  primaryCTA,
  secondaryCTA,
  before,
  children,
  titleClassName = "mt-8 text-4xl font-bold leading-tight md:text-6xl lg:text-5xl xl:text-6xl",
  compact = false,
}: PageHeroVisualProps) {
  const left = imagePosition === "left";
  return (
    <section className={`relative overflow-hidden px-6 ${compact ? "-mb-20 pb-24 pt-16 md:pt-20" :"pb-16 pt-20 md:pb-20 md:pt-24"}`}>
      <div aria-hidden="true" className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-violet-600/20 blur-[100px]" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 top-10 h-80 w-80 rounded-full bg-cyan-400/15 blur-[100px]" />

      <div className="relative mx-auto max-w-[1280px]">
        {before}
        <div className={`grid items-center gap-12 lg:grid-cols-2 lg:gap-14 ${before ? "mt-8" : ""}`}>
          <div className={`min-w-0 ${left ? "lg:order-2" : ""}`}>
            {badge ? (
              <span className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-300 light:border-cyan-600/30 light:bg-cyan-500/10 light:text-cyan-700">
                {badge}
              </span>
            ) : null}
            <h1 className={titleClassName}>{title}</h1>
            {description ? <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400 light:text-slate-600">{description}</p> : null}
            {children}
            {primaryCTA || secondaryCTA ? (
              <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
                {primaryCTA ? <CTA cta={primaryCTA} className={heroPrimaryButtonClass} /> : null}
                {secondaryCTA ? <CTA cta={secondaryCTA} className={heroSecondaryButtonClass} /> : null}
              </div>
            ) : null}
          </div>
          <div className={left ? "lg:order-1" : ""}>
            <HeroImage visual={image} alt={alt} />
          </div>
        </div>
      </div>
    </section>
  );
}
