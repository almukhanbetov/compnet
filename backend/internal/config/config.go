// Package config loads and validates application configuration from
// environment variables. It fails fast at startup if required values are
// missing or malformed, so misconfiguration is never discovered later at
// request time.
package config

import (
	"fmt"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

// Config holds all runtime configuration for the API service.
type Config struct {
	AppEnv             string
	AppPort            string
	DatabaseURL        string
	CORSAllowedOrigins []string
}

// Load reads configuration from the process environment, optionally
// preloading a local .env file (ignored if absent, e.g. inside Docker where
// variables are already injected by Compose). It returns an error instead of
// exiting so callers (including tests) can handle failures explicitly.
func Load() (Config, error) {
	// Best-effort: only useful for local `go run` outside Docker.
	_ = godotenv.Load()

	cfg := Config{
		AppEnv:      getEnv("APP_ENV", "development"),
		AppPort:     getEnv("APP_PORT", "8080"),
		DatabaseURL: os.Getenv("DATABASE_URL"),
	}

	origins := getEnv("CORS_ALLOWED_ORIGINS", "")
	cfg.CORSAllowedOrigins = splitAndTrim(origins)

	if err := cfg.validate(); err != nil {
		return Config{}, err
	}

	return cfg, nil
}

func (c Config) validate() error {
	if c.DatabaseURL == "" {
		return fmt.Errorf("config: DATABASE_URL is required")
	}
	if c.AppPort == "" {
		return fmt.Errorf("config: APP_PORT is required")
	}
	if len(c.CORSAllowedOrigins) == 0 {
		return fmt.Errorf("config: CORS_ALLOWED_ORIGINS is required")
	}
	return nil
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok && value != "" {
		return value
	}
	return fallback
}

func splitAndTrim(value string) []string {
	if value == "" {
		return nil
	}

	parts := strings.Split(value, ",")
	result := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed != "" {
			result = append(result, trimmed)
		}
	}
	return result
}
