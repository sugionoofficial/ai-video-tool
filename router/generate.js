import {
  HttpError,
  json,
  readJson
} from "../lib/http.js";

import {
  requireUser
} from "../auth/auth.js";

import {
  checkGenerateRate
} from "../security/rate-limit.js";

import {
  canonicalProvider
} from "../providers/provider-utils.js";

import {
  getProvider
} from "../providers/provider-service.js";

import {
  resolveAdapter,
  getAdapterInfo
} from "../providers/index.js";

import {
  reserveJob
} from "../jobs/jobs.js";

import {
  updateJob,
  recordJobEvent,
  refundJob
} from "../jobs/job-service.js";


/* ============================================================
GEN-Z.AI
GENERATE ROUTER
============================================================ */

const MIN_PROMPT_LENGTH = 3;
const MAX_PROMPT_LENGTH = 2000;

const MAX_IDEMPOTENCY_KEY_LENGTH = 128;

const DEFAULT_CREDIT_COST = 1;
const MAX_CREDIT_COST = 1000;


/* ============================================================
HELPERS
============================================================ */

function normalizeAdapterId(
  value
) {
  return String(
    value || ""
  )
    .trim()
    .toLowerCase();
}


function normalizeRequestedString(
  value
) {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  const normalized =
    String(
      value
    ).trim();

  return normalized ||
    null;
}


function normalizeDuration(
  value
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const normalized =
    Number(
      String(
        value
      ).replace(
        /s$/i,
        ""
      )
    );

  if (
    !Number.isFinite(
      normalized
    )
  ) {
    throw new HttpError(
      "Duration tidak valid.",
      400
    );
  }

  return normalized;
}


function getCreditCost(
  env
) {
  const raw =
    env?.GENERATION_CREDIT_COST;

  if (
    raw === undefined ||
    raw === null ||
    String(
      raw
    ).trim() === ""
  ) {
    return DEFAULT_CREDIT_COST;
  }

  const cost =
    Number(
      raw
    );

  if (
    !Number.isFinite(
      cost
    ) ||
    !Number.isInteger(
      cost
    ) ||
    cost < 1 ||
    cost > MAX_CREDIT_COST
  ) {
    throw new HttpError(
      "Konfigurasi GENERATION_CREDIT_COST tidak valid.",
      500
    );
  }

  return cost;
}


/* ============================================================
MAIN GENERATE HANDLER
============================================================ */

