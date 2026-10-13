"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { Check, ExternalLink, Info, Loader2, Mail, MessageCircle, Phone, X } from "lucide-react";
import { useManagerEvents, useReconcileOnReconnect } from "@/components/manager/ManagerRealtime";
import { formatAlmatyFull } from "@/components/manager/analytics/periods";
import { formatTenge, optionLabel, projectTypeLabel, usesBaseParameters } from "@/components/manager/requests/labels";
import StatusBadge from "@/components/manager/requests/StatusBadge";
import { isRequestEvent } from "@/components/manager/requests/useNewRequestCount";
import type { AuthErrorHandler } from "@/components/manager/useInbox";
import { useLocale } from "@/components/providers/LocaleProvider";
import { translateDuration } from "@/data/i18n/catalog";
import { fetchRequest, updateRequest, type ManagerApiResult } from "@/lib/api/manager";
import { byId, fill } from "@/lib/i18n";
import type { ApiEnvelope } from "@/types/api/manager";
import { REQUEST_STATUSES, type ApiRequestDetail, type RequestStatus } from "@/types/api/managerRequests";
import type { RealtimeEvent } from "@/types/api/realtime";

const NOTE_LIMIT = 4000;

interface Props {
  id: string;
  onClose: () => void;
  onAuthError: AuthErrorHandler;
  /** The list re-reads itself after a change made here. */
  onChanged: () => void;
}

type Load = { kind: "loading" } | { kind: "ready" } | { kind: "not_found" } | { kind: "error" };
type Save = { kind: "idle" } | { kind: "saving"; what: "status" | "note" } | { kind: "saved"; what: "status" | "note" } | { kind: "error"; message: string };

const section = "rounded-2xl border border-[var(--text-primary)]/10 bg-[var(--background)]/40 p-4";
const heading = "text-sm font-semibold text-slate-100 light:text-slate-900";

/**
 * One request in a side panel (full screen on phones). Re-read from the
 * API when it opens, after every realtime reconnect and whenever someone
 * changes it; an unsaved note is never overwritten by such a refresh.
 */
