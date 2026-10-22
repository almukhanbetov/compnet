"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { AlertCircle, CheckCircle2, Loader2, Send } from "lucide-react";
import EstimatePreview from "@/components/contact/EstimatePreview";
import FieldWrapper, { fieldErrorId } from "@/components/ui/FieldWrapper";
import SectionHeading from "@/components/ui/SectionHeading";
import SelectField, {
  fieldClass,
  errorFieldClass,
} from "@/components/ui/SelectField";
import {
  projectTypeOptions,
  budgetOptions,
  timelineOptions,
  contactMethodOptions,
  formLimits,
  ESTIMATE_FORM_ID,
} from "@/data/contactPage";
import type {
  EstimateFormState,
  EstimateFormErrors,
  ProjectType,
  BudgetRange,
  Timeline,
  ContactMethod,
} from "@/types/contactPage";
import { buildProjectRequestPayload } from "@/lib/api/projectRequestMapping";
import { submitProjectRequest } from "@/lib/api/projectRequests";
import { analyticsSessionId } from "@/lib/analytics/tracker";
import { ga4Event } from "@/lib/analytics/ga4";
import { useLocale } from "@/components/providers/LocaleProvider";
import { byId, fill } from "@/lib/i18n";
import { translateDuration } from "@/data/i18n/catalog";
import type { ContactPageTranslations } from "@/types/i18n";
import type { ProjectRequestData } from "@/types/api/projectRequest";

const BACKEND_FIELD_TO_FORM_FIELD: Partial<
  Record<string, keyof EstimateFormErrors>
> = {
  name: "name",
  phone: "phone",
  email: "email",
  project_type: "projectType",
  description: "description",
  contact_method: "contactMethod",
  consent: "consent",
};

type ErrorKey = keyof ContactPageTranslations["form"]["errors"];

/** Backend validation messages (backend/internal/http/dto/projectrequest.go)
 * mapped to translated texts; anything else gets the generic `invalid`. */
const BACKEND_MESSAGE_TO_ERROR: Record<string, ErrorKey> = {
  "укажите имя": "name",
  "слишком длинное имя": "nameTooLong",
  "укажите телефон или email": "phoneOrEmail",
  "проверьте номер телефона": "phone",
  "проверьте email": "email",
  "выберите тип проекта": "projectType",
  "кратко опишите задачу": "description",
  "слишком длинное описание": "descriptionTooLong",
  "нужно согласие на обработку данных": "consent",
};

function formatTenge(amount: number): string {
  return `${amount.toLocaleString("ru-RU")} ₸`;
}

function initialFormState(projectType: ProjectType | ""): EstimateFormState {
  return {
    name: "",
    phone: "",
    email: "",
    company: "",
    projectType,
    description: "",
    budget: "пока не определён",
    timeline: "пока не определён",
    contactMethod: "Телефон",
    consent: false,
  };
}

/** Field ids in the order they appear, for focusing the first error. */
const FIELD_ORDER: (keyof EstimateFormErrors)[] = [
  "name",
  "phone",
  "email",
  "projectType",
  "contactMethod",
  "description",
  "consent",
];

const CONTACT_HINT_ID = "contact-hint";
const FORM_TITLE_ID = `${ESTIMATE_FORM_ID}-title`;

type FormErrorTexts = ContactPageTranslations["form"]["errors"];

function validate(form: EstimateFormState, text: FormErrorTexts): EstimateFormErrors {
  const errors: EstimateFormErrors = {};

  if (!form.name.trim()) {
    errors.name = text.name;
  } else if (form.name.trim().length > formLimits.name) {
    errors.name = text.nameTooLong;
  }

  const hasPhone = form.phone.trim().length > 0;
  const hasEmail = form.email.trim().length > 0;

  if (!hasPhone && !hasEmail) {
    errors.phone = text.phoneOrEmail;
    errors.email = text.phoneOrEmail;
  } else {
    if (hasPhone && form.phone.trim().replace(/[^\d+]/g, "").length < 7) {
      errors.phone = text.phone;
    }
    if (hasEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errors.email = text.email;
    }
  }

  if (!form.projectType) {
    errors.projectType = text.projectType;
  }

  if (!form.description.trim()) {
    errors.description = text.description;
  } else if (form.description.trim().length > formLimits.description) {
    errors.description = text.descriptionTooLong;
  }

  if (!form.consent) {
    errors.consent = text.consent;
  }

  return errors;
}

