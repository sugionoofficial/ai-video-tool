// ============================================================
// GEN-Z.AI - CHINAAPI PROVIDER ADAPTER
// ============================================================

const CHINAAPI_BASE_URL = "https://api.chinaapi.ai/v1";
const ID = "chinaapi";
const NAME = "ChinaAPI";
const MODEL_ID = "agnes-video-2.5-flash";

const CAPABILITIES = {
  models: [MODEL_ID],

  durations: [
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    11,
    12
  ],

  aspects: [
    "16:9",
    "9:16",
    "4:3",
    "3:4",
    "1:1",
    "21:9"
  ],

  resolutions: [
    "720P"
  ],

  constraints: {
    [MODEL_ID]: {
      imageReferenceSupported: true,
      maxReferenceImages: 5,
      maxReferenceVideos: 0,

      modes: [
        "text",
        "reference"
      ],

      textToVideo: {
        4: ["720P"],
        5: ["720P"],
        6: ["720P"],
        7: ["720P"],
        8: ["720P"],
        9: ["720P"],
        10: ["720P"],
        11: ["720P"],
        12: ["720P"]
      },

      referenceToVideo: {
        4: ["720P"],
        5: ["720P"],
        6: ["720P"],
        7: ["720P"],
        8: ["720P"],
        9: ["720P"],
        10: ["720P"],
        11: ["720P"],
        12: ["720P"]
      }
    }
  }
};


// ============================================================
// ERROR
// ============================================================

function providerError(
  message,
  status = 400,
  code = ""
) {
  const error = new Error(
    String(
      message ||
      "ChinaAPI provider error."
    )
  );

  error.status =
    Number(status) || 400;

  error.provider =
    ID;

  error.adapter =
    ID;

  if (code) {
    error.code =
      String(code);
  }

  return error;
}


// ============================================================
// API KEY
// ============================================================

function getApiKey(
  provider = {},
  env = {}
) {
  const key =
    String(
      provider?.api_key ||
      env?.CHINAAPI_KEY ||
      ""
    ).trim();

  if (!key) {
    throw providerError(
      "API key ChinaAPI belum dikonfigurasi.",
      400,
      "missing_api_key"
    );
  }

  return key;
}


// ============================================================
// JSON
// ============================================================

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


// ============================================================
// ERROR MESSAGE
// ============================================================

function getErrorMessage(
  data,
  fallback
) {
  const candidates = [
    data?.error,
    data?.message,
    data?.fail_reason,
    data?.data?.error,
    data?.data?.message,
    data?.data?.fail_reason,
    data?.details?.message
  ];

  for (
    const value of candidates
  ) {
    if (
      typeof value === "string" &&
      value.trim()
    ) {
      return value.trim();
    }
  }

  if (
    data?.error &&
    typeof data.error.message ===
      "string"
  ) {
    return data.error.message;
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
    return data.raw.slice(
      0,
      1000
    );
  }

  return fallback;
}


// ============================================================
// STATUS
// ============================================================

function normalizeStatus(
  value
) {
  return String(
    value || ""
  )
    .trim()
    .toLowerCase();
}


// ============================================================
// VIDEO URL
// ============================================================

function getVideoUrl(
  data
) {
  const candidates = [
    data?.result_url,
    data?.video_url,
    data?.url,

    data?.data?.result_url,
    data?.data?.video_url,
    data?.data?.url,

    data?.output?.url,
    data?.output?.video_url,

    data?.metadata?.url,
    data?.metadata?.video_url
  ];

  for (
    const value
    of candidates
  ) {
    if (
      typeof value ===
        "string" &&
      value.trim()
    ) {
      return value.trim();
    }
  }

  return "";
}


// ============================================================
// TASK ID
// ============================================================

function getExternalId(
  data
) {
  /*
  ChinaAPI dapat mengembalikan beberapa ID.

  Contoh response aktual:

  {
    "id": 568,
    "task_id": "task_Z5xFF...",
    "data": {
      "id": "task_qivhheb...",
      "url": "https://..."
    }
  }

  ID yang digunakan endpoint:

  GET /v1/videos/{taskId}

  adalah data.id.

  Karena itu data.data.id harus diprioritaskan.
  */

  const candidates = [
    data?.data?.id,
    data?.data?.task_id,
    data?.data?.video_id,

    data?.video_id,
    data?.taskId,
    data?.task_id,

    data?.videoId
  ];

  for (
    const value
    of candidates
  ) {
    if (
      value !== undefined &&
      value !== null &&
      String(value).trim()
    ) {
      return String(
        value
      ).trim();
    }
  }

  return "";
}


// ============================================================
// REFERENCE IMAGES
// ============================================================

function getReferenceImages(
  body = {}
) {
  const images = [];

  if (
    Array.isArray(
      body?.images
    )
  ) {
    body.images.forEach(
      image => {
        if (
          typeof image ===
            "string" &&
          image.trim()
        ) {
          images.push(
            image.trim()
          );
        }
      }
    );
  }

  if (
    typeof body?.imageData ===
      "string" &&
    body.imageData.trim()
  ) {
    const imageData =
      body.imageData.trim();

    if (
      !images.includes(
        imageData
      )
    ) {
      images.unshift(
        imageData
      );
    }
  }

  return images
    .filter(Boolean)
    .slice(
      0,
      5
    );
}


