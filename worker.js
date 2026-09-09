export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // =====================================================
    // CORS PREFLIGHT
    // =====================================================

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders()
      });
    }

    try {
      // ===================================================
      // DIAGNOSTIC
      // Tidak pernah menampilkan nilai API key.
      // Hanya menunjukkan apakah binding tersedia.
      // ===================================================

      if (
        url.pathname === "/api/diagnostic" &&
        request.method === "GET"
      ) {
        return json({
          success: true,
          worker: "ai-video-tool",
          geminiPrimaryConfigured: Boolean(env.GEMINI_API_KEY),
geminiBackupConfigured: Boolean(env.GEMINI_API_KEY1),

minimaxPrimaryConfigured: Boolean(env.MINIMAX_API_KEY),
minimaxBackupConfigured: Boolean(env.MINIMAX_API_KEY1),

lumaPrimaryConfigured: Boolean(env.LUMA_API_KEY),
lumaBackupConfigured: Boolean(env.LUMA_API_KEY1),

testBindingConfigured: Boolean(env.TEST_BINDING),
          timestamp: new Date().toISOString()
        });
      }

      // ===================================================
      // GENERATE
      // ===================================================

      if (
        url.pathname === "/api/generate" &&
        request.method === "POST"
      ) {
        return await handleGenerate(request, env);
      }

      // ===================================================
// STATUS POST
// API key dikirim melalui JSON body.
// ===================================================

if (
  url.pathname === "/api/generate/status" &&
  request.method === "POST"
) {
  return await handleStatusPost(request, env);
}

// ===================================================
// STATUS LEGACY GET
// Tetap dipertahankan untuk kompatibilitas.
// ===================================================

if (
  url.pathname === "/api/generate" &&
  request.method === "GET"
) {
  return await handleStatus(request, env);
}

      // ===================================================
      // VIDEO PROXY
      // ===================================================

      if (
        url.pathname === "/api/video" &&
        request.method === "GET"
      ) {
        return await handleVideoProxy(request, env);
      }

      // ===================================================
      // STATIC ASSETS
      // ===================================================

      return env.ASSETS.fetch(request);

    } catch (error) {
      console.error("Worker error:", error);

      return json({
        success: false,
        error: error?.message || "Internal Worker error."
      }, 500);
    }
  }
};


// =========================================================
// GENERATE ROUTER
// =========================================================

async function handleGenerate(request, env) {
  let body;

  try {
    body = await request.json();
  } catch {
    return json({
      success: false,
      error: "Request JSON tidak valid."
    }, 400);
  }

  if (!body || typeof body !== "object") {
    return json({
      success: false,
      error: "Request tidak valid."
    }, 400);
  }

  const provider = String(
    body.provider || ""
  ).trim().toLowerCase();

  const prompt = String(
    body.prompt || ""
  ).trim();

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
        error:
          `${provider} belum diaktifkan pada backend GEN-Z.AI.`
      }, 501);

    default:
      return json({
        success: false,
        error:
          `Provider "${provider}" tidak dikenali.`
      }, 400);
  }
}


// =========================================================
// GOOGLE VEO
// =========================================================

