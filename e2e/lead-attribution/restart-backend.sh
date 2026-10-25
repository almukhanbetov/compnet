#!/bin/bash
# Restarts the local test backend (resets its in-memory rate limiters). Test stack only.
# Works when called by a relative path and after ./api was rebuilt in place (the running
# process then shows "<path> (deleted)"); refuses to report success while another process
# still holds the port.
SP=$(cd "$(dirname "$0")" && pwd); . "$SP/db.env"
for pid in $(ss -ltnpH 'sport = :8096' | grep -oP 'pid=\K[0-9]+' | sort -u); do
  exe=$(readlink "/proc/$pid/exe"); exe=${exe% (deleted)}
  [ "$exe" = "$SP/api" ] && kill "$pid"
done
for i in $(seq 50); do ss -ltn 'sport = :8096' | grep -q LISTEN || break; sleep 0.2; done
if ss -ltn 'sport = :8096' | grep -q LISTEN; then echo "port 8096 is held by another process"; exit 1; fi
cd "$SP" && DATABASE_URL="$E2E_DB" APP_ENV=development APP_PORT=8096 CORS_ALLOWED_ORIGINS=http://compnet.test:3006 ANALYTICS_ENABLED=true setsid nohup ./api >> "$SP/backend.log" 2>&1 < /dev/null &
for i in $(seq 100); do curl -s -o /dev/null http://127.0.0.1:8096/api/v1/analytics/config && echo "backend up" && exit 0; sleep 0.2; done; echo "backend did not start"; exit 1
