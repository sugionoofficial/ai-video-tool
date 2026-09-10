"use strict";

/* =========================================================
   GEN-Z.AI
   Character Reference → AI Video
   Supabase Account + Per-user API Keys
========================================================= */

const CONFIG = window.AIVideoConfig || {};

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
   PROVIDER REGISTRY
========================================================= */

const PROVIDERS = {

  pollinations: {
    name: "Pollinations",
    badge: "AI Video",
    description: "Pollinations video generation.",
    active: false,
    models: [
      { id: "seedance-2.5", name: "Seedance 2.5" }
    ],
    durations: [5, 10],
    aspects: ["16:9", "9:16", "1:1"],
    resolutions: ["720p"],
    imageToVideo: true
  },

  fal: {
    name: "fal.ai",
    badge: "AI Video",
    description: "fal.ai video generation.",
    active: false,
    models: [
      { id: "wan", name: "Wan" }
    ],
    durations: [5, 10],
    aspects: ["16:9", "9:16"],
    resolutions: ["720p", "1080p"],
    imageToVideo: true
  },

  runway: {
    name: "Runway",
    badge: "AI Video",
    description: "Runway video generation.",
    active: false,
    models: [
      { id: "gen4_turbo", name: "Gen-4 Turbo" }
    ],
    durations: [5, 10],
    aspects: ["16:9", "9:16"],
    resolutions: ["720p", "1080p"],
    imageToVideo: true
  },

  veo: {
    name: "Google Veo",
    badge: "ACTIVE",
    description: "Google Veo 3.1 video generation.",
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

    aspects: [
      "16:9",
      "9:16"
    ],

    resolutions: [
      "720p",
      "1080p",
      "4k"
    ],

    imageToVideo: true,
    nativeAudio: true
  },

  luma: {
    name: "Luma",
    badge: "ACTIVE",
    description: "Luma Dream Machine video generation.",
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

    aspects: [
      "16:9",
      "9:16",
      "1:1"
    ],

    resolutions: [
      "540p",
      "720p",
      "1080p"
    ],

    imageToVideo: true
  },

  minimax: {
    name: "MiniMax",
    badge: "ACTIVE",
    description: "MiniMax Hailuo video generation.",
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

    aspects: [
      "16:9",
      "9:16"
    ],

    resolutions: [
      "512p",
      "768p",
      "1080p"
    ],

    imageToVideo: true
  }
};

/* =========================================================
   DOM HELPERS
========================================================= */

function $(selector) {
  return document.querySelector(selector);
}

function $all(selector) {
  return Array.from(document.querySelectorAll(selector));
}

/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

  setupProviderButtons();
  setupCharacterUpload();
  setupPromptCounter();
  setupGenerateButton();

  renderProvider();

});

/* =========================================================
   PROVIDER BUTTONS
========================================================= */

function setupProviderButtons() {

  $all(".provider").forEach(button => {

    button.addEventListener("click", () => {

      const provider = button.dataset.provider;

      if (!provider || !PROVIDERS[provider]) {
        return;
      }

      state.provider = provider;

      renderProvider();

    });

  });

}

/* =========================================================
   PROVIDER UI
========================================================= */

function renderProvider() {

  const provider = PROVIDERS[state.provider];

  if (!provider) {
    return;
  }

  $all(".provider").forEach(button => {

    button.classList.toggle(
      "active",
      button.dataset.provider === state.provider
    );

  });

  const name = $("#providerName");
  const badge = $("#providerBadge");
  const description = $("#providerDescription");

  if (name) {
    name.textContent = provider.name;
  }

  if (badge) {
    badge.textContent = provider.badge;
  }

  if (description) {
    description.textContent = provider.description;
  }

  renderSelect(
    "#model",
    provider.models,
    item => ({
      value: item.id,
      label: item.name
    })
  );

  renderSimpleSelect(
    "#duration",
    provider.durations
  );

  renderSimpleSelect(
    "#aspect",
    provider.aspects
  );

  renderSimpleSelect(
    "#resolution",
    provider.resolutions
  );

  validateCurrentOptions();

}

/* =========================================================
   SELECT RENDERERS
========================================================= */

