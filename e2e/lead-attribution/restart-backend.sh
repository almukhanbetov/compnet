#!/bin/bash
# Restarts the local test backend (resets its in-memory rate limiters). Test stack only.
SP=$(dirname "$0"); . "$SP/db.env"
for pid in $(ss -ltnpH 'sport = :8096' | grep -oP 'pid=\K[0-9]+' | sort -u); do
  [ "$(readlink /proc/$pid/exe)" = "$SP/api" ] && kill $pid
done
for i in $(seq 50); do ss -ltn 'sport = :8096' | grep -q LISTEN || break; sleep 0.2; done
cd "$SP" && DATABASE_URL="$E2E_DB" APP_ENV=development APP_PORT=8096 CORS_ALLOWED_ORIGINS=http://compnet.test:3006 ANALYTICS_ENABLED=true setsid nohup ./api >> "$SP/backend.log" 2>&1 < /dev/null &
for i in $(seq 100); do curl -s -o /dev/null http://127.0.0.1:8096/api/v1/analytics/config && echo "backend up" && exit 0; sleep 0.2; done; echo "backend did not start"; exit 1
