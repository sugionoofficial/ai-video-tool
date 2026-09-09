export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // API
    if (url.pathname === "/api/upload" && request.method === "POST") {
      return handleUpload(request);
    }

    if (url.pathname === "/api/generate" && request.method === "POST") {
      return handleGenerate(request, env);
    }

    if (url.pathname === "/api/generate" && request.method === "GET") {
      return handleStatus(request, env);
    }

    // Proxy video untuk provider yang membutuhkan authorization
    if (url.pathname === "/api/video" && request.method === "GET") {
      return handleVideoProxy(request, env);
    }

    // Static files dari public/
    return env.ASSETS.fetch(request);
  }
};

/* =========================================================
   RESPONSE
========================================================= */

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}

/* =========================================================
   UPLOAD
   Tanpa R2.
   File diubah menjadi Data URL.
========================================================= */

async function handleUpload(request) {
  try {
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return json({
        success: false,
        error: "File gambar tidak ditemukan."
      }, 400);
    }

    if (!file.type.startsWith("image/")) {
      return json({
        success: false,
        error: "File harus berupa gambar."
      }, 400);
    }

    if (file.size > 10 * 1024 * 1024) {
      return json({
        success: false,
        error: "Ukuran gambar maksimal 10 MB."
      }, 400);
    }

    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    const base64 = uint8ToBase64(bytes);

    const imageData =
      `data:${file.type};base64,${base64}`;

    return json({
      success: true,
      filename: file.name,
      type: file.type,
      size: file.size,
      imageData
    });

  } catch (error) {
    return json({
      success: false,
      error: error.message || "Upload gagal."
    }, 500);
  }
}

/* =========================================================
   GENERATE ROUTER
========================================================= */

async function handleGenerate(request, env) {
  try {
    const body = await request.json();

    const {
      provider,
      prompt,
      imageData,
      duration,
      aspectRatio,
      seed,
      model,
      resolution
    } = body;

    if (!provider) {
      return json({
        success: false,
        error: "Provider belum dipilih."
      }, 400);
    }

    if (!prompt || !prompt.trim()) {
      return json({
        success: false,
        error: "Prompt belum diisi."
      }, 400);
    }

    switch (provider) {

      case "veo":
        return generateVeo(body, env);

      case "minimax":
        return generateMiniMax(body, env);

      case "luma":
        return generateLuma(body, env);

      default:
        return json({
          success: false,
          error: `Provider "${provider}" belum tersedia di Worker.`
        }, 400);
    }

  } catch (error) {
    return json({
      success: false,
      error: error.message || "Request generate gagal."
    }, 500);
  }
}

/* =========================================================
   GOOGLE VEO
========================================================= */

async function generateVeo(body, env) {
  if (!env.GEMINI_API_KEY) {
    return json({
      success: false,
      error: "GEMINI_API_KEY belum dikonfigurasi di Cloudflare."
    }, 500);
  }

  const model =
    body.model || "veo-3.1-fast-generate-preview";

  const instance = {
    prompt: body.prompt
  };

  if (body.imageData) {
    const parsed = parseDataUrl(body.imageData);

    instance.image = {
      inlineData: {
        mimeType: parsed.mimeType,
        data: parsed.base64
      }
    };
  }

  const parameters = {};

  if (body.aspectRatio) {
    parameters.aspectRatio = body.aspectRatio;
  }

  if (body.duration) {
    parameters.durationSeconds = Number(body.duration);
  }

  if (body.resolution) {
    parameters.resolution = body.resolution;
  }

  if (body.seed !== undefined && body.seed !== "") {
    parameters.seed = Number(body.seed);
  }

  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:predictLongRunning`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": env.GEMINI_API_KEY
    },
    body: JSON.stringify({
      instances: [instance],
      parameters
    })
  });

  const text = await response.text();

  if (!response.ok) {
    return json({
      success: false,
      error: extractProviderError(text, response.status)
    }, response.status);
  }

  const data = JSON.parse(text);

  return json({
    success: true,
    provider: "veo",
    status: "processing",
    operationName: data.name,
    message: "Veo sedang membuat video."
  });
}

/* =========================================================
   VEO STATUS
========================================================= */

async function getVeoStatus(operationName, env) {
  if (!operationName) {
    throw new Error("operationName tidak ditemukan.");
  }

  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/${operationName}`;

  const response = await fetch(endpoint, {
    headers: {
      "x-goog-api-key": env.GEMINI_API_KEY
    }
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      extractProviderError(text, response.status)
    );
  }

  const data = JSON.parse(text);

  if (!data.done) {
    return {
      success: true,
      provider: "veo",
      status: "processing",
      operationName
    };
  }

  if (data.error) {
    return {
      success: false,
      provider: "veo",
      status: "failed",
      error: data.error.message || "Veo gagal membuat video."
    };
  }

  const sample =
    data.response
      ?.generateVideoResponse
      ?.generatedSamples?.[0];

  if (!sample?.video?.uri) {
    return {
      success: false,
      provider: "veo",
      status: "failed",
      error: "Veo selesai tetapi URL video tidak ditemukan."
    };
  }

  return {
    success: true,
    provider: "veo",
    status: "completed",
    videoUrl: `/api/video?provider=veo&url=${encodeURIComponent(sample.video.uri)}`
  };
}

