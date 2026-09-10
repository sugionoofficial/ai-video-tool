"use strict";

/* =========================================================
   GEN-Z.AI
   Global Video Generator
   Supabase Account + Per-user API Keys
========================================================= */

const state = {
  provider: "veo",
  imageData: null,
  imageMimeType: null,
  generating: false,
  pollTimer: null,
  pollAttempts: 0,
  pollMaxAttempts: 120,
  videoUrl: null,
  videoObjectUrl: null
};

/* =========================================================
   PROVIDERS
========================================================= */

const PROVIDERS = {

  pollinations: {
    name: "Pollinations",
    badge: "AI VIDEO",
    description: "Pollinations AI Video",
    active: false,
    models: [
      {
        id: "seedance-2.5",
        name: "Seedance 2.5"
      }
    ],
    durations: [5, 10],
    aspects: ["16:9", "9:16", "1:1"],
    resolutions: ["720p"],
    imageToVideo: true
  },

  fal: {
    name: "fal.ai",
    badge: "AI VIDEO",
    description: "fal.ai Video Generation",
    active: false,
    models: [
      {
        id: "wan",
        name: "Wan"
      }
    ],
    durations: [5, 10],
    aspects: ["16:9", "9:16"],
    resolutions: ["720p", "1080p"],
    imageToVideo: true
  },

  runway: {
    name: "Runway",
    badge: "AI VIDEO",
    description: "Runway Video Generation",
    active: false,
    models: [
      {
        id: "gen4_turbo",
        name: "Gen-4 Turbo"
      }
    ],
    durations: [5, 10],
    aspects: ["16:9", "9:16"],
    resolutions: ["720p", "1080p"],
    imageToVideo: true
  },

  veo: {
    name: "Gemini",
    badge: "ACTIVE",
    description: "Google Veo 3.1",
    active: true,
    models: [
      {
        id: "veo-3.1-fast-generate-preview",
        name: "Veo 3.1 Fast"
      },
      {
        id: "veo-3.1-generate-preview",
        name: "Veo 3.1"
      },
      {
        id: "veo-3.1-lite-generate-preview",
        name: "Veo 3.1 Lite"
      }
    ],
    durations: [4, 6, 8],
    aspects: ["16:9", "9:16"],
    resolutions: ["720p", "1080p", "4k"],
    imageToVideo: true,
    nativeAudio: true
  },

  luma: {
    name: "Luma",
    badge: "ACTIVE",
    description: "Luma Dream Machine",
    active: true,
    models: [
      {
        id: "ray-flash-2",
        name: "Ray Flash 2"
      },
      {
        id: "ray-2",
        name: "Ray 2"
      }
    ],
    durations: [5, 9],
    aspects: ["16:9", "9:16", "1:1"],
    resolutions: ["540p", "720p", "1080p"],
    imageToVideo: true
  },

  minimax: {
    name: "MiniMax",
    badge: "ACTIVE",
    description: "MiniMax Hailuo",
    active: true,
    models: [
      {
        id: "MiniMax-Hailuo-2.3",
        name: "Hailuo 2.3"
      },
      {
        id: "MiniMax-Hailuo-2.3-Fast",
        name: "Hailuo 2.3 Fast"
      },
      {
        id: "MiniMax-Hailuo-02",
        name: "Hailuo 02"
      }
    ],
    durations: [6, 10],
    aspects: ["16:9", "9:16"],
    resolutions: ["512P", "768P", "1080P"],
    imageToVideo: true
  }
};

/* =========================================================
   DOM
========================================================= */

function $(selector) {
  return document.querySelector(selector);
}

function $all(selector) {
  return Array.from(
    document.querySelectorAll(selector)
  );
}

/* =========================================================
   INIT
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    setupProviders();
    setupCharacterUpload();
    setupPrompt();
    setupGenerate();

    renderProvider();

  }
);

/* =========================================================
   PROVIDER SELECTOR
========================================================= */

function setupProviders() {

  $all(".provider").forEach(button => {

    button.addEventListener(
      "click",
      () => {

        const provider =
          button.dataset.provider;

        if (
          !provider ||
          !PROVIDERS[provider]
        ) {
          return;
        }

        state.provider =
          provider;

        clearVideoResult();

        renderProvider();

      }
    );

  });

}

/* =========================================================
   PROVIDER UI
========================================================= */

