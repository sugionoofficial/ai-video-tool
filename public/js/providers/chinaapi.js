const ID = "chinaapi";
const NAME = "ChinaAPI";

const BASE_URL = "https://api.chinaapi.ai/v1";

/*
 * ============================================================
 * CHINAAPI MODEL CAPABILITY REGISTRY
 * ============================================================
 *
 * null = ChinaAPI belum memberikan batas angka yang dapat
 * diverifikasi secara publik.
 *
 * Jangan mengarang batas file/reference.
 *
 * referenceInputs dipakai oleh frontend untuk menentukan
 * blok upload yang harus ditampilkan.
 */

const IMAGE_ACCEPT = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif"
];

const VIDEO_ACCEPT = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-matroska"
];

const AUDIO_ACCEPT = [
  "audio/mpeg",
  "audio/wav",
  "audio/wave",
  "audio/x-wav"
];

function referenceInputs({
  image = false,
  video = false,
  audio = false,
  maxImages = null,
  maxVideos = null,
  maxAudio = null,
  maxVideoDuration = null,
  maxAudioDuration = null
} = {}) {
  return {
    image: {
      enabled: image,
      maxFiles: maxImages,
      maxFileSizeMB: null,
      accept: IMAGE_ACCEPT
    },

    video: {
      enabled: video,
      maxFiles: maxVideos,
      maxFileSizeMB: null,
      maxDurationSeconds: maxVideoDuration,
      accept: VIDEO_ACCEPT
    },

    audio: {
      enabled: audio,
      maxFiles: maxAudio,
      maxFileSizeMB: null,
      maxDurationSeconds: maxAudioDuration,
      accept: AUDIO_ACCEPT
    }
  };
}


/*
 * ============================================================
 * MODEL RULES
 * ============================================================
 */

