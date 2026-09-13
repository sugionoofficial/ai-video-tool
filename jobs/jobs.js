import {
  HttpError,
  safeJson,
  apiError
} from "../lib/http.js";

import {
  sb
} from "../lib/supabase.js";

function normalizeString(
  value,
  maxLength
) {
  const result =
    String(value ?? "").trim();

  if (
    !result ||
    result.length > maxLength
  ) {
    return null;
  }

  return result;
}

function normalizeCost(
  value
) {
  const cost =
    Number(value);

  if (
    !Number.isInteger(cost) ||
    cost < 1 ||
    cost > 1000
  ) {
    return null;
  }

  return cost;
}

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
      200
    );

  const normalizedProvider =
    normalizeString(
      provider,
      100
    );

  const normalizedCost =
    normalizeCost(
      cost
    );

  const normalizedIdempotencyKey =
    normalizeString(
      idempotencyKey,
      128
    );

  const normalizedFingerprint =
    normalizeString(
      fingerprint,
      256
    );

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

  const res =
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

  const data =
    await safeJson(
      res
    );

  if (
    !res.ok
  ) {
    /*
     * 402 hanya digunakan ketika RPC memang
     * melaporkan masalah kredit.
     *
     * Error database/RPC lainnya harus tetap
     * dianggap sebagai kegagalan server.
     */
    const message =
      apiError(
        data,
        ""
      );

    const normalizedMessage =
      String(
        message || ""
      ).toLowerCase();

    const creditError =
      res.status === 402 ||
      res.status === 403 ||
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
      res.status,
      message || "unknown error"
    );

    throw new HttpError(
      "Gagal membuat job video.",
      502
    );
  }

  /*
   * RPC seharusnya mengembalikan object job.
   * Jangan meneruskan null/array kosong sebagai
   * job yang valid karena generate.js dapat
   * menganggap reservasi berhasil.
   */
  if (
    data === null ||
    data === undefined
  ) {
    throw new HttpError(
      "Respons reservasi job tidak valid.",
      502
    );
  }

  return data;
}