function renderProvider() {

  const provider =
    PROVIDERS[state.provider];

  if (!provider) {
    return;
  }

  $all(".provider").forEach(
    button => {

      button.classList.toggle(
        "active",
        button.dataset.provider ===
          state.provider
      );

    }
  );

  const name =
    $("#providerName");

  const badge =
    $("#providerBadge");

  const description =
    $("#providerDescription");

  if (name) {
    name.textContent =
      provider.name;
  }

  if (badge) {
    badge.textContent =
      provider.badge;
  }

  if (description) {
    description.textContent =
      provider.description;
  }

  renderModels(
    provider.models
  );

  renderValues(
    "#duration",
    provider.durations
  );

  renderValues(
    "#aspect",
    provider.aspects
  );

  renderValues(
    "#resolution",
    provider.resolutions
  );

  validateProviderSettings();

}

/* =========================================================
   MODELS
========================================================= */

function renderModels(models) {

  const select =
    $("#model");

  if (!select) {
    return;
  }

  select.innerHTML = "";

  models.forEach(model => {

    const option =
      document.createElement(
        "option"
      );

    option.value =
      model.id;

    option.textContent =
      model.name;

    select.appendChild(
      option
    );

  });

}

/* =========================================================
   SELECT VALUES
========================================================= */

function renderValues(
  selector,
  values
) {

  const select =
    $(selector);

  if (!select) {
    return;
  }

  select.innerHTML = "";

  values.forEach(value => {

    const option =
      document.createElement(
        "option"
      );

    option.value =
      String(value);

    option.textContent =
      String(value);

    select.appendChild(
      option
    );

  });

}

/* =========================================================
   CHARACTER UPLOAD
========================================================= */

function setupCharacterUpload() {

  const input =
    $("#characterFile");

  if (!input) {
    return;
  }

  input.addEventListener(
    "change",
    event => {

      const file =
        event.target.files?.[0];

      if (!file) {
        clearCharacter();
        return;
      }

      if (
        !file.type.startsWith(
          "image/"
        )
      ) {

        alert(
          "File karakter harus berupa gambar."
        );

        input.value = "";

        return;
      }

      const reader =
        new FileReader();

      reader.onload =
        () => {

          state.imageData =
            reader.result;

          state.imageMimeType =
            file.type;

          const preview =
            $("#characterPreview");

          if (preview) {

            preview.src =
              state.imageData;

            preview.style.display =
              "block";

          }

          const info =
            $("#characterInfo");

          if (info) {

            info.textContent =
              `${file.name} • ${formatBytes(file.size)}`;

          }

        };

      reader.readAsDataURL(
        file
      );

    }
  );

}

/* =========================================================
   CLEAR CHARACTER
========================================================= */

function clearCharacter() {

  state.imageData =
    null;

  state.imageMimeType =
    null;

  const preview =
    $("#characterPreview");

  if (preview) {

    preview.removeAttribute(
      "src"
    );

    preview.style.display =
      "none";

  }

  const info =
    $("#characterInfo");

  if (info) {
    info.textContent = "";
  }

}

/* =========================================================
   PROMPT
========================================================= */

function setupPrompt() {

  const prompt =
    $("#prompt");

  const counter =
    $("#promptCounter");

  if (!prompt) {
    return;
  }

  const update =
    () => {

      if (!counter) {
        return;
      }

      counter.textContent =
        `${prompt.value.length}/${prompt.maxLength || 2000}`;

    };

  prompt.addEventListener(
    "input",
    update
  );

  update();

}

/* =========================================================
   GENERATE
========================================================= */

function setupGenerate() {

  const button =
    $("#videoBtn");

  if (!button) {
    return;
  }

  button.addEventListener(
    "click",
    generateVideo
  );

}

/* =========================================================
   MAIN GENERATION
========================================================= */

