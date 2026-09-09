export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    try {
      // ==============================
      // API ROUTES
      // ==============================

      if (
        url.pathname === "/api/upload" &&
        request.method === "POST"
      ) {
        return handleUpload(request);
      }

      if (
        url.pathname === "/api/generate" &&
        request.method === "POST"
      ) {
        return handleGenerate(request, env);
      }

      if (
        url.pathname === "/api/generate" &&
        request.method === "GET"
      ) {
        return handleStatus(request, env);
      }

      if (
        url.pathname === "/api/video" &&
        request.method === "GET"
      ) {
        return handleVideoProxy(request, env);
      }

      // ==============================
      // STATIC FILES
      // ==============================

      return env.ASSETS.fetch(request);

    } catch (error) {
      return json(
        {
          success: false,
          error: error?.message || "Internal Worker error."
        },
        500
      );
    }
  }
};


/* =========================================================
   RESPONSE
========================================================= */

function json(data, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*"
      }
    }
  );
}


/* =========================================================
   UPLOAD
   Tanpa R2.
   Mengubah gambar menjadi Data URL.
========================================================= */

async function handleUpload(request) {
  try {
    const form = await request.formData();

    const file = form.get("file");

    if (!(file instanceof File)) {
      return json(
        {
          success: false,
          error: "File gambar tidak ditemukan."
        },
        400
      );
    }

    if (!file.type.startsWith("image/")) {
      return json(
        {
          success: false,
          error: "File harus berupa gambar."
        },
        400
      );
    }

    const MAX_SIZE = 10 * 1024 * 1024;

    if (file.size > MAX_SIZE) {
      return json(
        {
          success: false,
          error: "Ukuran gambar maksimal 10 MB."
        },
        400
      );
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
    return json(
      {
        success: false,
        error: error?.message || "Upload gagal."
      },
      500
    );
  }
}


/* =========================================================
   GENERATE ROUTER
========================================================= */

async function handleGenerate(request, env) {
  try {
    const body = await request.json();

    if (!body || typeof body !== "object") {
      return json(
        {
          success: false,
          error: "Request tidak valid."
        },
        400
      );
    }

    const provider =
      String(body.provider || "").trim();

    const prompt =
      String(body.prompt || "").trim();

    if (!provider) {
      return json(
        {
          success: false,
          error: "Provider belum dipilih."
        },
        400
      );
    }

    if (!prompt) {
      return json(
        {
          success: false,
          error: "Prompt belum diisi."
        },
        400
      );
    }

    if (prompt.length > 2000) {
      return json(
        {
          success: false,
          error: "Prompt maksimal 2000 karakter."
        },
        400
      );
    }

    switch (provider) {

      case "veo":
        return generateVeo(body, env);

      case "minimax":
        return generateMiniMax(body, env);

      case "luma":
        return generateLuma(body, env);

      case "pollinations":
      case "fal":
      case "runway":
        return json(
          {
            success: false,
            provider,
            error:
              `Provider "${provider}" belum diaktifkan di Worker.`
          },
          400
        );

      default:
        return json(
          {
            success: false,
            error:
              `Provider "${provider}" tidak dikenal.`
          },
          400
        );
    }

  } catch (error) {
    return json(
      {
        success: false,
        error:
          error?.message ||
          "Request generate gagal."
      },
      500
    );
  }
}


/* =========================================================
   GOOGLE VEO 3.1
========================================================= */

async function generateVeo(body, env) {

  if (!env.GEMINI_API_KEY) {
    return json(
      {
        success: false,
        provider: "veo",
        error:
          "GEMINI_API_KEY belum dikonfigurasi di Cloudflare."
      },
      500
    );
  }

  const model =
    body.model ||
    "veo-3.1-fast-generate-preview";

  const duration =
    Number(body.duration || 8);

  const resolution =
    body.resolution ||
    "720p";

  const aspectRatio =
    body.aspectRatio ||
    "16:9";

  const hasImage =
    Boolean(body.imageData);


  /* =======================================================
     VALIDASI MODEL
  ======================================================= */

  const allowedModels = [
    "veo-3.1-generate-preview",
    "veo-3.1-fast-generate-preview",
    "veo-3.1-lite-generate-preview"
  ];

  if (!allowedModels.includes(model)) {
    return json(
      {
        success: false,
        provider: "veo",
        error:
          `Model Veo tidak valid: ${model}`
      },
      400
    );
  }


  /* =======================================================
     VALIDASI ASPECT RATIO
  ======================================================= */

  if (
    !["16:9", "9:16"].includes(
      aspectRatio
    )
  ) {
    return json(
      {
        success: false,
        provider: "veo",
        error:
          "Aspect ratio Veo hanya 16:9 atau 9:16."
      },
      400
    );
  }


  /* =======================================================
     VALIDASI DURASI
  ======================================================= */

  if (
    ![4, 6, 8].includes(
      duration
    )
  ) {
    return json(
      {
        success: false,
        provider: "veo",
        error:
          "Durasi Veo hanya 4, 6, atau 8 detik."
      },
      400
    );
  }


  /* =======================================================
     VALIDASI RESOLUSI
  ======================================================= */

  const allowedResolutions =
    model === "veo-3.1-lite-generate-preview"
      ? ["720p", "1080p"]
      : ["720p", "1080p", "4k"];

  if (
    !allowedResolutions.includes(
      resolution
    )
  ) {
    return json(
      {
        success: false,
        provider: "veo",
        error:
          `Resolusi ${resolution} tidak tersedia untuk ${model}.`
      },
      400
    );
  }


  /* =======================================================
     1080P / 4K = WAJIB 8 DETIK
  ======================================================= */

  if (
    (
      resolution === "1080p" ||
      resolution === "4k"
    ) &&
    duration !== 8
  ) {
    return json(
      {
        success: false,
        provider: "veo",
        error:
          `${resolution} pada Veo membutuhkan durasi 8 detik.`
      },
      400
    );
  }


  /* =======================================================
     CHARACTER REFERENCE / IMAGE INPUT
  ======================================================= */

  if (
    hasImage &&
    duration !== 8
  ) {
    return json(
      {
        success: false,
        provider: "veo",
        error:
          "Character Reference membutuhkan durasi 8 detik pada Veo 3.1."
      },
      400
    );
  }


  /* =======================================================
     IMAGE DATA
  ======================================================= */

  const instance = {
    prompt: body.prompt
  };

  if (hasImage) {

    let parsed;

    try {
      parsed =
        parseDataUrl(
          body.imageData
        );
    } catch (error) {
      return json(
        {
          success: false,
          provider: "veo",
          error:
            "Format gambar Character Reference tidak valid."
        },
        400
      );
    }

    instance.image = {
      inlineData: {
        mimeType:
          parsed.mimeType,
        data:
          parsed.base64
      }
    };
  }


  /* =======================================================
     PARAMETERS
  ======================================================= */

  const parameters = {
    aspectRatio,
    durationSeconds:
      String(duration),
    resolution
  };


  /* =======================================================
     SEED
  ======================================================= */

  if (
    body.seed !== undefined &&
    body.seed !== null &&
    body.seed !== ""
  ) {

    const seed =
      Number(body.seed);

    if (
      Number.isInteger(seed) &&
      seed >= 0
    ) {
      parameters.seed =
        seed;
    }
  }


  /* =======================================================
     PERSON GENERATION
  ======================================================= */

  if (hasImage) {
    parameters.personGeneration =
      "allow_adult";
  }


  /* =======================================================
     API REQUEST
  ======================================================= */

  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:predictLongRunning`;

  const response =
    await fetch(
      endpoint,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "x-goog-api-key":
            env.GEMINI_API_KEY
        },

        body:
          JSON.stringify({
            instances: [
              instance
            ],
            parameters
          })
      }
    );


  const text =
    await response.text();

  if (!response.ok) {

    return json(
      {
        success: false,
        provider: "veo",
        error:
          extractProviderError(
            text,
            response.status
          )
      },
      response.status
    );
  }


  let data;

  try {
    data =
      JSON.parse(text);
  } catch {
    return json(
      {
        success: false,
        provider: "veo",
        error:
          "Response Veo tidak valid."
      },
      502
    );
  }


  if (!data.name) {
    return json(
      {
        success: false,
        provider: "veo",
        error:
          "Veo tidak mengembalikan operation name."
      },
      502
    );
  }


  return json({
    success: true,
    provider: "veo",
    status: "processing",
    operationName: data.name,
    message:
      "Veo sedang membuat video."
  });
}


/* =========================================================
   VEO STATUS
========================================================= */

async function getVeoStatus(
  operationName,
  env
) {

  if (!env.GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY belum dikonfigurasi."
    );
  }

  if (!operationName) {
    throw new Error(
      "Operation name tidak ditemukan."
    );
  }


  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/${operationName}`;


  const response =
    await fetch(
      endpoint,
      {
        headers: {
          "x-goog-api-key":
            env.GEMINI_API_KEY
        }
      }
    );


  const text =
    await response.text();


  if (!response.ok) {
    throw new Error(
      extractProviderError(
        text,
        response.status
      )
    );
  }


  let data;

  try {
    data =
      JSON.parse(text);
  } catch {
    throw new Error(
      "Response status Veo tidak valid."
    );
  }


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
      error:
        data.error.message ||
        "Veo gagal membuat video."
    };
  }


  const sample =
    data
      ?.response
      ?.generateVideoResponse
      ?.generatedSamples?.[0];


  const videoUri =
    sample?.video?.uri;


  if (!videoUri) {

    return {
      success: false,
      provider: "veo",
      status: "failed",
      error:
        "Veo selesai tetapi URL video tidak ditemukan."
    };
  }


  return {
    success: true,
    provider: "veo",
    status: "completed",

    videoUrl:
      `/api/video?provider=veo&url=${encodeURIComponent(videoUri)}`
  };
}


