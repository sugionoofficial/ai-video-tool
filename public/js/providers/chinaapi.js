const ID = "chinaapi";
const NAME = "ChinaAPI";

const BASE_URL = "https://api.chinaapi.ai/v1";

/*
 * ============================================================
 * CHINAAPI MODEL CAPABILITY REGISTRY
 * ============================================================
 *
 * Semua capability model didefinisikan DI SINI.
 *
 * Jangan pindahkan aturan model ke providers.js.
 *
 * imageReferenceSupported
 * videoReferenceSupported
 * maxReferenceImages
 * maxReferenceVideos
 * maxTotalReferences
 *
 * null berarti dokumentasi publik ChinaAPI belum memberikan
 * batas angka yang bisa diverifikasi.
 */

const MODEL_RULES = {

  /*
   * ==========================================================
   * AGNES
   * ==========================================================
   */

  "agnes-video-2.5-flash": {
    family: "agnes",
    type: "i2v",
    imageReferenceSupported: true,
    videoReferenceSupported: false,
    audioReferenceSupported: true,

    maxReferenceImages: 1,
    maxReferenceVideos: 0,

    resolutions: ["720p"],
    durations: [4, 5, 6, 7, 8, 9, 10, 11, 12],

    async: true,
    verified: true
  },

  "agnes-video-v2.0": {
    family: "agnes",
    type: "i2v",
    imageReferenceSupported: true,
    videoReferenceSupported: false,

    maxReferenceImages: null,
    maxReferenceVideos: 0,

    resolutions: [
      "480p",
      "720p",
      "1080p"
    ],

    durations: null,

    async: true,
    verified: true
  },

  "agnes-video-2.5": {
    family: "agnes",
    type: "i2v",
    imageReferenceSupported: true,
    videoReferenceSupported: true,
    audioReferenceSupported: true,

    maxReferenceImages: null,
    maxReferenceVideos: 1,

    resolutions: [
      "720p",
      "960p",
      "2K"
    ],

    durations: [
      4, 5, 6, 7, 8,
      9, 10, 11, 12
    ],

    async: true,
    verified: true
  },


  /*
   * ==========================================================
   * WAN 2.7
   * ==========================================================
   */

  "wan2.7-i2v": {
    family: "wan",
    type: "i2v",

    imageReferenceSupported: true,
    videoReferenceSupported: false,

    maxReferenceImages: 1,
    maxReferenceVideos: 0,
    maxTotalReferences: 1,

    resolutions: [
      "720p",
      "1080p"
    ],

    durations: [
      2, 3, 4, 5, 6,
      8, 10, 12, 15
    ],

    requiresImage: true,
    verified: true
  },

  "wan2.7-r2v": {
    family: "wan",
    type: "r2v",

    imageReferenceSupported: true,
    videoReferenceSupported: true,

    maxReferenceImages: 5,
    maxReferenceVideos: 5,
    maxTotalReferences: 5,

    resolutions: [
      "720p",
      "1080p"
    ],

    durations: [
      2, 3, 4, 5, 6,
      8, 10, 12, 15
    ],

    verified: true
  },

  "wan2.7-videoedit": {
    family: "wan",
    type: "videoedit",

    imageReferenceSupported: false,
    videoReferenceSupported: true,

    maxReferenceImages: 0,
    maxReferenceVideos: 1,

    resolutions: [
      "720p",
      "1080p"
    ],

    durations: [
      2, 3, 4, 5,
      6, 8, 10
    ],

    videoMinDuration: 2,
    videoMaxDuration: 10,

    verified: true
  },

  "wan2.7-t2v": {
    family: "wan",
    type: "t2v",

    imageReferenceSupported: false,
    videoReferenceSupported: false,

    maxReferenceImages: 0,
    maxReferenceVideos: 0,

    sizes: [
      "1280*720",
      "1920*1080"
    ],

    durations: [
      2, 3, 4, 5, 6,
      8, 10, 12, 15
    ],

    verified: true
  },


  /*
   * ==========================================================
   * WAN 3.0
   * ==========================================================
   */

  "wan3.0-video": {
    family: "wan3",
    type: "i2v",

    imageReferenceSupported: true,
    videoReferenceSupported: false,

    maxReferenceImages: 1,
    maxReferenceVideos: 0,

    resolutions: [
      "480p",
      "720p",
      "1080p"
    ],

    durations: [
      2, 3, 4, 5, 6,
      7, 8, 9, 10,
      11, 12, 13, 14,
      15, 20, 25, 30
    ],

    verified: true
  },

  "wan3.0-video-prime": {
    family: "wan3",
    type: "r2v",

    imageReferenceSupported: true,
    videoReferenceSupported: false,

    maxReferenceImages: 10,
    maxReferenceVideos: 0,
    maxTotalReferences: 10,

    resolutions: [
      "480p",
      "720p",
      "1080p"
    ],

    durations: [
      2, 3, 4, 5, 6,
      7, 8, 9, 10,
      11, 12, 13, 14,
      15, 20, 25, 30
    ],

    verified: true
  },


  /*
   * ==========================================================
   * SEEDANCE 2.5
   * ==========================================================
   */

  "doubao-seedance-2-5-260628": {
    family: "seedance",
    type: "multimodal",

    imageReferenceSupported: true,
    videoReferenceSupported: true,
    audioReferenceSupported: true,

    maxReferenceImages: 30,
    maxReferenceVideos: 10,
    maxReferenceAudio: 10,

    maxImageReferenceDuration: 30,
    maxVideoReferenceDuration: 30,
    maxAudioReferenceDuration: 30,

    maxTotalReferences: 30,

    resolutions: [
      "480p",
      "720p"
    ],

    durations: [
      4, 5, 6, 7, 8,
      9, 10, 11, 12,
      13, 14, 15,
      16, 17, 18, 19,
      20, 21, 22, 23,
      24, 25, 26, 27,
      28, 29, 30
    ],

    aspects: [
      "21:9",
      "16:9",
      "4:3",
      "1:1",
      "3:4",
      "9:16"
    ],

    verified: true
  },


  /*
   * ==========================================================
   * SEEDANCE 2.0
   * ==========================================================
   */

  "doubao-seedance-2-0-260128": {
    family: "seedance",
    type: "multimodal",

    imageReferenceSupported: true,
    videoReferenceSupported: true,
    audioReferenceSupported: true,

    maxReferenceImages: 9,
    maxReferenceVideos: 3,
    maxReferenceAudio: null,

    maxVideoReferenceDuration: 15,

    resolutions: [
      "480p",
      "720p",
      "1080p",
      "4K"
    ],

    durations: [
      4, 5, 6, 7, 8,
      9, 10, 11, 12,
      13, 14, 15
    ],

    aspects: [
      "21:9",
      "16:9",
      "4:3",
      "1:1",
      "3:4",
      "9:16"
    ],

    verified: true
  },

  "doubao-seedance-2-0-fast-260128": {
    family: "seedance",
    type: "multimodal",

    imageReferenceSupported: true,
    videoReferenceSupported: true,
    audioReferenceSupported: true,

    maxReferenceImages: 9,
    maxReferenceVideos: 3,
    maxReferenceAudio: null,

    maxVideoReferenceDuration: 15,

    resolutions: [
      "480p",
      "720p"
    ],

    durations: [
      4, 5, 6, 7, 8,
      9, 10, 11, 12,
      13, 14, 15
    ],

    aspects: [
      "21:9",
      "16:9",
      "4:3",
      "1:1",
      "3:4",
      "9:16"
    ],

    verified: true
  },

  "doubao-seedance-2-0-mini-260615": {
    family: "seedance",
    type: "multimodal",

    imageReferenceSupported: true,
    videoReferenceSupported: true,
    audioReferenceSupported: true,

    maxReferenceImages: 9,
    maxReferenceVideos: 3,
    maxReferenceAudio: null,

    maxVideoReferenceDuration: 15,

    resolutions: [
      "480p",
      "720p"
    ],

    durations: [
      4, 5, 6, 7, 8,
      9, 10, 11, 12,
      13, 14, 15
    ],

    aspects: [
      "21:9",
      "16:9",
      "4:3",
      "1:1",
      "3:4",
      "9:16"
    ],

    verified: true
  },


  /*
   * ==========================================================
   * KLING V3
   * ==========================================================
   */

  "kling-v3": {
    family: "kling",
    type: "i2v",

    imageReferenceSupported: true,
    videoReferenceSupported: false,

    maxReferenceImages: 1,
    maxReferenceVideos: 0,

    maxLastFrameImages: 1,

    durations: [
      5, 10, 15
    ],

    resolutions: [
      "720p",
      "1080p"
    ],

    aspects: [
      "16:9",
      "9:16",
      "1:1"
    ],

    modes: [
      "std",
      "pro",
      "4k"
    ],

    audioSupported: true,

    verified: true
  },

  "kling-3.0-turbo": {
    family: "kling",
    type: "i2v",

    imageReferenceSupported: true,
    videoReferenceSupported: false,

    maxReferenceImages: 1,
    maxReferenceVideos: 0,

    durations: [
      3, 5, 8, 10, 15
    ],

    resolutions: [
      "720p",
      "1080p"
    ],

    aspects: [
      "16:9",
      "9:16",
      "1:1"
    ],

    audioSupported: true,

    verified: true
  },

  "kling-v3-omni": {
    family: "kling",
    type: "r2v",

    imageReferenceSupported: true,
    videoReferenceSupported: true,

    maxReferenceImages: null,
    maxReferenceVideos: 1,

    modes: [
      "std",
      "pro",
      "4k"
    ],

    durations: [
      3, 5, 8, 10, 15
    ],

    aspects: [
      "16:9",
      "9:16",
      "1:1"
    ],

    audioSupported: true,

    verified: true
  },


  /*
   * ==========================================================
   * MINIMAX H3
   * ==========================================================
   */

  "MiniMax-H3": {
    family: "minimax",
    type: "multimodal",

    imageReferenceSupported: true,
    videoReferenceSupported: true,
    audioReferenceSupported: true,

    maxReferenceImages: null,
    maxReferenceVideos: null,

    resolutions: [
      "768P",
      "2K"
    ],

    durations: [
      4, 5, 6, 7, 8,
      9, 10, 11, 12,
      13, 14, 15
    ],

    aspects: [
      "16:9",
      "9:16",
      "1:1",
      "adaptive"
    ],

    maxPromptCharacters: 7000,

    verified: true
  },


  /*
   * ==========================================================
   * HAILUO
   * ==========================================================
   */

  "MiniMax-Hailuo-2.3": {
    family: "hailuo",
    type: "i2v",

    imageReferenceSupported: true,
    videoReferenceSupported: false,

    maxReferenceImages: 1,
    maxReferenceVideos: 0,

    durations: [
      6, 10
    ],

    resolutions: [
      "512P",
      "768P",
      "1080P"
    ],

    verified: true
  },

  "MiniMax-Hailuo-2.3-Fast": {
    family: "hailuo",
    type: "i2v",

    imageReferenceSupported: true,
    videoReferenceSupported: false,

    maxReferenceImages: 1,
    maxReferenceVideos: 0,

    durations: [
      6, 10
    ],

    resolutions: [
      "768P",
      "1080P"
    ],

    verified: true
  },

  "MiniMax-Hailuo-02": {
    family: "hailuo",
    type: "i2v",

    imageReferenceSupported: true,
    videoReferenceSupported: false,

    maxReferenceImages: 1,
    maxReferenceVideos: 0,

    durations: [
      6, 10
    ],

    resolutions: [
      "512P",
      "768P",
      "1080P"
    ],

    verified: true
  },


  /*
   * ==========================================================
   * HAPPYHORSE
   * ==========================================================
   */

  "happyhorse-1.1-i2v": {
    family: "happyhorse",
    type: "i2v",

    imageReferenceSupported: true,
    videoReferenceSupported: false,

    maxReferenceImages: 1,
    maxReferenceVideos: 0,

    sizes: [
      "832*480",
      "1280*720",
      "1920*1080"
    ],

    durations: [
      5, 10
    ],

    verified: true
  },

  "happyhorse-1.1-r2v": {
    family: "happyhorse",
    type: "r2v",

    imageReferenceSupported: true,
    videoReferenceSupported: false,

    maxReferenceImages: 9,
    maxReferenceVideos: 0,

    sizes: [
      "832*480",
      "1280*720",
      "1920*1080"
    ],

    durations: [
      5, 10
    ],

    verified: true
  },


  /*
   * ==========================================================
   * COGVIDEOX-3
   * ==========================================================
   *
   * Catalog confirms I2V + first/last frame.
   * Exact ChinaAPI payload field mapping is not exposed
   * in the public video reference documentation.
   */

  "cogvideox-3": {
    family: "cogvideo",
    type: "i2v",

    imageReferenceSupported: true,
    videoReferenceSupported: false,

    maxReferenceImages: 1,
    maxReferenceVideos: 0,

    maxLastFrameImages: 1,

    durations: [
      5, 10
    ],

    resolutions: [
      "1280x720",
      "1920x1080",
      "2560x1440",
      "3840x2160"
    ],

    fps: [
      30,
      60
    ],

    verified: false
  },


  /*
   * ==========================================================
   * HY4 PREVIEW
   * ==========================================================
   */

  "hy4-preview": {
    family: "hy4",
    type: "multimodal",

    imageReferenceSupported: true,
    videoReferenceSupported: true,
    audioReferenceSupported: true,

    maxReferenceImages: 9,
    maxReferenceVideos: 3,

    maxVideoReferenceDuration: 15,

    aspects: [
      "21:9",
      "16:9",
      "4:3",
      "1:1",
      "3:4",
      "9:16"
    ],

    verified: false
  }
};


