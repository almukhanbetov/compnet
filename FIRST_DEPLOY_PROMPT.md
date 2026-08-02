# Prompt for Claude Code — COMPNET CI/CD deployment

Use the deployment skills in `.claude/skills/12-*` through `.claude/skills/18-*`.

Inspect the current COMPNET repository first. Then prepare a safe production deployment to VPS `89.207.254.215` using:

- GitHub repository `almukhanbetov/compnet`;
- GitHub Actions;
- Docker Hub images `compnet-backend` and `compnet-frontend`;
- SSH deployment using existing GitHub secrets:
  `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`, `VPS_HOST`, `VPS_PORT`, `VPS_USER`, `VPS_PATH`, `VPS_SSH_KEY`;
- production directory `/var/www/compnet`;
- PostgreSQL 17 in Docker;
- backend Go/Gin in Docker;
- frontend Next.js standalone in Docker;
- project-isolated container, network, and volume names prefixed with `compnet-`;
- PostgreSQL not exposed publicly;
- frontend and backend bound to `127.0.0.1` for later Nginx proxying.

Do not modify or restart unrelated VPS projects. Do not delete Docker volumes. Do not expose secrets. Do not assume the SSH port or domain.

Create or correct:

1. `backend/Dockerfile` and `.dockerignore`;
2. `frontend/Dockerfile`, `.dockerignore`, and Next standalone configuration;
3. `docker-compose.prod.yml`;
4. `.github/workflows/deploy.yml`;
5. `.env.production.example` containing names only, no real secrets;
6. a brief `DEPLOY.md` with first-time VPS commands, deployment checks, and rollback procedure.

The workflow must build and push both `latest` and `${{ github.sha }}` tags, then deploy with `docker compose -p compnet`. It must verify backend `/health` and the frontend root. If `/health` does not exist, inspect the backend and add a minimal safe route or explain exactly what blocks it.

Before editing, show the repository findings and proposed files. After editing, run all available local validation and builds. Show the exact changed files, test results, and any remaining manual VPS steps. Do not perform destructive commands.
