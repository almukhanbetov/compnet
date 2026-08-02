# Services, Pricing, Portfolio and Admin
Public:
```text
GET /api/v1/services
GET /api/v1/services/:slug
GET /api/v1/pricing
GET /api/v1/portfolio
GET /api/v1/portfolio/:slug
GET /api/v1/testimonials
GET /api/v1/seo/:path
```

Admin prefix: `/api/v1/admin`.

Rules:
- Public returns only published records.
- Unique validated slugs.
- Explicit sort order.
- `price_from` is BIGINT.
- Store content, not Tailwind classes/layout JSON.
- Add `published_at`, created_at, updated_at.
- Admin writes require role checks and audit logs.
- Paginate lists and allow-list sort/filter fields.