/*
 * ============================================================
 * PROVIDER CAPABILITIES
 * ============================================================
 */

const CAPABILITIES = {
  models: Object.keys(
    MODEL_RULES
  ),

  durations: [
    2, 3, 4, 5, 6, 7,
    8, 9, 10, 11, 12,
    13, 14, 15, 20,
    25, 30
  ],

  aspects: [
    "16:9",
    "9:16",
    "1:1",
    "4:3",
    "3:4",
    "21:9"
  ],

  resolutions: [
    "480p",
    "512P",
    "720p",
    "768P",
    "960p",
    "1080p",
    "1080P",
    "2K",
    "4K"
  ],

  constraints: MODEL_RULES
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
  const candidates = [
    data?.error?.message,
    data?.data?.error?.message,
    data?.error,
    data?.message,
    data?.data?.message,
    data?.fail_reason,
    data?.data?.fail_reason,
    data?.reason,
    data?.data?.reason,
    data?.raw
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

  return fallback;
}


function apiErrorCode(
  data
) {
  const candidates = [
    data?.error?.code,
    data?.data?.error?.code,
    data?.code,
    data?.data?.code,
    data?.error_code,
    data?.data?.error_code
  ];

  for (
    const value of candidates
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

  return "provider_failed";
}


/*
 * ============================================================
 * NORMALIZATION
 * ============================================================
 */

function normalizeStatus(
  value
) {
  return String(
    value || ""
  )
    .trim()
    .toLowerCase();
}


function normalizeAspect(
  value
) {
  const aspect =
    String(
      value || "16:9"
    ).trim();

  const allowed = [
    "16:9",
    "9:16",
    "1:1",
    "4:3",
    "3:4",
    "21:9"
  ];

  return allowed.includes(
    aspect
  )
    ? aspect
    : "16:9";
}


function normalizeDuration(
  value,
  allowed
) {
  const duration =
    Number(
      value ?? 5
    );

  if (
    !Number.isInteger(
      duration
    )
  ) {
    throw providerError(
      "Duration ChinaAPI harus berupa bilangan bulat.",
      400
    );
  }

  if (
    Array.isArray(allowed) &&
    allowed.length &&
    !allowed.includes(
      duration
    )
  ) {
    throw providerError(
      `Duration ${duration}s tidak didukung model ChinaAPI ini.`,
      400
    );
  }

  return duration;
}


/*
 * ============================================================
 * SIZE
 * ============================================================
 */

function aspectToWanSize(
  aspect,
  resolution
) {
  const high =
    String(
      resolution || ""
    ).toLowerCase() ===
    "1080p";

  if (
    aspect === "9:16"
  ) {
    return high
      ? "1080*1920"
      : "720*1280";
  }

  if (
    aspect === "1:1"
  ) {
    return high
      ? "1440*1440"
      : "720*720";
  }

  if (
    aspect === "4:3"
  ) {
    return high
      ? "1440*1080"
      : "960*720";
  }

  if (
    aspect === "3:4"
  ) {
    return high
      ? "1080*1440"
      : "720*960";
  }

  return high
    ? "1920*1080"
    : "1280*720";
}


function aspectToKlingSize(
  aspect,
  resolution
) {
  const high =
    String(
      resolution || ""
    ).toLowerCase() ===
    "1080p";

  if (
    aspect === "9:16"
  ) {
    return high
      ? "1080x1920"
      : "720x1280";
  }

  if (
    aspect === "1:1"
  ) {
    return high
      ? "1024x1024"
      : "512x512";
  }

  return high
    ? "1920x1080"
    : "1280x720";
}


/*
 * ============================================================
 * PUBLIC URL HELPERS
 * ============================================================
 */

function publicUrl(
  value,
  label
) {
  if (!value) {
    return null;
  }

  const url =
    String(
      value
    ).trim();

  if (
    !/^https?:\/\//i.test(
      url
    )
  ) {
    throw providerError(
      `${label} harus berupa URL publik HTTPS/HTTP.`,
      400
    );
  }

  return url;
}


function getImageUrl(
  body
) {
  return publicUrl(
    body?.imageData ||
    body?.image ||
    body?.input_reference ||
    null,
    "Gambar referensi ChinaAPI"
  );
}


function getImages(
  body
) {
  if (
    !Array.isArray(
      body?.images
    )
  ) {
    return [];
  }

  return body.images
    .map(
      item => {
        if (
          typeof item ===
          "string"
        ) {
          return item;
        }

        return (
          item?.url ||
          item?.image_url ||
          null
        );
      }
    )
    .filter(
      Boolean
    )
    .map(
      url =>
        publicUrl(
          url,
          "Gambar referensi ChinaAPI"
        )
    );
}


function getVideoUrl(
  body
) {
  return publicUrl(
    body?.videoUrl ||
    body?.video_url ||
    null,
    "Video referensi ChinaAPI"
  );
}


/*
 * ============================================================
 * REFERENCE LIMITS
 * ============================================================
 */

function validateReferences(
  rule,
  images,
  videoUrl
) {
  const imageCount =
    images.length;

  const videoCount =
    videoUrl
      ? 1
      : 0;

  if (
    rule.maxReferenceImages !==
      null &&
    rule.maxReferenceImages !==
      undefined &&
    imageCount >
      rule.maxReferenceImages
  ) {
    throw providerError(
      `${rule.model || "Model"} maksimal ${rule.maxReferenceImages} gambar referensi.`,
      400
    );
  }

  if (
    rule.maxReferenceVideos !==
      null &&
    rule.maxReferenceVideos !==
      undefined &&
    videoCount >
      rule.maxReferenceVideos
  ) {
    throw providerError(
      `${rule.model || "Model"} maksimal ${rule.maxReferenceVideos} video referensi.`,
      400
    );
  }

  if (
    rule.maxTotalReferences !==
      null &&
    rule.maxTotalReferences !==
      undefined &&
    imageCount +
      videoCount >
      rule.maxTotalReferences
  ) {
    throw providerError(
      `${rule.model || "Model"} maksimal ${rule.maxTotalReferences} reference.`,
      400
    );
  }
}


/*
 * ============================================================
 * SEEDANCE PAYLOAD
 * ============================================================
 */

function buildSeedancePayload(
  body,
  rule,
  imageUrl,
  images,
  videoUrl,
  duration,
  resolution,
  aspect
) {
  const payload = {
    model:
      body.model,

    prompt:
      body.prompt,

    seconds:
      String(duration),

    metadata: {
      ...(body.metadata || {}),

      resolution:
        String(
          resolution || "720p"
        ).toLowerCase()
    }
  };

  /*
   * Reference mode.
   *
   * Seedance 2.0 / 2.5 supports
   * multimodal reference content.
   */

  const useReferenceMode =
    images.length > 1 ||
    Boolean(videoUrl) ||
    body?.referenceMode ===
      true;

  if (
    useReferenceMode
  ) {
    const content = [];

    for (
      const url of images
    ) {
      content.push({
        type:
          "image_url",

        image_url: {
          url
        },

        role:
          "reference_image"
      });
    }

    if (
      videoUrl
    ) {
      content.push({
        type:
          "video_url",

        video_url: {
          url:
            videoUrl
        },

        role:
          "reference_video"
      });
    }

    if (
      content.length
    ) {
      payload.metadata.content =
        content;

      payload.metadata.ratio =
        aspect;
    }

    return payload;
  }

  /*
   * First-frame mode.
   */

  const firstImage =
    imageUrl ||
    images[0] ||
    null;

  if (
    firstImage
  ) {
    payload.images = [
      firstImage
    ];
  }

  return payload;
}


/*
 * ============================================================
 * PAYLOAD BUILDER
 * ============================================================
 */

function buildPayload(
  body
) {
  const model =
    String(
      body?.model ||
      "wan2.7-t2v"
    ).trim();

  const rule =
    MODEL_RULES[
      model
    ];

  if (!rule) {
    throw providerError(
      "Model ChinaAPI tidak didukung.",
      400
    );
  }

  const prompt =
    String(
      body?.prompt ||
      ""
    ).trim();

  if (!prompt) {
    throw providerError(
      "Prompt ChinaAPI kosong.",
      400
    );
  }

  const aspect =
    normalizeAspect(
      body?.aspectRatio
    );

  const imageUrl =
    rule.imageReferenceSupported
      ? getImageUrl(
          body
        )
      : null;

  const images =
    rule.imageReferenceSupported
      ? getImages(
          body
        )
      : [];

  const videoUrl =
    rule.videoReferenceSupported
      ? getVideoUrl(
          body
        )
      : null;

  validateReferences(
    {
      ...rule,
      model
    },
    images.length
      ? images
      : imageUrl
        ? [imageUrl]
        : [],
    videoUrl
  );

  if (
    rule.videoReferenceSupported !==
      true &&
    videoUrl
  ) {
    throw providerError(
      `${model} tidak mendukung video reference melalui gateway ChinaAPI.`,
      400
    );
  }

  if (
    rule.requiresImage &&
    !imageUrl &&
    !images.length
  ) {
    throw providerError(
      `${model} membutuhkan gambar referensi.`,
      400
    );
  }

  const resolution =
    String(
      body?.resolution ||
      "720p"
    ).trim();

  const duration =
    normalizeDuration(
      body?.duration,
      rule.durations
    );

  const payload = {
    model,
    prompt
  };


  /*
   * ==========================================================
   * WAN 2.7
   * ==========================================================
   */

  if (
    rule.family ===
    "wan"
  ) {

    if (
      rule.type ===
      "t2v"
    ) {
      payload.size =
        body?.size ||
        aspectToWanSize(
          aspect,
          resolution
        );

      payload.duration =
        duration;

      return payload;
    }

    if (
      rule.type ===
      "i2v"
    ) {
      payload.input_reference =
        imageUrl ||
        images[0];

      payload.size =
        aspectToWanSize(
          aspect,
          resolution
        );

      payload.duration =
        duration;

      return payload;
    }

    if (
      rule.type ===
      "r2v"
    ) {
      const refs =
        images.length
          ? images
          : imageUrl
            ? [imageUrl]
            : [];

      if (
        refs.length ===
        1 &&
        !videoUrl
      ) {
        payload.input_reference =
          refs[0];
      } else if (
        refs.length
      ) {
        payload.images =
          refs;
      }

      if (
        videoUrl
      ) {
        payload.video_url =
          videoUrl;
      }

      payload.size =
        aspectToWanSize(
          aspect,
          resolution
        );

      payload.duration =
        duration;

      return payload;
    }

    if (
      rule.type ===
      "videoedit"
    ) {
      if (!videoUrl) {
        throw providerError(
          "Wan VideoEdit membutuhkan video referensi.",
          400
        );
      }

      payload.video_url =
        videoUrl;

      payload.size =
        aspectToWanSize(
          aspect,
          resolution
        );

      return payload;
    }
  }


  /*
   * ==========================================================
   * WAN 3
   * ==========================================================
   */

  if (
    rule.family ===
    "wan3"
  ) {
    const refs =
      images.length
        ? images
        : imageUrl
          ? [imageUrl]
          : [];

    /*
     * Wan 3 standard endpoint documents
     * first-frame image URL.
     *
     * Prime additionally supports reference
     * images, up to 10.
     */

    if (
      refs.length === 1
    ) {
      payload.image =
        refs[0];
    } else if (
      refs.length > 1
    ) {
      payload.images =
        refs.slice(
          0,
          rule.maxReferenceImages
        );
    }

    payload.duration =
      duration;

    payload.resolution =
      String(
        resolution
      ).toLowerCase();

    payload.aspect_ratio =
      aspect;

    return payload;
  }


  /*
   * ==========================================================
   * SEEDANCE
   * ==========================================================
   */

  if (
    rule.family ===
    "seedance"
  ) {
    return buildSeedancePayload(
      body,
      rule,
      imageUrl,
      images,
      videoUrl,
      duration,
      resolution,
      aspect
    );
  }


  /*
   * ==========================================================
   * KLING V3
   * ==========================================================
   */

  if (
    rule.type ===
    "kling3"
  ) {
    if (
      imageUrl
    ) {
      payload.image =
        imageUrl;
    }

    payload.size =
      aspectToKlingSize(
        aspect,
        resolution
      );

    payload.mode =
      body?.mode ||
      "std";

    payload.duration =
      duration;

    payload.metadata = {
      ...(body?.metadata || {}),

      aspect_ratio:
        aspect,

      sound:
        body?.sound ||
        "off"
    };

    if (
      body?.lastFrameImage
    ) {
      payload.metadata.image_tail =
        String(
          body.lastFrameImage
        ).trim();
    }

    return payload;
  }


  /*
   * ==========================================================
   * KLING TURBO
   * ==========================================================
   */

  if (
    rule.type ===
    "klingTurbo"
  ) {
    if (
      imageUrl
    ) {
      payload.image =
        imageUrl;
    }

    payload.metadata = {
      ...(body?.metadata || {}),

      settings: {
        ...(body?.metadata?.settings || {}),

        resolution:
          String(
            resolution
          ).toLowerCase() ===
          "1080p"
            ? "1080p"
            : "720p",

        duration,

        aspect_ratio:
          aspect
      }
    };

    return payload;
  }


  /*
   * ==========================================================
   * KLING OMNI
   * ==========================================================
   */

  if (
    rule.type ===
    "klingOmni"
  ) {
    const refs =
      images.length
        ? images
        : imageUrl
          ? [imageUrl]
          : [];

    if (
      !refs.length &&
      !videoUrl
    ) {
      throw providerError(
        "Kling Omni membutuhkan minimal satu reference.",
        400
      );
    }

    payload.metadata = {
      ...(body?.metadata || {}),

      image_list:
        refs.map(
          url => ({
            image_url:
              url
          })
        ),

      mode:
        rule.modes.includes(
          body?.mode
        )
          ? body.mode
          : "std",

      duration:
        String(
          duration
        ),

      aspect_ratio:
        aspect,

      sound:
        body?.sound ||
        "off"
    };

    if (
      videoUrl
    ) {
      payload.metadata.video_list =
        [
          {
            video_url:
              videoUrl,

            refer_type:
              "feature"
          }
        ];
    }

    return payload;
  }


  /*
   * ==========================================================
   * MINIMAX H3
   * ==========================================================
   */

  if (
    rule.type ===
    "h3"
  ) {
    if (
      imageUrl
    ) {
      payload.image =
        imageUrl;
    }

    if (
      images.length
    ) {
      payload.images =
        images;
    }

    if (
      videoUrl
    ) {
      payload.video_url =
        videoUrl;
    }

    payload.size =
      rule.resolutions.includes(
        resolution
      )
        ? resolution
        : "768P";

    payload.duration =
      duration;

    payload.metadata = {
      ...(body?.metadata || {})
    };

    if (
      !imageUrl &&
      !images.length &&
      !videoUrl
    ) {
      payload.metadata.ratio =
        rule.aspects.includes(
          aspect
        )
          ? aspect
          : "16:9";
    }

    return payload;
  }


  /*
   * ==========================================================
   * HAILUO
   * ==========================================================
   */

  if (
    rule.family ===
    "hailuo"
  ) {
    payload.duration =
      duration;

    payload.size =
      rule.resolutions.includes(
        resolution
      )
        ? resolution
        : "768P";

    payload.metadata = {
      ...(body?.metadata || {})
    };

    if (
      imageUrl
    ) {
      payload.metadata
        .first_frame_image =
        imageUrl;
    }

    if (
      body?.lastFrameImage
    ) {
      payload.metadata
        .last_frame_image =
        String(
          body.lastFrameImage
        ).trim();
    }

    if (
      body?.subjectReference
    ) {
      payload.metadata
        .subject_reference =
        String(
          body.subjectReference
        ).trim();
    }

    return payload;
  }


  /*
   * ==========================================================
   * HAPPYHORSE
   * ==========================================================
   */

  if (
    rule.family ===
    "happyhorse"
  ) {
    payload.size =
      body?.size ||
      aspectToWanSize(
        aspect,
        resolution
      );

    payload.duration =
      duration;

    if (
      rule.type ===
      "i2v"
    ) {
      payload.input_reference =
        imageUrl ||
        images[0];
    }

    if (
      rule.type ===
      "r2v"
    ) {
      payload.metadata = {
        ...(body?.metadata || {}),

        input: {
          media:
            images
        }
      };
    }

    return payload;
  }


  /*
   * ==========================================================
   * UNVERIFIED MODELS
   * ==========================================================
   */

  if (
    rule.verified ===
    false
  ) {
    throw providerError(
      `Payload ${model} belum terverifikasi terhadap endpoint ChinaAPI. Model sudah terdaftar agar tidak hilang dari katalog, tetapi request tidak akan ditebak.`,
      501
    );
  }

  throw providerError(
    `Payload untuk model ${model} belum tersedia.`,
    400
  );
}


/*
 * ============================================================
 * INFO
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
      provider?.api_key ||
      ""
    ).trim();

  if (!key) {
    throw providerError(
      "API key ChinaAPI belum dikonfigurasi.",
      400
    );
  }

  const payload =
    buildPayload(
      body
    );

  const response =
    await fetch(
      `${BASE_URL}/videos`,
      {
        method: "POST",

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
    const message =
      apiError(
        data,
        `ChinaAPI error (${response.status}).`
      );

    const code =
      apiErrorCode(
        data
      );

    throw providerError(
      `ChinaAPI [${code}]: ${message}`,
      response.status
    );
  }

  const taskId =
    data?.task_id ||
    data?.id ||
    data?.data?.task_id ||
    data?.data?.id ||
    data?.data?.video_id;

  if (!taskId) {
    throw providerError(
      `ChinaAPI tidak mengembalikan task ID. Response: ${JSON.stringify(
        data
      )}`,
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

    model:
      payload.model,

    duration:
      payload.duration ||
      payload.seconds ||
      null
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
      provider?.api_key ||
      ""
    ).trim();

  if (!key) {
    throw providerError(
      "API key ChinaAPI belum dikonfigurasi.",
      400
    );
  }

  const taskId =
    String(
      externalId ||
      ""
    ).trim();

  if (!taskId) {
    throw providerError(
      "Task ID ChinaAPI tidak valid.",
      400
    );
  }

  const response =
    await fetch(
      `${BASE_URL}/videos/${encodeURIComponent(
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
    const message =
      apiError(
        data,
        `ChinaAPI status error (${response.status}).`
      );

    const code =
      apiErrorCode(
        data
      );

    throw providerError(
      `ChinaAPI [${code}]: ${message}`,
      response.status
    );
  }

  const state =
    normalizeStatus(
      data?.status ||
      data?.data?.status ||
      data?.code ||
      data?.data?.code
    );

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
    const code =
      apiErrorCode(
        data
      );

    const message =
      apiError(
        data,
        "ChinaAPI generation gagal."
      );

    return {
      success:
        true,

      status:
        "failed",

      provider:
        ID,

      errorCode:
        code,

      error:
        `ChinaAPI [${code}]: ${message}`
    };
  }

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
      data?.metadata?.url ||
      data?.data?.metadata?.url ||
      data?.result_url ||
      data?.data?.result_url ||
      data?.video_url ||
      data?.data?.video_url ||
      data?.url ||
      data?.data?.url;

    if (
      videoUrl
    ) {
      return {
        success:
          true,

        status:
          "completed",

        provider:
          ID,

        videoUrl:
          String(
            videoUrl
          )
      };
    }

    return {
      success:
        true,

      status:
        "failed",

      provider:
        ID,

      errorCode:
        "missing_video_url",

      error:
        "ChinaAPI menyatakan video selesai tetapi URL video tidak ditemukan."
    };
  }

  return {
    success:
      true,

    status:
      "processing",

    provider:
      ID
  };
}


/*
 * ============================================================
 * FETCH VIDEO
 * ============================================================
 */

export async function fetchVideo(
  videoUrl
) {
  const url =
    String(
      videoUrl ||
      ""
    ).trim();

  if (!url) {
    throw providerError(
      "URL video ChinaAPI tidak tersedia.",
      404
    );
  }

  let parsed;

  try {
    parsed =
      new URL(
        url
      );
  } catch {
    throw providerError(
      "URL video ChinaAPI tidak valid.",
      400
    );
  }

  if (
    parsed.protocol !==
    "https:"
  ) {
    throw providerError(
      "URL video ChinaAPI tidak aman.",
      403
    );
  }

  const response =
    await fetch(
      parsed.toString()
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
