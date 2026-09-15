// ============================================================
// GEN-Z.AI - CHINAAPI PROVIDER ADAPTER
// ============================================================

import {
  getModel,
  listModels,
  getModelsInfo,
  getCapabilities,
  validateModel,
  buildPayload
} from "./chinaapi/index.js";

import {
  sbStorageEnsurePublicBucket,
  sbStorageUpload
} from "../../lib/supabase.js";

const CHINAAPI_BASE_URL =
  "https://api.chinaapi.ai/v1";

const ID =
  "chinaapi";

const NAME =
  "ChinaAPI";

const REFERENCE_BUCKET =
  "reference-media";

// ============================================================
// CAPABILITIES
// ============================================================

function buildCapabilities() {
  /*
   * getModelsInfo() mengembalikan ARRAY OBJECT MODEL.
   *
   * Contoh:
   * [
   *   {
   *     id: "agnes-video-2.5-flash",
   *     name: "Agnes Video 2.5 Flash"
   *   },
   *   ...
   * ]
   *
   * Frontend membutuhkan capabilities.models berupa
   * ARRAY STRING ID MODEL, bukan object.
   *
   * Karena itu metadata dan daftar ID dipisahkan.
   */

  const modelInfo =
    getModelsInfo();

  const models =
    Array.isArray(
      modelInfo
    )
      ? modelInfo
          .map(
            model =>
              String(
                model?.id ||
                model?.model ||
                model?.modelId ||
                ""
              ).trim()
          )
          .filter(
            Boolean
          )
      : [];

  const durations =
    new Set();

  const aspects =
    new Set();

  const resolutions =
    new Set();

  /*
   * Gunakan modelInfo untuk membaca metadata.
   * Jangan gunakan models karena models sekarang
   * sengaja berisi string ID.
   */

  if (
    Array.isArray(
      modelInfo
    )
  ) {
    modelInfo.forEach(
      model => {
        const info =
          model?.info ||
          model?.config ||
          model ||
          {};

        const capabilities =
          info?.capabilities ||
          model?.capabilities ||
          {};

        const directDurations =
          info?.durations ||
          model?.durations ||
          capabilities?.durations ||
          [];

        const directAspects =
          info?.aspects ||
          model?.aspects ||
          capabilities?.aspects ||
          [];

        const directResolutions =
          info?.resolutions ||
          model?.resolutions ||
          capabilities?.resolutions ||
          [];

        if (
          Array.isArray(
            directDurations
          )
        ) {
          directDurations.forEach(
            value => {
              const number =
                Number(
                  value
                );

              if (
                Number.isFinite(
                  number
                )
              ) {
                durations.add(
                  number
                );
              }
            }
          );
        }

        if (
          Array.isArray(
            directAspects
          )
        ) {
          directAspects.forEach(
            value => {
              const aspect =
                String(
                  value ||
                  ""
                ).trim();

              if (
                aspect
              ) {
                aspects.add(
                  aspect
                );
              }
            }
          );
        }

        if (
          Array.isArray(
            directResolutions
          )
        ) {
          directResolutions.forEach(
            value => {
              const resolution =
                String(
                  value ||
                  ""
                ).trim();

              if (
                resolution
              ) {
                resolutions.add(
                  resolution
                );
              }
            }
          );
        }
      }
    );
  }

  return {
    /*
     * PENTING:
     * models harus berupa string ID.
     */
    models,

    durations:
      Array.from(
        durations
      )
        .filter(
          Number.isFinite
        )
        .sort(
          (a, b) =>
            a - b
        ),

    aspects:
      Array.from(
        aspects
      ),

    resolutions:
      Array.from(
        resolutions
      ),

    constraints:
      getCapabilities()
  };
}

const CAPABILITIES =
  buildCapabilities();

// ============================================================
// ERROR
// ============================================================

