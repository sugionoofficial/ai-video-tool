import {
  HttpError,
  safeJson,
  apiError
} from "../lib/http.js";

import {
  sb
} from "../lib/supabase.js";


/* ============================================================
GEN-Z.AI
JOB RESERVATION SERVICE
============================================================ */

const MAX_USER_ID_LENGTH =
  256;

const MAX_PROVIDER_ID_LENGTH =
  64;

const MAX_COST =
  1000;

const MAX_IDEMPOTENCY_KEY_LENGTH =
  128;

const MAX_FINGERPRINT_LENGTH =
  256;


/* ============================================================
HELPERS
============================================================ */

function normalizeString(
  value,
  maxLength
) {
  const result =
    String(
      value ?? ""
    ).trim();

  if (
    !result ||
    result.length >
      maxLength
  ) {
    return null;
  }

  return result;
}


function normalizeProvider(
  value
) {
  const provider =
    normalizeString(
      value,
      MAX_PROVIDER_ID_LENGTH
    );

  if (!provider) {
    return null;
  }

  const normalized =
    provider.toLowerCase();

  if (
    !/^[a-z0-9][a-z0-9_-]{1,63}$/.test(
      normalized
    )
  ) {
    return null;
  }

  return normalized;
}


function normalizeCost(
  value
) {
  const cost =
    Number(
      value
    );

  if (
    !Number.isInteger(
      cost
    ) ||
    cost < 1 ||
    cost > MAX_COST
  ) {
    return null;
  }

  return cost;
}


function isPlainObject(
  value
) {
  return (
    value !== null &&
    typeof value ===
      "object" &&
    !Array.isArray(
      value
    )
  );
}


/* ============================================================
RESERVE JOB
============================================================ */

export async function reserveJob(
  userId,
  provider,
  cost,
  idempotencyKey,
  fingerprint,
  env
) {
  const normalizedUserId =
    normalizeString(
      userId,
      MAX_USER_ID_LENGTH
    );

  const normalizedProvider =
    normalizeProvider(
      provider
    );

  const normalizedCost =
    normalizeCost(
      cost
    );

  const normalizedIdempotencyKey =
    normalizeString(
      idempotencyKey,
      MAX_IDEMPOTENCY_KEY_LENGTH
    );

  const normalizedFingerprint =
    normalizeString(
      fingerprint,
      MAX_FINGERPRINT_LENGTH
    );


  /* ==========================================================
  VALIDATION
  ========================================================== */

  if (
    !normalizedUserId ||
    !normalizedProvider ||
    !normalizedCost
  ) {
    throw new HttpError(
      "Parameter reservasi job tidak valid.",
      400
    );
  }

  if (
    !normalizedIdempotencyKey
  ) {
    throw new HttpError(
      "Idempotency key tidak valid.",
      400
    );
  }

  if (
    !normalizedFingerprint
  ) {
    throw new HttpError(
      "Fingerprint request tidak valid.",
      400
    );
  }


  /* ==========================================================
  START VIDEO JOB RPC
  ========================================================== */

  const response =
    await sb(
      "/rest/v1/rpc/start_video_job",
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
            p_user_id:
              normalizedUserId,

            p_provider:
              normalizedProvider,

            p_credit_cost:
              normalizedCost,

            p_idempotency_key:
              normalizedIdempotencyKey,

            p_request_fingerprint:
              normalizedFingerprint
          })
      },
      env
    );


  /* ==========================================================
  PARSE RESPONSE
  ========================================================== */

  const data =
    await safeJson(
      response
    );


  /* ==========================================================
  RPC ERROR
  ========================================================== */

  if (
    !response.ok
  ) {
    const message =
      apiError(
        data,
        ""
      );

    const normalizedMessage =
      String(
        message || ""
      )
        .trim()
        .toLowerCase();

    const creditError =
      response.status ===
        402 ||
      response.status ===
        403 ||
      normalizedMessage.includes(
        "credit"
      ) ||
      normalizedMessage.includes(
        "saldo"
      ) ||
      normalizedMessage.includes(
        "insufficient"
      );

    if (
      creditError
    ) {
      throw new HttpError(
        message ||
          "Credit tidak mencukupi.",
        402
      );
    }


    console.error(
      "start_video_job RPC failed",
      response.status,
      message ||
        "unknown error"
    );

    throw new HttpError(
      "Gagal membuat job video.",
      502
    );
  }


  /* ==========================================================
  RESPONSE VALIDATION
  ========================================================== */

  if (
    !isPlainObject(
      data
    )
  ) {
    console.error(
      "start_video_job returned invalid data"
    );

    throw new HttpError(
      "Respons reservasi job tidak valid.",
      502
    );
  }


  /* ==========================================================
  REQUIRED JOB DATA
  ========================================================== */

  const jobId =
    String(
      data.id ??
      data.job_id ??
      ""
    ).trim();

  if (
    !jobId
  ) {
    console.error(
      "start_video_job response missing job id"
    );

    throw new HttpError(
      "Job tidak berhasil dibuat.",
      502
    );
  }


  /* ==========================================================
  NORMALIZED RETURN VALUE
  ========================================================== */

  return {
    ...data,

    id:
      jobId,

    provider:
      normalizedProvider
  };
}
