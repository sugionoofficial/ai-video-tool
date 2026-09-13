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
 *   job
 *     ↓
 *   metadata.adapter
 *     ↓
 *   adapter.fetchVideo()
 *
 * Adapter yang tersimpan pada job menjadi sumber utama.
 * Ini penting agar video lama tetap menggunakan adapter
 * yang benar meskipun konfigurasi provider berubah.
 * ============================================================
 */

const MAX_JOB_ID_LENGTH = 128;
const MAX_PROVIDER_ID_LENGTH = 64;
const MAX_TARGET_LENGTH = 2048;


/* ============================================================
HELPERS
============================================================ */

function normalizeId(
  value,
  maxLength,
  message
) {
  const id =
    String(
      value || ""
    ).trim();

  if (!id) {
    throw new HttpError(
      message,
      400
    );
  }

  if (
    id.length >
    maxLength
  ) {
    throw new HttpError(
      message,
      400
    );
  }

  return id;
}


function normalizeAdapterId(
  value
) {
  return String(
    value || ""
  )
    .trim()
    .toLowerCase();
}


function getJobAdapterId(
  job
) {
  const metadata =
    job?.metadata &&
    typeof job.metadata === "object" &&
    !Array.isArray(job.metadata)
      ? job.metadata
      : {};

  return normalizeAdapterId(
    metadata.adapter
  );
}


/* ============================================================
MAIN VIDEO HANDLER
============================================================ */

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


  /* ==========================================================
  PROVIDER
  ========================================================== */

  const id =
    canonicalProvider(
      url.searchParams.get(
        "provider"
      )
    );

  if (!id) {
    throw new HttpError(
      "Provider wajib.",
      400
    );
  }

  if (
    id.length >
    MAX_PROVIDER_ID_LENGTH
  ) {
    throw new HttpError(
      "Provider tidak valid.",
      400
    );
  }


  /* ==========================================================
  JOB ID
  ========================================================== */

  const jobId =
    normalizeId(
      url.searchParams.get(
        "jobId"
      ),
      MAX_JOB_ID_LENGTH,
      "jobId wajib."
    );


  /* ==========================================================
  LOAD JOB
  ========================================================== */

  const jobRows =
    await sb(
      `/rest/v1/video_jobs?id=eq.${encodeURIComponent(
        jobId
      )}&user_id=eq.${encodeURIComponent(
        user.id
      )}&select=id,user_id,provider,status,video_url,metadata&limit=1`,
      {
        headers: {
          Accept:
            "application/json"
        }
      },
      env
    );


  if (!jobRows.ok) {
    throw new HttpError(
      "Gagal memeriksa job video.",
      500
    );
  }


  const rows =
    await jobRows.json();

  const job =
    Array.isArray(
      rows
    )
      ? rows[0]
      : null;


  if (!job) {
    throw new HttpError(
      "Job video tidak ditemukan.",
      404
    );
  }


  /* ==========================================================
  PROVIDER OWNERSHIP CHECK
  ========================================================== */

  const jobProvider =
    canonicalProvider(
      job.provider
    );

  if (
    !jobProvider ||
    jobProvider !== id
  ) {
    throw new HttpError(
      "Provider job tidak cocok.",
      403
    );
  }


  /* ==========================================================
  STATUS
  ========================================================== */

  if (
    String(
      job.status || ""
    )
      .trim()
      .toLowerCase() !==
    "completed"
  ) {
    throw new HttpError(
      "Video belum siap.",
      409
    );
  }


  /* ==========================================================
  LOAD PROVIDER
  ==========================================================
  
  includeDisabled = true

  Video yang sudah selesai tetap dapat diambil walaupun
  provider saat ini dinonaktifkan oleh admin.
  ========================================================== */

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


  /* ==========================================================
  RESOLVE ADAPTER
  ==========================================================
  
  PRIORITAS:
  
  1. Adapter yang disimpan pada job
  2. Adapter provider saat ini sebagai fallback
  
  Dengan begitu perubahan adapter di Admin tidak merusak
  job lama yang sudah tersimpan.
  ========================================================== */

  const jobAdapterId =
    getJobAdapterId(
      job
    );

  const providerAdapterId =
    normalizeAdapterId(
      provider?.adapter
    );

  const adapterId =
    jobAdapterId ||
    providerAdapterId;


  if (!adapterId) {
    throw new HttpError(
      `Job ${job.id} belum memiliki adapter.`,
      400
    );
  }


  /* ==========================================================
  VALIDATE ADAPTER ID
  ========================================================== */

  if (
    !/^[a-z0-9][a-z0-9_-]{1,63}$/.test(
      adapterId
    )
  ) {
    throw new HttpError(
      `Adapter "${adapterId}" tidak valid.`,
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
    !adapter
  ) {
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


  /* ==========================================================
  TARGET VIDEO
  ==========================================================
  
  Prioritas:
  
  1. provider_file_id
  2. video_url
  
  Adapter menentukan sendiri cara menggunakan target.
  ========================================================== */

  const metadata =
    job?.metadata &&
    typeof job.metadata === "object" &&
    !Array.isArray(job.metadata)
      ? job.metadata
      : {};


  const providerFileId =
    String(
      metadata.provider_file_id ||
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


  if (
    target.length >
    MAX_TARGET_LENGTH
  ) {
    throw new HttpError(
      "Target video provider terlalu panjang.",
      400
    );
  }


  /* ==========================================================
  SELF-PROXY PROTECTION
  ========================================================== */

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


  /* ==========================================================
  ADAPTER EXECUTION
  ========================================================== */

  let response;

  try {
    response =
      await adapter.fetchVideo(
        target,
        provider,
        env
      );
  } catch (error) {
    console.error(
      "video adapter failed",
      adapterId,
      String(
        error?.message ||
        "unknown"
      ).slice(
        0,
        300
      )
    );

    throw new HttpError(
      "Gagal mengambil video dari provider.",
      502
    );
  }


  if (!response) {
    throw new HttpError(
      "Provider tidak mengembalikan response video.",
      502
    );
  }


  if (
    !response.ok
  ) {
    const providerStatus =
      Number(
        response.status || 502
      );

    const safeStatus =
      providerStatus >= 400 &&
      providerStatus <= 599
        ? providerStatus
        : 502;


    throw new HttpError(
      `Gagal mengambil video (${safeStatus}).`,
      safeStatus
    );
  }


  /* ==========================================================
  RETURN VIDEO
  ========================================================== */

  const contentType =
    response.headers.get(
      "Content-Type"
    ) ||
    "video/mp4";


  return new Response(
    response.body,
    {
      status: 200,

      headers: {
        ...corsHeaders(
          env
        ),

        "Content-Type":
          contentType,

        "Cache-Control":
          "private, no-store"
      }
    }
  );
}
