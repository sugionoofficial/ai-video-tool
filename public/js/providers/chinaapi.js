const ID = "chinaapi";
const NAME = "ChinaAPI";

const BASE_URL =
  "https://api.chinaapi.ai/v1";

const CAPABILITIES = {
  models: [
    "wan2.7-t2v",
    "wan2.7-i2v",
    "wan2.7-r2v",
    "kling-v3",
    "kling-3.0-turbo",
    "kling-v3-omni",
    "MiniMax-H3",
    "MiniMax-Hailuo-2.3",
    "MiniMax-Hailuo-2.3-Fast",
    "MiniMax-Hailuo-02",
    "doubao-seedance-2-5-260628",
    "doubao-seedance-2-0-260615",
    "doubao-seedance-2-0-260128",
    "doubao-seedance-2-0-fast-260128",
    "happyhorse-1.1-t2v",
    "happyhorse-1.1-r2v",
    "happyhorse-1.1-i2v"
  ],

  durations: [
    3,
    4,
    5,
    6,
    8,
    10,
    12,
    15
  ],

  aspects: [
    "16:9",
    "9:16",
    "1:1"
  ],

  resolutions: [
    "480p",
    "720p",
    "1080p",
    "2K",
    "4K"
  ]
};


/* ============================================================
 * ERROR
 * ============================================================ */

function providerError(
  message,
  status = 400
) {
  const error =
    new Error(message);

  error.status =
    status;

  return error;
}


/* ============================================================
 * SAFE JSON
 * ============================================================ */

async function safeJson(
  response
) {
  const text =
    await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      raw: text
    };
  }
}


/* ============================================================
 * API ERROR
 * ============================================================ */

function apiError(
  data,
  fallback
) {
  if (
    typeof data?.error ===
    "string"
  ) {
    return data.error;
  }

  if (
    data?.error &&
    typeof data.error.message ===
      "string"
  ) {
    return data.error.message;
  }

  if (
    data?.error &&
    typeof data.error.message ===
      "object"
  ) {
    return (
      data.error.message.message ||
      fallback
    );
  }

  if (
    typeof data?.message ===
    "string"
  ) {
    return data.message;
  }

  if (
    typeof data?.fail_reason ===
    "string" &&
    data.fail_reason.trim()
  ) {
    return data.fail_reason;
  }

  if (
    data?.data &&
    typeof data.data.fail_reason ===
      "string" &&
    data.data.fail_reason.trim()
  ) {
    return data.data.fail_reason;
  }

  if (
    data?.data?.error &&
    typeof data.data.error.message ===
      "string"
  ) {
    return data.data.error.message;
  }

  if (
    typeof data?.raw ===
    "string"
  ) {
    return data.raw;
  }

  return fallback;
}


/* ============================================================
 * NORMALIZE STATUS
 * ============================================================ */

function normalizeStatus(
  value
) {
  return String(
    value || ""
  )
    .trim()
    .toLowerCase();
}


/* ============================================================
 * EXTRACT TASK ID
 * ============================================================ */

function extractTaskId(
  data
) {
  return (
    data?.task_id ||
    data?.taskId ||
    data?.id ||
    data?.data?.task_id ||
    data?.data?.taskId ||
    data?.data?.id ||
    null
  );
}


/* ============================================================
 * EXTRACT VIDEO URL
 * ============================================================ */

function extractVideoUrl(
  data
) {
  return (
    data?.result_url ||
    data?.video_url ||
    data?.download_url ||
    data?.metadata?.url ||
    data?.data?.result_url ||
    data?.data?.video_url ||
    data?.data?.download_url ||
    data?.data?.metadata?.url ||
    null
  );
}


/* ============================================================
 * INFO
 * ============================================================ */

export function info() {
  return {
    id:
      ID,

    name:
      NAME,

    capabilities:
      CAPABILITIES
  };
}


/* ============================================================
 * GENERATE
 * ============================================================ */

