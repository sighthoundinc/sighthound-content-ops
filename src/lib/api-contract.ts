/**
 * API contract normalization for all Next route handlers.
 * - Success responses always include `success: true`
 * - Error responses always include `success: false`, `error`, and `errorCode`
 * - All responses include `x-api-contract-version`
 */

export const API_CONTRACT_VERSION = "2026-03-25";

const STATUS_ERROR_CODES: Record<number, string> = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  405: "METHOD_NOT_ALLOWED",
  409: "CONFLICT",
  422: "UNPROCESSABLE_ENTITY",
  429: "RATE_LIMITED",
  500: "INTERNAL_SERVER_ERROR",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getFallbackErrorMessage(status: number) {
  if (status >= 500) {
    return "Internal server error";
  }
  return "Request failed";
}

function getErrorCode(status: number) {
  return STATUS_ERROR_CODES[status] ?? `HTTP_${status}`;
}

function getErrorMessage(payload: unknown, status: number) {
  if (typeof payload === "string" && payload.trim().length > 0) {
    return payload;
  }

  if (isRecord(payload)) {
    if (typeof payload.error === "string" && payload.error.trim().length > 0) {
      return payload.error;
    }
    if (
      isRecord(payload.error) &&
      typeof payload.error.message === "string" &&
      payload.error.message.trim().length > 0
    ) {
      return payload.error.message;
    }
    if (
      typeof payload.message === "string" &&
      payload.message.trim().length > 0
    ) {
      return payload.message;
    }
  }

  return getFallbackErrorMessage(status);
}

function withContractHeader(headersInit?: HeadersInit) {
  const headers = new Headers(headersInit);
  headers.set("x-api-contract-version", API_CONTRACT_VERSION);
  headers.set("content-type", "application/json; charset=utf-8");
  return headers;
}

function jsonResponse(
  payload: Record<string, unknown>,
  status: number,
  headersInit?: HeadersInit
) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: withContractHeader(headersInit),
  });
}

function normalizeSuccessPayload(payload: unknown) {
  if (isRecord(payload)) {
    return {
      ...payload,
      success: true,
    };
  }
  if (payload === undefined || payload === null) {
    return { success: true };
  }
  return {
    success: true,
    data: payload,
  };
}

function normalizeErrorPayload(payload: unknown, status: number) {
  const message = getErrorMessage(payload, status);

  if (isRecord(payload)) {
    return {
      ...payload,
      success: false,
      error: message,
      errorCode:
        typeof payload.errorCode === "string" && payload.errorCode.trim().length > 0
          ? payload.errorCode
          : getErrorCode(status),
    };
  }

  return {
    success: false,
    error: message,
    errorCode: getErrorCode(status),
  };
}

function isJsonResponse(response: Response) {
  const contentType = response.headers.get("content-type");
  if (!contentType) {
    return false;
  }
  return contentType.toLowerCase().includes("application/json");
}
function isNoBodyStatus(status: number) {
  return status === 204 || status === 205 || status === 304;
}
function isRedirectStatus(status: number) {
  return status >= 300 && status < 400;
}
function passThroughResponse(response: Response, body: BodyInit | null = response.body) {
  const headers = new Headers(response.headers);
  headers.set("x-api-contract-version", API_CONTRACT_VERSION);
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function normalizeJsonResponse(response: Response) {
  const text = await response.clone().text();
  const hasBody = text.trim().length > 0;
  const status = response.status;

  if (!hasBody) {
    if (status >= 400) {
      return jsonResponse(
        normalizeErrorPayload(undefined, status),
        status,
        response.headers
      );
    }
    return jsonResponse(
      normalizeSuccessPayload(undefined),
      status,
      response.headers
    );
  }

  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    if (status >= 400) {
      return jsonResponse(
        normalizeErrorPayload(undefined, status),
        status,
        response.headers
      );
    }
    return jsonResponse(
      normalizeSuccessPayload(undefined),
      status,
      response.headers
    );
  }

  if (status >= 400) {
    return jsonResponse(
      normalizeErrorPayload(payload, status),
      status,
      response.headers
    );
  }

  return jsonResponse(
    normalizeSuccessPayload(payload),
    status,
    response.headers
  );
}

export function withApiContract<TArgs extends unknown[]>(
  handler: (...args: TArgs) => Promise<Response>
) {
  return async (...args: TArgs) => {
    try {
      const response = await handler(...args);
      if (isNoBodyStatus(response.status)) {
        return passThroughResponse(response, null);
      }
      if (isRedirectStatus(response.status)) {
        return passThroughResponse(response);
      }
      if (!isJsonResponse(response)) {
        return passThroughResponse(response);
      }
      return normalizeJsonResponse(response);
    } catch (error) {
      console.error("[api-contract] unhandled route error", error);
      return jsonResponse(
        {
          success: false,
          error: "Internal server error",
          errorCode: "INTERNAL_SERVER_ERROR",
        },
        500
      );
    }
  };
}
