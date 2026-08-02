---
name: deploy-guardian
description: Safely plans and executes COMPNET production deployments without breaking other VPS projects.
---

# COMPNET Deploy Guardian

Use this skill whenever the user asks to deploy, configure CI/CD, change Docker Compose, edit Nginx, expose ports, or update the VPS.

## Fixed project context

- Repository root: `COMPNET/`
- Frontend: `COMPNET/frontend` — Next.js, Dockerized, port 3000 internally.
- Backend: `COMPNET/backend` — Go/Gin, Dockerized, port 8080 internally.
- PostgreSQL: version 17, Dockerized, internal only.
- GitHub repository: `almukhanbetov/compnet`
- Production VPS host: `89.207.254.215`
- Production directory: `/var/www/compnet`
- Deployment flow: GitHub Actions → Docker Hub → SSH → Docker Compose.
- Existing GitHub secrets:
  - `DOCKERHUB_USERNAME`
  - `DOCKERHUB_TOKEN`
  - `VPS_HOST`
  - `VPS_PORT`
  - `VPS_USER`
  - `VPS_PATH`
  - `VPS_SSH_KEY`

## Mandatory safety rules

1. Inspect the current repository before changing anything.
2. Never delete or restart unrelated containers, networks, volumes, Nginx sites, or certificates.
3. Never use global destructive commands such as:
   - `docker system prune -a --volumes`
   - `docker rm -f $(docker ps -aq)`
   - `docker volume prune`
4. Use project-scoped names prefixed with `compnet-`.
5. Keep PostgreSQL private; do not publish port 5432 to the internet.
6. Do not commit `.env`, private keys, passwords, Docker Hub tokens, or database credentials.
7. Do not print secret values in logs.
8. Before changing Nginx, run `sudo nginx -t`.
9. Before deployment, make a database backup when a production database already exists.
10. Preserve the named PostgreSQL volume during updates and rollbacks.
11. Use `docker compose -p compnet ...` or explicitly named resources so this stack cannot collide with others.
12. Never assume the SSH port. Read it from `VPS_PORT` or ask the user to confirm it.

## Required inspection order

Run or inspect these first:

```bash
pwd
find . -maxdepth 3 -type f | sort
find . -maxdepth 3 -type d -name .git -print
git status --short
git remote -v
sed -n '1,240p' docker-compose.yml
sed -n '1,240p' backend/Dockerfile
sed -n '1,240p' frontend/Dockerfile
sed -n '1,200p' frontend/next.config.* 2>/dev/null || true
```

Then summarize:

- current stack;
- current ports;
- health endpoints;
- missing production files;
- risks and assumptions;
- exact files to create or modify.

## Change policy

- Prefer creating production-specific files rather than replacing working local files:
  - `docker-compose.prod.yml`
  - `.github/workflows/deploy.yml`
  - `.env.production.example`
- Keep local `docker-compose.yml` working unless the user explicitly asks to unify both.
- Make the smallest safe change.
- After edits, show `git diff --stat` and the important diff sections.
- Run local validation before committing.

## Completion criteria

A deployment task is complete only when all relevant checks pass:

```bash
docker compose -f docker-compose.prod.yml config
git diff --check
```

For image builds:

```bash
docker build -t compnet-backend:test ./backend
docker build -t compnet-frontend:test ./frontend
```

For a live VPS deployment:

```bash
docker compose -p compnet --env-file .env -f docker-compose.prod.yml ps
curl -fsS http://127.0.0.1:8080/health
curl -fsSI http://127.0.0.1:3000/
```

Report exact results. Do not claim success without command evidence.
