// Package projectrequest orchestrates project-request creation: structural
// validation, server-side price calculation, and transactional persistence.
// Handlers stay thin; this is where the business rules live.
package projectrequest

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/almukha/compnet-backend/internal/apperr"
	"github.com/almukha/compnet-backend/internal/attribution"
	"github.com/almukha/compnet-backend/internal/domain/baseprice"
	"github.com/almukha/compnet-backend/internal/domain/projectrequest"
	"github.com/almukha/compnet-backend/internal/domain/tariff"
	"github.com/almukha/compnet-backend/internal/http/dto"
	"github.com/almukha/compnet-backend/internal/pricing"
	analyticssvc "github.com/almukha/compnet-backend/internal/service/analytics"
)

// Repository persists a project request, its selected features and its
// estimate as a single unit of work.
type Repository interface {
	Create(
		ctx context.Context,
		request projectrequest.ProjectRequest,
		features []projectrequest.Feature,
		estimate projectrequest.Estimate,
		attribution *projectrequest.Attribution,
		order *projectrequest.TariffOrder,
	) (projectrequest.ProjectRequest, projectrequest.Estimate, error)
}

// TariffQuoter prices a tariff selection (internal/service/tariffs).
type TariffQuoter interface {
	Quote(ctx context.Context, sel tariff.Selection) (tariff.Quote, error)
	ReservationTTL() time.Duration
}

// ConversionRecorder links a saved request to the visitor's analytics
// session (internal/service/analytics). Best effort, never fails the request.
type ConversionRecorder interface {
	LeadCreated(ctx context.Context, analyticsSessionID, requestID string)
}

type noRecorder struct{}

func (noRecorder) LeadCreated(context.Context, string, string) {}

// Notifier tells connected managers that a request was saved (see
// internal/service/requestevents). Best effort, after the commit.
type Notifier interface {
	RequestCreated(ctx context.Context, requestID string)
}

type noNotifier struct{}

func (noNotifier) RequestCreated(context.Context, string) {}

// Service implements the project-request use cases.
type Service struct {
	repo        Repository
	conversions ConversionRecorder
	notifier    Notifier
	tariffs     TariffQuoter
	basePrices  CatalogSource
	// attribution: request sources are stored only while the first-party
	// visit analytics is on (it is what visitors consent to).
	attribution bool
}

// NewService builds a Service backed by the given Repository.
func NewService(repo Repository) *Service {
	return &Service{repo: repo, conversions: noRecorder{}, notifier: noNotifier{}}
}

// SetNotifier enables realtime notifications of new requests.
func (s *Service) SetNotifier(n Notifier) {
	if n != nil {
		s.notifier = n
	}
}

// SetAttributionEnabled lets requests keep their source (ANALYTICS_ENABLED).
func (s *Service) SetAttributionEnabled(enabled bool) {
	s.attribution = enabled
}

// CatalogSource gives the pricing catalog with the base prices in force
// (internal/service/baseprices).
type CatalogSource interface {
	Catalog(ctx context.Context) (pricing.Catalog, error)
}

// SetBasePrices prices individual estimates with the stored base prices;
// without it the seed prices are used (tests without a database).
func (s *Service) SetBasePrices(c CatalogSource) {
	s.basePrices = c
}

// SetTariffs enables requests sent with a tariff; without it they are refused.
func (s *Service) SetTariffs(q TariffQuoter) {
	s.tariffs = q
}

// SetConversionRecorder enables linking requests to analytics sessions.
func (s *Service) SetConversionRecorder(r ConversionRecorder) {
	if r != nil {
		s.conversions = r
	}
}

