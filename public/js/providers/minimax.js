const ID = "minimax";
const NAME = "MiniMax";

const CAPABILITIES = {
  models: [
    "MiniMax-Hailuo-2.3",
    "MiniMax-Hailuo-2.3-Fast",
    "MiniMax-Hailuo-02"
  ],
  durations: [6, 10],
  aspects: ["16:9", "9:16"],
  resolutions: ["512P", "768P", "1080P"]
};

function providerError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

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

function apiError(data, fallback) {
  return typeof data?.error === "string"
    ? data.error
    : data?.error?.message ||
      data?.message ||
      data?.raw ||
      fallback;
}

function parseImageData(
  value,
  maxBytes = 12 * 1024 * 1024
) {
  if (typeof value !== "string") {
    return null;
  }

  const match = value.match(
    /^data:(image\/[\w.+-]+);base64,([A-Za-z0-9+/=\s]+)$/s
  );

  if (!match) {
    return null;
  }

  const base64 = match[2].replace(/\s/g, "");

  if (base64.length * 0.75 > maxBytes) {
    return null;
  }

  return {
    mimeType: match[1],
    base64
  };
}

export function info() {
  return {
    id: ID,
    name: NAME,
    capabilities: CAPABILITIES
  };
}

export async function generate(body, provider) {
  const key = String(
    provider?.api_key || ""
  ).trim();

  if (!key) {
    throw providerError(
      "API key MiniMax belum dikonfigurasi.",
      400
    );
  }

  const model = String(
    body?.model ||
      "MiniMax-Hailuo-2.3"
  ).trim();

  if (!CAPABILITIES.models.includes(model)) {
    throw providerError(
      "Model MiniMax tidak valid.",
      400
    );
  }

  let duration = Number(
    body?.duration || 6
  );

  if (!CAPABILITIES.durations.includes(duration)) {
    throw providerError(
      "Durasi MiniMax harus 6 atau 10 detik.",
      400
    );
  }

  let resolution = String(
    body?.resolution || "768P"
  ).trim();

  if (!CAPABILITIES.resolutions.includes(resolution)) {
    throw providerError(
      "Resolusi MiniMax tidak valid.",
      400
    );
  }

  if (
    resolution === "1080P" &&
    duration !== 6
  ) {
    duration = 6;
  }

  if (
    model !== "MiniMax-Hailuo-02" &&
    resolution === "512P"
  ) {
    throw providerError(
      "512P hanya tersedia untuk Hailuo 02.",
      400
    );
  }

  if (
    model === "MiniMax-Hailuo-2.3-Fast" &&
    body?.imageData == null
  ) {
    throw providerError(
      "Hailuo 2.3 Fast memerlukan image reference.",
      400
    );
  }

  const prompt = String(
    body?.prompt || ""
  ).trim();

  if (!prompt) {
    throw providerError(
      "Prompt MiniMax kosong.",
      400
    );
  }

  const payload = {
    model,
    prompt,
    duration,
    resolution,
    prompt_optimizer: true
  };

  if (body?.imageData) {
    const image = parseImageData(
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

  const response = await fetch(
    "https://api.minimax.io/v1/video_generation",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }
  );

  const data = await safeJson(response);

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

  if (!taskId) {
    throw providerError(
      "MiniMax tidak mengembalikan task ID.",
      502
    );
  }

  return {
    externalId: String(taskId),
    provider: ID,
    status: "processing",
    model,
    duration,
    resolution
  };
}

export async function status(
  externalId,
  provider
) {
  const key = String(
    provider?.api_key || ""
  ).trim();

  if (!key) {
    throw providerError(
      "API key MiniMax belum dikonfigurasi.",
      400
    );
  }

  const taskId = String(
    externalId || ""
  ).trim();

  if (!taskId) {
    throw providerError(
      "Task ID MiniMax tidak valid.",
      400
    );
  }

  const response = await fetch(
    `https://api.minimax.io/v1/query/video_generation?task_id=${encodeURIComponent(
      taskId
    )}`,
    {
      headers: {
        Authorization: `Bearer ${key}`
      }
    }
  );

  const data = await safeJson(response);

  if (!response.ok) {
    throw providerError(
      apiError(
        data,
        `MiniMax status error (${response.status}).`
      ),
      response.status
    );
  }

  const state = String(
    data?.status ||
      data?.task_status ||
      ""
  ).toLowerCase();

  if (
    [
      "failed",
      "failure",
      "error"
    ].includes(state)
  ) {
    return {
      success: true,
      status: "failed",
      provider: ID,
      error: apiError(
        data,
        "MiniMax generation gagal."
      )
    };
  }

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
        success: true,
        status: "completed",
        provider: ID,
        fileId: String(fileId)
      };
    }

    const videoUrl =
      data?.file?.download_url ||
      data?.download_url ||
      data?.video_url;

    if (videoUrl) {
      return {
        success: true,
        status: "completed",
        provider: ID,
        videoUrl
      };
    }
  }

  return {
    success: true,
    status: "processing",
    provider: ID
  };
}

export async function fetchVideo(
  fileId,
  provider
) {
  const key = String(
    provider?.api_key || ""
  ).trim();

  if (!key) {
    throw providerError(
      "API key MiniMax belum dikonfigurasi.",
      400
    );
  }

  const id = String(
    fileId || ""
  ).trim();

  if (!id) {
    throw providerError(
      "File ID MiniMax tidak tersedia.",
      404
    );
  }

  const response = await fetch(
    `https://api.minimax.io/v1/files/retrieve?file_id=${encodeURIComponent(
      id
    )}`,
    {
      headers: {
        Authorization: `Bearer ${key}`
      }
    }
  );

  const data = await safeJson(response);

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

  if (!downloadUrl) {
    throw providerError(
      "URL download MiniMax tidak tersedia.",
      502
    );
  }

  const url = new URL(
    downloadUrl
  );

  if (url.protocol !== "https:") {
    throw providerError(
      "URL download MiniMax tidak aman.",
      403
    );
  }

  return fetch(
    url.toString()
  );
}

export default {
  id: ID,
  name: NAME,
  capabilities: CAPABILITIES,
  info,
  generate,
  status,
  fetchVideo
};
