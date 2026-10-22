# Read-only production checks (analytics, request sources, logs)

For the server owner. Every command below only reads, and prints counts,
settings or kinds of errors — never request lines, contacts, names, request
texts, tokens or `.env` values. Run them on the VPS as the deploy user (sudo
where shown). They change nothing: no writes to the database, no restarts,
no edits to Nginx or Docker.

Paths and names follow DEPLOY.md: project `/var/www/compnet`, containers
`compnet-postgres`, `compnet-backend`, `compnet-frontend`.

## 1. Database: migration and request sources

```sh
cd /var/www/compnet
set -a; . ./.env; set +a          # loads POSTGRES_USER/POSTGRES_DB into this shell only; prints nothing
docker exec compnet-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc \
  "SELECT max(version_id) FROM goose_db_version WHERE is_applied"     # expect 20261022120000 or later
docker exec -i compnet-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  < request-sources-readonly.sql                                      # copy the file from this folder first
```

`request-sources-readonly.sql` runs in a `READ ONLY` transaction that is
rolled back. It reports: the 8.4 table, its indexes and `ON DELETE CASCADE`,
requests with and without a source, orphans and duplicates (must be 0),
sources on requests older than the migration (must be 0), channels, and
counts of email-, phone- or click-id-like UTM values (must be 0 after 8.6A).
Its last block is this month's numbers in Asia/Almaty: compare them with
`/manager/analytics` → «Заявки и источники» → «Текущий месяц».

## 2. Settings that decide retention

```sh
docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' compnet-backend \
  | grep -E '^ANALYTICS_(ENABLED|RETENTION_DAYS)='                     # only these two lines are printed
docker inspect -f '{{.Name}} {{json .HostConfig.LogConfig}}' compnet-backend compnet-frontend
sudo du -h "$(docker inspect -f '{{.LogPath}}' compnet-backend)"       # size of the backend's Docker log
grep -E 'daily|weekly|monthly|rotate|maxage' /etc/logrotate.d/nginx
```

No `ANALYTICS_RETENTION_DAYS` line means the default, 90 days. A
`LogConfig` of `{"Type":"json-file","Config":{}}` means Docker never rotates
the backend log.

## 3. Nginx: what the access log records

```sh
sudo nginx -T 2>/dev/null | grep -nE '^\s*(access_log|log_format)'   # no output = default "combined" format
# Lines that carry tracking ids or the managers' search (counts only):
sudo sh -c 'for f in /var/log/nginx/access.log*; do printf "%s gclid=%s utm=%s manager_q=%s\n" "$f" \
  "$(zgrep -c "gclid=" "$f")" "$(zgrep -cE "utm_[a-z]+=" "$f")" \
  "$(zgrep -cE "/api/v1/manager/project-requests\?[^ ]*q=" "$f")"; done'
```

After the 8.6A log format is applied, new lines have no query strings, so
these counts stop growing (older rotated files keep theirs until rotation
removes them).

Before applying the new format, check whether anything on the server reads
the access log (fail2ban, GoAccess, AWStats, custom scripts). The new format
keeps the request in the same `"METHOD /path PROTOCOL"` shape, without the
query string; a reader that relies on query parameters would need a change:

```sh
sudo grep -rlE 'access\.log' /etc/fail2ban /etc/goaccess* /etc/awstats /etc/cron* 2>/dev/null
systemctl list-units --type=service --no-pager | grep -iE 'fail2ban|goaccess|awstats'
```

## 4. Errors (kinds and counts only)

```sh
# Nginx: 5xx responses in the current log by path (query cut off) and status
sudo awk '$9 ~ /^5/ {split($7, p, "?"); c[p[1] " " $9]++} END {for (k in c) print c[k], k}' \
  /var/log/nginx/access.log | sort -rn | head -20
# Nginx error log: kinds of errors, without client or request details
sudo grep '\[error\]' /var/log/nginx/error.log \
  | sed -E 's/, client:.*//; s/^[0-9/: ]+\[error\] [0-9#]+: (\*[0-9]+ )?//' | sort | uniq -c | sort -rn | head
# Backend, last 7 days: kinds of logged problems (first words only) and panics
docker logs --since 168h compnet-backend 2>&1 | awk '{print $3, $4, $5}' \
  | grep -E '^(apierr|jobs|analytics|realtime|chatevents|requestevents)' | sort | uniq -c | sort -rn
docker logs --since 168h compnet-backend 2>&1 | grep -cE 'panic|fatal'
```

## 5. Manager page (in a browser, signed in as a manager)

1. `/manager/analytics` opens; the «Заявки и источники» block shows numbers.
2. «Текущий месяц»: totals match the last block of section 1.
3. Phone width (375 px): the page itself does not scroll sideways.
4. A request sent without analytics consent shows «Источник не определён».
