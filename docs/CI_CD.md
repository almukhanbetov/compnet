# CI/CD: checks and production deploy

Two workflows in `.github/workflows/`:

| Workflow | Runs on | Does |
|---|---|---|
| `CI` (`ci.yml`) | pull request to `main`, manual run | Go vet/build/tests on a throwaway PostgreSQL, frontend types/lint/build, compose config check. No secrets, no VPS. |
| `Build and Deploy COMPNET` (`deploy.yml`) | push to `main`, manual run from `main` | Builds and pushes images, backs up the database, runs migrations, restarts the `compnet` stack. |

## When a push to `main` deploys

It deploys unless **every** changed file matches `paths-ignore` in `deploy.yml`:

- `docs/**`, `e2e/**`
- `*.md` in the root, `backend/` and `frontend/`
- `.claude/**`, `backend/.claude/**`, `frontend/.claude/**`
- `deploy/checks/**`, `.github/workflows/ci.yml`

Any other path deploys, including new ones. The filter looks at the whole push (the merge), so a pull request with frontend and docs changes deploys.

## Manual deploy

Actions → `Build and Deploy COMPNET` → Run workflow → branch `main`. A run from any other branch skips both jobs. Use it to:

- retry a failed deploy;
- deploy after a docs-only change.

## Checking the filter (Stage 8.6O)

This file was added by a docs-only pull request. Expected after its merge:

- `CI` runs on the pull request;
- no `Build and Deploy COMPNET` run for the merge commit;
- the production containers keep their start time.
