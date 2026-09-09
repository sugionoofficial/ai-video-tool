"use strict";

/* =========================================================
   GEN-Z.AI
   Character Reference → AI Video
   Account API Key Integration
========================================================= */

const state = {
  provider: "veo",
  imageData: null,
  generating: false,
  pollTimer: null,
  pollAttempts: 0,
  pollMaxAttempts: 120
};


/* =========================================================
   PROVIDERS
========================================================= */

const PROVIDERS = {

  pollinations: {
    name: "Pollinations",
    badge: "AI Video",
    description: "Pollinations video generation.",
    models: [
      {
        id: "seedance-2.5",
        name: "Seedance 2.5"
      }
    ],
    durations: [5, 10],
    aspects: ["16:9", "9:16", "1:1"],
    resolutions: [],
    imageToVideo: true,
    audio: false,
    active: false,
    status: "Backend belum diaktifkan"
  },

  fal: {
    name: "fal.ai",
    badge: "AI Models",
    description:
      "Video generation melalui berbagai model fal.ai.",
    models: [],
    durations: [5, 10],
    aspects: ["16:9", "9:16"],
    resolutions: [],
    imageToVideo: true,
    audio: false,
    active: false,
    status: "Backend belum dikonfigurasi"
  },

  runway: {
    name: "Runway",
    badge: "Gen Video",
    description:
      "Video generation menggunakan model Runway.",
    models: [],
    durations: [5, 10],
    aspects: ["16:9", "9:16"],
    resolutions: [],
    imageToVideo: true,
    audio: false,
    active: false,
    status: "Backend belum dikonfigurasi"
  },

  veo: {
    name: "Google Veo",
    badge: "Veo 3.1",
    description:
      "Google Veo 3.1 untuk text-to-video dan image-to-video.",

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
    audio: true,
    active: true,
    status: "Siap"
  },

  luma: {
    name: "Luma",
    badge: "Dream Machine",
    description:
      "Luma Dream Machine untuk text-to-video.",

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
      "1:1",
      "4:3",
      "3:4"
    ],

    resolutions: [],

    imageToVideo: false,
    audio: false,
    active: true,
    status: "Text-to-video"
  },

  minimax: {
    name: "MiniMax",
    badge: "Hailuo",
    description:
      "MiniMax Hailuo untuk text-to-video dan image-to-video.",

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
      "768P",
      "1080P"
    ],

    imageToVideo: true,
    audio: false,
    active: true,
    status: "Siap"
  }

};


/* =========================================================
   DOM
========================================================= */

const providerButtons =
  document.querySelectorAll(
    ".provider[data-provider]"
  );

const providerPanel =
  document.getElementById(
    "providerPanel"
  );

const providerName =
  document.getElementById(
    "providerName"
  );

const providerBadge =
  document.getElementById(
    "providerBadge"
  );

const providerDescription =
  document.getElementById(
    "providerDescription"
  );

const modelSelect =
  document.getElementById(
    "model"
  );

const durationSelect =
  document.getElementById(
    "duration"
  );

const aspectSelect =
  document.getElementById(
    "aspect"
  );

const resolutionSelect =
  document.getElementById(
    "resolution"
  );

const seedInput =
  document.getElementById(
    "seed"
  );

const characterFile =
  document.getElementById(
    "characterFile"
  );

const characterPreview =
  document.getElementById(
    "characterPreview"
  );

const characterInfo =
  document.getElementById(
    "characterInfo"
  );

const promptInput =
  document.getElementById(
    "prompt"
  );

const promptCounter =
  document.getElementById(
    "promptCounter"
  );

const videoButton =
  document.getElementById(
    "videoBtn"
  );

const statusElement =
  document.getElementById(
    "status"
  );

const videoElement =
  document.getElementById(
    "videoPreview"
  );

const downloadElement =
  document.getElementById(
    "download"
  );


/* =========================================================
   INITIALIZE
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    setupProviders();
    setupCharacter();
    setupPrompt();
    setupGenerate();

    setupControlEvents();

    selectProvider(
      "veo"
    );

  }
);


/* =========================================================
   PROVIDER EVENTS
========================================================= */

