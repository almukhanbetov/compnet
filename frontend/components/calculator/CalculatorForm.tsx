"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import FieldWrapper from "@/components/ui/FieldWrapper";
import SelectField from "@/components/ui/SelectField";
import CalculatorResult from "@/components/calculator/CalculatorResult";
import {
  projectPricingList,
  calculatorModules,
  designLevels,
  complexityLevels,
  urgencyLevels,
  siteScaleTiers,
  appScaleTiers,
} from "@/data/projectPricing";
import { calculateProjectEstimate } from "@/lib/pricingCalculator";
import type {
  ProjectPricingLabel,
  ProjectPricingScale,
  ScaleTier,
  CalculatorModuleId,
  DesignLevelId,
  ComplexityId,
  UrgencyId,
} from "@/types/projectPricing";

const projectTypeLabels = projectPricingList.map((item) => item.label);

interface CalculatorFormState {
  projectType: ProjectPricingLabel | "";
  scaleTierId: string;
  selectedModules: CalculatorModuleId[];
  externalApiCount: number;
  multilingual: boolean;
  designLevelId: DesignLevelId;
  complexityId: ComplexityId;
  urgencyId: UrgencyId;
}

const initialState: CalculatorFormState = {
  projectType: "",
  scaleTierId: "",
  selectedModules: [],
  externalApiCount: 1,
  multilingual: false,
  designLevelId: "basic",
  complexityId: "standard",
  urgencyId: "normal",
};

function scaleTiersFor(category: ProjectPricingScale | undefined): ScaleTier[] {
  if (category === "site") return siteScaleTiers;
  if (category === "app") return appScaleTiers;
  return [];
}

const pillClass = (isActive: boolean) =>
  `rounded-xl border px-4 py-2 text-sm font-medium transition ${
    isActive
      ? "border-transparent bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-[0_0_20px_rgba(124,58,237,0.35)]"
      : "border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 text-slate-300 light:text-slate-700 hover:bg-[var(--text-primary)]/10"
  }`;

const groupLabelClass = "text-sm font-medium text-slate-300 light:text-slate-700";

