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

/*
 * ============================================================
 * STATUS ROUTER
 * ============================================================
 */

export async function handleStatus(
  request,
  env
) {
  const user =
    await requireUser(
      request,
      env
    );

  requireJsonContentType(
    request
  );

  let body;

  try {
    body =
      await readJson(
        request
      );
  } catch {
    throw new HttpError(
      "JSON status tidak valid.",
      400
    );
  }

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

  const provider =
    await getProvider(
      id,
      env,
      false
    );

  const adapter =
    resolveAdapter(
      provider
    );

  if (!adapter) {
    throw new HttpError(
      `Adapter provider ${id} belum didukung Worker.`,
      400
    );
  }

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

    const previousMetadata =
      {
        ...(job.metadata ||
          {})
      };

    const nextMetadata =
      {
        ...previousMetadata,

        ...result,

        provider:
          id,

        adapter:
          provider.adapter,

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

    if (
      result.fileId
    ) {
      nextMetadata.provider_file_id =
        result.fileId;
    }

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
      proxyUrl;

    delete result.fileId;
  } else if (
    result.status ===
    "failed"
  ) {
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
          "provider_failed"
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
          "Provider reported failure"
      },
      env
    );

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
          "Credit refunded after provider failure"
      },
      env
    );
  } else {
    await updateJob(
      job.id,
      {
        attempt_count:
          Number(
            job.attempt_count ||
              0
          ) + 1,

        provider_status:
          "processing"
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
            adapter:
              provider.adapter
          }
      },
      env
    );
  }

  return json(
    {
      jobId:
        job.id,

      ...result
    },
    200,
    env
  );
}