/* =========================================================
   MINIMAX / HAILUO
========================================================= */

async function generateMiniMax(body, env) {
  if (!env.MINIMAX_API_KEY) {
    return json({
      success: false,
      error: "MINIMAX_API_KEY belum dikonfigurasi."
    }, 500);
  }

  const payload = {
    model: body.model || "MiniMax-Hailuo-2.3",
    prompt: body.prompt
  };

  if (body.imageData) {
    payload.first_frame_image = body.imageData;
  }

  if (body.duration) {
    payload.duration = Number(body.duration);
  }

  if (body.resolution) {
    payload.resolution = body.resolution;
  }

  const response = await fetch(
    "https://api.minimax.io/v1/video_generation",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${env.MINIMAX_API_KEY}`
      },
      body: JSON.stringify(payload)
    }
  );

  const text = await response.text();

  if (!response.ok) {
    return json({
      success: false,
      error: extractProviderError(text, response.status)
    }, response.status);
  }

  const data = JSON.parse(text);

  const taskId =
    data.task_id ||
    data.id;

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
    taskId
  });
}

/* =========================================================
   MINIMAX STATUS
========================================================= */

async function getMiniMaxStatus(taskId, env) {
  const endpoint =
    `https://api.minimax.io/v1/query/video_generation?task_id=${encodeURIComponent(taskId)}`;

  const response = await fetch(endpoint, {
    headers: {
      "Authorization": `Bearer ${env.MINIMAX_API_KEY}`
    }
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      extractProviderError(text, response.status)
    );
  }

  const data = JSON.parse(text);

  const status =
    data.status ||
    data.task_status ||
    "processing";

  if (
    status === "Success" ||
    status === "SUCCESS" ||
    status === "completed"
  ) {
    const fileId =
      data.file_id ||
      data.file?.file_id ||
      data.video?.file_id;

    if (!fileId) {
      throw new Error(
        "MiniMax selesai tetapi file ID tidak ditemukan."
      );
    }

    const fileResponse = await fetch(
      `https://api.minimax.io/v1/files/retrieve?file_id=${encodeURIComponent(fileId)}`,
      {
        headers: {
          "Authorization": `Bearer ${env.MINIMAX_API_KEY}`
        }
      }
    );

    const fileText = await fileResponse.text();

    if (!fileResponse.ok) {
      throw new Error(
        extractProviderError(
          fileText,
          fileResponse.status
        )
      );
    }

    const fileData = JSON.parse(fileText);

    const videoUrl =
      fileData.file?.download_url ||
      fileData.download_url;

    if (!videoUrl) {
      throw new Error(
        "URL video MiniMax tidak ditemukan."
      );
    }

    return {
      success: true,
      provider: "minimax",
      status: "completed",
      videoUrl
    };
  }

  if (
    status === "Fail" ||
    status === "FAILED" ||
    status === "failed"
  ) {
    return {
      success: false,
      provider: "minimax",
      status: "failed",
      error:
        data.base_resp?.status_msg ||
        data.error ||
        "MiniMax gagal membuat video."
    };
  }

  return {
    success: true,
    provider: "minimax",
    status: "processing",
    taskId
  };
}

/* =========================================================
   LUMA
========================================================= */

async function generateLuma(body, env) {
  if (!env.LUMA_API_KEY) {
    return json({
      success: false,
      error: "LUMA_API_KEY belum dikonfigurasi."
    }, 500);
  }

  /*
   * Tanpa R2/CDN publik, Luma tidak dapat menerima
   * file lokal sebagai image URL.
   *
   * Text-to-video tetap dapat digunakan.
   */

  if (body.imageData) {
    return json({
      success: false,
      provider: "luma",
      error:
        "Luma image-to-video membutuhkan URL gambar publik. " +
        "Tanpa R2/CDN publik, upload karakter belum dapat digunakan untuk Luma."
    }, 400);
  }

  const payload = {
    prompt: body.prompt,
    model: body.model || "ray-flash-2"
  };

  if (body.aspectRatio) {
    payload.aspect_ratio = body.aspectRatio;
  }

  if (body.duration) {
    payload.duration = `${body.duration}s`;
  }

  const response = await fetch(
    "https://api.lumalabs.ai/dream-machine/v1/generations",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${env.LUMA_API_KEY}`
      },
      body: JSON.stringify(payload)
    }
  );

  const text = await response.text();

  if (!response.ok) {
    return json({
      success: false,
      error: extractProviderError(text, response.status)
    }, response.status);
  }

  const data = JSON.parse(text);

  return json({
    success: true,
    provider: "luma",
    status: "processing",
    generationId: data.id
  });
}

/* =========================================================
   STATUS ROUTER
========================================================= */

async function handleStatus(request, env) {
  try {
    const url = new URL(request.url);

    const provider = url.searchParams.get("provider");
    const id =
      url.searchParams.get("id") ||
      url.searchParams.get("operationName") ||
      url.searchParams.get("taskId");

    if (!provider || !id) {
      return json({
        success: false,
        error: "Provider atau ID tidak ditemukan."
      }, 400);
    }

    if (provider === "veo") {
      return json(
        await getVeoStatus(id, env)
      );
    }

    if (provider === "minimax") {
      return json(
        await getMiniMaxStatus(id, env)
      );
    }

    if (provider === "luma") {
      return json(
        await getLumaStatus(id, env)
      );
    }

    return json({
      success: false,
      error: "Provider status tidak dikenal."
    }, 400);

  } catch (error) {
    return json({
      success: false,
      error: error.message || "Gagal mengambil status."
    }, 500);
  }
}

/* =========================================================
   LUMA STATUS
========================================================= */

async function getLumaStatus(id, env) {
  const response = await fetch(
    `https://api.lumalabs.ai/dream-machine/v1/generations/${encodeURIComponent(id)}`,
    {
      headers: {
        "Authorization": `Bearer ${env.LUMA_API_KEY}`
      }
    }
  );

  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      extractProviderError(text, response.status)
    );
  }

  const data = JSON.parse(text);

  if (data.state === "completed") {
    return {
      success: true,
      provider: "luma",
      status: "completed",
      videoUrl: data.assets?.video
    };
  }

  if (data.state === "failed") {
    return {
      success: false,
      provider: "luma",
      status: "failed",
      error: data.failure_reason || "Luma gagal."
    };
  }

  return {
    success: true,
    provider: "luma",
    status: "processing",
    generationId: id
  };
}