function renderSelect(selector, items, mapper) {

  const select = $(selector);

  if (!select) {
    return;
  }

  select.innerHTML = "";

  items.forEach(item => {

    const mapped = mapper(item);

    const option = document.createElement("option");

    option.value = mapped.value;
    option.textContent = mapped.label;

    select.appendChild(option);

  });

}

function renderSimpleSelect(selector, values) {

  const select = $(selector);

  if (!select) {
    return;
  }

  select.innerHTML = "";

  values.forEach(value => {

    const option = document.createElement("option");

    option.value = String(value);
    option.textContent = String(value);

    select.appendChild(option);

  });

}

/* =========================================================
   CHARACTER UPLOAD
========================================================= */

function setupCharacterUpload() {

  const input = $("#characterFile");

  if (!input) {
    return;
  }

  input.addEventListener("change", event => {

    const file = event.target.files?.[0];

    if (!file) {
      clearCharacter();
      return;
    }

    if (!file.type.startsWith("image/")) {

      alert("File karakter harus berupa gambar.");

      input.value = "";

      return;
    }

    const reader = new FileReader();

    reader.onload = () => {

      state.imageData = reader.result;
      state.imageMimeType = file.type;

      const preview = $("#characterPreview");

      if (preview) {

        preview.src = state.imageData;
        preview.style.display = "block";

      }

      const info = $("#characterInfo");

      if (info) {

        info.textContent =
          `${file.name} • ${formatBytes(file.size)}`;

      }

    };

    reader.readAsDataURL(file);

  });

}

/* =========================================================
   CLEAR CHARACTER
========================================================= */

function clearCharacter() {

  state.imageData = null;
  state.imageMimeType = null;

  const preview = $("#characterPreview");

  if (preview) {
    preview.removeAttribute("src");
    preview.style.display = "none";
  }

  const info = $("#characterInfo");

  if (info) {
    info.textContent = "";
  }

}

/* =========================================================
   PROMPT COUNTER
========================================================= */

function setupPromptCounter() {

  const prompt = $("#prompt");
  const counter = $("#promptCounter");

  if (!prompt) {
    return;
  }

  const update = () => {

    if (counter) {

      counter.textContent =
        `${prompt.value.length}/${prompt.maxLength || 2000}`;

    }

  };

  prompt.addEventListener("input", update);

  update();

}

/* =========================================================
   GENERATE BUTTON
========================================================= */

function setupGenerateButton() {

  const button = $("#videoBtn");

  if (!button) {
    return;
  }

  button.addEventListener("click", generateVideo);

}

/* =========================================================
   MAIN GENERATION
========================================================= */