export async function generate(
  body,
  provider
) {
  const key =
    String(
      provider?.api_key || ""
    ).trim();

  if (!key) {
    throw providerError(
      "API key ChinaAPI belum dikonfigurasi.",
      400
    );
  }


  /* ==========================================================
   * MODEL
   * ========================================================== */

  const model =
    String(
      body?.model ||
        "wan2.7-t2v"
    ).trim();

  if (
    !CAPABILITIES.models.includes(
      model
    )
  ) {
    throw providerError(
      "Model ChinaAPI tidak valid.",
      400
    );
  }


  /* ==========================================================
   * PROMPT
   * ========================================================== */

  const prompt =
    String(
      body?.prompt || ""
    ).trim();

  if (!prompt) {
    throw providerError(
      "Prompt ChinaAPI kosong.",
      400
    );
  }


  /* ==========================================================
   * DURATION
   * ========================================================== */

  const duration =
    Number(
      body?.duration ??
        5
    );

  if (
    !Number.isFinite(
      duration
    )
  ) {
    throw providerError(
      "Durasi ChinaAPI tidak valid.",
      400
    );
  }


  /* ==========================================================
   * ASPECT RATIO
   * ========================================================== */

  const aspectRatio =
    String(
      body?.aspectRatio ||
        "16:9"
    ).trim();


  /* ==========================================================
   * RESOLUTION
   * ========================================================== */

  const resolution =
    String(
      body?.resolution ||
        "720p"
    )
      .trim()
      .toLowerCase();


  /* ==========================================================
   * PAYLOAD DASAR
   *
   * ChinaAPI mendokumentasikan model T2V dengan
   * model + prompt sebagai parameter utama.
   * ========================================================== */

  const payload = {
    model,
    prompt,
    duration
  };


  /* ==========================================================
   * RESOLUTION
   * ========================================================== */

  const resolutionMap = {
    "480p": {
      width: 854,
      height: 480
    },

    "720p": {
      width: 1280,
      height: 720
    },

    "1080p": {
      width: 1920,
      height: 1080
    },

    "2k": {
      width: 2560,
      height: 1440
    },

    "4k": {
      width: 3840,
      height: 2160
    }
  };

  const size =
    resolutionMap[
      resolution
    ];


  if (size) {
    payload.width =
      size.width;

    payload.height =
      size.height;
  }


  /* ==========================================================
   * ASPECT RATIO
   *
   * ChinaAPI menggunakan parameter berbeda
   * pada beberapa model. Untuk model yang
   * menerima width/height, kita prioritaskan
   * aspect ratio melalui ukuran output.
   * ========================================================== */

  if (
    aspectRatio ===
    "9:16"
  ) {
    payload.width =
      size?.height || 720;

    payload.height =
      size?.width || 1280;
  }


  if (
    aspectRatio ===
    "1:1"
  ) {
    const square =
      size?.height ||
      720;

    payload.width =
      square;

    payload.height =
      square;
  }


  /* ==========================================================
   * IMAGE-TO-VIDEO
   *
   * ChinaAPI membutuhkan image reference
   * yang dapat dijangkau oleh server ChinaAPI.
   *
   * Jangan mengirim data URL base64 secara
   * langsung sebagai input_reference.
   * ========================================================== */

  if (
    body?.imageData
  ) {
    const imageData =
      String(
        body.imageData
      ).trim();

    if (
      /^https?:\/\//i.test(
        imageData
      )
    ) {
      payload.input_reference =
        imageData;
    } else {
      throw providerError(
        "ChinaAPI image-to-video membutuhkan URL gambar yang dapat diakses publik.",
        400
      );
    }
  }


  /* ==========================================================
   * SUBMIT
   * ========================================================== */

  const response =
    await fetch(
      `${BASE_URL}/video/generations`,
      {
        method:
          "POST",

        headers: {
          Authorization:
            `Bearer ${key}`,

          "Content-Type":
            "application/json",

          Accept:
            "application/json"
        },

        body:
          JSON.stringify(
            payload
          )
      }
    );


  const data =
    await safeJson(
      response
    );


  if (
    !response.ok
  ) {
    throw providerError(
      apiError(
        data,
        `ChinaAPI error (${response.status}).`
      ),
      response.status
    );
  }


  const taskId =
    extractTaskId(
      data
    );


  if (
    taskId === null ||
    taskId === undefined ||
    String(
      taskId
    ).trim() === ""
  ) {
    throw providerError(
      "ChinaAPI tidak mengembalikan task ID.",
      502
    );
  }


  return {
    externalId:
      String(
        taskId
      ),

    provider:
      ID,

    status:
      "processing",

    model,

    duration,

    aspectRatio,

    resolution
  };
}


