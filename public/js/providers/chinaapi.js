const ID = "chinaapi";
const NAME = "ChinaAPI";

const BASE_URL = "https://api.chinaapi.ai/v1";

/*
 * ============================================================
 * CHINAAPI MODEL RULES
 * ============================================================
 */

const MODEL_RULES = {
  "wan2.7-t2v": {
    family: "wan",
    type: "t2v",
    sizes: ["1280*720", "1920*1080"],
    durations: [2, 3, 4, 5, 6, 8, 10, 12, 15]
  },

  "wan2.7-i2v": {
    family: "wan",
    type: "i2v",
    sizes: ["1280*720", "1920*1080"],
    durations: [2, 3, 4, 5, 6, 8, 10, 12, 15],
    requiresImage: true
  },

  "wan2.7-r2v": {
    family: "wan",
    type: "r2v",
    sizes: ["1280*720", "1920*1080"],
    durations: [2, 3, 4, 5, 6, 8, 10, 12, 15]
  },

  "wan2.7-videoedit": {
    family: "wan",
    type: "videoedit",
    sizes: ["1280*720", "1920*1080"],
    durations: [2, 3, 4, 5, 6, 8, 10]
  },

  "doubao-seedance-2-5-260628": {
    family: "seedance",
    type: "seedance25",
    resolutions: ["480p", "720p"],
    durations: [5, 10, 15, 20, 25, 30]
  },

  "doubao-seedance-2-0-260128": {
    family: "seedance",
    type: "seedance20",
    resolutions: ["480p", "720p"],
    durations: [5, 10, 15]
  },

  "doubao-seedance-2-0-fast-260128": {
    family: "seedance",
    type: "seedance20",
    resolutions: ["480p", "720p"],
    durations: [5, 10, 15]
  },

  "doubao-seedance-2-0-mini-260615": {
    family: "seedance",
    type: "seedance20",
    resolutions: ["480p", "720p"],
    durations: [5, 10, 15]
  },

  "kling-v3": {
    family: "kling",
    type: "kling3",
    durations: [5, 10, 15],
    aspects: ["16:9", "9:16", "1:1"],
    resolutions: ["720p", "1080p"]
  },

  "kling-3.0-turbo": {
    family: "kling",
    type: "klingTurbo",
    durations: [3, 5, 8, 10, 15],
    aspects: ["16:9", "9:16", "1:1"],
    resolutions: ["720p", "1080p"]
  },

  "kling-v3-omni": {
    family: "kling",
    type: "klingOmni",
    durations: [5, 10, 15],
    aspects: ["16:9", "9:16", "1:1"],
    modes: ["std", "pro", "4k"]
  },

  "MiniMax-H3": {
    family: "minimax",
    type: "h3",
    durations: [
      4, 5, 6, 7, 8,
      9, 10, 11, 12,
      13, 14, 15
    ],
    resolutions: ["768P", "2K"],
    aspects: ["16:9", "9:16", "1:1", "adaptive"]
  },

  "MiniMax-Hailuo-2.3": {
    family: "hailuo",
    type: "hailuo",
    durations: [6, 10],
    resolutions: ["768P", "1080P"]
  },

  "MiniMax-Hailuo-2.3-Fast": {
    family: "hailuo",
    type: "hailuo",
    durations: [6, 10],
    resolutions: ["768P", "1080P"]
  },

  "MiniMax-Hailuo-02": {
    family: "hailuo",
    type: "hailuo",
    durations: [6, 10],
    resolutions: ["768P", "1080P"]
  },

  "happyhorse-1.1-t2v": {
    family: "happyhorse",
    type: "t2v",
    sizes: [
      "832*480",
      "1280*720",
      "1920*1080"
    ],
    durations: [5, 10]
  },

  "happyhorse-1.1-i2v": {
    family: "happyhorse",
    type: "i2v",
    sizes: [
      "832*480",
      "1280*720",
      "1920*1080"
    ],
    durations: [5, 10],
    requiresImage: true
  },

  "happyhorse-1.1-r2v": {
    family: "happyhorse",
    type: "r2v",
    sizes: [
      "832*480",
      "1280*720",
      "1920*1080"
    ],
    durations: [5, 10]
  }
};


/*
 * ============================================================
 * CAPABILITIES
 * ============================================================
 */

const CAPABILITIES = {
  models: Object.keys(MODEL_RULES),

  durations: [
    2, 3, 4, 5, 6, 7, 8, 9,
    10, 11, 12, 13, 14, 15,
    20, 25, 30
  ],

  aspects: [
    "16:9",
    "9:16",
    "1:1"
  ],

  resolutions: [
    "480p",
    "720p",
    "768P",
    "1080p",
    "1080P",
    "2K"
  ],

  constraints: MODEL_RULES
};


/*
 * ============================================================
 * ERROR
 * ============================================================
 */

function providerError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}


/*
 * ============================================================
 * SAFE JSON
 * ============================================================
 */

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


/*
 * ============================================================
 * EXTRACT ERROR
 * ============================================================
 */

