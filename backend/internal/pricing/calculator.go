package pricing

import (
	"errors"
	"math"
)

// Sentinel errors returned when the client selects a catalog entry that
// does not exist. Callers map these to per-field validation messages.
var (
	ErrUnknownProjectType = errors.New("unknown project_type")
	ErrUnknownScaleTier   = errors.New("unknown or mismatched scale_tier_id")
	ErrUnknownModule      = errors.New("unknown module id")
	ErrDuplicateModule    = errors.New("duplicate module id")
	ErrUnknownDesignLevel = errors.New("unknown design_level_id")
	ErrUnknownComplexity  = errors.New("unknown complexity_id")
	ErrUnknownUrgency     = errors.New("unknown urgency_id")
)

// CalculateInput is everything the client may choose. It never carries a
// price — only catalog ids and quantities.
type CalculateInput struct {
	ProjectTypeID     string
	ScaleTierID       string
	SelectedModuleIDs []string
	ExternalApiCount  int
	Multilingual      bool
	DesignLevelID     string
	ComplexityID      string
	UrgencyID         string
}

// ModuleLine is one priced module selection.
type ModuleLine struct {
	ModuleID       string
	Quantity       int
	UnitPriceTenge int64
	TotalTenge     int64
}

// Result is the full server-computed estimate, including every
// intermediate amount needed for the audit breakdown.
type Result struct {
	IsIndividual            bool
	BasePriceTenge          *int64
	ScalePriceTenge         *int64
	Modules                 []ModuleLine
	ModulesTotalTenge       int64
	SubtotalTenge           *int64
	DesignAmountTenge       int64
	MultilingualAmountTenge int64
	EstimatedRawTenge       *int64
	MinimumTenge            *int64
	MaximumTenge            *int64
	DurationLabel           string
}

// Calculate is Catalog.Calculate on the seed base prices (no database:
// unit tests and parity cases without a published catalog).
func Calculate(input CalculateInput) (Result, error) {
	return SeedCatalog().Calculate(input)
}

// Calculate is the estimate formula with the catalog's base prices;
// frontend/lib/pricingCalculator.ts repeats it in the browser on the
// published catalog (e2e/pricing/parity.mjs checks that both agree). It
// looks up every id itself — the caller must not pass pre-resolved prices.
func (c Catalog) Calculate(input CalculateInput) (Result, error) {
	projectType, ok := FindProjectType(input.ProjectTypeID)
	if !ok {
		return Result{}, ErrUnknownProjectType
	}
	basePrice := c.BasePrice(projectType.ID).PriceTenge

	designLevel, ok := FindDesignLevel(input.DesignLevelID)
	if !ok {
		return Result{}, ErrUnknownDesignLevel
	}

	complexity, ok := FindComplexityLevel(input.ComplexityID)
	if !ok {
		return Result{}, ErrUnknownComplexity
	}

	urgency, ok := FindUrgencyLevel(input.UrgencyID)
	if !ok {
		return Result{}, ErrUnknownUrgency
	}

	var scalePrice *int64
	if projectType.Category == ScaleCategoryNone {
		scalePrice = ptr(0)
	} else {
		tier, ok := FindScaleTier(input.ScaleTierID)
		if !ok || tier.Category != projectType.Category {
			return Result{}, ErrUnknownScaleTier
		}
		scalePrice = tier.AddPriceTenge
	}

	modules := make([]ModuleLine, 0, len(input.SelectedModuleIDs))
	seen := make(map[string]bool, len(input.SelectedModuleIDs))
	var modulesTotal int64
	for _, id := range input.SelectedModuleIDs {
		if seen[id] {
			return Result{}, ErrDuplicateModule
		}
		seen[id] = true

		m, ok := FindModule(id)
		if !ok {
			return Result{}, ErrUnknownModule
		}

		qty := 1
		if m.PerUnit {
			qty = input.ExternalApiCount
			if qty < 0 {
				qty = 0
			}
		}

		total := m.PriceTenge * int64(qty)
		modules = append(modules, ModuleLine{
			ModuleID:       m.ID,
			Quantity:       qty,
			UnitPriceTenge: m.PriceTenge,
			TotalTenge:     total,
		})
		modulesTotal += total
	}

	result := Result{
		BasePriceTenge:    basePrice,
		ScalePriceTenge:   scalePrice,
		Modules:           modules,
		ModulesTotalTenge: modulesTotal,
	}

	if basePrice == nil || scalePrice == nil {
		result.IsIndividual = true
		result.DurationLabel = "индивидуальный срок"
		return result, nil
	}

	subtotal := *basePrice + *scalePrice + modulesTotal
	designAmount := round(float64(subtotal) * designLevel.Percent)

	var multilingualAmount int64
	if input.Multilingual {
		multilingualAmount = round(float64(subtotal) * MultilingualPercent)
	}

	subtotalWithPercents := subtotal + designAmount + multilingualAmount
	estimatedRaw := round(float64(subtotalWithPercents) * complexity.Multiplier * urgency.Multiplier)

	minimum := roundToStep(estimatedRaw)
	maximum := roundToStep(round(float64(minimum) * MaximumRatio))

	result.SubtotalTenge = &subtotal
	result.DesignAmountTenge = designAmount
	result.MultilingualAmountTenge = multilingualAmount
	result.EstimatedRawTenge = &estimatedRaw
	result.MinimumTenge = &minimum
	result.MaximumTenge = &maximum
	result.DurationLabel = DurationLabelFor(minimum)

	return result, nil
}

func round(v float64) int64 {
	return int64(math.Round(v))
}

func roundToStep(v int64) int64 {
	if v < 0 {
		v = 0
	}
	return round(float64(v)/float64(RoundStepTenge)) * RoundStepTenge
}
