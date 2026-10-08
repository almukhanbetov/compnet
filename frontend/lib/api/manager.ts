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