async function generateVeo(body, env) {
  const apiKey =
  String(body.apiKey || "").trim() ||
  env.GEMINI_API_KEY ||
  env.GEMINI_API_KEY1;

if (!apiKey) {
  return json({
    success: false,
    error:
      "API key Google Veo belum disimpan pada akun ini."
  }, 400);
}

  const allowedModels = [
    "veo-3.1-generate-preview",
    "veo-3.1-fast-generate-preview",
    "veo-3.1-lite-generate-preview"
  ];

  const model =
    String(
      body.model ||
      "veo-3.1-fast-generate-preview"
    );

  if (!allowedModels.includes(model)) {
    return json({
      success: false,
      error: "Model Veo tidak valid."
    }, 400);
  }

  let duration = Number(
    body.duration || 8
  );

  let resolution =
    String(
      body.resolution || "720p"
    ).toLowerCase();

  const aspectRatio =
    String(
      body.aspectRatio || "16:9"
    );

  const imageData =
    body.imageData || null;

  // -------------------------------------------------------
  // Duration
  // -------------------------------------------------------

  if (![4, 6, 8].includes(duration)) {
    return json({
      success: false,
      error:
        "Durasi Veo harus 4, 6, atau 8 detik."
    }, 400);
  }

  // -------------------------------------------------------
  // Aspect ratio
  // -------------------------------------------------------

  if (!["16:9", "9:16"].includes(aspectRatio)) {
    return json({
      success: false,
      error:
        "Aspect ratio Veo hanya mendukung 16:9 atau 9:16."
    }, 400);
  }

  // -------------------------------------------------------
  // Resolution
  // -------------------------------------------------------

  if (
    !["720p", "1080p", "4k"].includes(resolution)
  ) {
    return json({
      success: false,
      error: "Resolusi Veo tidak valid."
    }, 400);
  }

  // -------------------------------------------------------
  // Veo Lite tidak mendukung 4K
  // -------------------------------------------------------

  if (
    model === "veo-3.1-lite-generate-preview" &&
    resolution === "4k"
  ) {
    return json({
      success: false,
      error:
        "Veo 3.1 Lite tidak mendukung 4K."
    }, 400);
  }

  // -------------------------------------------------------
  // 1080p / 4K wajib 8 detik
  // -------------------------------------------------------

  if (
    (resolution === "1080p" ||
      resolution === "4k") &&
    duration !== 8
  ) {
    duration = 8;
  }

  // -------------------------------------------------------
  // Image-to-video/reference membutuhkan 8 detik
  // -------------------------------------------------------

  if (imageData && duration !== 8) {
    duration = 8;
  }

  // -------------------------------------------------------
  // Build instance
  // -------------------------------------------------------

  const instance = {
    prompt: String(body.prompt).trim()
  };

  // -------------------------------------------------------
  // Character reference
  // -------------------------------------------------------

  if (imageData) {
    const parsed =
      parseDataUrl(imageData);

    if (!parsed) {
      return json({
        success: false,
        error:
          "Character reference harus berupa Data URL gambar yang valid."
      }, 400);
    }

    instance.image = {
      inlineData: {
        mimeType: parsed.mimeType,
        data: parsed.base64
      }
    };
  }

  // -------------------------------------------------------
  // Parameters
  // -------------------------------------------------------

  const parameters = {
    aspectRatio,
    durationSeconds: String(duration),
    resolution
  };

  // -------------------------------------------------------
  // Seed
  // -------------------------------------------------------

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
        error: "Seed harus berupa bilangan bulat positif."
      }, 400);
    }

    parameters.seed = seed;
  }

  // -------------------------------------------------------
  // Person generation
  // -------------------------------------------------------

  parameters.personGeneration =
    imageData
      ? "allow_adult"
      : "allow_all";

  // -------------------------------------------------------
  // API URL
  // -------------------------------------------------------

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

  const data =
    await safeJson(response);

  if (!response.ok) {
    return json({
      success: false,
      error:
        extractApiError(
          data,
          `Google Veo error (${response.status}).`
        )
    }, response.status);
  }

  const operationName =
    data?.name ||
    data?.operationName ||
    null;

  if (!operationName) {
    return json({
      success: false,
      error:
        "Veo tidak mengembalikan operation name."
    }, 502);
  }

  return json({
    success: true,
    provider: "veo",
    status: "processing",
    operationName,
    id: operationName,
    duration,
    resolution,
    aspectRatio,
    model
  });
}


// =========================================================
// MINIMAX HAILUO
// =========================================================

