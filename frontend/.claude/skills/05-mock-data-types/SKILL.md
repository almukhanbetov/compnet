# Skill: Mock Data and Type Safety

## Goal
Represent realistic data without API or database.

## Files
- `data/categories.ts`
- `data/products.ts`
- `data/reviews.ts`
- `data/messages.ts`
- `data/notifications.ts`
- `data/orders.ts`
- `data/articles.ts`
- `data/analytics.ts`

## Rules
- Define interfaces or types in `types/`.
- Never use `any`.
- Use stable IDs and slugs.
- Include enough data to test empty, normal and highlighted states.
- Keep text realistic but concise.
- Do not fetch external data.
