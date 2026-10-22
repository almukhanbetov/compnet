package projectrequest

import (
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/almukha/compnet-backend/internal/apperr"
	"github.com/almukha/compnet-backend/internal/domain/projectrequest"
	"github.com/almukha/compnet-backend/internal/http/dto"
)

type fakeRepository struct {
	lastRequest  projectrequest.ProjectRequest
	lastFeatures []projectrequest.Feature
	lastEstimate projectrequest.Estimate
	createCalled bool
	returnErr    error
}

func (f *fakeRepository) Create(
	_ context.Context,
	request projectrequest.ProjectRequest,
	features []projectrequest.Feature,
	estimate projectrequest.Estimate,
) (projectrequest.ProjectRequest, projectrequest.Estimate, error) {
	f.createCalled = true
	f.lastRequest = request
	f.lastFeatures = features
	f.lastEstimate = estimate

	if f.returnErr != nil {
		return projectrequest.ProjectRequest{}, projectrequest.Estimate{}, f.returnErr
	}

	request.ID = "generated-id"
	request.Status = projectrequest.StatusNew
	estimate.ID = "generated-estimate-id"
	estimate.ProjectRequestID = request.ID
	return request, estimate, nil
}

func validRequest() dto.CreateProjectRequestRequest {
	return dto.CreateProjectRequestRequest{
		Name:            "Айгерим Смагулова",
		Phone:           "+7 701 123 45 67",
		Email:           "Aigerim@Example.com",
		ProjectType:     "online-store",
		Description:     "Интернет-магазин косметики",
		ContactMethod:   "whatsapp",
		Consent:         true,
		BudgetRange:     "700 000–1 500 000 ₸",
		DesiredTimeline: "2–3 месяца",
		Calculator: dto.CalculatorSelectionInput{
			ScaleTierID:       "site-m",
			SelectedModuleIDs: []string{"online-payment", "search-filters", "external-api"},
			ExternalApiCount:  2,
			DesignLevelID:     "custom",
			ComplexityID:      "medium",
			UrgencyID:         "normal",
		},
	}
}

func TestCreateProjectRequest_Success(t *testing.T) {
	repo := &fakeRepository{}
	svc := NewService(repo)

	request, estimate, err := svc.CreateProjectRequest(context.Background(), validRequest())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !repo.createCalled {
		t.Fatalf("expected repository.Create to be called")
	}
	if request.ID != "generated-id" {
		t.Errorf("id = %q, want generated-id", request.ID)
	}
	if request.Status != projectrequest.StatusNew {
		t.Errorf("status = %q, want new", request.Status)
	}
	if repo.lastRequest.Email != "aigerim@example.com" {
		t.Errorf("email not normalized to lowercase: %q", repo.lastRequest.Email)
	}
	if repo.lastRequest.Phone != "+77011234567" {
		t.Errorf("phone not normalized: %q", repo.lastRequest.Phone)
	}
	if len(repo.lastFeatures) != 3 {
		t.Errorf("features = %d, want 3", len(repo.lastFeatures))
	}
	if estimate.MinimumTenge == nil || *estimate.MinimumTenge != 1240000 {
		t.Errorf("minimum = %v, want 1240000", estimate.MinimumTenge)
	}
	if estimate.PricingVersion == "" {
		t.Errorf("expected pricing version to be set")
	}
}

func TestCreateProjectRequest_MissingConsent(t *testing.T) {
	repo := &fakeRepository{}
	svc := NewService(repo)

	req := validRequest()
	req.Consent = false

	_, _, err := svc.CreateProjectRequest(context.Background(), req)
	assertValidationField(t, err, "consent")
	if repo.createCalled {
		t.Errorf("repository.Create should not be called on validation failure")
	}
}

func TestCreateProjectRequest_MissingContact(t *testing.T) {
	repo := &fakeRepository{}
	svc := NewService(repo)

	req := validRequest()
	req.Phone = ""
	req.Email = ""

	_, _, err := svc.CreateProjectRequest(context.Background(), req)
	assertValidationField(t, err, "phone")
	assertValidationField(t, err, "email")
}

func TestCreateProjectRequest_UnknownProjectType(t *testing.T) {
	repo := &fakeRepository{}
	svc := NewService(repo)

	req := validRequest()
	req.ProjectType = "does-not-exist"

	_, _, err := svc.CreateProjectRequest(context.Background(), req)
	assertValidationField(t, err, "project_type")
}

