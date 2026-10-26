import type {
  ApiAnalyticsReport,
  ApiAnalyticsSessionDetail,
  ApiAnalyticsVisits,
  ApiFunnel,
  ApiLeadsReport,
  LeadsFilter,
} from "@/types/api/analytics";
import type { ApiSourcesReport } from "@/types/api/analyticsSources";
import type {
  ApiAdminPromotion,
  ApiAdminTariff,
  ApiBasePrice,
  ApiBasePricePreview,
  ApiPriceHistoryEntry,
  ApiPricePreview,
  ApiPricingAdmin,
  PriceChangeInput,
  PricePreviewInput,
  PromotionPatch,
  TariffVersionInput,
} from "@/types/api/pricingAdmin";
import type {
  ApiRequestDetail,
  ApiRequestItem,
  ApiRequestListMeta,
  RequestListQuery,
  RequestStatus,
} from "@/types/api/managerRequests";
import type {
  ApiEnvelope,
  ApiInboxItem,
  ApiInboxMeta,
  ApiManagerConversation,
  ApiManagerMessage,
  ApiManagerSession,
  ApiMessagesMeta,
  ApiStaffUser,
  ApiUnreadCount,
  InboxFilter,
} from "@/types/api/manager";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * Every call resolves to one of these instead of throwing. The session lives
 * in an HttpOnly cookie scoped to /api/v1/manager: the page can neither read
 * it nor infer it, so "logged in" is only ever what the API says.
 */
export type ManagerApiResult<T> =
  | { kind: "ok"; data: T; status: number }
  | { kind: "unauthorized" }
  | { kind: "forbidden"; message: string }
  | { kind: "not_found"; message: string }
  | { kind: "conflict"; message: string }
  | { kind: "validation_error"; message: string; fields: Record<string, string> }
  | { kind: "rate_limited"; retryAfterSeconds: number }
  | { kind: "network_error" }
  | { kind: "aborted" }
  | { kind: "error"; status: number; message: string };

interface ErrorEnvelope {
  error?: { message?: string; fields?: Record<string, string> };
}

