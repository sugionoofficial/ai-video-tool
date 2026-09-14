// ============================================================
// GEN-Z.AI - CHINAAPI PROVIDER ADAPTER
// ============================================================

const CHINAAPI_BASE_URL = "https://api.chinaapi.ai/v1";
const ID = "chinaapi";
const NAME = "ChinaAPI";
const MODEL_ID = "agnes-video-2.5-flash";

const CAPABILITIES = {
  models: [MODEL_ID],
  durations: [4, 5, 6, 7, 8, 9, 10, 11, 12],
  aspects: ["16:9", "9:16", "4:3", "3:4", "1:1", "21:9"],
  resolutions: ["720P"],
  constraints: {
    [MODEL_ID]: {
      imageReferenceSupported: false,
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
      }
    }
  }
};

function providerError(message, status = 400, code = "") {
  const error = new Error(String(message || "ChinaAPI provider error."));
  error.status = Number(status) || 400;
  error.provider = ID;
  error.adapter = ID;
  if (code) error.code = String(code);
  return error;
}

function getApiKey(provider = {}, env = {}) {
  const key = String(
    provider?.api_key || env?.CHINAAPI_KEY || ""
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

async function safeJson(response) {
  const text = await response.text();

  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function getErrorMessage(data, fallback) {
  if (typeof data?.error === "string") {
    return data.error;
  }

  if (data?.error && typeof data.error.message === "string") {
    return data.error.message;
  }

  if (data?.error && typeof data.error.code === "string") {
    return data.error.code;
  }

  if (typeof data?.message === "string") {
    return data.message;
  }

  if (typeof data?.raw === "string") {
    return data.raw.slice(0, 1000);
  }

  return fallback;
}

function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase();
}

function getVideoUrl(data) {
  const candidates = [
    data?.metadata?.url,
    data?.metadata?.video_url,
    data?.url,
    data?.video_url,
    data?.output?.url,
    data?.output?.video_url
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

export function info() {
  return {
    id: ID,
    name: NAME,
    supported: true,
    capabilities: CAPABILITIES
  };
}

export async function generate(body = {}, provider = {}, env = {}) {
  const apiKey = getApiKey(provider, env);

  const prompt = String(body?.prompt || "").trim();

  if (!prompt) {
    throw providerError(
      "Prompt ChinaAPI kosong.",
      400,
      "invalid_prompt"
    );
  }

  const model = String(body?.model || MODEL_ID).trim();

  if (!CAPABILITIES.models.includes(model)) {
    throw providerError(
      "Model ChinaAPI tidak valid.",
      400,
      "invalid_model"
    );
  }

  const duration = Number(body?.duration ?? 5);

  if (
    !Number.isFinite(duration) ||
    !CAPABILITIES.durations.includes(duration)
  ) {
    throw providerError(
      "Durasi ChinaAPI harus antara 4 sampai 12 detik.",
      400,
      "invalid_duration"
    );
  }

  const aspectRatio = String(
    body?.aspectRatio ||
    body?.aspect ||
    body?.ratio ||
    "16:9"
  ).trim();

  if (!CAPABILITIES.aspects.includes(aspectRatio)) {
    throw providerError(
      "Aspect ratio ChinaAPI tidak valid.",
      400,
      "invalid_aspect_ratio"
    );
  }

  const resolution = String(
    body?.resolution || "720P"
  ).trim();

  if (resolution !== "720P") {
    throw providerError(
      "Agnes Video 2.5 Flash hanya mendukung 720P.",
      400,
      "invalid_resolution"
    );
  }

  if (body?.imageData) {
    throw providerError(
      "Image reference belum didukung oleh adapter ChinaAPI.",
      400,
      "image_reference_not_supported"
    );
  }

  const payload = {
    model,
    prompt,
    mode: "text",
    seconds: String(duration),
    size: "720P",
    aspect_ratio: aspectRatio
  };

  let response;

  try {
    response = await fetch(
      `${CHINAAPI_BASE_URL}/videos`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(payload)
      }
    );
  } catch {
    throw providerError(
      "Tidak dapat terhubung ke server ChinaAPI.",
      502,
      "connection_error"
    );
  }

  const data = await safeJson(response);

  if (!response.ok) {
    throw providerError(
      getErrorMessage(
        data,
        "ChinaAPI gagal membuat video."
      ),
      response.status,
      data?.error?.code || "provider_error"
    );
  }

  const externalId =
    data?.id ||
    data?.task_id ||
    data?.taskId ||
    data?.video_id;

  if (
    externalId === undefined ||
    externalId === null ||
    String(externalId).trim() === ""
  ) {
    throw providerError(
      "ChinaAPI tidak mengembalikan task ID.",
      502,
      "missing_task_id"
    );
  }

  return {
    externalId: String(externalId),
    provider: ID,
    adapter: ID,
    status: "processing",
    model,
    duration,
    aspectRatio,
    resolution
  };
}

export async function status(
  externalId,
  provider = {},
  env = {}
) {
  const apiKey = getApiKey(provider, env);

  const taskId = String(externalId || "").trim();

  if (!taskId) {
    throw providerError(
      "Task ID ChinaAPI tidak valid.",
      400,
      "invalid_task_id"
    );
  }

  let response;

  try {
    response = await fetch(
      `${CHINAAPI_BASE_URL}/videos/${encodeURIComponent(taskId)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json"
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

  const data = await safeJson(response);

  if (!response.ok) {
    throw providerError(
      getErrorMessage(
        data,
        "ChinaAPI gagal mengambil status video."
      ),
      response.status,
      data?.error?.code || "status_error"
    );
  }

  const currentStatus = normalizeStatus(
    data?.status || data?.state
  );

  if (
    [
      "failed",
      "failure",
      "error",
      "cancelled",
      "canceled"
    ].includes(currentStatus)
  ) {
    return {
      success: true,
      status: "failed",
      provider: ID,
      adapter: ID,
      error: getErrorMessage(
        data,
        "ChinaAPI video generation gagal."
      ),
      errorCode:
        data?.error?.code || "provider_failed"
    };
  }

  if (
    [
      "completed",
      "complete",
      "succeeded",
      "success",
      "finished"
    ].includes(currentStatus)
  ) {
    const videoUrl = getVideoUrl(data);

    if (!videoUrl) {
      return {
        success: true,
        status: "failed",
        provider: ID,
        adapter: ID,
        error:
          "ChinaAPI selesai tetapi URL video tidak ditemukan.",
        errorCode: "missing_video_url"
      };
    }

    return {
      success: true,
      status: "completed",
      provider: ID,
      adapter: ID,
      videoUrl,
      model: data?.model || MODEL_ID
    };
  }

  return {
    success: true,
    status: "processing",
    provider: ID,
    adapter: ID
  };
}

export async function createVideo(
  options = {},
  env = {}
) {
  return generate(
    options,
    {
      api_key: env?.CHINAAPI_KEY || ""
    },
    env
  );
}

export async function getVideoStatus(
  taskId,
  env = {}
) {
  return status(
    taskId,
    {
      api_key: env?.CHINAAPI_KEY || ""
    },
    env
  );
}

export async function waitForVideo(
  taskId,
  env = {},
  options = {}
) {
  const pollInterval = Number(
    options?.pollInterval || 5000
  );

  const timeout = Number(
    options?.timeout || 30 * 60 * 1000
  );

  const startedAt = Date.now();

  while (true) {
    if (Date.now() - startedAt >= timeout) {
      throw providerError(
        "ChinaAPI video generation timed out.",
        504,
        "timeout"
      );
    }

    const result = await getVideoStatus(
      taskId,
      env
    );

    if (result?.status === "completed") {
      return result;
    }

    if (result?.status === "failed") {
      throw providerError(
        result?.error ||
          "ChinaAPI video generation failed.",
        502,
        result?.errorCode || "provider_failed"
      );
    }

    await new Promise(resolve =>
      setTimeout(resolve, pollInterval)
    );
  }
}

export function getModels() {
  return [
    {
      id: MODEL_ID,
      name: "Agnes Video 2.5 Flash"
    }
  ];
}

export const provider = {
  id: ID,
  name: NAME,
  type: "video",
  models: getModels(),
  capabilities: CAPABILITIES,
  info,
  generate,
  status,
  createVideo,
  getVideoStatus,
  waitForVideo,
  getModels
};

export default provider;