async function generateMiniMax(body, env) {
  const apiKey =
    env.MINIMAX_API_KEY;

  if (!apiKey) {
    return json({
      success: false,
      error:
        "MINIMAX_API_KEY belum tersedia pada runtime Cloudflare Worker."
    }, 500);
  }

  const allowedModels = [
    "MiniMax-Hailuo-2.3",
    "MiniMax-Hailuo-2.3-Fast",
    "MiniMax-Hailuo-02"
  ];

  const model =
    String(
      body.model ||
      "MiniMax-Hailuo-2.3"
    );

  if (!allowedModels.includes(model)) {
    return json({
      success: false,
      error:
        "Model MiniMax tidak valid."
    }, 400);
  }

  let duration =
    Number(body.duration || 6);

  const resolution =
    String(
      body.resolution || "768P"
    ).toUpperCase();

  const imageData =
    body.imageData || null;

  // -------------------------------------------------------
  // Duration
  // -------------------------------------------------------

  if (![6, 10].includes(duration)) {
    return json({
      success: false,
      error:
        "Durasi MiniMax harus 6 atau 10 detik."
    }, 400);
  }

  // -------------------------------------------------------
  // Resolution
  // -------------------------------------------------------

  if (
    !["512P", "768P", "1080P"].includes(
      resolution
    )
  ) {
    return json({
      success: false,
      error:
        "Resolusi MiniMax tidak valid."
    }, 400);
  }

  // -------------------------------------------------------
  // 1080P hanya 6 detik
  // -------------------------------------------------------

  if (
    resolution === "1080P" &&
    duration !== 6
  ) {
    duration = 6;
  }

  // -------------------------------------------------------
  // Image reference
  // -------------------------------------------------------

  let firstFrameImage;

  if (imageData) {
    const parsed =
      parseDataUrl(imageData);

    if (!parsed) {
      return json({
        success: false,
        error:
          "Character reference MiniMax tidak valid."
      }, 400);
    }

    firstFrameImage =
      `data:${parsed.mimeType};base64,${parsed.base64}`;
  }

  // -------------------------------------------------------
  // Request
  // -------------------------------------------------------

  const payload = {
    model,
    prompt: String(body.prompt).trim(),
    duration,
    resolution
  };

  if (firstFrameImage) {
    payload.first_frame_image =
      firstFrameImage;
  }

  const response = await fetch(
    "https://api.minimax.io/v1/video_generation",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization":
          `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    }
  );

  const data =
    await safeJson(response);

  if (!response.ok) {
    return json({
      success: false,
      error:
        extractApiError(
          data,
          `MiniMax error (${response.status}).`
        )
    }, response.status);
  }

  const taskId =
    data?.task_id ||
    data?.taskId ||
    data?.id ||
    null;

  if (!taskId) {
    return json({
      success: false,
      error:
        "MiniMax tidak mengembalikan task ID."
    }, 502);
  }

  return json({
    success: true,
    provider: "minimax",
    status: "processing",
    taskId,
    id: taskId,
    model,
    duration,
    resolution
  });
}


// =========================================================
// LUMA DREAM MACHINE
// =========================================================

async function generateLuma(body, env) {
  const apiKey =
  env.LUMA_API_KEY ||
  env.LUMA_API_KEY1;

  if (!apiKey) {
    return json({
      success: false,
      error:
        "LUMA_API_KEY belum tersedia pada runtime Cloudflare Worker."
    }, 500);
  }

  // -------------------------------------------------------
  // Luma saat ini menggunakan endpoint video generation.
  // -------------------------------------------------------

  const model =
    String(
      body.model ||
      "ray-flash-2"
    );

  const allowedModels = [
    "ray-2",
    "ray-flash-2"
  ];

  if (!allowedModels.includes(model)) {
    return json({
      success: false,
      error:
        "Model Luma tidak valid."
    }, 400);
  }

  // -------------------------------------------------------
  // Luma membutuhkan public URL untuk image-to-video.
  // Data URL dari browser tidak dikirim langsung.
  // -------------------------------------------------------

  if (body.imageData) {
    return json({
      success: false,
      error:
        "Luma image-to-video membutuhkan public image URL. Character reference lokal belum dapat dikirim langsung ke Luma."
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
    String(
      body.aspectRatio || "16:9"
    );

  if (
    !allowedAspectRatios.includes(
      aspectRatio
    )
  ) {
    return json({
      success: false,
      error:
        "Aspect ratio Luma tidak valid."
    }, 400);
  }

  const payload = {
    generation_type: "video",
    prompt: String(body.prompt).trim(),
    model,
    aspect_ratio: aspectRatio
  };

  // -------------------------------------------------------
  // Optional loop
  // -------------------------------------------------------

  if (body.loop !== undefined) {
    payload.loop =
      Boolean(body.loop);
  }

  // -------------------------------------------------------
  // Optional duration
  // Hanya dikirim jika frontend memberikan nilai.
  // -------------------------------------------------------

  if (
    body.duration !== undefined &&
    body.duration !== null &&
    String(body.duration).trim() !== ""
  ) {
    const duration =
      Number(body.duration);

    if (Number.isFinite(duration)) {
      payload.duration =
        duration;
    }
  }

  // -------------------------------------------------------
  // Optional resolution
  // -------------------------------------------------------

  if (
    body.resolution !== undefined &&
    body.resolution !== null &&
    String(body.resolution).trim() !== ""
  ) {
    payload.resolution =
      String(body.resolution);
  }

  const response = await fetch(
    "https://api.lumalabs.ai/dream-machine/v1/generations/video",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization":
          `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    }
  );

  const data =
    await safeJson(response);

  if (!response.ok) {
    return json({
      success: false,
      error:
        extractApiError(
          data,
          `Luma error (${response.status}).`
        )
    }, response.status);
  }

  const id =
    data?.id ||
    data?.generation_id ||
    null;

  if (!id) {
    return json({
      success: false,
      error:
        "Luma tidak mengembalikan generation ID."
    }, 502);
  }

  return json({
    success: true,
    provider: "luma",
    status: "processing",
    id,
    generationId: id,
    model,
    aspectRatio
  });
}