// CreateProjectRequest validates the input, recomputes the price estimate
// from the server-side catalog (never trusting any client-supplied total),
// and persists everything transactionally.
func (s *Service) CreateProjectRequest(
	ctx context.Context,
	req dto.CreateProjectRequestRequest,
) (projectrequest.ProjectRequest, projectrequest.Estimate, error) {
	// Checked before validation: a bot gets the same 201 whatever else it
	// sent, so error messages never tell it the honeypot was noticed.
	if req.IsBot() {
		return discardBotRequest()
	}

	fields := req.Validate()

	var (
		projectType string
		features    []projectrequest.Feature
		estimate    projectrequest.Estimate
		order       *projectrequest.TariffOrder
	)
	if req.Tariff != nil {
		projectType, features, estimate, order = s.tariffEstimate(ctx, *req.Tariff, fields)
	} else {
		var err error
		if projectType, features, estimate, err = s.calculatorEstimate(ctx, req, fields); err != nil {
			return projectrequest.ProjectRequest{}, projectrequest.Estimate{}, err
		}
	}

	if len(fields) > 0 {
		return projectrequest.ProjectRequest{}, projectrequest.Estimate{}, apperr.Validation("проверьте введённые данные", fields)
	}

	request := projectrequest.ProjectRequest{
		Name:            strings.TrimSpace(req.Name),
		Phone:           dto.NormalizedPhone(req.Phone),
		Email:           dto.NormalizedEmail(req.Email),
		Company:         strings.TrimSpace(req.Company),
		ProjectType:     projectType,
		Description:     strings.TrimSpace(req.Description),
		BudgetRange:     strings.TrimSpace(req.BudgetRange),
		DesiredTimeline: strings.TrimSpace(req.DesiredTimeline),
		ContactMethod:   projectrequest.ContactMethod(strings.ToLower(strings.TrimSpace(req.ContactMethod))),
		Consent:         req.Consent,
		Status:          projectrequest.StatusNew,
	}

	var source *projectrequest.Attribution
	if s.attribution {
		source = attributionFrom(req)
	}
	savedRequest, savedEstimate, err := s.repo.Create(ctx, request, features, estimate, source, order)
	if errors.Is(err, baseprice.ErrPriceChanged) && req.ExpectedBasePriceTenge == nil {
		// The base price changed while saving, and this client was shown no
		// amount (an older page): priced again with the new one, once.
		if _, features, estimate, err = s.calculatorEstimate(ctx, req, map[string]string{}); err == nil {
			savedRequest, savedEstimate, err = s.repo.Create(ctx, request, features, estimate, source, order)
		}
	}
	if errors.Is(err, baseprice.ErrPriceChanged) {
		return projectrequest.ProjectRequest{}, projectrequest.Estimate{}, priceChanged()
	}
	if errors.Is(err, tariff.ErrPriceChanged) {
		return projectrequest.ProjectRequest{}, projectrequest.Estimate{}, apperr.Conflict("стоимость тарифа изменилась — проверьте новую сумму и отправьте заявку ещё раз")
	}
	if err != nil {
		return projectrequest.ProjectRequest{}, projectrequest.Estimate{}, apperr.Internal(err)
	}
	// Saved: only now does it count as a request in the statistics.
	if req.AnalyticsSessionID != "" {
		s.conversions.LeadCreated(ctx, req.AnalyticsSessionID, savedRequest.ID)
	}
	s.notifier.RequestCreated(ctx, savedRequest.ID)

	return savedRequest, savedEstimate, nil
}

