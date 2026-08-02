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
