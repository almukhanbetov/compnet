"""Stage 8.6C: checks every E2E journey against the isolated test PostgreSQL and the manager API.
Reads only the local test stack. Credentials come from the scratchpad env files (never printed)."""
import json, os, subprocess, sys, urllib.request, http.cookiejar

SP = os.path.dirname(os.path.abspath(__file__))
env = {}
for f in ("db.env", "staff.env"):
    for line in open(os.path.join(SP, f)):
        k, _, v = line.strip().partition("=")
        env[k] = v
API = "http://127.0.0.1:8096"
ORIGIN = "http://compnet.test:3006"


def sql(query, *params):
    # psql variables keep values out of the SQL text
    args = ["docker", "exec", "-i", "compnet-stage86c-db", "psql", "-q", "-U", "postgres", "-d", "compnet_e2e", "-At", "-F", "\t"]
    for i, p in enumerate(params):
        args += ["-v", f"p{i}={p}"]
    out = subprocess.run(args, input=query, capture_output=True, text=True, check=True).stdout
    return [line.split("\t") for line in out.splitlines() if line]


jar = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))


def call(method, path, body=None, origin=ORIGIN, op=opener):
    req = urllib.request.Request(API + path, method=method, data=json.dumps(body).encode() if body is not None else None,
                                 headers={"Content-Type": "application/json", "Origin": origin})
    try:
        with op.open(req, timeout=15) as r:
            return r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()


code, _ = call("POST", "/api/v1/manager/auth/login", {"email": env["MGR_EMAIL"], "password": env["MGR_PW"]})
assert code == 200, f"manager login failed: {code}"

FIELDS = ["channel", "source", "source_page", "previous_page", "landing_page", "referrer_host", "utm_source", "utm_medium",
          "utm_campaign", "utm_content", "utm_term", "click_id_type"]
results = []
for line in open(sys.argv[1]):
    j = json.loads(line)
    rows = sql("SELECT p.id, " + ", ".join(f"coalesce(a.{f}, '')" for f in FIELDS) + ", (a.project_request_id IS NOT NULL) "
               "FROM project_requests p LEFT JOIN project_request_attribution a ON a.project_request_id = p.id WHERE p.name = :'p0'", j["label"])
    rec = {"name": j["name"], "requests_in_db": len(rows), "expect": j.get("expect", {}), "sent_session": bool(j.get("sent", {}) and j["sent"].get("analytics_session_id"))}
    if rows:
        r = rows[0]
        rec["id"] = r[0]
        rec["db"] = dict(zip(FIELDS, r[1:13])) if r[13] == "t" else None
        sid = (j.get("sent") or {}).get("analytics_session_id")
        rec["lead_event"] = int(sql("SELECT count(*) FROM analytics_events WHERE type = 'lead_submit' AND project_request_id = :'p0'::uuid", r[0])[0][0])
        if sid:
            s = sql("SELECT coalesce(source,''), coalesce(medium,''), coalesce(campaign,''), coalesce(landing_path,''), coalesce(referrer_host,''), coalesce(first_source,''), coalesce(first_medium,'') FROM analytics_sessions WHERE id = :'p0'::uuid", sid)
            rec["session_row"] = dict(zip(["source", "medium", "campaign", "landing_path", "referrer_host", "first_source", "first_medium"], s[0])) if s else None
        code, body = call("GET", f"/api/v1/manager/project-requests/{r[0]}")
        rec["manager_status"] = code
        rec["manager_attribution"] = json.loads(body)["data"].get("attribution") if code == 200 else None
        rec["manager_leaks"] = [w for w in ("SECRET", "gclid", "gbraid", "wbraid", "client@example.com", "701 123") if w in body]
    # expectations
    exp = rec["expect"]
    got = rec.get("db") or {}
    mismatch = {}
    for k, v in exp.items():
        if k in ("note",):
            continue
        if k == "attribution":
            if (rec.get("db") is None) != (v is None):
                mismatch[k] = rec.get("db")
            continue
        if k == "session":
            row = rec.get("session_row") or {}
            for sk, sv in v.items():
                if row.get(sk) != sv:
                    mismatch["session." + sk] = row.get(sk)
            continue
        if k == "ad_click":
            if (got.get("click_id_type", "") != "") != v:
                mismatch[k] = got.get("click_id_type")
            continue
        if got.get(k, "") != v:
            mismatch[k] = got.get(k)
    rec["mismatch"] = mismatch
    rec["ok"] = rec["requests_in_db"] == 1 and not mismatch
    results.append(rec)

json.dump(results, open(os.path.join(SP, "verify.json"), "w"), ensure_ascii=False, indent=1)
for r in results:
    db = r.get("db") or {}
    ma = r.get("manager_attribution") or {}
    print(f"{'OK  ' if r['ok'] else 'DIFF'} {r['name']:32} db_rows={r['requests_in_db']} channel={db.get('channel','-'):15} source={db.get('source','-'):12} "
          f"landing={db.get('landing_page','-')} page={db.get('source_page','-')} prev={db.get('previous_page','-')} ref={db.get('referrer_host','-')} "
          f"utm={db.get('utm_source','')}/{db.get('utm_medium','')}/{db.get('utm_campaign','')} click={db.get('click_id_type','')} | lead_event={r.get('lead_event')} "
          f"| manager: {r.get('manager_status')} {ma.get('channel','-')}/{ma.get('source','-')} ad_click={ma.get('ad_click','-')} leaks={r.get('manager_leaks')}"
          + (f" | MISMATCH {r['mismatch']}" if r["mismatch"] else ""))
    if r.get("session_row"):
        print(f"     session: {r['session_row']}")