async function generateVideo() {

  if (state.generating) {
    return;
  }

  const account =
    window.GENZAccount;

  const user =
    account?.getUser?.();

  if (!user) {

    showStatus(
      "Silakan login terlebih dahulu.",
      "error"
    );

    return;
  }

  const provider =
    PROVIDERS[state.provider];

  if (
    !provider ||
    !provider.active
  ) {

    showStatus(
      `${provider?.name || state.provider} belum diaktifkan.`,
      "error"
    );

    return;
  }

  const prompt =
    $("#prompt")?.value?.trim();

  if (!prompt) {

    showStatus(
      "Prompt wajib diisi.",
      "error"
    );

    $("#prompt")?.focus();

    return;
  }

  if (prompt.length > 2000) {

    showStatus(
      "Prompt maksimal 2000 karakter.",
      "error"
    );

    return;
  }

  const keys =
    await account.getApiKeys();

  const apiKey =
    getApiKey(
      state.provider,
      keys
    );

  if (!apiKey) {

    showStatus(
      `API key ${provider.name} belum disimpan.`,
      "error"
    );

    return;
  }

  validateProviderSettings();

  const model =
    getValue("#model");

  const duration =
    getValue("#duration");

  const aspectRatio =
    getValue("#aspect");

  const resolution =
    getValue("#resolution");

  const seed =
    getOptionalSeed();

  /* -------------------------------------------------------
     VEO
  ------------------------------------------------------- */

  if (
    state.provider === "veo"
  ) {

    if (
      state.imageData &&
      Number(duration) !== 8
    ) {

      showStatus(
        "Veo dengan gambar karakter membutuhkan durasi 8 detik.",
        "error"
      );

      return;
    }

    if (
      (
        resolution === "1080p" ||
        resolution === "4k"
      ) &&
      Number(duration) !== 8
    ) {

      showStatus(
        "Veo 1080p dan 4K membutuhkan durasi 8 detik.",
        "error"
      );

      return;
    }

    if (
      model ===
        "veo-3.1-lite-generate-preview" &&
      resolution === "4k"
    ) {

      showStatus(
        "Veo 3.1 Lite tidak mendukung 4K.",
        "error"
      );

      return;
    }

  }

  state.generating =
    true;

  state.pollAttempts =
    0;

  setGeneratingUI(
    true
  );

  clearVideoResult();

  showStatus(
    `Mengirim permintaan ke ${provider.name}...`,
    "loading"
  );

  try {

    /*
     * Nama parameter disamakan
     * dengan Worker:
     *
     * imageData
     * aspectRatio
     */

    const body = {

      provider:
        state.provider,

      model,

      prompt,

      duration,

      aspectRatio,

      resolution,

      apiKey

    };

    if (state.imageData) {

      body.imageData =
        state.imageData;

    }

    if (seed !== null) {

      body.seed =
        seed;

    }

    const response =
      await fetch(
        "/api/generate",
        {

          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify(body)

        }
      );

    const data =
      await parseResponse(
        response
      );

    if (!response.ok) {

      throw new Error(
        extractError(
          data,
          `Server error ${response.status}.`
        )
      );

    }

    /*
     * Jika server langsung
     * mengembalikan video.
     */

    if (data.videoUrl) {

      await finishVideo(
        data.videoUrl,
        apiKey
      );

      return;
    }

    /*
     * Async generation.
     */

    if (
      data.operationName ||
      data.taskId ||
      data.id
    ) {

      showStatus(
        "Permintaan diterima. Video sedang diproses...",
        "loading"
      );

      await pollGeneration(
        data,
        apiKey
      );

      return;
    }

    throw new Error(
      "Server tidak mengembalikan ID proses video."
    );

  } catch (error) {

    console.error(
      "GEN-Z.AI:",
      error.message
    );

    showStatus(
      friendlyError(
        error
      ),
      "error"
    );

    setGeneratingUI(
      false
    );

  }

}

/* =========================================================
   API KEY
========================================================= */

function getApiKey(
  provider,
  keys
) {

  if (!keys) {
    return null;
  }

  switch (provider) {

    case "veo":
      return keys.gemini || null;

    case "minimax":
      return keys.minimax || null;

    case "luma":
      return keys.luma || null;

    default:
      return null;

  }

}

/* =========================================================
   POLLING
========================================================= */

async function pollGeneration(
  initialData,
  apiKey
) {

  let operationName =
    initialData?.operationName ||
    initialData?.operation?.name ||
    null;

  let taskId =
    initialData?.taskId ||
    initialData?.task_id ||
    null;

  let id =
    initialData?.id ||
    initialData?.generationId ||
    null;

  return new Promise(
    (resolve, reject) => {

      const poll =
        async () => {

          try {

            state.pollAttempts++;

            if (
              state.pollAttempts >
              state.pollMaxAttempts
            ) {

              throw new Error(
                "Waktu tunggu pembuatan video terlalu lama."
              );

            }

            const response =
              await fetch(
                "/api/generate/status",
                {

                  method: "POST",

                  headers: {
                    "Content-Type":
                      "application/json"
                  },

                  body:
                    JSON.stringify({

                      provider:
                        state.provider,

                      apiKey,

                      operationName,

                      taskId,

                      id

                    })

                }
              );

            const data =
              await parseResponse(
                response
              );

            if (!response.ok) {

              throw new Error(
                extractError(
                  data,
                  `Status error ${response.status}.`
                )
              );

            }

            if (
              data.operationName
            ) {
              operationName =
                data.operationName;
            }

            if (
              data.taskId
            ) {
              taskId =
                data.taskId;
            }

            if (
              data.id
            ) {
              id =
                data.id;
            }

            const status =
              String(
                data.status ||
                data.state ||
                ""
              ).toLowerCase();

            showStatus(
              pollingMessage(
                status
              ),
              "loading"
            );

            /*
             * Video langsung tersedia.
             */

            const videoUrl =
              data.videoUrl ||
              data.video?.url ||
              data.assets?.video ||
              data.url ||
              null;

            if (videoUrl) {

              await finishVideo(
                videoUrl,
                apiKey
              );

              resolve(data);

              return;
            }

            /*
             * Belum selesai.
             */

            if (
              status === "failed" ||
              status === "error" ||
              status === "cancelled"
            ) {

              throw new Error(
                extractError(
                  data,
                  "Pembuatan video gagal."
                )
              );

            }

            state.pollTimer =
              setTimeout(
                poll,
                5000
              );

          } catch (error) {

            reject(error);

          }

        };

      poll();

    }
  );

}

