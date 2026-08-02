// Package pricing owns the server-side price catalog and calculator. It is
// the single source of truth for cost estimates — clients may only choose
// from these catalog entries, never supply a price directly. The catalog
// mirrors frontend/data/projectPricing.ts; keep the two in sync by hand
// until pricing is served from the database.
package pricing

// RulesVersion tags every estimate with the pricing-rule revision that
// produced it, so historical estimates stay explainable after this catalog
// changes.
const RulesVersion = "v1"

// RoundStepTenge is the rounding granularity applied to every estimate.
const RoundStepTenge = 10000

// MultilingualPercent is the flat surcharge applied to the subtotal when the
// client requests a multilingual build.
const MultilingualPercent = 0.10

// ScaleCategory groups project types that share the same scale-tier ladder.
type ScaleCategory string

const (
	ScaleCategorySite ScaleCategory = "site"
	ScaleCategoryApp  ScaleCategory = "app"
	ScaleCategoryNone ScaleCategory = "none"
)

// ProjectType is a purchasable kind of project with its starting price.
type ProjectType struct {
	ID              string
	Label           string
	BasePriceTenge  *int64 // nil means "individual estimate only"
	Category        ScaleCategory
	DefaultDuration string
}

// ScaleTier is a size bracket within a ScaleCategory, adding to the base
// price. A nil AddPriceTenge means the size is out of standard scope and
// forces an individual estimate.
type ScaleTier struct {
	ID            string
	Category      ScaleCategory
	Label         string
	AddPriceTenge *int64
}

// Module is an optional add-on feature. PerUnit modules multiply their price
// by a client-supplied quantity (currently only "external-api").
type Module struct {
	ID         string
	Label      string
	PriceTenge int64
	PerUnit    bool
}

// DesignLevel adds a percentage of the subtotal for design effort.
type DesignLevel struct {
	ID      string
	Percent float64
}

// ComplexityLevel multiplies the post-percentage subtotal.
type ComplexityLevel struct {
	ID         string
	Multiplier float64
}

// UrgencyLevel multiplies the post-percentage subtotal for rushed delivery.
type UrgencyLevel struct {
	ID         string
	Multiplier float64
}

// DurationBracket maps a minimum-estimate ceiling to a human duration label.
// The list must stay sorted ascending by MaxAmountTenge; a nil ceiling is
// the catch-all last bracket.
type DurationBracket struct {
	MaxAmountTenge *int64
	Label          string
}

func ptr(v int64) *int64 { return &v }

var ProjectTypes = []ProjectType{
	{ID: "landing", Label: "Лендинг", BasePriceTenge: ptr(120000), Category: ScaleCategorySite, DefaultDuration: "1–2 недели"},
	{ID: "business-card", Label: "Сайт-визитка", BasePriceTenge: ptr(180000), Category: ScaleCategorySite, DefaultDuration: "1–2 недели"},
	{ID: "corporate", Label: "Корпоративный сайт", BasePriceTenge: ptr(300000), Category: ScaleCategorySite, DefaultDuration: "3–5 недель"},
	{ID: "catalog", Label: "Сайт-каталог", BasePriceTenge: ptr(400000), Category: ScaleCategorySite, DefaultDuration: "4–6 недель"},
	{ID: "online-store", Label: "Интернет-магазин", BasePriceTenge: ptr(500000), Category: ScaleCategorySite, DefaultDuration: "6–10 недель"},
	{ID: "web-app", Label: "Web-приложение", BasePriceTenge: ptr(700000), Category: ScaleCategoryApp, DefaultDuration: "8–12 недель"},
	{ID: "crm", Label: "CRM-система", BasePriceTenge: ptr(800000), Category: ScaleCategoryApp, DefaultDuration: "8–12 недель"},
	{ID: "mobile-app", Label: "Мобильное приложение", BasePriceTenge: ptr(900000), Category: ScaleCategoryApp, DefaultDuration: "10–14 недель"},
	{ID: "ai-solution", Label: "AI-решение", BasePriceTenge: ptr(500000), Category: ScaleCategoryApp, DefaultDuration: "4–8 недель"},
	{ID: "backend-api", Label: "Backend/API", BasePriceTenge: ptr(450000), Category: ScaleCategoryNone, DefaultDuration: "4–8 недель"},
	{ID: "devops-vps", Label: "DevOps/VPS", BasePriceTenge: ptr(150000), Category: ScaleCategoryNone, DefaultDuration: "1–3 недели"},
	{ID: "other", Label: "Другое", BasePriceTenge: nil, Category: ScaleCategoryNone, DefaultDuration: "по договорённости"},
}