interface ProjectEstimateFormProps {
  /** Section heading for pages without their own hero (not /contact). */
  heading?: { eyebrow: string; title: string; description?: string };
  /** Project type selected from the start, e.g. on a service page. */
  initialProjectType?: ProjectType;
  /** Types offered in the select; the whole catalog by default. */
  projectTypes?: readonly ProjectType[];
  /** false on pages that publish no prices: no estimate preview and no
   * price in the success message. */
  showPrices?: boolean;
  /** Side column; the estimate preview by default. */
  aside?: ReactNode;
}

export default function ProjectEstimateForm({
  heading,
  initialProjectType,
  projectTypes = projectTypeOptions,
  showPrices = true,
  aside,
}: ProjectEstimateFormProps = {}) {
  const { t } = useLocale();
  const f = t.contactPage.form;
  const initialType = initialProjectType ?? "";
  const [form, setForm] = useState<EstimateFormState>(() => initialFormState(initialType));
  const [errors, setErrors] = useState<EstimateFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<ProjectRequestData | null>(
    null,
  );
  // Uncontrolled on purpose: bots that set the DOM value without input
  // events are caught too.
  const honeypotRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const successTitleRef = useRef<HTMLParagraphElement>(null);
  // What to focus once the state change it belongs to has rendered: an
  // invalid field, the success message, or the first field after "send
  // another".
  const pendingFocus = useRef<string | null>(null);

  useEffect(() => {
    const id = pendingFocus.current;
    if (!id) return;
    pendingFocus.current = null;
    const target =
      id === "success" ? successTitleRef.current : formRef.current?.querySelector<HTMLElement>(`#${id}`);
    target?.focus();
  });

  const focusFirstError = (fieldErrors: EstimateFormErrors) => {
    const first = FIELD_ORDER.find((field) => fieldErrors[field]);
    if (first) pendingFocus.current = first;
  };

  /** ARIA attributes tying a field to its error (and extra hint ids). */
  const describe = (field: keyof EstimateFormErrors, ...hintIds: string[]) => {
    const ids = [...hintIds, ...(errors[field] ? [fieldErrorId(field)] : [])];
    return {
      "aria-invalid": errors[field] ? true : undefined,
      "aria-describedby": ids.length > 0 ? ids.join(" ") : undefined,
    };
  };

  const updateField = <K extends keyof EstimateFormState>(
    key: K,
    value: EstimateFormState[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleTextChange =
    (key: "name" | "phone" | "email" | "company" | "description") =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      updateField(key, event.target.value);
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const validationErrors = validate(form, f.errors);
    setErrors(validationErrors);
    setApiError(null);

    if (Object.keys(validationErrors).length > 0) {
      focusFirstError(validationErrors);
      return;
    }

    const payload = buildProjectRequestPayload(form);
    if (!payload) {
      setApiError(f.errors.chooseFromList);
      return;
    }

    setIsSubmitting(true);
    const result = await submitProjectRequest({
      ...payload,
      analytics_session_id: analyticsSessionId(),
      website: honeypotRef.current?.value ?? "",
    });
    setIsSubmitting(false);

    if (result.kind === "success") {
      setSubmitResult(result.data);
      pendingFocus.current = "success";
      // GA4 (if configured and consented) learns only that a request was
      // saved — confirmed by the server, never with contacts or ids.
      ga4Event("lead_confirmed", window.location.pathname);
      return;
    }

    if (result.kind === "validation_error") {
      const mappedErrors: EstimateFormErrors = {};
      let hasUnmappedField = false;

      for (const [backendField, message] of Object.entries(result.fields)) {
        const formField = BACKEND_FIELD_TO_FORM_FIELD[backendField];
        if (formField) {
          mappedErrors[formField] = f.errors[byId(BACKEND_MESSAGE_TO_ERROR, message) ?? "invalid"];
        } else {
          hasUnmappedField = true;
        }
      }

      setErrors((prev) => ({ ...prev, ...mappedErrors }));
      focusFirstError(mappedErrors);
      if (hasUnmappedField || Object.keys(mappedErrors).length === 0) {
        setApiError(f.errors.invalid);
      }
      return;
    }

    setApiError(f.errors[result.reason]);
  };

  const handleReset = () => {
    setForm(initialFormState(initialType));
    setErrors({});
    setApiError(null);
    setSubmitResult(null);
    pendingFocus.current = "name";
  };

  const estimateText = (estimate: ProjectRequestData["estimate"]) =>
    (estimate.is_individual || estimate.minimum_tenge === null || estimate.maximum_tenge === null
      ? f.success.individual
      : fill(f.success.estimate, {
          min: formatTenge(estimate.minimum_tenge),
          max: formatTenge(estimate.maximum_tenge),
        })) +
    (estimate.duration_label
      ? fill(f.success.duration, { duration: translateDuration(t.catalog, estimate.duration_label) })
      : "");

  return (
    <section
      id={ESTIMATE_FORM_ID}
      aria-labelledby={heading ? FORM_TITLE_ID : undefined}
      className={`scroll-mt-24 px-6 ${heading ? "relative py-16 md:py-20" : "py-8 md:py-12"}`}
    >
      {heading ? (
        <div className="mx-auto mb-10 max-w-[1280px]">
          <SectionHeading
            align="left"
            titleId={FORM_TITLE_ID}
            eyebrow={heading.eyebrow}
            title={heading.title}
            description={heading.description}
          />
        </div>
      ) : null}
      <div
        className={`mx-auto grid gap-8 lg:grid-cols-[1fr_360px] ${heading ? "max-w-[1280px]" : "max-w-[1200px]"}`}
      >
        <div className="rounded-[28px] border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.03] p-7 backdrop-blur-xl md:p-10">
          {submitResult ? (
            <div role="status" className="flex flex-col items-center py-10 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-600/30 to-cyan-400/20 text-cyan-300 light:text-cyan-700">
                <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
              </span>
              <p
                ref={successTitleRef}
                tabIndex={-1}
                className="mt-5 text-xl font-semibold text-slate-100 outline-none light:text-slate-900"
              >
                {fill(f.success.title, { id: submitResult.id.slice(0, 8) })}
              </p>
              {showPrices ? (
                <p className="mt-2 max-w-md text-sm leading-6 text-slate-400 light:text-slate-600">
                  {estimateText(submitResult.estimate)}
                </p>
              ) : null}
              <p className="mt-2 max-w-md text-xs leading-5 text-slate-500 light:text-slate-600">
                {f.success.followUp}
              </p>

              <button
                type="button"
                onClick={handleReset}
                className="mt-7 inline-flex items-center justify-center rounded-xl border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 px-5 py-3 text-sm font-semibold transition hover:bg-[var(--text-primary)]/10"
              >
                {f.success.again}
              </button>
            </div>
          ) : (
            <form
              ref={formRef}
              noValidate
              onSubmit={handleSubmit}
              aria-labelledby={heading ? FORM_TITLE_ID : undefined}
              className="space-y-6"
            >
              {apiError ? (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200 light:border-rose-500/30 light:bg-rose-500/10 light:text-rose-700"
                >
                  <AlertCircle
                    className="mt-0.5 h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  <span>{apiError}</span>
                </div>
              ) : null}

              {/* Honeypot: off-screen and out of the tab order, so only bots fill it. */}
              <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
                <label htmlFor="website">{f.labels.honeypot}</label>
                <input
                  ref={honeypotRef}
                  id="website"
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  defaultValue=""
                />
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <FieldWrapper label={f.labels.name} htmlFor="name" error={errors.name}>
                  <input
                    id="name"
                    type="text"
                    autoComplete="name"
                    aria-required="true"
                    {...describe("name")}
                    value={form.name}
                    maxLength={formLimits.name}
                    onChange={handleTextChange("name")}
                    placeholder={f.placeholders.name}
                    className={`${fieldClass} ${errors.name ? errorFieldClass : ""}`}
                  />
                </FieldWrapper>

                <FieldWrapper label={f.labels.company} htmlFor="company">
                  <input
                    id="company"
                    type="text"
                    autoComplete="organization"
                    value={form.company}
                    maxLength={formLimits.company}
                    onChange={handleTextChange("company")}
                    placeholder={f.placeholders.company}
                    className={fieldClass}
                  />
                </FieldWrapper>

                <FieldWrapper label={f.labels.phone} htmlFor="phone" error={errors.phone}>
                  <input
                    id="phone"
                    type="tel"
                    autoComplete="tel"
                    {...describe("phone", CONTACT_HINT_ID)}
                    value={form.phone}
                    onChange={handleTextChange("phone")}
                    placeholder="+7 (700) 000-00-00"
                    className={`${fieldClass} ${errors.phone ? errorFieldClass : ""}`}
                  />
                </FieldWrapper>

                <FieldWrapper label={f.labels.email} htmlFor="email" error={errors.email}>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    {...describe("email", CONTACT_HINT_ID)}
                    value={form.email}
                    onChange={handleTextChange("email")}
                    placeholder="you@company.kz"
                    className={`${fieldClass} ${errors.email ? errorFieldClass : ""}`}
                  />
                </FieldWrapper>
              </div>

              <p id={CONTACT_HINT_ID} className="text-xs text-slate-500 light:text-slate-600">
                {f.contactHint}
              </p>

              <div className="grid gap-6 sm:grid-cols-2">
                <FieldWrapper
                  label={f.labels.projectType}
                  htmlFor="projectType"
                  error={errors.projectType}
                >
                  <SelectField<ProjectType | "">
                    id="projectType"
                    value={form.projectType}
                    onChange={(value) => updateField("projectType", value)}
                    options={projectTypes}
                    getLabel={(value) => (value ? f.options.projectType[value] : value)}
                    placeholder={f.placeholders.projectType}
                    hasError={Boolean(errors.projectType)}
                    describedBy={describe("projectType")["aria-describedby"]}
                    required
                  />
                </FieldWrapper>

                <FieldWrapper label={f.labels.contactMethod} htmlFor="contactMethod" error={errors.contactMethod}>
                  <SelectField<ContactMethod>
                    id="contactMethod"
                    value={form.contactMethod}
                    onChange={(value) => updateField("contactMethod", value)}
                    options={contactMethodOptions}
                    getLabel={(value) => f.options.contactMethod[value]}
                    hasError={Boolean(errors.contactMethod)}
                    describedBy={describe("contactMethod")["aria-describedby"]}
                  />
                </FieldWrapper>

                <FieldWrapper label={f.labels.budget} htmlFor="budget">
                  <SelectField<BudgetRange>
                    id="budget"
                    value={form.budget}
                    onChange={(value) => updateField("budget", value)}
                    options={budgetOptions}
                    getLabel={(value) => f.options.budget[value]}
                  />
                </FieldWrapper>

                <FieldWrapper label={f.labels.timeline} htmlFor="timeline">
                  <SelectField<Timeline>
                    id="timeline"
                    value={form.timeline}
                    onChange={(value) => updateField("timeline", value)}
                    options={timelineOptions}
                    getLabel={(value) => f.options.timeline[value]}
                  />
                </FieldWrapper>
              </div>

              <FieldWrapper
                label={f.labels.description}
                htmlFor="description"
                error={errors.description}
              >
                <textarea
                  id="description"
                  rows={4}
                  aria-required="true"
                  {...describe("description")}
                  value={form.description}
                  maxLength={formLimits.description}
                  onChange={handleTextChange("description")}
                  placeholder={f.placeholders.description}
                  className={`${fieldClass} resize-none ${
                    errors.description ? errorFieldClass : ""
                  }`}
                />
              </FieldWrapper>

              <div>
                <label className="flex items-start gap-3 text-sm text-slate-300 light:text-slate-700">
                  <input
                    id="consent"
                    type="checkbox"
                    aria-required="true"
                    {...describe("consent")}
                    checked={form.consent}
                    onChange={(event) =>
                      updateField("consent", event.target.checked)
                    }
                    className="mt-0.5 h-4 w-4 shrink-0 accent-violet-500"
                  />
                  {f.labels.consent}
                </label>
                {errors.consent ? (
                  <p id={fieldErrorId("consent")} className="mt-1.5 text-xs text-rose-400">
                    {errors.consent}
                  </p>
                ) : null}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-7 py-4 font-semibold text-white shadow-[0_0_24px_rgba(124,58,237,0.35)] transition hover:scale-105 hover:shadow-[0_0_32px_rgba(124,58,237,0.5)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
              >
                {isSubmitting ? (
                  <>
                    {f.submitting}
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                  </>
                ) : (
                  <>
                    {f.submit}
                    <Send className="h-4 w-4" aria-hidden="true" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {aside ?? (showPrices ? <EstimatePreview projectType={form.projectType} /> : null)}
      </div>
    </section>
  );
}
