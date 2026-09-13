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
 * GEN-Z.AI
 * GENERIC VIDEO PROXY
 * ============================================================
 *
 * Router ini tidak mengetahui detail provider.
 *
 * Alur:
 *
 *   provider
 *      ↓
 *   provider.adapter
 *      ↓
 *   adapter.fetchVideo()
 *
 * Semua logika khusus provider berada di adapter masing-masing.
 *
 * Contoh:
 *
 *   /public/js/providers/veo.js
 *   /public/js/providers/minimax.js
 *   /public/js/providers/luma.js
 *
 * Provider baru tidak membutuhkan perubahan pada router ini.
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

  if (!jobRows.ok) {
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
      true
    );

  if (!provider) {
    throw new HttpError(
      `Provider ${id} tidak ditemukan.`,
      404
    );
  }

  const adapterId =
    String(
      provider?.adapter ||
        ""
    ).trim().toLowerCase();

  if (!adapterId) {
    throw new HttpError(
      `Provider ${id} belum memiliki adapter.`,
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

  if (!adapter) {
    throw new HttpError(
      `Adapter "${adapterId}" belum tersedia di Worker.`,
      400
    );
  }

  if (
    typeof adapter.fetchVideo !==
    "function"
  ) {
    throw new HttpError(
      `Adapter "${adapterId}" tidak memiliki fungsi fetchVideo().`,
      501
    );
  }

  /*
   * ==========================================================
   * TARGET VIDEO
   * ==========================================================
   *
   * Router tidak membedakan provider.
   *
   * Adapter menentukan sendiri bagaimana target digunakan.
   *
   * Prioritas:
   *
   * 1. provider_file_id
   * 2. video_url
   *
   * MiniMax dapat menggunakan file ID.
   * Veo / Luma dapat menggunakan URL.
   * Provider baru bebas menentukan format targetnya sendiri.
   * ==========================================================
   */

  const providerFileId =
    String(
      job?.metadata
        ?.provider_file_id ||
        ""
    ).trim();

  const videoUrl =
    String(
      job?.video_url ||
        ""
    ).trim();

  const target =
    providerFileId ||
    videoUrl;

  if (!target) {
    throw new HttpError(
      "Target video provider tidak tersedia.",
      404
    );
  }

  /*
   * Jangan izinkan proxy memanggil dirinya sendiri.
   */
  if (
    target.startsWith(
      "/api/video"
    )
  ) {
    throw new HttpError(
      "Target video provider tidak valid.",
      404
    );
  }

  /*
   * ==========================================================
   * ADAPTER EXECUTION
   * ==========================================================
   */

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

  /*
   * ==========================================================
   * RETURN VIDEO
   * ==========================================================
   */

  return new Response(
    response.body,
    {
      status: 200,

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