/* ============================================================
 * STATUS
 * ============================================================ */

export async function status(
  externalId,
  provider
) {
  const key =
    String(
      provider?.api_key || ""
    ).trim();

  if (!key) {
    throw providerError(
      "API key ChinaAPI belum dikonfigurasi.",
      400
    );
  }


  const taskId =
    String(
      externalId || ""
    ).trim();

  if (!taskId) {
    throw providerError(
      "Task ID ChinaAPI tidak valid.",
      400
    );
  }


  const response =
    await fetch(
      `${BASE_URL}/video/generations/${encodeURIComponent(
        taskId
      )}`,
      {
        method:
          "GET",

        headers: {
          Authorization:
            `Bearer ${key}`,

          Accept:
            "application/json"
        }
      }
    );


  const data =
    await safeJson(
      response
    );


  if (
    !response.ok
  ) {
    throw providerError(
      apiError(
        data,
        `ChinaAPI status error (${response.status}).`
      ),
      response.status
    );
  }


  /*
   * ChinaAPI dapat mengembalikan:
   *
   * data.status
   *
   * atau:
   *
   * data.data.status
   */

  const rawStatus =
    data?.status ||
    data?.data?.status ||
    data?.task_status ||
    data?.data?.task_status ||
    "";


  const state =
    normalizeStatus(
      rawStatus
    );


  /* ==========================================================
   * FAILED
   * ========================================================== */

  if (
    [
      "failed",
      "failure",
      "error",
      "cancelled",
      "canceled"
    ].includes(
      state
    )
  ) {
    return {
      success:
        true,

      status:
        "failed",

      provider:
        ID,

      error:
        apiError(
          data,
          "ChinaAPI generation gagal."
        )
    };
  }


  /* ==========================================================
   * COMPLETED
   * ========================================================== */

  if (
    [
      "success",
      "succeeded",
      "completed",
      "finished"
    ].includes(
      state
    )
  ) {
    const videoUrl =
      extractVideoUrl(
        data
      );


    if (
      typeof videoUrl ===
        "string" &&
      videoUrl.trim()
    ) {
      return {
        success:
          true,

        status:
          "completed",

        provider:
          ID,

        videoUrl:
          videoUrl.trim()
      };
    }


    return {
      success:
        true,

      status:
        "failed",

      provider:
        ID,

      error:
        "ChinaAPI menyatakan video selesai tetapi URL video tidak ditemukan."
    };
  }


  /* ==========================================================
   * PROCESSING
   * ========================================================== */

  return {
    success:
      true,

    status:
      "processing",

    provider:
      ID
  };
}


/* ============================================================
 * FETCH VIDEO
 *
 * ChinaAPI mengembalikan signed URL.
 * GEN-Z.AI dapat mengambil URL tersebut
 * melalui worker setelah status completed.
 * ============================================================ */

export async function fetchVideo(
  videoUrl,
  provider
) {
  const url =
    String(
      videoUrl || ""
    ).trim();

  if (!url) {
    throw providerError(
      "URL video ChinaAPI tidak tersedia.",
      404
    );
  }


  let parsedUrl;

  try {
    parsedUrl =
      new URL(
        url
      );
  } catch {
    throw providerError(
      "URL video ChinaAPI tidak valid.",
      502
    );
  }


  if (
    parsedUrl.protocol !==
    "https:"
  ) {
    throw providerError(
      "URL video ChinaAPI tidak aman.",
      403
    );
  }


  /*
   * Signed URL dari ChinaAPI
   * tidak perlu Authorization header.
   */

  const response =
    await fetch(
      parsedUrl.toString()
    );


  if (
    !response.ok
  ) {
    throw providerError(
      `Gagal mengambil video ChinaAPI (${response.status}).`,
      response.status
    );
  }


  return response;
}


/* ============================================================
 * DEFAULT EXPORT
 * ============================================================ */

export default {
  id:
    ID,

  name:
    NAME,

  capabilities:
    CAPABILITIES,

  info,

  generate,

  status,

  fetchVideo
};
