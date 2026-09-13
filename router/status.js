import {
  HttpError,
  json,
  requireJsonContentType,
  readJson
} from "../lib/http.js";

import {
  requireUser
} from "../auth/auth.js";

import {
  canonicalProvider
} from "../providers/provider-utils.js";

import {
  getProvider
} from "../providers/provider-service.js";

import {
  resolveAdapter
} from "../providers/index.js";

import {
  getJob,
  updateJob,
  recordJobEvent,
  refundJob
} from "../jobs/job-service.js";


/* ============================================================
GEN-Z.AI
STATUS ROUTER
============================================================ */

const MAX_EXTERNAL_ID_LENGTH = 512;


/* ============================================================
HELPERS
============================================================ */

function normalizeExternalId(
  value
) {
  const id =
    String(
      value ?? ""
    ).trim();

  if (!id) {
    throw new HttpError(
      "ID proses video wajib diberikan.",
      400
    );
  }

  if (
    id.length >
    MAX_EXTERNAL_ID_LENGTH
  ) {
    throw new HttpError(
      "ID proses video terlalu panjang.",
      400
    );
  }

  return id;
}


function normalizeStatus(
  value
) {
  return String(
    value || ""
  )
    .trim()
    .toLowerCase();
}


function buildProxyUrl(
  provider,
  jobId
) {
  return (
    `/api/video?provider=${encodeURIComponent(
      provider
    )}&jobId=${encodeURIComponent(
      jobId
    )}`
  );
}


function safeMetadata(
  value
) {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  )
    ? {
        ...value
      }
    : {};
}


/* ============================================================
MAIN STATUS HANDLER
============================================================ */

