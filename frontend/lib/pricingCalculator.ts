import {
  calculatorModules,
  designLevels,
  complexityLevels,
  urgencyLevels,
  MULTILINGUAL_PERCENT,
  getDurationLabel,
} from "@/data/projectPricing";
import type {
  CalculatorModuleId,
  DesignLevelId,
  ComplexityId,
  UrgencyId,
  CalculatorResult,
} from "@/types/projectPricing";

const ROUND_STEP = 10000;

function roundToStep(value: number): number {
  return Math.round(value / ROUND_STEP) * ROUND_STEP;
}

export interface CalculateEstimateInput {
  basePrice: number | null;
  scalePrice: number | null;
  selectedModuleIds: CalculatorModuleId[];
  externalApiCount: number;
  multilingual: boolean;
  designLevelId: DesignLevelId;
  complexityId: ComplexityId;
  urgencyId: UrgencyId;
}

export function calculateProjectEstimate(
  input: CalculateEstimateInput,
): CalculatorResult | null {
  if (input.basePrice === null || input.scalePrice === null) {
    return null;
  }

  const modulesTotal = input.selectedModuleIds.reduce((sum, id) => {
    const selectedModule = calculatorModules.find((item) => item.id === id);
    if (!selectedModule) {
      return sum;
    }
    if (selectedModule.perUnit) {
      return sum + selectedModule.price * Math.max(input.externalApiCount, 0);
    }
    return sum + selectedModule.price;
  }, 0);

  const subtotal = input.basePrice + input.scalePrice + modulesTotal;

  const designLevel =
    designLevels.find((item) => item.id === input.designLevelId) ??
    designLevels[0];
  const designAmount = subtotal * designLevel.percent;
  const multilingualAmount = input.multilingual
    ? subtotal * MULTILINGUAL_PERCENT
    : 0;

  const subtotalWithPercents = subtotal + designAmount + multilingualAmount;

  const complexity =
    complexityLevels.find((item) => item.id === input.complexityId) ??
    complexityLevels[0];
  const urgency =
    urgencyLevels.find((item) => item.id === input.urgencyId) ??
    urgencyLevels[0];

  const estimated =
    subtotalWithPercents * complexity.multiplier * urgency.multiplier;

  const minimum = roundToStep(estimated);
  const maximum = roundToStep(minimum * 1.2);

  return {
    minimum,
    maximum,
    durationLabel: getDurationLabel(minimum),
  };
}
