"""Stage 8.7D: the traffic sources API against an independent count, per period (Asia/Almaty).
Sessions, their visitors' earliest sessions and conversions are read from PostgreSQL; the channel
rule is written again here (not imported from Go) and everything is counted in Python.
Isolated stack only. usage: python3 -I sources-sql.py   (credentials from staff.env, never printed)"""
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


# The channel rule, independently: what the visit analytics can store → report channel.
SOCIAL = {"instagram", "facebook", "telegram", "vk", "youtube", "tiktok", "linkedin", "x", "whatsapp", "threads", "fb", "ig", "vkontakte", "tg", "meta"}
SOCIAL_MEDIUMS = {"social", "social-network", "social-media", "sm", "smm", "paid-social", "paidsocial", "social-paid", "social-ads", "smm-ads"}
PAID = {"cpc", "ppc", "paid", "paidsearch", "paid-search", "sem", "search-ads"}


def channel(source, medium):
    s = source.strip().lower()
    m = medium.strip().lower().replace("_", "-").replace(" ", "-")
    m = "" if m in ("(not-set)", "(none)", "(not set)") else m
    if s in ("chatgpt.com", "chat.openai.com", "chatgpt"):
        return "chatgpt"
    if s == "(direct)":
        return "direct"
    if s in ("", "(not set)"):
        return "other"
    if m in SOCIAL_MEDIUMS or (m in PAID and s in SOCIAL) or (m == "" and s in SOCIAL):
        return "social"
    if s == "google" and m == "organic":
        return "google_organic"
    if s == "google" and m in PAID:
        return "google_cpc"
    if m == "referral":
        return "referral"
    return "other"


call("POST", "/api/v1/manager/auth/login", {"email": env["MGR_EMAIL"], "password": env["MGR_PW"]})
today = datetime.datetime.now(zoneinfo.ZoneInfo("Asia/Almaty")).date()
day = lambda n: (today + datetime.timedelta(days=n)).isoformat()
periods = [("Сегодня", day(0), day(0)), ("Вчера", day(-1), day(-1)), ("7 дней", day(-6), day(0)), ("30 дней", day(-29), day(0)),
           ("Текущий месяц", today.replace(day=1).isoformat(), day(0)), ("свой период", day(-2), day(-1))]
half_up = lambda part, whole: ((part * 2000 + whole) // (2 * whole)) / 10 if whole else None
# Every visitor's earliest stored session (ties by id, as the report).
first_of = {v: sid for v, sid in sql("SELECT DISTINCT ON (visitor_id) visitor_id, id FROM analytics_sessions ORDER BY visitor_id, started_at, id")}
converted = {r[0] for r in sql("SELECT DISTINCT session_id FROM analytics_events WHERE type IN ('lead_submit','chat_first_message')")}
failed = 0
for label, frm, to in periods:
    rows = sql(f"""SELECT id, visitor_id, source, medium, first_source, first_medium FROM analytics_sessions
                   WHERE (started_at AT TIME ZONE 'Asia/Almaty')::date BETWEEN '{frm}' AND '{to}'""")
    total = len(rows)

    def count(key_of):
        acc = {}
        for sid, v, src, med, fsrc, fmed in rows:
            a = acc.setdefault(key_of(src, med, fsrc, fmed), {"s": 0, "v": set(), "n": set(), "c": 0})
            a["s"] += 1; a["v"].add(v); a["c"] += sid in converted
            if first_of[v] == sid:
                a["n"].add(v)
        return {k: (a["s"], len(a["v"]), len(a["n"]), len(a["v"]) - len(a["n"]), a["c"], half_up(a["c"], a["s"]), half_up(a["s"], total)) for k, a in acc.items()}

    want = count(lambda s, m, fs, fm: channel(s, m))
    want_first = count(lambda s, m, fs, fm: channel(fs, fm))
    api = call("GET", f"/api/v1/manager/analytics/sources?from={frm}&to={to}")["data"]
    norm = lambda lst: {c["key"]: (c["sessions"], c["visitors"], c["new_visitors"], c["returning_visitors"], c["converted_sessions"], c["conversion"], c["share"]) for c in lst if c["sessions"]}
    t = api["totals"]
    visitors = {r[1] for r in rows}
    new_total = {r[1] for r in rows if first_of[r[1]] == r[0]}
    tot_ok = (t["sessions"], t["visitors"], t["new_visitors"], t["converted_sessions"]) == (total, len(visitors), len(new_total), sum(r[0] in converted for r in rows))
    ok = norm(api["channels"]) == want and norm(api["first_channels"]) == want_first and tot_ok and len(api["channels"]) == 7
    failed += not ok
    print(f"{'PASS' if ok else 'FAIL'} {label} {frm}..{to}: {total} sessions, " + " ".join(f"{k}={v[0]}" for k, v in sorted(want.items())) +
          ("" if ok else f" | API {norm(api['channels'])} first {norm(api['first_channels'])} totals_ok={tot_ok}"))
raise SystemExit(1 if failed else 0)
