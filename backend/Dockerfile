# syntax=docker/dockerfile:1

# --- build stage ---
FROM golang:1.25-alpine AS build
WORKDIR /src

RUN apk add --no-cache git

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/api ./cmd/api

# --- runtime stage ---
FROM alpine:3.20 AS runtime
RUN apk add --no-cache ca-certificates && \
    addgroup -S compnet && adduser -S compnet -G compnet
WORKDIR /app

COPY --from=build /out/api ./api

USER compnet
EXPOSE 8080

ENTRYPOINT ["./api"]