// ============================================================
// INFO
// ============================================================

export function info() {
  return {
    id:
      ID,

    name:
      NAME,

    supported:
      true,

    capabilities:
      CAPABILITIES
  };
}


// ============================================================
// GENERATE
// ============================================================

export async function generate(
  body = {},
  provider = {},
  env = {}
) {
  const apiKey =
    getApiKey(
      provider,
      env
    );

  const prompt =
    String(
      body?.prompt || ""
    ).trim();

  if (!prompt) {
    throw providerError(
      "Prompt ChinaAPI kosong.",
      400,
      "invalid_prompt"
    );
  }

  const model =
    String(
      body?.model ||
      MODEL_ID
    ).trim();

  if (
    !CAPABILITIES.models.includes(
      model
    )
  ) {
    throw providerError(
      "Model ChinaAPI tidak valid.",
      400,
      "invalid_model"
    );
  }

  const duration =
    Number(
      body?.duration ?? 5
    );

  if (
    !Number.isFinite(
      duration
    ) ||
    !CAPABILITIES.durations.includes(
      duration
    )
  ) {
    throw providerError(
      "Durasi ChinaAPI harus antara 4 sampai 12 detik.",
      400,
      "invalid_duration"
    );
  }

  const aspectRatio =
    String(
      body?.aspectRatio ||
      body?.aspect ||
      body?.ratio ||
      "16:9"
    ).trim();

  if (
    !CAPABILITIES.aspects.includes(
      aspectRatio
    )
  ) {
    throw providerError(
      "Aspect ratio ChinaAPI tidak valid.",
      400,
      "invalid_aspect_ratio"
    );
  }

  const resolution =
    String(
      body?.resolution ||
      "720P"
    ).trim();

  if (
    resolution !==
    "720P"
  ) {
    throw providerError(
      "Agnes Video 2.5 Flash hanya mendukung 720P.",
      400,
      "invalid_resolution"
    );
  }


  // ==========================================================
  // REFERENCE IMAGE
  // ==========================================================

  const referenceImages =
    getReferenceImages(
      body
    );

  if (
    referenceImages.length >
    5
  ) {
    throw providerError(
      "Agnes Video 2.5 Flash maksimal menerima 5 reference image.",
      400,
      "too_many_reference_images"
    );
  }


  // ==========================================================
  // MODE
  // ==========================================================

  const mode =
    referenceImages.length
      ? "reference"
      : "text";


  // ==========================================================
  // PAYLOAD
  // ==========================================================

  const payload = {
    model,

    prompt,

    mode,

    seconds:
      String(
        duration
      ),

    size:
      "720P",

    aspect_ratio:
      aspectRatio
  };


  // ==========================================================
  // REFERENCE IMAGE
  // ==========================================================

  if (
    referenceImages.length
  ) {
    payload.images =
      referenceImages;
  }


  // ==========================================================
  // REQUEST
  // ==========================================================

  let response;

  try {
    response =
      await fetch(
        `${CHINAAPI_BASE_URL}/videos`,
        {
          method:
            "POST",

          headers: {
            Authorization:
              `Bearer ${apiKey}`,

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
  } catch {
    throw providerError(
      "Tidak dapat terhubung ke server ChinaAPI.",
      502,
      "connection_error"
    );
  }


  // ==========================================================
  // RESPONSE
  // ==========================================================

  const data =
    await safeJson(
      response
    );

  if (
    !response.ok
  ) {
    throw providerError(
      getErrorMessage(
        data,
        "ChinaAPI gagal membuat video."
      ),
      response.status,
      data?.error?.code ||
      data?.data?.error?.code ||
      "provider_error"
    );
  }


  // ==========================================================
  // TASK ID
  // ==========================================================

  const externalId =
    getExternalId(
      data
    );

  if (!externalId) {
    throw providerError(
      "ChinaAPI tidak mengembalikan task ID video.",
      502,
      "missing_task_id"
    );
  }


  // ==========================================================
  // INSTANT RESULT
  // ==========================================================

  const initialStatus =
    normalizeStatus(
      data?.status ||
      data?.state ||
      data?.data?.status
    );

  const initialVideoUrl =
    getVideoUrl(
      data
    );

  if (
    [
      "completed",
      "complete",
      "succeeded",
      "success",
      "finished"
    ].includes(
      initialStatus
    ) &&
    initialVideoUrl
  ) {
    return {
      externalId,

      provider:
        ID,

      adapter:
        ID,

      status:
        "completed",

      videoUrl:
        initialVideoUrl,

      model,

      duration,

      aspectRatio,

      resolution,

      mode,

      referenceImageCount:
        referenceImages.length
    };
  }


  // ==========================================================
  // RESULT
  // ==========================================================

  return {
    externalId,

    provider:
      ID,

    adapter:
      ID,

    status:
      "processing",

    model,

    duration,

    aspectRatio,

    resolution,

    mode,

    referenceImageCount:
      referenceImages.length
  };
}


// ============================================================
// STATUS
// ============================================================

export async function status(
  externalId,
  provider = {},
  env = {}
) {
  const apiKey =
    getApiKey(
      provider,
      env
    );

  const taskId =
    String(
      externalId || ""
    ).trim();

  if (!taskId) {
    throw providerError(
      "Task ID ChinaAPI tidak valid.",
      400,
      "invalid_task_id"
    );
  }

  let response;

  try {
    response =
      await fetch(
        `${CHINAAPI_BASE_URL}/videos/${encodeURIComponent(
          taskId
        )}`,
        {
          method:
            "GET",

          headers: {
            Authorization:
              `Bearer ${apiKey}`,

            Accept:
              "application/json"
          }
        }
      );
  } catch {
    throw providerError(
      "Tidak dapat terhubung ke server ChinaAPI.",
      502,
      "connection_error"
    );
  }

  const data =
    await safeJson(
      response
    );

  if (
    !response.ok
  ) {
    throw providerError(
      getErrorMessage(
        data,
        "ChinaAPI gagal mengambil status video."
      ),
      response.status,
      data?.error?.code ||
      data?.data?.error?.code ||
      "status_error"
    );
  }


  // ==========================================================
  // NORMALIZE STATUS
  // ==========================================================

  const currentStatus =
    normalizeStatus(
      data?.status ||
      data?.state ||
      data?.data?.status ||
      data?.data?.state
    );


  // ==========================================================
  // FAILED
  // ==========================================================

  if (
    [
      "failed",
      "failure",
      "error",
      "cancelled",
      "canceled"
    ].includes(
      currentStatus
    )
  ) {
    return {
      success:
        true,

      status:
        "failed",

      provider:
        ID,

      adapter:
        ID,

      error:
        getErrorMessage(
          data,
          data?.fail_reason ||
          data?.data?.fail_reason ||
          "ChinaAPI video generation gagal."
        ),

      errorCode:
        data?.error?.code ||
        data?.data?.error?.code ||
        "provider_failed"
    };
  }


  // ==========================================================
  // COMPLETED
  // ==========================================================

  if (
    [
      "completed",
      "complete",
      "succeeded",
      "success",
      "finished"
    ].includes(
      currentStatus
    )
  ) {
    const videoUrl =
      getVideoUrl(
        data
      );

    if (!videoUrl) {
      return {
        success:
          true,

        status:
          "failed",

        provider:
          ID,

        adapter:
          ID,

        error:
          "ChinaAPI selesai tetapi URL video tidak ditemukan.",

        errorCode:
          "missing_video_url"
      };
    }

    return {
      success:
        true,

      status:
        "completed",

      provider:
        ID,

      adapter:
        ID,

      videoUrl,

      model:
        data?.model ||
        data?.data?.model ||
        data?.properties?.origin_model_name ||
        MODEL_ID
    };
  }


  // ==========================================================
  // PROCESSING
  // ==========================================================

  return {
    success:
      true,

    status:
      "processing",

    provider:
      ID,

    adapter:
      ID
  };
}


// ============================================================
// CREATE VIDEO
// ============================================================

export async function createVideo(
  options = {},
  env = {}
) {
  return generate(
    options,
    {
      api_key:
        env?.CHINAAPI_KEY ||
        ""
    },
    env
  );
}


// ============================================================
// GET VIDEO STATUS
// ============================================================

export async function getVideoStatus(
  taskId,
  env = {}
) {
  return status(
    taskId,
    {
      api_key:
        env?.CHINAAPI_KEY ||
        ""
    },
    env
  );
}


// ============================================================
// WAIT FOR VIDEO
// ============================================================

export async function waitForVideo(
  taskId,
  env = {},
  options = {}
) {
  const pollInterval =
    Number(
      options?.pollInterval ||
      5000
    );

  const timeout =
    Number(
      options?.timeout ||
      30 * 60 * 1000
    );

  const startedAt =
    Date.now();

  while (true) {
    if (
      Date.now() -
        startedAt >=
      timeout
    ) {
      throw providerError(
        "ChinaAPI video generation timed out.",
        504,
        "timeout"
      );
    }

    const result =
      await getVideoStatus(
        taskId,
        env
      );

    if (
      result?.status ===
      "completed"
    ) {
      return result;
    }

    if (
      result?.status ===
      "failed"
    ) {
      throw providerError(
        result?.error ||
          "ChinaAPI video generation failed.",
        502,
        result?.errorCode ||
          "provider_failed"
      );
    }

    await new Promise(
      resolve =>
        setTimeout(
          resolve,
          pollInterval
        )
    );
  }
}


// ============================================================
// MODELS
// ============================================================

export function getModels() {
  return [
    {
      id:
        MODEL_ID,

      name:
        "Agnes Video 2.5 Flash"
    }
  ];
}


// ============================================================
// PROVIDER
// ============================================================

export const provider = {
  id:
    ID,

  name:
    NAME,

  type:
    "video",

  models:
    getModels(),

  capabilities:
    CAPABILITIES,

  info,

  generate,

  status,

  createVideo,

  getVideoStatus,

  waitForVideo,

  getModels
};


export default provider;
