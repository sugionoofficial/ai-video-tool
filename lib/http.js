export class HttpError extends Error {
  constructor(
    message,
    status
  ) {
    super(
      String(
        message ||
        "Request gagal."
      )
    );

    this.name =
      "HttpError";

    this.status =
      Number.isInteger(
        status
      ) &&
      status >= 400 &&
      status <= 599
        ? status
        : 500;
  }
}


/* ============================================================
CORS
============================================================ */

export function corsHeaders(
  env = {}
) {
  const configuredOrigin =
    String(
      env.ALLOWED_ORIGIN ||
      ""
    ).trim();

  /*
   * Production API jangan fallback ke wildcard.
   * Jika origin belum dikonfigurasi, browser tetap
   * dapat menerima same-origin request tanpa
   * Access-Control-Allow-Origin.
   */
  const headers = {
    "Access-Control-Allow-Methods":
      "GET,POST,PUT,DELETE,OPTIONS",

    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, Idempotency-Key, x-enable",

    "Access-Control-Max-Age":
      "86400",

    Vary:
      "Origin"
  };

  if (
    configuredOrigin
  ) {
    headers[
      "Access-Control-Allow-Origin"
    ] =
      configuredOrigin;
  }

  return headers;
}


/* ============================================================
JSON RESPONSE
============================================================ */

export function json(
  data,
  status = 200,
  env = {}
) {
  const safeStatus =
    Number.isInteger(
      status
    ) &&
    status >= 100 &&
    status <= 599
      ? status
      : 500;

  let body;

  try {
    body =
      JSON.stringify(
        data
      );
  } catch {
    body =
      JSON.stringify({
        success:
          false,

        error:
          "Response tidak dapat diproses."
      });
  }

  return new Response(
    body,
    {
      status:
        safeStatus,

      headers: {
        ...corsHeaders(
          env
        ),

        "Content-Type":
          "application/json; charset=utf-8",

        "Cache-Control":
          "no-store, no-cache, must-revalidate",

        Pragma:
          "no-cache",

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


/* ============================================================
SAFE JSON RESPONSE PARSER
============================================================ */

export async function safeJson(
  res
) {
  if (
    !res ||
    typeof res.text !==
      "function"
  ) {
    return {};
  }

  let text =
    "";

  try {
    text =
      await res.text();
  } catch {
    return {};
  }

  if (
    !text
  ) {
    return {};
  }

  try {
    return JSON.parse(
      text
    );
  } catch {
    /*
     * Jangan menyimpan response provider
     * tanpa batas.
     */
    return {
      raw:
        text.slice(
          0,
          4000
        )
    };
  }
}


/* ============================================================
JSON REQUEST VALIDATION
============================================================ */

export function requireJsonContentType(
  request
) {
  const contentType =
    String(
      request?.headers?.get(
        "content-type"
      ) ||
      ""
    ).toLowerCase();

  /*
   * application/json;charset=utf-8
   * dan variasi parameter lain tetap diterima.
   */
  if (
    !contentType.includes(
      "application/json"
    )
  ) {
    throw new HttpError(
      "Content-Type harus application/json.",
      415
    );
  }
}


/* ============================================================
JSON REQUEST PARSER
============================================================ */

export async function readJson(
  request,
  maxBytes = 65536
) {
  requireJsonContentType(
    request
  );

  const numericMax =
    Number(
      maxBytes
    );

  const safeMaxBytes =
    Number.isFinite(
      numericMax
    ) &&
    numericMax > 0
      ? Math.floor(
          numericMax
        )
      : 65536;


  /* ==========================================================
  CONTENT LENGTH CHECK
  ========================================================== */

  const contentLength =
    request?.headers?.get(
      "content-length"
    );

  const length =
    Number(
      contentLength || 0
    );

  if (
    Number.isFinite(
      length
    ) &&
    length > safeMaxBytes
  ) {
    throw new HttpError(
      "Request terlalu besar.",
      413
    );
  }


  /* ==========================================================
  READ BODY
  ========================================================== */

  let text;

  try {
    text =
      await request.text();
  } catch {
    throw new HttpError(
      "Body request tidak dapat dibaca.",
      400
    );
  }


  /* ==========================================================
  BYTE SIZE CHECK
  ========================================================== */

  const byteLength =
    new TextEncoder()
      .encode(
        text
      )
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


  /* ==========================================================
  EMPTY BODY
  ========================================================== */

  if (
    !text.trim()
  ) {
    throw new HttpError(
      "Body request kosong.",
      400
    );
  }


  /* ==========================================================
  PARSE JSON
  ========================================================== */

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


/* ============================================================
API ERROR
============================================================ */

/*
 * Mengambil pesan error yang aman dari response
 * internal/provider.
 *
 * Jangan pernah meneruskan:
 * - stack trace
 * - API key
 * - authorization header
 * - raw provider response besar
 */

export function apiError(
  data,
  fallback = "Request gagal."
) {
  const defaultMessage =
    String(
      fallback ||
      "Request gagal."
    )
      .trim()
      .slice(
        0,
        500
      );

  let message =
    "";


  /* ==========================================================
  ERROR STRING
  ========================================================== */

  if (
    typeof data?.error ===
    "string"
  ) {
    message =
      data.error;
  }


  /* ==========================================================
  ERROR OBJECT
  ========================================================== */

  else if (
    typeof data?.error ===
      "object" &&
    data?.error !== null &&
    typeof data.error.message ===
      "string"
  ) {
    message =
      data.error.message;
  }


  /* ==========================================================
  TOP-LEVEL MESSAGE
  ========================================================== */

  else if (
    typeof data?.message ===
    "string"
  ) {
    message =
      data.message;
  }


  message =
    String(
      message ||
      ""
    )
      .trim();


  /* ==========================================================
  REMOVE SENSITIVE CONTENT
  ========================================================== */

  message =
    message
      .replace(
        /Bearer\s+[A-Za-z0-9._-]+/gi,
        "Bearer [REDACTED]"
      )
      .replace(
        /api[_-]?key\s*[:=]\s*[^\s,;]+/gi,
        "api_key=[REDACTED]"
      )
      .replace(
        /authorization\s*[:=]\s*[^\s,;]+/gi,
        "authorization=[REDACTED]"
      );


  /* ==========================================================
  LIMIT ERROR SIZE
  ========================================================== */

  if (
    message.length >
    500
  ) {
    message =
      message.slice(
        0,
        500
      );
  }


  return (
    message ||
    defaultMessage
  );
}
