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
============================================================

Alur:

provider ID
    ↓
database provider
    ↓
provider.adapter
    ↓
resolveAdapter(adapterId)
    ↓
adapter.status()

Router tidak mengetahui detail masing-masing provider.

Semua implementasi provider berada di adapter masing-masing.
============================================================ */


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
    String(
      body?.operationName ||
      body?.taskId ||
      body?.id ||
      ""
    ).trim();

  if (!externalId) {
    throw new HttpError(
      "ID proses video wajib diberikan.",
      400
    );
  }


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

  Provider ID dan Adapter ID berbeda.

  Contoh:

  provider.id      = google-veo-production
  provider.adapter = veo

  provider.id      = kling-main
  provider.adapter = kling
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

  if (!result) {
    throw new HttpError(
      "Provider tidak mengembalikan status.",
      502
    );
  }


  result.provider =
    id;

  result.adapter =
    adapterId;


  /* ==========================================================
  COMPLETED
  ========================================================== */

  if (
    result.status ===
    "completed"
  ) {
    const proxyUrl =
      `/api/video?provider=${encodeURIComponent(
        id
      )}&jobId=${encodeURIComponent(
        job.id
      )}`;


    const previousMetadata = {
      ...(job.metadata || {})
    };


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
    ========================================================

    MiniMax dapat mengembalikan fileId.
    Provider lain seperti Veo/Luma dapat
    mengembalikan videoUrl.
    */

    if (
      result.fileId
    ) {
      nextMetadata.provider_file_id =
        result.fileId;
    }


    /* ========================================================
    UPDATE COMPLETED JOB
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


    /*
    Semua video dikembalikan melalui
    endpoint proxy GEN-Z.AI.

    Router video yang menentukan bagaimana
    adapter mengambil file sebenarnya.
    */

    result.videoUrl =
      proxyUrl;


    /*
    fileId tidak perlu dikirim langsung
    ke frontend. File ID tetap tersimpan
    di metadata job.
    */

    delete result.fileId;
  }


  /* ==========================================================
  FAILED
  ========================================================== */

  else if (
    result.status ===
    "failed"
  ) {
    const alreadyFailed =
      String(
        job.status ||
        ""
      ).toLowerCase() ===
      "failed";


    await updateJob(
      job.id,
      {
        status:
          "failed",

        provider_status:
          "failed",

        last_error:
          result.error ||
          "Provider reported failure",

        last_error_code:
          "provider_failed",

        metadata:
          {
            ...(job.metadata || {}),

            provider:
              id,

            adapter:
              adapterId
          }
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
          result.error ||
          "Provider reported failure",

        metadata:
          {
            provider:
              id,

            adapter:
              adapterId
          }
      },
      env
    );


    /* ========================================================
    REFUND

    Refund hanya dilakukan sekali.

    Jika job sudah berstatus failed sebelum
    polling ini, jangan refund lagi.
    ======================================================== */

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
            {
              provider:
                id,

              adapter:
                adapterId
            }
        },
        env
      );
    }
  }


  /* ==========================================================
  PROCESSING
  ========================================================== */

  else {
    const currentAttempt =
      Number(
        job.attempt_count ||
        0
      );

    const nextAttempt =
      Number.isFinite(
        currentAttempt
      )
        ? currentAttempt + 1
        : 1;


    await updateJob(
      job.id,
      {
        attempt_count:
          nextAttempt,

        provider_status:
          "processing",

        metadata:
          {
            ...(job.metadata || {}),

            provider:
              id,

            adapter:
              adapterId
          }
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
          {
            provider:
              id,

            adapter:
              adapterId
          }
      },
      env
    );
  }


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

      ...result
    },
    200,
    env
  );
}
