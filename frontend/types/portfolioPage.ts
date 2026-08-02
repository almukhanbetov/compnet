export type PortfolioCategory =
  | "Сайты"
  | "Web-приложения"
  | "Мобильные приложения"
  | "CRM"
  | "AI-решения";

export type PortfolioFilterValue = "Все" | PortfolioCategory;

export interface PortfolioCaseStudy {
  id: string;
  slug: string;
  title: string;
  category: PortfolioCategory;
  /** More specific label shown next to the category badge, e.g. "Каталог". */
  subcategory?: string;
  summary: string;
  task: string;
  process: string[];
  solution: string;
  technologies: string[];
  result: string;
  duration: string;
  gradientFrom: string;
  gradientTo: string;
  /** Path under /public to a screenshot used as the card's background. */
  screenshotUrl?: string;
  /** When set, the card links to this real site in a new tab instead of
   * the internal case-study page. */
  externalUrl?: string;
}