func TestCreateProjectRequest_UnknownModule(t *testing.T) {
	repo := &fakeRepository{}
	svc := NewService(repo)

	req := validRequest()
	req.Calculator.SelectedModuleIDs = []string{"does-not-exist"}

	_, _, err := svc.CreateProjectRequest(context.Background(), req)
	assertValidationField(t, err, "calculator.selected_module_ids")
}

func TestCreateProjectRequest_RepositoryErrorBecomesInternal(t *testing.T) {
	repo := &fakeRepository{returnErr: errors.New("connection reset")}
	svc := NewService(repo)

	_, _, err := svc.CreateProjectRequest(context.Background(), validRequest())

	var appErr *apperr.Error
	if !errors.As(err, &appErr) {
		t.Fatalf("expected *apperr.Error, got %T", err)
	}
	if appErr.Code != apperr.CodeInternal {
		t.Errorf("code = %q, want internal_error", appErr.Code)
	}
	if appErr.Message == "connection reset" {
		t.Errorf("internal error message leaked underlying DB error to the client-facing message")
	}
}

type countingNotifier struct{ calls int }

func (n *countingNotifier) RequestCreated(context.Context, string) { n.calls++ }

type countingRecorder struct{ calls int }

func (r *countingRecorder) LeadCreated(context.Context, string, string) { r.calls++ }

func TestCreateProjectRequest_HoneypotDiscardedSilently(t *testing.T) {
	invalid := validRequest()
	invalid.Name, invalid.Consent = "", false

	for name, req := range map[string]dto.CreateProjectRequestRequest{"valid": validRequest(), "invalid": invalid} {
		t.Run(name, func(t *testing.T) {
			repo := &fakeRepository{}
			notifier, recorder := &countingNotifier{}, &countingRecorder{}
			svc := NewService(repo)
			svc.SetNotifier(notifier)
			svc.SetConversionRecorder(recorder)

			req.Website = "https://spam.example"
			req.AnalyticsSessionID = "session"
			request, estimate, err := svc.CreateProjectRequest(context.Background(), req)
			if err != nil {
				t.Fatalf("bot must get a success, got %v", err)
			}
			if repo.createCalled || notifier.calls != 0 || recorder.calls != 0 {
				t.Fatalf("bot request stored or announced: create=%v notify=%d lead=%d",
					repo.createCalled, notifier.calls, recorder.calls)
			}
			if len(request.ID) != 36 || request.Status != projectrequest.StatusNew || request.CreatedAt.IsZero() {
				t.Errorf("fake request does not look saved: %+v", request)
			}
			if !estimate.IsIndividual || estimate.MinimumTenge != nil {
				t.Errorf("fake estimate: %+v", estimate)
			}
		})
	}
}

func TestCreateProjectRequest_EmptyHoneypotIsSaved(t *testing.T) {
	repo := &fakeRepository{}
	notifier := &countingNotifier{}
	svc := NewService(repo)
	svc.SetNotifier(notifier)

	req := validRequest()
	req.Website = "  "
	if _, _, err := svc.CreateProjectRequest(context.Background(), req); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !repo.createCalled || notifier.calls != 1 {
		t.Fatalf("create=%v notify=%d, want saved and announced once", repo.createCalled, notifier.calls)
	}
}

// 1500 Cyrillic letters are 3000 bytes: rejected while lengths were bytes.
func TestCreateProjectRequest_LongCyrillicDescriptionSaved(t *testing.T) {
	repo := &fakeRepository{}
	svc := NewService(repo)

	req := validRequest()
	req.Description = strings.Repeat("ж", 1500)
	if _, _, err := svc.CreateProjectRequest(context.Background(), req); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if repo.lastRequest.Description != req.Description {
		t.Errorf("description not stored intact")
	}
}

func assertValidationField(t *testing.T, err error, field string) {
	t.Helper()

	var appErr *apperr.Error
	if !errors.As(err, &appErr) {
		t.Fatalf("expected *apperr.Error, got %T (%v)", err, err)
	}
	if appErr.Code != apperr.CodeValidation {
		t.Fatalf("code = %q, want validation_error", appErr.Code)
	}
	if _, ok := appErr.Fields[field]; !ok {
		t.Errorf("expected validation error on field %q, got fields %v", field, appErr.Fields)
	}
}