var ScaleTiers = []ScaleTier{
	{ID: "site-s", Category: ScaleCategorySite, Label: "до 5 страниц", AddPriceTenge: ptr(0)},
	{ID: "site-m", Category: ScaleCategorySite, Label: "6–15 страниц", AddPriceTenge: ptr(80000)},
	{ID: "site-l", Category: ScaleCategorySite, Label: "16–30 страниц", AddPriceTenge: ptr(180000)},
	{ID: "site-xl", Category: ScaleCategorySite, Label: "более 30 страниц", AddPriceTenge: nil},
	{ID: "app-s", Category: ScaleCategoryApp, Label: "до 8 экранов", AddPriceTenge: ptr(0)},
	{ID: "app-m", Category: ScaleCategoryApp, Label: "9–20 экранов", AddPriceTenge: ptr(150000)},
	{ID: "app-l", Category: ScaleCategoryApp, Label: "21–40 экранов", AddPriceTenge: ptr(300000)},
	{ID: "app-xl", Category: ScaleCategoryApp, Label: "более 40 экранов", AddPriceTenge: nil},
}

var Modules = []Module{
	{ID: "auth", Label: "Авторизация", PriceTenge: 80000},
	{ID: "roles", Label: "Роли и права", PriceTenge: 100000},
	{ID: "cabinet", Label: "Личный кабинет", PriceTenge: 150000},
	{ID: "admin-panel", Label: "Админ-панель", PriceTenge: 180000},
	{ID: "online-payment", Label: "Онлайн-оплата", PriceTenge: 120000},
	{ID: "search-filters", Label: "Поиск и фильтры", PriceTenge: 80000},
	{ID: "notifications", Label: "Уведомления", PriceTenge: 70000},
	{ID: "file-upload", Label: "Загрузка файлов/документов", PriceTenge: 80000},
	{ID: "maps-geo", Label: "Карты/геолокация", PriceTenge: 120000},
	{ID: "chat", Label: "Чат", PriceTenge: 180000},
	{ID: "realtime", Label: "Realtime/WebSocket", PriceTenge: 200000},
	{ID: "crm-integration", Label: "CRM-интеграция", PriceTenge: 150000},
	{ID: "erp-integration", Label: "1С/ERP-интеграция", PriceTenge: 180000},
	{ID: "external-api", Label: "Внешний API", PriceTenge: 100000, PerUnit: true},
	{ID: "ai-chatbot", Label: "AI-чатбот", PriceTenge: 250000},
	{ID: "rag-ai", Label: "RAG/AI по базе знаний", PriceTenge: 350000},
	{ID: "analytics-dashboard", Label: "Аналитика/dashboard", PriceTenge: 150000},
}

var DesignLevels = []DesignLevel{
	{ID: "basic", Percent: 0},
	{ID: "custom", Percent: 0.15},
	{ID: "premium", Percent: 0.25},
}

var ComplexityLevels = []ComplexityLevel{
	{ID: "standard", Multiplier: 1.0},
	{ID: "medium", Multiplier: 1.1},
	{ID: "high", Multiplier: 1.25},
}

var UrgencyLevels = []UrgencyLevel{
	{ID: "normal", Multiplier: 1.0},
	{ID: "fast", Multiplier: 1.15},
	{ID: "urgent", Multiplier: 1.25},
}

var DurationBrackets = []DurationBracket{
	{MaxAmountTenge: ptr(300000), Label: "1–2 недели"},
	{MaxAmountTenge: ptr(600000), Label: "2–4 недели"},
	{MaxAmountTenge: ptr(1000000), Label: "4–7 недель"},
	{MaxAmountTenge: ptr(1500000), Label: "6–10 недель"},
	{MaxAmountTenge: ptr(2500000), Label: "8–14 недель"},
	{MaxAmountTenge: nil, Label: "индивидуальный срок"},
}

func FindProjectType(id string) (ProjectType, bool) {
	for _, p := range ProjectTypes {
		if p.ID == id {
			return p, true
		}
	}
	return ProjectType{}, false
}

func FindScaleTier(id string) (ScaleTier, bool) {
	for _, t := range ScaleTiers {
		if t.ID == id {
			return t, true
		}
	}
	return ScaleTier{}, false
}

func FindModule(id string) (Module, bool) {
	for _, m := range Modules {
		if m.ID == id {
			return m, true
		}
	}
	return Module{}, false
}

func FindDesignLevel(id string) (DesignLevel, bool) {
	for _, d := range DesignLevels {
		if d.ID == id {
			return d, true
		}
	}
	return DesignLevel{}, false
}

func FindComplexityLevel(id string) (ComplexityLevel, bool) {
	for _, c := range ComplexityLevels {
		if c.ID == id {
			return c, true
		}
	}
	return ComplexityLevel{}, false
}

func FindUrgencyLevel(id string) (UrgencyLevel, bool) {
	for _, u := range UrgencyLevels {
		if u.ID == id {
			return u, true
		}
	}
	return UrgencyLevel{}, false
}

// DurationLabelFor returns the human duration label for a computed minimum
// estimate.
func DurationLabelFor(minimumTenge int64) string {
	for _, b := range DurationBrackets {
		if b.MaxAmountTenge == nil || minimumTenge <= *b.MaxAmountTenge {
			return b.Label
		}
	}
	return DurationBrackets[len(DurationBrackets)-1].Label
}
