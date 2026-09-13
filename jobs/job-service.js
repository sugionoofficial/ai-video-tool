import {
  sb
} from "../lib/supabase.js";

import {
  HttpError
} from "../lib/http.js";


/* ============================================================
   GEN-Z.AI
   JOB SERVICE
   ============================================================ */

const MAX_JOB_ID_LENGTH =
  128;

const MAX_USER_ID_LENGTH =
  256;

const MAX_PROVIDER_ID_LENGTH =
  64;

const MAX_EXTERNAL_ID_LENGTH =
  512;

const MAX_EVENT_TYPE_LENGTH =
  100;

const MAX_ERROR_CODE_LENGTH =
  100;

const MAX_MESSAGE_LENGTH =
  2000;


/* ============================================================
   HELPERS
   ============================================================ */

function isPlainObject(
  value
) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}


function normalizeString(
  value,
  maxLength,
  message
) {
  const normalized =
    String(
      value ?? ""
    ).trim();

  if (
    !normalized
  ) {
    throw new HttpError(
      message,
      400
    );
  }

  if (
    normalized.length >
    maxLength
  ) {
    throw new HttpError(
      message,
      400
    );
  }

  return normalized;
}


function normalizeJobId(
  value
) {
  return normalizeString(
    value,
    MAX_JOB_ID_LENGTH,
    "Job ID tidak valid."
  );
}


function normalizeUserId(
  value
) {
  return normalizeString(
    value,
    MAX_USER_ID_LENGTH,
    "User ID tidak valid."
  );
}


function normalizeProvider(
  value
) {
  return normalizeString(
    value,
    MAX_PROVIDER_ID_LENGTH,
    "Provider tidak valid."
  )
    .toLowerCase();
}


function normalizeExternalId(
  value
) {
  return normalizeString(
    value,
    MAX_EXTERNAL_ID_LENGTH,
    "External ID tidak valid."
  );
}


/* ============================================================
   ALLOWED JOB PATCH FIELDS
   ============================================================ */

const ALLOWED_PATCH_FIELDS =
  new Set([
    "status",
    "provider_status",
    "last_error",
    "last_error_code",
    "video_url",
    "model",
    "metadata",
    "attempt_count",
    "external_id",
    "credit_cost",
    "updated_at"
  ]);


function sanitizeJobPatch(
  patch
) {
  if (
    !isPlainObject(
      patch
    )
  ) {
    throw new HttpError(
      "Data pembaruan job tidak valid.",
      400
    );
  }

  const sanitized = {};

  for (
    const [
      key,
      value
    ]
    of Object.entries(
      patch
    )
  ) {
    if (
      !ALLOWED_PATCH_FIELDS.has(
        key
      )
    ) {
      continue;
    }

    sanitized[key] =
      value;
  }

  if (
    Object.keys(
      sanitized
    ).length === 0
  ) {
    throw new HttpError(
      "Tidak ada field job yang valid untuk diperbarui.",
      400
    );
  }

  return sanitized;
}


/* ============================================================
   UPDATE JOB
   ============================================================ */

export async function updateJob(
  jobId,
  patch,
  env
) {
  const normalizedJobId =
    normalizeJobId(
      jobId
    );

  const sanitizedPatch =
    sanitizeJobPatch(
      patch
    );

  const payload = {
    ...sanitizedPatch,

    updated_at:
      new Date()
        .toISOString()
  };

  const response =
    await sb(
      `/rest/v1/video_jobs?id=eq.${encodeURIComponent(
        normalizedJobId
      )}`,
      {
        method:
          "PATCH",

        headers: {
          "Content-Type":
            "application/json",

          Accept:
            "application/json",

          Prefer:
            "return=minimal"
        },

        body:
          JSON.stringify(
            payload
          )
      },
      env
    );

  if (
    !response.ok
  ) {
    let errorMessage =
      "Gagal memperbarui status job.";

    try {
      const errorBody =
        await response.json();

      errorMessage =
        String(
          errorBody?.message ||
          errorBody?.error ||
          errorMessage
        ).slice(
          0,
          500
        );
    } catch {
      // Ignore invalid error body.
    }

    console.error(
      "job update failed",
      response.status,
      errorMessage
    );

    throw new HttpError(
      errorMessage,
      500
    );
  }

  return true;
}


/* ============================================================
   RECORD JOB EVENT
   ============================================================ */

