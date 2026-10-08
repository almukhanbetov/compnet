package config

import (
	"net/http"
	"testing"
	"time"
)

func setBaseEnv(t *testing.T) {
	t.Helper()
	t.Setenv("DATABASE_URL", "postgres://user:pass@localhost:5432/db")
	t.Setenv("CORS_ALLOWED_ORIGINS", "http://localhost:3000")
	for _, key := range []string{"APP_ENV", "TRUSTED_PROXIES", "COOKIE_SECURE", "COOKIE_SAMESITE", "CHAT_COOKIE_TTL", "MANAGER_SESSION_TTL"} {
		t.Setenv(key, "")
	}
}

func TestLoad_Defaults(t *testing.T) {
	setBaseEnv(t)
	cfg, err := Load()
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Cookie.Secure || cfg.Cookie.SameSite != http.SameSiteLaxMode || cfg.Cookie.ChatTTL != 90*24*time.Hour || cfg.Cookie.ManagerSessionTTL != 12*time.Hour {
		t.Fatalf("unexpected cookie defaults: %+v", cfg.Cookie)
	}
	if len(cfg.TrustedProxies) != 0 {
		t.Fatalf("trusted proxies default = %v, want none", cfg.TrustedProxies)
	}
}

func TestLoad_ProductionDefaultsToSecure(t *testing.T) {
	setBaseEnv(t)
	t.Setenv("APP_ENV", "production")
	cfg, err := Load()
	if err != nil || !cfg.Cookie.Secure {
		t.Fatalf("secure=%v err=%v", cfg.Cookie.Secure, err)
	}
}

func TestLoad_Rejects(t *testing.T) {
	tests := map[string]map[string]string{
		"wildcard origin":        {"CORS_ALLOWED_ORIGINS": "*"},
		"wildcard subdomain":     {"CORS_ALLOWED_ORIGINS": "https://*.compnet.kz"},
		"insecure in production": {"APP_ENV": "production", "COOKIE_SECURE": "false"},
		"samesite none insecure": {"COOKIE_SAMESITE": "none", "COOKIE_SECURE": "false"},
		"bad samesite":           {"COOKIE_SAMESITE": "sometimes"},
		"bad bool":               {"COOKIE_SECURE": "yes please"},
		"bad ttl":                {"CHAT_COOKIE_TTL": "forever"},
		"negative ttl":           {"CHAT_COOKIE_TTL": "-1h"},
		"bad proxy":              {"TRUSTED_PROXIES": "nginx"},
		"manager ttl too short":  {"MANAGER_SESSION_TTL": "1m"},
		"manager ttl too long":   {"MANAGER_SESSION_TTL": "720h"},
	}
	for name, env := range tests {
		t.Run(name, func(t *testing.T) {
			setBaseEnv(t)
			for k, v := range env {
				t.Setenv(k, v)
			}
			if _, err := Load(); err == nil {
				t.Fatal("expected an error")
			}
		})
	}
}

func TestLoad_TrustedProxies(t *testing.T) {
	setBaseEnv(t)
	t.Setenv("TRUSTED_PROXIES", "127.0.0.1, 172.16.0.0/12")
	cfg, err := Load()
	if err != nil || len(cfg.TrustedProxies) != 2 {
		t.Fatalf("proxies=%v err=%v", cfg.TrustedProxies, err)
	}
}