function providerError(
  message,
  status = 400,
  code = ""
) {
  const error =
    new Error(
      String(
        message ||
        "ChinaAPI provider error."
      )
    );

  error.status =
    Number(
      status
    ) || 400;

  error.provider =
    ID;

  error.adapter =
    ID;

  if (
    code
  ) {
    error.code =
      String(
        code
      );
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
      provider?.apiKey ||
      env?.CHINAAPI_KEY ||
      ""
    ).trim();

  if (
    !key
  ) {
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
  const responseText =
    await response.text();

  if (
    !responseText
  ) {
    return {};
  }

  try {
    return JSON.parse(
      responseText
    );
  } catch {
    return {
      raw:
        responseText
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
    data?.code,

    data?.data?.error,
    data?.data?.message,
    data?.data?.fail_reason,

    data?.details?.message,

    data?.metadata?.error,
    data?.metadata?.message
  ];

  for (
    const value of candidates
  ) {
    if (
      typeof value ===
        "string" &&
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
    return data.error.message.trim();
  }

  if (
    data?.data?.error &&
    typeof data.data.error.message ===
      "string"
  ) {
    return data.data.error.message.trim();
  }

  if (
    data?.details &&
    typeof data.details.message ===
      "string"
  ) {
    return data.details.message.trim();
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

  return (
    fallback ||
    "ChinaAPI provider error."
  );
}

// ============================================================
// STATUS NORMALIZER
// ============================================================

function normalizeStatus(
  value
) {
  return String(
    value || ""
  )
    .trim()
    .toLowerCase()
    .replace(
      /[\s-]+/g,
      "_"
    );
}

function isCompletedStatus(
  value
) {
  return [
    "completed",
    "complete",
    "succeeded",
    "success",
    "successful",
    "finished",
    "done"
  ].includes(
    normalizeStatus(
      value
    )
  );
}

function isFailedStatus(
  value
) {
  return [
    "failed",
    "failure",
    "error",
    "cancelled",
    "canceled",
    "rejected"
  ].includes(
    normalizeStatus(
      value
    )
  );
}

function isProcessingStatus(
  value
) {
  return [
    "processing",
    "in_progress",
    "queued",
    "queue",
    "pending",
    "not_start",
    "not_started",
    "created",
    "submitted",
    "starting",
    "running"
  ].includes(
    normalizeStatus(
      value
    )
  );
}

// ============================================================
// PROGRESS
// ============================================================

function normalizeProgress(
  value
) {
  if (
    typeof value ===
      "number" &&
    Number.isFinite(
      value
    )
  ) {
    return Math.max(
      0,
      Math.min(
        100,
        value
      )
    );
  }

  const text =
    String(
      value ??
      ""
    ).trim();

  if (
    !text
  ) {
    return 0;
  }

  const number =
    Number(
      text.replace(
        "%",
        ""
      )
    );

  if (
    !Number.isFinite(
      number
    )
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      100,
      number
    )
  );
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

    data?.metadata?.url,
    data?.metadata?.video_url,
    data?.metadata?.result_url,

    data?.result?.result_url,
    data?.result?.video_url,
    data?.result?.url,

    data?.output?.result_url,
    data?.output?.video_url,
    data?.output?.url,

    data?.data?.result_url,
    data?.data?.video_url,
    data?.data?.url,

    data?.data?.metadata?.url,
    data?.data?.metadata?.video_url,
    data?.data?.metadata?.result_url,

    data?.data?.result?.result_url,
    data?.data?.result?.video_url,
    data?.data?.result?.url,

    data?.data?.output?.result_url,
    data?.data?.output?.video_url,
    data?.data?.output?.url
  ];

  for (
    const value of candidates
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
  const candidates = [
    data?.video_id,
    data?.videoId,

    data?.task_id,
    data?.taskId,

    data?.id,

    data?.data?.video_id,
    data?.data?.videoId,

    data?.data?.task_id,
    data?.data?.taskId,

    data?.data?.id
  ];

  for (
    const value of candidates
  ) {
    if (
      value !== undefined &&
      value !== null &&
      String(
        value
      ).trim()
    ) {
      return String(
        value
      ).trim();
    }
  }

  return "";
}

// ============================================================
// MODEL RESOLUTION
// ============================================================

function resolveModel(
  modelId
) {
  const id =
    String(
      modelId || ""
    ).trim();

  if (
    !id
  ) {
    const models =
      listModels();

    if (
      Array.isArray(
        models
      ) &&
      models.length
    ) {
      return getModel(
        models[0]
      );
    }

    return null;
  }

  return getModel(
    id
  );
}

// ============================================================
// MODEL ENDPOINT
// ============================================================

function getModelEndpoint(
  modelId
) {
  const id =
    String(
      modelId || ""
    ).trim();

  /*
   * Gunakan konfigurasi API dari model registry
   * jika tersedia.
   */

  const model =
    resolveModel(
      id
    );

  const api =
    model?.api ||
    model?.config?.api ||
    model?.info?.api ||
    {};

  const configuredGenerate =
    String(
      api?.endpoint ||
      api?.generate ||
      api?.generateEndpoint ||
      ""
    ).trim();

  const configuredStatus =
    String(
      api?.statusEndpoint ||
      api?.status ||
      api?.status_endpoint ||
      ""
    ).trim();

  if (
    configuredGenerate
  ) {
    return {
      generate:
        configuredGenerate.startsWith(
          "/"
        )
          ? configuredGenerate
          : `/${configuredGenerate}`,

      status:
        configuredStatus
          ? (
              configuredStatus.startsWith(
                "/"
              )
                ? configuredStatus
                : `/${configuredStatus}`
            )
          : configuredGenerate.startsWith(
              "/"
            )
              ? configuredGenerate
              : `/${configuredGenerate}`
    };
  }

  /*
   * Fallback kompatibilitas untuk model lama.
   */

  if (
    id ===
    "agnes-video-2.5-flash"
  ) {
    return {
      generate:
        "/videos",

      status:
        "/videos"
    };
  }

  if (
    id ===
    "doubao-seedance-2-0-mini-260615"
  ) {
    return {
      generate:
        "/video/generations",

      status:
        "/video/generations"
    };
  }

  return {
    generate:
      "/video/generations",

    status:
      "/video/generations"
  };
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

  if (
    typeof body?.imageUrl ===
      "string" &&
    body.imageUrl.trim()
  ) {
    const imageUrl =
      body.imageUrl.trim();

    if (
      !images.includes(
        imageUrl
      )
    ) {
      images.unshift(
        imageUrl
      );
    }
  }

  return images.filter(
    Boolean
  );
}

// ============================================================
// REFERENCE VIDEOS
// ============================================================

function getReferenceVideos(
  body = {}
) {
  const videos = [];

  if (
    Array.isArray(
      body?.videos
    )
  ) {
    body.videos.forEach(
      video => {
        if (
          typeof video ===
            "string" &&
          video.trim()
        ) {
          videos.push(
            video.trim()
          );
        }
      }
    );
  }

  if (
    Array.isArray(
      body?.videoUrls
    )
  ) {
    body.videoUrls.forEach(
      video => {
        if (
          typeof video ===
            "string" &&
          video.trim() &&
          !videos.includes(
            video.trim()
          )
        ) {
          videos.push(
            video.trim()
          );
        }
      }
    );
  }

  if (
    typeof body?.videoUrl ===
      "string" &&
    body.videoUrl.trim() &&
    !videos.includes(
      body.videoUrl.trim()
    )
  ) {
    videos.push(
      body.videoUrl.trim()
    );
  }

  return videos.filter(
    Boolean
  );
}

// ============================================================
// DATA URL -> BINARY
// ============================================================

function parseDataUrl(
  value
) {
  const dataUrl =
    String(
      value || ""
    ).trim();

  const match =
    dataUrl.match(
      /^data:([^;,]+)?(?:;charset=[^;,]+)?;base64,(.+)$/i
    );

  if (
    !match
  ) {
    return null;
  }

  const mimeType =
    String(
      match[1] ||
      "application/octet-stream"
    ).toLowerCase();

  const base64 =
    String(
      match[2] ||
      ""
    ).trim();

  if (
    !base64
  ) {
    return null;
  }

  let binary;

  try {
    binary =
      atob(
        base64
      );
  } catch {
    throw providerError(
      "Reference image Base64 tidak valid.",
      400,
      "invalid_reference_image"
    );
  }

  const bytes =
    new Uint8Array(
      binary.length
    );

  for (
    let index = 0;
    index < binary.length;
    index += 1
  ) {
    bytes[index] =
      binary.charCodeAt(
        index
      );
  }

  return {
    mimeType,
    bytes
  };
}

// ============================================================
// FILE EXTENSION
// ============================================================

function getImageExtension(
  mimeType
) {
  const mime =
    String(
      mimeType || ""
    ).toLowerCase();

  const map = {
    "image/jpeg":
      "jpg",

    "image/jpg":
      "jpg",

    "image/png":
      "png",

    "image/webp":
      "webp",

    "image/gif":
      "gif",

    "image/bmp":
      "bmp",

    "image/avif":
      "avif"
  };

  return (
    map[mime] ||
    "bin"
  );
}

// ============================================================
// REFERENCE IMAGE UPLOAD
// ============================================================

async function prepareAgnesReferenceImages(
  images,
  env
) {
  const normalizedImages =
    Array.isArray(
      images
    )
      ? images.filter(
          value =>
            typeof value ===
              "string" &&
            value.trim()
        )
      : [];

  if (
    !normalizedImages.length
  ) {
    return [];
  }

  await sbStorageEnsurePublicBucket(
    REFERENCE_BUCKET,
    env
  );

  const result = [];

  for (
    let index = 0;
    index <
      normalizedImages.length;
    index += 1
  ) {
    const image =
      normalizedImages[
        index
      ].trim();

    if (
      /^https:\/\//i.test(
        image
      )
    ) {
      result.push(
        image
      );

      continue;
    }

    if (
      !/^data:/i.test(
        image
      )
    ) {
      throw providerError(
        "Reference image Agnes harus berupa URL HTTPS atau Data URL.",
        400,
        "invalid_reference_image"
      );
    }

    const parsed =
      parseDataUrl(
        image
      );

    if (
      !parsed
    ) {
      throw providerError(
        "Reference image Agnes tidak dapat diproses.",
        400,
        "invalid_reference_image"
      );
    }

    const extension =
      getImageExtension(
        parsed.mimeType
      );

    const objectPath =
      `agnes/${crypto.randomUUID()}-${index}.${extension}`;

    let uploaded;

    try {
      uploaded =
        await sbStorageUpload(
          REFERENCE_BUCKET,
          objectPath,
          parsed.bytes,
          parsed.mimeType,
          env
        );
    } catch (
      error
    ) {
      throw providerError(
        error?.message ||
        "Gagal mengupload reference image ke storage.",
        502,
        "reference_upload_error"
      );
    }

    if (
      !uploaded?.publicUrl
    ) {
      throw providerError(
        "Supabase tidak mengembalikan URL reference image.",
        502,
        "reference_upload_error"
      );
    }

    result.push(
      uploaded.publicUrl
    );
  }

  return result;
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
      CAPABILITIES,

    /*
     * Tetap kembalikan metadata lengkap di sini.
     * Yang dipakai frontend untuk dropdown adalah
     * capabilities.models yang sudah berupa ID string.
     */
    models:
      getModelsInfo()
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

  if (
    !prompt
  ) {
    throw providerError(
      "Prompt ChinaAPI kosong.",
      400,
      "invalid_prompt"
    );
  }

  const modelId =
    String(
      body?.model || ""
    ).trim();

  const model =
    resolveModel(
      modelId
    );

  if (
    !model
  ) {
    throw providerError(
      "Model ChinaAPI tidak valid.",
      400,
      "invalid_model"
    );
  }

  const selectedModelId =
    String(
      model?.id ||
      model?.model ||
      model?.modelId ||
      modelId
    ).trim();

  if (
    !selectedModelId
  ) {
    throw providerError(
      "Model ChinaAPI tidak memiliki ID yang valid.",
      400,
      "invalid_model"
    );
  }

  const duration =
    Number(
      body?.duration ??
      5
    );

  const aspectRatio =
    String(
      body?.aspectRatio ||
      body?.aspect ||
      body?.ratio ||
      "16:9"
    ).trim();

  const resolution =
    String(
      body?.resolution ||
      "720P"
    ).trim();

  let referenceImages =
    getReferenceImages(
      body
    );

  const referenceVideos =
    getReferenceVideos(
      body
    );

  if (
    selectedModelId ===
      "agnes-video-2.5-flash" &&
    referenceImages.length > 0
  ) {
    referenceImages =
      await prepareAgnesReferenceImages(
        referenceImages,
        env
      );
  }

  const validation =
    validateModel(
      selectedModelId,
      {
        ...body,

        model:
          selectedModelId,

        prompt,

        duration,

        aspectRatio,

        resolution,

        images:
          referenceImages,

        videos:
          referenceVideos,

        referenceImages:
          referenceImages,

        referenceVideos:
          referenceVideos
      }
    );

  if (
    validation === false
  ) {
    throw providerError(
      "Parameter video ChinaAPI tidak sesuai dengan kemampuan model.",
      400,
      "invalid_model_parameters"
    );
  }

  if (
    validation &&
    typeof validation ===
      "object" &&
    validation.valid ===
      false
  ) {
    const validationMessage =
      Array.isArray(
        validation.errors
      )
        ? validation.errors.join(
            " "
          )
        : (
            validation.message ||
            validation.error ||
            "Parameter video ChinaAPI tidak valid."
          );

    throw providerError(
      validationMessage,
      400,
      validation.code ||
        "invalid_model_parameters"
    );
  }

  let payload;

  try {
    payload =
      buildPayload(
        selectedModelId,
        {
          ...body,

          model:
            selectedModelId,

          prompt,

          duration,

          aspectRatio,

          resolution,

          images:
            referenceImages,

          videos:
            referenceVideos,

          referenceImages:
            referenceImages,

          referenceVideos:
            referenceVideos
        }
      );
  } catch (
    error
  ) {
    throw providerError(
      error?.message ||
      "Gagal membentuk payload ChinaAPI.",
      400,
      "payload_error"
    );
  }

  if (
    !payload ||
    typeof payload !==
      "object" ||
    Array.isArray(
      payload
    )
  ) {
    throw providerError(
      "Payload ChinaAPI tidak valid.",
      400,
      "invalid_payload"
    );
  }

  /*
   * Pastikan field model selalu menggunakan
   * Provider Model ID.
   */

  payload.model =
    selectedModelId;

  /*
   * Pastikan prompt selalu ada.
   */

  if (
    payload.prompt ===
      undefined
  ) {
    payload.prompt =
      prompt;
  }

  const endpoint =
    getModelEndpoint(
      selectedModelId
    );

  let response;

  try {
    response =
      await fetch(
        `${CHINAAPI_BASE_URL}${endpoint.generate}`,
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
  } catch (
    error
  ) {
    throw providerError(
      error?.message ||
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
        `ChinaAPI gagal membuat video. HTTP ${response.status}.`
      ),
      response.status,
      data?.error?.code ||
        data?.data?.error?.code ||
        data?.code ||
        "provider_error"
    );
  }

  const externalId =
    getExternalId(
      data
    );

  if (
    !externalId
  ) {
    throw providerError(
      "ChinaAPI tidak mengembalikan task ID/video ID.",
      502,
      "missing_task_id"
    );
  }

  const initialStatus =
    normalizeStatus(
      data?.status ||
      data?.state ||
      data?.data?.status ||
      data?.data?.state
    );

  const initialVideoUrl =
    getVideoUrl(
      data
    );

  if (
    isCompletedStatus(
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

      model:
        selectedModelId,

      duration,

      aspectRatio,

      resolution,

      endpoint:
        endpoint.generate,

      referenceImageCount:
        referenceImages.length,

      referenceVideoCount:
        referenceVideos.length
    };
  }

  if (
    isFailedStatus(
      initialStatus
    )
  ) {
    throw providerError(
      getErrorMessage(
        data,
        "ChinaAPI gagal membuat video."
      ),
      502,
      "provider_failed"
    );
  }

  return {
    externalId,

    provider:
      ID,

    adapter:
      ID,

    status:
      "processing",

    model:
      selectedModelId,

    duration,

    aspectRatio,

    resolution,

    endpoint:
      endpoint.generate,

    referenceImageCount:
      referenceImages.length,

    referenceVideoCount:
      referenceVideos.length
  };
}

// ============================================================
// STATUS REQUEST
// ============================================================

async function requestStatus(
  url,
  apiKey
) {
  let response;

  try {
    response =
      await fetch(
        url,
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
  } catch (
    error
  ) {
    throw providerError(
      error?.message ||
      "Tidak dapat terhubung ke server ChinaAPI.",
      502,
      "connection_error"
    );
  }

  const data =
    await safeJson(
      response
    );

  return {
    response,
    data
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

  if (
    !taskId
  ) {
    throw providerError(
      "Task ID ChinaAPI tidak valid.",
      400,
      "invalid_task_id"
    );
  }

  /*
   * Coba endpoint OpenAI Videos terlebih dahulu.
   */

  let result =
    await requestStatus(
      `${CHINAAPI_BASE_URL}/videos/${encodeURIComponent(
        taskId
      )}`,
      apiKey
    );

  let response =
    result.response;

  let data =
    result.data;

  /*
   * Fallback ke endpoint ChinaAPI legacy.
   */

  if (
    !response.ok &&
    (
      response.status ===
        404 ||
      response.status ===
        405
    )
  ) {
    result =
      await requestStatus(
        `${CHINAAPI_BASE_URL}/video/generations/${encodeURIComponent(
          taskId
        )}`,
        apiKey
      );

    response =
      result.response;

    data =
      result.data;
  }

  if (
    !response.ok
  ) {
    throw providerError(
      getErrorMessage(
        data,
        `ChinaAPI gagal mengambil status video. HTTP ${response.status}.`
      ),
      response.status,
      data?.error?.code ||
        data?.data?.error?.code ||
        data?.code ||
        "status_error"
    );
  }

  const currentStatus =
    normalizeStatus(
      data?.status ||
      data?.state ||
      data?.data?.status ||
      data?.data?.state
    );

  if (
    isFailedStatus(
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
          data?.code ||
          "provider_failed"
    };
  }

  if (
    isCompletedStatus(
      currentStatus
    )
  ) {
    const videoUrl =
      getVideoUrl(
        data
      );

    if (
      !videoUrl
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
        data?.data?.properties?.origin_model_name ||
        "",

      progress:
        normalizeProgress(
          data?.progress ??
            data?.data?.progress ??
            100
        )
    };
  }

  if (
    isProcessingStatus(
      currentStatus
    )
  ) {
    return {
      success:
        true,

      status:
        "processing",

      provider:
        ID,

      adapter:
        ID,

      progress:
        normalizeProgress(
          data?.progress ??
            data?.data?.progress ??
            0
        ),

      providerStatus:
        currentStatus
    };
  }

  return {
    success:
      true,

    status:
      "processing",

    provider:
      ID,

    adapter:
      ID,

    progress:
      normalizeProgress(
        data?.progress ??
          data?.data?.progress ??
          0
      ),

    providerStatus:
      currentStatus ||
      "unknown"
  };
}

// ============================================================
// FETCH VIDEO
// ============================================================

export async function fetchVideo(
  target,
  provider = {},
  env = {},
  options = {}
) {
  const videoUrl =
    String(
      target || ""
    ).trim();

  if (
    !videoUrl
  ) {
    throw providerError(
      "URL video ChinaAPI tidak valid.",
      400,
      "invalid_video_url"
    );
  }

  if (
    !/^https:\/\//i.test(
      videoUrl
    )
  ) {
    throw providerError(
      "URL video ChinaAPI harus menggunakan HTTPS.",
      400,
      "invalid_video_url"
    );
  }

  const range =
    String(
      options?.range ||
      ""
    ).trim();

  if (
    range &&
    !/^bytes=\d*-\d*$/.test(
      range
    )
  ) {
    throw providerError(
      "Range video ChinaAPI tidak valid.",
      400,
      "invalid_video_range"
    );
  }

  if (
    range ===
      "bytes=-"
  ) {
    throw providerError(
      "Range video ChinaAPI tidak valid.",
      400,
      "invalid_video_range"
    );
  }

  const requestHeaders = {};

  if (
    range
  ) {
    requestHeaders.Range =
      range;
  }

  let response;

  try {
    response =
      await fetch(
        videoUrl,
        {
          method:
            "GET",

          redirect:
            "follow",

          headers:
            requestHeaders
        }
      );
  } catch (
    error
  ) {
    throw providerError(
      error?.message ||
      "Gagal mengambil file video dari ChinaAPI.",
      502,
      "video_fetch_error"
    );
  }

  if (
    !response.ok
  ) {
    throw providerError(
      `Gagal mengambil video ChinaAPI. HTTP ${response.status}.`,
      502,
      "video_fetch_error"
    );
  }

  return response;
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
    Math.max(
      1000,
      Number(
        options?.pollInterval ||
          5000
      )
    );

  const timeout =
    Math.max(
      pollInterval,
      Number(
        options?.timeout ||
          30 * 60 * 1000
      )
    );

  const startedAt =
    Date.now();

  while (
    true
  ) {
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
  return getModelsInfo();
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

  fetchVideo,

  createVideo,

  getVideoStatus,

  waitForVideo,

  getModels
};

export default provider;