// =========================================================
// STATUS ROUTER
// =========================================================

async function handleStatus(request, env) {
  const url =
    new URL(request.url);

  const provider =
    String(
      url.searchParams.get("provider") || ""
    ).toLowerCase();

  const operationName =
    url.searchParams.get(
      "operationName"
    );

  const taskId =
    url.searchParams.get(
      "taskId"
    );

  const id =
    url.searchParams.get(
      "id"
    );

  if (!provider) {
    return json({
      success: false,
      error:
        "Provider wajib diberikan."
    }, 400);
  }

  switch (provider) {
    case "veo":
      return await statusVeo(
        operationName || id,
        env
      );

    case "minimax":
      return await statusMiniMax(
        taskId || id,
        env
      );

    case "luma":
      return await statusLuma(
        id,
        env
      );

    default:
      return json({
        success: false,
        error:
          `Provider "${provider}" tidak didukung untuk polling.`
      }, 400);
  }
}


// =========================================================
// VEO STATUS
// =========================================================

async function statusVeo(
  operationName,
  env
) {
  const apiKey =
  String(body.apiKey || "").trim() ||
  env.GEMINI_API_KEY ||
  env.GEMINI_API_KEY1;

if (!apiKey) {
  return json({
    success: false,
    error:
      "API key Google Veo belum disimpan pada akun ini."
  }, 400);
}

  if (!operationName) {
    return json({
      success: false,
      error:
        "operationName Veo tidak ditemukan."
    }, 400);
  }

  const cleanName =
    String(operationName)
      .replace(/^\/+/, "");

  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/${cleanName}`;

  const response =
    await fetch(endpoint, {
      method: "GET",
      headers: {
        "x-goog-api-key": apiKey
      }
    });

  const data =
    await safeJson(response);

  if (!response.ok) {
    return json({
      success: false,
      error:
        extractApiError(
          data,
          `Veo status error (${response.status}).`
        )
    }, response.status);
  }

  // -------------------------------------------------------
  // Still processing
  // -------------------------------------------------------

  if (!data?.done) {
    return json({
      success: true,
      status: "processing",
      provider: "veo",
      operationName
    });
  }

  // -------------------------------------------------------
  // Error from operation
  // -------------------------------------------------------

  if (data?.error) {
    return json({
      success: false,
      status: "failed",
      provider: "veo",
      error:
        extractApiError(
          data.error,
          "Veo generation gagal."
        )
    }, 500);
  }

  // -------------------------------------------------------
  // Video URL
  // -------------------------------------------------------

  const videoUri =
    data?.response
      ?.generateVideoResponse
      ?.generatedSamples?.[0]
      ?.video?.uri;

  if (!videoUri) {
    return json({
      success: false,
      status: "failed",
      provider: "veo",
      error:
        "Veo selesai tetapi URL video tidak ditemukan."
    }, 502);
  }

  return json({
    success: true,
    status: "completed",
    provider: "veo",
    videoUrl:
      `${videoUri}${videoUri.includes("?") ? "&" : "?"}key=${encodeURIComponent(apiKey)}`
  });
}


// =========================================================
// MINIMAX STATUS
// =========================================================

async function statusMiniMax(
  taskId,
  env
) {
  const apiKey =
  env.MINIMAX_API_KEY ||
  env.MINIMAX_API_KEY1;

  if (!apiKey) {
    return json({
      success: false,
      error:
        "MINIMAX_API_KEY belum tersedia pada runtime Cloudflare Worker."
    }, 500);
  }

  if (!taskId) {
    return json({
      success: false,
      error:
        "Task ID MiniMax tidak ditemukan."
    }, 400);
  }

  const endpoint =
    `https://api.minimax.io/v1/query/video_generation?task_id=${encodeURIComponent(taskId)}`;

  const response =
    await fetch(endpoint, {
      method: "GET",
      headers: {
        "Authorization":
          `Bearer ${apiKey}`
      }
    });

  const data =
    await safeJson(response);

  if (!response.ok) {
    return json({
      success: false,
      error:
        extractApiError(
          data,
          `MiniMax status error (${response.status}).`
        )
    }, response.status);
  }

  const status =
    String(
      data?.status ||
      data?.task_status ||
      ""
    ).toLowerCase();

  // -------------------------------------------------------
  // Processing
  // -------------------------------------------------------

  if (
    [
      "pending",
      "processing",
      "queueing",
      "queued",
      "running",
      "in_progress"
    ].includes(status)
  ) {
    return json({
      success: true,
      status: "processing",
      provider: "minimax",
      taskId
    });
  }

  // -------------------------------------------------------
  // Failed
  // -------------------------------------------------------

  if (
    [
      "failed",
      "failure",
      "error"
    ].includes(status)
  ) {
    return json({
      success: false,
      status: "failed",
      provider: "minimax",
      error:
        extractApiError(
          data,
          "MiniMax generation gagal."
        )
    }, 500);
  }

  // -------------------------------------------------------
  // Find video URL
  // -------------------------------------------------------

  const downloadUrl =
    data?.file?.download_url ||
    data?.download_url ||
    data?.video_url ||
    data?.video?.url ||
    null;

  if (downloadUrl) {
    return json({
      success: true,
      status: "completed",
      provider: "minimax",
      videoUrl: downloadUrl
    });
  }

  // -------------------------------------------------------
  // Some API responses may report success with file ID.
  // -------------------------------------------------------

  const fileId =
    data?.file?.file_id ||
    data?.file_id ||
    null;

  if (
    fileId &&
    [
      "success",
      "succeeded",
      "completed",
      "finished"
    ].includes(status)
  ) {
    return json({
      success: true,
      status: "completed",
      provider: "minimax",
      videoUrl:
        `/api/video?provider=minimax&fileId=${encodeURIComponent(fileId)}`
    });
  }

  return json({
    success: true,
    status: "processing",
    provider: "minimax",
    taskId
  });
}


