---
name: github-actions-cicd
description: Creates and validates the COMPNET GitHub Actions pipeline for Docker Hub build/push and VPS deployment over SSH.
---

# GitHub Actions CI/CD for COMPNET

Use when creating `.github/workflows/deploy.yml` or diagnosing failed Actions runs.

## Trigger and concurrency

- Deploy on push to `main`.
- Allow manual `workflow_dispatch`.
- Prevent concurrent production deployments.

## Required secrets

Use exactly:

```text
DOCKERHUB_USERNAME
DOCKERHUB_TOKEN
VPS_HOST
VPS_PORT
VPS_USER
VPS_PATH
VPS_SSH_KEY
```

Never echo these values.

## Required workflow architecture

1. Checkout repository.
2. Set up Buildx.
3. Log in to Docker Hub.
4. Build/push backend with `latest` and commit SHA tags.
5. Build/push frontend with `latest` and commit SHA tags.
6. Deploy only after both image builds succeed.
7. Connect to VPS using `VPS_PORT` and `VPS_SSH_KEY`.
8. Pull images and run only the COMPNET compose project.
9. Verify container status and endpoints.
10. Fail the Action when verification fails.

## Canonical workflow

Create `.github/workflows/deploy.yml` using this shape, adapting only verified project details:

```yaml
name: Deploy COMPNET

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: compnet-production
  cancel-in-progress: true

env:
  BACKEND_IMAGE: ${{ secrets.DOCKERHUB_USERNAME }}/compnet-backend
  FRONTEND_IMAGE: ${{ secrets.DOCKERHUB_USERNAME }}/compnet-frontend

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Build and push backend
        uses: docker/build-push-action@v6
        with:
          context: ./backend
          push: true
          tags: |
            ${{ env.BACKEND_IMAGE }}:latest
            ${{ env.BACKEND_IMAGE }}:${{ github.sha }}
          cache-from: type=gha,scope=backend
          cache-to: type=gha,mode=max,scope=backend

      - name: Build and push frontend
        uses: docker/build-push-action@v6
        with:
          context: ./frontend
          push: true
          build-args: |
            NEXT_PUBLIC_API_URL=${{ vars.NEXT_PUBLIC_API_URL }}
          tags: |
            ${{ env.FRONTEND_IMAGE }}:latest
            ${{ env.FRONTEND_IMAGE }}:${{ github.sha }}
          cache-from: type=gha,scope=frontend
          cache-to: type=gha,mode=max,scope=frontend

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    steps:
      - name: Deploy over SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          port: ${{ secrets.VPS_PORT }}
          command_timeout: 20m
          script: |
            set -Eeuo pipefail
            cd "${{ secrets.VPS_PATH }}"
            echo "${{ secrets.DOCKERHUB_TOKEN }}" | docker login \
              -u "${{ secrets.DOCKERHUB_USERNAME }}" --password-stdin
            export DOCKERHUB_USERNAME="${{ secrets.DOCKERHUB_USERNAME }}"
            docker compose -p compnet --env-file .env -f docker-compose.prod.yml pull
            docker compose -p compnet --env-file .env -f docker-compose.prod.yml up -d --remove-orphans
            docker compose -p compnet --env-file .env -f docker-compose.prod.yml ps
            sleep 10
            curl -fsS http://127.0.0.1:8080/health
            curl -fsSI http://127.0.0.1:3000/
            docker image prune -f --filter "until=168h"
```

## Public frontend URL

Prefer a GitHub Actions repository variable named:

```text
NEXT_PUBLIC_API_URL
```

Use a domain such as `https://api.<domain>` after Nginx is configured. Avoid hardcoding the VPS IP unless this is a temporary test deployment.

## VPS compose file availability

The workflow above assumes `docker-compose.prod.yml` already exists in `VPS_PATH`.

Choose one explicit strategy:

- initial one-time `scp` to `/var/www/compnet`; or
- add a checkout/sync job that safely copies only `docker-compose.prod.yml`.

Do not run `git pull` on the VPS unless the deployment strategy intentionally keeps a repository clone there.

## Debugging order

For a failed run, identify the exact failing job and step, then inspect:

1. Docker Hub authentication.
2. Docker build context and Dockerfile.
3. SSH authentication and port.
4. VPS directory existence and ownership.
5. `.env` existence on VPS.
6. Compose variable substitution.
7. Container logs.
8. Health endpoint availability.

Never replace a failing health check with a fake success. Correct the route or use a meaningful container health check.
