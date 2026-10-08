# syntax=docker/dockerfile:1

# --- deps stage ---
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- build stage ---
FROM node:20-alpine AS build
WORKDIR /app
ARG NEXT_PUBLIC_API_URL=http://localhost:8080
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
# Visitor chat widget: inlined into the client bundle at build time, so it
# must be a build arg — setting it on the running container has no effect.
# Off unless the build explicitly passes "true".
ARG NEXT_PUBLIC_CHAT_WIDGET_ENABLED=false
ENV NEXT_PUBLIC_CHAT_WIDGET_ENABLED=$NEXT_PUBLIC_CHAT_WIDGET_ENABLED
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- runtime stage ---
FROM node:20-alpine AS runtime
RUN addgroup -S compnet && adduser -S compnet -G compnet
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=build /app/public ./public
COPY --from=build --chown=compnet:compnet /app/.next/standalone ./
COPY --from=build --chown=compnet:compnet /app/.next/static ./.next/static

USER compnet
EXPOSE 3000

CMD ["node", "server.js"]
