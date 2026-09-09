export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS / preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders()
      });
    }

    try {
      if (url.pathname === "/api/generate" && request.method === "POST") {
        return await handleGenerate(request, env);
      }

      if (url.pathname === "/api/generate" && request.method === "GET") {
        return await handleStatus(request, env);
      }

      if (url.pathname === "/api/video" && request.method === "GET") {
        return await handleVideoProxy(request, env);
      }

      return env.ASSETS.fetch(request);

    } catch (error) {
      console.error(error);

      return json({
        success: false,
        error: error?.message || "Internal Worker error."
      }, 500);
    }
  }
};


/* =========================================================
   GENERATE ROUTER
========================================================= */

async function handleGenerate(request, env) {
  const body = await request.json();

  if (!body || typeof body !== "object") {
    return json({
      success: false,
      error: "Request tidak valid."
    }, 400);
  }

  const provider = String(body.provider || "").toLowerCase();
  const prompt = String(body.prompt || "").trim();

  if (!prompt) {
    return json({
      success: false,
      error: "Prompt wajib diisi."
    }, 400);
  }

  if (prompt.length > 2000) {
    return json({
      success: false,
      error: "Prompt maksimal 2000 karakter."
    }, 400);
  }

  switch (provider) {
    case "veo":
      return await generateVeo(body, env);

    case "minimax":
      return await generateMiniMax(body, env);

    case "luma":
      return await generateLuma(body, env);

    case "pollinations":
    case "fal":
    case "runway":
      return json({
        success: false,
        error: `${provider} belum diaktifkan pada backend GEN-Z.AI.`
      }, 501);

    default:
      return json({
        success: false,
        error: `Provider "${provider}" tidak dikenali.`
      }, 400);
  }
}


/* =========================================================
   GOOGLE VEO
========================================================= */

