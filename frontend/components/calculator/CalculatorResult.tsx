import { Calculator as CalculatorIcon, Clock, Info } from "lucide-react";
import type { CalculatorResult as CalculatorResultData } from "@/types/projectPricing";

interface CalculatorResultProps {
  hasProjectType: boolean;
  isIndividual: boolean;
  result: CalculatorResultData | null;
}

export default function CalculatorResult({
  hasProjectType,
  isIndividual,
  result,
}: CalculatorResultProps) {
  return (
    <div className="rounded-2xl border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.03] p-7 backdrop-blur-xl lg:sticky lg:top-24">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600/30 to-cyan-400/20 text-cyan-300 light:text-cyan-700">
        <CalculatorIcon className="h-5 w-5" aria-hidden="true" />
      </span>

      <p className="mt-4 text-lg font-semibold text-slate-100 light:text-slate-900">
        Предварительная стоимость
      </p>

      {!hasProjectType ? (
        <p className="mt-3 text-sm leading-6 text-slate-400 light:text-slate-600">
          Выберите тип проекта, чтобы увидеть расчёт.
        </p>
      ) : isIndividual || !result ? (
        <p className="mt-3 bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-300 bg-clip-text text-2xl font-bold text-transparent light:from-violet-600 light:via-blue-600 light:to-cyan-600">
          Индивидуальная оценка
        </p>
      ) : (
        <>
          <p className="mt-3 bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-300 bg-clip-text text-2xl font-bold text-transparent light:from-violet-600 light:via-blue-600 light:to-cyan-600 md:text-3xl">
            от {result.minimum.toLocaleString("ru-RU")} ₸ до{" "}
            {result.maximum.toLocaleString("ru-RU")} ₸
          </p>

          <p className="mt-4 flex items-center gap-2 text-sm text-slate-300 light:text-slate-700">
            <Clock
              className="h-4 w-4 shrink-0 text-cyan-300 light:text-cyan-700"
              aria-hidden="true"
            />
            Ориентировочный срок: {result.durationLabel}
          </p>
        </>
      )}

      <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 light:border-cyan-600/30 light:bg-cyan-500/10">
        <Info
          className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300 light:text-cyan-700"
          aria-hidden="true"
        />
        <p className="text-xs leading-5 text-cyan-100 light:text-cyan-900">
          Стоимость указана ориентировочно. Итоговая цена зависит от
          функционала, дизайна, интеграций, сроков и сложности проекта.
        </p>
      </div>
    </div>
  );
}
