-- Stage 8.4: read-only checks of request sources on a COMPNET database.
-- Prints counts and metadata only: no names, contacts, texts or UTM values.
-- Runs inside a READ ONLY transaction that is rolled back, so it cannot
-- change anything. Usage on the VPS: see deploy/checks/README.md.
\set ON_ERROR_STOP on
\pset footer off
BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '15s';

\echo '== 1. Migration applied (goose version and the 8.4 table)'
SELECT version_id, is_applied, tstamp FROM goose_db_version ORDER BY id DESC LIMIT 3;
SELECT to_regclass('public.project_request_attribution') AS attribution_table;

\echo '== 2. Indexes and constraints'
SELECT indexname FROM pg_indexes WHERE tablename = 'project_request_attribution' ORDER BY 1;
SELECT conname, contype,
       CASE confdeltype WHEN 'c' THEN 'ON DELETE CASCADE' WHEN 'a' THEN 'NO ACTION' ELSE confdeltype::text END AS on_delete
FROM pg_constraint WHERE conrelid = 'project_request_attribution'::regclass ORDER BY 1;

\echo '== 3. Requests with and without a stored source'
SELECT count(*) AS requests,
       count(a.project_request_id) AS with_source,
       count(*) - count(a.project_request_id) AS without_source
FROM project_requests p LEFT JOIN project_request_attribution a ON a.project_request_id = p.id;

\echo '== 4. Integrity: orphans, duplicates (both must be 0)'
SELECT (SELECT count(*) FROM project_request_attribution a
        WHERE NOT EXISTS (SELECT 1 FROM project_requests p WHERE p.id = a.project_request_id)) AS orphan_sources,
       (SELECT count(*) FROM (SELECT project_request_id FROM project_request_attribution
                              GROUP BY 1 HAVING count(*) > 1) d) AS duplicate_sources,
       (SELECT count(*) FROM (SELECT project_request_id FROM analytics_events
                              WHERE type = 'lead_submit' AND project_request_id IS NOT NULL
                              GROUP BY 1 HAVING count(*) > 1) d) AS duplicate_lead_events;

\echo '== 5. No source invented for requests received before the migration (must be 0)'
SELECT count(*) AS sources_on_older_requests
FROM project_request_attribution a JOIN project_requests p ON p.id = a.project_request_id
WHERE p.created_at < (SELECT tstamp FROM goose_db_version WHERE version_id = 20261022120000 AND is_applied ORDER BY id DESC LIMIT 1);

\echo '== 6. Source written with the request (seconds apart; large values would be suspicious)'
SELECT max(extract(epoch FROM a.created_at - p.created_at))::numeric(10,3) AS max_delay_s
FROM project_request_attribution a JOIN project_requests p ON p.id = a.project_request_id;

\echo '== 7. Channels and how sources were reported (counts only)'
SELECT channel, count(*) FROM project_request_attribution GROUP BY 1 ORDER BY 2 DESC;
SELECT count(*) FILTER (WHERE source_page IS NULL) AS no_source_page,
       count(*) FILTER (WHERE click_id_type IS NOT NULL) AS ad_clicks,
       count(*) FILTER (WHERE concat(source_page, previous_page, landing_page) ~ '[?#]') AS paths_with_query_must_be_0
FROM project_request_attribution;

\echo '== 8. Personal data that should never be in sources (counts must be 0; values are not printed)'
SELECT count(*) FILTER (WHERE concat_ws(' ', utm_source, utm_medium, utm_campaign, utm_content, utm_term, source) ~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}') AS email_like,
       count(*) FILTER (WHERE concat_ws(' ', utm_source, utm_medium, utm_campaign, utm_content, utm_term) ~ '\+?[0-9][0-9 ()-]{9,}') AS phone_like,
       count(*) FILTER (WHERE concat_ws(' ', utm_source, utm_medium, utm_campaign, utm_content, utm_term) ~* 'gclid|gbraid|wbraid') AS click_id_text
FROM project_request_attribution;

\echo '== 9. Report cross-check: this month in Asia/Almaty (compare with «Заявки и источники», «Текущий месяц»)'
WITH r AS (
  SELECT p.status, COALESCE(a.channel, 'unknown') AS channel, a.source, a.project_request_id IS NOT NULL AS tracked
  FROM project_requests p LEFT JOIN project_request_attribution a ON a.project_request_id = p.id
  WHERE (p.created_at AT TIME ZONE 'Asia/Almaty')::date
        BETWEEN date_trunc('month', now() AT TIME ZONE 'Asia/Almaty')::date AND (now() AT TIME ZONE 'Asia/Almaty')::date
)
SELECT count(*) AS total,
       count(*) FILTER (WHERE tracked) AS source_known,
       count(*) FILTER (WHERE status = 'new') AS new,
       count(*) FILTER (WHERE status IN ('in_progress','contacted','qualified','proposal_sent')) AS in_progress,
       count(*) FILTER (WHERE status IN ('completed','accepted')) AS completed,
       count(*) FILTER (WHERE status = 'rejected') AS rejected,
       count(*) FILTER (WHERE channel = 'organic_search' AND source = 'google') AS google_organic,
       count(*) FILTER (WHERE channel IN ('paid_search','paid_social')) AS paid,
       count(*) FILTER (WHERE channel IN ('social','paid_social')) AS social,
       count(*) FILTER (WHERE channel = 'unknown') AS unknown
FROM r;

ROLLBACK;