const MODEL_RULES = {

  /*
   * ----------------------------------------------------------
   * AGNES
   * ----------------------------------------------------------
   */

  "agnes-video-2.5-flash": {
    family: "agnes",
    type: "i2v",

    imageReferenceSupported: true,
    videoReferenceSupported: false,
    audioReferenceSupported: true,

    maxReferenceImages: null,
    maxReferenceVideos: 0,
    maxReferenceAudio: null,

    maxLastFrameImages: 1,

    resolutions: [
      "720p"
    ],

    durations: [
      4, 5, 6, 7, 8,
      9, 10, 11, 12
    ],

    referenceInputs: referenceInputs({
      image: true,
      audio: true,
      maxImages: null,
      maxVideos: 0,
      maxAudio: null
    }),

    async: true,
    verified: false,

    note:
      "Catalog confirms image/audio reference, but exact ChinaAPI payload field mapping is not publicly documented."
  },

  "agnes-video-v2.0": {
    family: "agnes",
    type: "multimodal",

    imageReferenceSupported: true,
    videoReferenceSupported: false,
    audioReferenceSupported: false,

    maxReferenceImages: null,
    maxReferenceVideos: 0,

    resolutions: [
      "480p",
      "720p",
      "1080p"
    ],

    durations: null,

    referenceInputs: referenceInputs({
      image: true,
      maxImages: null,
      maxVideos: 0
    }),

    async: true,
    verified: false,

    note:
      "Catalog confirms multi-image keyframe support, but exact gateway payload mapping is not publicly documented."
  },

  "agnes-video-2.5": {
    family: "agnes",
    type: "multimodal",

    imageReferenceSupported: true,
    videoReferenceSupported: true,
    audioReferenceSupported: true,

    maxReferenceImages: null,
    maxReferenceVideos: null,
    maxReferenceAudio: null,

    maxLastFrameImages: 1,

    resolutions: [
      "720p",
      "960p",
      "2K"
    ],

    durations: [
      4, 5, 6, 7, 8,
      9, 10, 11, 12
    ],

    referenceInputs: referenceInputs({
      image: true,
      video: true,
      audio: true,
      maxImages: null,
      maxVideos: null,
      maxAudio: null
    }),

    async: true,
    verified: false,

    note:
      "Catalog confirms image/audio/video references. Exact gateway payload mapping requires provider documentation."
  },


  /*
   * ----------------------------------------------------------
   * WAN 2.7
   * ----------------------------------------------------------
   */

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

    referenceInputs: referenceInputs(),

    verified: true
  },

  "wan2.7-i2v": {
    family: "wan",
    type: "i2v",

    imageReferenceSupported: true,
    videoReferenceSupported: false,

    maxReferenceImages: 1,
    maxReferenceVideos: 0,
    maxTotalReferences: 1,

    maxLastFrameImages: 1,

    resolutions: [
      "720p",
      "1080p"
    ],

    durations: [
      2, 3, 4, 5, 6,
      8, 10, 12, 15
    ],

    promptMaxCharacters: 5000,
    negativePromptMaxCharacters: 500,

    referenceInputs: referenceInputs({
      image: true,
      maxImages: 1,
      maxVideos: 0
    }),

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

    referenceInputs: referenceInputs({
      image: true,
      video: true,
      maxImages: 5,
      maxVideos: 5
    }),

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

    referenceInputs: referenceInputs({
      video: true,
      maxVideos: 1,
      maxVideoDuration: 10
    }),

    verified: true
  },


  /*
   * ----------------------------------------------------------
   * WAN 3.0
   * ----------------------------------------------------------
   */

  "wan3.0-video": {
    family: "wan3",
    type: "multimodal",

    imageReferenceSupported: true,

    /*
     * Vendor has video-reference capability, but ChinaAPI
     * gateway explicitly does NOT carry reference video.
     */
    videoReferenceSupported: false,
    audioReferenceSupported: false,

    maxReferenceImages: 1,
    maxReferenceVideos: 0,

    maxLastFrameImages: 1,

    resolutions: [
      "480p",
      "720p",
      "1080p"
    ],

    durations: [
      2, 3, 4, 5, 6,
      7, 8, 9, 10,
      11, 12, 13, 14,
      15, 16, 17, 18,
      19, 20, 21, 22,
      23, 24, 25, 26,
      27, 28, 29, 30
    ],

    fps: [
      30
    ],

    referenceInputs: referenceInputs({
      image: true,
      maxImages: 1,
      maxVideos: 0
    }),

    verified: false,

    note:
      "Catalog confirms I2V. Gateway does not carry reference video/audio."
  },

  "wan3.0-video-prime": {
    family: "wan3",
    type: "r2v",

    imageReferenceSupported: true,
    videoReferenceSupported: false,
    audioReferenceSupported: false,

    maxReferenceImages: 10,
    maxReferenceVideos: 0,
    maxTotalReferences: 10,

    maxLastFrameImages: 1,

    resolutions: [
      "480p",
      "720p",
      "1080p"
    ],

    durations: [
      2, 3, 4, 5, 6,
      7, 8, 9, 10,
      11, 12, 13, 14,
      15, 16, 17, 18,
      19, 20, 21, 22,
      23, 24, 25, 26,
      27, 28, 29, 30
    ],

    fps: [
      30
    ],

    referenceInputs: referenceInputs({
      image: true,
      maxImages: 10,
      maxVideos: 0
    }),

    verified: false,

    note:
      "Gateway accepts image reference but explicitly rejects reference video/audio."
  },


  /*
   * ----------------------------------------------------------
   * SEEDANCE 2.5
   * ----------------------------------------------------------
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

    maxTotalReferenceSeconds: 30,

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

    referenceInputs: referenceInputs({
      image: true,
      video: true,
      audio: true,
      maxImages: 30,
      maxVideos: 10,
      maxAudio: 10,
      maxVideoDuration: 30,
      maxAudioDuration: 30
    }),

    generateAudioDefault: true,

    verified: true
  },


  /*
   * ----------------------------------------------------------
   * SEEDANCE 2.0
   * ----------------------------------------------------------
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

    maxTotalReferenceSeconds: 15,

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

    referenceInputs: referenceInputs({
      image: true,
      video: true,
      audio: true,
      maxImages: 9,
      maxVideos: 3,
      maxAudio: null,
      maxVideoDuration: 15
    }),

    generateAudioDefault: true,

    audioRequiresImageOrVideo: true,

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

    maxTotalReferenceSeconds: 15,

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

    referenceInputs: referenceInputs({
      image: true,
      video: true,
      audio: true,
      maxImages: 9,
      maxVideos: 3,
      maxAudio: null,
      maxVideoDuration: 15
    }),

    audioRequiresImageOrVideo: true,

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

    maxTotalReferenceSeconds: 15,

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

    referenceInputs: referenceInputs({
      image: true,
      video: true,
      audio: true,
      maxImages: 9,
      maxVideos: 3,
      maxAudio: null,
      maxVideoDuration: 15
    }),

    audioRequiresImageOrVideo: true,

    verified: true
  },


  /*
   * ----------------------------------------------------------
   * KLING V3
   * ----------------------------------------------------------
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

    referenceInputs: referenceInputs({
      image: true,
      maxImages: 1,
      maxVideos: 0
    }),

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

    referenceInputs: referenceInputs({
      image: true,
      maxImages: 1,
      maxVideos: 0
    }),

    verified: true
  },

  "kling-v3-omni": {
    family: "kling",
    type: "r2v",

    imageReferenceSupported: true,
    videoReferenceSupported: true,

    maxReferenceImages: null,
    maxReferenceVideos: null,

    durations: [
      3, 5, 8, 10, 15
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

    referenceInputs: referenceInputs({
      image: true,
      video: true,
      maxImages: null,
      maxVideos: null
    }),

    verified: true
  },


  /*
   * ----------------------------------------------------------
   * MINIMAX H3
   * ----------------------------------------------------------
   */

  "MiniMax-H3": {
    family: "minimax",
    type: "multimodal",

    imageReferenceSupported: true,
    videoReferenceSupported: true,
    audioReferenceSupported: true,

    maxReferenceImages: null,
    maxReferenceVideos: null,
    maxReferenceAudio: null,

    /*
     * I2V dan reference generation tidak boleh digabung
     * dalam satu request.
     */
    mutuallyExclusiveModes: [
      "image_to_video",
      "reference_generation"
    ],

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

    referenceInputs: referenceInputs({
      image: true,
      video: true,
      audio: true,
      maxImages: null,
      maxVideos: null,
      maxAudio: null
    }),

    verified: true
  },


  /*
   * ----------------------------------------------------------
   * HAILUO
   * ----------------------------------------------------------
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

    referenceInputs: referenceInputs({
      image: true,
      maxImages: 1,
      maxVideos: 0
    }),

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

    referenceInputs: referenceInputs({
      image: true,
      maxImages: 1,
      maxVideos: 0
    }),

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

    referenceInputs: referenceInputs({
      image: true,
      maxImages: 1,
      maxVideos: 0
    }),

    verified: true
  },


  /*
   * ----------------------------------------------------------
   * HAPPYHORSE
   * ----------------------------------------------------------
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

    referenceInputs: referenceInputs({
      image: true,
      maxImages: 1,
      maxVideos: 0
    }),

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

    referenceInputs: referenceInputs({
      image: true,
      maxImages: 9,
      maxVideos: 0
    }),

    verified: true
  },


  /*
   * ----------------------------------------------------------
   * COGVIDEOX-3
   * ----------------------------------------------------------
   *
   * Catalog verified:
   * T2V + I2V + first/last-frame interpolation.
   *
   * Exact ChinaAPI gateway field mapping is not sufficiently
   * documented, so generation is deliberately blocked instead
   * of guessing.
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

    referenceInputs: referenceInputs({
      image: true,
      maxImages: 1,
      maxVideos: 0
    }),

    verified: false,

    note:
      "Catalog verified, gateway payload mapping not verified."
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
    "720P",
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
    new Error(
      message
    );

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
    return JSON.parse(
      text
    );
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
    Array.isArray(
      allowed
    ) &&
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
 * PUBLIC URL
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
      `${label} harus berupa URL publik HTTP/HTTPS.`,
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
 * REFERENCE VALIDATION
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
      `${rule.model} maksimal ${rule.maxReferenceImages} gambar referensi.`,
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
      `${rule.model} maksimal ${rule.maxReferenceVideos} video referensi.`,
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
      `${rule.model} maksimal ${rule.maxTotalReferences} reference.`,
      400
    );
  }
}


/*
 * ============================================================
 * SEEDANCE
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
      String(
        duration
      ),

    metadata: {
      ...(body.metadata || {}),

      resolution:
        String(
          resolution ||
          "720p"
        ).toLowerCase()
    }
  };

  const referenceMode =
    images.length > 1 ||
    Boolean(
      videoUrl
    ) ||
    body?.referenceMode ===
      true;

  if (
    referenceMode
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

  const firstFrame =
    imageUrl ||
    images[0] ||
    null;

  if (
    firstFrame
  ) {
    payload.images = [
      firstFrame
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

  if (
    rule.maxPromptCharacters &&
    prompt.length >
      rule.maxPromptCharacters
  ) {
    throw providerError(
      `Prompt ${model} maksimal ${rule.maxPromptCharacters} karakter.`,
      400
    );
  }

  if (
    rule.verified ===
    false
  ) {
    throw providerError(
      `Model ${model} sudah terdaftar di katalog, tetapi struktur payload ChinaAPI-nya belum terverifikasi. Request tidak akan ditebak.`,
      501
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

  const allImages =
    images.length
      ? images
      : imageUrl
        ? [imageUrl]
        : [];

  validateReferences(
    {
      ...rule,
      model
    },
    allImages,
    videoUrl
  );

  if (
    videoUrl &&
    !rule.videoReferenceSupported
  ) {
    throw providerError(
      `${model} tidak mendukung video reference melalui gateway ChinaAPI.`,
      400
    );
  }

  if (
    rule.requiresImage &&
    !allImages.length
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

  /*
   * ----------------------------------------------------------
   * WAN 2.7
   * ----------------------------------------------------------
   */

  if (
    rule.family ===
    "wan"
  ) {
    const payload = {
      model,
      prompt
    };

    if (
      rule.type ===
      "t2v"
    ) {
      payload.size =
        body?.size ||
        (
          resolution ===
          "1080p"
            ? "1920*1080"
            : "1280*720"
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
        allImages[0];

      payload.size =
        body?.size ||
        (
          resolution ===
          "1080p"
            ? "1920*1080"
            : "1280*720"
        );

      payload.duration =
        duration;

      if (
        body?.lastFrameImage
      ) {
        payload.metadata = {
          image_tail:
            String(
              body.lastFrameImage
            ).trim()
        };
      }

      return payload;
    }

    if (
      rule.type ===
      "r2v"
    ) {
      /*
       * ChinaAPI explicitly says not to send
       * input_reference and images together.
       */

      if (
        allImages.length ===
        1 &&
        !videoUrl
      ) {
        payload.input_reference =
          allImages[0];
      } else if (
        allImages.length
      ) {
        payload.images =
          allImages.slice(
            0,
            rule.maxReferenceImages
          );
      }

      if (
        videoUrl
      ) {
        payload.video_url =
          videoUrl;
      }

      payload.size =
        body?.size ||
        (
          resolution ===
          "1080p"
            ? "1920*1080"
            : "1280*720"
        );

      payload.duration =
        duration;

      return payload;
    }

    if (
      rule.type ===
      "videoedit"
    ) {
      if (
        !videoUrl
      ) {
        throw providerError(
          "Wan VideoEdit membutuhkan video referensi.",
          400
        );
      }

      payload.video_url =
        videoUrl;

      payload.size =
        body?.size ||
        (
          resolution ===
          "1080p"
            ? "1920*1080"
            : "1280*720"
        );

      return payload;
    }
  }


  /*
   * ----------------------------------------------------------
   * WAN 3.0
   * ----------------------------------------------------------
   */

  if (
    rule.family ===
    "wan3"
  ) {
    const payload = {
      model,
      prompt,

      resolution:
        String(
          resolution
        ).toLowerCase(),

      duration,

      aspect_ratio:
        aspect
    };

    if (
      allImages.length ===
      1
    ) {
      payload.image =
        allImages[0];
    }

    if (
      allImages.length >
      1
    ) {
      payload.images =
        allImages.slice(
          0,
          rule.maxReferenceImages
        );
    }

    if (
      body?.lastFrameImage
    ) {
      payload.metadata = {
        image_tail:
          String(
            body.lastFrameImage
          ).trim()
      };
    }

    return payload;
  }


  /*
   * ----------------------------------------------------------
   * SEEDANCE
   * ----------------------------------------------------------
   */

  if (
    rule.family ===
    "seedance"
  ) {
    if (
      rule.audioRequiresImageOrVideo &&
      body?.audioUrl &&
      !allImages.length &&
      !videoUrl
    ) {
      throw providerError(
        `${model} membutuhkan minimal satu gambar atau video reference jika audio reference digunakan.`,
        400
      );
    }

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
   * ----------------------------------------------------------
   * KLING V3
   * ----------------------------------------------------------
   */

  if (
    model ===
    "kling-v3"
  ) {
    const payload = {
      model,
      prompt,

      image:
        allImages[0] ||
        undefined,

      mode:
        body?.mode ||
        "std",

      duration,

      metadata: {
        ...(body?.metadata || {}),

        aspect_ratio:
          aspect,

        sound:
          body?.sound ||
          "off"
      }
    };

    if (
      body?.lastFrameImage
    ) {
      payload.metadata.image_tail =
        String(
          body.lastFrameImage
        ).trim();
    }

    if (
      body?.negativePrompt
    ) {
      payload.metadata.negative_prompt =
        String(
          body.negativePrompt
        ).trim();
    }

    if (
      body?.cfgScale !==
      undefined
    ) {
      payload.metadata.cfg_scale =
        Number(
          body.cfgScale
        );
    }

    if (
      body?.cameraControl
    ) {
      payload.metadata.camera_control =
        body.cameraControl;
    }

    return payload;
  }


  /*
   * ----------------------------------------------------------
   * KLING TURBO
   * ----------------------------------------------------------
   */

  if (
    model ===
    "kling-3.0-turbo"
  ) {
    return {
      model,
      prompt,

      image:
        allImages[0] ||
        undefined,

      metadata: {
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
      }
    };
  }


  /*
   * ----------------------------------------------------------
   * KLING OMNI
   * ----------------------------------------------------------
   */

  if (
    model ===
    "kling-v3-omni"
  ) {
    const payload = {
      model,
      prompt,

      metadata: {
        ...(body?.metadata || {}),

        image_list:
          allImages.map(
            url => ({
              image_url:
                url
            })
          ),

        mode:
          [
            "std",
            "pro",
            "4k"
          ].includes(
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
      }
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
   * ----------------------------------------------------------
   * MINIMAX H3
   * ----------------------------------------------------------
   */

  if (
    model ===
    "MiniMax-H3"
  ) {
    const payload = {
      model,
      prompt,

      size:
        rule.resolutions.includes(
          resolution
        )
          ? resolution
          : "768P",

      duration
    };

    if (
      allImages.length
    ) {
      payload.images =
        allImages;
    }

    if (
      imageUrl
    ) {
      payload.image =
        imageUrl;
    }

    if (
      videoUrl
    ) {
      payload.video_url =
        videoUrl;
    }

    if (
      body?.metadata
    ) {
      payload.metadata =
        {
          ...body.metadata
        };
    }

    return payload;
  }


  /*
   * ----------------------------------------------------------
   * HAILUO
   * ----------------------------------------------------------
   */

  if (
    rule.family ===
    "hailuo"
  ) {
    const payload = {
      model,
      prompt,

      duration,

      size:
        rule.resolutions.includes(
          resolution
        )
          ? resolution
          : "768P",

      metadata: {
        ...(body?.metadata || {})
      }
    };

    if (
      imageUrl
    ) {
      payload.metadata.first_frame_image =
        imageUrl;
    }

    if (
      body?.lastFrameImage
    ) {
      payload.metadata.last_frame_image =
        String(
          body.lastFrameImage
        ).trim();
    }

    if (
      body?.subjectReference
    ) {
      payload.metadata.subject_reference =
        String(
          body.subjectReference
        ).trim();
    }

    return payload;
  }


  /*
   * ----------------------------------------------------------
   * HAPPYHORSE
   * ----------------------------------------------------------
   */

  if (
    rule.family ===
    "happyhorse"
  ) {
    const payload = {
      model,
      prompt,

      size:
        body?.size ||
        (
          resolution ===
          "1080p"
            ? "1920*1080"
            : "1280*720"
        ),

      duration
    };

    if (
      rule.type ===
      "i2v"
    ) {
      payload.input_reference =
        allImages[0];
    }

    if (
      rule.type ===
      "r2v"
    ) {
      payload.metadata = {
        ...(body?.metadata || {}),

        input: {
          media:
            allImages
        }
      };
    }

    return payload;
  }


  throw providerError(
    `Payload untuk ${model} belum tersedia.`,
    501
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
    const code =
      apiErrorCode(
        data
      );

    const message =
      apiError(
        data,
        `ChinaAPI error (${response.status}).`
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
    data?.data?.id;

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

  /*
   * Kita submit lewat /v1/videos,
   * maka polling lewat endpoint yang sama.
   *
   * ChinaAPI sendiri menjelaskan bahwa kedua endpoint
   * tersedia, tetapi response shape berbeda.
   */

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
    const code =
      apiErrorCode(
        data
      );

    const message =
      apiError(
        data,
        `ChinaAPI status error (${response.status}).`
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
      ""
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
      "completed",
      "success",
      "succeeded",
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
      !videoUrl
    ) {
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
          "ChinaAPI menyatakan task selesai tetapi URL video tidak ditemukan."
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
        String(
          videoUrl
        )
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
