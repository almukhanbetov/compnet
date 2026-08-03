// Wire shapes returned by the backend content endpoints — snake_case,
// mirroring the Go DTOs in internal/http/dto/content.go exactly. Mapping
// functions in lib/api/content.ts convert these into the existing frontend
// types (camelCase) so components don't need to change their prop shapes.

export interface ApiServiceOverview {
  slug: string;
  title: string;
  description: string;
  features: string[];
  icon: string;
}

export interface ApiServiceHighlight {
  icon: string;
  label: string;
}

export interface ApiServiceDetail {
  slug: string;
  eyebrow: string;
  title: string;
  description: string;
  points: string[];
  highlights: ApiServiceHighlight[];
}

export interface ApiPricingCard {
  project_type: string;
  title: string;
  price_from_tenge: number | null;
  is_individual: boolean;
  duration: string;
  description: string;
  features: string[];
  service_href: string;
}

export interface ApiPortfolioCase {
  slug: string;
  title: string;
  category: string;
  subcategory?: string;
  summary: string;
  task: string;
  process: string[];
  solution: string;
  technologies: string[];
  result: string;
  duration: string;
  gradient_from: string;
  gradient_to: string;
  screenshot_url?: string;
  external_url?: string;
}

export interface ApiTestimonial {
  id: string;
  name: string;
  role: string;
  company: string;
  quote: string;
  rating: number;
  initials: string;
}

export interface ApiEnvelope<T> {
  data: T;
  meta: unknown;
}
