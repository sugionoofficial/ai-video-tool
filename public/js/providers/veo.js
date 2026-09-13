const ID = "veo";
const NAME = "Gemini / Veo";

const CAPABILITIES = {
  models: [
    "veo-3.1-fast-generate-preview",
    "veo-3.1-generate-preview",
    "veo-3.1-lite-generate-preview"
  ],
  durations: [4, 6, 8],
  aspects: [
    "16:9",
    "9:16"
  ],
  resolutions: [
    "720p",
    "1080p",
    "4k"
  ]
};


/*
 * ============================================================
 * ERROR
 * ============================================================
 */

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


/*
 * ============================================================
 * SAFE JSON
 * ============================================================
 */

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


/*
 * ============================================================
 * API ERROR
 * ============================================================
 */

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
    typeof data?.message ===
    "string"
  ) {
    return data.message;
  }

  if (
    typeof data?.raw ===
    "string"
  ) {
    return data.raw;
  }

  return fallback;
}


/*
 * ============================================================
 * NORMALIZE DURATION
 * ============================================================
 */

function normalizeDuration(
  value,
  fallback = 8
) {
  const duration =
    Number(
      value ?? fallback
    );

  if (
    !Number.isFinite(duration) ||
    !CAPABILITIES.durations.includes(
      duration
    )
  ) {
    throw providerError(
      "Durasi Veo tidak valid.",
      400
    );
  }

  return duration;
}


/*
 * ============================================================
 * PARSE IMAGE DATA
 * ============================================================
 */

function parseImageData(
  value,
  maxBytes = 12 * 1024 * 1024
) {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const match =
    value.match(
      /^data:(image\/[\w.+-]+);base64,([A-Za-z0-9+/=\s]+)$/s
    );

  if (!match) {
    return null;
  }

  const base64 =
    match[2].replace(
      /\s/g,
      ""
    );

  /*
   * Perkiraan ukuran byte
   * dari base64.
   */
  if (
    base64.length * 0.75 >
    maxBytes
  ) {
    return null;
  }

  return {
    mimeType:
      match[1],

    base64
  };
}


/*
 * ============================================================
 * ADAPTER INFO
 * ============================================================
 */

export function info() {
  return {
    id: ID,
    name: NAME,
    capabilities:
      CAPABILITIES
  };
}