/* =========================================================
   VEO VIDEO PROXY
========================================================= */

async function handleVideoProxy(request, env) {
  const url = new URL(request.url);

  const provider =
    url.searchParams.get("provider");

  const target =
    url.searchParams.get("url");

  if (!target) {
    return new Response(
      "Video URL tidak ditemukan.",
      { status: 400 }
    );
  }

  if (provider !== "veo") {
    return new Response(
      "Provider proxy tidak didukung.",
      { status: 400 }
    );
  }

  const response = await fetch(target, {
    headers: {
      "x-goog-api-key": env.GEMINI_API_KEY
    }
  });

  if (!response.ok) {
    return new Response(
      await response.text(),
      {
        status: response.status
      }
    );
  }

  const headers = new Headers(response.headers);

  headers.set(
    "Cache-Control",
    "no-store"
  );

  return new Response(
    response.body,
    {
      status: response.status,
      headers
    }
  );
}

/* =========================================================
   HELPERS
========================================================= */

function parseDataUrl(dataUrl) {
  const match =
    dataUrl.match(
      /^data:([^;]+);base64,(.+)$/
    );

  if (!match) {
    throw new Error(
      "Format imageData tidak valid."
    );
  }

  return {
    mimeType: match[1],
    base64: match[2]
  };
}

function uint8ToBase64(bytes) {
  let binary = "";

  const chunkSize = 0x8000;

  for (
    let i = 0;
    i < bytes.length;
    i += chunkSize
  ) {
    binary += String.fromCharCode(
      ...bytes.subarray(
        i,
        Math.min(
          i + chunkSize,
          bytes.length
        )
      )
    );
  }

  return btoa(binary);
}

function extractProviderError(text, status) {
  try {
    const data = JSON.parse(text);

    return (
      data.error?.message ||
      data.message ||
      data.base_resp?.status_msg ||
      `Provider error (${status})`
    );
  } catch {
    return text || `Provider error (${status})`;
  }
}
