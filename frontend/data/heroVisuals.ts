/**
 * Hero images of the public pages: one per page, alternating sides. A new
 * page gets an entry here and its alt text in data/i18n/heroVisuals.ts.
 *
 * The current files are temporary vector mockups (public/images/hero/*.svg,
 * no text, no client logos) until the final illustrations are approved
 * (prompts in docs/HERO_VISUALS.md); a final image replaces `src`, `width`
 * and `height` only — a raster file (PNG/JPEG/WebP) is served by next/image
 * as AVIF or WebP (next.config.ts `images.formats`).
 */
export type HeroVisualKey =
  | "home"
  | "services"
  | "solutions"
  | "pricing"
  | "calculator"
  | "portfolio"
  | "about"
  | "contact"
  | "websiteDevelopment"
  | "training";

export interface HeroVisual {
  src: string;
  /** Intrinsic size: reserves the space before the image loads (no layout shift). */
  width: number;
  height: number;
  /** Side of the image on wide screens; on phones it always follows the text. */
  position: "left" | "right";
}

const mockup = (file: string, position: HeroVisual["position"]): HeroVisual => ({ src: `/images/hero/${file}.svg`, width: 640, height: 520, position });

export const heroVisuals: Record<HeroVisualKey, HeroVisual> = {
  home: mockup("home", "right"),
  services: mockup("services", "right"),
  solutions: mockup("solutions", "left"),
  pricing: mockup("pricing", "right"),
  calculator: mockup("calculator", "left"),
  portfolio: mockup("portfolio", "right"),
  about: mockup("about", "left"),
  contact: mockup("contact", "right"),
  websiteDevelopment: mockup("website-development", "right"),
  training: mockup("training", "left"),
};
