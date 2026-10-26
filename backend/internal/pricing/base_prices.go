package pricing

// BasePrice is a project type's base price in force: a version stored in
// PostgreSQL (project_type_prices). Version 0 and no VersionID: the seed
// price, for a type the database has no price for (an individual-only type,
// or no database at all).
type BasePrice struct {
	ProjectType string
	VersionID   string
	Version     int
	PriceTenge  *int64 // nil: individual estimate only
}

// Catalog is the pricing catalog with the base prices in force. The zero
// value prices every type at its seed price.
type Catalog struct {
	base map[string]BasePrice
}

// NewCatalog builds a catalog from the stored base prices; a project type
// without one keeps its seed price.
func NewCatalog(prices []BasePrice) Catalog {
	c := Catalog{base: make(map[string]BasePrice, len(prices))}
	for _, p := range prices {
		c.base[p.ProjectType] = p
	}
	return c
}

// SeedCatalog prices every project type at its seed price.
func SeedCatalog() Catalog { return Catalog{} }

// BasePrice is the price in force of a project type (seed, version 0, when
// none is stored; zero value for an unknown type).
func (c Catalog) BasePrice(projectTypeID string) BasePrice {
	if p, ok := c.base[projectTypeID]; ok {
		return p
	}
	if t, ok := FindProjectType(projectTypeID); ok {
		return BasePrice{ProjectType: t.ID, PriceTenge: t.SeedBasePriceTenge}
	}
	return BasePrice{ProjectType: projectTypeID}
}

// Editable: a project type with a price (individual-only types have none
// and stay so).
func (t ProjectType) Editable() bool { return t.SeedBasePriceTenge != nil }