function setupProviders() {

  providerButtons.forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          selectProvider(
            button.dataset.provider
          );

        }
      );

    }
  );

}


/* =========================================================
   SELECT PROVIDER
========================================================= */

function selectProvider(
  provider
) {

  const config =
    PROVIDERS[provider];

  if (!config) {
    return;
  }

  state.provider =
    provider;

  stopPolling();

  providerButtons.forEach(
    button => {

      button.classList.toggle(
        "active",
        button.dataset.provider ===
          provider
      );

    }
  );

  if (providerName) {
    providerName.textContent =
      config.name;
  }

  if (providerBadge) {
    providerBadge.textContent =
      config.badge;
  }

  if (providerDescription) {
    providerDescription.textContent =
      config.description;
  }

  renderModels(
    config.models
  );

  renderOptions(
    durationSelect,
    config.durations,
    value =>
      `${value} detik`
  );

  renderOptions(
    aspectSelect,
    config.aspects,
    value =>
      value
  );

  renderResolutions(
    config.resolutions
  );

  renderCapabilities(
    config
  );

  updateProviderControls();
}


/* =========================================================
   MODELS
========================================================= */

function renderModels(
  models
) {

  if (!modelSelect) {
    return;
  }

  modelSelect.innerHTML =
    "";

  if (!models.length) {

    const option =
      document.createElement(
        "option"
      );

    option.value =
      "";

    option.textContent =
      "Model belum dikonfigurasi";

    modelSelect.appendChild(
      option
    );

    return;
  }

  models.forEach(
    model => {

      const option =
        document.createElement(
          "option"
        );

      option.value =
        model.id;

      option.textContent =
        model.name;

      modelSelect.appendChild(
        option
      );

    }
  );
}


/* =========================================================
   OPTIONS
========================================================= */

function renderOptions(
  select,
  values,
  formatter
) {

  if (!select) {
    return;
  }

  select.innerHTML =
    "";

  values.forEach(
    value => {

      const option =
        document.createElement(
          "option"
        );

      option.value =
        value;

      option.textContent =
        formatter(value);

      select.appendChild(
        option
      );

    }
  );
}


/* =========================================================
   RESOLUTION
========================================================= */

function renderResolutions(
  resolutions
) {

  if (!resolutionSelect) {
    return;
  }

  resolutionSelect.innerHTML =
    "";

  if (!resolutions.length) {

    const option =
      document.createElement(
        "option"
      );

    option.value =
      "";

    option.textContent =
      "Default provider";

    resolutionSelect.appendChild(
      option
    );

    return;
  }

  resolutions.forEach(
    resolution => {

      const option =
        document.createElement(
          "option"
        );

      option.value =
        resolution;

      option.textContent =
        resolution;

      resolutionSelect.appendChild(
        option
      );

    }
  );
}


/* =========================================================
   CAPABILITIES
========================================================= */

function renderCapabilities(
  config
) {

  if (!providerPanel) {
    return;
  }

  let capabilities =
    providerPanel.querySelector(
      ".capabilities"
    );

  if (!capabilities) {

    capabilities =
      document.createElement(
        "div"
      );

    capabilities.className =
      "capabilities";

    providerPanel.appendChild(
      capabilities
    );
  }

  const items = [];

  if (config.imageToVideo) {
    items.push(
      "Image → Video"
    );
  }

  if (config.audio) {
    items.push(
      "Native Audio"
    );
  }

  config.aspects.forEach(
    aspect => {
      items.push(
        aspect
      );
    }
  );

  if (
    config.resolutions.includes(
      "4k"
    )
  ) {
    items.push(
      "4K"
    );
  }

  items.push(
    config.status
  );

  capabilities.innerHTML =
    items
      .map(
        item =>
          `<span class="capability">${escapeHtml(item)}</span>`
      )
      .join("");
}


/* =========================================================
   CONTROL EVENTS
========================================================= */

function setupControlEvents() {

  if (modelSelect) {
    modelSelect.addEventListener(
      "change",
      updateProviderControls
    );
  }

  if (durationSelect) {
    durationSelect.addEventListener(
      "change",
      updateProviderControls
    );
  }

  if (resolutionSelect) {
    resolutionSelect.addEventListener(
      "change",
      updateProviderControls
    );
  }
}


