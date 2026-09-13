// ============================================================
// GEN-Z.AI
// LUMA PROVIDER ADAPTER
// ============================================================

const ID = "luma";
const NAME = "Luma";

const MODEL_RULES = {
  "ray-2": {
    imageReferenceSupported: false
  },

  "ray-flash-2": {
    imageReferenceSupported: false
  }
};

const CAPABILITIES = {
  models: [
    "ray-2",
    "ray-flash-2"
  ],

  durations: [
    "5s",
    "9s"
  ],

  aspects: [
    "1:1",
    "16:9",
    "9:16",
    "4:3",
    "3:4",
    "21:9",
    "9:21"
  ],

  resolutions: [
    "720p",
    "1080p",
    "4k"
  ],

  constraints: MODEL_RULES
};

// ------------------------------------------------------------
// ERROR
// ------------------------------------------------------------

function providerError(message, status = 400) {
  const error = new Error(
    String(message || "Luma provider error.")
  );

  error.status = Number(status) || 400;
  error.provider = ID;

  return error;
}

// ------------------------------------------------------------
// SAFE JSON
// ------------------------------------------------------------

async function safeJson(response) {
  const text = await response.text();

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

// ------------------------------------------------------------
// API ERROR NORMALIZATION
// ------------------------------------------------------------

function apiError(data, fallback) {
  if (!data || typeof data !== "object") {
    return fallback;
  }

  if (typeof data.error === "string") {
    return data.error;
  }

  if (
    data.error &&
    typeof data.error === "object" &&
    typeof data.error.message === "string"
  ) {
    return data.error.message;
  }

  if (typeof data.message === "string") {
    return data.message;
  }

  if (typeof data.failure_reason === "string") {
    return data.failure_reason;
  }

  if (typeof data.raw === "string") {
    return data.raw.slice(0, 500);
  }

  return fallback;
}

// ------------------------------------------------------------
// CAPABILITIES
// ------------------------------------------------------------

export function info() {
  return {
    id: ID,
    name: NAME,
    supported: true,
    capabilities: CAPABILITIES
  };
}

// ------------------------------------------------------------
// GENERATE
// ------------------------------------------------------------

export async function generate(body, provider) {
  const key = String(
    provider?.api_key || ""
  ).trim();

  if (!key) {
    throw providerError(
      "API key Luma belum dikonfigurasi.",
      400
    );
  }

  // ----------------------------------------------------------
  // MODEL
  // ----------------------------------------------------------

  const model = String(
    body?.model || "ray-2"
  ).trim();

  if (!CAPABILITIES.models.includes(model)) {
    throw providerError(
      "Model Luma tidak valid.",
      400
    );
  }

  // ----------------------------------------------------------
  // MODEL RULE
  // ----------------------------------------------------------

  const modelRule =
    MODEL_RULES[model] || null;

  if (!modelRule) {
    throw providerError(
      "Konfigurasi model Luma tidak ditemukan.",
      400
    );
  }

  // ----------------------------------------------------------
  // IMAGE REFERENCE
  //
  // Kedua model Luma saat ini secara eksplisit
  // tidak menerima image reference dari konfigurasi
  // GEN-Z.AI ini.
  // ----------------------------------------------------------

  if (
    body?.imageData &&
    modelRule.imageReferenceSupported !== true
  ) {
    throw providerError(
      "Model Luma yang dipilih tidak mendukung image reference.",
      400
    );
  }

  // ----------------------------------------------------------
  // ASPECT RATIO
  // ----------------------------------------------------------

  const aspectRatio = String(
    body?.aspectRatio || "16:9"
  ).trim();

  if (!CAPABILITIES.aspects.includes(aspectRatio)) {
    throw providerError(
      "Aspect ratio Luma tidak valid.",
      400
    );
  }

  // ----------------------------------------------------------
  // DURATION
  // ----------------------------------------------------------

  const duration = String(
    body?.duration || "5s"
  ).trim();

  if (!CAPABILITIES.durations.includes(duration)) {
    throw providerError(
      "Durasi Luma harus 5s atau 9s.",
      400
    );
  }

  // ----------------------------------------------------------
  // RESOLUTION
  //
  // Luma API configuration saat ini tidak menggunakan
  // resolution secara langsung dalam payload.
  // Nilai tetap divalidasi untuk menjaga konsistensi
  // capability frontend/backend.
  // ----------------------------------------------------------

  const resolution = String(
    body?.resolution || "720p"
  ).trim().toLowerCase();

  if (!CAPABILITIES.resolutions.includes(resolution)) {
    throw providerError(
      "Resolusi Luma tidak valid.",
      400
    );
  }

  // ----------------------------------------------------------
  // PROMPT
  // ----------------------------------------------------------

  const prompt = String(
    body?.prompt || ""
  ).trim();

  if (!prompt) {
    throw providerError(
      "Prompt Luma kosong.",
      400
    );
  }

  // ----------------------------------------------------------
  // IMAGE REFERENCE
  //
  // Luma tidak menerima base64 mentah dari upload
  // GEN-Z.AI pada adapter ini.
  // ----------------------------------------------------------

  if (body?.imageData) {
    throw providerError(
      "Character reference Luma pada konfigurasi ini memerlukan public image URL. Gunakan Veo atau MiniMax untuk gambar lokal.",
      400
    );
  }

  // ----------------------------------------------------------
  // PAYLOAD
  // ----------------------------------------------------------

  const payload = {
    model,
    prompt,
    aspect_ratio: aspectRatio,
    duration
  };

  // ----------------------------------------------------------
  // REQUEST
  // ----------------------------------------------------------

  let response;

  try {
    response = await fetch(
      "https://api.lumalabs.ai/dream-machine/v1/generations/video",
      {
        method: "POST",

        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          Accept: "application/json"
        },

        body: JSON.stringify(payload)
      }
    );
  } catch {
    throw providerError(
      "Tidak dapat terhubung ke server Luma.",
      502
    );
  }

  const data = await safeJson(response);

  if (!response.ok) {
    throw providerError(
      apiError(
        data,
        `Luma error (${response.status}).`
      ),
      response.status >= 400 &&
      response.status < 600
        ? response.status
        : 502
    );
  }

  const externalId = String(
    data?.id || ""
  ).trim();

  if (!externalId) {
    throw providerError(
      "Luma tidak mengembalikan generation ID.",
      502
    );
  }

  return {
    externalId,
    provider: ID,
    status: "processing",
    model,
    duration,
    aspectRatio,
    resolution
  };
}

