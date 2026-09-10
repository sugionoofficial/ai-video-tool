"use strict";

/* =========================================================
   GEN-Z.AI
   Global Video Generator
   Secure Provider Architecture

   IMPORTANT:
   Browser TIDAK menyimpan atau mengirim API key provider.
   API key dikelola oleh Worker secara server-side.
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
    badge: "INACTIVE",
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
    badge: "INACTIVE",
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
    badge: "INACTIVE",
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

  /* -------------------------------------------------------
     GEMINI
     Internal provider ID tetap "veo"
  ------------------------------------------------------- */

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
   PROVIDER CANONICAL ID
========================================================= */

function getCanonicalProviderId(provider) {

  if (
    window.GENZProviderRegistry &&
    typeof window.GENZProviderRegistry.canonicalId === "function"
  ) {
    return window.GENZProviderRegistry.canonicalId(
      provider
    );
  }

  const value =
    String(provider || "")
      .trim()
      .toLowerCase();

  if (value === "gemini") {
    return "veo";
  }

  return value;
}

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

  $all(".provider").forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          const rawProvider =
            button.dataset.provider;

          const provider =
            getCanonicalProviderId(
              rawProvider
            );

          if (
            !provider ||
            !PROVIDERS[provider]
          ) {
            return;
          }

          if (
            !PROVIDERS[provider].active
          ) {

            showStatus(
              `${PROVIDERS[provider].name} belum diaktifkan.`,
              "error"
            );

            return;
          }

          state.provider =
            provider;

          clearVideoResult();

          renderProvider();

        }
      );

    }
  );

}

/* =========================================================
   PROVIDER UI
========================================================= */

function renderProvider() {

  const provider =
    PROVIDERS[
      getCanonicalProviderId(
        state.provider
      )
    ];

  if (!provider) {
    return;
  }

  state.provider =
    getCanonicalProviderId(
      state.provider
    );

  $all(".provider").forEach(
    button => {

      const buttonProvider =
        getCanonicalProviderId(
          button.dataset.provider
        );

      button.classList.toggle(
        "active",
        buttonProvider ===
          state.provider
      );

      /*
       * Provider inactive tidak boleh
       * terlihat seperti pilihan aktif.
       */

      button.disabled =
        !PROVIDERS[
          buttonProvider
        ]?.active;

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

  (models || []).forEach(
    model => {

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

    }
  );

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

  (values || []).forEach(
    value => {

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

    }
  );

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

          /*
           * Jika Gemini menggunakan
           * image-to-video, otomatis
           * sesuaikan durasi.
           */

          validateProviderSettings();

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

  const input =
    $("#characterFile");

  if (input) {
    input.value = "";
  }

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

  validateProviderSettings();

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

  const providerId =
    getCanonicalProviderId(
      state.provider
    );

  const provider =
    PROVIDERS[
      providerId
    ];

  if (
    !provider ||
    !provider.active
  ) {

    showStatus(
      `${provider?.name || providerId} belum diaktifkan.`,
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
     GEMINI / VEO VALIDATION
  ------------------------------------------------------- */

  if (
    providerId === "veo"
  ) {

    if (
      state.imageData &&
      Number(duration) !== 8
    ) {

      showStatus(
        "Gemini dengan gambar karakter membutuhkan durasi 8 detik.",
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
        "Gemini 1080p dan 4K membutuhkan durasi 8 detik.",
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
        "Gemini Veo 3.1 Lite tidak mendukung 4K.",
        "error"
      );

      return;
    }

  }

  /* -------------------------------------------------------
     START
  ------------------------------------------------------- */

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
     * API KEY SENGAJA TIDAK ADA DI SINI.
     *
     * Worker akan mengambil API key
     * dari admin_provider_keys.
     */

    const body = {

      provider:
        providerId,

      model,

      prompt,

      duration,

      aspectRatio,

      resolution

    };

    if (
      state.imageData
    ) {

      body.imageData =
        state.imageData;

    }

    if (
      seed !== null
    ) {

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
            JSON.stringify(
              body
            )

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
     * Server langsung memberikan
     * URL video.
     */

    if (
      data.videoUrl
    ) {

      await finishVideo(
        data.videoUrl
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
        data
      );

      return;

    }

    throw new Error(
      "Server tidak mengembalikan ID proses video."
    );

  } catch (error) {

    console.error(
      "GEN-Z.AI:",
      error
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
   POLLING
========================================================= */

async function pollGeneration(
  initialData
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

            /*
             * API KEY TIDAK DIKIRIM.
             */

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
                        getCanonicalProviderId(
                          state.provider
                        ),

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
             * Video tersedia.
             */

            const videoUrl =
              data.videoUrl ||
              data.video?.url ||
              data.assets?.video ||
              data.url ||
              null;

            if (
              videoUrl
            ) {

              await finishVideo(
                videoUrl
              );

              resolve(data);

              return;

            }

            /*
             * Gagal.
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

            /*
             * Poll ulang setiap 5 detik.
             */

            state.pollTimer =
              setTimeout(
                poll,
                5000
              );

          } catch (error) {

            state.pollTimer =
              null;

            reject(
              error
            );

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
  videoUrl
) {

  if (!videoUrl) {

    throw new Error(
      "URL video tidak ditemukan."
    );

  }

  let finalUrl =
    videoUrl;

  const providerId =
    getCanonicalProviderId(
      state.provider
    );

  /* -------------------------------------------------------
     GEMINI / VEO
  ------------------------------------------------------- */

  if (
    providerId === "veo"
  ) {

    showStatus(
      "Mengambil file video Gemini...",
      "loading"
    );

    const response =
      await fetch(
        `/api/video?provider=veo&url=${encodeURIComponent(
          videoUrl
        )}`,
        {
          method: "GET"
        }
      );

    if (!response.ok) {

      const text =
        await response.text();

      throw new Error(
        text ||
        `Gagal mengambil video Gemini (${response.status}).`
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

  /* -------------------------------------------------------
     MINIMAX
  ------------------------------------------------------- */

  if (
    providerId === "minimax" &&
    isWorkerVideoUrl(
      videoUrl
    )
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
          method: "GET"
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
    getCanonicalProviderId(
      state.provider
    );

  const duration =
    $("#duration");

  const resolution =
    $("#resolution");

  const model =
    $("#model");

  if (
    !duration ||
    !resolution
  ) {
    return;
  }

  /* -------------------------------------------------------
     GEMINI
  ------------------------------------------------------- */

  if (
    provider === "veo"
  ) {

    /*
     * Image-to-video = 8 detik.
     */

    if (
      state.imageData &&
      duration.value !== "8"
    ) {

      duration.value =
        "8";

    }

    /*
     * 1080p / 4K = 8 detik.
     */

    if (
      (
        resolution.value ===
          "1080p" ||
        resolution.value ===
          "4k"
      ) &&
      duration.value !== "8"
    ) {

      duration.value =
        "8";

    }

    /*
     * Lite tidak mendukung 4K.
     */

    if (
      model &&
      model.value ===
        "veo-3.1-lite-generate-preview" &&
      resolution.value ===
        "4k"
    ) {

      resolution.value =
        "1080p";

    }

  }

  /* -------------------------------------------------------
     MINIMAX
  ------------------------------------------------------- */

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
    !Number.isInteger(
      seed
    ) ||
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

    return "Provider tidak menerima kredensial yang tersimpan.";

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
    Math.min(
      Math.floor(
        Math.log(bytes) /
        Math.log(1024)
      ),
      units.length - 1
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
