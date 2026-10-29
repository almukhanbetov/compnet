"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { AlertCircle, CheckCircle2, Loader2, Send } from "lucide-react";
import FieldWrapper, { fieldErrorId } from "@/components/ui/FieldWrapper";
import SectionHeading from "@/components/ui/SectionHeading";
import SelectField, { fieldClass, errorFieldClass } from "@/components/ui/SelectField";
import { contactMethodOptions, formLimits } from "@/data/contactPage";
import {
  TRAINING_GOAL_MAX_LENGTH,
  trainingDirectionIds,
  trainingLevelIds,
  trainingRequestTexts,
  trainingTranslations,
  type TrainingDirectionId,
  type TrainingLevelId,
} from "@/data/i18n/training";
import { TRAINING_FORM_ID } from "@/data/training";
import { buildProjectRequestPayload } from "@/lib/api/projectRequestMapping";
import { submitProjectRequest } from "@/lib/api/projectRequests";
import { analyticsSessionId, leadAttribution } from "@/lib/analytics/tracker";
import { useLocale } from "@/components/providers/LocaleProvider";
import { byId, fill } from "@/lib/i18n";
import type { ContactMethod } from "@/types/contactPage";
import type { ContactPageTranslations } from "@/types/i18n";
import type { ProjectRequestData } from "@/types/api/projectRequest";

interface TrainingFormState {
  name: string;
  phone: string;
  email: string;
  contactMethod: ContactMethod;
  level: TrainingLevelId | "";
  direction: TrainingDirectionId | "";
  goal: string;
  consent: boolean;
}

type FieldKey = "name" | "phone" | "email" | "contactMethod" | "level" | "direction" | "goal" | "consent";
type FormErrors = Partial<Record<FieldKey, string>>;

const FIELD_ORDER: FieldKey[] = ["name", "phone", "email", "contactMethod", "level", "direction", "goal", "consent"];

/** Backend fields (backend/internal/http/dto/projectrequest.go) mapped to this
 * form's fields; the description is built from the goal. */
const BACKEND_FIELD_TO_FORM_FIELD: Partial<Record<string, FieldKey>> = {
  name: "name",
  phone: "phone",
  email: "email",
  contact_method: "contactMethod",
  description: "goal",
  consent: "consent",
};

type ErrorKey = keyof ContactPageTranslations["form"]["errors"];

/** Backend validation messages mapped to the contact form's translated texts. */
const BACKEND_MESSAGE_TO_ERROR: Record<string, ErrorKey> = {
  "укажите имя": "name",
  "слишком длинное имя": "nameTooLong",
  "укажите телефон или email": "phoneOrEmail",
  "проверьте номер телефона": "phone",
  "проверьте email": "email",
  "нужно согласие на обработку данных": "consent",
};

const CONTACT_HINT_ID = "training-contact-hint";
const FORM_TITLE_ID = `${TRAINING_FORM_ID}-title`;

function initialState(): TrainingFormState {
  return { name: "", phone: "", email: "", contactMethod: "Телефон", level: "", direction: "", goal: "", consent: false };
}

/** The request's description: a training heading, then level, area and goal. */
function trainingDescription(form: TrainingFormState): string {
  const r = trainingRequestTexts;
  return [
    r.heading,
    `${r.level}: ${form.level ? r.levels[form.level] : "—"}`,
    `${r.direction}: ${form.direction ? r.directions[form.direction] : "—"}`,
    `${r.goal}:`,
    form.goal.trim(),
  ].join("\n");
}

/**
 * The training request form. Sent through the ordinary project request API
 * (same validation, consent, rate limits and anti-spam field) as project type
 * "Другое", its description marked as a training request. It sends no GA4
 * lead event: the site's conversions stay development requests only. Success
 * is shown only once the server confirmed the request was saved.
 */
