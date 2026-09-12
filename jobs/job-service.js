import {
  sb
} from "../lib/supabase.js";

import {
  HttpError
} from "../lib/http.js";

export async function updateJob(
  jobId,
  patch,
  env
) {
  const r =
    await sb(
      `/rest/v1/video_jobs?id=eq.${encodeURIComponent(
        jobId
      )}`,
      {
        method:
          "PATCH",

        headers: {
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
    await sb(
      "/rest/v1/rpc/record_video_job_event",
      {
        method:
          "POST",

        body:
          JSON.stringify({
            p_job_id:
              jobId,

            p_user_id:
              userId,

            p_event_type:
              eventType,

            p_provider_status:
              extra?.providerStatus ||
              null,

            p_error_code:
              extra?.errorCode ||
              null,

            p_message:
              extra?.message ||
              "",

            p_metadata:
              extra?.metadata ||
              {}
          })
      },
      env
    );
  } catch (err) {
    console.error(
      "job event logging failed",
      err
    );
  }
}

export async function refundJob(
  jobId,
  env
) {
  const res =
    await sb(
      "/rest/v1/rpc/refund_video_job",
      {
        method:
          "POST",

        body:
          JSON.stringify({
            p_job_id:
              jobId
          })
      },
      env
    );

  return res.ok;
}

export async function getJob(
  userId,
  provider,
  externalId,
  env
) {
  const q =
    `/rest/v1/video_jobs?user_id=eq.${encodeURIComponent(
      userId
    )}&provider=eq.${encodeURIComponent(
      provider
    )}&external_id=eq.${encodeURIComponent(
      externalId
    )}&select=*`;

  const res =
    await sb(
      q,
      {},
      env
    );

  if (
    !res.ok
  ) {
    throw new HttpError(
      "Gagal membaca job video.",
      500
    );
  }

  const rows =
    await res.json();

  return (
    rows?.[0] ||
    null
  );
}
