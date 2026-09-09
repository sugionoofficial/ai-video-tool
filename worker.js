"use strict";

/*
 * GEN-Z.AI Cloudflare Worker
 *
 * Routes:
 *
 * POST /api/upload
 * GET  /api/assets/:key
 *
 * POST /api/generate
 * GET  /api/generate?provider=...&id=...
 */

const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp"
];

const ALLOWED_PROVIDERS = [
  "veo",
  "luma",
  "minimax"
];

function json(data, status = 200, origin = "*") {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
    }
  });
}

function cors(request) {
  const origin = request.headers.get("Origin");

  return origin || "*";
}

function error(message, status = 400, origin = "*") {
  return json(
    {
      success: false,
      error: message
    },
    status,
    origin
  );
}

function randomId() {
  return crypto.randomUUID().replaceAll("-", "");
}

function extensionFromType(type) {
  switch (type) {
    case "image/jpeg":
      return "jpg";

    case "image/png":
      return "png";

    case "image/webp":
      return "webp";

    default:
      return "bin";
  }
}


/* =========================================================
   UPLOAD
   ========================================================= */

async function handleUpload(request, env) {

  const origin = cors(request);

  const contentLength =
    Number(request.headers.get("Content-Length") || 0);

  if (contentLength > MAX_UPLOAD_SIZE) {
    return error(
      "Ukuran gambar maksimal 10 MB.",
      413,
      origin
    );
  }

  const form = await request.formData();

  const file = form.get("file");

  if (!(file instanceof File)) {
    return error(
      "File gambar tidak ditemukan.",
      400,
      origin
    );
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return error(
      "Format gambar harus JPG, PNG, atau WEBP.",
      415,
      origin
    );
  }

  if (file.size > MAX_UPLOAD_SIZE) {
    return error(
      "Ukuran gambar maksimal 10 MB.",
      413,
      origin
    );
  }

  const extension =
    extensionFromType(file.type);

  const key =
    `characters/${new Date().toISOString().slice(0, 10)}/${randomId()}.${extension}`;

  await env.GENZ_MEDIA.put(
    key,
    file.stream(),
    {
      httpMetadata: {
        contentType: file.type,
        cacheControl: "public, max-age=86400"
      }
    }
  );

  const baseUrl =
    new URL(request.url).origin;

  const publicUrl =
    `${baseUrl}/api/assets/${encodeURIComponent(key)}`;

  return json(
    {
      success: true,
      key,
      url: publicUrl,
      type: file.type,
      size: file.size
    },
    200,
    origin
  );
}


/* =========================================================
   R2 ASSET
   ========================================================= */

async function handleAsset(request, env, key) {

  const object =
    await env.GENZ_MEDIA.get(key);

  if (!object) {
    return new Response(
      "File tidak ditemukan.",
      {
        status: 404
      }
    );
  }

  const headers =
    new Headers();

  object.writeHttpMetadata(headers);

  headers.set(
    "etag",
    object.httpEtag
  );

  headers.set(
    "Cache-Control",
    "public, max-age=86400"
  );

  return new Response(
    object.body,
    {
      headers
    }
  );
}


/* =========================================================
   MAIN GENERATE ROUTER
   ========================================================= */

async function handleGenerate(request, env) {

  const origin = cors(request);

  if (request.method === "GET") {
    return handleGenerationStatus(
      request,
      env,
      origin
    );
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return error(
      "Request JSON tidak valid.",
      400,
      origin
    );
  }

  const provider =
    String(body.provider || "")
      .toLowerCase();

  if (!ALLOWED_PROVIDERS.includes(provider)) {
    return error(
      `Provider tidak didukung: ${provider}`,
      400,
      origin
    );
  }

  try {

    switch (provider) {

      case "veo":
        return await generateVeo(
          body,
          env,
          origin
        );

      case "luma":
        return await generateLuma(
          body,
          env,
          origin
        );

      case "minimax":
        return await generateMiniMax(
          body,
          env,
          origin
        );

      default:
        return error(
          "Provider tidak tersedia.",
          400,
          origin
        );
    }

  } catch (err) {

    console.error(
      "Generation error:",
      err
    );

    return error(
      err.message ||
      "Gagal membuat video.",
      500,
      origin
    );
  }
}