async function generateVeo(body, env) {
  const apiKey = env.GEMINI_API_KEY;

  if (!apiKey) {
    return json({
      success: false,
      error: "GEMINI_API_KEY belum dikonfigurasi di Cloudflare."
    }, 500);
  }

  const allowedModels = [
    "veo-3.1-generate-preview",
    "veo-3.1-fast-generate-preview",
    "veo-3.1-lite-generate-preview"
  ];

  const model = body.model || "veo-3.1-fast-generate-preview";

  if (!allowedModels.includes(model)) {
    return json({
      success: false,
      error: "Model Veo tidak valid."
    }, 400);
  }

  const duration = Number(body.duration || 8);
  const resolution = String(body.resolution || "720p").toLowerCase();
  const aspectRatio = String(body.aspectRatio || "16:9");
  const imageData = body.imageData || null;

  if (![4, 6, 8].includes(duration)) {
    return json({
      success: false,
      error: "Durasi Veo harus 4, 6, atau 8 detik."
    }, 400);
  }

  if (!["16:9", "9:16"].includes(aspectRatio)) {
    return json({
      success: false,
      error: "Aspect ratio Veo hanya 16:9 atau 9:16."
    }, 400);
  }

  if (!["720p", "1080p", "4k"].includes(resolution)) {
    return json({
      success: false,
      error: "Resolusi Veo tidak valid."
    }, 400);
  }

  // Veo Lite tidak mendukung 4K
  if (
    model === "veo-3.1-lite-generate-preview" &&
    resolution === "4k"
  ) {
    return json({
      success: false,
      error: "Veo 3.1 Lite tidak mendukung 4K."
    }, 400);
  }

  // 1080p dan 4K membutuhkan 8 detik
  if (
    (resolution === "1080p" || resolution === "4k") &&
    duration !== 8
  ) {
    return json({
      success: false,
      error: "Veo 1080p/4K membutuhkan durasi 8 detik."
    }, 400);
  }

  // Image-to-video membutuhkan 8 detik
  if (imageData && duration !== 8) {
    return json({
      success: false,
      error: "Veo dengan character reference membutuhkan durasi 8 detik."
    }, 400);
  }

  const instance = {
    prompt: String(body.prompt).trim()
  };

  // Character reference / image-to-video
  if (imageData) {
    const parsed = parseDataUrl(imageData);

    if (!parsed) {
      return json({
        success: false,
        error: "Format character reference tidak valid."
      }, 400);
    }

    instance.image = {
      inlineData: {
        mimeType: parsed.mimeType,
        data: parsed.base64
      }
    };
  }

  const parameters = {
    aspectRatio,
    durationSeconds: String(duration),
    resolution
  };

  if (
    body.seed !== undefined &&
    body.seed !== null &&
    String(body.seed).trim() !== ""
  ) {
    const seed = Number(body.seed);

    if (
      !Number.isInteger(seed) ||
      seed < 0
    ) {
      return json({
        success: false,
        error: "Seed harus berupa angka bulat positif."
      }, 400);
    }

    parameters.seed = seed;
  }

  // Image reference menggunakan adult generation policy.
  if (imageData) {
    parameters.personGeneration = "allow_adult";
  }

  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:predictLongRunning`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify({
      instances: [instance],
      parameters
    })
  });

  const data = await safeJson(response);

  if (!response.ok) {
    return json({
      success: false,
      error: extractApiError(data, "Gagal membuat video Veo.")
    }, response.status);
  }

  const operationName =
    data?.name ||
    data?.operationName;

  if (!operationName) {
    return json({
      success: false,
      error: "Veo tidak mengembalikan operation ID."
    }, 502);
  }

  return json({
    success: true,
    provider: "veo",
    status: "processing",
    operationName,
    id: operationName
  });
}


/* =========================================================
   MINIMAX / HAILUO
========================================================= */

async function generateMiniMax(body, env) {
  const apiKey = env.MINIMAX_API_KEY;

  if (!apiKey) {
    return json({
      success: false,
      error: "MINIMAX_API_KEY belum dikonfigurasi di Cloudflare."
    }, 500);
  }

  const allowedModels = [
    "MiniMax-Hailuo-2.3",
    "MiniMax-Hailuo-2.3-Fast",
    "MiniMax-Hailuo-02"
  ];

  const model =
    body.model || "MiniMax-Hailuo-2.3";

  if (!allowedModels.includes(model)) {
    return json({
      success: false,
      error: "Model MiniMax tidak valid."
    }, 400);
  }

  const duration = Number(body.duration || 6);

  if (![6, 10].includes(duration)) {
    return json({
      success: false,
      error: "Durasi MiniMax harus 6 atau 10 detik."
    }, 400);
  }

  const resolution =
    String(body.resolution || "768P").toUpperCase();

  if (!["768P", "1080P"].includes(resolution)) {
    return json({
      success: false,
      error: "Resolusi MiniMax harus 768P atau 1080P."
    }, 400);
  }

  // 1080P hanya 6 detik pada model Hailuo yang relevan
  if (
    resolution === "1080P" &&
    duration !== 6
  ) {
    return json({
      success: false,
      error: "MiniMax 1080P menggunakan durasi 6 detik."
    }, 400);
  }

  const payload = {
    model,
    prompt: String(body.prompt).trim(),
    duration,
    resolution
  };

  // Image-to-video
  if (body.imageData) {
    if (
      typeof body.imageData !== "string" ||
      !body.imageData.startsWith("data:image/")
    ) {
      return json({
        success: false,
        error: "Character reference MiniMax harus berupa Data URL gambar."
      }, 400);
    }

    payload.first_frame_image = body.imageData;
  }

  const response = await fetch(
    "https://api.minimax.io/v1/video_generation",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    }
  );

  const data = await safeJson(response);

  if (!response.ok) {
    return json({
      success: false,
      error: extractApiError(data, "Gagal membuat video MiniMax.")
    }, response.status);
  }

  const taskId =
    data?.task_id ||
    data?.data?.task_id;

  if (!taskId) {
    return json({
      success: false,
      error: "MiniMax tidak mengembalikan task ID."
    }, 502);
  }

  return json({
    success: true,
    provider: "minimax",
    status: "processing",
    taskId,
    id: taskId
  });
}


/* =========================================================
   LUMA
========================================================= */

async function generateLuma(body, env) {
  const apiKey = env.LUMA_API_KEY;

  if (!apiKey) {
    return json({
      success: false,
      error: "LUMA_API_KEY belum dikonfigurasi di Cloudflare."
    }, 500);
  }

  // Saat ini Luma digunakan untuk text-to-video.
  if (body.imageData) {
    return json({
      success: false,
      error:
        "Character reference Luma belum diaktifkan. Luma membutuhkan image URL publik untuk workflow image-to-video."
    }, 400);
  }

  const allowedModels = [
    "ray-2",
    "ray-flash-2"
  ];

  const model =
    body.model || "ray-flash-2";

  if (!allowedModels.includes(model)) {
    return json({
      success: false,
      error: "Model Luma tidak valid."
    }, 400);
  }

  const allowedAspectRatios = [
    "1:1",
    "16:9",
    "9:16",
    "4:3",
    "3:4",
    "21:9",
    "9:21"
  ];

  const aspectRatio =
    body.aspectRatio || "16:9";

  if (!allowedAspectRatios.includes(aspectRatio)) {
    return json({
      success: false,
      error: "Aspect ratio Luma tidak valid."
    }, 400);
  }

  const payload = {
    generation_type: "video",
    prompt: String(body.prompt).trim(),
    model,
    aspect_ratio: aspectRatio
  };

  /*
   * Luma menerima parameter duration/resolution
   * melalui API video generation.
   * Hanya kirim apabila diberikan frontend.
   */

  if (
    body.duration !== undefined &&
    body.duration !== null &&
    String(body.duration).trim() !== ""
  ) {
    payload.duration = Number(body.duration);
  }

  if (
    body.resolution !== undefined &&
    body.resolution !== null &&
    String(body.resolution).trim() !== ""
  ) {
    payload.resolution =
      String(body.resolution).toLowerCase();
  }

  if (body.loop !== undefined) {
    payload.loop = Boolean(body.loop);
  }

  const response = await fetch(
    "https://api.lumalabs.ai/dream-machine/v1/generations/video",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    }
  );

  const data = await safeJson(response);

  if (!response.ok) {
    return json({
      success: false,
      error: extractApiError(data, "Gagal membuat video Luma.")
    }, response.status);
  }

  const generationId =
    data?.id ||
    data?.generation_id;

  if (!generationId) {
    return json({
      success: false,
      error: "Luma tidak mengembalikan generation ID."
    }, 502);
  }

  return json({
    success: true,
    provider: "luma",
    status: "processing",
    id: generationId
  });
}


/* =========================================================
   STATUS ROUTER
========================================================= */

async function handleStatus(request, env) {
  const url = new URL(request.url);

  const provider =
    String(url.searchParams.get("provider") || "")
      .toLowerCase();

  const id =
    url.searchParams.get("id") ||
    url.searchParams.get("operationName") ||
    url.searchParams.get("taskId");

  if (!id) {
    return json({
      success: false,
      error: "ID generation tidak ditemukan."
    }, 400);
  }

  switch (provider) {
    case "veo":
      return await getVeoStatus(id, env);

    case "minimax":
      return await getMiniMaxStatus(id, env);

    case "luma":
      return await getLumaStatus(id, env);

    default:
      return json({
        success: false,
        error: `Provider "${provider}" tidak didukung.`
      }, 400);
  }
}


/* =========================================================
   VEO STATUS
========================================================= */

async function getVeoStatus(operationName, env) {
  const apiKey = env.GEMINI_API_KEY;

  if (!apiKey) {
    return json({
      success: false,
      error: "GEMINI_API_KEY tidak tersedia."
    }, 500);
  }

  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/${operationName}`;

  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      "x-goog-api-key": apiKey
    }
  });

  const data = await safeJson(response);

  if (!response.ok) {
    return json({
      success: false,
      error: extractApiError(data, "Gagal mengambil status Veo.")
    }, response.status);
  }

  if (!data?.done) {
    return json({
      success: true,
      status: "processing",
      provider: "veo",
      operationName
    });
  }

  if (data?.error) {
    return json({
      success: false,
      error:
        data.error.message ||
        "Veo gagal membuat video."
    }, 502);
  }

  const videoUri =
    data?.response
      ?.generateVideoResponse
      ?.generatedSamples?.[0]
      ?.video?.uri;

  if (!videoUri) {
    return json({
      success: false,
      error: "Veo selesai tetapi URL video tidak ditemukan."
    }, 502);
  }

  const videoUrl =
    `/api/video?provider=veo&url=${encodeURIComponent(videoUri)}`;

  return json({
    success: true,
    status: "completed",
    provider: "veo",
    videoUrl,
    video_url: videoUrl
  });
}