export default function RequestDetail({ id, onClose, onAuthError, onChanged }: Props) {
  const { t } = useLocale();
  const r = t.manager.requests;
  const d = r.detail;
  const [detail, setDetail] = useState<ApiRequestDetail | null>(null);
  const [load, setLoad] = useState<Load>({ kind: "loading" });
  const [save, setSave] = useState<Save>({ kind: "idle" });
  const [noteDraft, setNoteDraft] = useState("");
  const [elsewhere, setElsewhere] = useState(false);
  const detailRef = useRef<ApiRequestDetail | null>(null);
  const draftRef = useRef("");
  const savingRef = useRef(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    detailRef.current = detail;
  }, [detail]);
  useEffect(() => {
    draftRef.current = noteDraft;
  }, [noteDraft]);

  /** Applies fresh server data; keeps a note the manager is still editing. */
  const apply = useCallback((next: ApiRequestDetail, fromOwnSave: boolean) => {
    const prev = detailRef.current;
    const editing = prev !== null && draftRef.current !== prev.note.text;
    if (!editing || fromOwnSave) setNoteDraft(next.note.text);
    if (!fromOwnSave && prev && prev.updated_at !== next.updated_at) setElsewhere(true);
    setDetail(next);
  }, []);

  const handleError = useCallback(
    (result: ManagerApiResult<unknown>): string | null => {
      switch (result.kind) {
        case "unauthorized":
          onAuthError("unauthorized");
          return null;
        case "forbidden":
          return r.errors.forbidden;
        case "rate_limited":
          return fill(r.errors.rateLimited, { seconds: String(result.retryAfterSeconds) });
        case "network_error":
          return r.errors.network;
        case "validation_error":
          return r.errors.validation;
        default:
          return r.errors.save;
      }
    },
    [onAuthError, r.errors],
  );

  const reload = useCallback(
    (signal?: AbortSignal) => {
      void fetchRequest(id, signal).then((result: ManagerApiResult<ApiEnvelope<ApiRequestDetail>>) => {
        if (result.kind === "aborted") return;
        if (result.kind === "ok") {
          apply(result.data.data, false);
          setLoad({ kind: "ready" });
        } else if (result.kind === "not_found") {
          setLoad({ kind: "not_found" });
        } else if (result.kind === "unauthorized") {
          onAuthError("unauthorized");
        } else if (!detailRef.current) {
          setLoad({ kind: "error" });
        }
      });
    },
    [id, apply, onAuthError],
  );

  useEffect(() => {
    const controller = new AbortController();
    reload(controller.signal);
    return () => controller.abort();
  }, [reload]);
  useReconcileOnReconnect(useCallback(() => reload(), [reload]));
  useManagerEvents(
    useCallback(
      (event: RealtimeEvent) => {
        // Our own save answers with the new state; its echo is not news.
        if (isRequestEvent(event) && event.data?.request_id === id && !savingRef.current) reload();
      },
      [id, reload],
    ),
  );

  // Escape closes; focus starts on the close button.
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = async (what: "status" | "note", change: { status?: RequestStatus; note?: string }) => {
    savingRef.current = true;
    setSave({ kind: "saving", what });
    const result = await updateRequest(id, change);
    savingRef.current = false;
    if (result.kind === "ok") {
      apply(result.data.data, true);
      setElsewhere(false);
      setSave({ kind: "saved", what });
      onChanged();
      return;
    }
    const message = handleError(result);
    if (message) setSave({ kind: "error", message });
    else setSave({ kind: "idle" });
  };

  const noteLength = noteDraft.trim().length;
  const noteDirty = detail !== null && noteDraft.trim() !== detail.note.text;
  const saving = save.kind === "saving";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="request-title"
        onClick={(event) => event.stopPropagation()}
        className="flex h-full w-full max-w-2xl flex-col border-l border-[var(--text-primary)]/10 bg-[var(--surface)]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--text-primary)]/10 px-4 py-3 md:px-5">
          <div className="flex min-w-0 items-start gap-2">
            <div className="min-w-0">
              <h2 id="request-title" className="flex flex-wrap items-center gap-2 text-lg font-semibold text-slate-100 light:text-slate-900">
                {detail ? fill(d.title, { number: String(detail.number) }) : r.title}
                {detail ? <StatusBadge status={detail.status} /> : null}
              </h2>
              {detail ? <p className="text-xs text-slate-400 light:text-slate-600">{fill(d.received, { date: formatAlmatyFull(detail.created_at) })}</p> : null}
            </div>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label={d.close} className="shrink-0 rounded-xl border border-[var(--text-primary)]/15 p-2 transition hover:bg-[var(--text-primary)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 md:px-5">
          {load.kind === "loading" && !detail ? (
            <p className="flex items-center gap-2 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />{d.loading}</p>
          ) : null}
          {load.kind === "not_found" ? <p role="alert" className="text-sm text-slate-400">{d.notFound}</p> : null}
          {load.kind === "error" ? (
            <p role="alert" className="flex items-center gap-3 text-sm text-rose-300 light:text-rose-700">
              {d.failed}
              <button type="button" onClick={() => reload()} className="rounded-xl border border-[var(--text-primary)]/15 px-3 py-1 text-xs text-slate-300">{r.retry}</button>
            </p>
          ) : null}

          {elsewhere ? (
            <p role="status" className="flex items-start gap-2 rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-3 py-2 text-xs text-cyan-100 light:text-cyan-900">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {d.updatedElsewhere}
            </p>
          ) : null}

          {detail ? (
            <>
              <ClientSection detail={detail} />
              <ProjectSection detail={detail} />
              <EstimateSection detail={detail} />

              <section className={section} aria-labelledby="rq-status">
                <h3 id="rq-status" className={heading}>{d.status}</h3>
                <div role="radiogroup" aria-labelledby="rq-status" className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {REQUEST_STATUSES.map((status) => {
                    const active = detail.status === status;
                    return (
                      <button
                        key={status}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        disabled={saving}
                        onClick={() => !active && void submit("status", { status })}
                        className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 disabled:opacity-60 ${
                          active
                            ? "bg-gradient-to-r from-violet-600 to-blue-600 text-white"
                            : "border border-[var(--text-primary)]/15 bg-[var(--text-primary)]/5 text-slate-300 hover:bg-[var(--text-primary)]/10 light:text-slate-700"
                        }`}
                      >
                        {active ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                        {r.statuses[status]}
                      </button>
                    );
                  })}
                </div>
                <SaveLine save={save} what="status" savedText={d.statusSaved} savingText={d.saving} />
              </section>

              <section className={section} aria-labelledby="rq-note">
                <h3 id="rq-note" className={heading}>{d.note}</h3>
                <form
                  className="mt-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (noteLength <= NOTE_LIMIT && noteDirty) void submit("note", { note: noteDraft.trim() });
                  }}
                >
                  <label htmlFor="rq-note-text" className="sr-only">{d.note}</label>
                  <textarea
                    id="rq-note-text"
                    value={noteDraft}
                    onChange={(event) => setNoteDraft(event.target.value)}
                    placeholder={d.notePlaceholder}
                    rows={4}
                    aria-invalid={noteLength > NOTE_LIMIT}
                    aria-describedby="rq-note-help"
                    className="w-full resize-y rounded-xl border border-[var(--text-primary)]/15 bg-[var(--background)]/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/30 light:text-slate-900"
                  />
                  <div id="rq-note-help" className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                    <span>
                      {detail.note.updated_at && detail.note.updated_by
                        ? fill(d.noteUpdated, { name: detail.note.updated_by.name, date: formatAlmatyFull(detail.note.updated_at) })
                        : null}
                      {noteDirty ? <span className="ml-2 text-amber-300 light:text-amber-700">{d.noteDirty}</span> : null}
                    </span>
                    <span className={`tabular-nums ${noteLength > NOTE_LIMIT ? "text-rose-300 light:text-rose-700" : ""}`}>
                      {fill(d.noteCounter, { count: String(noteLength) })}
                    </span>
                  </div>
                  {noteLength > NOTE_LIMIT ? <p role="alert" className="mt-1 text-xs text-rose-300 light:text-rose-700">{d.noteTooLong}</p> : null}
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <button
                      type="submit"
                      disabled={!noteDirty || saving || noteLength > NOTE_LIMIT}
                      className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-4 text-sm font-semibold text-white transition disabled:opacity-50"
                    >
                      {d.noteSave}
                    </button>
                    <SaveLine save={save} what="note" savedText={d.noteSaved} savingText={d.saving} inline />
                  </div>
                </form>
              </section>

              <HistorySection detail={detail} />
              <SourceSection detail={detail} />
            </>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

function SaveLine({ save, what, savedText, savingText, inline = false }: { save: Save; what: "status" | "note"; savedText: string; savingText: string; inline?: boolean }) {
  const cls = inline ? "text-xs" : "mt-2 text-xs";
  if (save.kind === "error") return <p role="alert" className={`${cls} text-rose-300 light:text-rose-700`}>{save.message}</p>;
  if (save.kind === "saving" && save.what === what)
    return <p role="status" className={`${cls} flex items-center gap-1.5 text-slate-400`}><Loader2 className="h-3 w-3 animate-spin motion-reduce:animate-none" aria-hidden="true" />{savingText}</p>;
  if (save.kind === "saved" && save.what === what)
    return <p role="status" className={`${cls} flex items-center gap-1.5 text-emerald-300 light:text-emerald-700`}><Check className="h-3 w-3" aria-hidden="true" />{savedText}</p>;
  return null;
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[11rem_1fr] sm:gap-3">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="min-w-0 break-words text-sm text-slate-200 light:text-slate-800">{children}</dd>
    </div>
  );
}

function NotGiven() {
  const { t } = useLocale();
  return <span className="text-slate-500">{t.manager.requests.notSpecified}</span>;
}

const action =
  "inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60";

function ClientSection({ detail }: { detail: ApiRequestDetail }) {
  const { t } = useLocale();
  const r = t.manager.requests;
  const d = r.detail;
  return (
    <section className={section} aria-labelledby="rq-client">
      <h3 id="rq-client" className={heading}>{d.client}</h3>
      <dl className="mt-3 space-y-2.5">
        <Fact label={d.name}><span translate="no">{detail.name}</span></Fact>
        <Fact label={d.company}>{detail.company ? <span translate="no">{detail.company}</span> : <NotGiven />}</Fact>
        <Fact label={d.phone}>
          {detail.phone ? (
            <span className="flex flex-col gap-2">
              <span className="tabular-nums">{detail.phone}</span>
              <span className="flex flex-wrap gap-2">
                <a href={`tel:${detail.phone}`} className={`${action} border-cyan-400/30 bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/20 light:text-cyan-800`}>
                  <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                  {d.call}
                </a>
                {detail.whatsapp_phone ? (
                  <a
                    href={`https://wa.me/${detail.whatsapp_phone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${action} border-emerald-400/30 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/20 light:text-emerald-800`}
                  >
                    <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    {d.whatsapp}
                    <ExternalLink className="h-3 w-3 opacity-70" aria-hidden="true" />
                  </a>
                ) : null}
              </span>
              {!detail.whatsapp_phone ? <span className="text-xs text-slate-500">{d.whatsappUnknown}</span> : null}
            </span>
          ) : (
            <NotGiven />
          )}
        </Fact>
        <Fact label={d.email}>
          {detail.email ? (
            <span className="flex flex-wrap items-center gap-2">
              <span className="break-all">{detail.email}</span>
              <a href={`mailto:${detail.email}`} className={`${action} border-violet-400/30 bg-violet-400/10 text-violet-200 hover:bg-violet-400/20 light:text-violet-800`}>
                <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                {d.writeEmail}
              </a>
            </span>
          ) : (
            <NotGiven />
          )}
        </Fact>
        <Fact label={d.preferred}>{byId(r.contactMethods, detail.contact_method) ?? detail.contact_method}</Fact>
      </dl>
    </section>
  );
}

