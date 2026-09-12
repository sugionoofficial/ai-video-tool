import {
  HttpError,
  corsHeaders
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
  sb
} from "../lib/supabase.js";

/*
 * ============================================================
 * VIDEO PROXY
 * ============================================================
 */

export async function handleVideo(
  request,
  env
) {
  const user =
    await requireUser(
      request,
      env
    );

  const url =
    new URL(
      request.url
    );

  const id =
    canonicalProvider(
      url.searchParams.get(
        "provider"
      )
    );

  const jobId =
    String(
      url.searchParams.get(
        "jobId"
      ) || ""
    ).trim();

  if (!jobId) {
    throw new HttpError(
      "jobId wajib.",
      400
    );
  }

  if (!id) {
    throw new HttpError(
      "Provider wajib.",
      400
    );
  }

  const jobRows =
    await sb(
      `/rest/v1/video_jobs?id=eq.${encodeURIComponent(
        jobId
      )}&user_id=eq.${encodeURIComponent(
        user.id
      )}&select=id,user_id,provider,status,video_url,metadata&limit=1`,
      {},
      env
    );

  if (
    !jobRows.ok
  ) {
    throw new HttpError(
      "Gagal memeriksa job video.",
      500
    );
  }

  const job =
    (
      await jobRows.json()
    )?.[0];

  if (!job) {
    throw new HttpError(
      "Job video tidak ditemukan.",
      404
    );
  }

  if (
    job.provider !==
    id
  ) {
    throw new HttpError(
      "Provider job tidak cocok.",
      403
    );
  }

  if (
    job.status !==
    "completed"
  ) {
    throw new HttpError(
      "Video belum siap.",
      409
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

  let target;

  if (
    String(
      provider.adapter ||
        ""
    ).toLowerCase() ===
    "minimax"
  ) {
    target =
      String(
        job?.metadata
          ?.provider_file_id ||
          ""
      ).trim();

    if (!target) {
      throw new HttpError(
        "File video MiniMax tidak tersedia.",
        404
      );
    }
  } else {
    target =
      String(
        job.video_url ||
          ""
      ).trim();

    if (
      !target ||
      target.startsWith(
        "/api/video"
      )
    ) {
      throw new HttpError(
        "URL video provider tidak tersedia.",
        404
      );
    }
  }

  const response =
    await adapter.fetchVideo(
      target,
      provider,
      env
    );

  if (!response) {
    throw new HttpError(
      "Provider tidak mengembalikan response video.",
      502
    );
  }

  if (
    !response.ok
  ) {
    throw new HttpError(
      `Gagal mengambil video (${response.status}).`,
      response.status
    );
  }

  return new Response(
    response.body,
    {
      status:
        200,

      headers: {
        ...corsHeaders(
          env
        ),

        "Content-Type":
          response.headers.get(
            "Content-Type"
          ) ||
          "video/mp4",

        "Cache-Control":
          "private, no-store"
      }
    }
  );
}
