import {
  sb
} from "../lib/supabase.js";

import {
  HttpError
} from "../lib/http.js";

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

export async function updateJob(
  jobId,
  patch,
  env
) {
  const normalizedJobId =
    String(jobId || "").trim();

  if (!normalizedJobId) {
    throw new HttpError(
      "Job ID tidak valid.",
      400
    );
  }

  if (!isPlainObject(patch)) {
    throw new HttpError(
      "Data pembaruan job tidak valid.",
      400
    );
  }

  const r =
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
          JSON.stringify({
            ...patch,

            updated_at:
              new Date()
                .toISOString()
          })
      },
      env
    );

  if (
    !r.ok
  ) {
    console.error(
      "job update failed",
      r.status
    );

    throw new HttpError(
      "Gagal memperbarui status job.",
      500
    );
  }
}

export async function recordJobEvent(
  jobId,
  userId,
  eventType,
  extra,
  env
) {
  try {
    const normalizedJobId =
      String(jobId || "").trim();

    const normalizedUserId =
      String(userId || "").trim();

    const normalizedEventType =
      String(eventType || "").trim();

    if (
      !normalizedJobId ||
      !normalizedUserId ||
      !normalizedEventType
    ) {
      console.error(
        "job event logging skipped: invalid event data"
      );

      return false;
    }

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
                extra?.providerStatus
                  ? String(
                      extra.providerStatus
                    ).slice(0, 100)
                  : null,

              p_error_code:
                extra?.errorCode
                  ? String(
                      extra.errorCode
                    ).slice(0, 100)
                  : null,

              p_message:
                extra?.message
                  ? String(
                      extra.message
                    ).slice(0, 2000)
                  : "",

              p_metadata:
                isPlainObject(
                  extra?.metadata
                )
                  ? extra.metadata
                  : {}
            })
        },
        env
      );

    if (
      !response.ok
    ) {
      console.error(
        "job event logging failed",
        response.status
      );

      return false;
    }

    return true;
  } catch (err) {
    console.error(
      "job event logging failed",
      err
    );

    return false;
  }
}

export async function refundJob(
  jobId,
  env
) {
  const normalizedJobId =
    String(jobId || "").trim();

  if (!normalizedJobId) {
    throw new HttpError(
      "Job ID tidak valid.",
      400
    );
  }

  const res =
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
    !res.ok
  ) {
    console.error(
      "job refund failed",
      res.status
    );

    throw new HttpError(
      "Gagal mengembalikan kredit job.",
      500
    );
  }

  return true;
}

export async function getJob(
  userId,
  provider,
  externalId,
  env
) {
  const normalizedUserId =
    String(userId || "").trim();

  const normalizedProvider =
    String(provider || "").trim();

  const normalizedExternalId =
    String(externalId || "").trim();

  if (
    !normalizedUserId ||
    !normalizedProvider ||
    !normalizedExternalId
  ) {
    throw new HttpError(
      "Parameter job tidak valid.",
      400
    );
  }

  const q =
    `/rest/v1/video_jobs?user_id=eq.${encodeURIComponent(
      normalizedUserId
    )}&provider=eq.${encodeURIComponent(
      normalizedProvider
    )}&external_id=eq.${encodeURIComponent(
      normalizedExternalId
    )}&select=*`;

  const res =
    await sb(
      q,
      {
        headers: {
          Accept:
            "application/json"
        }
      },
      env
    );

  if (
    !res.ok
  ) {
    console.error(
      "job lookup failed",
      res.status
    );

    throw new HttpError(
      "Gagal membaca job video.",
      500
    );
  }

  let rows;

  try {
    rows =
      await res.json();
  } catch {
    throw new HttpError(
      "Respons data job tidak valid.",
      502
    );
  }

  return Array.isArray(rows)
    ? rows[0] || null
    : null;
}
