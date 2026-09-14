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

function normalizeExternalId(value) {
  const id =
    String(value ?? "").trim();

  if (!id) {
    throw new HttpError(
      "ID proses video wajib diberikan.",
      400
    );
  }

  if (id.length > MAX_EXTERNAL_ID_LENGTH) {
    throw new HttpError(
      "ID proses video terlalu panjang.",
      400
    );
  }

  return id;
}


function normalizeStatus(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}


function normalizeAdapter(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}


function buildProxyUrl(provider, jobId) {
  return (
    `/api/video?provider=${encodeURIComponent(
      provider
    )}&jobId=${encodeURIComponent(
      jobId
    )}`
  );
}


function safeMetadata(value) {
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
     PROVIDER ID
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
     JOB METADATA
  ========================================================== */

  const jobMetadata =
    safeMetadata(
      job.metadata
    );


  /* ==========================================================
     ADAPTER DARI JOB
     ==========================================================

     PENTING:

     Job harus tetap menggunakan adapter yang dipakai
     ketika generation dibuat.

     Jangan selalu mengambil adapter terbaru dari
     tabel providers karena konfigurasi provider dapat
     berubah setelah job dibuat.

     Prioritas:
       1. job.metadata.adapter
       2. provider.adapter
  ========================================================== */

  const jobAdapterId =
    normalizeAdapter(
      jobMetadata.adapter
    );


  /* ==========================================================
     FINAL JOB SHORT-CIRCUIT
  ==========================================================

     Jangan panggil provider lagi jika job sudah final.
  ========================================================== */

  const currentStatus =
    normalizeStatus(
      job.status
    );


  /* ==========================================================
     COMPLETED SHORT-CIRCUIT
  ========================================================== */

  if (
    currentStatus ===
    "completed"
  ) {
    const adapterId =
      jobAdapterId ||
      normalizeAdapter(
        job.adapter
      ) ||
      null;

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
          adapterId,

        status:
          "completed",

        videoUrl:
          job.video_url ||
          proxyUrl,

        model:
          job.model ||
          jobMetadata.model ||
          null,

        duration:
          jobMetadata.duration ??
          null,

        aspectRatio:
          jobMetadata.aspectRatio ||
          null,

        resolution:
          jobMetadata.resolution ||
          null
      },
      200,
      env
    );
  }


  /* ==========================================================
     FAILED SHORT-CIRCUIT
  ========================================================== */

  if (
    currentStatus ===
    "failed"
  ) {
    const adapterId =
      jobAdapterId ||
      normalizeAdapter(
        job.adapter
      ) ||
      null;

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
  ==========================================================

     Gunakan adapter yang tersimpan pada JOB terlebih dahulu.

     Ini penting jika provider diubah:
       ByteDance -> adapter lama
       ChinaAPI  -> adapter chinaapi

     Job lama tidak boleh tiba-tiba berpindah adapter
     hanya karena nama/provider configuration berubah.
  ========================================================== */

  const providerAdapterId =
    normalizeAdapter(
      provider?.adapter
    );

  const adapterId =
    jobAdapterId ||
    providerAdapterId;


  if (!adapterId) {
    throw new HttpError(
      `Provider "${id}" belum memiliki adapter.`,
      400
    );
  }


  /* ==========================================================
     RESOLVE ADAPTER REGISTRY
  ========================================================== */

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
    typeof result !== "object" ||
    Array.isArray(result)
  ) {
    throw new HttpError(
      "Provider tidak mengembalikan status yang valid.",
      502
    );
  }


  /* ==========================================================
     NORMALIZE PROVIDER STATUS
  ========================================================== */

  const providerStatus =
    normalizeStatus(
      result.status
    );


  if (!providerStatus) {
    throw new HttpError(
      "Provider tidak mengembalikan status proses.",
      502
    );
  }


  /* ==========================================================
     FORCE INTERNAL PROVIDER IDENTITY
  ==========================================================

     Provider ID berasal dari job/request yang sudah
     divalidasi.

     Provider Name tidak boleh menggantikan Provider ID.
  ========================================================== */

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

    const resultMetadata =
      safeMetadata(
        result
      );


    /* ========================================================
       MERGE METADATA
    ======================================================== */

    const nextMetadata = {
      ...jobMetadata,

      ...resultMetadata,

      provider:
        id,

      adapter:
        adapterId,

      providerStatus:
        "completed",

      prompt:
        jobMetadata.prompt ||
        result.prompt ||
        null,

      model:
        jobMetadata.model ||
        result.model ||
        job.model ||
        null,

      duration:
        jobMetadata.duration ??
        result.duration ??
        null,

      aspectRatio:
        jobMetadata.aspectRatio ||
        result.aspectRatio ||
        null,

      resolution:
        jobMetadata.resolution ||
        result.resolution ||
        null
    };


    /* ========================================================
       PROVIDER FILE ID
    ======================================================== */

    if (
      result.fileId !==
        undefined &&
      result.fileId !==
        null &&
      String(
        result.fileId
      ).trim()
    ) {
      nextMetadata.provider_file_id =
        String(
          result.fileId
        ).trim();
    }


    /* ========================================================
       VIDEO URL
    ========================================================

       Prioritas:
       1. URL dari provider
       2. URL yang sudah tersimpan
       3. proxy internal
    ======================================================== */

    const videoUrl =
      String(
        result.videoUrl ||
        job.video_url ||
        ""
      ).trim() ||
      proxyUrl;


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
          videoUrl,

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


    /* ========================================================
       RESPONSE CLEANUP
    ======================================================== */

    result.videoUrl =
      videoUrl;

    result.status =
      "completed";

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
          "completed",

        videoUrl:
          videoUrl
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
    const failureMessage =
      String(
        result.error ||
        result.message ||
        "Provider reported failure"
      ).slice(
        0,
        1000
      );


    const failureCode =
      String(
        result.errorCode ||
        result.code ||
        "provider_failed"
      ).slice(
        0,
        200
      );


    const failureMetadata = {
      ...jobMetadata,

      provider:
        id,

      adapter:
        adapterId,

      providerStatus:
        "failed"
    };


    const alreadyFailed =
      normalizeStatus(
        job.status
      ) ===
      "failed";


    /* ========================================================
       UPDATE FAILED JOB
    ======================================================== */

    await updateJob(
      job.id,
      {
        status:
          "failed",

        provider_status:
          "failed",

        last_error:
          failureMessage,

        last_error_code:
          failureCode,

        metadata:
          failureMetadata
      },
      env
    );


    /* ========================================================
       FAILED EVENT
    ======================================================== */

    await recordJobEvent(
      job.id,
      user.id,
      "failed",
      {
        providerStatus:
          "failed",

        errorCode:
          failureCode,

        message:
          failureMessage,

        metadata:
          failureMetadata
      },
      env
    );


    /* ========================================================
       REFUND
    ========================================================

       Database RPC tetap menjadi perlindungan utama
       terhadap refund ganda.
    ======================================================== */

    if (!alreadyFailed) {
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


    /* ========================================================
       RESPONSE
    ======================================================== */

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
          failureMessage,

        errorCode:
          failureCode
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


  /* ==========================================================
     PROVIDER STATUS UNTUK METADATA
  ========================================================== */

  const normalizedProviderStatus =
    providerStatus ||
    normalizeStatus(
      result.providerStatus
    ) ||
    "processing";


  /* ==========================================================
     PROCESSING METADATA
  ========================================================== */

  const processingMetadata = {
    ...jobMetadata,

    ...safeMetadata(
      result
    ),

    provider:
      id,

    adapter:
      adapterId,

    providerStatus:
      normalizedProviderStatus,

    model:
      jobMetadata.model ||
      result.model ||
      job.model ||
      null,

    duration:
      jobMetadata.duration ??
      result.duration ??
      null,

    aspectRatio:
      jobMetadata.aspectRatio ||
      result.aspectRatio ||
      null,

    resolution:
      jobMetadata.resolution ||
      result.resolution ||
      null
  };


  /* ==========================================================
     PROVIDER FILE ID
  ========================================================== */

  if (
    result.fileId !==
      undefined &&
    result.fileId !==
      null &&
    String(
      result.fileId
    ).trim()
  ) {
    processingMetadata.provider_file_id =
      String(
        result.fileId
      ).trim();
  }


  /* ==========================================================
     UPDATE PROCESSING JOB
  ========================================================== */

  await updateJob(
    job.id,
    {
      attempt_count:
        nextAttempt,

      provider_status:
        normalizedProviderStatus,

      metadata:
        processingMetadata
    },
    env
  );


  /* ==========================================================
     PROCESSING EVENT
  ========================================================== */

  await recordJobEvent(
    job.id,
    user.id,
    "poll_processing",
    {
      providerStatus:
        normalizedProviderStatus,

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

      providerStatus:
        normalizedProviderStatus,

      ...result,

      status:
        "processing"
    },
    200,
    env
  );
}
