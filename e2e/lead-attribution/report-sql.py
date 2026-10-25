"""Stage 8.6M: the manager reports (visits and requests) against independent SQL, per period (Asia/Almaty).
Isolated stack only. usage: python3 -I report-sql.py   (credentials from db.env / staff.env, never printed)"""
import datetime, http.cookiejar, json, os, subprocess, urllib.request, zoneinfo

SP = os.path.dirname(os.path.abspath(__file__))
env = {}
for f in ("db.env", "staff.env"):
    for line in open(os.path.join(SP, f)):
        k, _, v = line.strip().partition("=")
        env[k] = v


def sql(q):
    out = subprocess.run(["docker", "exec", "-i", "compnet-stage86c-db", "psql", "-q", "-U", "postgres", "-d", "compnet_e2e", "-At", "-F", "\t"],
                         input=q, capture_output=True, text=True, check=True).stdout
    return [line.split("\t") for line in out.splitlines() if line]


jar = http.cookiejar.CookieJar()
op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))


def call(method, path, body=None):
    req = urllib.request.Request("http://127.0.0.1:8096" + path, method=method, data=json.dumps(body).encode() if body else None,
                                 headers={"Content-Type": "application/json", "Origin": "http://compnet.test:3006"})
    return json.loads(op.open(req).read())


call("POST", "/api/v1/manager/auth/login", {"email": env["MGR_EMAIL"], "password": env["MGR_PW"]})
today = datetime.datetime.now(zoneinfo.ZoneInfo("Asia/Almaty")).date()
day = lambda n: (today + datetime.timedelta(days=n)).isoformat()
periods = [("Сегодня", day(0), day(0)), ("Вчера", day(-1), day(-1)), ("7 дней", day(-6), day(0)), ("30 дней", day(-29), day(0)),
           ("Текущий месяц", today.replace(day=1).isoformat(), day(0)), ("свой период", day(-2), day(-1))]
failed = 0
for label, frm, to in periods:
    w = f"(s.started_at AT TIME ZONE 'Asia/Almaty')::date BETWEEN '{frm}' AND '{to}'"
    sessions, visitors, converted = map(int, sql(f"""SELECT count(*), count(DISTINCT s.visitor_id), count(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM analytics_events e WHERE e.session_id = s.id AND e.type IN ('lead_submit','chat_first_message'))) FROM analytics_sessions s WHERE {w}""")[0])
    views = int(sql(f"SELECT count(*) FROM analytics_events e WHERE e.type='page_view' AND (e.occurred_at AT TIME ZONE 'Asia/Almaty')::date BETWEEN '{frm}' AND '{to}'")[0][0])
    src = {(a, b): (int(c), int(v)) for a, b, c, v in sql(f"SELECT s.source, s.medium, count(*), count(DISTINCT s.visitor_id) FROM analytics_sessions s WHERE {w} GROUP BY 1, 2")}
    first = {(a, b): (int(c), int(v)) for a, b, c, v in sql(f"SELECT s.first_source, s.first_medium, count(*), count(DISTINCT s.visitor_id) FROM analytics_sessions s WHERE {w} GROUP BY 1, 2")}
    pw = f"(p.created_at AT TIME ZONE 'Asia/Almaty')::date BETWEEN '{frm}' AND '{to}'"
    requests = int(sql(f"SELECT count(*) FROM project_requests p WHERE {pw}")[0][0])
    # "Linked requests" counts request conversions by the time they were recorded (right after the request was
    # saved), like the other events — not by the request's own creation time.
    linked = int(sql(f"SELECT count(*) FROM analytics_events e WHERE e.type = 'lead_submit' AND (e.occurred_at AT TIME ZONE 'Asia/Almaty')::date BETWEEN '{frm}' AND '{to}'")[0][0])
    tracked = int(sql(f"SELECT count(*) FROM project_requests p JOIN project_request_attribution a ON a.project_request_id = p.id WHERE {pw}")[0][0])
    channels = {k: int(v) for k, v in sql(f"SELECT coalesce(a.channel, 'unknown'), count(*) FROM project_requests p LEFT JOIN project_request_attribution a ON a.project_request_id = p.id WHERE {pw} GROUP BY 1")}

    r = call("GET", f"/api/v1/manager/analytics/report?from={frm}&to={to}")["data"]
    t = r["totals"]
    l = call("GET", f"/api/v1/manager/analytics/leads?from={frm}&to={to}")["data"]
    api_src = {(x["source"], x["medium"]): (x["sessions"], x["visitors"]) for x in r["sources"]}
    api_first = {(x["source"], x["medium"]): (x["sessions"], x["visitors"]) for x in r["first_sources"]}
    checks = {
        "sessions": (t["sessions"], sessions), "visitors": (t["visitors"], visitors), "page views": (t["page_views"], views),
        "converted": (t["converted_sessions"], converted), "requests": (t["requests"], requests), "linked requests": (t["linked_requests"], linked),
        "requests block total": (l["totals"]["requests"], requests), "with source": (l["totals"]["tracked"], tracked),
        "channels": ({c["key"]: c["count"] for c in l["channels"]}, channels),
        # The API lists at most 20 rows per table; compare what it lists.
        "session sources": (api_src, {k: v for k, v in src.items() if k in api_src} if len(src) > 20 else src),
        "first sources": (api_first, {k: v for k, v in first.items() if k in api_first} if len(first) > 20 else first),
    }
    bad = [k for k, (a, b) in checks.items() if a != b]
    failed += bool(bad)
    print(f"{'FAIL' if bad else 'PASS'} {label} {frm}..{to}: sessions {sessions}, visitors {visitors}, views {views}, converted {converted}, "
          f"requests {requests} (linked {linked}, with source {tracked}), {len(src)} session sources, {len(first)} first sources" + (f" | MISMATCH {bad}" if bad else ""))
raise SystemExit(1 if failed else 0)