/* =========================================================
   PROVIDER CONTROLS
========================================================= */

function updateProviderControls() {

  if (
    state.provider !==
    "veo"
  ) {
    return;
  }

  const model =
    modelSelect?.value || "";

  const resolution =
    resolutionSelect?.value ||
    "720p";

  if (
    (
      resolution ===
        "1080p" ||
      resolution ===
        "4k"
    ) &&
    durationSelect
  ) {

    durationSelect.value =
      "8";
  }

  if (
    model ===
      "veo-3.1-lite-generate-preview" &&
    resolutionSelect &&
    resolutionSelect.value ===
      "4k"
  ) {

    resolutionSelect.value =
      "1080p";
  }

  if (
    state.imageData &&
    durationSelect
  ) {

    durationSelect.value =
      "8";
  }
}


/* =========================================================
   CHARACTER
========================================================= */

function setupCharacter() {

  if (!characterFile) {
    return;
  }

  characterFile.addEventListener(
    "change",
    event => {

      const file =
        event.target.files?.[0];

      if (!file) {
        return;
      }

      if (
        !file.type.startsWith(
          "image/"
        )
      ) {

        setStatus(
          "File harus berupa gambar.",
          "error"
        );

        characterFile.value =
          "";

        return;
      }

      if (
        file.size >
        10 * 1024 * 1024
      ) {

        setStatus(
          "Ukuran gambar maksimal 10 MB.",
          "error"
        );

        characterFile.value =
          "";

        return;
      }

      const reader =
        new FileReader();

      reader.onload =
        event => {

          state.imageData =
            event.target.result;

          if (
            characterPreview
          ) {

            characterPreview.src =
              state.imageData;

            characterPreview.style.display =
              "block";
          }

          if (
            characterInfo
          ) {

            characterInfo.textContent =
              `${file.name} • ${formatBytes(file.size)}`;
          }

          updateProviderControls();

          setStatus(
            "Character Reference siap.",
            "success"
          );
        };

      reader.onerror =
        () => {

          state.imageData =
            null;

          setStatus(
            "Gagal membaca gambar.",
            "error"
          );
        };

      reader.readAsDataURL(
        file
      );
    }
  );
}


/* =========================================================
   PROMPT
========================================================= */

function setupPrompt() {

  if (!promptInput) {
    return;
  }

  const updateCounter =
    () => {

      if (promptCounter) {

        promptCounter.textContent =
          `${promptInput.value.length}/2000`;
      }

    };

  promptInput.addEventListener(
    "input",
    updateCounter
  );

  updateCounter();
}


/* =========================================================
   GENERATE
========================================================= */

function setupGenerate() {

  if (!videoButton) {
    return;
  }

  videoButton.addEventListener(
    "click",
    generateVideo
  );
}


/* =========================================================
   GET ACCOUNT API KEY
========================================================= */

async function getProviderApiKey(
  provider
) {

  if (
    !window.GENZAccount ||
    !window.GENZAccount.isAuthenticated()
  ) {

    throw new Error(
      "Silakan login ke akun GEN-Z.AI terlebih dahulu."
    );
  }

  if (
    typeof window.GENZAccount.getApiKeys !==
    "function"
  ) {

    throw new Error(
      "Sistem API key akun belum siap."
    );
  }

  const keys =
    await window.GENZAccount.getApiKeys();

  if (!keys) {
    throw new Error(
      "API key akun belum tersedia."
    );
  }

  let key =
    "";

  switch (provider) {

    case "veo":
      key =
        keys.gemini || "";
      break;

    case "minimax":
      key =
        keys.minimax || "";
      break;

    case "luma":
      key =
        keys.luma || "";
      break;

    default:
      key =
        "";
  }

  if (!String(key).trim()) {

    throw new Error(
      `API key ${PROVIDERS[provider]?.name || provider} belum disimpan pada akun ini.`
    );
  }

  return String(
    key
  ).trim();
}


/* =========================================================
   GENERATE VIDEO
========================================================= */

