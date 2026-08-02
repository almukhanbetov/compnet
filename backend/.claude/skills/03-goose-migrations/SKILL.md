# Goose Migrations
Directory: `migrations/`

Naming:
`20260801120000_create_users.sql`

Format:
```sql
-- +goose Up
CREATE TABLE example (...);

-- +goose Down
DROP TABLE IF EXISTS example;
```

Rules:
- One coherent schema change per migration.
- Never edit an applied shared migration.
- Add a new migration for alterations.
- Include Down unless rollback is unsafe; explain exceptions.
- Explicit FK delete behavior.
- Use `TIMESTAMPTZ`.
- Do not auto-run production migrations inside app startup unless requested.

Commands:
```bash
goose -dir migrations postgres "$DATABASE_URL" status
goose -dir migrations postgres "$DATABASE_URL" up
goose -dir migrations postgres "$DATABASE_URL" down
```