export async function handleStatus(
  request,
  env
) {
  const user =
    await requireUser(
      request,
      env
    );


  /* ==========================================================
  CONTENT TYPE
  ========================================================== */

  requireJsonContentType(
    request
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
      "Data status tidak valid.",
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
  EXTERNAL PROCESS ID
  ========================================================== */

  const externalId =
    normalizeExternalId(
      body?.operationName ||
      body?.taskId ||
      body?.id
    );


  /* ==========================================================
  LOAD JOB
  ========================================================== */

  const job =
    await getJob(
      user.id,
      id,
      externalId,
      env
    );

  if (!job) {
    throw new HttpError(
      "Job tidak ditemukan.",
      404
    );
  }


  /* ==========================================================
  FINAL JOB SHORT-CIRCUIT
  ==========================================================
  
  Jangan panggil provider lagi jika job sudah final.

  Ini mencegah:
  - polling provider yang tidak diperlukan
  - duplicate event
  - duplicate update
  - pemakaian API provider berlebihan
  ========================================================== */

  const currentStatus =
    normalizeStatus(
      job.status
    );


  if (
    currentStatus ===
    "completed"
  ) {
    const metadata =
      safeMetadata(
        job.metadata
      );

    const proxyUrl =
      buildProxyUrl(
        id,
        job.id
      );

    return json(
      {
        jobId:
          job.id,

        provider:
          id,

        adapter:
          String(
            metadata.adapter ||
            ""
          ).trim().toLowerCase(),

        status:
          "completed",

        videoUrl:
          job.video_url ||
          proxyUrl,

        model:
          job.model ||
          metadata.model ||
          null,

        duration:
          metadata.duration ??
          null,

        aspectRatio:
          metadata.aspectRatio ||
          null,

        resolution:
          metadata.resolution ||
          null
      },
      200,
      env
    );
  }


  if (
    currentStatus ===
    "failed"
  ) {
    const metadata =
      safeMetadata(
        job.metadata
      );

    return json(
      {
        jobId:
          job.id,

        provider:
          id,

        adapter:
          String(
            metadata.adapter ||
            ""
          ).trim().toLowerCase(),

        status:
          "failed",

        error:
          job.last_error ||
          "Generation gagal.",

        errorCode:
          job.last_error_code ||
          "provider_failed"
      },
      200,
      env
    );
  }


  /* ==========================================================
  LOAD PROVIDER
  ========================================================== */

  const provider =
    await getProvider(
      id,
      env,
      true
    );

  if (!provider) {
    throw new HttpError(
      `Provider "${id}" tidak ditemukan.`,
      404
    );
  }


  /* ==========================================================
  RESOLVE ADAPTER
  ========================================================== */

  const adapterId =
    String(
      provider?.adapter ||
      ""
    )
      .trim()
      .toLowerCase();

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
    typeof adapter.status !==
      "function"
  ) {
    throw new HttpError(
      `Adapter "${adapterId}" tidak menyediakan fungsi status().`,
      500
    );
  }


  /* ==========================================================
  CALL PROVIDER ADAPTER
  ========================================================== */

  const result =
    await adapter.status(
      externalId,
      provider,
      env
    );

  if (
    !result ||
    typeof result !== "object"
  ) {
    throw new HttpError(
      "Provider tidak mengembalikan status yang valid.",
      502
    );
  }


  const providerStatus =
    normalizeStatus(
      result.status
    );


  result.provider =
    id;

  result.adapter =
    adapterId;


  /* ==========================================================
  COMPLETED
  ========================================================== */

  if (
    providerStatus ===
    "completed"
  ) {
    const proxyUrl =
      buildProxyUrl(
        id,
        job.id
      );

    const previousMetadata =
      safeMetadata(
        job.metadata
      );

    const nextMetadata = {
      ...previousMetadata,

      ...result,

      provider:
        id,

      adapter:
        adapterId,

      prompt:
        previousMetadata.prompt ||
        result.prompt ||
        null,

      model:
        previousMetadata.model ||
        result.model ||
        job.model ||
        null,

      duration:
        previousMetadata.duration ??
        result.duration ??
        null,

      aspectRatio:
        previousMetadata.aspectRatio ||
        result.aspectRatio ||
        null,

      resolution:
        previousMetadata.resolution ||
        result.resolution ||
        null
    };


    /* ========================================================
    PROVIDER FILE ID
    ======================================================== */

    if (
      result.fileId
    ) {
      nextMetadata.provider_file_id =
        String(
          result.fileId
        ).trim();
    }


    /* ========================================================
    UPDATE JOB
    ======================================================== */

    await updateJob(
      job.id,
      {
        status:
          "completed",

        provider_status:
          "completed",

        last_error:
          null,

        last_error_code:
          null,

        video_url:
          result.videoUrl ||
          proxyUrl,

        model:
          nextMetadata.model,

        metadata:
          nextMetadata
      },
      env
    );


    /* ========================================================
    COMPLETED EVENT
    ======================================================== */

    await recordJobEvent(
      job.id,
      user.id,
      "completed",
      {
        providerStatus:
          "completed",

        message:
          "Provider generation completed",

        metadata:
          nextMetadata
      },
      env
    );


    result.videoUrl =
      result.videoUrl ||
      proxyUrl;

    delete result.fileId;


    return json(
      {
        jobId:
          job.id,

        provider:
          id,

        adapter:
          adapterId,

        ...result,

        status:
          "completed"
      },
      200,
      env
    );
  }


  /* ==========================================================
  FAILED
  ========================================================== */

  if (
    providerStatus ===
    "failed"
  ) {
    const previousMetadata =
      safeMetadata(
        job.metadata
      );

    const failureMetadata = {
      ...previousMetadata,

      provider:
        id,

      adapter:
        adapterId
    };

    const alreadyFailed =
      normalizeStatus(
        job.status
      ) ===
      "failed";


    await updateJob(
      job.id,
      {
        status:
          "failed",

        provider_status:
          "failed",

        last_error:
          String(
            result.error ||
            "Provider reported failure"
          ).slice(
            0,
            1000
          ),

        last_error_code:
          "provider_failed",

        metadata:
          failureMetadata
      },
      env
    );


    await recordJobEvent(
      job.id,
      user.id,
      "failed",
      {
        providerStatus:
          "failed",

        errorCode:
          "provider_failed",

        message:
          String(
            result.error ||
            "Provider reported failure"
          ).slice(
            0,
            1000
          ),

        metadata:
          failureMetadata
      },
      env
    );


    /*
     * Refund hanya dilakukan jika job belum
     * sebelumnya berstatus failed.
     *
     * RPC refund_video_job tetap harus bersifat
     * idempotent di database sebagai perlindungan
     * terhadap dua polling bersamaan.
     */
    if (
      !alreadyFailed
    ) {
      await refundJob(
        job.id,
        env
      );

      await recordJobEvent(
        job.id,
        user.id,
        "refunded",
        {
          message:
            "Credit refunded after provider failure",

          metadata:
            failureMetadata
        },
        env
      );
    }


    return json(
      {
        jobId:
          job.id,

        provider:
          id,

        adapter:
          adapterId,

        status:
          "failed",

        error:
          String(
            result.error ||
            "Provider reported failure"
          ).slice(
            0,
            1000
          ),

        errorCode:
          "provider_failed"
      },
      200,
      env
    );
  }


  /* ==========================================================
  PROCESSING
  ========================================================== */

  const currentAttempt =
    Number(
      job.attempt_count || 0
    );

  const nextAttempt =
    Number.isInteger(
      currentAttempt
    ) &&
    currentAttempt >= 0
      ? Math.min(
          currentAttempt + 1,
          1000000
        )
      : 1;


  const processingMetadata = {
    ...safeMetadata(
      job.metadata
    ),

    provider:
      id,

    adapter:
      adapterId
  };


  await updateJob(
    job.id,
    {
      attempt_count:
        nextAttempt,

      provider_status:
        "processing",

      metadata:
        processingMetadata
    },
    env
  );


  await recordJobEvent(
    job.id,
    user.id,
    "poll_processing",
    {
      providerStatus:
        "processing",

      message:
        "Provider still processing",

      metadata:
        processingMetadata
    },
    env
  );


  /* ==========================================================
  RESPONSE
  ========================================================== */

  return json(
    {
      jobId:
        job.id,

      provider:
        id,

      adapter:
        adapterId,

      status:
        "processing",

      ...result
    },
    200,
    env
  );
}
