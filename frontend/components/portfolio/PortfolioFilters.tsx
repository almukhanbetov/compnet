import { portfolioFilterValues } from "@/data/portfolioPage";
import type { PortfolioFilterValue } from "@/types/portfolioPage";

interface PortfolioFiltersProps {
  active: PortfolioFilterValue;
  onChange: (value: PortfolioFilterValue) => void;
}

export default function PortfolioFilters({
  active,
  onChange,
}: PortfolioFiltersProps) {
  return (
    <div
      className="flex flex-wrap justify-center gap-3"
      role="group"
      aria-label="Фильтр проектов по категории"
    >
      {portfolioFilterValues.map((value) => {
        const isActive = value === active;

        return (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value)}
            aria-pressed={isActive}
            className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
              isActive
                ? "border-transparent bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-[0_0_20px_rgba(124,58,237,0.35)]"
                : "border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 text-slate-300 light:text-slate-700 hover:bg-[var(--text-primary)]/10"
            }`}
          >
            {value}
          </button>
        );
      })}
    </div>
  );
}