/* =========================================================
   VEO
   ========================================================= */

async function generateVeo(
  body,
  env,
  origin
) {

  if (!env.GEMINI_API_KEY) {
    return error(
      "GEMINI_API_KEY belum dikonfigurasi.",
      500,
      origin
    );
  }

  const model =
    body.model ||
    "veo-3.1-generate-preview";

  const prompt =
    String(body.prompt || "").trim();

  if (!prompt) {
    return error(
      "Prompt tidak boleh kosong.",
      400,
      origin
    );
  }

  const instance = {
    prompt
  };

  if (body.imageUrl) {

    const imageResponse =
      await fetch(body.imageUrl);

    if (!imageResponse.ok) {
      throw new Error(
        "Gagal mengambil gambar karakter."
      );
    }

    const blob =
      await imageResponse.blob();

    const buffer =
      await blob.arrayBuffer();

    const base64 =
      arrayBufferToBase64(buffer);

    instance.image = {
      inlineData: {
        mimeType:
          blob.type ||
          "image/jpeg",

        data: base64
      }
    };
  }

  const parameters = {
    aspectRatio:
      body.aspectRatio === "9:16"
        ? "9:16"
        : "16:9",

    durationSeconds:
      String(
        Number(body.duration || 8)
      ),

    resolution:
      body.resolution ||
      "720p",

    numberOfVideos: 1
  };

  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:predictLongRunning`;

  const response =
    await fetch(endpoint, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key":
          env.GEMINI_API_KEY
      },

      body: JSON.stringify({
        instances: [instance],
        parameters
      })
    });

  const data =
    await response.json();

  if (!response.ok) {

    throw new Error(
      data?.error?.message ||
      "Veo gagal menerima request."
    );
  }

  return json(
    {
      success: true,
      provider: "veo",
      status: "processing",
      operationId: data.name
    },
    202,
    origin
  );
}


/* =========================================================
   LUMA
   ========================================================= */

async function generateLuma(
  body,
  env,
  origin
) {

  if (!env.LUMA_API_KEY) {
    return error(
      "LUMA_API_KEY belum dikonfigurasi.",
      500,
      origin
    );
  }

  const prompt =
    String(body.prompt || "").trim();

  if (!prompt) {
    return error(
      "Prompt tidak boleh kosong.",
      400,
      origin
    );
  }

  const payload = {

    prompt,

    model:
      body.model ||
      "ray-2",

    aspect_ratio:
      body.aspectRatio ||
      "16:9",

    resolution:
      body.resolution ||
      "720p",

    duration:
      `${Number(body.duration || 5)}s`
  };

  if (body.imageUrl) {

    payload.keyframes = {

      frame0: {
        type: "image",
        url: body.imageUrl
      }

    };
  }

  const response =
    await fetch(
      "https://api.lumalabs.ai/dream-machine/v1/generations",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "Accept":
            "application/json",

          "Authorization":
            `Bearer ${env.LUMA_API_KEY}`
        },

        body:
          JSON.stringify(payload)
      }
    );

  const data =
    await response.json();

  if (!response.ok) {

    throw new Error(
      data?.failure_reason ||
      data?.message ||
      "Luma gagal menerima request."
    );
  }

  return json(
    {
      success: true,
      provider: "luma",
      status: "processing",
      generationId: data.id
    },
    202,
    origin
  );
}


/* =========================================================
   MINIMAX
   ========================================================= */

async function generateMiniMax(
  body,
  env,
  origin
) {

  if (!env.MINIMAX_API_KEY) {
    return error(
      "MINIMAX_API_KEY belum dikonfigurasi.",
      500,
      origin
    );
  }

  const prompt =
    String(body.prompt || "").trim();

  if (!prompt) {
    return error(
      "Prompt tidak boleh kosong.",
      400,
      origin
    );
  }

  const payload = {

    model:
      body.model ||
      "MiniMax-Hailuo-2.3",

    prompt,

    duration:
      Number(body.duration || 6),

    resolution:
      body.resolution ||
      "768P",

    prompt_optimizer:
      body.promptOptimizer !== false
  };

  if (body.imageUrl) {

    payload.first_frame_image =
      body.imageUrl;
  }

  const response =
    await fetch(
      "https://api.minimax.io/v1/video_generation",
      {
        method: "POST",

        headers: {
          "Authorization":
            `Bearer ${env.MINIMAX_API_KEY}`,

          "Content-Type":
            "application/json"
        },

        body:
          JSON.stringify(payload)
      }
    );

  const data =
    await response.json();

  if (!response.ok) {

    throw new Error(
      data?.base_resp?.status_msg ||
      data?.error ||
      "MiniMax gagal menerima request."
    );
  }

  if (
    data?.base_resp &&
    data.base_resp.status_code !== 0
  ) {

    throw new Error(
      data.base_resp.status_msg ||
      "MiniMax menolak request."
    );
  }

  return json(
    {
      success: true,
      provider: "minimax",
      status: "processing",
      taskId: data.task_id
    },
    202,
    origin
  );
}


/* =========================================================
   STATUS
   ========================================================= */

async function handleGenerationStatus(
  request,
  env,
  origin
) {

  const url =
    new URL(request.url);

  const provider =
    url.searchParams
      .get("provider");

  const id =
    url.searchParams
      .get("id");

  if (!provider || !id) {
    return error(
      "Provider dan ID diperlukan.",
      400,
      origin
    );
  }

  try {

    switch (provider) {

      case "veo":
        return await veoStatus(
          id,
          env,
          origin
        );

      case "luma":
        return await lumaStatus(
          id,
          env,
          origin
        );

      case "minimax":
        return await minimaxStatus(
          id,
          env,
          origin
        );

      default:
        return error(
          "Provider tidak dikenal.",
          400,
          origin
        );
    }

  } catch (err) {

    console.error(
      "Status error:",
      err
    );

    return error(
      err.message ||
      "Gagal mengecek status.",
      500,
      origin
    );
  }
}


/* =========================================================
   VEO STATUS
   ========================================================= */

async function veoStatus(
  operationId,
  env,
  origin
) {

  const response =
    await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${operationId}`,
      {
        headers: {
          "x-goog-api-key":
            env.GEMINI_API_KEY
        }
      }
    );

  const data =
    await response.json();

  if (!response.ok) {

    throw new Error(
      data?.error?.message ||
      "Gagal mengecek Veo."
    );
  }

  if (!data.done) {

    return json(
      {
        success: true,
        status: "processing"
      },
      200,
      origin
    );
  }

  if (data.error) {

    return error(
      data.error.message ||
      "Veo gagal membuat video.",
      500,
      origin
    );
  }

  const video =
    data?.response
      ?.generateVideoResponse
      ?.generatedSamples?.[0]
      ?.video;

  if (!video?.uri) {

    throw new Error(
      "Video Veo belum tersedia."
    );
  }

  return json(
    {
      success: true,
      status: "completed",
      videoUrl: video.uri,
      provider: "veo"
    },
    200,
    origin
  );
}