// ------------------------------------------------------------
// STATUS
// ------------------------------------------------------------

export async function status(
  externalId,
  provider
) {
  const key = String(
    provider?.api_key || ""
  ).trim();

  if (!key) {
    throw providerError(
      "API key Luma belum dikonfigurasi.",
      400
    );
  }

  const id = String(
    externalId || ""
  ).trim();

  if (!id) {
    throw providerError(
      "Generation ID Luma tidak valid.",
      400
    );
  }

  let response;

  try {
    response = await fetch(
      `https://api.lumalabs.ai/dream-machine/v1/generations/${encodeURIComponent(id)}`,
      {
        method: "GET",

        headers: {
          Authorization: `Bearer ${key}`,
          Accept: "application/json"
        }
      }
    );
  } catch {
    throw providerError(
      "Tidak dapat terhubung ke server Luma.",
      502
    );
  }

  const data = await safeJson(response);

  if (!response.ok) {
    throw providerError(
      apiError(
        data,
        `Luma status error (${response.status}).`
      ),
      response.status >= 400 &&
      response.status < 600
        ? response.status
        : 502
    );
  }

  const state = String(
    data?.state ||
    data?.status ||
    ""
  )
    .trim()
    .toLowerCase();

  // ----------------------------------------------------------
  // FAILED
  // ----------------------------------------------------------

  if (
    [
      "failed",
      "failure",
      "error",
      "cancelled",
      "canceled"
    ].includes(state)
  ) {
    return {
      success: true,
      status: "failed",
      provider: ID,
      error:
        data?.failure_reason ||
        data?.error?.message ||
        data?.error ||
        "Luma generation gagal."
    };
  }

  // ----------------------------------------------------------
  // VIDEO URL
  // ----------------------------------------------------------

  const videoUrl =
    data?.assets?.video ||
    data?.video?.url ||
    data?.video_url ||
    null;

  if (videoUrl) {
    return {
      success: true,
      status: "completed",
      provider: ID,
      videoUrl: String(videoUrl)
    };
  }

  // ----------------------------------------------------------
  // EXPLICIT SUCCESS TANPA VIDEO
  // ----------------------------------------------------------

  if (
    [
      "completed",
      "complete",
      "success",
      "succeeded"
    ].includes(state)
  ) {
    return {
      success: true,
      status: "failed",
      provider: ID,
      error:
        "Luma menyatakan generation selesai tetapi video tidak ditemukan."
    };
  }

  // ----------------------------------------------------------
  // PROCESSING
  // ----------------------------------------------------------

  return {
    success: true,
    status: "processing",
    provider: ID
  };
}

// ------------------------------------------------------------
// FETCH VIDEO
// ------------------------------------------------------------

export async function fetchVideo(
  target,
  provider
) {
  const key = String(
    provider?.api_key || ""
  ).trim();

  if (!key) {
    throw providerError(
      "API key Luma belum dikonfigurasi.",
      400
    );
  }

  const rawTarget = String(
    target || ""
  ).trim();

  if (!rawTarget) {
    throw providerError(
      "URL video Luma kosong.",
      400
    );
  }

  let url;

  try {
    url = new URL(rawTarget);
  } catch {
    throw providerError(
      "URL video Luma tidak valid.",
      400
    );
  }

  // ----------------------------------------------------------
  // SECURITY
  // ----------------------------------------------------------

  const allowedHosts = new Set([
    "storage.cdn-luma.com",
    "api.lumalabs.ai"
  ]);

  const hostname = String(
    url.hostname || ""
  ).toLowerCase();

  if (url.protocol !== "https:") {
    throw providerError(
      "Video Luma hanya boleh menggunakan HTTPS.",
      403
    );
  }

  if (!allowedHosts.has(hostname)) {
    throw providerError(
      "Host video Luma tidak diizinkan.",
      403
    );
  }

  // Jangan meneruskan credential sebagai query parameter.
  url.searchParams.delete("api_key");
  url.searchParams.delete("key");

  let response;

  try {
    response = await fetch(
      url.toString(),
      {
        method: "GET",

        headers: {
          Authorization: `Bearer ${key}`
        }
      }
    );
  } catch {
    throw providerError(
      "Tidak dapat mengambil video dari Luma.",
      502
    );
  }

  if (!response.ok) {
    throw providerError(
      `Gagal mengambil video Luma (${response.status}).`,
      502
    );
  }

  return response;
}

// ------------------------------------------------------------
// DEFAULT ADAPTER
// ------------------------------------------------------------

export default {
  id: ID,
  name: NAME,
  supported: true,
  capabilities: CAPABILITIES,
  info,
  generate,
  status,
  fetchVideo
};
