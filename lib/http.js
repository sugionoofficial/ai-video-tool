export class HttpError extends Error {
  constructor(message, status) {
    super(message);

    this.name = "HttpError";
    this.status = status;
  }
}

/*
 * ============================================================
 * CORS
 * ============================================================
 */

export function corsHeaders(env = {}) {
  const origin = String(
    env.ALLOWED_ORIGIN || "*"
  ).trim();

  return {
    "Access-Control-Allow-Origin": origin,

    "Access-Control-Allow-Methods":
      "GET,POST,PUT,DELETE,OPTIONS",

    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, Idempotency-Key, x-enable",

    "Access-Control-Max-Age":
      "86400",

    Vary: "Origin"
  };
}

/*
 * ============================================================
 * JSON RESPONSE
 * ============================================================
 */

export function json(
  data,
  status = 200,
  env = {}
) {
  return new Response(
    JSON.stringify(
      data,
      null,
      2
    ),
    {
      status,

      headers: {
        ...corsHeaders(env),

        "Content-Type":
          "application/json; charset=utf-8",

        "Cache-Control":
          "no-store",

        "X-Content-Type-Options":
          "nosniff",

        "Referrer-Policy":
          "no-referrer",

        "Permissions-Policy":
          "camera=(), microphone=(), geolocation=()"
      }
    }
  );
}

/*
 * ============================================================
 * SAFE JSON RESPONSE PARSER
 * ============================================================
 */

export async function safeJson(res) {
  const text =
    await res.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(
      text
    );
  } catch {
    return {
      raw: text
    };
  }
}

/*
 * ============================================================
 * JSON REQUEST VALIDATION
 * ============================================================
 */

export function requireJsonContentType(
  request
) {
  const ct =
    String(
      request.headers.get(
        "content-type"
      ) || ""
    ).toLowerCase();

  if (
    !ct.includes(
      "application/json"
    )
  ) {
    throw new HttpError(
      "Content-Type harus application/json.",
      415
    );
  }
}

/*
 * ============================================================
 * JSON REQUEST PARSER
 * ============================================================
 */

export async function readJson(
  request,
  maxBytes = 65536
) {
  requireJsonContentType(
    request
  );

  const len =
    Number(
      request.headers.get(
        "content-length"
      ) || 0
    );

  if (
    Number.isFinite(len) &&
    len > maxBytes
  ) {
    throw new HttpError(
      "Request terlalu besar.",
      413
    );
  }

  const text =
    await request.text();

  if (
    new TextEncoder()
      .encode(text)
      .byteLength > maxBytes
  ) {
    throw new HttpError(
      "Request terlalu besar.",
      413
    );
  }

  try {
    return JSON.parse(
      text
    );
  } catch {
    throw new HttpError(
      "JSON tidak valid.",
      400
    );
  }
}

/*
 * ============================================================
 * API ERROR
 * ============================================================
 */

export function apiError(
  data,
  fallback
) {
  if (
    typeof data?.error ===
    "string"
  ) {
    return data.error;
  }

  return (
    data?.error?.message ||
    data?.message ||
    data?.raw ||
    fallback
  );
}