/* =========================================================
   MINIMAX STATUS
========================================================= */

async function getMiniMaxStatus(taskId, env) {
  const apiKey = env.MINIMAX_API_KEY;

  if (!apiKey) {
    return json({
      success: false,
      error: "MINIMAX_API_KEY tidak tersedia."
    }, 500);
  }

  const endpoint =
    `https://api.minimax.io/v1/query/video_generation?task_id=${encodeURIComponent(taskId)}`;

  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${apiKey}`
    }
  });

  const data = await safeJson(response);

  if (!response.ok) {
    return json({
      success: false,
      error: extractApiError(
        data,
        "Gagal mengambil status MiniMax."
      )
    }, response.status);
  }

  const status =
    String(
      data?.status ||
      data?.data?.status ||
      ""
    ).toLowerCase();

  if (
    [
      "success",
      "succeeded",
      "completed",
      "finished"
    ].includes(status)
  ) {
    const fileId =
      data?.file_id ||
      data?.data?.file_id;

    const downloadUrl =
      data?.download_url ||
      data?.data?.download_url ||
      data?.file?.download_url;

    if (downloadUrl) {
      return json({
        success: true,
        status: "completed",
        provider: "minimax",
        videoUrl: downloadUrl,
        video_url: downloadUrl
      });
    }

    if (fileId) {
      const videoUrl =
        `/api/video?provider=minimax&fileId=${encodeURIComponent(fileId)}`;

      return json({
        success: true,
        status: "completed",
        provider: "minimax",
        videoUrl,
        video_url: videoUrl
      });
    }
  }

  if (
    [
      "failed",
      "failure",
      "error"
    ].includes(status)
  ) {
    return json({
      success: false,
      error:
        data?.error?.message ||
        data?.data?.error?.message ||
        "MiniMax gagal membuat video."
    }, 502);
  }

  return json({
    success: true,
    status: "processing",
    provider: "minimax",
    taskId
  });
}


/* =========================================================
   LUMA STATUS
========================================================= */

async function getLumaStatus(generationId, env) {
  const apiKey = env.LUMA_API_KEY;

  if (!apiKey) {
    return json({
      success: false,
      error: "LUMA_API_KEY tidak tersedia."
    }, 500);
  }

  const endpoint =
    `https://api.lumalabs.ai/dream-machine/v1/generations/${encodeURIComponent(generationId)}`;

  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${apiKey}`
    }
  });

  const data = await safeJson(response);

  if (!response.ok) {
    return json({
      success: false,
      error: extractApiError(
        data,
        "Gagal mengambil status Luma."
      )
    }, response.status);
  }

  const state =
    String(
      data?.state ||
      data?.status ||
      ""
    ).toLowerCase();

  if (
    [
      "completed",
      "complete",
      "succeeded",
      "success"
    ].includes(state)
  ) {
    const videoUrl =
      data?.assets?.video ||
      data?.video?.url ||
      data?.video_url;

    if (!videoUrl) {
      return json({
        success: false,
        error:
          "Luma selesai tetapi URL video tidak ditemukan."
      }, 502);
    }

    return json({
      success: true,
      status: "completed",
      provider: "luma",
      videoUrl,
      video_url: videoUrl
    });
  }

  if (
    [
      "failed",
      "error"
    ].includes(state)
  ) {
    return json({
      success: false,
      error:
        data?.failure_reason ||
        data?.error?.message ||
        "Luma gagal membuat video."
    }, 502);
  }

  return json({
    success: true,
    status: "processing",
    provider: "luma",
    id: generationId
  });
}


/* =========================================================
   VIDEO PROXY
========================================================= */

async function handleVideoProxy(request, env) {
  const url = new URL(request.url);

  const provider =
    String(url.searchParams.get("provider") || "")
      .toLowerCase();

  /*
   * Jangan jadikan Worker sebagai open proxy.
   * Internet sudah cukup banyak kekacauan tanpa kita
   * menambahkan satu lagi.
   */

  if (provider === "veo") {
    const target =
      url.searchParams.get("url");

    if (!target) {
      return json({
        success: false,
        error: "URL video tidak ditemukan."
      }, 400);
    }

    let targetUrl;

    try {
      targetUrl = new URL(target);
    } catch {
      return json({
        success: false,
        error: "URL video tidak valid."
      }, 400);
    }

    const allowedHosts = [
      "generativelanguage.googleapis.com",
      "storage.googleapis.com"
    ];

    if (!allowedHosts.includes(targetUrl.hostname)) {
      return json({
        success: false,
        error: "Host video tidak diizinkan."
      }, 403);
    }

    const apiKey = env.GEMINI_API_KEY;

    if (!apiKey) {
      return json({
        success: false,
        error: "GEMINI_API_KEY tidak tersedia."
      }, 500);
    }

    const separator =
      targetUrl.search ? "&" : "?";

    targetUrl.search +=
      `${separator}key=${encodeURIComponent(apiKey)}`;

    const response =
      await fetch(targetUrl.toString());

    if (!response.ok) {
      return new Response(
        await response.text(),
        {
          status: response.status,
          headers: corsHeaders()
        }
      );
    }

    return new Response(response.body, {
      status: 200,
      headers: {
        ...corsHeaders(),
        "Content-Type":
          response.headers.get("Content-Type") ||
          "video/mp4",
        "Cache-Control": "private, max-age=3600",
        "Accept-Ranges": "bytes"
      }
    });
  }


  /* -------------------------------------------------------
     MINIMAX FILE PROXY
  ------------------------------------------------------- */

  if (provider === "minimax") {
    const fileId =
      url.searchParams.get("fileId");

    if (!fileId) {
      return json({
        success: false,
        error: "File ID MiniMax tidak ditemukan."
      }, 400);
    }

    const apiKey = env.MINIMAX_API_KEY;

    if (!apiKey) {
      return json({
        success: false,
        error: "MINIMAX_API_KEY tidak tersedia."
      }, 500);
    }

    const endpoint =
      `https://api.minimax.io/v1/files/retrieve?file_id=${encodeURIComponent(fileId)}`;

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`
      }
    });

    const data = await safeJson(response);

    if (!response.ok) {
      return json({
        success: false,
        error: extractApiError(
          data,
          "Gagal mengambil file MiniMax."
        )
      }, response.status);
    }

    const downloadUrl =
      data?.file?.download_url ||
      data?.download_url ||
      data?.data?.download_url;

    if (!downloadUrl) {
      return json({
        success: false,
        error: "URL download MiniMax tidak ditemukan."
      }, 502);
    }

    let targetUrl;

    try {
      targetUrl = new URL(downloadUrl);
    } catch {
      return json({
        success: false,
        error: "URL download MiniMax tidak valid."
      }, 502);
    }

    if (targetUrl.hostname !== "api.minimax.io") {
      return json({
        success: false,
        error: "Host download MiniMax tidak diizinkan."
      }, 403);
    }

    const videoResponse =
      await fetch(targetUrl.toString());

    if (!videoResponse.ok) {
      return new Response(
        await videoResponse.text(),
        {
          status: videoResponse.status,
          headers: corsHeaders()
        }
      );
    }

    return new Response(videoResponse.body, {
      status: 200,
      headers: {
        ...corsHeaders(),
        "Content-Type":
          videoResponse.headers.get("Content-Type") ||
          "video/mp4",
        "Cache-Control": "private, max-age=3600",
        "Accept-Ranges": "bytes"
      }
    });
  }


  return json({
    success: false,
    error: "Provider video tidak didukung."
  }, 400);
}


/* =========================================================
   HELPERS
========================================================= */

function parseDataUrl(value) {
  if (
    typeof value !== "string" ||
    !value.startsWith("data:")
  ) {
    return null;
  }

  const match =
    value.match(
      /^data:([^;,]+);base64,(.+)$/s
    );

  if (!match) {
    return null;
  }

  return {
    mimeType: match[1],
    base64: match[2]
  };
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


function extractApiError(data, fallback) {
  if (!data) {
    return fallback;
  }

  if (typeof data === "string") {
    return data;
  }

  return (
    data?.error?.message ||
    data?.error?.detail ||
    data?.message ||
    data?.detail ||
    data?.data?.error?.message ||
    data?.raw ||
    fallback
  );
}


function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods":
      "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization",
    "Cache-Control":
      "no-store"
  };
}


function json(data, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        ...corsHeaders(),
        "Content-Type":
          "application/json; charset=utf-8"
      }
    }
  );
}
