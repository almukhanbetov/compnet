"""Stage 8.7C: the funnel API against an independent count, per period (Asia/Almaty).
The sessions and their event types are read from PostgreSQL and the steps are counted here,
in Python — not with the API's SQL. Isolated stack only.
usage: python3 -I funnel-sql.py   (credentials from staff.env, never printed)"""
import datetime, http.cookiejar, json, os, subprocess, urllib.request, zoneinfo

SP = os.path.dirname(os.path.abspath(__file__))
env = {}
for line in open(os.path.join(SP, "staff.env")):
    k, _, v = line.strip().partition("=")
    env[k] = v


def sql(q):
    out = subprocess.run(["docker", "exec", "-i", "compnet-stage86c-db", "psql", "-q", "-U", "postgres", "-d", "compnet_e2e", "-At", "-F", "\t"],
                         input=q, capture_output=True, text=True, check=True).stdout
    return [line.split("\t") for line in out.splitlines() if line]


op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))


def call(method, path, body=None):
    req = urllib.request.Request("http://127.0.0.1:8096" + path, method=method, data=json.dumps(body).encode() if body else None,
                                 headers={"Content-Type": "application/json", "Origin": "http://compnet.test:3006"})
    return json.loads(op.open(req).read())


call("POST", "/api/v1/manager/auth/login", {"email": env["MGR_EMAIL"], "password": env["MGR_PW"]})
today = datetime.datetime.now(zoneinfo.ZoneInfo("Asia/Almaty")).date()
day = lambda n: (today + datetime.timedelta(days=n)).isoformat()
periods = [("Сегодня", day(0), day(0)), ("Вчера", day(-1), day(-1)), ("7 дней", day(-6), day(0)), ("30 дней", day(-29), day(0)),
           ("Текущий месяц", today.replace(day=1).isoformat(), day(0)), ("свой период", day(-2), day(-1))]
# part/whole in percent, one decimal, halves rounded up (as Go's math.Round), in integers.
half_up = lambda part, whole: ((part * 2000 + whole) // (2 * whole)) / 10
INTEREST = lambda t, p: t == "page_view" and (p == "/services" or p.startswith("/services/") or p == "/calculator")
failed = 0
for label, frm, to in periods:
    rows = sql(f"""SELECT s.id, COALESCE(e.type, ''), COALESCE(e.path, '') FROM analytics_sessions s
                   LEFT JOIN analytics_events e ON e.session_id = s.id
                   WHERE (s.started_at AT TIME ZONE 'Asia/Almaty')::date BETWEEN '{frm}' AND '{to}'""")
    sessions = {}
    for sid, typ, path in rows:
        flags = sessions.setdefault(sid, set())
        if INTEREST(typ, path):
            flags.add("interest")
        if typ in ("calculator_start", "form_start"):
            flags.add("start")
        if typ in ("cta_click", "email_click"):
            flags.add("intent")
        if typ in ("lead_submit", "chat_first_message"):
            flags.add("conversion")
    chain, want = [], {"visit": len(sessions)}
    for step in ("interest", "start", "intent", "conversion"):
        chain.append(step)
        want[step] = sum(1 for f in sessions.values() if all(c in f for c in chain))
    converted = sum(1 for f in sessions.values() if "conversion" in f)

    api = call("GET", f"/api/v1/manager/analytics/funnel?from={frm}&to={to}")["data"]
    got = {s["key"]: s["sessions"] for s in api["steps"]}
    shares_ok = all(
        s["of_first"] == (half_up(s["sessions"], want["visit"]) if want["visit"] else None) for s in api["steps"])
    ok = got == want and api["converted_sessions"] == converted and api["conversions_outside_funnel"] == converted - want["conversion"] and shares_ok
    failed += not ok
    print(f"{'PASS' if ok else 'FAIL'} {label} {frm}..{to}: " + " ".join(f"{k}={v}" for k, v in want.items()) +
          f" converted={converted}" + ("" if ok else f" | API {got} converted={api['converted_sessions']} outside={api['conversions_outside_funnel']} shares_ok={shares_ok}"))
raise SystemExit(1 if failed else 0)