/* =========================================================
   POLLING MESSAGE
========================================================= */

function pollingMessage(
  status
) {

  switch (status) {

    case "queued":
      return "Video berada dalam antrean...";

    case "pending":
      return "Video sedang menunggu proses...";

    case "processing":
      return "Video sedang diproses...";

    case "dreaming":
      return "Luma sedang membuat video...";

    case "running":
      return "Video sedang dibuat...";

    case "completed":
    case "succeeded":
    case "success":
      return "Video selesai diproses.";

    default:
      return "Video sedang diproses...";

  }

}

/* =========================================================
   FINISH VIDEO
========================================================= */

async function finishVideo(
  videoUrl,
  apiKey
) {

  if (!videoUrl) {

    throw new Error(
      "URL video tidak ditemukan."
    );

  }

  let finalUrl =
    videoUrl;

  /*
   * VEO selalu melalui Worker.
   */

  if (
    state.provider === "veo"
  ) {

    showStatus(
      "Mengambil file video Veo...",
      "loading"
    );

    const response =
      await fetch(
        `/api/video?provider=veo&url=${encodeURIComponent(
          videoUrl
        )}`,
        {

          method: "GET",

          headers: {
            "X-Provider-API-Key":
              apiKey
          }

        }
      );

    if (!response.ok) {

      const text =
        await response.text();

      throw new Error(
        text ||
        `Gagal mengambil video Veo (${response.status}).`
      );

    }

    const blob =
      await response.blob();

    state.videoObjectUrl =
      URL.createObjectURL(
        blob
      );

    finalUrl =
      state.videoObjectUrl;

  }

  /*
   * MiniMax Worker proxy.
   */

  if (
    state.provider === "minimax" &&
    isWorkerVideoUrl(videoUrl)
  ) {

    showStatus(
      "Mengambil file video MiniMax...",
      "loading"
    );

    const response =
      await fetch(
        `/api/video?provider=minimax&url=${encodeURIComponent(
          videoUrl
        )}`,
        {

          method: "GET",

          headers: {
            "X-Provider-API-Key":
              apiKey
          }

        }
      );

    if (!response.ok) {

      const text =
        await response.text();

      throw new Error(
        text ||
        `Gagal mengambil video MiniMax (${response.status}).`
      );

    }

    const blob =
      await response.blob();

    state.videoObjectUrl =
      URL.createObjectURL(
        blob
      );

    finalUrl =
      state.videoObjectUrl;

  }

  state.videoUrl =
    finalUrl;

  const preview =
    $("#videoPreview");

  if (preview) {

    preview.src =
      finalUrl;

    preview.controls =
      true;

    preview.style.display =
      "block";

    preview.load();

  }

  const download =
    $("#download");

  if (download) {

    download.href =
      finalUrl;

    download.download =
      "gen-z-ai-video.mp4";

    download.style.display =
      "inline-flex";

  }

  showStatus(
    "Video berhasil dibuat.",
    "success"
  );

  setGeneratingUI(
    false
  );

}

/* =========================================================
   WORKER VIDEO URL
========================================================= */

function isWorkerVideoUrl(
  url
) {

  if (!url) {
    return false;
  }

  return (
    url.startsWith(
      "/api/video"
    ) ||
    url.includes(
      "/api/video?"
    )
  );

}

/* =========================================================
   CLEAR VIDEO
========================================================= */