// tariffEstimate prices a request sent with a tariff: the server's quote of
// the tariff and its extra modules (never a client's amount). The project
// type is the tariff version's. The promotional place is reserved — or not —
// when the request is saved (repository), which sets the final price and
// refuses the request when it is not the one the visitor was shown.
func (s *Service) tariffEstimate(ctx context.Context, sel dto.TariffSelectionInput, fields map[string]string) (string, []projectrequest.Feature, projectrequest.Estimate, *projectrequest.TariffOrder) {
	if s.tariffs == nil {
		fields["tariff.slug"] = "тарифы недоступны"
		return "", nil, projectrequest.Estimate{}, nil
	}
	if len(fields) > 0 {
		return "", nil, projectrequest.Estimate{}, nil
	}
	q, err := s.tariffs.Quote(ctx, tariff.Selection{Slug: sel.Slug, ModuleIDs: sel.ModuleIDs, ExternalApiCount: sel.ExternalApiCount})
	switch {
	case errors.Is(err, tariff.ErrNotFound):
		fields["tariff.slug"] = "этот тариф сейчас недоступен"
		return "", nil, projectrequest.Estimate{}, nil
	case errors.Is(err, tariff.ErrModuleNotAllowed), errors.Is(err, tariff.ErrDuplicateModule):
		fields["tariff.module_ids"] = "модуль недоступен для этого тарифа"
		return "", nil, projectrequest.Estimate{}, nil
	case err != nil:
		log.Printf("projectrequest: tariff quote failed: %v", err)
		fields["tariff.slug"] = "не удалось рассчитать стоимость тарифа"
		return "", nil, projectrequest.Estimate{}, nil
	}
	// The amount the visitor was shown is compared when the request is saved;
	// without one (an outdated page) the visitor is asked to check the price.
	if sel.ExpectedFinalPriceTenge <= 0 {
		fields["tariff.expected_final_price_tenge"] = "обновите страницу и проверьте стоимость"
		return "", nil, projectrequest.Estimate{}, nil
	}

	features := make([]projectrequest.Feature, 0, len(q.Modules))
	breakdownModules := make([]projectrequest.BreakdownModule, 0, len(q.Modules))
	for _, m := range q.Modules {
		breakdownModules = append(breakdownModules, projectrequest.BreakdownModule{
			ModuleID: m.ModuleID, Quantity: m.Quantity, UnitPriceTenge: m.UnitPriceTenge, TotalTenge: m.TotalTenge,
		})
		if m.Quantity > 0 {
			features = append(features, projectrequest.Feature{ModuleID: m.ModuleID, Quantity: m.Quantity, UnitPriceTenge: m.UnitPriceTenge})
		}
	}
	base := q.BasePriceTenge
	final := q.FinalTenge
	estimate := projectrequest.Estimate{
		PricingVersion: fmt.Sprintf("tariff:%s@%d", q.Slug, q.Version),
		MinimumTenge:   &final,
		MaximumTenge:   &final,
		DurationLabel:  q.DurationLabel,
		Breakdown: projectrequest.EstimateBreakdown{
			ProjectType:       q.ProjectType,
			BasePriceTenge:    &base,
			Modules:           breakdownModules,
			ModulesTotalTenge: q.ModulesTotalTenge,
		},
	}
	return q.ProjectType, features, estimate, &projectrequest.TariffOrder{
		Quote: q, ExpectedFinalTenge: sel.ExpectedFinalPriceTenge, ReservationTTL: s.tariffs.ReservationTTL(),
	}
}

func priceChanged() error {
	return apperr.Conflict("стоимость изменилась — проверьте новую сумму и отправьте заявку ещё раз")
}

