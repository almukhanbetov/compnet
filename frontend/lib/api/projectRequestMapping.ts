import {
  projectPricingList,
  siteScaleTiers,
  appScaleTiers,
  designLevels,
  complexityLevels,
  urgencyLevels,
} from "@/data/projectPricing";
import type { EstimateFormState, ContactMethod } from "@/types/contactPage";
import type { CreateProjectRequestPayload } from "@/types/api/projectRequest";

const CONTACT_METHOD_TO_SLUG: Record<ContactMethod, string> = {
  Телефон: "phone",
  WhatsApp: "whatsapp",
  Telegram: "telegram",
  Email: "email",
};

/**
 * Returns the first (smallest) scale tier id for a category, read straight
 * from the catalog arrays that mirror backend/internal/pricing/catalog.go —
 * never a literal guess. Order in those arrays IS the catalog's option
 * order, so tiers[0] is always the entry-level tier for that category.
 */
function firstScaleTierId(category: "site" | "app"): string {
  const tiers = category === "site" ? siteScaleTiers : appScaleTiers;
  return tiers[0].id;
}

// Same reasoning as firstScaleTierId: take the first catalog entry rather
// than assume which id is "the default".
const DEFAULT_DESIGN_LEVEL_ID = designLevels[0].id;
const DEFAULT_COMPLEXITY_ID = complexityLevels[0].id;
const DEFAULT_URGENCY_ID = urgencyLevels[0].id;

/**
 * Builds the backend payload from the contact form state. The contact form
 * only captures lead info, not the detailed calculator selections, so this
 * fills the calculator sub-object with the entry-level option of each
 * catalog list for the selected project type's category — giving a
 * from-price estimate rather than a precise one, without inventing ids that
 * aren't actually in the catalog.
 * Returns null if the selected project type has no matching catalog entry
 * (should not happen since options come from the same catalog).
 */
export function buildProjectRequestPayload(
  form: EstimateFormState,
): CreateProjectRequestPayload | null {
  const entry = projectPricingList.find((item) => item.label === form.projectType);
  if (!entry) {
    return null;
  }

  const scaleTierId =
    entry.category === "site" || entry.category === "app"
      ? firstScaleTierId(entry.category)
      : "";

  return {
    name: form.name.trim(),
    phone: form.phone.trim(),
    email: form.email.trim(),
    company: form.company.trim(),
    project_type: entry.projectType,
    description: form.description.trim(),
    budget_range: form.budget,
    desired_timeline: form.timeline,
    contact_method: CONTACT_METHOD_TO_SLUG[form.contactMethod],
    consent: form.consent,
    calculator: {
      scale_tier_id: scaleTierId,
      selected_module_ids: [],
      external_api_count: 0,
      multilingual: false,
      design_level_id: DEFAULT_DESIGN_LEVEL_ID,
      complexity_id: DEFAULT_COMPLEXITY_ID,
      urgency_id: DEFAULT_URGENCY_ID,
    },
  };
}