/* =========================================================
   LUMA STATUS
   ========================================================= */

async function lumaStatus(
  generationId,
  env,
  origin
) {

  const response =
    await fetch(
      `https://api.lumalabs.ai/dream-machine/v1/generations/${generationId}`,
      {
        headers: {
          "Accept":
            "application/json",

          "Authorization":
            `Bearer ${env.LUMA_API_KEY}`
        }
      }
    );

  const data =
    await response.json();

  if (!response.ok) {

    throw new Error(
      data?.failure_reason ||
      "Gagal mengecek Luma."
    );
  }

  if (data.state === "completed") {

    const videoUrl =
      data?.assets?.video;

    return json(
      {
        success: true,
        status: "completed",
        videoUrl,
        provider: "luma"
      },
      200,
      origin
    );
  }

  if (data.state === "failed") {

    return error(
      data.failure_reason ||
      "Luma gagal membuat video.",
      500,
      origin
    );
  }

  return json(
    {
      success: true,
      status: "processing"
    },
    200,
    origin
  );
}


/* =========================================================
   MINIMAX STATUS
   ========================================================= */

async function minimaxStatus(
  taskId,
  env,
  origin
) {

  const response =
    await fetch(
      `https://api.minimax.io/v1/query/video_generation?task_id=${encodeURIComponent(taskId)}`,
      {
        headers: {
          "Authorization":
            `Bearer ${env.MINIMAX_API_KEY}`
        }
      }
    );

  const data =
    await response.json();

  if (!response.ok) {

    throw new Error(
      data?.base_resp?.status_msg ||
      "Gagal mengecek MiniMax."
    );
  }

  const status =
    data?.status ||
    data?.task_status;

  if (
    status === "Success" ||
    status === "success"
  ) {

    const fileId =
      data?.file_id;

    if (!fileId) {

      throw new Error(
        "MiniMax selesai tetapi file ID tidak ditemukan."
      );
    }

    const fileResponse =
      await fetch(
        `https://api.minimax.io/v1/files/retrieve?file_id=${encodeURIComponent(fileId)}`,
        {
          headers: {
            "Authorization":
              `Bearer ${env.MINIMAX_API_KEY}`
          }
        }
      );

    const fileData =
      await fileResponse.json();

    if (!fileResponse.ok) {

      throw new Error(
        fileData?.base_resp?.status_msg ||
        "Gagal mengambil video MiniMax."
      );
    }

    const videoUrl =
      fileData?.file?.download_url ||
      fileData?.download_url;

    return json(
      {
        success: true,
        status: "completed",
        videoUrl,
        provider: "minimax"
      },
      200,
      origin
    );
  }

  if (
    status === "Failed" ||
    status === "failed"
  ) {

    return error(
      data?.base_resp?.status_msg ||
      "MiniMax gagal membuat video.",
      500,
      origin
    );
  }

  return json(
    {
      success: true,
      status: "processing"
    },
    200,
    origin
  );
}


