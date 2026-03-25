export interface ApiResponseEnvelope {
  success?: boolean;
  error?: string;
  errorCode?: string;
}
function isNoContentStatus(status: number) {
  return status === 204 || status === 205 || status === 304;
}

export async function parseApiResponseJson<T extends object>(
  response: Response
) {
  if (isNoContentStatus(response.status)) {
    return {} as T & ApiResponseEnvelope;
  }
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) {
    return {} as T & ApiResponseEnvelope;
  }
  return (await response
    .json()
    .catch(() => ({}))) as T & ApiResponseEnvelope;
}

export function isApiFailure(
  response: Response,
  payload: ApiResponseEnvelope | null | undefined
) {
  return !response.ok || payload?.success === false;
}

export function getApiErrorMessage(
  payload: ApiResponseEnvelope | null | undefined,
  fallback: string
) {
  const message = payload?.error?.trim() || fallback;
  if (payload?.errorCode) {
    return `${message} (${payload.errorCode})`;
  }
  return message;
}
