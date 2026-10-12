"use client";

import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { AlertCircle, CheckCircle2, Loader2, Send } from "lucide-react";
import EstimatePreview from "@/components/contact/EstimatePreview";
import FieldWrapper from "@/components/ui/FieldWrapper";
import SelectField, {
  fieldClass,
  errorFieldClass,
} from "@/components/ui/SelectField";
import {
  projectTypeOptions,
  budgetOptions,
  timelineOptions,
  contactMethodOptions,
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
import { useLocale } from "@/components/providers/LocaleProvider";
import { fill } from "@/lib/i18n";
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

function formatTenge(amount: number): string {
  return `${amount.toLocaleString("ru-RU")} ₸`;
}

const initialFormState: EstimateFormState = {
  name: "",
  phone: "",
  email: "",
  company: "",
  projectType: "",
  description: "",
  budget: "пока не определён",
  timeline: "пока не определён",
  contactMethod: "Телефон",
  consent: false,
};

type FormErrorTexts = ContactPageTranslations["form"]["errors"];

function validate(form: EstimateFormState, text: FormErrorTexts): EstimateFormErrors {
  const errors: EstimateFormErrors = {};

  if (!form.name.trim()) {
    errors.name = text.name;
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
  }

  if (!form.consent) {
    errors.consent = text.consent;
  }

  return errors;
}

export default function ProjectEstimateForm() {
  const { t } = useLocale();
  const f = t.contactPage.form;
  const [form, setForm] = useState<EstimateFormState>(initialFormState);
  const [errors, setErrors] = useState<EstimateFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<ProjectRequestData | null>(
    null,
  );

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
      return;
    }

    const payload = buildProjectRequestPayload(form);
    if (!payload) {
      setApiError(f.errors.chooseFromList);
      return;
    }

    setIsSubmitting(true);
    const result = await submitProjectRequest(payload);
    setIsSubmitting(false);

    if (result.kind === "success") {
      setSubmitResult(result.data);
      return;
    }

    if (result.kind === "validation_error") {
      const mappedErrors: EstimateFormErrors = {};
      let hasUnmappedField = false;

      for (const [backendField, message] of Object.entries(result.fields)) {
        const formField = BACKEND_FIELD_TO_FORM_FIELD[backendField];
        if (formField) {
          mappedErrors[formField] = message;
        } else {
          hasUnmappedField = true;
        }
      }

      setErrors((prev) => ({ ...prev, ...mappedErrors }));
      if (hasUnmappedField || Object.keys(mappedErrors).length === 0) {
        setApiError(result.message);
      }
      return;
    }

    setApiError(f.errors[result.reason]);
  };

  const handleReset = () => {
    setForm(initialFormState);
    setErrors({});
    setApiError(null);
    setSubmitResult(null);
  };

  return (
    <section
      id="estimate-form"
      className="scroll-mt-24 px-6 py-8 md:py-12"
    >
      <div className="mx-auto grid max-w-[1200px] gap-8 lg:grid-cols-[1fr_360px]">
        <div className="rounded-[28px] border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.03] p-7 backdrop-blur-xl md:p-10">
          {submitResult ? (
            <div className="flex flex-col items-center py-10 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-600/30 to-cyan-400/20 text-cyan-300 light:text-cyan-700">
                <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
              </span>
              <p className="mt-5 text-xl font-semibold text-slate-100 light:text-slate-900">
                {fill(f.success.title, { id: submitResult.id.slice(0, 8) })}
              </p>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-400 light:text-slate-600">
                {submitResult.estimate.is_individual ||
                submitResult.estimate.minimum_tenge === null ||
                submitResult.estimate.maximum_tenge === null
                  ? f.success.individual
                  : fill(f.success.estimate, {
                      min: formatTenge(submitResult.estimate.minimum_tenge),
                      max: formatTenge(submitResult.estimate.maximum_tenge),
                    })}
                {submitResult.estimate.duration_label
                  ? fill(f.success.duration, { duration: submitResult.estimate.duration_label })
                  : ""}
              </p>
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
            <form noValidate onSubmit={handleSubmit} className="space-y-6">
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

              <div className="grid gap-6 sm:grid-cols-2">
                <FieldWrapper label={f.labels.name} htmlFor="name" error={errors.name}>
                  <input
                    id="name"
                    type="text"
                    value={form.name}
                    onChange={handleTextChange("name")}
                    placeholder={f.placeholders.name}
                    className={`${fieldClass} ${errors.name ? errorFieldClass : ""}`}
                  />
                </FieldWrapper>

                <FieldWrapper label={f.labels.company} htmlFor="company">
                  <input
                    id="company"
                    type="text"
                    value={form.company}
                    onChange={handleTextChange("company")}
                    placeholder={f.placeholders.company}
                    className={fieldClass}
                  />
                </FieldWrapper>

                <FieldWrapper label={f.labels.phone} htmlFor="phone" error={errors.phone}>
                  <input
                    id="phone"
                    type="tel"
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
                    value={form.email}
                    onChange={handleTextChange("email")}
                    placeholder="you@company.kz"
                    className={`${fieldClass} ${errors.email ? errorFieldClass : ""}`}
                  />
                </FieldWrapper>
              </div>

              <p className="text-xs text-slate-500 light:text-slate-600">
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
                    options={projectTypeOptions}
                    getLabel={(value) => (value ? f.options.projectType[value] : value)}
                    placeholder={f.placeholders.projectType}
                    hasError={Boolean(errors.projectType)}
                  />
                </FieldWrapper>

                <FieldWrapper label={f.labels.contactMethod} htmlFor="contactMethod">
                  <SelectField<ContactMethod>
                    id="contactMethod"
                    value={form.contactMethod}
                    onChange={(value) => updateField("contactMethod", value)}
                    options={contactMethodOptions}
                    getLabel={(value) => f.options.contactMethod[value]}
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
                  value={form.description}
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
                    type="checkbox"
                    checked={form.consent}
                    onChange={(event) =>
                      updateField("consent", event.target.checked)
                    }
                    className="mt-0.5 h-4 w-4 shrink-0 accent-violet-500"
                  />
                  {f.labels.consent}
                </label>
                {errors.consent ? (
                  <p className="mt-1.5 text-xs text-rose-400">{errors.consent}</p>
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

        <EstimatePreview projectType={form.projectType} />
      </div>
    </section>
  );
}
