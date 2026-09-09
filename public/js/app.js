"use strict";

/* =========================================================
   GEN-Z.AI
   Character Reference → AI Video
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

    selectProvider("veo");

  }
);


/* =========================================================
   PROVIDER BUTTONS
========================================================= */

function setupProviders() {

  providerButtons.forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          const provider =
            button.dataset.provider;

          selectProvider(
            provider
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
   MODEL SELECT
========================================================= */

function renderModels(
  models
) {

  if (!modelSelect) {
    return;
  }

  modelSelect.innerHTML = "";

  if (!models.length) {

    const option =
      document.createElement(
        "option"
      );

    option.value = "";

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
   GENERIC OPTIONS
========================================================= */

function renderOptions(
  select,
  values,
  formatter
) {

  if (!select) {
    return;
  }

  select.innerHTML = "";

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
   RESOLUTIONS
========================================================= */

function renderResolutions(
  resolutions
) {

  if (!resolutionSelect) {
    return;
  }

  resolutionSelect.innerHTML = "";

  if (!resolutions.length) {

    const option =
      document.createElement(
        "option"
      );

    option.value = "";

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
   PROVIDER CAPABILITIES
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
   MODEL-SPECIFIC CONTROLS
========================================================= */

function updateProviderControls() {

  const provider =
    state.provider;

  const model =
    modelSelect?.value || "";

  if (
    provider !== "veo"
  ) {
    return;
  }


  const duration =
    durationSelect?.value || "8";

  const resolution =
    resolutionSelect?.value || "720p";


  /*
   * Veo:
   *
   * 720p:
   * 4 / 6 / 8 sec
   *
   * 1080p:
   * 8 sec
   *
   * 4K:
   * 8 sec
   *
   * Character Reference:
   * 8 sec
   */


  if (
    resolution === "1080p" ||
    resolution === "4k"
  ) {

    if (
      durationSelect &&
      duration !== "8"
    ) {

      durationSelect.value =
        "8";

    }

  }


  /*
   * Veo Lite tidak mendukung 4K.
   */

  if (
    model ===
    "veo-3.1-lite-generate-preview"
  ) {

    if (
      resolutionSelect &&
      resolutionSelect.value === "4k"
    ) {

      resolutionSelect.value =
        "1080p";

    }

  }


  /*
   * Jika Character Reference
   * digunakan, durasi harus 8 detik.
   */

  if (
    state.imageData &&
    durationSelect
  ) {

    durationSelect.value =
      "8";

  }

}


/* =========================================================
   CHARACTER UPLOAD
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
   CLEAR CHARACTER
========================================================= */

function clearCharacter() {

  state.imageData =
    null;

  if (characterFile) {
    characterFile.value =
      "";
  }

  if (characterPreview) {
    characterPreview.src =
      "";

    characterPreview.style.display =
      "none";
  }

  if (characterInfo) {
    characterInfo.textContent =
      "Belum ada karakter.";
  }

}


/* =========================================================
   PROMPT
========================================================= */

function setupPrompt() {

  if (!promptInput) {
    return;
  }

  const update =
    () => {

      if (promptCounter) {

        promptCounter.textContent =
          `${promptInput.value.length}/2000`;

      }

    };


  promptInput.addEventListener(
    "input",
    update
  );

  update();

}


/* =========================================================
   MODEL / DURATION / RESOLUTION EVENTS
========================================================= */

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


/* =========================================================
   GENERATE BUTTON
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
   GENERATE VIDEO
========================================================= */

async function generateVideo() {

  if (state.generating) {
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
    promptInput?.value.trim() || "";


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


  /*
   * Luma belum menerima
   * local Data URL sebagai
   * Character Reference.
   */

  if (
    state.provider === "luma" &&
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


  /*
   * VALIDASI VEO
   */

  if (
    state.provider === "veo"
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
        resolution === "1080p" ||
        resolution === "4k"
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
      resolution === "4k"
    ) {

      setStatus(
        "Veo 3.1 Lite tidak mendukung 4K.",
        "error"
      );

      return;
    }

  }


  /*
   * Bersihkan hasil sebelumnya.
   */

  stopPolling();

  clearVideoResult();


  state.generating =
    true;

  videoButton.disabled =
    true;


  setStatus(
    `Mengirim ke ${config.name}...`,
    "loading"
  );


  try {

    const body = {

      provider:
        state.provider,

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
     * Beberapa backend
     * mengembalikan:
     *
     * operationName
     * id
     * taskId
     *
     * Kita dukung semuanya.
     */

    const operationId =
      data.operationName ||
      data.id ||
      data.taskId ||
      data.task_id;


    if (
      data.videoUrl ||
      data.video_url
    ) {

      showVideoResult(
        data.videoUrl ||
        data.video_url
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
      operationId
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
   POLLING
========================================================= */

function startPolling(
  provider,
  operationId
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

        const url =
          `/api/generate?provider=${encodeURIComponent(
            provider
          )}&id=${encodeURIComponent(
            operationId
          )}&operationName=${encodeURIComponent(
            operationId
          )}&taskId=${encodeURIComponent(
            operationId
          )}`;


        const response =
          await fetch(
            url,
            {
              method: "GET",
              cache: "no-store"
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
         * Selesai
         */

        if (
          data.videoUrl ||
          data.video_url
        ) {

          stopPolling();

          showVideoResult(
            data.videoUrl ||
            data.video_url
          );

          setStatus(
            "Video berhasil dibuat.",
            "success"
          );

          finishGeneration();

          return;
        }


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

            showVideoResult(
              data.url ||
              data.video
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
         * Gagal
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
         * Masih proses.
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
   VIDEO RESULT
========================================================= */

function showVideoResult(
  videoUrl
) {

  if (!videoUrl) {
    return;
  }


  const absoluteUrl =
    new URL(
      videoUrl,
      window.location.origin
    ).href;


  if (videoElement) {

    videoElement.src =
      absoluteUrl;

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
      absoluteUrl;

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
   JSON RESPONSE
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