async function request<T>(path: string, init: RequestInit = {}): Promise<ManagerApiResult<T>> {
  if (!API_BASE_URL) {
    return { kind: "error", status: 0, message: "Адрес backend не настроен (NEXT_PUBLIC_API_URL)." };
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/v1/manager${path}`, {
      ...init,
      credentials: "include",
      cache: "no-store",
      headers: init.body ? { "Content-Type": "application/json" } : undefined,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return { kind: "aborted" };
    }
    return { kind: "network_error" };
  }

  if (response.status === 204) {
    return { kind: "ok", data: null as T, status: 204 };
  }
  if (response.ok) {
    try {
      return { kind: "ok", data: (await response.json()) as T, status: response.status };
    } catch {
      return { kind: "network_error" };
    }
  }
  if (response.status === 401) {
    return { kind: "unauthorized" };
  }
  if (response.status === 429) {
    const header = Number(response.headers.get("Retry-After"));
    return { kind: "rate_limited", retryAfterSeconds: Number.isFinite(header) && header > 0 ? header : 30 };
  }

  let body: ErrorEnvelope = {};
  try {
    body = (await response.json()) as ErrorEnvelope;
  } catch {
    body = {};
  }
  const message = body.error?.message ?? "Сервер вернул непредвиденную ошибку.";
  switch (response.status) {
    case 403:
      return { kind: "forbidden", message };
    case 404:
      return { kind: "not_found", message };
    case 409:
      return { kind: "conflict", message };
    case 422:
      return { kind: "validation_error", message, fields: body.error?.fields ?? {} };
    default:
      return { kind: "error", status: response.status, message };
  }
}

function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "" && value !== 0) {
      search.set(key, String(value));
    }
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

export function fetchMe(signal?: AbortSignal) {
  return request<ApiEnvelope<ApiStaffUser>>("/auth/me", { signal });
}

/** The password goes straight into the request body and is not kept anywhere. */
export function login(email: string, password: string) {
  return request<ApiEnvelope<ApiManagerSession>>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function logout() {
  return request<null>("/auth/logout", { method: "POST" });
}

export function fetchConversations(
  params: { status: InboxFilter; cursor?: string; limit: number },
  signal?: AbortSignal,
) {
  return request<ApiEnvelope<ApiInboxItem[], ApiInboxMeta>>(`/conversations${query(params)}`, { signal });
}

export function fetchMessages(
  conversationId: string,
  params: { after?: number; before?: number; limit: number },
  signal?: AbortSignal,
) {
  return request<ApiEnvelope<ApiManagerMessage[], ApiMessagesMeta>>(
    `/conversations/${encodeURIComponent(conversationId)}/messages${query(params)}`,
    { signal },
  );
}

export function sendReply(conversationId: string, clientMessageId: string, body: string) {
  return request<ApiEnvelope<ApiManagerMessage>>(`/conversations/${encodeURIComponent(conversationId)}/messages`, {
    method: "POST",
    body: JSON.stringify({ client_message_id: clientMessageId, body }),
  });
}

export function markConversationRead(conversationId: string, lastMessageId: number) {
  return request<ApiEnvelope<ApiManagerConversation>>(`/conversations/${encodeURIComponent(conversationId)}/read`, {
    method: "POST",
    body: JSON.stringify({ last_message_id: lastMessageId }),
  });
}

export function setConversationStatus(conversationId: string, status: "open" | "closed") {
  return request<ApiEnvelope<ApiManagerConversation>>(`/conversations/${encodeURIComponent(conversationId)}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function fetchUnreadCount(signal?: AbortSignal) {
  return request<ApiEnvelope<ApiUnreadCount>>("/unread-count", { signal });
}

/** Statistics for whole Asia/Almaty days [from, to] (YYYY-MM-DD). */
export function fetchAnalyticsReport(from: string, to: string, signal?: AbortSignal) {
  return request<ApiEnvelope<ApiAnalyticsReport>>(`/analytics/report${query({ from, to })}`, { signal });
}

/** Requests by status, source, page, project type and day (Asia/Almaty dates). */
export function fetchLeadsReport(from: string, to: string, filter: LeadsFilter, signal?: AbortSignal) {
  return request<ApiEnvelope<ApiLeadsReport>>(`/analytics/leads${query({ from, to, ...filter })}`, { signal });
}

/** Conversion funnel of the sessions started in the period. */
export function fetchFunnel(from: string, to: string, signal?: AbortSignal) {
  return request<ApiEnvelope<ApiFunnel>>(`/analytics/funnel${query({ from, to })}`, { signal });
}

/** Visit counter: today (Asia/Almaty) and all time. */
export function fetchAnalyticsVisits(signal?: AbortSignal) {
  return request<ApiEnvelope<ApiAnalyticsVisits>>("/analytics/visits", { signal });
}

export function fetchAnalyticsSession(id: string, signal?: AbortSignal) {
  return request<ApiEnvelope<ApiAnalyticsSessionDetail>>(`/analytics/sessions/${encodeURIComponent(id)}`, { signal });
}

/** Traffic sources: sessions of the period by channel (of the session and of the visitor's first one). */
export function fetchTrafficSources(from: string, to: string, signal?: AbortSignal) {
  return request<ApiEnvelope<ApiSourcesReport>>(`/analytics/sources${query({ from, to })}`, { signal });
}

/** Project requests, newest first. Contacts are only ever read here. */
export function fetchRequests(params: RequestListQuery, signal?: AbortSignal) {
  return request<ApiEnvelope<ApiRequestItem[], ApiRequestListMeta>>(`/project-requests${query({ ...params })}`, { signal });
}

/** The "new requests" badge. */
export function fetchRequestSummary(signal?: AbortSignal) {
  return request<ApiEnvelope<{ new_count: number }>>("/project-requests/summary", { signal });
}

export function fetchRequest(id: string, signal?: AbortSignal) {
  return request<ApiEnvelope<ApiRequestDetail>>(`/project-requests/${encodeURIComponent(id)}`, { signal });
}

/** Tariffs and promotions (administrators only). */
export function fetchPricingAdmin(signal?: AbortSignal) {
  return request<ApiEnvelope<ApiPricingAdmin>>("/pricing", { signal });
}

export function updateTariff(slug: string, patch: { title?: string; description?: string; sort_order?: number; is_active?: boolean }) {
  return request<ApiEnvelope<ApiAdminTariff>>(`/pricing/tariffs/${encodeURIComponent(slug)}`, { method: "PATCH", body: JSON.stringify(patch) });
}

export function createTariffVersion(slug: string, input: TariffVersionInput) {
  return request<ApiEnvelope<ApiAdminTariff>>(`/pricing/tariffs/${encodeURIComponent(slug)}/versions`, { method: "POST", body: JSON.stringify(input) });
}

export function previewTariffPrice(slug: string, input: PricePreviewInput, signal?: AbortSignal) {
  return request<ApiEnvelope<ApiPricePreview>>(`/pricing/tariffs/${encodeURIComponent(slug)}/price/preview`, {
    method: "POST", body: JSON.stringify(input), signal,
  });
}

export function changeTariffPrice(slug: string, input: PriceChangeInput) {
  return request<ApiEnvelope<ApiAdminTariff>>(`/pricing/tariffs/${encodeURIComponent(slug)}/price`, { method: "POST", body: JSON.stringify(input) });
}

export function fetchTariffPriceHistory(slug: string, signal?: AbortSignal) {
  return request<ApiEnvelope<ApiPriceHistoryEntry[]>>(`/pricing/tariffs/${encodeURIComponent(slug)}/history`, { signal });
}

export function fetchBasePrices(signal?: AbortSignal) {
  return request<ApiEnvelope<ApiBasePrice[]>>("/pricing/base-prices", { signal });
}

export function previewBasePrice(projectType: string, price: number) {
  return request<ApiEnvelope<ApiBasePricePreview>>(`/pricing/base-prices/${encodeURIComponent(projectType)}/preview`, {
    method: "POST", body: JSON.stringify({ price_tenge: price }),
  });
}

export function changeBasePrice(projectType: string, input: { price_tenge: number; reason: string; expected_version: number }) {
  return request<ApiEnvelope<ApiBasePrice>>(`/pricing/base-prices/${encodeURIComponent(projectType)}`, { method: "POST", body: JSON.stringify(input) });
}

export function fetchBasePriceHistory(projectType: string, signal?: AbortSignal) {
  return request<ApiEnvelope<ApiPriceHistoryEntry[]>>(`/pricing/base-prices/${encodeURIComponent(projectType)}/history`, { signal });
}

export function setTariffCost(slug: string, cost: number) {
  return request<ApiEnvelope<ApiAdminTariff>>(`/pricing/tariffs/${encodeURIComponent(slug)}/cost`, { method: "PUT", body: JSON.stringify({ cost_tenge: cost }) });
}

export function updatePromotion(slug: string, patch: PromotionPatch) {
  return request<ApiEnvelope<ApiAdminPromotion>>(`/pricing/promotions/${encodeURIComponent(slug)}`, { method: "PATCH", body: JSON.stringify(patch) });
}

export function updateRequest(id: string, change: { status?: RequestStatus; note?: string }) {
  return request<ApiEnvelope<ApiRequestDetail>>(`/project-requests/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(change),
  });
}
