import type {
  ApiErrorEnvelope,
  ApiSuccessEnvelope,
  CreateProjectRequestPayload,
  ProjectRequestData,
  SubmitProjectRequestResult,
} from "@/types/api/projectRequest";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export async function submitProjectRequest(
  payload: CreateProjectRequestPayload,
): Promise<SubmitProjectRequestResult> {
  if (!API_BASE_URL) {
    return {
      kind: "error",
      message: "Адрес backend не настроен (NEXT_PUBLIC_API_URL).",
    };
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/v1/project-requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    return {
      kind: "error",
      message:
        "Не удалось связаться с сервером. Проверьте подключение и попробуйте ещё раз.",
    };
  }

  if (response.status === 201) {
    const body = (await response.json()) as ApiSuccessEnvelope<ProjectRequestData>;
    return { kind: "success", data: body.data };
  }

  if (response.status === 422) {
    const body = (await response.json()) as ApiErrorEnvelope;
    return {
      kind: "validation_error",
      fields: body.error.fields ?? {},
      message: body.error.message,
    };
  }

  return {
    kind: "error",
    message: "Сервер вернул непредвиденную ошибку. Попробуйте позже.",
  };
}