/*
 * ============================================================
 * GENERATE
 * ============================================================
 */

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
      "API key Gemini / Veo belum dikonfigurasi.",
      400
    );
  }

  const model =
    String(
      body?.model ||
        CAPABILITIES.models[0]
    ).trim();

  if (
    !CAPABILITIES.models.includes(
      model
    )
  ) {
    throw providerError(
      "Model Veo tidak valid.",
      400
    );
  }

  const duration =
    normalizeDuration(
      body?.duration,
      8
    );

  const aspectRatio =
    String(
      body?.aspectRatio ||
        "16:9"
    ).trim();

  if (
    !CAPABILITIES.aspects.includes(
      aspectRatio
    )
  ) {
    throw providerError(
      "Aspect ratio Veo tidak valid.",
      400
    );
  }

  const resolution =
    String(
      body?.resolution ||
        "720p"
    ).trim();

  if (
    !CAPABILITIES.resolutions.includes(
      resolution
    )
  ) {
    throw providerError(
      "Resolusi Veo tidak valid.",
      400
    );
  }

  /*
   * Aturan khusus Veo.
   *
   * Tetap berada di adapter.
   */
  if (
    (
      resolution !== "720p" ||
      body?.imageData
    ) &&
    duration !== 8
  ) {
    throw providerError(
      "1080p/4K atau image-to-video Veo membutuhkan 8 detik.",
      400
    );
  }

  if (
    model ===
      "veo-3.1-lite-generate-preview" &&
    resolution === "4k"
  ) {
    throw providerError(
      "Veo Lite tidak mendukung 4K.",
      400
    );
  }

  const prompt =
    String(
      body?.prompt || ""
    ).trim();

  if (!prompt) {
    throw providerError(
      "Prompt Veo kosong.",
      400
    );
  }

  const instance = {
    prompt
  };

  /*
   * Image-to-video.
   */
  if (body?.imageData) {
    const image =
      parseImageData(
        body.imageData
      );

    if (!image) {
      throw providerError(
        "Character reference tidak valid atau terlalu besar.",
        400
      );
    }

    instance.image = {
      inlineData: {
        mimeType:
          image.mimeType,

        data:
          image.base64
      }
    };
  }

  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:predictLongRunning`;

  const response =
    await fetch(
      endpoint,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "x-goog-api-key":
            key
        },

        body: JSON.stringify({
          instances: [
            instance
          ],

          parameters: {
            aspectRatio,
            resolution
          }
        })
      }
    );

  const data =
    await safeJson(
      response
    );

  if (!response.ok) {
    throw providerError(
      apiError(
        data,
        `Veo error (${response.status}).`
      ),
      response.status
    );
  }

  const operationName =
    data?.name ||
    data?.operationName;

  if (
    typeof operationName !==
      "string" ||
    !operationName.trim()
  ) {
    throw providerError(
      "Veo tidak mengembalikan operation name.",
      502
    );
  }

  return {
    externalId:
      operationName,

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


/*
 * ============================================================
 * STATUS
 * ============================================================
 */

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
      "API key Gemini / Veo belum dikonfigurasi.",
      400
    );
  }

  const operation =
    String(
      externalId || ""
    )
      .trim()
      .replace(
        /^\/+/,
        ""
      );

  if (!operation) {
    throw providerError(
      "Operation Veo tidak valid.",
      400
    );
  }

  const response =
    await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${operation}`,
      {
        headers: {
          "x-goog-api-key":
            key
        }
      }
    );

  const data =
    await safeJson(
      response
    );

  if (!response.ok) {
    throw providerError(
      apiError(
        data,
        `Veo status error (${response.status}).`
      ),
      response.status
    );
  }

  if (!data?.done) {
    return {
      success:
        true,

      status:
        "processing",

      provider:
        ID
    };
  }

  if (data?.error) {
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
          "Veo generation gagal."
        )
    };
  }

  /*
   * Veo dapat mengembalikan
   * generatedSamples atau
   * generatedVideos tergantung
   * bentuk response API.
   */
  const videoUrl =
    data
      ?.response
      ?.generateVideoResponse
      ?.generatedSamples?.[0]
      ?.video?.uri ||
    data
      ?.response
      ?.generateVideoResponse
      ?.generatedVideos?.[0]
      ?.video?.uri;

  if (
    typeof videoUrl !==
      "string" ||
    !videoUrl.trim()
  ) {
    return {
      success:
        true,

      status:
        "failed",

      provider:
        ID,

      error:
        "Veo selesai tetapi URL video tidak ditemukan."
    };
  }

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


/*
 * ============================================================
 * FETCH VIDEO
 * ============================================================
 */

export async function fetchVideo(
  target,
  provider
) {
  const key =
    String(
      provider?.api_key || ""
    ).trim();

  if (!key) {
    throw providerError(
      "API key Gemini / Veo belum dikonfigurasi.",
      400
    );
  }

  const rawTarget =
    String(
      target || ""
    ).trim();

  if (!rawTarget) {
    throw providerError(
      "Target video Veo kosong.",
      400
    );
  }

  let url;

  try {
    url =
      new URL(
        rawTarget
      );
  } catch {
    throw providerError(
      "URL video Veo tidak valid.",
      400
    );
  }

  /*
   * Hanya host resmi yang
   * boleh diproxy.
   */
  const allowedHosts = [
    "generativelanguage.googleapis.com",
    "storage.googleapis.com"
  ];

  if (
    url.protocol !==
      "https:" ||
    !allowedHosts.includes(
      url.hostname
    )
  ) {
    throw providerError(
      "Host video Veo tidak diizinkan.",
      403
    );
  }

  /*
   * Jangan pernah meneruskan
   * API key dari target URL.
   */
  url.searchParams.delete(
    "key"
  );

  return fetch(
    url.toString(),
    {
      headers: {
        "x-goog-api-key":
          key
      }
    }
  );
}


/*
 * ============================================================
 * DEFAULT EXPORT
 * ============================================================
 */

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