function clearVideoResult() {

  if (
    state.pollTimer
  ) {

    clearTimeout(
      state.pollTimer
    );

    state.pollTimer =
      null;

  }

  if (
    state.videoObjectUrl
  ) {

    try {

      URL.revokeObjectURL(
        state.videoObjectUrl
      );

    } catch (_) {}

  }

  state.videoObjectUrl =
    null;

  state.videoUrl =
    null;

  const preview =
    $("#videoPreview");

  if (preview) {

    preview.pause?.();

    preview.removeAttribute(
      "src"
    );

    preview.load();

    preview.style.display =
      "none";

  }

  const download =
    $("#download");

  if (download) {

    download.removeAttribute(
      "href"
    );

    download.style.display =
      "none";

  }

}

/* =========================================================
   GENERATING UI
========================================================= */

function setGeneratingUI(
  generating
) {

  state.generating =
    generating;

  const button =
    $("#videoBtn");

  if (!button) {
    return;
  }

  if (
    !button.dataset.originalText
  ) {

    button.dataset.originalText =
      button.textContent;

  }

  button.disabled =
    generating;

  button.textContent =
    generating
      ? "Membuat Video..."
      : button.dataset.originalText;

}

/* =========================================================
   STATUS
========================================================= */

function showStatus(
  message,
  type
) {

  const status =
    $("#status");

  if (!status) {
    return;
  }

  status.textContent =
    message || "";

  status.dataset.type =
    type || "";

  status.className =
    `status ${type || ""}`;

}

/* =========================================================
   PROVIDER SETTINGS
========================================================= */

function validateProviderSettings() {

  const provider =
    state.provider;

  const duration =
    $("#duration");

  const resolution =
    $("#resolution");

  if (
    !duration ||
    !resolution
  ) {
    return;
  }

  /*
   * VEO
   */

  if (
    provider === "veo"
  ) {

    if (
      state.imageData
    ) {

      if (
        duration.value !== "8"
      ) {

        duration.value =
          "8";

      }

    }

    if (
      (
        resolution.value ===
          "1080p" ||
        resolution.value ===
          "4k"
      )
    ) {

      if (
        duration.value !== "8"
      ) {

        duration.value =
          "8";

      }

    }

  }

  /*
   * MiniMax
   */

  if (
    provider === "minimax"
  ) {

    if (
      resolution.value ===
        "1080P"
    ) {

      if (
        duration.value !== "6"
      ) {

        duration.value =
          "6";

      }

    }

  }

}

/* =========================================================
   OPTIONAL SEED
========================================================= */

function getOptionalSeed() {

  const seedElement =
    $("#seed");

  if (!seedElement) {
    return null;
  }

  const value =
    String(
      seedElement.value || ""
    ).trim();

  if (!value) {
    return null;
  }

  const seed =
    Number(value);

  if (
    !Number.isInteger(seed) ||
    seed < 0
  ) {

    return null;

  }

  return seed;

}

/* =========================================================
   GET VALUE
========================================================= */

function getValue(
  selector
) {

  const element =
    $(selector);

  return element
    ? element.value
    : "";

}

/* =========================================================
   RESPONSE
========================================================= */

async function parseResponse(
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

  } catch (_) {

    return {
      error: text
    };

  }

}

/* =========================================================
   ERROR EXTRACTION
========================================================= */

function extractError(
  data,
  fallback
) {

  if (!data) {
    return fallback;
  }

  if (
    typeof data.error ===
      "string"
  ) {

    return data.error;

  }

  if (
    typeof data.message ===
      "string"
  ) {

    return data.message;

  }

  if (
    data.error?.message
  ) {

    return data.error.message;

  }

  return fallback;

}

/* =========================================================
   FRIENDLY ERROR
========================================================= */

function friendlyError(
  error
) {

  const message =
    String(
      error?.message ||
      error ||
      "Terjadi kesalahan."
    );

  if (
    message.includes(
      "Failed to fetch"
    )
  ) {

    return "Tidak dapat terhubung ke server GEN-Z.AI.";

  }

  if (
    message.includes(
      "401"
    )
  ) {

    return "API key tidak valid atau tidak memiliki akses.";

  }

  if (
    message.includes(
      "403"
    )
  ) {

    return "Permintaan ditolak oleh provider.";

  }

  if (
    message.includes(
      "429"
    )
  ) {

    return "Provider sedang sibuk atau batas penggunaan tercapai.";

  }

  return message;

}

/* =========================================================
   FILE SIZE
========================================================= */

function formatBytes(
  bytes
) {

  if (!bytes) {
    return "0 B";
  }

  const units = [
    "B",
    "KB",
    "MB",
    "GB"
  ];

  const index =
    Math.floor(
      Math.log(bytes) /
      Math.log(1024)
    );

  return (
    (
      bytes /
      Math.pow(
        1024,
        index
      )
    ).toFixed(
      index
        ? 1
        : 0
    ) +
    " " +
    units[index]
  );

}