// calculatorEstimate is the individual estimate: the Go catalog's formula
// on the request's calculator selection, with the base prices in force. A
// base price shown to the visitor (ExpectedBasePriceTenge) must be the one
// in force: otherwise 409. The version used is checked again when the
// request is saved (repository).
func (s *Service) calculatorEstimate(ctx context.Context, req dto.CreateProjectRequestRequest, fields map[string]string) (string, []projectrequest.Feature, projectrequest.Estimate, error) {
	catalog := pricing.SeedCatalog()
	if s.basePrices != nil {
		c, err := s.basePrices.Catalog(ctx)
		if err != nil {
			return "", nil, projectrequest.Estimate{}, err
		}
		catalog = c
	}
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

	calcResult, calcErr := catalog.Calculate(calcInput)
	if calcErr != nil {
		mergeCalcError(fields, calcErr)
	}
	base := catalog.BasePrice(calcInput.ProjectTypeID)
	if want := req.ExpectedBasePriceTenge; want != nil && calcErr == nil && len(fields) == 0 &&
		(base.PriceTenge == nil || *base.PriceTenge != *want) {
		return "", nil, projectrequest.Estimate{}, priceChanged()
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
		PricingVersion:     pricing.RulesVersion,
		IsIndividual:       calcResult.IsIndividual,
		MinimumTenge:       calcResult.MinimumTenge,
		MaximumTenge:       calcResult.MaximumTenge,
		DurationLabel:      calcResult.DurationLabel,
		BasePriceVersionID: base.VersionID,
		Breakdown: projectrequest.EstimateBreakdown{
			ProjectType:             calcInput.ProjectTypeID,
			ScaleTierID:             calcInput.ScaleTierID,
			DesignLevelID:           calcInput.DesignLevelID,
			ComplexityID:            calcInput.ComplexityID,
			UrgencyID:               calcInput.UrgencyID,
			Multilingual:            calcInput.Multilingual,
			BasePriceTenge:          calcResult.BasePriceTenge,
			BasePriceVersion:        base.Version,
			ScalePriceTenge:         calcResult.ScalePriceTenge,
			Modules:                 breakdownModules,
			ModulesTotalTenge:       calcResult.ModulesTotalTenge,
			DesignAmountTenge:       calcResult.DesignAmountTenge,
			MultilingualAmountTenge: calcResult.MultilingualAmountTenge,
			SubtotalTenge:           calcResult.SubtotalTenge,
			EstimatedRawTenge:       calcResult.EstimatedRawTenge,
		},
	}

	return calcInput.ProjectTypeID, features, estimate, nil
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

// discardBotRequest answers a honeypot submission like a saved request
// with an individual estimate, but stores nothing and notifies no one.
func discardBotRequest() (projectrequest.ProjectRequest, projectrequest.Estimate, error) {
	log.Println("projectrequest: honeypot filled, request discarded") // no content in logs
	return projectrequest.ProjectRequest{
			ID:        randomUUID(),
			Status:    projectrequest.StatusNew,
			CreatedAt: time.Now().UTC(),
		},
		projectrequest.Estimate{IsIndividual: true, PricingVersion: pricing.RulesVersion},
		nil
}

// randomUUID returns a version 4 UUID, shaped like the ids PostgreSQL issues.
func randomUUID() string {
	var b [16]byte
	_, _ = rand.Read(b[:])
	b[6] = b[6]&0x0f | 0x40
	b[8] = b[8]&0x3f | 0x80
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}

// attributionFrom turns what the browser reported about its visit into the
// stored attribution, or nil when there is nothing to keep. The form sends
// it only with analytics consent, always together with its analytics
// session id; without a valid id the data is dropped. Values are
// sanitized like the visit analytics (paths without query strings, host
// names only, short UTM texts); an invalid value is dropped, it never
// rejects the request. Channel and source are derived here.
func attributionFrom(req dto.CreateProjectRequestRequest) *projectrequest.Attribution {
	in := req.Attribution
	if in == nil || !analyticssvc.ValidUUID(req.AnalyticsSessionID) {
		return nil
	}
	clickID := strings.ToLower(strings.TrimSpace(in.ClickID))
	if !attribution.ClickIDs[clickID] {
		clickID = ""
	}
	a := projectrequest.Attribution{
		SourcePage:   analyticssvc.CleanPath(in.SourcePage),
		PreviousPage: analyticssvc.CleanPath(in.PreviousPage),
		LandingPage:  analyticssvc.CleanPath(in.LandingPage),
		ReferrerHost: analyticssvc.CleanHost(in.ReferrerHost),
		UTMSource:    analyticssvc.CleanText(in.UTMSource),
		UTMMedium:    analyticssvc.CleanText(in.UTMMedium),
		UTMCampaign:  analyticssvc.CleanText(in.UTMCampaign),
		UTMContent:   analyticssvc.CleanText(in.UTMContent),
		UTMTerm:      analyticssvc.CleanText(in.UTMTerm),
		ClickIDType:  clickID,
	}
	if a.PreviousPage == a.SourcePage {
		a.PreviousPage = ""
	}
	result := attribution.Classify(attribution.Input{
		UTMSource:    a.UTMSource,
		UTMMedium:    a.UTMMedium,
		ReferrerHost: a.ReferrerHost,
		ClickID:      a.ClickIDType,
		LandingPath:  a.LandingPage,
		// Only matters without referrer, tags and click id.
		InternalNavigation: in.InternalNavigation,
	})
	a.Channel, a.Source = string(result.Channel), result.Source
	return &a
}