export default function TrainingRequestForm({ aside }: { aside?: ReactNode }) {
  const { t, locale } = useLocale();
  const f = t.contactPage.form;
  const tr = trainingTranslations[locale].form;
  const [form, setForm] = useState<TrainingFormState>(initialState);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<ProjectRequestData | null>(null);
  // Uncontrolled on purpose, like the project form: bots that set the DOM
  // value without input events are caught too.
  const honeypotRef = useRef<HTMLInputElement>(null);
  // Set synchronously: a double click cannot send the request twice.
  const submittingRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const successTitleRef = useRef<HTMLParagraphElement>(null);
  const pendingFocus = useRef<string | null>(null);

  useEffect(() => {
    const id = pendingFocus.current;
    if (!id) return;
    pendingFocus.current = null;
    const target = id === "success" ? successTitleRef.current : formRef.current?.querySelector<HTMLElement>(`#${fieldId(id)}`);
    target?.focus();
  });

  const update = <K extends keyof TrainingFormState>(key: K, value: TrainingFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const validate = (): FormErrors => {
    const next: FormErrors = {};
    const name = form.name.trim();
    if (!name) next.name = f.errors.name;
    else if (name.length > formLimits.name) next.name = f.errors.nameTooLong;

    const phone = form.phone.trim();
    const email = form.email.trim();
    if (!phone && !email) {
      next.phone = f.errors.phoneOrEmail;
      next.email = f.errors.phoneOrEmail;
    } else {
      if (phone && phone.replace(/[^\d+]/g, "").length < 7) next.phone = f.errors.phone;
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = f.errors.email;
    }

    if (!form.level) next.level = tr.errors.level;
    if (!form.direction) next.direction = tr.errors.direction;
    if (!form.goal.trim()) next.goal = tr.errors.goal;
    else if (form.goal.trim().length > TRAINING_GOAL_MAX_LENGTH) next.goal = tr.errors.goalTooLong;
    if (!form.consent) next.consent = f.errors.consent;
    return next;
  };

  const focusFirstError = (fieldErrors: FormErrors) => {
    const first = FIELD_ORDER.find((field) => fieldErrors[field]);
    if (first) pendingFocus.current = first;
  };

  const describe = (field: FieldKey, ...hintIds: string[]) => {
    const ids = [...hintIds, ...(errors[field] ? [fieldErrorId(fieldId(field))] : [])];
    return {
      "aria-invalid": errors[field] ? true : undefined,
      "aria-describedby": ids.length > 0 ? ids.join(" ") : undefined,
    };
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current) return;

    const validationErrors = validate();
    setErrors(validationErrors);
    setApiError(null);
    if (Object.keys(validationErrors).length > 0) {
      focusFirstError(validationErrors);
      return;
    }

    const payload = buildProjectRequestPayload({
      name: form.name,
      phone: form.phone,
      email: form.email,
      company: "",
      projectType: "Другое",
      description: trainingDescription(form),
      budget: "пока не определён",
      timeline: "пока не определён",
      contactMethod: form.contactMethod,
      consent: form.consent,
    });
    if (!payload) {
      setApiError(f.errors.unexpected);
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    // With analytics consent only, as on the other forms: the session id and
    // where the visit came from (undefined otherwise).
    const sessionId = analyticsSessionId();
    const result = await submitProjectRequest({
      ...payload,
      analytics_session_id: sessionId,
      attribution: sessionId ? leadAttribution() : undefined,
      website: honeypotRef.current?.value ?? "",
    });
    submittingRef.current = false;
    setIsSubmitting(false);

    if (result.kind === "success") {
      setSubmitResult(result.data);
      pendingFocus.current = "success";
      return;
    }

    if (result.kind === "validation_error") {
      const mapped: FormErrors = {};
      let hasUnmappedField = false;
      for (const [backendField, message] of Object.entries(result.fields)) {
        const field = BACKEND_FIELD_TO_FORM_FIELD[backendField];
        if (!field) {
          hasUnmappedField = true;
        } else if (field === "goal") {
          mapped.goal = message === "слишком длинное описание" ? tr.errors.goalTooLong : tr.errors.goal;
        } else {
          mapped[field] = f.errors[byId(BACKEND_MESSAGE_TO_ERROR, message) ?? "invalid"];
        }
      }
      setErrors((prev) => ({ ...prev, ...mapped }));
      focusFirstError(mapped);
      if (hasUnmappedField || Object.keys(mapped).length === 0) setApiError(f.errors.invalid);
      return;
    }

    // "priceChanged" cannot happen without a price; any other failure:
    // nothing was saved, the visitor can send again.
    setApiError(result.reason === "priceChanged" ? f.errors.unexpected : f.errors[result.reason]);
  };

  const handleReset = () => {
    setForm(initialState());
    setErrors({});
    setApiError(null);
    setSubmitResult(null);
    pendingFocus.current = "name";
  };

  return (
    <section id={TRAINING_FORM_ID} aria-labelledby={FORM_TITLE_ID} className="relative scroll-mt-24 px-6 py-16 md:py-20">
      <div className="mx-auto mb-10 max-w-[1280px]">
        <SectionHeading align="left" titleId={FORM_TITLE_ID} eyebrow={tr.eyebrow} title={tr.title} description={tr.description} />
      </div>
      <div className="mx-auto grid max-w-[1280px] gap-8 lg:grid-cols-[1fr_360px]">
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
              <p className="mt-2 max-w-md text-xs leading-5 text-slate-500 light:text-slate-600">{f.success.followUp}</p>
              <button
                type="button"
                onClick={handleReset}
                className="mt-7 inline-flex items-center justify-center rounded-xl border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 px-5 py-3 text-sm font-semibold transition hover:bg-[var(--text-primary)]/10"
              >
                {f.success.again}
              </button>
            </div>
          ) : (
            <form ref={formRef} noValidate onSubmit={handleSubmit} aria-labelledby={FORM_TITLE_ID} className="space-y-6">
              {apiError ? (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200 light:border-rose-500/30 light:bg-rose-500/10 light:text-rose-700"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{apiError}</span>
                </div>
              ) : null}

              {/* Honeypot: off-screen and out of the tab order, so only bots fill it. */}
              <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
                <label htmlFor="training-website">{f.labels.honeypot}</label>
                <input ref={honeypotRef} id="training-website" name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <FieldWrapper label={f.labels.name} htmlFor={fieldId("name")} error={errors.name}>
                  <input
                    id={fieldId("name")}
                    type="text"
                    autoComplete="name"
                    aria-required="true"
                    {...describe("name")}
                    value={form.name}
                    maxLength={formLimits.name}
                    onChange={(event) => update("name", event.target.value)}
                    placeholder={f.placeholders.name}
                    className={`${fieldClass} ${errors.name ? errorFieldClass : ""}`}
                  />
                </FieldWrapper>

                <FieldWrapper label={f.labels.contactMethod} htmlFor={fieldId("contactMethod")} error={errors.contactMethod}>
                  <SelectField<ContactMethod>
                    id={fieldId("contactMethod")}
                    value={form.contactMethod}
                    onChange={(value) => update("contactMethod", value)}
                    options={contactMethodOptions}
                    getLabel={(value) => f.options.contactMethod[value]}
                    hasError={Boolean(errors.contactMethod)}
                    describedBy={describe("contactMethod")["aria-describedby"]}
                  />
                </FieldWrapper>

                <FieldWrapper label={f.labels.phone} htmlFor={fieldId("phone")} error={errors.phone}>
                  <input
                    id={fieldId("phone")}
                    type="tel"
                    autoComplete="tel"
                    {...describe("phone", CONTACT_HINT_ID)}
                    value={form.phone}
                    onChange={(event) => update("phone", event.target.value)}
                    placeholder="+7 (700) 000-00-00"
                    className={`${fieldClass} ${errors.phone ? errorFieldClass : ""}`}
                  />
                </FieldWrapper>

                <FieldWrapper label={f.labels.email} htmlFor={fieldId("email")} error={errors.email}>
                  <input
                    id={fieldId("email")}
                    type="email"
                    autoComplete="email"
                    {...describe("email", CONTACT_HINT_ID)}
                    value={form.email}
                    onChange={(event) => update("email", event.target.value)}
                    placeholder="you@example.kz"
                    className={`${fieldClass} ${errors.email ? errorFieldClass : ""}`}
                  />
                </FieldWrapper>
              </div>

              <p id={CONTACT_HINT_ID} className="text-xs text-slate-500 light:text-slate-600">
                {f.contactHint}
              </p>

              <div className="grid gap-6 sm:grid-cols-2">
                <FieldWrapper label={tr.labels.level} htmlFor={fieldId("level")} error={errors.level}>
                  <SelectField<TrainingLevelId | "">
                    id={fieldId("level")}
                    value={form.level}
                    onChange={(value) => update("level", value)}
                    options={trainingLevelIds}
                    getLabel={(value) => (value ? tr.levels[value] : value)}
                    placeholder={tr.placeholders.level}
                    hasError={Boolean(errors.level)}
                    describedBy={describe("level")["aria-describedby"]}
                    required
                  />
                </FieldWrapper>

                <FieldWrapper label={tr.labels.direction} htmlFor={fieldId("direction")} error={errors.direction}>
                  <SelectField<TrainingDirectionId | "">
                    id={fieldId("direction")}
                    value={form.direction}
                    onChange={(value) => update("direction", value)}
                    options={trainingDirectionIds}
                    getLabel={(value) => (value ? tr.directions[value] : value)}
                    placeholder={tr.placeholders.direction}
                    hasError={Boolean(errors.direction)}
                    describedBy={describe("direction")["aria-describedby"]}
                    required
                  />
                </FieldWrapper>
              </div>

              <FieldWrapper label={tr.labels.goal} htmlFor={fieldId("goal")} error={errors.goal}>
                <textarea
                  id={fieldId("goal")}
                  rows={4}
                  aria-required="true"
                  {...describe("goal")}
                  value={form.goal}
                  maxLength={TRAINING_GOAL_MAX_LENGTH}
                  onChange={(event) => update("goal", event.target.value)}
                  placeholder={tr.placeholders.goal}
                  className={`${fieldClass} resize-none ${errors.goal ? errorFieldClass : ""}`}
                />
              </FieldWrapper>

              <div>
                <label className="flex items-start gap-3 text-sm text-slate-300 light:text-slate-700">
                  <input
                    id={fieldId("consent")}
                    type="checkbox"
                    aria-required="true"
                    {...describe("consent")}
                    checked={form.consent}
                    onChange={(event) => update("consent", event.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-violet-500"
                  />
                  {f.labels.consent}
                </label>
                {errors.consent ? (
                  <p id={fieldErrorId(fieldId("consent"))} className="mt-1.5 text-xs text-rose-400">
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
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
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
        {aside}
      </div>
    </section>
  );
}

/** Prefixed ids: never the same as the project request form's ids. */
function fieldId(field: string): string {
  return `training-${field}`;
}