async function generateVideo() {

  if (
    state.generating
  ) {
    return;
  }

  const config =
    PROVIDERS[state.provider];

  if (!config) {
    return;
  }

  if (!config.active) {

    setStatus(
      `${config.name} belum diaktifkan di backend.`,
      "error"
    );

    return;
  }

  const prompt =
    promptInput?.value.trim() ||
    "";

  if (!prompt) {

    setStatus(
      "Prompt belum diisi.",
      "error"
    );

    promptInput?.focus();

    return;
  }

  if (
    prompt.length >
    2000
  ) {

    setStatus(
      "Prompt maksimal 2000 karakter.",
      "error"
    );

    return;
  }

  if (
    state.provider ===
      "luma" &&
    state.imageData
  ) {

    setStatus(
      "Luma saat ini digunakan untuk Text-to-Video. Untuk Character Reference gunakan Veo atau MiniMax.",
      "error"
    );

    return;
  }

  updateProviderControls();

  const duration =
    Number(
      durationSelect?.value ||
      8
    );

  const aspectRatio =
    aspectSelect?.value ||
    "16:9";

  const model =
    modelSelect?.value ||
    "";

  const resolution =
    resolutionSelect?.value ||
    "";

  /* -------------------------------------------------------
     VEO VALIDATION
  ------------------------------------------------------- */

  if (
    state.provider ===
    "veo"
  ) {

    if (
      ![4, 6, 8].includes(
        duration
      )
    ) {

      setStatus(
        "Durasi Veo harus 4, 6, atau 8 detik.",
        "error"
      );

      return;
    }

    if (
      state.imageData &&
      duration !== 8
    ) {

      setStatus(
        "Character Reference Veo membutuhkan 8 detik.",
        "error"
      );

      return;
    }

    if (
      (
        resolution ===
          "1080p" ||
        resolution ===
          "4k"
      ) &&
      duration !== 8
    ) {

      setStatus(
        `${resolution} pada Veo membutuhkan 8 detik.`,
        "error"
      );

      return;
    }

    if (
      model ===
        "veo-3.1-lite-generate-preview" &&
      resolution ===
        "4k"
    ) {

      setStatus(
        "Veo 3.1 Lite tidak mendukung 4K.",
        "error"
      );

      return;
    }
  }

  stopPolling();
  clearVideoResult();

  state.generating =
    true;

  if (videoButton) {
    videoButton.disabled =
      true;
  }

  setStatus(
    `Menyiapkan ${config.name}...`,
    "loading"
  );

  try {

    /*
     * API key diambil dari akun.
     *
     * Tidak mengambil dari Cloudflare.
     * Tidak menyimpan key di localStorage.
     */

    const apiKey =
      await getProviderApiKey(
        state.provider
      );

    const body = {

      provider:
        state.provider,

      apiKey,

      prompt,

      imageData:
        state.imageData,

      duration,

      aspectRatio,

      seed:
        seedInput?.value ||
        "",

      model,

      resolution
    };

    setStatus(
      `Mengirim ke ${config.name}...`,
      "loading"
    );

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
      await parseJsonResponse(
        response
      );

    if (
      !response.ok ||
      !data.success
    ) {

      throw new Error(
        data.error ||
        `Generate gagal (${response.status}).`
      );
    }

    /*
     * Provider bisa mengembalikan
     * operationName / taskId / id.
     */

    const operationId =
      data.operationName ||
      data.taskId ||
      data.task_id ||
      data.id;

    /*
     * Jika langsung mendapatkan video.
     */

    if (
      data.videoUrl ||
      data.video_url
    ) {

      await showVideoResult(
        data.videoUrl ||
        data.video_url,
        state.provider,
        apiKey
      );

      setStatus(
        "Video berhasil dibuat.",
        "success"
      );

      finishGeneration();

      return;
    }

    if (!operationId) {

      throw new Error(
        "Server tidak mengembalikan ID proses video."
      );
    }

    state.pollAttempts =
      0;

    startPolling(
      state.provider,
      operationId,
      apiKey
    );

  } catch (error) {

    console.error(
      "GEN-Z.AI:",
      error
    );

    setStatus(
      error?.message ||
        "Gagal membuat video.",
      "error"
    );

    finishGeneration();
  }
}


