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
import type { Locale } from "@/types/i18n";
import type { ProjectPricingLabel } from "@/types/projectPricing";
import { translations } from "@/data/translations";
import { contentTranslations } from "@/data/i18n/content";
import { translateDuration } from "@/data/i18n/catalog";
import { byId, fill } from "@/lib/i18n";

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

/**
 * Same as getJSON, but never throws: a backend hiccup on one content
 * section (services/pricing/portfolio/testimonials) degrades that section
 * to `fallback` instead of crashing the whole page's SSR render.
 */
async function getJSONOrDefault<T>(path: string, fallback: T): Promise<T> {
  try {
    return await getJSON<T>(path);
  } catch (err) {
    console.error(`content: ${path} failed, using fallback`, err);
    return fallback;
  }
}

/** Website types whose pricing cards link to /services/website-development
 * instead of the backend's generic service_href. */
const websiteProjectTypes = new Set(["landing", "business-card", "corporate", "catalog", "online-store"]);

/** Pricing cards identify their project type by a stable key; the label
 * is translated through the same map as the contact form options. */
const projectTypeLabels: Record<string, ProjectPricingLabel> = {
  landing: "Лендинг",
  "business-card": "Сайт-визитка",
  corporate: "Корпоративный сайт",
  catalog: "Сайт-каталог",
  "online-store": "Интернет-магазин",
  "web-app": "Web-приложение",
  crm: "CRM-система",
  "mobile-app": "Мобильное приложение",
  "ai-solution": "AI-решение",
  "backend-api": "Backend/API",
  "devops-vps": "DevOps/VPS",
};

export async function fetchServicesOverview(locale: Locale): Promise<ServiceOverview[]> {
  const items = await getJSONOrDefault<ApiServiceOverview[]>("/api/v1/services", []);
  const texts = contentTranslations[locale].services;
  return items.map((item) => ({
    id: item.slug,
    title: item.title,
    description: item.description,
    features: item.features,
    ...byId(texts, item.slug),
    icon: item.icon as ServiceOverviewIcon,
  }));
}

function mapServiceDetail(item: ApiServiceDetail, locale: Locale): ServiceDetail {
  const text = byId(contentTranslations[locale].serviceDetails, item.slug);
  return {
    id: item.slug,
    eyebrow: text?.eyebrow ?? item.eyebrow,
    title: text?.title ?? item.title,
    description: text?.description ?? item.description,
    points: text?.points ?? item.points,
    highlights: item.highlights.map((h, index) => ({
      icon: h.icon as ServiceDetailIcon,
      label: text?.highlights[index] ?? h.label,
    })),
  };
}

export async function fetchServiceDetail(
  slug: string,
  locale: Locale,
): Promise<ServiceDetail | null> {
  try {
    const item = await getJSON<ApiServiceDetail>(`/api/v1/services/${slug}`);
    return mapServiceDetail(item, locale);
  } catch (err) {
    console.error(`content: service detail "${slug}" failed`, err);
    return null;
  }
}

/** Fetches all four service details keyed by slug, for pages that render
 * every section at once (homepage, /services). A slug whose fetch fails is
 * simply omitted from the result — callers should render each section
 * conditionally rather than assume every slug is present. */
export async function fetchServiceDetailsBySlug(
  locale: Locale,
): Promise<Record<string, ServiceDetail>> {
  const slugs = ["web-development", "web-apps", "mobile-apps", "ai-automation"];
  const details = await Promise.all(slugs.map((slug) => fetchServiceDetail(slug, locale)));
  return Object.fromEntries(
    details
      .filter((detail): detail is ServiceDetail => detail !== null)
      .map((detail) => [detail.id, detail]),
  );
}

export async function fetchPricingCards(locale: Locale): Promise<PricingCardItem[]> {
  const items = await getJSONOrDefault<ApiPricingCard[]>("/api/v1/pricing", []);
  const t = translations[locale];
  return items.map((item) => {
    const label = byId(projectTypeLabels, item.project_type);
    const text = byId(contentTranslations[locale].pricing, item.project_type);
    const priceFrom =
      item.is_individual || item.price_from_tenge === null
        ? t.catalog.result.individual
        : fill(t.catalog.priceFrom, {
            price: `${item.price_from_tenge.toLocaleString("ru-RU")} ₸`,
          });
    return {
      id: `price-${item.project_type}`,
      title: label ? t.contactPage.form.options.projectType[label] : item.title,
      priceFrom,
      duration: translateDuration(t.catalog, item.duration),
      description: text?.description ?? item.description,
      features: text?.features ?? item.features,
      serviceHref: websiteProjectTypes.has(item.project_type) ? "/services/website-development" : item.service_href,
    };
  });
}

/** `category` stays the canonical (Russian) value: the portfolio filter
 * compares against it, and the card translates it for display. */
function mapPortfolioCase(item: ApiPortfolioCase, locale: Locale): PortfolioCaseStudy {
  const text = byId(contentTranslations[locale].portfolio, item.slug);
  return {
    id: item.slug,
    slug: item.slug,
    title: text?.title ?? item.title,
    category: item.category as PortfolioCategory,
    subcategory: text?.subcategory ?? item.subcategory,
    summary: text?.summary ?? item.summary,
    task: text?.task ?? item.task,
    process: text?.process ?? item.process,
    solution: text?.solution ?? item.solution,
    technologies: text?.technologies ?? item.technologies,
    result: text?.result ?? item.result,
    duration: text?.duration ?? item.duration,
    gradientFrom: item.gradient_from,
    gradientTo: item.gradient_to,
    screenshotUrl: item.screenshot_url,
    externalUrl: item.external_url,
  };
}

export async function fetchPortfolioCases(locale: Locale): Promise<PortfolioCaseStudy[]> {
  const items = await getJSONOrDefault<ApiPortfolioCase[]>("/api/v1/portfolio", []);
  return items.map((item) => mapPortfolioCase(item, locale));
}

export async function fetchPortfolioCase(
  slug: string,
  locale: Locale,
): Promise<PortfolioCaseStudy | null> {
  try {
    const item = await getJSON<ApiPortfolioCase>(`/api/v1/portfolio/${slug}`);
    return mapPortfolioCase(item, locale);
  } catch {
    return null;
  }
}

export async function fetchTestimonials(locale: Locale): Promise<Testimonial[]> {
  const items = await getJSONOrDefault<ApiTestimonial[]>("/api/v1/testimonials", []);
  const texts = contentTranslations[locale].testimonials;
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    role: byId(texts, item.name)?.role ?? item.role,
    company: item.company,
    quote: byId(texts, item.name)?.quote ?? item.quote,
    rating: item.rating,
    initials: item.initials,
  }));
}