// =========================================================
// LUMA STATUS
// =========================================================

async function statusLuma(
  id,
  env
) {
  const apiKey =
    env.LUMA_API_KEY;

  if (!apiKey) {
    return json({
      success: false,
      error:
        "LUMA_API_KEY belum tersedia pada runtime Cloudflare Worker."
    }, 500);
  }

  if (!id) {
    return json({
      success: false,
      error:
        "Generation ID Luma tidak ditemukan."
    }, 400);
  }

  const endpoint =
    `https://api.lumalabs.ai/dream-machine/v1/generations/${encodeURIComponent(id)}`;

  const response =
    await fetch(endpoint, {
      method: "GET",
      headers: {
        "Authorization":
          `Bearer ${apiKey}`
      }
    });

  const data =
    await safeJson(response);

  if (!response.ok) {
    return json({
      success: false,
      error:
        extractApiError(
          data,
          `Luma status error (${response.status}).`
        )
    }, response.status);
  }

  const state =
    String(
      data?.state ||
      data?.status ||
      ""
    ).toLowerCase();

  // -------------------------------------------------------
  // Failed
  // -------------------------------------------------------

  if (
    [
      "failed",
      "failure",
      "error"
    ].includes(state)
  ) {
    return json({
      success: false,
      status: "failed",
      provider: "luma",
      error:
        extractApiError(
          data,
          "Luma generation gagal."
        )
    }, 500);
  }

  // -------------------------------------------------------
  // Completed
  // -------------------------------------------------------

  const videoUrl =
    data?.assets?.video ||
    data?.video?.url ||
    data?.video_url ||
    null;

  if (
    videoUrl ||
    state === "completed"
  ) {
    if (!videoUrl) {
      return json({
        success: false,
        status: "failed",
        provider: "luma",
        error:
          "Luma selesai tetapi URL video tidak ditemukan."
      }, 502);
    }

    return json({
      success: true,
      status: "completed",
      provider: "luma",
      videoUrl
    });
  }

  // -------------------------------------------------------
  // Processing
  // -------------------------------------------------------

  return json({
    success: true,
    status: "processing",
    provider: "luma",
    id,
    state
  });
}


