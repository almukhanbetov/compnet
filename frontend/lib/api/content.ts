import type {
  ApiEnvelope,
  ApiPortfolioCase,
  ApiPricingCard,
  ApiServiceDetail,
  ApiServiceOverview,
  ApiTestimonial,
} from "@/types/api/content";
import type { ServiceOverview, ServiceOverviewIcon } from "@/types/serviceOverview";
import type { ServiceDetail, ServiceDetailIcon } from "@/types/serviceDetail";
import type { PricingCardItem } from "@/types/pricingPage";
import type { PortfolioCaseStudy, PortfolioCategory } from "@/types/portfolioPage";
import type { Testimonial } from "@/types/testimonial";
import { formatPriceFrom } from "@/data/projectPricing";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

async function getJSON<T>(path: string): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`GET ${path} failed with HTTP ${response.status}`);
  }

  const body = (await response.json()) as ApiEnvelope<T>;
  return body.data;
}

export async function fetchServicesOverview(): Promise<ServiceOverview[]> {
  const items = await getJSON<ApiServiceOverview[]>("/api/v1/services");
  return items.map((item) => ({
    id: item.slug,
    title: item.title,
    description: item.description,
    features: item.features,
    icon: item.icon as ServiceOverviewIcon,
  }));
}

function mapServiceDetail(item: ApiServiceDetail): ServiceDetail {
  return {
    id: item.slug,
    eyebrow: item.eyebrow,
    title: item.title,
    description: item.description,
    points: item.points,
    highlights: item.highlights.map((h) => ({
      icon: h.icon as ServiceDetailIcon,
      label: h.label,
    })),
  };
}

export async function fetchServiceDetail(slug: string): Promise<ServiceDetail> {
  const item = await getJSON<ApiServiceDetail>(`/api/v1/services/${slug}`);
  return mapServiceDetail(item);
}

/** Fetches all four service details keyed by slug, for pages that render
 * every section at once (homepage, /services). */
export async function fetchServiceDetailsBySlug(): Promise<Record<string, ServiceDetail>> {
  const slugs = ["web-development", "web-apps", "mobile-apps", "ai-automation"];
  const details = await Promise.all(slugs.map((slug) => fetchServiceDetail(slug)));
  return Object.fromEntries(details.map((detail) => [detail.id, detail]));
}

export async function fetchPricingCards(): Promise<PricingCardItem[]> {
  const items = await getJSON<ApiPricingCard[]>("/api/v1/pricing");
  return items.map((item) => ({
    id: `price-${item.project_type}`,
    title: item.title,
    priceFrom: formatPriceFrom(item.is_individual ? null : item.price_from_tenge),
    duration: item.duration,
    description: item.description,
    features: item.features,
    serviceHref: item.service_href,
  }));
}

function mapPortfolioCase(item: ApiPortfolioCase): PortfolioCaseStudy {
  return {
    id: item.slug,
    slug: item.slug,
    title: item.title,
    category: item.category as PortfolioCategory,
    subcategory: item.subcategory,
    summary: item.summary,
    task: item.task,
    process: item.process,
    solution: item.solution,
    technologies: item.technologies,
    result: item.result,
    duration: item.duration,
    gradientFrom: item.gradient_from,
    gradientTo: item.gradient_to,
    screenshotUrl: item.screenshot_url,
    externalUrl: item.external_url,
  };
}

export async function fetchPortfolioCases(): Promise<PortfolioCaseStudy[]> {
  const items = await getJSON<ApiPortfolioCase[]>("/api/v1/portfolio");
  return items.map(mapPortfolioCase);
}

export async function fetchPortfolioCase(slug: string): Promise<PortfolioCaseStudy | null> {
  try {
    const item = await getJSON<ApiPortfolioCase>(`/api/v1/portfolio/${slug}`);
    return mapPortfolioCase(item);
  } catch {
    return null;
  }
}

export async function fetchTestimonials(): Promise<Testimonial[]> {
  const items = await getJSON<ApiTestimonial[]>("/api/v1/testimonials");
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    role: item.role,
    company: item.company,
    quote: item.quote,
    rating: item.rating,
    initials: item.initials,
  }));
}