function ProjectSection({ detail }: { detail: ApiRequestDetail }) {
  const { t } = useLocale();
  const d = t.manager.requests.detail;
  const o = t.contactPage.form.options;
  return (
    <section className={section} aria-labelledby="rq-project">
      <h3 id="rq-project" className={heading}>{d.project}</h3>
      <dl className="mt-3 space-y-2.5">
        <Fact label={d.projectType}>{projectTypeLabel(t, detail.project_type)}</Fact>
        <Fact label={d.budget}>{detail.budget_range ? optionLabel(o.budget, detail.budget_range) : <NotGiven />}</Fact>
        <Fact label={d.timeline}>{detail.desired_timeline ? optionLabel(o.timeline, detail.desired_timeline) : <NotGiven />}</Fact>
      </dl>
      <h4 className="mt-4 text-xs text-slate-500">
        {d.description} <span className="italic">({d.clientText})</span>
      </h4>
      {/* The client's own words: shown exactly as written, never translated. */}
      <p translate="no" className="mt-1 whitespace-pre-wrap break-words rounded-xl bg-[var(--text-primary)]/[0.04] px-3 py-2 text-sm leading-6 text-slate-100 light:text-slate-900">
        {detail.description}
      </p>
    </section>
  );
}

function EstimateSection({ detail }: { detail: ApiRequestDetail }) {
  const { t } = useLocale();
  const d = t.manager.requests.detail;
  const c = t.catalog;
  const e = detail.estimate;
  if (!e) {
    return (
      <section className={section} aria-labelledby="rq-estimate">
        <h3 id="rq-estimate" className={heading}>{d.estimate}</h3>
        <p className="mt-2 text-sm text-slate-400">{d.estimateNone}</p>
      </section>
    );
  }
  const b = e.breakdown;
  const price =
    e.is_individual || e.minimum_tenge === null || e.maximum_tenge === null
      ? d.individual
      : fill(d.range, { min: formatTenge(e.minimum_tenge), max: formatTenge(e.maximum_tenge) });
  return (
    <section className={section} aria-labelledby="rq-estimate">
      <h3 id="rq-estimate" className={heading}>{d.estimate}</h3>
      <p className="mt-2 text-xl font-bold tabular-nums text-slate-100 light:text-slate-900">{price}</p>
      <p className="text-xs text-slate-400 light:text-slate-600">
        {d.duration}: {translateDuration(c, e.duration_label)}
      </p>
      <h4 className="mt-4 text-xs font-semibold text-slate-400 light:text-slate-600">{d.params}</h4>
      {usesBaseParameters(b) ? (
        <p className="mt-1 flex items-start gap-1.5 text-xs text-slate-500">
          <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
          {d.defaultsNote}
        </p>
      ) : null}
      <dl className="mt-2 space-y-2">
        {b.scale_tier_id ? <Fact label={d.scale}>{byId(c.scale, b.scale_tier_id) ?? b.scale_tier_id}</Fact> : null}
        <Fact label={d.modules}>
          {b.modules.length === 0 ? (
            d.noModules
          ) : (
            <ul className="space-y-0.5">
              {b.modules.map((m) => (
                <li key={m.module_id} className="flex justify-between gap-3">
                  <span>
                    {byId(c.modules, m.module_id) ?? m.module_id}
                    {m.quantity > 1 ? ` ×${m.quantity}` : ""}
                  </span>
                  <span className="tabular-nums text-slate-400">{formatTenge(m.total_tenge)}</span>
                </li>
              ))}
            </ul>
          )}
        </Fact>
        <Fact label={d.design}>{byId(c.design, b.design_level_id) ?? b.design_level_id}</Fact>
        <Fact label={d.complexity}>{byId(c.complexity, b.complexity_id) ?? b.complexity_id}</Fact>
        <Fact label={d.urgency}>{byId(c.urgency, b.urgency_id) ?? b.urgency_id}</Fact>
        <Fact label={d.multilingual}>{b.multilingual ? d.yes : d.no}</Fact>
      </dl>
      <p className="mt-3 text-[11px] text-slate-500">{fill(d.pricingVersion, { version: e.pricing_version })}</p>
    </section>
  );
}

