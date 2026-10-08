// Package config loads and validates application configuration from
// environment variables. It fails fast at startup if required values are
// missing or malformed, so misconfiguration is never discovered later at
// request time.
package config

import (
	"fmt"
	"net"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

// defaultChatCookieTTL keeps a visitor's chat history reachable for 90
// days after their last activity.
const defaultChatCookieTTL = 90 * 24 * time.Hour

// defaultManagerSessionTTL is the absolute lifetime of a staff session (a
// working day); there is no sliding renewal.
const defaultManagerSessionTTL = 12 * time.Hour

// Config holds all runtime configuration for the API service.
type Config struct {
	AppEnv             string
	AppPort            string
	DatabaseURL        string
	CORSAllowedOrigins []string
	// TrustedProxies lists the IPs/CIDRs whose X-Forwarded-For / X-Real-IP
	// headers are believed. Empty means none: the client IP is always the
	// TCP peer address.
	TrustedProxies []string
	Cookie         CookieConfig
}

// CookieConfig controls the attributes of cookies the API sets.
type CookieConfig struct {
	Secure   bool
	SameSite http.SameSite
	ChatTTL  time.Duration
	// ManagerSessionTTL bounds staff sessions. The manager cookie is always
	// SameSite=Strict regardless of SameSite above.
	ManagerSessionTTL time.Duration
}

// IsProduction reports whether the service runs with APP_ENV=production.
func (c Config) IsProduction() bool {
	return c.AppEnv == "production"
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
	cfg.TrustedProxies = splitAndTrim(getEnv("TRUSTED_PROXIES", ""))

	// Secure cookies by default in production; plain-HTTP local development
	// needs them off, otherwise the browser silently drops the cookie.
	secure, err := parseBool("COOKIE_SECURE", cfg.IsProduction())
	if err != nil {
		return Config{}, err
	}
	sameSite, err := parseSameSite(getEnv("COOKIE_SAMESITE", "lax"))
	if err != nil {
		return Config{}, err
	}
	ttl, err := parseDuration("CHAT_COOKIE_TTL", defaultChatCookieTTL)
	if err != nil {
		return Config{}, err
	}
	managerTTL, err := parseDuration("MANAGER_SESSION_TTL", defaultManagerSessionTTL)
	if err != nil {
		return Config{}, err
	}
	cfg.Cookie = CookieConfig{Secure: secure, SameSite: sameSite, ChatTTL: ttl, ManagerSessionTTL: managerTTL}

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
	for _, origin := range c.CORSAllowedOrigins {
		// Origins are echoed back together with
		// Access-Control-Allow-Credentials, so a wildcard would let any
		// site read a visitor's chat.
		if strings.Contains(origin, "*") {
			return fmt.Errorf("config: CORS_ALLOWED_ORIGINS must list explicit origins, wildcard %q is not allowed", origin)
		}
	}
	for _, proxy := range c.TrustedProxies {
		if net.ParseIP(proxy) == nil {
			if _, _, err := net.ParseCIDR(proxy); err != nil {
				return fmt.Errorf("config: TRUSTED_PROXIES entry %q is not an IP or CIDR", proxy)
			}
		}
	}
	if c.Cookie.SameSite == http.SameSiteNoneMode && !c.Cookie.Secure {
		return fmt.Errorf("config: COOKIE_SAMESITE=none requires COOKIE_SECURE=true")
	}
	if c.IsProduction() && !c.Cookie.Secure {
		return fmt.Errorf("config: COOKIE_SECURE must be true in production")
	}
	if c.Cookie.ChatTTL <= 0 {
		return fmt.Errorf("config: CHAT_COOKIE_TTL must be positive")
	}
	if c.Cookie.ManagerSessionTTL < 5*time.Minute || c.Cookie.ManagerSessionTTL > 7*24*time.Hour {
		return fmt.Errorf("config: MANAGER_SESSION_TTL must be between 5m and 168h")
	}
	return nil
}

func parseBool(key string, fallback bool) (bool, error) {
	raw := getEnv(key, "")
	if raw == "" {
		return fallback, nil
	}
	value, err := strconv.ParseBool(raw)
	if err != nil {
		return false, fmt.Errorf("config: %s must be true or false", key)
	}
	return value, nil
}

func parseDuration(key string, fallback time.Duration) (time.Duration, error) {
	raw := getEnv(key, "")
	if raw == "" {
		return fallback, nil
	}
	value, err := time.ParseDuration(raw)
	if err != nil {
		return 0, fmt.Errorf("config: %s must be a duration like 2160h", key)
	}
	return value, nil
}

func parseSameSite(raw string) (http.SameSite, error) {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "lax":
		return http.SameSiteLaxMode, nil
	case "strict":
		return http.SameSiteStrictMode, nil
	case "none":
		return http.SameSiteNoneMode, nil
	default:
		return 0, fmt.Errorf("config: COOKIE_SAMESITE must be lax, strict or none")
	}
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
