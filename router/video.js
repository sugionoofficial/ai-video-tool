// ============================================================
// GEN-Z.AI
// GENERIC VIDEO PROXY
// ============================================================

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


// ============================================================
// LIMITS
// ============================================================

const MAX_JOB_ID_LENGTH = 128;

const MAX_PROVIDER_ID_LENGTH = 64;

const MAX_TARGET_LENGTH = 4096;

const MAX_RANGE_LENGTH = 128;


// ============================================================
// HELPERS
// ============================================================

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


// ============================================================
// ADAPTER ID
// ============================================================

function normalizeAdapterId(
  value
) {

  return String(
    value || ""
  )
    .trim()
    .toLowerCase();

}


// ============================================================
// JOB ADAPTER
// ============================================================

function getJobAdapterId(
  job
) {

  const metadata =
    job?.metadata &&
    typeof job.metadata ===
      "object" &&
    !Array.isArray(
      job.metadata
    )
      ? job.metadata
      : {};


  return normalizeAdapterId(
    metadata.adapter
  );

}


// ============================================================
// REQUEST RANGE
// ============================================================
//
// Browser video player biasanya mengirim:
//
// Range: bytes=0-
//
// atau:
//
// Range: bytes=1048576-2097151
//
// Kita hanya menerima single byte range.
// Multi-range tidak diperlukan untuk video streaming biasa.
// ============================================================

function getRequestRange(
  request
) {

  const value =
    String(
      request?.headers?.get(
        "Range"
      ) || ""
    ).trim();


  if (!value) {

    return "";

  }


  if (
    value.length >
    MAX_RANGE_LENGTH
  ) {

    throw new HttpError(
      "Range request terlalu panjang.",
      400
    );

  }


  /*
   * Hanya single byte range:
   *
   * bytes=0-
   * bytes=0-1023
   * bytes=1024-2048
   */

  if (
    !/^bytes=\d*-\d*$/.test(
      value
    )
  ) {

    throw new HttpError(
      "Range request tidak valid.",
      400
    );

  }


  /*
   * Pastikan minimal salah satu sisi
   * mempunyai angka.
   */

  if (
    value ===
    "bytes=-"
  ) {

    throw new HttpError(
      "Range request tidak valid.",
      400
    );

  }


  return value;

}


// ============================================================
// SAFE VIDEO CONTENT TYPE
// ============================================================

function getContentType(
  response
) {

  const value =
    String(
      response?.headers?.get(
        "Content-Type"
      ) || ""
    ).trim();


  if (
    !value
  ) {

    return "video/mp4";

  }


  /*
   * Hanya izinkan content type media.
   * Jangan meneruskan HTML / JSON sebagai video.
   */

  const lower =
    value.toLowerCase();


  if (
    lower.startsWith(
      "video/"
    )
  ) {

    return value;

  }


  if (
    lower ===
    "application/octet-stream"
  ) {

    return value;

  }


  return "video/mp4";

}