function HistorySection({ detail }: { detail: ApiRequestDetail }) {
  const { t } = useLocale();
  const r = t.manager.requests;
  const d = r.detail;
  return (
    <section className={section} aria-labelledby="rq-history">
      <h3 id="rq-history" className={heading}>{d.history}</h3>
      {detail.history.length === 0 ? <p className="mt-2 text-xs text-slate-500">{d.historyEmpty}</p> : null}
      <ol className="mt-3 space-y-2.5 border-l border-[var(--text-primary)]/10 pl-4">
        {detail.history.map((h) => (
          <li key={h.id} className="relative text-sm">
            <span aria-hidden="true" className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-violet-500" />
            <span className="flex flex-wrap items-center gap-1.5">
              <StatusBadge status={h.old_status} />
              <span aria-hidden="true" className="text-slate-500">→</span>
              <StatusBadge status={h.new_status} />
            </span>
            <span className="mt-0.5 block text-xs text-slate-400 light:text-slate-600">
              {h.staff.name} · <span className="tabular-nums">{formatAlmatyFull(h.changed_at)}</span>
            </span>
          </li>
        ))}
        <li className="relative text-sm">
          <span aria-hidden="true" className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-pink-500" />
          <span className="text-slate-200 light:text-slate-800">{d.historyCreated}</span>
          <span className="mt-0.5 block text-xs tabular-nums text-slate-400 light:text-slate-600">{formatAlmatyFull(detail.created_at)}</span>
        </li>
      </ol>
    </section>
  );
}

