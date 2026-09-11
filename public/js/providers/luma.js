const ID = "luma";
const NAME = "Luma";

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
  ]
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
      "API key Luma belum dikonfigurasi.",
      400
    );
  }

  const model = String(
    body?.model || "ray-2"
  ).trim();

  if (!CAPABILITIES.models.includes(model)) {
    throw providerError(
      "Model Luma tidak valid.",
      400
    );
  }

  const aspectRatio = String(
    body?.aspectRatio || "16:9"
  ).trim();

  if (!CAPABILITIES.aspects.includes(aspectRatio)) {
    throw providerError(
      "Aspect ratio Luma tidak valid.",
      400
    );
  }

  const duration = String(
    body?.duration || "5s"
  ).trim();

  if (!CAPABILITIES.durations.includes(duration)) {
    throw providerError(
      "Durasi Luma harus 5s atau 9s.",
      400
    );
  }

  const prompt = String(
    body?.prompt || ""
  ).trim();

  if (!prompt) {
    throw providerError(
      "Prompt Luma kosong.",
      400
    );
  }

  if (body?.imageData) {
    throw providerError(
      "Character reference Luma pada konfigurasi ini memerlukan public image URL. Gunakan Veo atau MiniMax untuk gambar lokal.",
      400
    );
  }

  const payload = {
    model,
    prompt,
    aspect_ratio: aspectRatio,
    duration
  };

  const response = await fetch(
    "https://api.lumalabs.ai/dream-machine/v1/generations/video",
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
        `Luma error (${response.status}).`
      ),
      response.status
    );
  }

  const id =
    data?.id;

  if (!id) {
    throw providerError(
      "Luma tidak mengembalikan generation ID.",
      502
    );
  }

  return {
    externalId: String(id),
    provider: ID,
    status: "processing",
    model,
    duration,
    aspectRatio
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

  const response = await fetch(
    `https://api.lumalabs.ai/dream-machine/v1/generations/${encodeURIComponent(
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
        `Luma status error (${response.status}).`
      ),
      response.status
    );
  }

  const state = String(
    data?.state ||
      data?.status ||
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
      error:
        data?.failure_reason ||
        "Luma generation gagal."
    };
  }

  const videoUrl =
    data?.assets?.video ||
    data?.video?.url ||
    data?.video_url;

  if (videoUrl) {
    return {
      success: true,
      status: "completed",
      provider: ID,
      videoUrl
    };
  }

  return {
    success: true,
    status: "processing",
    provider: ID
  };
}

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

  const url = new URL(
    String(target || "")
  );

  const allowedHosts = [
    "storage.cdn-luma.com",
    "api.lumalabs.ai"
  ];

  if (
    url.protocol !== "https:" ||
    !allowedHosts.includes(url.hostname)
  ) {
    throw providerError(
      "Host video Luma tidak diizinkan.",
      403
    );
  }

  return fetch(
    url.toString(),
    {
      headers: {
        Authorization: `Bearer ${key}`
      }
    }
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
