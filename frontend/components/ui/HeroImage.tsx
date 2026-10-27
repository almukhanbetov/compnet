import Image from "next/image";
import type { HeroVisual } from "@/data/heroVisuals";

/**
 * A page's hero image in its glow. Above the fold, so loaded eagerly with a
 * high fetch priority (Next.js 16: `priority` is deprecated; `preload` is not
 * used since the LCP element may be the heading instead). Intrinsic width
 * and height reserve its box: no layout shift. Floats gently only when the
 * visitor allows motion.
 */
export default function HeroImage({ visual, alt, className = "" }: { visual: HeroVisual; alt: string; className?: string }) {
  return (
    <div className={`relative mx-auto w-full max-w-[460px] lg:max-w-[560px] ${className}`}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-[12%] rounded-full bg-violet-600/25 blur-[70px] light:bg-violet-500/20" />
      <div aria-hidden="true" className="pointer-events-none absolute bottom-[8%] right-[6%] h-1/3 w-1/3 rounded-full bg-cyan-400/15 blur-[60px]" />
      <Image
        src={visual.src}
        width={visual.width}
        height={visual.height}
        alt={alt}
        sizes="(min-width: 1024px) 560px, (min-width: 500px) 460px, 92vw"
        loading="eager"
        fetchPriority="high"
        className="relative h-auto w-full select-none motion-safe:animate-[hero-float_9s_ease-in-out_infinite]"
        draggable={false}
      />
    </div>
  );
}
