export class HttpError extends Error {
  constructor(message, status) {
    super(
      String(message || "Request gagal.")
    );

    this.name = "HttpError";

    this.status =
      Number.isInteger(status) &&
      status >= 400 &&
      status <= 599
        ? status
        : 500;
  }
}

/*
 * ============================================================
 * CORS
 * ============================================================
 */

export function corsHeaders(env = {}) {
  const configuredOrigin =
    String(
      env.ALLOWED_ORIGIN || ""
    ).trim();

  const origin =
    configuredOrigin || "*";

  return {
    "Access-Control-Allow-Origin":
      origin,

    "Access-Control-Allow-Methods":
      "GET,POST,PUT,DELETE,OPTIONS",

    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, Idempotency-Key, x-enable",

    "Access-Control-Max-Age":
      "86400",

    Vary:
      "Origin"
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
  const safeStatus =
    Number.isInteger(status) &&
    status >= 100 &&
    status <= 599
      ? status
      : 500;

  return new Response(
    JSON.stringify(
      data,
      null,
      2
    ),
    {
      status:
        safeStatus,

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
  if (!res) {
    return {};
  }

  let text = "";

  try {
    text =
      await res.text();
  } catch {
    return {};
  }

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(
      text
    );
  } catch {
    return {
      raw:
        text.slice(
          0,
          4000
        )
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
      request?.headers?.get(
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

  const safeMaxBytes =
    Number.isFinite(
      Number(maxBytes)
    ) &&
    Number(maxBytes) > 0
      ? Math.floor(
          Number(maxBytes)
        )
      : 65536;

  const contentLength =
    request.headers.get(
      "content-length"
    );

  const len =
    Number(
      contentLength || 0
    );

  if (
    Number.isFinite(len) &&
    len > safeMaxBytes
  ) {
    throw new HttpError(
      "Request terlalu besar.",
      413
    );
  }

  const text =
    await request.text();

  const byteLength =
    new TextEncoder()
      .encode(text)
      .byteLength;

  if (
    byteLength >
    safeMaxBytes
  ) {
    throw new HttpError(
      "Request terlalu besar.",
      413
    );
  }

  if (!text.trim()) {
    throw new HttpError(
      "Body request kosong.",
      400
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
 *
 * Jangan mengembalikan seluruh raw response provider
 * kepada client. Respons provider dapat berisi detail
 * internal yang tidak diperlukan oleh frontend.
 */

export function apiError(
  data,
  fallback = "Request gagal."
) {
  const defaultMessage =
    String(
      fallback ||
        "Request gagal."
    ).trim();

  let message = "";

  if (
    typeof data?.error ===
    "string"
  ) {
    message =
      data.error;
  } else if (
    typeof data?.error?.message ===
    "string"
  ) {
    message =
      data.error.message;
  } else if (
    typeof data?.message ===
    "string"
  ) {
    message =
      data.message;
  }

  message =
    String(
      message || ""
    ).trim();

  /*
   * Batasi pesan agar respons error tidak dapat
   * digunakan untuk membocorkan data berukuran besar.
   */
  if (
    message.length > 1000
  ) {
    message =
      message.slice(
        0,
        1000
      );
  }

  return (
    message ||
    defaultMessage
  );
}