export default function CalculatorForm() {
  const [form, setForm] = useState<CalculatorFormState>(initialState);

  const entry = projectPricingList.find(
    (item) => item.label === form.projectType,
  );
  const scaleTiers = scaleTiersFor(entry?.category);
  const scaleTier = scaleTiers.find((tier) => tier.id === form.scaleTierId);
  const scalePrice = !entry
    ? null
    : entry.category === "none"
      ? 0
      : (scaleTier?.addPrice ?? null);

  const handleProjectTypeChange = (label: ProjectPricingLabel | "") => {
    const nextEntry = projectPricingList.find((item) => item.label === label);
    const nextTiers = scaleTiersFor(nextEntry?.category);
    setForm((prev) => ({
      ...prev,
      projectType: label,
      scaleTierId: nextTiers[0]?.id ?? "",
    }));
  };

  const toggleModule = (id: CalculatorModuleId) => {
    setForm((prev) => ({
      ...prev,
      selectedModules: prev.selectedModules.includes(id)
        ? prev.selectedModules.filter((moduleId) => moduleId !== id)
        : [...prev.selectedModules, id],
    }));
  };

  const hasExternalApi = form.selectedModules.includes("external-api");

  const result = entry
    ? calculateProjectEstimate({
        basePrice: entry.basePrice,
        scalePrice,
        selectedModuleIds: form.selectedModules,
        externalApiCount: hasExternalApi ? form.externalApiCount : 0,
        multilingual: form.multilingual,
        designLevelId: form.designLevelId,
        complexityId: form.complexityId,
        urgencyId: form.urgencyId,
      })
    : null;

  const isIndividual = Boolean(entry) && (entry?.basePrice === null || scalePrice === null);

  return (
    <section className="px-6 py-8 md:py-12">
      <div className="mx-auto grid max-w-[1200px] gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8 rounded-[28px] border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.03] p-7 backdrop-blur-xl md:p-10">
          <FieldWrapper label="Тип проекта" htmlFor="calc-project-type">
            <SelectField<ProjectPricingLabel | "">
              id="calc-project-type"
              value={form.projectType}
              onChange={handleProjectTypeChange}
              options={projectTypeLabels}
              placeholder="Выберите тип проекта"
            />
          </FieldWrapper>

          {scaleTiers.length > 0 ? (
            <div>
              <p className={groupLabelClass}>
                {entry?.category === "site"
                  ? "Масштаб сайта"
                  : "Масштаб приложения"}
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                {scaleTiers.map((tier) => (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({ ...prev, scaleTierId: tier.id }))
                    }
                    aria-pressed={tier.id === form.scaleTierId}
                    className={pillClass(tier.id === form.scaleTierId)}
                  >
                    {tier.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div>
            <p className={groupLabelClass}>Дополнительные модули</p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {calculatorModules.map((module) => {
                const checked = form.selectedModules.includes(module.id);

                return (
                  <label
                    key={module.id}
                    className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 transition ${
                      checked
                        ? "border-cyan-400/40 bg-cyan-400/10"
                        : "border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.03] hover:bg-[var(--text-primary)]/[0.06]"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleModule(module.id)}
                        className="h-4 w-4 shrink-0 accent-violet-500"
                      />
                      <span className="text-sm text-slate-200 light:text-slate-800">
                        {module.label}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-slate-400 light:text-slate-600">
                      +{module.price.toLocaleString("ru-RU")} ₸
                      {module.perUnit ? " / интеграция" : ""}
                    </span>
                  </label>
                );
              })}
            </div>

            {hasExternalApi ? (
              <div className="mt-4 flex items-center gap-3">
                <span className="text-sm text-slate-400 light:text-slate-600">
                  Количество интеграций внешнего API:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Уменьшить количество интеграций"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        externalApiCount: Math.max(1, prev.externalApiCount - 1),
                      }))
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 transition hover:bg-[var(--text-primary)]/10"
                  >
                    <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <span className="w-6 text-center text-sm font-medium text-slate-200 light:text-slate-800">
                    {form.externalApiCount}
                  </span>
                  <button
                    type="button"
                    aria-label="Увеличить количество интеграций"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        externalApiCount: prev.externalApiCount + 1,
                      }))
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 transition hover:bg-[var(--text-primary)]/10"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ) : null}

            <label className="mt-4 flex w-fit cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={form.multilingual}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    multilingual: event.target.checked,
                  }))
                }
                className="h-4 w-4 shrink-0 accent-violet-500"
              />
              <span className="text-sm text-slate-200 light:text-slate-800">
                Мультиязычность{" "}
                <span className="text-slate-400 light:text-slate-600">
                  (+10%)
                </span>
              </span>
            </label>
          </div>

          <div>
            <p className={groupLabelClass}>Дизайн</p>
            <div className="mt-3 flex flex-wrap gap-3">
              {designLevels.map((level) => (
                <button
                  key={level.id}
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({ ...prev, designLevelId: level.id }))
                  }
                  aria-pressed={level.id === form.designLevelId}
                  className={pillClass(level.id === form.designLevelId)}
                >
                  {level.label}
                  {level.percent > 0 ? ` +${level.percent * 100}%` : ""}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className={groupLabelClass}>Сложность</p>
            <div className="mt-3 flex flex-wrap gap-3">
              {complexityLevels.map((level) => (
                <button
                  key={level.id}
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({ ...prev, complexityId: level.id }))
                  }
                  aria-pressed={level.id === form.complexityId}
                  className={pillClass(level.id === form.complexityId)}
                >
                  {level.label} ×{level.multiplier.toFixed(2)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className={groupLabelClass}>Срочность</p>
            <div className="mt-3 flex flex-wrap gap-3">
              {urgencyLevels.map((level) => (
                <button
                  key={level.id}
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({ ...prev, urgencyId: level.id }))
                  }
                  aria-pressed={level.id === form.urgencyId}
                  className={pillClass(level.id === form.urgencyId)}
                >
                  {level.label} ×{level.multiplier.toFixed(2)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <CalculatorResult
          hasProjectType={Boolean(entry)}
          isIndividual={isIndividual}
          result={result}
        />
      </div>
    </section>
  );
}