function SourceSection({ detail }: { detail: ApiRequestDetail }) {
  const { t } = useLocale();
  const a = t.manager.analytics;
  const d = t.manager.requests.detail;
  const s = detail.analytics;
  const label = (source: string, medium: string) =>
    source === "(direct)" ? a.direct : `${source} / ${medium === "(not set)" ? a.notSet : medium}`;
  return (
    <section className={section} aria-labelledby="rq-source">
      <h3 id="rq-source" className={heading}>{d.source}</h3>
      {s ? (
        <>
          <dl className="mt-3 space-y-2">
            <Fact label={d.sourceChannel}>{label(s.source, s.medium)}</Fact>
            {s.campaign ? <Fact label={d.campaign}>{s.campaign}</Fact> : null}
            {s.term ? <Fact label={d.term}>{s.term}</Fact> : null}
            {s.content ? <Fact label={d.content}>{s.content}</Fact> : null}
            {s.referrer_host ? <Fact label={d.referrer}>{s.referrer_host}</Fact> : null}
            <Fact label={d.landing}>{s.landing_path}</Fact>
            <Fact label={d.firstSource}>{label(s.first_source, s.first_medium) + (s.first_campaign ? ` · ${s.first_campaign}` : "")}</Fact>
            <Fact label={d.device}>{a.devices[s.device] ?? s.device}</Fact>
          </dl>
          <Link
            href={`/manager/analytics?session=${s.session_id}`}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-300 underline underline-offset-2 light:text-cyan-700"
          >
            {d.openSession}
          </Link>
        </>
      ) : (
        <p className="mt-2 flex items-start gap-2 text-xs leading-5 text-slate-400 light:text-slate-600">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {d.sourceNone}
        </p>
      )}
    </section>
  );
}