export async function recordJobEvent(
  jobId,
  userId,
  eventType,
  extra,
  env
) {
  try {
    const normalizedJobId =
      normalizeJobId(
        jobId
      );

    const normalizedUserId =
      normalizeUserId(
        userId
      );

    const normalizedEventType =
      normalizeString(
        eventType,
        MAX_EVENT_TYPE_LENGTH,
        "Event job tidak valid."
      );

    const providerStatus =
      extra?.providerStatus
        ? String(
            extra.providerStatus
          )
            .trim()
            .slice(
              0,
              100
            )
        : null;

    const errorCode =
      extra?.errorCode
        ? String(
            extra.errorCode
          )
            .trim()
            .slice(
              0,
              MAX_ERROR_CODE_LENGTH
            )
        : null;

    const message =
      extra?.message
        ? String(
            extra.message
          )
            .trim()
            .slice(
              0,
              MAX_MESSAGE_LENGTH
            )
        : "";

    const metadata =
      isPlainObject(
        extra?.metadata
      )
        ? extra.metadata
        : {};

    const response =
      await sb(
        "/rest/v1/rpc/record_video_job_event",
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",

            Accept:
              "application/json"
          },

          body:
            JSON.stringify({
              p_job_id:
                normalizedJobId,

              p_user_id:
                normalizedUserId,

              p_event_type:
                normalizedEventType,

              p_provider_status:
                providerStatus,

              p_error_code:
                errorCode,

              p_message:
                message,

              p_metadata:
                metadata
            })
        },
        env
      );

    if (
      !response.ok
    ) {
      let errorMessage =
        "Gagal mencatat event job.";

      try {
        const errorBody =
          await response.json();

        errorMessage =
          String(
            errorBody?.message ||
            errorBody?.error ||
            errorMessage
          ).slice(
            0,
            500
          );
      } catch {
        // Ignore invalid error body.
      }

      console.error(
        "job event logging failed",
        response.status,
        errorMessage
      );

      return false;
    }

    return true;

  } catch (
    err
  ) {
    console.error(
      "job event logging failed",
      String(
        err?.message ||
        err ||
        "unknown"
      ).slice(
        0,
        300
      )
    );

    return false;
  }
}


/* ============================================================
   REFUND JOB
   ============================================================ */

export async function refundJob(
  jobId,
  env
) {
  const normalizedJobId =
    normalizeJobId(
      jobId
    );

  const response =
    await sb(
      "/rest/v1/rpc/refund_video_job",
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json",

          Accept:
            "application/json"
        },

        body:
          JSON.stringify({
            p_job_id:
              normalizedJobId
          })
      },
      env
    );

  if (
    !response.ok
  ) {
    let errorMessage =
      "Gagal mengembalikan kredit job.";

    let errorCode =
      "";

    let errorDetails =
      "";

    let errorHint =
      "";

    try {
      const errorBody =
        await response.json();

      errorMessage =
        String(
          errorBody?.message ||
          errorBody?.error ||
          errorMessage
        ).slice(
          0,
          500
        );

      errorCode =
        String(
          errorBody?.code ||
          ""
        ).slice(
          0,
          100
        );

      errorDetails =
        String(
          errorBody?.details ||
          ""
        ).slice(
          0,
          500
        );

      errorHint =
        String(
          errorBody?.hint ||
          ""
        ).slice(
          0,
          500
        );

    } catch {
      try {
        const rawBody =
          await response.text();

        errorDetails =
          String(
            rawBody ||
            ""
          ).slice(
            0,
            500
          );
      } catch {
        // Ignore unreadable response body.
      }
    }

    console.error(
      "job refund failed",
      {
        status:
          response.status,

        code:
          errorCode,

        message:
          errorMessage,

        details:
          errorDetails,

        hint:
          errorHint
      }
    );

    const diagnosticParts =
      [
        errorMessage,
        errorCode
          ? `code=${errorCode}`
          : "",
        errorDetails
          ? `details=${errorDetails}`
          : "",
        errorHint
          ? `hint=${errorHint}`
          : ""
      ].filter(
        Boolean
      );

    throw new HttpError(
      diagnosticParts.join(
        " | "
      ) ||
      "Gagal mengembalikan kredit job.",
      500
    );
  }

  return true;
}


/* ============================================================
   GET JOB
   ============================================================ */

export async function getJob(
  userId,
  provider,
  externalId,
  env
) {
  const normalizedUserId =
    normalizeUserId(
      userId
    );

  const normalizedProvider =
    normalizeProvider(
      provider
    );

  const normalizedExternalId =
    normalizeExternalId(
      externalId
    );

  const query =
    `/rest/v1/video_jobs?user_id=eq.${encodeURIComponent(
      normalizedUserId
    )}&provider=eq.${encodeURIComponent(
      normalizedProvider
    )}&external_id=eq.${encodeURIComponent(
      normalizedExternalId
    )}&select=*&limit=1`;

  const response =
    await sb(
      query,
      {
        headers: {
          Accept:
            "application/json"
        }
      },
      env
    );

  if (
    !response.ok
  ) {
    console.error(
      "job lookup failed",
      response.status
    );

    throw new HttpError(
      "Gagal membaca job video.",
      500
    );
  }

  let rows;

  try {
    rows =
      await response.json();

  } catch {
    throw new HttpError(
      "Respons data job tidak valid.",
      502
    );
  }

  if (
    !Array.isArray(
      rows
    )
  ) {
    return null;
  }

  return (
    rows[0] ||
    null
  );
}