// =========================================================
// VIDEO PROXY
// =========================================================

async function handleVideoProxy(
  request,
  env
) {
  const url =
    new URL(request.url);

  const provider =
    String(
      url.searchParams.get("provider") || ""
    ).toLowerCase();

  // =======================================================
  // VEO
  // =======================================================

  if (provider === "veo") {
    const target =
      url.searchParams.get("url");

    if (!target) {
      return json({
        success: false,
        error:
          "URL video Veo tidak diberikan."
      }, 400);
    }

    let targetUrl;

    try {
      targetUrl =
        new URL(target);
    } catch {
      return json({
        success: false,
        error:
          "URL video Veo tidak valid."
      }, 400);
    }

    const allowedHosts = [
      "generativelanguage.googleapis.com",
      "storage.googleapis.com"
    ];

    if (
      !allowedHosts.includes(
        targetUrl.hostname
      )
    ) {
      return json({
        success: false,
        error:
          "Host video Veo tidak diizinkan."
      }, 403);
    }

    const apiKey =
      env.GEMINI_API_KEY;

    if (!apiKey) {
      return json({
        success: false,
        error:
          "GEMINI_API_KEY belum tersedia."
      }, 500);
    }

    if (
      !targetUrl.searchParams.has("key")
    ) {
      targetUrl.searchParams.set(
        "key",
        apiKey
      );
    }

    const response =
      await fetch(targetUrl.toString());

    if (!response.ok) {
      return new Response(
        await response.arrayBuffer(),
        {
          status: response.status,
          headers: {
            ...corsHeaders(),
            "Content-Type":
              response.headers.get(
                "Content-Type"
              ) ||
              "application/octet-stream"
          }
        }
      );
    }

    return new Response(
      response.body,
      {
        status: response.status,
        headers: {
          ...corsHeaders(),
          "Content-Type":
            response.headers.get(
              "Content-Type"
            ) ||
            "video/mp4",
          "Cache-Control":
            "public, max-age=3600"
        }
      }
    );
  }

  // =======================================================
  // MINIMAX
  // =======================================================

  if (provider === "minimax") {
    const fileId =
      url.searchParams.get(
        "fileId"
      );

    if (!fileId) {
      return json({
        success: false,
        error:
          "fileId MiniMax tidak diberikan."
      }, 400);
    }

    const apiKey =
      env.MINIMAX_API_KEY;

    if (!apiKey) {
      return json({
        success: false,
        error:
          "MINIMAX_API_KEY belum tersedia."
      }, 500);
    }

    // -----------------------------------------------------
    // Retrieve file metadata
    // -----------------------------------------------------

    const metadataUrl =
      `https://api.minimax.io/v1/files/retrieve?file_id=${encodeURIComponent(fileId)}`;

    const metadataResponse =
      await fetch(metadataUrl, {
        headers: {
          "Authorization":
            `Bearer ${apiKey}`
        }
      });

    const metadata =
      await safeJson(
        metadataResponse
      );

    if (!metadataResponse.ok) {
      return json({
        success: false,
        error:
          extractApiError(
            metadata,
            `MiniMax file error (${metadataResponse.status}).`
          )
      }, metadataResponse.status);
    }

    const downloadUrl =
      metadata?.file?.download_url ||
      metadata?.download_url ||
      null;

    if (!downloadUrl) {
      return json({
        success: false,
        error:
          "MiniMax tidak mengembalikan download URL."
      }, 502);
    }

    let targetUrl;

    try {
      targetUrl =
        new URL(downloadUrl);
    } catch {
      return json({
        success: false,
        error:
          "Download URL MiniMax tidak valid."
      }, 502);
    }

    if (
      targetUrl.hostname !==
      "api.minimax.io"
    ) {
      return json({
        success: false,
        error:
          "Host download MiniMax tidak diizinkan."
      }, 403);
    }

    const videoResponse =
      await fetch(
        targetUrl.toString()
      );

    if (!videoResponse.ok) {
      return new Response(
        await videoResponse.arrayBuffer(),
        {
          status:
            videoResponse.status,
          headers: {
            ...corsHeaders(),
            "Content-Type":
              videoResponse.headers.get(
                "Content-Type"
              ) ||
              "application/octet-stream"
          }
        }
      );
    }

    return new Response(
      videoResponse.body,
      {
        status: 200,
        headers: {
          ...corsHeaders(),
          "Content-Type":
            videoResponse.headers.get(
              "Content-Type"
            ) ||
            "video/mp4",
          "Cache-Control":
            "public, max-age=3600"
        }
      }
    );
  }

  return json({
    success: false,
    error:
      "Provider video proxy tidak didukung."
  }, 400);
}