/* =========================================================
   MINIMAX / HAILUO
========================================================= */

async function generateMiniMax(
  body,
  env
) {

  if (!env.MINIMAX_API_KEY) {
    return json(
      {
        success: false,
        provider: "minimax",
        error:
          "MINIMAX_API_KEY belum dikonfigurasi."
      },
      500
    );
  }


  const model =
    body.model ||
    "MiniMax-Hailuo-2.3";

  const payload = {
    model,
    prompt:
      body.prompt
  };


  /* IMAGE */

  if (body.imageData) {

    if (
      !String(
        body.imageData
      ).startsWith("data:image/")
    ) {
      return json(
        {
          success: false,
          provider: "minimax",
          error:
            "Format Character Reference MiniMax tidak valid."
        },
        400
      );
    }

    payload.first_frame_image =
      body.imageData;
  }


  /* DURATION */

  if (body.duration) {

    const duration =
      Number(body.duration);

    if (
      ![6, 10].includes(
        duration
      )
    ) {
      return json(
        {
          success: false,
          provider: "minimax",
          error:
            "Durasi MiniMax harus 6 atau 10 detik."
        },
        400
      );
    }

    payload.duration =
      duration;
  }


  /* RESOLUTION */

  if (body.resolution) {

    const resolution =
      String(
        body.resolution
      );

    if (
      !["768P", "1080P"].includes(
        resolution
      )
    ) {
      return json(
        {
          success: false,
          provider: "minimax",
          error:
            "Resolusi MiniMax harus 768P atau 1080P."
        },
        400
      );
    }

    payload.resolution =
      resolution;
  }


  const response =
    await fetch(
      "https://api.minimax.io/v1/video_generation",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "Authorization":
            `Bearer ${env.MINIMAX_API_KEY}`
        },

        body:
          JSON.stringify(payload)
      }
    );


  const text =
    await response.text();


  if (!response.ok) {
    return json(
      {
        success: false,
        provider: "minimax",
        error:
          extractProviderError(
            text,
            response.status
          )
      },
      response.status
    );
  }


  let data;

  try {
    data =
      JSON.parse(text);
  } catch {
    return json(
      {
        success: false,
        provider: "minimax",
        error:
          "Response MiniMax tidak valid."
      },
      502
    );
  }


  const taskId =
    data.task_id ||
    data.id;


  if (!taskId) {
    return json(
      {
        success: false,
        provider: "minimax",
        error:
          "MiniMax tidak mengembalikan task ID."
      },
      502
    );
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

async function getMiniMaxStatus(
  taskId,
  env
) {

  const endpoint =
    `https://api.minimax.io/v1/query/video_generation?task_id=${encodeURIComponent(taskId)}`;


  const response =
    await fetch(
      endpoint,
      {
        headers: {
          "Authorization":
            `Bearer ${env.MINIMAX_API_KEY}`
        }
      }
    );


  const text =
    await response.text();


  if (!response.ok) {
    throw new Error(
      extractProviderError(
        text,
        response.status
      )
    );
  }


  let data;

  try {
    data =
      JSON.parse(text);
  } catch {
    throw new Error(
      "Response status MiniMax tidak valid."
    );
  }


  const status =
    String(
      data.status ||
      data.task_status ||
      "processing"
    ).toLowerCase();


  /* COMPLETED */

  if (
    [
      "success",
      "completed",
      "succeeded"
    ].includes(status)
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


    const fileText =
      await fileResponse.text();


    if (!fileResponse.ok) {
      throw new Error(
        extractProviderError(
          fileText,
          fileResponse.status
        )
      );
    }


    let fileData;

    try {
      fileData =
        JSON.parse(fileText);
    } catch {
      throw new Error(
        "Response file MiniMax tidak valid."
      );
    }


    const videoUrl =
      fileData?.file?.download_url ||
      fileData?.download_url;


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


  /* FAILED */

  if (
    [
      "fail",
      "failed",
      "failure"
    ].includes(status)
  ) {

    return {
      success: false,
      provider: "minimax",
      status: "failed",

      error:
        data.base_resp?.status_msg ||
        data.error ||
        data.message ||
        "MiniMax gagal membuat video."
    };
  }


  /* PROCESSING */

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

async function generateLuma(
  body,
  env
) {

  if (!env.LUMA_API_KEY) {
    return json(
      {
        success: false,
        provider: "luma",
        error:
          "LUMA_API_KEY belum dikonfigurasi."
      },
      500
    );
  }


  /*
   * Tanpa R2/CDN publik,
   * image-to-video Luma belum digunakan.
   */

  if (body.imageData) {
    return json(
      {
        success: false,
        provider: "luma",
        error:
          "Luma Character Reference membutuhkan URL gambar publik. Saat ini Luma digunakan untuk Text-to-Video."
      },
      400
    );
  }


  const model =
    body.model ||
    "ray-flash-2";


  const payload = {
    prompt:
      body.prompt,

    model
  };


  if (body.aspectRatio) {
    payload.aspect_ratio =
      body.aspectRatio;
  }


  if (body.duration) {

    const duration =
      Number(body.duration);

    payload.duration =
      `${duration}s`;
  }


  const response =
    await fetch(
      "https://api.lumalabs.ai/dream-machine/v1/generations",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "Authorization":
            `Bearer ${env.LUMA_API_KEY}`
        },

        body:
          JSON.stringify(payload)
      }
    );


  const text =
    await response.text();


  if (!response.ok) {
    return json(
      {
        success: false,
        provider: "luma",
        error:
          extractProviderError(
            text,
            response.status
          )
      },
      response.status
    );
  }


  let data;

  try {
    data =
      JSON.parse(text);
  } catch {
    return json(
      {
        success: false,
        provider: "luma",
        error:
          "Response Luma tidak valid."
      },
      502
    );
  }


  if (!data.id) {
    return json(
      {
        success: false,
        provider: "luma",
        error:
          "Luma tidak mengembalikan generation ID."
      },
      502
    );
  }


  return json({
    success: true,
    provider: "luma",
    status: "processing",
    generationId:
      data.id
  });
}


/* =========================================================
   LUMA STATUS
========================================================= */

async function getLumaStatus(
  id,
  env
) {

  const response =
    await fetch(
      `https://api.lumalabs.ai/dream-machine/v1/generations/${encodeURIComponent(id)}`,
      {
        headers: {
          "Authorization":
            `Bearer ${env.LUMA_API_KEY}`
        }
      }
    );


  const text =
    await response.text();


  if (!response.ok) {
    throw new Error(
      extractProviderError(
        text,
        response.status
      )
    );
  }


  let data;

  try {
    data =
      JSON.parse(text);
  } catch {
    throw new Error(
      "Response status Luma tidak valid."
    );
  }


  const state =
    String(
      data.state ||
      data.status ||
      "dreaming"
    ).toLowerCase();


  if (
    [
      "completed",
      "success",
      "succeeded"
    ].includes(state)
  ) {

    const videoUrl =
      data.assets?.video ||
      data.video?.url;


    if (!videoUrl) {
      throw new Error(
        "Luma selesai tetapi URL video tidak ditemukan."
      );
    }


    return {
      success: true,
      provider: "luma",
      status: "completed",
      videoUrl
    };
  }


  if (
    [
      "failed",
      "error"
    ].includes(state)
  ) {

    return {
      success: false,
      provider: "luma",
      status: "failed",
      error:
        data.failure_reason ||
        data.error ||
        "Luma gagal membuat video."
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
   STATUS ROUTER
========================================================= */

async function handleStatus(
  request,
  env
) {

  try {

    const url =
      new URL(request.url);


    const provider =
      url.searchParams.get(
        "provider"
      );


    const id =
      url.searchParams.get("id") ||
      url.searchParams.get("operationName") ||
      url.searchParams.get("taskId");


    if (!provider || !id) {
      return json(
        {
          success: false,
          error:
            "Provider atau ID tidak ditemukan."
        },
        400
      );
    }


    if (provider === "veo") {
      return json(
        await getVeoStatus(
          id,
          env
        )
      );
    }


    if (provider === "minimax") {
      return json(
        await getMiniMaxStatus(
          id,
          env
        )
      );
    }


    if (provider === "luma") {
      return json(
        await getLumaStatus(
          id,
          env
        )
      );
    }


    return json(
      {
        success: false,
        error:
          "Provider status tidak dikenal."
      },
      400
    );

  } catch (error) {

    return json(
      {
        success: false,
        error:
          error?.message ||
          "Gagal mengambil status."
      },
      500
    );
  }
}


/* =========================================================
   VIDEO PROXY
========================================================= */

async function handleVideoProxy(
  request,
  env
) {

  try {

    const url =
      new URL(request.url);


    const provider =
      url.searchParams.get(
        "provider"
      );


    const target =
      url.searchParams.get(
        "url"
      );


    if (!target) {
      return new Response(
        "Video URL tidak ditemukan.",
        {
          status: 400
        }
      );
    }


    /*
     * Jangan izinkan proxy URL sembarangan.
     * Ini mencegah Worker dijadikan open proxy.
     */

    let targetUrl;

    try {
      targetUrl =
        new URL(target);
    } catch {
      return new Response(
        "URL video tidak valid.",
        {
          status: 400
        }
      );
    }


    const allowedHosts = [
      "generativelanguage.googleapis.com",
      "storage.googleapis.com",
      "api.minimax.io",
      "api.lumalabs.ai"
    ];


    const allowed =
      allowedHosts.some(
        host =>
          targetUrl.hostname === host ||
          targetUrl.hostname.endsWith(
            `.${host}`
          )
      );


    if (!allowed) {
      return new Response(
        "Host video tidak diizinkan.",
        {
          status: 403
        }
      );
    }


    const headers =
      new Headers();


    if (
      provider === "veo"
    ) {

      if (!env.GEMINI_API_KEY) {
        return new Response(
          "GEMINI_API_KEY belum dikonfigurasi.",
          {
            status: 500
          }
        );
      }

      headers.set(
        "x-goog-api-key",
        env.GEMINI_API_KEY
      );
    }


    if (
      provider === "minimax"
    ) {

      if (!env.MINIMAX_API_KEY) {
        return new Response(
          "MINIMAX_API_KEY belum dikonfigurasi.",
          {
            status: 500
          }
        );
      }

      headers.set(
        "Authorization",
        `Bearer ${env.MINIMAX_API_KEY}`
      );
    }


    if (
      provider === "luma"
    ) {

      if (!env.LUMA_API_KEY) {
        return new Response(
          "LUMA_API_KEY belum dikonfigurasi.",
          {
            status: 500
          }
        );
      }

      headers.set(
        "Authorization",
        `Bearer ${env.LUMA_API_KEY}`
      );
    }


    const response =
      await fetch(
        targetUrl.toString(),
        {
          method: "GET",
          headers,
          redirect: "follow"
        }
      );


    if (!response.ok) {

      const errorText =
        await response.text();

      return new Response(
        errorText ||
          "Gagal mengambil video.",
        {
          status:
            response.status,

          headers: {
            "Content-Type":
              "text/plain; charset=utf-8"
          }
        }
      );
    }


    const responseHeaders =
      new Headers(
        response.headers
      );


    responseHeaders.set(
      "Cache-Control",
      "no-store"
    );


    responseHeaders.set(
      "Access-Control-Allow-Origin",
      "*"
    );


    /*
     * Jangan memaksa Content-Type.
     * Provider sudah mengirim MIME yang benar.
     */

    return new Response(
      response.body,
      {
        status:
          response.status,

        headers:
          responseHeaders
      }
    );

  } catch (error) {

    return new Response(
      error?.message ||
        "Video proxy gagal.",
      {
        status: 500,
        headers: {
          "Content-Type":
            "text/plain; charset=utf-8"
        }
      }
    );
  }
}


/* =========================================================
   DATA URL PARSER
========================================================= */

function parseDataUrl(
  dataUrl
) {

  if (
    typeof dataUrl !== "string"
  ) {
    throw new Error(
      "Data URL tidak valid."
    );
  }


  const match =
    dataUrl.match(
      /^data:([^;,]+);base64,(.+)$/s
    );


  if (!match) {
    throw new Error(
      "Format Data URL tidak valid."
    );
  }


  return {
    mimeType:
      match[1],

    base64:
      match[2]
  };
}


/* =========================================================
   UINT8 → BASE64
========================================================= */

function uint8ToBase64(
  bytes
) {

  let binary = "";

  const chunkSize =
    0x8000;


  for (
    let i = 0;
    i < bytes.length;
    i += chunkSize
  ) {

    const chunk =
      bytes.subarray(
        i,
        Math.min(
          i + chunkSize,
          bytes.length
        )
      );

    binary +=
      String.fromCharCode(
        ...chunk
      );
  }


  return btoa(binary);
}


/* =========================================================
   PROVIDER ERROR PARSER
========================================================= */

function extractProviderError(
  text,
  status
) {

  let message = "";


  try {

    const data =
      JSON.parse(text);


    message =
      data?.error?.message ||
      data?.message ||
      data?.base_resp?.status_msg ||
      data?.error ||
      "";

  } catch {
    // Response bukan JSON.
  }


  if (!message) {

    message =
      text
        ?.replace(/\s+/g, " ")
        ?.trim()
        ?.slice(0, 500);
  }


  return (
    message ||
    `Provider mengembalikan HTTP ${status}.`
  );
}