/* =========================================================
   POLLING POST
========================================================= */

function startPolling(
  provider,
  operationId,
  apiKey
) {

  stopPolling();

  state.pollAttempts =
    0;

  setStatus(
    `Video sedang dibuat oleh ${PROVIDERS[provider]?.name || provider}...`,
    "loading"
  );

  const poll =
    async () => {

      state.pollAttempts++;

      if (
        state.pollAttempts >
        state.pollMaxAttempts
      ) {

        stopPolling();

        setStatus(
          "Proses video terlalu lama. Silakan coba lagi.",
          "error"
        );

        finishGeneration();

        return;
      }

      try {

        /*
         * STATUS BARU
         *
         * POST /api/generate/status
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

                  provider,

                  apiKey,

                  operationName:
                    operationId,

                  taskId:
                    operationId,

                  id:
                    operationId

                }),

              cache:
                "no-store"
            }
          );

        const data =
          await parseJsonResponse(
            response
          );

        if (
          !response.ok ||
          data.success === false
        ) {

          throw new Error(
            data.error ||
            `Polling gagal (${response.status}).`
          );
        }

        /*
         * VIDEO SELESAI
         */

        if (
          data.videoUrl ||
          data.video_url
        ) {

          stopPolling();

          await showVideoResult(
            data.videoUrl ||
              data.video_url,
            provider,
            apiKey
          );

          setStatus(
            "Video berhasil dibuat.",
            "success"
          );

          finishGeneration();

          return;
        }

        /*
         * Status completed
         */

        if (
          data.status ===
            "completed" ||
          data.status ===
            "success"
        ) {

          if (
            data.url ||
            data.video
          ) {

            stopPolling();

            await showVideoResult(
              data.url ||
                data.video,
              provider,
              apiKey
            );

            setStatus(
              "Video berhasil dibuat.",
              "success"
            );

            finishGeneration();

            return;
          }
        }

        /*
         * FAILED
         */

        if (
          data.status ===
            "failed" ||
          data.status ===
            "error"
        ) {

          throw new Error(
            data.error ||
            "Provider gagal membuat video."
          );
        }

        /*
         * MASIH PROSES
         */

        const progressText =
          data.message ||
          data.status ||
          "Processing";

        setStatus(
          `${progressText} • percobaan ${state.pollAttempts}/${state.pollMaxAttempts}`,
          "loading"
        );

        state.pollTimer =
          setTimeout(
            poll,
            5000
          );

      } catch (error) {

        console.error(
          "Polling:",
          error
        );

        stopPolling();

        setStatus(
          error?.message ||
            "Gagal memeriksa status video.",
          "error"
        );

        finishGeneration();
      }
    };

  poll();
}


/* =========================================================
   STOP POLLING
========================================================= */

function stopPolling() {

  if (
    state.pollTimer
  ) {

    clearTimeout(
      state.pollTimer
    );

    state.pollTimer =
      null;
  }
}


/* =========================================================
   SHOW VIDEO RESULT
========================================================= */

async function showVideoResult(
  videoUrl,
  provider,
  apiKey
) {

  if (!videoUrl) {
    return;
  }

  /*
   * Veo menggunakan proxy Worker karena
   * video URI Google membutuhkan API key.
   *
   * MiniMax file juga dapat melalui proxy.
   */

  if (
    provider === "veo"
  ) {

    await loadProtectedVideo(
      videoUrl,
      apiKey
    );

    return;
  }

  /*
   * MiniMax proxy URL.
   *
   * Jika URL sudah /api/video,
   * gunakan langsung.
   */

  if (
    provider === "minimax" &&
    videoUrl.startsWith(
      "/api/video"
    )
  ) {

    await loadProtectedVideo(
      videoUrl,
      apiKey
    );

    return;
  }

  /*
   * Luma/direct URL.
   */

  setDirectVideo(
    videoUrl
  );
}


/* =========================================================
   PROTECTED VIDEO LOADER
========================================================= */

