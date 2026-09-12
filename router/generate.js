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

/*
 * ============================================================
 * GENERATE ROUTER
 * ============================================================
 */

export async function handleGenerate(
  request,
  env
) {
  const ct =
    String(
      request.headers.get(
        "content-type"
      ) || ""
    ).toLowerCase();

  if (
    !ct.includes(
      "application/json"
    )
  ) {
    throw new HttpError(
      "Content-Type harus application/json.",
      415
    );
  }

  const user =
    await requireUser(
      request,
      env
    );

  checkGenerateRate(
    user.id
  );

  const body =
    await readJson(
      request
    );

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

  const provider =
    await getProvider(
      id,
      env,
      true
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

  const prompt =
    String(
      body?.prompt ||
        ""
    ).trim();

  if (
    prompt.length < 3 ||
    prompt.length > 2000
  ) {
    throw new HttpError(
      "Prompt harus 3-2000 karakter.",
      400
    );
  }

  const requestedModel =
    body?.model != null
      ? String(
          body.model
        ).trim()
      : null;

  const requestedDuration =
    body?.duration != null
      ? Number(
          body.duration
        )
      : null;

  if (
    body?.duration != null &&
    !Number.isFinite(
      requestedDuration
    )
  ) {
    throw new HttpError(
      "Duration tidak valid.",
      400
    );
  }

  if (
    body?.duration != null
  ) {
    const info =
      getAdapterInfo(
        provider.adapter
      );

    const allowed =
      Array.isArray(
        info?.durations
      )
        ? info.durations.map(
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
        : [];

    if (
      allowed.length &&
      !allowed.includes(
        requestedDuration
      )
    ) {
      throw new HttpError(
        "Duration tidak didukung oleh provider.",
        400
      );
    }
  }

  const requestedAspectRatio =
    body?.aspectRatio != null
      ? String(
          body.aspectRatio
        ).trim()
      : null;

  const requestedResolution =
    body?.resolution != null
      ? String(
          body.resolution
        ).trim()
      : null;

  const cost =
    Math.max(
      1,
      Number(
        env.GENERATION_CREDIT_COST ||
          1
      )
    );

  const idem =
    String(
      request.headers.get(
        "Idempotency-Key"
      ) || ""
    ).trim();

  if (
    !idem ||
    idem.length > 128
  ) {
    throw new HttpError(
      "Idempotency-Key wajib diisi (1-128 karakter).",
      400
    );
  }

  const fingerprintSource =
    JSON.stringify({
      provider:
        id,

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
        b =>
          b
            .toString(16)
            .padStart(
              2,
              "0"
            )
      )
      .join("");

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

  try {
    const initialMetadata =
      {
        provider:
          id,

        adapter:
          provider.adapter,

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

    const metadata =
      {
        ...initialMetadata,

        ...result,

        provider:
          id,

        adapter:
          provider.adapter,

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

    return json(
      {
        success:
          true,

        jobId,

        ...result,

        provider:
          id,

        creditsRemaining:
          reservation.credits_remaining
      },
      200,
      env
    );
  } catch (err) {
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