// ============================================================
// MAIN VIDEO HANDLER
// ============================================================

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


  // ==========================================================
  // PROVIDER
  // ==========================================================

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


  // ==========================================================
  // JOB ID
  // ==========================================================

  const jobId =
    normalizeId(
      url.searchParams.get(
        "jobId"
      ),
      MAX_JOB_ID_LENGTH,
      "jobId wajib."
    );


  // ==========================================================
  // LOAD JOB
  // ==========================================================

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


  if (
    !jobRows.ok
  ) {

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


  // ==========================================================
  // PROVIDER OWNERSHIP
  // ==========================================================

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


  // ==========================================================
  // STATUS
  // ==========================================================

  const jobStatus =
    String(
      job.status || ""
    )
      .trim()
      .toLowerCase();


  if (
    jobStatus !==
    "completed"
  ) {

    throw new HttpError(
      "Video belum siap.",
      409
    );

  }


  // ==========================================================
  // LOAD PROVIDER
  // ==========================================================
  //
  // Video yang sudah selesai tetap dapat diputar walaupun
  // provider saat ini dinonaktifkan oleh admin.
  //
  // ==========================================================

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


  // ==========================================================
  // RESOLVE ADAPTER
  // ==========================================================
  //
  // Prioritas:
  //
  // 1. Adapter yang disimpan ketika job dibuat
  // 2. Adapter provider saat ini sebagai fallback
  //
  // ==========================================================

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


  // ==========================================================
  // VALIDATE ADAPTER ID
  // ==========================================================

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


  // ==========================================================
  // LOAD ADAPTER
  // ==========================================================

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


  // ==========================================================
  // FETCH VIDEO SUPPORT
  // ==========================================================

  if (
    typeof adapter.fetchVideo !==
    "function"
  ) {

    throw new HttpError(
      `Adapter "${adapterId}" tidak memiliki fungsi fetchVideo().`,
      501
    );

  }


  // ==========================================================
  // METADATA
  // ==========================================================

  const metadata =
    job?.metadata &&
    typeof job.metadata ===
      "object" &&
    !Array.isArray(
      job.metadata
    )
      ? job.metadata
      : {};


  // ==========================================================
  // VIDEO TARGET
  // ==========================================================
  //
  // Prioritas target:
  //
  // 1. provider_file_id
  // 2. video_url
  //
  // Adapter menentukan bagaimana target digunakan.
  //
  // ChinaAPI:
  //     video_url = signed HTTPS URL
  //
  // MiniMax:
  //     provider_file_id = file_id
  //
  // ==========================================================

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


  let target;


  if (
    adapterId ===
    "chinaapi"
  ) {

    target =
      videoUrl;

  } else {

    target =
      providerFileId ||
      videoUrl;

  }


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


  // ==========================================================
  // SELF PROXY PROTECTION
  // ==========================================================

  const normalizedTarget =
    target
      .trim()
      .toLowerCase();


  if (
    normalizedTarget.startsWith(
      "/api/video"
    ) ||
    normalizedTarget.includes(
      "/api/video?"
    ) ||
    normalizedTarget.includes(
      "/api/video/"
    )
  ) {

    throw new HttpError(
      "Target video provider tidak valid.",
      404
    );

  }


  // ==========================================================
  // RANGE
  // ==========================================================

  const range =
    getRequestRange(
      request
    );


  // ==========================================================
  // ADAPTER EXECUTION
  // ==========================================================

  let response;


  try {

    /*
     * Adapter lama yang hanya menerima
     * 3 argument tetap kompatibel.
     *
     * Adapter yang mendukung streaming Range
     * dapat membaca options.range.
     */

    response =
      await adapter.fetchVideo(
        target,
        provider,
        env,
        {
          range:
            range ||
            null,

          request
        }
      );

  } catch (
    error
  ) {

    console.error(
      "video adapter failed",
      {
        provider:
          id,

        adapter:
          adapterId,

        range:
          range ||
          null,

        error:
          String(
            error?.message ||
            "unknown"
          ).slice(
            0,
            300
          )
      }
    );


    /*
     * Jangan membocorkan error provider
     * secara langsung kepada client.
     */

    throw new HttpError(
      "Gagal mengambil video dari provider.",
      502
    );

  }


  // ==========================================================
  // RESPONSE VALIDATION
  // ==========================================================

  if (
    !(response instanceof Response)
  ) {

    throw new HttpError(
      "Provider tidak mengembalikan response video yang valid.",
      502
    );

  }


  // ==========================================================
  // PROVIDER RESPONSE STATUS
  // ==========================================================

  const providerStatus =
    Number(
      response.status ||
      0
    );


  /*
   * Response normal:
   *
   * 200 OK
   *
   * Response Range:
   *
   * 206 Partial Content
   *
   * 416 Range Not Satisfiable
   */

  if (
    !response.ok
  ) {

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


  // ==========================================================
  // RESPONSE HEADERS
  // ==========================================================

  const headers = {
    ...corsHeaders(
      env
    ),

    "Content-Type":
      getContentType(
        response
      ),

    "Cache-Control":
      "private, no-store",

    "Accept-Ranges":
      response.headers.get(
        "Accept-Ranges"
      ) ||
      "bytes"
  };


  // ==========================================================
  // CONTENT LENGTH
  // ==========================================================

  const contentLength =
    response.headers.get(
      "Content-Length"
    );


  if (
    contentLength
  ) {

    headers[
      "Content-Length"
    ] =
      contentLength;

  }


  // ==========================================================
  // CONTENT RANGE
  // ==========================================================

  const contentRange =
    response.headers.get(
      "Content-Range"
    );


  if (
    contentRange
  ) {

    headers[
      "Content-Range"
    ] =
      contentRange;

  }


  // ==========================================================
  // ETAG
  // ==========================================================

  const etag =
    response.headers.get(
      "ETag"
    );


  if (
    etag
  ) {

    headers[
      "ETag"
    ] =
      etag;

  }


  // ==========================================================
  // LAST MODIFIED
  // ==========================================================

  const lastModified =
    response.headers.get(
      "Last-Modified"
    );


  if (
    lastModified
  ) {

    headers[
      "Last-Modified"
    ] =
      lastModified;

  }


  // ==========================================================
  // RESPONSE STATUS
  // ==========================================================
  //
  // Jika provider mengembalikan 206,
  // proxy juga harus mengembalikan 206.
  //
  // Ini penting untuk video player/browser yang
  // melakukan seeking atau streaming menggunakan Range.
  //
  // ==========================================================

  const responseStatus =
    providerStatus ===
    206
      ? 206
      : 200;


  // ==========================================================
  // RETURN VIDEO
  // ==========================================================

  return new Response(
    response.body,
    {
      status:
        responseStatus,

      headers
    }
  );

}
