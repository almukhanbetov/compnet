---
name: dockerhub-images
description: Builds secure production Docker images for the COMPNET Go backend and Next.js frontend and publishes them to Docker Hub.
---

# Docker Hub Images for COMPNET

Use when creating or correcting Dockerfiles, image names, tags, build arguments, or Docker Hub publishing.

## Required image names

Use the Docker Hub username from GitHub Secrets:

```text
${DOCKERHUB_USERNAME}/compnet-backend
${DOCKERHUB_USERNAME}/compnet-frontend
```

Publish both immutable and moving tags:

```text
latest
${GITHUB_SHA}
```

Never hardcode a personal Docker Hub username in reusable workflow logic.

## Backend image requirements

- Multi-stage Go build.
- `CGO_ENABLED=0` unless the project demonstrably requires CGO.
- Runtime image must contain CA certificates.
- Run as a non-root user.
- Expose 8080.
- Do not copy `.env` into the image.
- Build the actual package containing `main`, discovered from the repository.

Recommended pattern:

```dockerfile
FROM golang:1.24-alpine AS builder
WORKDIR /app
RUN apk add --no-cache ca-certificates git
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/server .

FROM alpine:3.21
WORKDIR /app
RUN apk add --no-cache ca-certificates \
    && addgroup -S app \
    && adduser -S app -G app
COPY --from=builder /out/server /app/server
USER app
EXPOSE 8080
ENTRYPOINT ["/app/server"]
```

Adjust the final build path only after inspecting the Go module.

## Frontend image requirements

- Next.js production build with `output: "standalone"`.
- Multi-stage build.
- Use `npm ci`, not `npm install`, when `package-lock.json` exists.
- Run as non-root.
- Expose 3000.
- Do not bake server-only secrets into `NEXT_PUBLIC_*` variables.
- `NEXT_PUBLIC_API_URL` is public browser configuration and may be supplied as a build argument.

Recommended pattern:

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

## `.dockerignore`

Ensure both build contexts exclude at least:

```text
.git
.github
.env
.env.*
!.env.example
node_modules
.next
coverage
*.log
```

For Go, also exclude local binaries and temporary directories.

## Validation

Before publishing:

```bash
docker build -t compnet-backend:test ./backend
docker build -t compnet-frontend:test \
  --build-arg NEXT_PUBLIC_API_URL=https://api.example.com \
  ./frontend

docker run --rm --name compnet-backend-test -p 18080:8080 compnet-backend:test
docker run --rm --name compnet-frontend-test -p 13000:3000 compnet-frontend:test
```

Check image users:

```bash
docker inspect compnet-backend:test --format '{{.Config.User}}'
docker inspect compnet-frontend:test --format '{{.Config.User}}'
```

Do not push unless both builds succeed.