async function loadProtectedVideo(
  videoUrl,
  apiKey
) {

  let proxyUrl;

  /*
   * Jika Worker sudah memberikan
   * URL proxy, jangan proxy dua kali.
   */

  if (
    videoUrl.startsWith(
      "/api/video"
    )
  ) {

    proxyUrl =
      videoUrl;

  } else {

    proxyUrl =
      `/api/video?provider=${encodeURIComponent(
        state.provider
      )}&url=${encodeURIComponent(
        videoUrl
      )}`;
  }

  const response =
    await fetch(
      proxyUrl,
      {
        method: "GET",

        headers: {
          "X-Provider-API-Key":
            apiKey
        },

        cache:
          "no-store"
      }
    );

  if (!response.ok) {

    let message =
      `Gagal mengambil video (${response.status}).`;

    try {

      const data =
        await response.json();

      if (data?.error) {
        message =
          data.error;
      }

    } catch {
      // Response bukan JSON.
    }

    throw new Error(
      message
    );
  }

  const blob =
    await response.blob();

  if (
    !blob.size
  ) {

    throw new Error(
      "Video kosong atau tidak dapat diambil."
    );
  }

  const blobUrl =
    URL.createObjectURL(
      blob
    );

  setVideoSource(
    blobUrl
  );
}


/* =========================================================
   DIRECT VIDEO
========================================================= */

function setDirectVideo(
  videoUrl
) {

  const absoluteUrl =
    new URL(
      videoUrl,
      window.location.origin
    ).href;

  setVideoSource(
    absoluteUrl
  );
}


/* =========================================================
   VIDEO SOURCE
========================================================= */

function setVideoSource(
  source
) {

  if (videoElement) {

    videoElement.src =
      source;

    videoElement.controls =
      true;

    videoElement.autoplay =
      false;

    videoElement.playsInline =
      true;

    videoElement.style.display =
      "block";

    videoElement.load();
  }

  if (downloadElement) {

    downloadElement.href =
      source;

    downloadElement.download =
      `genz-ai-${Date.now()}.mp4`;

    downloadElement.style.display =
      "inline-flex";

    downloadElement.textContent =
      "Download Video";
  }
}


/* =========================================================
   CLEAR VIDEO
========================================================= */

function clearVideoResult() {

  if (videoElement) {

    videoElement.pause();

    /*
     * Revoke blob URL jika ada.
     */

    const oldSource =
      videoElement.src;

    if (
      oldSource &&
      oldSource.startsWith(
        "blob:"
      )
    ) {

      URL.revokeObjectURL(
        oldSource
      );
    }

    videoElement.removeAttribute(
      "src"
    );

    videoElement.load();

    videoElement.style.display =
      "none";
  }

  if (downloadElement) {

    downloadElement.removeAttribute(
      "href"
    );

    downloadElement.style.display =
      "none";
  }
}


/* =========================================================
   FINISH GENERATION
========================================================= */

function finishGeneration() {

  state.generating =
    false;

  if (videoButton) {
    videoButton.disabled =
      false;
  }
}


/* =========================================================
   STATUS
========================================================= */

function setStatus(
  message,
  type = ""
) {

  if (!statusElement) {
    return;
  }

  statusElement.textContent =
    message;

  statusElement.className =
    "status";

  if (type) {

    statusElement.classList.add(
      type
    );
  }
}


/* =========================================================
   JSON
========================================================= */

async function parseJsonResponse(
  response
) {

  const text =
    await response.text();

  if (!text) {

    return {
      success:
        response.ok
    };
  }

  try {

    return JSON.parse(
      text
    );

  } catch {

    throw new Error(
      `Server mengembalikan response yang bukan JSON (${response.status}).`
    );
  }
}


/* =========================================================
   FORMAT BYTES
========================================================= */

function formatBytes(
  bytes
) {

  if (
    !Number.isFinite(bytes) ||
    bytes <= 0
  ) {
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

  const value =
    bytes /
    Math.pow(
      1024,
      index
    );

  return `${value.toFixed(
    index === 0 ? 0 : 2
  )} ${units[index]}`;
}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHtml(
  value
) {

  return String(
    value
  )
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );
}
