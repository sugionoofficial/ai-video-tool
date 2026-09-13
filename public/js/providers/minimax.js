const ID = "minimax";
const NAME = "MiniMax";

const CAPABILITIES = {
  models: [
    "MiniMax-Hailuo-2.3",
    "MiniMax-Hailuo-2.3-Fast",
    "MiniMax-Hailuo-02"
  ],

  durations: [
    6,
    10
  ],

  aspects: [
    "16:9",
    "9:16"
  ],

  resolutions: [
    "512P",
    "768P",
    "1080P"
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
 * INFO
 * ============================================================
 */

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
      "API key MiniMax belum dikonfigurasi.",
      400
    );
  }


  /*
   * MODEL
   */

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
      "Model MiniMax tidak valid.",
      400
    );
  }


  /*
   * DURATION
   */

  const duration =
    Number(
      body?.duration ?? 6
    );

  if (
    !Number.isFinite(duration) ||
    !CAPABILITIES.durations.includes(
      duration
    )
  ) {
    throw providerError(
      "Durasi MiniMax harus 6 atau 10 detik.",
      400
    );
  }


  /*
   * ASPECT RATIO
   */

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
      "Aspect ratio MiniMax tidak valid.",
      400
    );
  }


  /*
   * RESOLUTION
   */

  const resolution =
    String(
      body?.resolution ||
        "768P"
    ).trim();

  if (
    !CAPABILITIES.resolutions.includes(
      resolution
    )
  ) {
    throw providerError(
      "Resolusi MiniMax tidak valid.",
      400
    );
  }


  /*
   * ATURAN KHUSUS MINIMAX
   *
   * 1080P hanya 6 detik.
   *
   * Jangan mengubah pilihan user
   * secara diam-diam.
   */

  if (
    resolution === "1080P" &&
    duration !== 6
  ) {
    throw providerError(
      "MiniMax 1080P hanya mendukung durasi 6 detik.",
      400
    );
  }


  /*
   * 512P hanya untuk Hailuo 02.
   */

  if (
    model !==
      "MiniMax-Hailuo-02" &&
    resolution === "512P"
  ) {
    throw providerError(
      "512P hanya tersedia untuk Hailuo 02.",
      400
    );
  }


  /*
   * Hailuo 2.3 Fast memerlukan
   * image reference.
   */

  if (
    model ===
      "MiniMax-Hailuo-2.3-Fast" &&
    !body?.imageData
  ) {
    throw providerError(
      "Hailuo 2.3 Fast memerlukan image reference.",
      400
    );
  }


  /*
   * PROMPT
   */

  const prompt =
    String(
      body?.prompt || ""
    ).trim();

  if (!prompt) {
    throw providerError(
      "Prompt MiniMax kosong.",
      400
    );
  }


  /*
   * PAYLOAD
   *
   * aspectRatio disimpan dalam metadata
   * internal meskipun endpoint MiniMax
   * yang digunakan saat ini tidak mengirim
   * field tersebut ke API.
   */

  const payload = {
    model,
    prompt,
    duration,
    resolution,
    prompt_optimizer:
      true
  };


  /*
   * IMAGE TO VIDEO
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

    payload.first_frame_image =
      `data:${image.mimeType};base64,${image.base64}`;
  }


  /*
   * SUBMIT
   */

  const response =
    await fetch(
      "https://api.minimax.io/v1/video_generation",
      {
        method:
          "POST",

        headers: {
          Authorization:
            `Bearer ${key}`,

          "Content-Type":
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
    throw providerError(
      apiError(
        data,
        `MiniMax error (${response.status}).`
      ),
      response.status
    );
  }


  const taskId =
    data?.task_id ||
    data?.taskId;

  if (
    typeof taskId !==
      "string" &&
    typeof taskId !==
      "number"
  ) {
    throw providerError(
      "MiniMax tidak mengembalikan task ID.",
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
      "API key MiniMax belum dikonfigurasi.",
      400
    );
  }


  const taskId =
    String(
      externalId || ""
    ).trim();

  if (!taskId) {
    throw providerError(
      "Task ID MiniMax tidak valid.",
      400
    );
  }


  const response =
    await fetch(
      `https://api.minimax.io/v1/query/video_generation?task_id=${encodeURIComponent(
        taskId
      )}`,
      {
        headers: {
          Authorization:
            `Bearer ${key}`
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
        `MiniMax status error (${response.status}).`
      ),
      response.status
    );
  }


  const state =
    String(
      data?.status ||
        data?.task_status ||
        ""
    )
      .trim()
      .toLowerCase();


  /*
   * FAILED
   */

  if (
    [
      "failed",
      "failure",
      "error"
    ].includes(state)
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
          "MiniMax generation gagal."
        )
    };
  }


  /*
   * COMPLETED
   */

  if (
    [
      "success",
      "succeeded",
      "completed",
      "finished"
    ].includes(state)
  ) {
    const fileId =
      data?.file_id ||
      data?.file?.file_id;

    if (fileId) {
      return {
        success:
          true,

        status:
          "completed",

        provider:
          ID,

        fileId:
          String(fileId)
      };
    }


    const videoUrl =
      data?.file?.download_url ||
      data?.download_url ||
      data?.video_url;

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
        "MiniMax selesai tetapi file video tidak ditemukan."
    };
  }


  /*
   * PROCESSING
   */

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
  fileId,
  provider
) {
  const key =
    String(
      provider?.api_key || ""
    ).trim();

  if (!key) {
    throw providerError(
      "API key MiniMax belum dikonfigurasi.",
      400
    );
  }


  const id =
    String(
      fileId || ""
    ).trim();

  if (!id) {
    throw providerError(
      "File ID MiniMax tidak tersedia.",
      404
    );
  }


  const response =
    await fetch(
      `https://api.minimax.io/v1/files/retrieve?file_id=${encodeURIComponent(
        id
      )}`,
      {
        headers: {
          Authorization:
            `Bearer ${key}`
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
        "Gagal mengambil file MiniMax."
      ),
      response.status
    );
  }


  const downloadUrl =
    data?.file?.download_url;


  if (
    typeof downloadUrl !==
      "string" ||
    !downloadUrl.trim()
  ) {
    throw providerError(
      "URL download MiniMax tidak tersedia.",
      502
    );
  }


  let url;

  try {
    url =
      new URL(
        downloadUrl
      );
  } catch {
    throw providerError(
      "URL download MiniMax tidak valid.",
      502
    );
  }


  if (
    url.protocol !==
    "https:"
  ) {
    throw providerError(
      "URL download MiniMax tidak aman.",
      403
    );
  }


  return fetch(
    url.toString()
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