async function generateVideo() {

  if (state.generating) {
    return;
  }

  const user = window.GENZAccount?.getUser?.();

  if (!user) {

    showStatus(
      "Silakan login terlebih dahulu.",
      "error"
    );

    return;
  }

  const provider = PROVIDERS[state.provider];

  if (!provider || !provider.active) {

    showStatus(
      `${provider?.name || state.provider} belum diaktifkan.`,
      "error"
    );

    return;
  }

  const prompt = $("#prompt")?.value?.trim();

  if (!prompt) {

    showStatus(
      "Masukkan prompt terlebih dahulu.",
      "error"
    );

    $("#prompt")?.focus();

    return;
  }

  const keys =
    await window.GENZAccount.getApiKeys();

  const apiKey = getProviderApiKey(
    state.provider,
    keys
  );

  if (!apiKey) {

    showStatus(
      `API key ${provider.name} belum diisi.`,
      "error"
    );

    return;
  }

  validateCurrentOptions();

  const duration =
    getValue("#duration");

  const aspect =
    getValue("#aspect");

  const resolution =
    getValue("#resolution");

  const model =
    getValue("#model");

  const imageData =
    state.imageData;

  /* -------------------------------------------------------
     VEO VALIDATION
  ------------------------------------------------------- */

  if (state.provider === "veo") {

    if (
      imageData &&
      Number(duration) !== 8
    ) {

      showStatus(
        "Veo membutuhkan durasi 8 detik jika menggunakan gambar referensi karakter.",
        "error"
      );

      return;
    }

    if (
      resolution === "1080p" &&
      Number(duration) !== 8
    ) {

      showStatus(
        "Veo 1080p membutuhkan durasi 8 detik.",
        "error"
      );

      return;
    }

    if (
      resolution === "4k" &&
      Number(duration) !== 8
    ) {

      showStatus(
        "Veo 4K membutuhkan durasi 8 detik.",
        "error"
      );

      return;
    }

  }

  state.generating = true;

  setGeneratingUI(true);

  clearVideoResult();

  showStatus(
    `Mengirim permintaan ke ${provider.name}...`,
    "loading"
  );

  try {

    const body = {
      provider: state.provider,
      model,
      prompt,
      duration,
      aspect,
      resolution,
      apiKey
    };

    if (imageData) {
      body.image = imageData;
    }

    const response =
      await fetch("/api/generate", {

        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify(body)

      });

    const data =
      await parseJsonResponse(response);

    if (!response.ok) {

      throw new Error(
        data?.error ||
        data?.message ||
        `HTTP ${response.status}`
      );

    }

    if (data.videoUrl) {

      await finishVideo(
        data.videoUrl,
        apiKey
      );

      return;
    }

    state.pollAttempts = 0;

    showStatus(
      "Permintaan diterima. Menunggu proses video...",
      "loading"
    );

    await pollGeneration(
      data,
      apiKey
    );

  } catch (error) {

    console.error(
      "GEN-Z.AI generation error:",
      error.message
    );

    showStatus(
      getFriendlyError(error),
      "error"
    );

    setGeneratingUI(false);

  }

}

/* =========================================================
   API KEY MAPPING
========================================================= */

function getProviderApiKey(provider, keys) {

  if (!keys) {
    return null;
  }

  if (provider === "veo") {
    return keys.gemini || null;
  }

  if (provider === "minimax") {
    return keys.minimax || null;
  }

  if (provider === "luma") {
    return keys.luma || null;
  }

  return null;
}

/* =========================================================
   POLLING
========================================================= */