export async function handleGenerate(
  request,
  env
) {
  const contentType =
    String(
      request.headers.get(
        "content-type"
      ) || ""
    ).toLowerCase();

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


  /* ==========================================================
  AUTH
  ========================================================== */

  const user =
    await requireUser(
      request,
      env
    );


  /* ==========================================================
  RATE LIMIT
  ========================================================== */

  checkGenerateRate(
    user.id
  );


  /* ==========================================================
  REQUEST BODY
  ========================================================== */

  const body =
    await readJson(
      request
    );

  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    throw new HttpError(
      "Data generation tidak valid.",
      400
    );
  }


  /* ==========================================================
  PROVIDER
  ========================================================== */

  const id =
    canonicalProvider(
      body?.provider
    );

  if (!id) {
    throw new HttpError(
      "Provider wajib diberikan.",
      400
    );
  }


  /* ==========================================================
  LOAD ACTIVE PROVIDER
  ========================================================== */

  const provider =
    await getProvider(
      id,
      env,
      false
    );


  /* ==========================================================
  RESOLVE ADAPTER

  Provider ID dan Adapter ID adalah dua hal berbeda.

  Contoh:

  provider.id      = google-veo-production
  provider.adapter = veo

  provider.id      = kling-main
  provider.adapter = kling

  Registry hanya menerima adapter ID.
  ========================================================== */

  const adapterId =
    normalizeAdapterId(
      provider?.adapter
    );

  if (!adapterId) {
    throw new HttpError(
      `Provider "${id}" belum memiliki adapter.`,
      400
    );
  }

  let adapter;

  try {
    adapter =
      resolveAdapter(
        adapterId
      );
  } catch {
    throw new HttpError(
      `Adapter "${adapterId}" belum tersedia di Worker.`,
      400
    );
  }

  if (
    !adapter ||
    typeof adapter.generate !==
      "function"
  ) {
    throw new HttpError(
      `Adapter "${adapterId}" tidak memiliki fungsi generate().`,
      500
    );
  }


  /* ==========================================================
  PROMPT
  ========================================================== */

  const prompt =
    String(
      body?.prompt || ""
    ).trim();

  if (
    prompt.length <
      MIN_PROMPT_LENGTH ||
    prompt.length >
      MAX_PROMPT_LENGTH
  ) {
    throw new HttpError(
      `Prompt harus ${MIN_PROMPT_LENGTH}-${MAX_PROMPT_LENGTH} karakter.`,
      400
    );
  }


  /* ==========================================================
  MODEL
  ========================================================== */

  const requestedModel =
    normalizeRequestedString(
      body?.model
    );


  /* ==========================================================
  DURATION
  ========================================================== */

  const requestedDuration =
    normalizeDuration(
      body?.duration
    );

  if (
    requestedDuration !== null
  ) {
    const info =
      getAdapterInfo(
        adapterId
      );

    const allowed =
      Array.isArray(
        info?.durations
      )
        ? info.durations
            .map(
              value =>
                Number(
                  String(
                    value
                  ).replace(
                    /s$/i,
                    ""
                  )
                )
            )
            .filter(
              value =>
                Number.isFinite(
                  value
                )
            )
        : [];

    if (
      allowed.length &&
      !allowed.includes(
        requestedDuration
      )
    ) {
      throw new HttpError(
        "Duration tidak didukung oleh adapter provider.",
        400
      );
    }
  }


  /* ==========================================================
  ASPECT RATIO
  ========================================================== */

  const requestedAspectRatio =
    normalizeRequestedString(
      body?.aspectRatio
    );


  /* ==========================================================
  RESOLUTION
  ========================================================== */

  const requestedResolution =
    normalizeRequestedString(
      body?.resolution
    );


  /* ==========================================================
  CREDIT COST
  ========================================================== */

  const cost =
    getCreditCost(
      env
    );


  /* ==========================================================
  IDEMPOTENCY
  ========================================================== */

  const idem =
    String(
      request.headers.get(
        "Idempotency-Key"
      ) || ""
    ).trim();

  if (
    !idem ||
    idem.length >
      MAX_IDEMPOTENCY_KEY_LENGTH
  ) {
    throw new HttpError(
      "Idempotency-Key wajib diisi (1-128 karakter).",
      400
    );
  }


  /* ==========================================================
  FINGERPRINT
  ========================================================== */

  const fingerprintSource =
    JSON.stringify({
      provider:
        id,

      adapter:
        adapterId,

      model:
        requestedModel,

      duration:
        requestedDuration,

      aspectRatio:
        requestedAspectRatio,

      resolution:
        requestedResolution,

      prompt,

      imageData:
        Boolean(
          body.imageData
        )
    });

  const digest =
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(
        fingerprintSource
      )
    );

  const fingerprint =
    Array.from(
      new Uint8Array(
        digest
      )
    )
      .map(
        byte =>
          byte
            .toString(16)
            .padStart(
              2,
              "0"
            )
      )
      .join("");


  /* ==========================================================
  RESERVE JOB
  ========================================================== */

  const reservation =
    await reserveJob(
      user.id,
      id,
      cost,
      idem,
      fingerprint,
      env
    );

  const jobId =
    reservation?.job_id ||
    reservation?.id;

  if (!jobId) {
    throw new HttpError(
      "Gagal membuat job credit.",
      500
    );
  }


  /* ==========================================================
  IDEMPOTENT REQUEST
  ========================================================== */

  if (
    reservation?.existing
  ) {
    if (
      reservation.provider !==
      id
    ) {
      throw new HttpError(
        "Idempotency key terkait provider berbeda.",
        409
      );
    }

    if (
      reservation.external_id
    ) {
      return json(
        {
          success:
            true,

          idempotent:
            true,

          jobId,

          externalId:
            reservation.external_id,

          provider:
            id,

          adapter:
            adapterId,

          status:
            reservation.status ||
            "processing"
        },
        200,
        env
      );
    }

    throw new HttpError(
      "Request sebelumnya masih dalam proses inisialisasi. Gunakan status job setelah beberapa saat.",
      409
    );
  }


  /* ==========================================================
  GENERATION
  ========================================================== */

  try {
    const initialMetadata = {
      provider:
        id,

      adapter:
        adapterId,

      prompt,

      model:
        requestedModel,

      duration:
        requestedDuration,

      aspectRatio:
        requestedAspectRatio,

      resolution:
        requestedResolution
    };


    /* ========================================================
    INITIAL JOB DATA
    ======================================================== */

    await updateJob(
      jobId,
      {
        model:
          requestedModel,

        metadata:
          initialMetadata
      },
      env
    );


    await recordJobEvent(
      jobId,
      user.id,
      "created",
      {
        message:
          "Generation job created",

        metadata:
          initialMetadata
      },
      env
    );


    /* ========================================================
    CALL PROVIDER ADAPTER
    ======================================================== */

    const result =
      await adapter.generate(
        body,
        provider,
        env
      );

    if (
      !result ||
      !result.externalId
    ) {
      throw new HttpError(
        "Provider tidak mengembalikan ID proses.",
        502
      );
    }

    result.provider =
      id;

    result.adapter =
      adapterId;


    /* ========================================================
    FINAL METADATA
    ======================================================== */

    const metadata = {
      ...initialMetadata,

      ...result,

      provider:
        id,

      adapter:
        adapterId,

      prompt,

      model:
        requestedModel ||
        result.model ||
        null,

      duration:
        requestedDuration,

      aspectRatio:
        requestedAspectRatio,

      resolution:
        requestedResolution
    };


    /* ========================================================
    UPDATE JOB
    ======================================================== */

    await updateJob(
      jobId,
      {
        external_id:
          result.externalId,

        status:
          result.status ||
          "processing",

        attempt_count:
          1,

        provider_status:
          result.status ||
          "processing",

        last_error:
          null,

        last_error_code:
          null,

        model:
          requestedModel ||
          result.model ||
          null,

        metadata
      },
      env
    );


    /* ========================================================
    PROVIDER EVENT
    ======================================================== */

    await recordJobEvent(
      jobId,
      user.id,
      "provider_submitted",
      {
        providerStatus:
          result.status ||
          "processing",

        message:
          "Provider accepted generation request",

        metadata
      },
      env
    );


    /* ========================================================
    RESPONSE
    ======================================================== */

    return json(
      {
        success:
          true,

        jobId,

        ...result,

        provider:
          id,

        adapter:
          adapterId,

        creditsRemaining:
          reservation.credits_remaining
      },
      200,
      env
    );

  } catch (err) {

    /* ========================================================
    MARK JOB FAILED
    ======================================================== */

    await updateJob(
      jobId,
      {
        last_error:
          String(
            err?.message ||
              "Generation error"
          ),

        last_error_code:
          String(
            err?.status ||
              "provider_error"
          ),

        provider_status:
          "failed"
      },
      env
    ).catch(
      () => {}
    );


    /* ========================================================
    ERROR EVENT
    ======================================================== */

    await recordJobEvent(
      jobId,
      user.id,
      "error",
      {
        providerStatus:
          "failed",

        errorCode:
          String(
            err?.status ||
              "provider_error"
          ),

        message:
          String(
            err?.message ||
              "Generation error"
          )
      },
      env
    );


    /* ========================================================
    REFUND
    ======================================================== */

    await refundJob(
      jobId,
      env
    );


    await recordJobEvent(
      jobId,
      user.id,
      "refunded",
      {
        message:
          "Credit refunded after generation error"
      },
      env
    );


    throw err;
  }
}
