export type PortfolioCategory =
  | "Корпоративный сайт"
  | "CRM-система"
  | "Мобильное приложение"
  | "Интернет-магазин"
  | "AI-решение"
  | "Web-приложение";

export interface PortfolioProject {
  id: string;
  slug: string;
  title: string;
  category: PortfolioCategory;
  description: string;
  tags: string[];
  gradientFrom: string;
  gradientTo: string;
}
