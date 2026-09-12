import {
  HttpError,
  safeJson,
  apiError
} from "../lib/http.js";

import {
  sb
} from "../lib/supabase.js";

export async function reserveJob(
  userId,
  provider,
  cost,
  idempotencyKey,
  fingerprint,
  env
) {
  const res =
    await sb(
      "/rest/v1/rpc/start_video_job",
      {
        method:
          "POST",

        body:
          JSON.stringify({
            p_user_id:
              userId,

            p_provider:
              provider,

            p_credit_cost:
              cost,

            p_idempotency_key:
              idempotencyKey,

            p_request_fingerprint:
              fingerprint
          })
      },
      env
    );

  const data =
    await safeJson(
      res
    );

  if (
    !res.ok
  ) {
    throw new HttpError(
      apiError(
        data,
        "Credit tidak mencukupi."
      ),
      402
    );
  }

  return data;
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
