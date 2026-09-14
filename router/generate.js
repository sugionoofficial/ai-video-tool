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
  getCredits as getChinaApiModelCredits
} from "../public/js/providers/chinaapi/index.js";

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
const MAX_MODEL_DISCOUNT = 100;


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


/* ============================================================
NORMALIZE GENERATION STATUS
============================================================ */

function normalizeGenerationStatus(
  value
) {
  const normalized =
    String(
      value ||
      "processing"
    )
      .trim()
      .toLowerCase();

  if (
    [
      "completed",
      "complete",
      "succeeded",
      "success",
      "finished",
      "done"
    ].includes(
      normalized
    )
  ) {
    return "completed";
  }

  if (
    [
      "failed",
      "failure",
      "error",
      "cancelled",
      "canceled",
      "rejected"
    ].includes(
      normalized
    )
  ) {
    return "failed";
  }

  return "processing";
}


/* ============================================================
DEFAULT CREDIT
============================================================ */

function getDefaultCreditCost(
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
MODEL CREDIT
============================================================ */

function normalizeModelCredit(
  value
) {
  const cost =
    Number(
      value
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
    return null;
  }

  return cost;
}


/* ============================================================
MODEL DISCOUNT
============================================================ */

function normalizeModelDiscount(
  value
) {
  const discount =
    Number(
      value
    );

  if (
    !Number.isFinite(
      discount
    ) ||
    discount < 0 ||
    discount > MAX_MODEL_DISCOUNT
  ) {
    return null;
  }

  return discount;
}


/* ============================================================
MODEL ENABLED
============================================================ */

function normalizeModelEnabled(
  value
) {
  if (
    value === true ||
    value === false
  ) {
    return value;
  }

  if (
    typeof value === "string"
  ) {
    const normalized =
      value
        .trim()
        .toLowerCase();

    if (
      normalized === "true" ||
      normalized === "1" ||
      normalized === "on" ||
      normalized === "yes"
    ) {
      return true;
    }

    if (
      normalized === "false" ||
      normalized === "0" ||
      normalized === "off" ||
      normalized === "no"
    ) {
      return false;
    }
  }

  if (
    typeof value === "number"
  ) {
    if (
      value === 1
    ) {
      return true;
    }

    if (
      value === 0
    ) {
      return false;
    }
  }

  return null;
}


/* ============================================================
CHINAAPI DEFAULT MODEL CREDIT
============================================================ */

function getChinaApiCreditCost(
  model
) {
  const modelId =
    String(
      model || ""
    ).trim();

  if (!modelId) {
    return null;
  }

  try {
    const cost =
      getChinaApiModelCredits(
        modelId
      );

    return normalizeModelCredit(
      cost
    );
  } catch {
    return null;
  }
}


/* ============================================================
PROVIDER MODEL CREDIT OVERRIDE
============================================================ */

function getProviderModelCredit(
  provider,
  model
) {
  const modelId =
    String(
      model || ""
    ).trim();

  if (!modelId) {
    return null;
  }

  const configured =
    provider?.config?.modelCredits;

  if (
    !configured ||
    typeof configured !==
      "object" ||
    Array.isArray(
      configured
    )
  ) {
    return null;
  }

  if (
    !Object.prototype.hasOwnProperty.call(
      configured,
      modelId
    )
  ) {
    return null;
  }

  return normalizeModelCredit(
    configured[
      modelId
    ]
  );
}


/* ============================================================
PROVIDER MODEL DISCOUNT
============================================================ */

function getProviderModelDiscount(
  provider,
  model
) {
  const modelId =
    String(
      model || ""
    ).trim();

  if (!modelId) {
    return 0;
  }

  const configured =
    provider?.config?.modelDiscounts;

  if (
    !configured ||
    typeof configured !==
      "object" ||
    Array.isArray(
      configured
    )
  ) {
    return 0;
  }

  if (
    !Object.prototype.hasOwnProperty.call(
      configured,
      modelId
    )
  ) {
    return 0;
  }

  const discount =
    normalizeModelDiscount(
      configured[
        modelId
      ]
    );

  return discount === null
    ? 0
    : discount;
}


/* ============================================================
PROVIDER MODEL ENABLED
============================================================ */

function getProviderModelEnabled(
  provider,
  model
) {
  const modelId =
    String(
      model || ""
    ).trim();

  if (!modelId) {
    return true;
  }

  const configured =
    provider?.config?.modelEnabled;

  if (
    !configured ||
    typeof configured !==
      "object" ||
    Array.isArray(
      configured
    )
  ) {
    return true;
  }

  if (
    !Object.prototype.hasOwnProperty.call(
      configured,
      modelId
    )
  ) {
    return true;
  }

  const enabled =
    normalizeModelEnabled(
      configured[
        modelId
      ]
    );

  return enabled === null
    ? true
    : enabled;
}


/* ============================================================
CALCULATE DISCOUNTED CREDIT
============================================================ */

function calculateDiscountedCredit(
  baseCredit,
  discount
) {
  const normalizedBase =
    normalizeModelCredit(
      baseCredit
    );

  if (
    normalizedBase === null
  ) {
    throw new HttpError(
      "Credit model tidak valid.",
      500
    );
  }

  const normalizedDiscount =
    normalizeModelDiscount(
      discount
    );

  if (
    normalizedDiscount === null
  ) {
    throw new HttpError(
      "Diskon model tidak valid.",
      500
    );
  }

  const discounted =
    Math.ceil(
      normalizedBase *
      (
        100 -
        normalizedDiscount
      ) /
      100
    );

  return Math.max(
    1,
    Math.min(
      MAX_CREDIT_COST,
      discounted
    )
  );
}


/* ============================================================
RESOLVE CREDIT PRICING
============================================================ */

function resolveCreditPricing(
  adapterId,
  model,
  provider,
  env
) {
  const normalizedAdapter =
    normalizeAdapterId(
      adapterId
    );

  let baseCredit =
    getDefaultCreditCost(
      env
    );

  if (
    normalizedAdapter ===
    "chinaapi"
  ) {
    const providerCost =
      getProviderModelCredit(
        provider,
        model
      );

    if (
      providerCost !== null
    ) {
      baseCredit =
        providerCost;
    } else {
      const modelCost =
        getChinaApiCreditCost(
          model
        );

      if (
        modelCost !== null
      ) {
        baseCredit =
          modelCost;
      }
    }
  }

  const discount =
    normalizedAdapter ===
    "chinaapi"
      ? getProviderModelDiscount(
          provider,
          model
        )
      : 0;

  const creditCost =
    calculateDiscountedCredit(
      baseCredit,
      discount
    );

  return {
    baseCredit,
    discount,
    creditCost
  };
}


/* ============================================================
RESOLVE CREDIT COST
============================================================ */

function resolveCreditCost(
  adapterId,
  model,
  provider,
  env
) {
  return resolveCreditPricing(
    adapterId,
    model,
    provider,
    env
  ).creditCost;
}


/* ============================================================
RESOLVE DEFAULT MODEL
============================================================ */

function resolveDefaultModel(
  adapterId,
  provider
) {
  const normalizedAdapter =
    normalizeAdapterId(
      adapterId
    );

  if (
    normalizedAdapter !==
    "chinaapi"
  ) {
    return null;
  }

  const config =
    provider?.config;

  const configuredModel =
    normalizeRequestedString(
      config?.defaultModel
    );

  if (
    configuredModel &&
    getProviderModelEnabled(
      provider,
      configuredModel
    )
  ) {
    return configuredModel;
  }

  const configuredModelId =
    normalizeRequestedString(
      config?.model
    );

  if (
    configuredModelId &&
    getProviderModelEnabled(
      provider,
      configuredModelId
    )
  ) {
    return configuredModelId;
  }

  const configuredModelName =
    normalizeRequestedString(
      config?.model_id
    );

  if (
    configuredModelName &&
    getProviderModelEnabled(
      provider,
      configuredModelName
    )
  ) {
    return configuredModelName;
  }

  const info =
    getAdapterInfo(
      adapterId
    );

  const models =
    Array.isArray(
      info?.models
    )
      ? info.models
      : [];

  for (
    const model of models
  ) {
    const normalizedModel =
      normalizeRequestedString(
        model
      );

    if (
      normalizedModel &&
      getProviderModelEnabled(
        provider,
        normalizedModel
      )
    ) {
      return normalizedModel;
    }
  }

  return null;
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

  const effectiveModel =
    requestedModel ||
    resolveDefaultModel(
      adapterId,
      provider
    );

  if (
    !effectiveModel
  ) {
    throw new HttpError(
      "Model video belum tersedia untuk provider ini.",
      400
    );
  }


  /* ==========================================================
  MODEL ENABLED CHECK
  ========================================================== */

  if (
    !getProviderModelEnabled(
      provider,
      effectiveModel
    )
  ) {
    throw new HttpError(
      `Model "${effectiveModel}" sedang dinonaktifkan oleh administrator.`,
      400
    );
  }


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
  CREDIT PRICING
  ========================================================== */

  const pricing =
    resolveCreditPricing(
      adapterId,
      effectiveModel,
      provider,
      env
    );

  const baseCredit =
    pricing.baseCredit;

  const modelDiscount =
    pricing.discount;

  const cost =
    pricing.creditCost;


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
        effectiveModel,

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
        ),

      images:
        Array.isArray(
          body.images
        )
          ? body.images.length
          : 0,

      videos:
        Array.isArray(
          body.videos
        )
          ? body.videos.length
          : 0,

      creditBase:
        baseCredit,

      creditDiscount:
        modelDiscount,

      creditCost:
        cost
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

          model:
            reservation.model ||
            effectiveModel,

          status:
            reservation.status ||
            "processing",

          creditBase:
            baseCredit,

          creditDiscount:
            modelDiscount,

          creditCost:
            reservation.credit_cost ||
            cost
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
        effectiveModel,

      requestedModel,

      duration:
        requestedDuration,

      aspectRatio:
        requestedAspectRatio,

      resolution:
        requestedResolution,

      creditBase:
        baseCredit,

      creditDiscount:
        modelDiscount,

      creditCost:
        cost
    };


    /* ========================================================
    INITIAL JOB DATA
    ======================================================== */

    await updateJob(
      jobId,
      {
        model:
          effectiveModel,

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

    const requestBody = {
      ...body
    };

    if (
      effectiveModel
    ) {
      requestBody.model =
        effectiveModel;
    }

    const result =
      await adapter.generate(
        requestBody,
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
    FINAL MODEL
    ======================================================== */

    const finalModel =
      effectiveModel ||
      result.model ||
      null;


    /* ========================================================
    FINAL MODEL ENABLED CHECK
    ======================================================== */

    if (
      !getProviderModelEnabled(
        provider,
        finalModel
      )
    ) {
      throw new HttpError(
        `Model "${finalModel}" sedang dinonaktifkan oleh administrator.`,
        409
      );
    }


    /* ========================================================
    FINAL CREDIT
    ======================================================== */

    const finalPricing =
      resolveCreditPricing(
        adapterId,
        finalModel,
        provider,
        env
      );

    const finalCreditBase =
      finalPricing.baseCredit;

    const finalCreditDiscount =
      finalPricing.discount;

    const finalCreditCost =
      finalPricing.creditCost;


    /*
     * Safety check:
     *
     * Credit yang di-reserve harus sama dengan
     * credit final yang ditentukan server.
     */

    if (
      finalCreditCost !== cost ||
      finalCreditBase !== baseCredit ||
      finalCreditDiscount !== modelDiscount
    ) {
      throw new HttpError(
        "Konfigurasi credit model berubah atau tidak konsisten. Generation dibatalkan agar credit tidak salah.",
        409
      );
    }


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
        finalModel,

      duration:
        requestedDuration ??
        result.duration ??
        null,

      aspectRatio:
        requestedAspectRatio ||
        result.aspectRatio ||
        null,

      resolution:
        requestedResolution ||
        result.resolution ||
        null,

      creditBase:
        finalCreditBase,

      creditDiscount:
        finalCreditDiscount,

      creditCost:
        finalCreditCost
    };


    /* ========================================================
    NORMALIZE RESULT STATUS
    ======================================================== */

    const finalStatus =
      normalizeGenerationStatus(
        result.status
      );


    /* ========================================================
    UPDATE JOB
    ======================================================== */

    /*
     * Database lifecycle:
     *
     * reserved
     *    ↓
     * processing
     *    ↓
     * completed
     *
     * Tidak boleh langsung:
     *
     * reserved → completed
     *
     * karena trigger database menolak transisi tersebut.
     */

    if (
      finalStatus ===
      "completed"
    ) {
      /*
       * STEP 1
       *
       * Pindahkan job dari reserved
       * menjadi processing terlebih dahulu.
       */

      await updateJob(
        jobId,
        {
          external_id:
            result.externalId,

          status:
            "processing",

          attempt_count:
            1,

          provider_status:
            "completed",

          last_error:
            null,

          last_error_code:
            null,

          model:
            finalModel,

          metadata
        },
        env
      );


      /*
       * STEP 2
       *
       * Provider sudah selesai.
       * Simpan video_url langsung jika tersedia.
       */

      await updateJob(
        jobId,
        {
          status:
            "completed",

          provider_status:
            "completed",

          video_url:
            result.videoUrl ||
            null,

          last_error:
            null,

          last_error_code:
            null,

          model:
            finalModel,

          metadata
        },
        env
      );

    } else {
      /*
       * PROCESSING / FAILED
       *
       * Untuk processing, reserved boleh
       * berubah langsung menjadi processing.
       *
       * Untuk failed, reserved → failed juga
       * diperbolehkan oleh lifecycle database.
       */

      await updateJob(
        jobId,
        {
          external_id:
            result.externalId,

          status:
            finalStatus,

          attempt_count:
            1,

          provider_status:
            finalStatus,

          last_error:
            finalStatus ===
            "failed"
              ? (
                  result.error ||
                  result.message ||
                  "Provider generation failed"
                )
              : null,

          last_error_code:
            finalStatus ===
            "failed"
              ? String(
                  result.errorCode ||
                  result.code ||
                  "provider_error"
                )
              : null,

          video_url:
            finalStatus ===
            "completed"
              ? (
                  result.videoUrl ||
                  null
                )
              : null,

          model:
            finalModel,

          metadata
        },
        env
      );
    }


    /* ========================================================
    PROVIDER EVENT
    ======================================================== */

    await recordJobEvent(
      jobId,
      user.id,
      "provider_submitted",
      {
        providerStatus:
          finalStatus,

        message:
          finalStatus ===
          "completed"
            ? "Provider completed generation immediately"
            : "Provider accepted generation request",

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

        model:
          finalModel,

        status:
          finalStatus,

        creditBase:
          finalCreditBase,

        creditDiscount:
          finalCreditDiscount,

        creditCost:
          finalCreditCost,

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
