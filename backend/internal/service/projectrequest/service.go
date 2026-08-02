// Package projectrequest orchestrates project-request creation: structural
// validation, server-side price calculation, and transactional persistence.
// Handlers stay thin; this is where the business rules live.
package projectrequest

import (
	"context"
	"errors"
	"strings"

	"github.com/almukha/compnet-backend/internal/apperr"
	"github.com/almukha/compnet-backend/internal/domain/projectrequest"
	"github.com/almukha/compnet-backend/internal/http/dto"
	"github.com/almukha/compnet-backend/internal/pricing"
)

// Repository persists a project request, its selected features and its
// estimate as a single unit of work.
type Repository interface {
	Create(
		ctx context.Context,
		request projectrequest.ProjectRequest,
		features []projectrequest.Feature,
		estimate projectrequest.Estimate,
	) (projectrequest.ProjectRequest, projectrequest.Estimate, error)
}

// Service implements the project-request use cases.
type Service struct {
	repo Repository
}

// NewService builds a Service backed by the given Repository.
func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

// CreateProjectRequest validates the input, recomputes the price estimate
// from the server-side catalog (never trusting any client-supplied total),
// and persists everything transactionally.
func (s *Service) CreateProjectRequest(
	ctx context.Context,
	req dto.CreateProjectRequestRequest,
) (projectrequest.ProjectRequest, projectrequest.Estimate, error) {
	fields := req.Validate()

	calcInput := pricing.CalculateInput{
		ProjectTypeID:     strings.TrimSpace(req.ProjectType),
		ScaleTierID:       strings.TrimSpace(req.Calculator.ScaleTierID),
		SelectedModuleIDs: req.Calculator.SelectedModuleIDs,
		ExternalApiCount:  req.Calculator.ExternalApiCount,
		Multilingual:      req.Calculator.Multilingual,
		DesignLevelID:     strings.TrimSpace(req.Calculator.DesignLevelID),
		ComplexityID:      strings.TrimSpace(req.Calculator.ComplexityID),
		UrgencyID:         strings.TrimSpace(req.Calculator.UrgencyID),
	}

	calcResult, calcErr := pricing.Calculate(calcInput)
	if calcErr != nil {
		mergeCalcError(fields, calcErr)
	}

	if len(fields) > 0 {
		return projectrequest.ProjectRequest{}, projectrequest.Estimate{}, apperr.Validation("проверьте введённые данные", fields)
	}

	request := projectrequest.ProjectRequest{
		Name:            strings.TrimSpace(req.Name),
		Phone:           dto.NormalizedPhone(req.Phone),
		Email:           dto.NormalizedEmail(req.Email),
		Company:         strings.TrimSpace(req.Company),
		ProjectType:     calcInput.ProjectTypeID,
		Description:     strings.TrimSpace(req.Description),
		BudgetRange:     strings.TrimSpace(req.BudgetRange),
		DesiredTimeline: strings.TrimSpace(req.DesiredTimeline),
		ContactMethod:   projectrequest.ContactMethod(strings.ToLower(strings.TrimSpace(req.ContactMethod))),
		Consent:         req.Consent,
		Status:          projectrequest.StatusNew,
	}

	features := make([]projectrequest.Feature, 0, len(calcResult.Modules))
	breakdownModules := make([]projectrequest.BreakdownModule, 0, len(calcResult.Modules))
	for _, m := range calcResult.Modules {
		breakdownModules = append(breakdownModules, projectrequest.BreakdownModule{
			ModuleID:       m.ModuleID,
			Quantity:       m.Quantity,
			UnitPriceTenge: m.UnitPriceTenge,
			TotalTenge:     m.TotalTenge,
		})
		if m.Quantity <= 0 {
			// A per-unit module selected with a zero effective quantity
			// contributes nothing; skip persisting a feature row for it
			// (the quantity>0 DB constraint would otherwise reject it).
			continue
		}
		features = append(features, projectrequest.Feature{
			ModuleID:       m.ModuleID,
			Quantity:       m.Quantity,
			UnitPriceTenge: m.UnitPriceTenge,
		})
	}

	estimate := projectrequest.Estimate{
		PricingVersion: pricing.RulesVersion,
		IsIndividual:   calcResult.IsIndividual,
		MinimumTenge:   calcResult.MinimumTenge,
		MaximumTenge:   calcResult.MaximumTenge,
		DurationLabel:  calcResult.DurationLabel,
		Breakdown: projectrequest.EstimateBreakdown{
			ProjectType:             calcInput.ProjectTypeID,
			ScaleTierID:             calcInput.ScaleTierID,
			DesignLevelID:           calcInput.DesignLevelID,
			ComplexityID:            calcInput.ComplexityID,
			UrgencyID:               calcInput.UrgencyID,
			Multilingual:            calcInput.Multilingual,
			BasePriceTenge:          calcResult.BasePriceTenge,
			ScalePriceTenge:         calcResult.ScalePriceTenge,
			Modules:                 breakdownModules,
			ModulesTotalTenge:       calcResult.ModulesTotalTenge,
			DesignAmountTenge:       calcResult.DesignAmountTenge,
			MultilingualAmountTenge: calcResult.MultilingualAmountTenge,
			SubtotalTenge:           calcResult.SubtotalTenge,
			EstimatedRawTenge:       calcResult.EstimatedRawTenge,
		},
	}

	savedRequest, savedEstimate, err := s.repo.Create(ctx, request, features, estimate)
	if err != nil {
		return projectrequest.ProjectRequest{}, projectrequest.Estimate{}, apperr.Internal(err)
	}

	return savedRequest, savedEstimate, nil
}

// mergeCalcError adds a message for the field responsible for a pricing
// catalog error, without overwriting a more specific message already set by
// structural validation (e.g. an empty project_type is reported once, not
// twice).
func mergeCalcError(fields map[string]string, err error) {
	var key, message string
	switch {
	case errors.Is(err, pricing.ErrUnknownProjectType):
		key, message = "project_type", "неизвестный тип проекта"
	case errors.Is(err, pricing.ErrUnknownScaleTier):
		key, message = "calculator.scale_tier_id", "укажите корректный вариант масштаба для выбранного типа проекта"
	case errors.Is(err, pricing.ErrUnknownModule), errors.Is(err, pricing.ErrDuplicateModule):
		key, message = "calculator.selected_module_ids", "неизвестный или повторяющийся модуль"
	case errors.Is(err, pricing.ErrUnknownDesignLevel):
		key, message = "calculator.design_level_id", "недопустимое значение"
	case errors.Is(err, pricing.ErrUnknownComplexity):
		key, message = "calculator.complexity_id", "недопустимое значение"
	case errors.Is(err, pricing.ErrUnknownUrgency):
		key, message = "calculator.urgency_id", "недопустимое значение"
	default:
		key, message = "calculator", "не удалось рассчитать стоимость"
	}

	if _, exists := fields[key]; !exists {
		fields[key] = message
	}
}