/* =========================================================
   BASE64
   ========================================================= */

function arrayBufferToBase64(buffer) {

  const bytes =
    new Uint8Array(buffer);

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
        i + chunkSize
      )
    );
  }

  return btoa(binary);
}


/* =========================================================
   WORKER
   ========================================================= */

export default {

  async fetch(request, env) {

    const origin =
      cors(request);

    if (request.method === "OPTIONS") {

      return new Response(
        null,
        {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin":
              origin,

            "Access-Control-Allow-Headers":
              "Content-Type, Authorization",

            "Access-Control-Allow-Methods":
              "GET,POST,OPTIONS"
          }
        }
      );
    }

    const url =
      new URL(request.url);

    try {

      /* UPLOAD */

      if (
        url.pathname === "/api/upload" &&
        request.method === "POST"
      ) {

        return await handleUpload(
          request,
          env
        );
      }


      /* R2 ASSETS */

      if (
        url.pathname.startsWith(
          "/api/assets/"
        ) &&
        request.method === "GET"
      ) {

        const key =
          decodeURIComponent(
            url.pathname.replace(
              "/api/assets/",
              ""
            )
          );

        return await handleAsset(
          request,
          env,
          key
        );
      }


      /* GENERATE */

      if (
        url.pathname === "/api/generate" &&
        (
          request.method === "POST" ||
          request.method === "GET"
        )
      ) {

        return await handleGenerate(
          request,
          env
        );
      }


      return new Response(
        "GEN-Z.AI Worker Online",
        {
          status: 200,
          headers: {
            "Content-Type":
              "text/plain"
          }
        }
      );

    } catch (err) {

      console.error(err);

      return error(
        "Internal Worker Error.",
        500,
        origin
      );
    }
  }

};