// =========================================================
// DATA URL PARSER
// =========================================================

function parseDataUrl(
  dataUrl
) {
  if (
    typeof dataUrl !== "string"
  ) {
    return null;
  }

  const match =
    dataUrl.match(
      /^data:([^;,]+);base64,(.+)$/s
    );

  if (!match) {
    return null;
  }

  const mimeType =
    match[1];

  const base64 =
    match[2]
      .replace(/\s/g, "");

  if (!base64) {
    return null;
  }

  if (
    !mimeType.startsWith("image/")
  ) {
    return null;
  }

  return {
    mimeType,
    base64
  };
}


// =========================================================
// SAFE JSON
// =========================================================

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


// =========================================================
// API ERROR EXTRACTOR
// =========================================================

function extractApiError(
  data,
  fallback
) {
  if (!data) {
    return fallback;
  }

  if (
    typeof data === "string"
  ) {
    return data;
  }

  if (data.error) {
    if (
      typeof data.error === "string"
    ) {
      return data.error;
    }

    if (
      data.error.message
    ) {
      return data.error.message;
    }

    try {
      return JSON.stringify(
        data.error
      );
    } catch {
      return fallback;
    }
  }

  if (data.message) {
    return String(
      data.message
    );
  }

  if (data.raw) {
    return String(
      data.raw
    );
  }

  return fallback;
}


// =========================================================
// CORS
// =========================================================

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods":
      "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization",
    "Access-Control-Max-Age":
      "86400"
  };
}


// =========================================================
// JSON RESPONSE
// =========================================================

function json(
  data,
  status = 200
) {
  return new Response(
    JSON.stringify(
      data,
      null,
      2
    ),
    {
      status,
      headers: {
        ...corsHeaders(),
        "Content-Type":
          "application/json; charset=utf-8",
        "Cache-Control":
          "no-store"
      }
    }
  );
}