async function pollGeneration(initialData, apiKey) {

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

  if (!operationName && !taskId && !id) {

    throw new Error(
      "Server tidak mengembalikan ID proses video."
    );

  }

  return new Promise((resolve, reject) => {

    const poll = async () => {

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
          await fetch("/api/generate/status", {

            method: "POST",

            headers: {
              "Content-Type": "application/json"
            },

            body: JSON.stringify({

              provider: state.provider,

              apiKey,

              operationName,

              taskId,

              id

            })

          });

        const data =
          await parseJsonResponse(response);

        if (!response.ok) {

          throw new Error(
            data?.error ||
            data?.message ||
            `HTTP ${response.status}`
          );

        }

        if (data.operationName) {
          operationName = data.operationName;
        }

        if (data.taskId) {
          taskId = data.taskId;
        }

        if (data.id) {
          id = data.id;
        }

        const status =
          String(
            data.status ||
            data.state ||
            ""
          ).toLowerCase();

        showStatus(
          getPollingMessage(status),
          "loading"
        );

        if (data.videoUrl) {

          await finishVideo(
            data.videoUrl,
            apiKey
          );

          resolve(data);

          return;
        }

        if (
          data.video?.url
        ) {

          await finishVideo(
            data.video.url,
            apiKey
          );

          resolve(data);

          return;
        }

        if (
          data.assets?.video
        ) {

          await finishVideo(
            data.assets.video,
            apiKey
          );

          resolve(data);

          return;
        }

        if (
          status === "failed" ||
          status === "error" ||
          status === "cancelled"
        ) {

          throw new Error(
            data.error ||
            data.message ||
            "Pembuatan video gagal."
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

  });

}

/* =========================================================
   POLLING MESSAGE
========================================================= */

function getPollingMessage(status) {

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

async function finishVideo(videoUrl, apiKey) {

  if (!videoUrl) {

    throw new Error(
      "URL video tidak ditemukan."
    );

  }

  let finalUrl =
    videoUrl;

  /*
   * Veo:
   * Provider video URL harus diproxy Worker.
   *
   * MiniMax:
   * Bisa berupa proxy Worker atau URL langsung.
   */

  if (
    state.provider === "veo" ||
    (
      state.provider === "minimax" &&
      isWorkerVideoUrl(videoUrl)
    )
  ) {

    showStatus(
      "Mengambil file video...",
      "loading"
    );

    const proxyResponse =
      await fetch(
        `/api/video?provider=${encodeURIComponent(
          state.provider
        )}&url=${encodeURIComponent(videoUrl)}`,
        {
          method: "GET",

          headers: {
            "X-Provider-API-Key": apiKey
          }
        }
      );

    if (!proxyResponse.ok) {

      const errorText =
        await proxyResponse.text();

      throw new Error(
        errorText ||
        `Gagal mengambil video (${proxyResponse.status}).`
      );

    }

    const blob =
      await proxyResponse.blob();

    state.videoObjectUrl =
      URL.createObjectURL(blob);

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

    preview.style.display =
      "block";

    preview.controls =
      true;

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

  setGeneratingUI(false);

}

/* =========================================================
   WORKER VIDEO URL CHECK
========================================================= */

function isWorkerVideoUrl(url) {

  if (!url) {
    return false;
  }

  return (
    url.startsWith("/api/video") ||
    url.includes("/api/video?")
  );

}

/* =========================================================
   CLEAR VIDEO RESULT
========================================================= */

function clearVideoResult() {

  if (state.videoObjectUrl) {

    try {
      URL.revokeObjectURL(
        state.videoObjectUrl
      );
    } catch (_) {}

  }

  state.videoObjectUrl = null;
  state.videoUrl = null;

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

function setGeneratingUI(isGenerating) {

  state.generating =
    isGenerating;

  const button =
    $("#videoBtn");

  if (!button) {
    return;
  }

  button.disabled =
    isGenerating;

  button.dataset.originalText =
    button.dataset.originalText ||
    button.textContent;

  button.textContent =
    isGenerating
      ? "Membuat Video..."
      : button.dataset.originalText;

}

/* =========================================================
   STATUS
========================================================= */

function showStatus(message, type) {

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
   VALUE HELPERS
========================================================= */

function getValue(selector) {

  const element =
    $(selector);

  return element
    ? element.value
    : "";

}

/* =========================================================
   OPTION VALIDATION
========================================================= */

function validateCurrentOptions() {

  const provider =
    PROVIDERS[state.provider];

  if (!provider) {
    return;
  }

  const duration =
    $("#duration");

  const resolution =
    $("#resolution");

  if (!duration || !resolution) {
    return;
  }

  /*
   * Veo 1080p / 4K requires 8 seconds.
   */

  if (
    state.provider === "veo" &&
    (
      resolution.value === "1080p" ||
      resolution.value === "4k"
    )
  ) {

    if (duration.value !== "8") {
      duration.value = "8";
    }

  }

  /*
   * Character reference for Veo requires 8 seconds.
   */

  if (
    state.provider === "veo" &&
    state.imageData
  ) {

    if (duration.value !== "8") {
      duration.value = "8";
    }

  }

}

/* =========================================================
   JSON RESPONSE
========================================================= */

async function parseJsonResponse(response) {

  const text =
    await response.text();

  if (!text) {
    return {};
  }

  try {

    return JSON.parse(text);

  } catch (_) {

    return {
      error: text
    };

  }

}

/* =========================================================
   FRIENDLY ERRORS
========================================================= */

function getFriendlyError(error) {

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

    return "Tidak dapat terhubung ke server. Periksa koneksi internet atau Worker.";

  }

  if (
    message.includes("401")
  ) {

    return "API key tidak valid atau tidak memiliki akses.";

  }

  if (
    message.includes("403")
  ) {

    return "Permintaan ditolak oleh provider.";

  }

  if (
    message.includes("429")
  ) {

    return "Provider sedang terlalu sibuk atau batas penggunaan tercapai. Coba beberapa saat lagi.";

  }

  return message;

}

/* =========================================================
   FILE SIZE
========================================================= */

function formatBytes(bytes) {

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
    `${(
      bytes /
      Math.pow(1024, index)
    ).toFixed(index ? 1 : 0)} ${units[index]}`
  );

}
