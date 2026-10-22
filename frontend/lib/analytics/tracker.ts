import { uuidV4 } from "@/lib/chat/uuid";
import { apiBase } from "@/lib/analytics/config";
import { readConsent } from "@/lib/analytics/consent";
import { ga4Event } from "@/lib/analytics/ga4";
import { looksPersonal } from "@/lib/analytics/personal";

/**
 * First-party visit analytics in the browser.
 *
 * - Identifiers are random UUIDs in localStorage, created only after the
 *   visitor accepted analytics, removed when they decline. No
 *   fingerprinting: a "visitor" is a browser, not a person — another
 *   device, a private window or cleared storage counts as a new one.
 * - A session ends after 30 minutes without activity, or when the visitor
 *   arrives through a link with different UTM tags.
 * - The first source is stored once and never overwritten (a later direct
 *   visit does not erase where the visitor first came from).
 * - Before the visitor has chosen, the tab only remembers in memory where
 *   this visit entered the site (rememberLanding) — nothing is stored or
 *   sent. If they accept within the same visit, the first session starts
 *   from that entry; if they decline, it is forgotten.
 * - Only event types and page paths (no query strings) are sent — never
 *   form values, chat text, contacts or IPs (the server does not store IPs).
 * - Requests and first chat messages are recorded by the backend after
 *   saving them; the browser only passes its session id along — and, for
 *   a request, the visit's source (leadAttribution): paths, the referring
 *   host and UTM values, never full URLs. Of an ad click id (gclid,
 *   gbraid, wbraid) only which one was present is kept, never its value.
 */

export type ClientEventType =
  | "page_view"
  | "promo_view"
  | "promo_click"
  | "whatsapp_click"
  | "phone_click"
  | "chat_open";

const KEYS = {
  visitor: "compnet-a-visitor",
  session: "compnet-a-session",
  first: "compnet-a-first",
  optOut: "compnet-a-optout",
} as const;
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const FLUSH_DELAY_MS = 2_000;
const BATCH_LIMIT = 20;
const QUEUE_LIMIT = 100;
const UTM_KEYS = ["source", "medium", "campaign", "term", "content"] as const;
const CLICK_IDS = ["gclid", "gbraid", "wbraid"] as const;

type UTM = Record<(typeof UTM_KEYS)[number], string>;

interface Touch {
  utm: UTM;
  referrer_host: string;
  landing_path: string;
  /** Which ad click id the landing URL had ("" none); never its value. */
  click_id?: string;
}

interface StoredSession {
  id: string;
  lastActivity: number;
  touch: Touch;
  /** Last viewed page and the one before it (to tell where /contact was opened from). */
  path?: string;
  previousPath?: string;
}

/** A request's source as this browser saw it (see leadAttribution). */
export interface LeadAttribution {
  source_page: string;
  previous_page: string;
  landing_page: string;
  referrer_host: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  utm_term: string;
  click_id: string;
}

interface QueuedEvent {
  id: string;
  type: ClientEventType;
  path: string;
  sessionId: string;
}

let enabled = false;
let queue: QueuedEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let lastPageView: { path: string; at: number } | null = null;
/** Entry of this tab's visit, kept in memory only until consent is given. */
let pendingLanding: { touch: Touch; at: number } | null = null;

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function read<T>(key: string): T | null {
  try {
    const raw = storage()?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    storage()?.setItem(key, JSON.stringify(value));
  } catch {
    // Storage blocked: nothing is tracked beyond this page.
  }
}

/** Turned on by the provider once the backend says analytics is enabled. */
export function setAnalyticsEnabled(value: boolean): void {
  enabled = value;
}

/** The manager's "do not count this browser" switch. */
export function isOptedOut(): boolean {
  return storage()?.getItem(KEYS.optOut) === "1";
}

export function setOptedOut(value: boolean): void {
  try {
    if (value) {
      storage()?.setItem(KEYS.optOut, "1");
      forgetAnalyticsIds();
    } else {
      storage()?.removeItem(KEYS.optOut);
    }
  } catch {
    // ignore
  }
}

function isActive(): boolean {
  if (!enabled || typeof window === "undefined") return false;
  if (readConsent() !== "granted" || isOptedOut()) return false;
  if (navigator.webdriver) return false; // automated browsers (tests, scrapers)
  return !window.location.pathname.startsWith("/manager");
}

/** Removes every analytics identifier from this browser (consent withdrawn). */
export function forgetAnalyticsIds(): void {
  queue = [];
  pendingLanding = null;
  try {
    storage()?.removeItem(KEYS.visitor);
    storage()?.removeItem(KEYS.session);
    storage()?.removeItem(KEYS.first);
  } catch {
    // ignore
  }
}

function currentTouch(): Touch {
  const params = new URLSearchParams(window.location.search);
  const utm = Object.fromEntries(UTM_KEYS.map((key) => [key, utmValue(params.get(`utm_${key}`))])) as UTM;
  let referrerHost = "";
  try {
    if (document.referrer) {
      const ref = new URL(document.referrer);
      if (ref.host !== window.location.host) referrerHost = ref.hostname; // host only, never path/query
    }
  } catch {
    // malformed referrer: treat as direct
  }
  const clickId = CLICK_IDS.find((key) => params.has(key)) ?? "";
  return { utm, referrer_host: referrerHost, landing_path: window.location.pathname, click_id: clickId };
}

/** A UTM value as kept: trimmed, at most 100 characters, "" if it looks personal. */
function utmValue(raw: string | null): string {
  const value = (raw ?? "").trim();
  return looksPersonal(value) ? "" : value.slice(0, 100);
}

/**
 * Called once when the site opens, before the consent choice is known:
 * remembers in memory (not in storage, never sent) where this visit
 * entered, so a visitor who accepts analytics on a later page is not
 * counted as "unknown". Only while no choice has been made.
 */