function apiError(data, fallback) {
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

  for (const value of candidates) {
    if (
      typeof value === "string" &&
      value.trim()
    ) {
      return value.trim();
    }
  }

  return fallback;
}


function apiErrorCode(data) {
  const candidates = [
    data?.error?.code,
    data?.data?.error?.code,
    data?.code,
    data?.data?.code,
    data?.error_code,
    data?.data?.error_code
  ];

  for (const value of candidates) {
    if (
      value !== undefined &&
      value !== null &&
      String(value).trim()
    ) {
      return String(value).trim();
    }
  }

  return "provider_failed";
}


/*
 * ============================================================
 * NORMALIZE
 * ============================================================
 */

function normalizeStatus(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}


function normalizeAspect(value) {
  const aspect =
    String(value || "16:9").trim();

  if (
    ["16:9", "9:16", "1:1"].includes(
      aspect
    )
  ) {
    return aspect;
  }

  return "16:9";
}


function normalizeDuration(value, allowed) {
  const duration =
    Number(value ?? 5);

  if (!Number.isInteger(duration)) {
    throw providerError(
      "Duration ChinaAPI harus berupa bilangan bulat.",
      400
    );
  }

  if (
    Array.isArray(allowed) &&
    allowed.length &&
    !allowed.includes(duration)
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
  const is1080 =
    String(resolution || "")
      .toLowerCase() === "1080p";

  if (aspect === "9:16") {
    return is1080
      ? "1080*1920"
      : "720*1280";
  }

  if (aspect === "1:1") {
    return is1080
      ? "1440*1440"
      : "720*720";
  }

  return is1080
    ? "1920*1080"
    : "1280*720";
}


function aspectToKlingSize(
  aspect,
  resolution
) {
  const high =
    String(resolution || "")
      .toLowerCase() === "1080p";

  if (aspect === "9:16") {
    return high
      ? "1080x1920"
      : "720x1280";
  }

  if (aspect === "1:1") {
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
 * REFERENCES
 * ============================================================
 */

function getImageUrl(body) {
  const value =
    body?.imageData ||
    body?.image ||
    body?.input_reference ||
    null;

  if (!value) {
    return null;
  }

  const url =
    String(value).trim();

  if (
    !/^https?:\/\//i.test(url)
  ) {
    throw providerError(
      "ChinaAPI membutuhkan URL gambar yang dapat diakses publik.",
      400
    );
  }

  return url;
}


function getImages(body) {
  if (!Array.isArray(body?.images)) {
    return [];
  }

  return body.images
    .map(item => {
      if (typeof item === "string") {
        return item;
      }

      return (
        item?.url ||
        item?.image_url ||
        null
      );
    })
    .filter(
      item =>
        typeof item === "string" &&
        /^https?:\/\//i.test(item)
    );
}


/*
 * ============================================================
 * PAYLOAD BUILDER
 * ============================================================
 */

function buildPayload(body) {
  const model =
    String(
      body?.model ||
      "wan2.7-t2v"
    ).trim();

  const rule =
    MODEL_RULES[model];

  if (!rule) {
    throw providerError(
      "Model ChinaAPI tidak didukung.",
      400
    );
  }

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

  const aspect =
    normalizeAspect(
      body?.aspectRatio
    );

  const imageUrl =
    getImageUrl(body);

  const images =
    getImages(body);

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
   * WAN
   * ==========================================================
   */

  if (rule.family === "wan") {

    if (rule.type === "t2v") {
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


    if (rule.type === "i2v") {
      if (!imageUrl) {
        throw providerError(
          "Wan I2V membutuhkan gambar referensi.",
          400
        );
      }

      payload.input_reference =
        imageUrl;

      payload.size =
        aspectToWanSize(
          aspect,
          resolution
        );

      payload.duration =
        duration;

      return payload;
    }


    if (rule.type === "r2v") {
      if (
        imageUrl &&
        images.length
      ) {
        throw providerError(
          "Wan R2V tidak boleh mengirim input_reference dan images bersamaan.",
          400
        );
      }

      if (images.length > 5) {
        throw providerError(
          "Wan R2V maksimal 5 referensi.",
          400
        );
      }

      if (imageUrl) {
        payload.input_reference =
          imageUrl;
      }

      if (images.length) {
        payload.images =
          images.slice(0, 5);
      }

      if (body?.videoUrl) {
        payload.video_url =
          String(
            body.videoUrl
          ).trim();
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


    if (rule.type === "videoedit") {
      if (!body?.videoUrl) {
        throw providerError(
          "Wan VideoEdit membutuhkan videoUrl.",
          400
        );
      }

      payload.video_url =
        String(
          body.videoUrl
        ).trim();

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
   * SEEDANCE
   * ==========================================================
   */

  if (rule.family === "seedance") {
    if (images.length) {
      payload.images =
        images;
    }

    if (imageUrl) {
      payload.input_reference =
        imageUrl;
    }

    if (body?.videoUrl) {
      payload.video_url =
        String(
          body.videoUrl
        ).trim();
    }

    payload.seconds =
      duration;

    payload.metadata = {
      ...(body?.metadata || {}),

      resolution:
        rule.resolutions.includes(
          String(resolution).toLowerCase()
        )
          ? String(
              resolution
            ).toLowerCase()
          : "720p"
    };

    return payload;
  }


  /*
   * ==========================================================
   * KLING V3
   * ==========================================================
   */

  if (rule.type === "kling3") {
    if (imageUrl) {
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

    return payload;
  }


  /*
   * ==========================================================
   * KLING TURBO
   * ==========================================================
   */

  if (rule.type === "klingTurbo") {
    if (imageUrl) {
      payload.image =
        imageUrl;
    }

    payload.metadata = {
      ...(body?.metadata || {}),

      settings: {
        ...(body?.metadata?.settings || {}),

        resolution:
          resolution === "1080p"
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

  if (rule.type === "klingOmni") {
    const refs =
      images.length
        ? images
        : imageUrl
          ? [imageUrl]
          : [];

    if (refs.length > 5) {
      throw providerError(
        "Kling Omni maksimal 5 gambar referensi.",
        400
      );
    }

    if (!refs.length) {
      throw providerError(
        "Kling Omni membutuhkan minimal satu gambar referensi.",
        400
      );
    }

    payload.metadata = {
      ...(body?.metadata || {}),

      image_list:
        refs.map(url => ({
          image_url:
            url
        })),

      mode:
        rule.modes.includes(
          body?.mode
        )
          ? body.mode
          : "std",

      duration:
        String(duration),

      aspect_ratio:
        aspect,

      sound:
        body?.sound ||
        "off"
    };

    return payload;
  }


  /*
   * ==========================================================
   * MINIMAX H3
   * ==========================================================
   */

  if (rule.type === "h3") {
    if (imageUrl) {
      payload.image =
        imageUrl;
    }

    if (images.length) {
      payload.images =
        images;
    }

    if (body?.videoUrl) {
      payload.video_url =
        String(
          body.videoUrl
        ).trim();
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
      !body?.videoUrl
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

  if (rule.family === "hailuo") {
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

    if (imageUrl) {
      payload.metadata
        .first_frame_image =
        imageUrl;
    }

    if (body?.lastFrameImage) {
      payload.metadata
        .last_frame_image =
        String(
          body.lastFrameImage
        ).trim();
    }

    if (body?.subjectReference) {
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

  if (rule.family === "happyhorse") {
    payload.size =
      body?.size ||
      aspectToWanSize(
        aspect,
        resolution
      );

    payload.duration =
      duration;

    if (rule.type === "i2v") {
      if (!imageUrl) {
        throw providerError(
          "HappyHorse I2V membutuhkan gambar referensi.",
          400
        );
      }

      payload.input_reference =
        imageUrl;
    }

    if (rule.type === "r2v") {
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
      provider?.api_key || ""
    ).trim();

  if (!key) {
    throw providerError(
      "API key ChinaAPI belum dikonfigurasi.",
      400
    );
  }

  const payload =
    buildPayload(body);

  /*
   * ChinaAPI supports the OpenAI-compatible
   * /v1/videos endpoint.
   */
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

  if (!response.ok) {
    const message =
      apiError(
        data,
        `ChinaAPI error (${response.status}).`
      );

    const code =
      apiErrorCode(data);

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
      String(taskId),

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
      `${BASE_URL}/videos/${encodeURIComponent(
        taskId
      )}`,
      {
        method: "GET",

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

  if (!response.ok) {
    const message =
      apiError(
        data,
        `ChinaAPI status error (${response.status}).`
      );

    const code =
      apiErrorCode(data);

    throw providerError(
      `ChinaAPI [${code}]: ${message}`,
      response.status
    );
  }

  /*
   * ChinaAPI may return:
   *
   * {
   *   "status": "SUCCESS",
   *   "metadata": {
   *      "url": "https://..."
   *   }
   * }
   *
   * or:
   *
   * {
   *   "code": "success",
   *   "data": {
   *      "status": "SUCCESS",
   *      "result_url": "https://..."
   *   }
   * }
   */

  const state =
    normalizeStatus(
      data?.status ||
      data?.data?.status ||
      data?.code ||
      data?.data?.code
    );


  /*
   * FAILED
   */

  if (
    [
      "failed",
      "failure",
      "error",
      "cancelled",
      "canceled"
    ].includes(state)
  ) {
    const code =
      apiErrorCode(data);

    const message =
      apiError(
        data,
        "ChinaAPI generation gagal."
      );

    return {
      success: true,

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


  /*
   * SUCCESS
   */

  if (
    [
      "success",
      "succeeded",
      "completed",
      "finished"
    ].includes(state)
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

    if (videoUrl) {
      return {
        success: true,

        status:
          "completed",

        provider:
          ID,

        videoUrl:
          String(videoUrl)
      };
    }

    return {
      success: true,

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


  /*
   * PROCESSING
   */

  return {
    success: true,

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
      videoUrl || ""
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
      new URL(url);
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

  if (!response.ok) {
    throw providerError(
      `Gagal mengambil video ChinaAPI (${response.status}).`,
      response.status
    );
  }

  return response;
}
