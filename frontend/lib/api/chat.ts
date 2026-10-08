import type {
  ApiChatConversation,
  ApiChatEnvelope,
  ApiChatErrorEnvelope,
  ApiChatMessage,
  ApiChatMessagesMeta,
} from "@/types/api/chat";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * Every call resolves to one of these instead of throwing, so the widget
 * can render a precise state for each failure.
 */
export type ChatApiResult<T> =
  | { kind: "ok"; data: T; status: number }
  | { kind: "not_found"; message: string }
  | { kind: "validation_error"; message: string; fields: Record<string, string> }
  | { kind: "rate_limited"; retryAfterSeconds: number }
  | { kind: "network_error" }
  | { kind: "aborted" }
  | { kind: "error"; status: number; message: string };

async function request<T>(
  path: string,
  init: RequestInit & { signal?: AbortSignal } = {},
): Promise<ChatApiResult<T>> {
  if (!API_BASE_URL) {
    return { kind: "error", status: 0, message: "Адрес backend не настроен (NEXT_PUBLIC_API_URL)." };
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/v1/chat${path}`, {
      ...init,
      // The visitor is identified only by the HttpOnly cookie.
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

  if (response.ok) {
    try {
      return { kind: "ok", data: (await response.json()) as T, status: response.status };
    } catch {
      // Body cut off mid-flight: treat like a lost response.
      return { kind: "network_error" };
    }
  }

  if (response.status === 429) {
    const header = Number(response.headers.get("Retry-After"));
    return { kind: "rate_limited", retryAfterSeconds: Number.isFinite(header) && header > 0 ? header : 30 };
  }

  let body: ApiChatErrorEnvelope | null = null;
  try {
    body = (await response.json()) as ApiChatErrorEnvelope;
  } catch {
    body = null;
  }
  const message = body?.error.message ?? "Сервер вернул непредвиденную ошибку.";

  if (response.status === 404) {
    return { kind: "not_found", message };
  }
  if (response.status === 422) {
    return { kind: "validation_error", message, fields: body?.error.fields ?? {} };
  }
  return { kind: "error", status: response.status, message };
}

/** GET /chat — data is null while the visitor has no conversation yet. */
export function fetchConversation(signal?: AbortSignal) {
  return request<ApiChatEnvelope<ApiChatConversation | null>>("", { signal });
}

/** POST /chat/session — idempotent: returns the existing conversation or creates one. */
export function startSession(pageUrl: string) {
  return request<ApiChatEnvelope<ApiChatConversation>>("/session", {
    method: "POST",
    body: JSON.stringify({ page_url: pageUrl }),
  });
}

/** GET /chat/messages?after= — messages with id > after, oldest first. */
export function fetchMessages(after: number, signal?: AbortSignal) {
  return request<ApiChatEnvelope<ApiChatMessage[], ApiChatMessagesMeta>>(
    `/messages?after=${after}`,
    { signal },
  );
}

/** POST /chat/messages — 201 new, 200 when client_message_id was already stored. */
export function sendMessage(clientMessageId: string, body: string) {
  return request<ApiChatEnvelope<ApiChatMessage>>("/messages", {
    method: "POST",
    body: JSON.stringify({ client_message_id: clientMessageId, body }),
  });
}

/** POST /chat/read — moves the visitor's read marker forward. */
export function markRead(lastMessageId: number) {
  return request<ApiChatEnvelope<ApiChatConversation>>("/read", {
    method: "POST",
    body: JSON.stringify({ last_message_id: lastMessageId }),
  });
}

/** PUT /chat/contact — optional name and a required contact. */
export function updateContact(name: string, contact: string) {
  return request<ApiChatEnvelope<ApiChatConversation>>("/contact", {
    method: "PUT",
    body: JSON.stringify({ name, contact }),
  });
}