export function rememberLanding(): void {
  if (typeof window === "undefined" || readConsent() !== null || pendingLanding) return;
  pendingLanding = { touch: currentTouch(), at: Date.now() };
}

function utmKey(utm: UTM): string {
  return UTM_KEYS.map((key) => utm[key]).join("|");
}

function visitorId(): string {
  let id = read<string>(KEYS.visitor);
  if (!id) {
    id = uuidV4();
    write(KEYS.visitor, id);
  }
  return id;
}

/** Current session, rotated after 30 minutes or on a new campaign link. */
function session(now: number): StoredSession {
  const stored = read<StoredSession>(KEYS.session);
  // The entry remembered before consent counts for the first session of
  // this visit only (and not after 30 minutes).
  const landing = !stored && pendingLanding && now - pendingLanding.at < SESSION_TIMEOUT_MS ? pendingLanding.touch : null;
  pendingLanding = null;
  const touch = landing ?? currentTouch();
  const newCampaign = utmKey(touch.utm).replace(/\|/g, "") !== "" && utmKey(touch.utm) !== utmKey(stored?.touch.utm ?? touch.utm);
  if (stored && now - stored.lastActivity < SESSION_TIMEOUT_MS && !newCampaign) {
    stored.lastActivity = now;
    write(KEYS.session, stored);
    return stored;
  }
  const fresh: StoredSession = { id: uuidV4(), lastActivity: now, touch };
  write(KEYS.session, fresh);
  if (!read<Touch>(KEYS.first)) {
    write(KEYS.first, touch); // first touch: kept for good
  }
  return fresh;
}

/** Remembers the page just viewed and the one before it in the session. */
function notePage(stored: StoredSession, path: string): void {
  if (stored.path === path) return;
  stored.previousPath = stored.path;
  stored.path = path;
  write(KEYS.session, stored);
}

/**
 * Where the request about to be sent came from, or undefined without
 * analytics consent. Sent together with analyticsSessionId(); the server
 * sanitizes the values and decides the channel itself.
 */
export function leadAttribution(): LeadAttribution | undefined {
  if (!isActive()) return undefined;
  const stored = session(Date.now());
  const here = window.location.pathname;
  // This page's view may not be recorded yet: then the last one is the previous page.
  const previous = (stored.path === here ? stored.previousPath : stored.path) ?? "";
  const { utm, referrer_host, landing_path, click_id } = stored.touch;
  return {
    source_page: here,
    previous_page: previous === here ? "" : previous,
    landing_page: landing_path,
    referrer_host,
    utm_source: utm.source,
    utm_medium: utm.medium,
    utm_campaign: utm.campaign,
    utm_content: utm.content,
    utm_term: utm.term,
    click_id: click_id ?? "",
  };
}

/** The analytics session id to attach to a request or chat message, if any. */
export function analyticsSessionId(): string | undefined {
  if (!isActive()) return undefined;
  return session(Date.now()).id;
}

export function track(type: ClientEventType): void {
  // GA4 (if configured) follows the same consent; it gets no ids.
  ga4Event(type, window.location.pathname);
  if (!isActive()) return;
  const path = window.location.pathname;
  const now = Date.now();
  if (type === "page_view") {
    // Re-renders and repeated effects for the same page are not new views.
    if (lastPageView && lastPageView.path === path && now - lastPageView.at < 1_500) return;
    lastPageView = { path, at: now };
  }
  const current = session(now);
  if (type === "page_view") notePage(current, path);
  const sessionId = current.id;
  queue.push({ id: uuidV4(), type, path, sessionId });
  if (queue.length > QUEUE_LIMIT) queue = queue.slice(-QUEUE_LIMIT);
  if (queue.length >= BATCH_LIMIT) {
    void flush();
  } else if (!timer) {
    timer = setTimeout(() => void flush(), FLUSH_DELAY_MS);
  }
}

function withoutClickId({ utm, referrer_host, landing_path }: Touch) {
  return { utm, referrer_host, landing_path };
}

/** Sends queued events; failed ones stay queued and are resent with the
 *  same ids (the server ignores repeats). */
export async function flush(): Promise<void> {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  const base = apiBase();
  if (!base || queue.length === 0 || !isActive()) return;
  const stored = read<StoredSession>(KEYS.session);
  const first = read<Touch>(KEYS.first);
  const visitor = visitorId();

  const bySession = new Map<string, QueuedEvent[]>();
  for (const event of queue.splice(0)) {
    bySession.set(event.sessionId, [...(bySession.get(event.sessionId) ?? []), event]);
  }
  for (const [sessionId, events] of bySession) {
    for (let i = 0; i < events.length; i += BATCH_LIMIT) {
      const chunk = events.slice(i, i + BATCH_LIMIT);
      const touch = stored?.id === sessionId ? stored.touch : currentTouch();
      const body = JSON.stringify({
        visitor_id: visitor,
        session_id: sessionId,
        language: document.documentElement.lang,
        // The ad click flag is only for a request's source: visit events do without it.
        session: withoutClickId(touch),
        first_touch: withoutClickId(first ?? touch),
        events: chunk.map(({ id, type, path }) => ({ id, type, path })),
      });
      try {
        const response = await fetch(`${base}/api/v1/analytics/events`, {
          method: "POST",
          body,
          keepalive: true, // survives navigation away / tab close
          credentials: "omit",
          headers: { "Content-Type": "text/plain;charset=UTF-8" }, // no CORS preflight
        });
        if (response.status === 429 || response.status >= 500) queue.unshift(...chunk);
      } catch {
        queue.unshift(...chunk); // offline: retry later with the same ids
      }
    }
  }
}
