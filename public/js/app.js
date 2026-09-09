"use strict";

/* =========================================================
   GEN-Z.AI APP
   Character Reference → AI Video
========================================================= */

const state = {
  provider: "veo",
  imageData: null,
  generating: false,
  pollTimer: null
};


/* =========================================================
   PROVIDER DATABASE
========================================================= */

const PROVIDERS = {

  pollinations: {
    name: "Pollinations",
    badge: "AI Video",
    description:
      "Generate video melalui ekosistem Pollinations.",
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
    status: "Tersedia"
  },


  fal: {
    name: "fal.ai",
    badge: "AI Models",
    description:
      "Platform inference dengan berbagai model video generatif.",
    models: [],
    durations: [5, 10],
    aspects: ["16:9", "9:16"],
    resolutions: [],
    imageToVideo: true,
    audio: false,
    status: "Konfigurasi model diperlukan"
  },


  runway: {
    name: "Runway",
    badge: "Gen Video",
    description:
      "Video generation menggunakan model generatif Runway.",
    models: [],
    durations: [5, 10],
    aspects: ["16:9", "9:16"],
    resolutions: [],
    imageToVideo: true,
    audio: false,
    status: "Konfigurasi model diperlukan"
  },


  veo: {
    name: "Google Veo",
    badge: "Veo 3.1",
    description:
      "Google Veo 3.1 untuk image-to-video dan video generatif dengan kualitas tinggi.",
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
    resolutions: [
      "720p",
      "1080p",
      "4k"
    ],
    imageToVideo: true,
    audio: true,
    status: "Siap"
  },


  luma: {
    name: "Luma",
    badge: "Dream Machine",
    description:
      "Luma Dream Machine untuk pembuatan video generatif.",
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
    status: "Text-to-video"
  },


  minimax: {
    name: "MiniMax",
    badge: "Hailuo",
    description:
      "MiniMax Hailuo untuk image-to-video dengan karakter reference.",
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
    resolutions: [
      "768P",
      "1080P"
    ],
    imageToVideo: true,
    audio: false,
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

  providerButtons.forEach(button => {

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

  });

}


/* =========================================================
   SELECT PROVIDER
========================================================= */

function selectProvider(
  provider
) {

  if (!PROVIDERS[provider]) {
    return;
  }

  state.provider =
    provider;

  const config =
    PROVIDERS[provider];


  /* Active button */

  providerButtons.forEach(
    button => {

      button.classList.toggle(
        "active",
        button.dataset.provider ===
          provider
      );

    }
  );


  /* Header */

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


  /* Model */

  renderModels(
    config.models
  );


  /* Duration */

  renderOptions(
    durationSelect,
    config.durations,
    value =>
      `${value} detik`
  );


  /* Aspect */

  renderOptions(
    aspectSelect,
    config.aspects,
    value =>
      value
  );


  /* Resolution */

  renderResolutions(
    config.resolutions
  );


  renderCapabilities(
    config
  );

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
   RESOLUTION
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
      items.push(aspect);
    }
  );


  if (config.resolutions.includes("4k")) {
    items.push("4K");
  }


  items.push(
    config.status
  );


  capabilities.innerHTML =
    items.map(
      item =>
        `<span class="capability">
          ${escapeHtml(item)}
        </span>`
    ).join("");

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

        return;
      }


      const reader =
        new FileReader();


      reader.onload =
        event => {

          state.imageData =
            event.target.result;


          if (characterPreview) {

            characterPreview.src =
              state.imageData;

            characterPreview.style.display =
              "block";

          }


          if (characterInfo) {

            characterInfo.textContent =
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
          `${promptInput.value.length}/512`;

      }

    };


  promptInput.addEventListener(
    "input",
    update
  );


  update();

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


async function generateVideo() {

  if (state.generating) {
    return;
  }


  const prompt =
    promptInput?.value.trim();


  if (!prompt) {

    setStatus(
      "Prompt belum diisi.",
      "error"
    );

    return;
  }


  const config =
    PROVIDERS[state.provider];


  if (!config) {
    return;
  }


  /*
   * Luma saat ini tidak menerima
   * imageData lokal melalui jalur ini.
   */

  if (
    state.provider === "luma" &&
    state.imageData
  ) {

    setStatus(
      "Luma image-to-video membutuhkan URL gambar publik. Tanpa storage/CDN publik, gunakan Veo atau MiniMax untuk Character Reference.",
      "error"
    );

    return;
  }


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

      duration:
        Number(
          durationSelect?.value ||
          6
        ),

      aspectRatio:
        aspectSelect?.value ||
        "16:9",

      seed:
        seedInput?.value ||
        "",

      model:
        modelSelect?.value ||
        "",

      resolution:
        resolutionSelect?.value ||
        ""

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
            JSON.stringify(body)
        }
      );


    const data =
      await response.json();


    if (
      !response.ok ||
      !data.success
    ) {

      throw new Error(
        data.error ||
        "Generate gagal."
      );

    }


    setStatus(
      data.message ||
      `${config.name} sedang membuat video...`,
      "loading"
    );


    const id =
      data.operationName ||
      data.taskId ||
      data.generationId;


    if (
      data.status ===
        "completed" &&
      data.videoUrl
    ) {

      showVideo(
        data.videoUrl
      );

      return;
    }


    if (!id) {

      throw new Error(
        "ID proses video tidak ditemukan."
      );

    }


    pollStatus(
      state.provider,
      id
    );


  } catch (error) {

    state.generating =
      false;

    videoButton.disabled =
      false;

    setStatus(
      error.message,
      "error"
    );

  }

}


/* =========================================================
   POLLING
========================================================= */

function pollStatus(
  provider,
  id
) {

  clearTimeout(
    state.pollTimer
  );


  let attempts = 0;

  const maxAttempts = 180;


  async function check() {

    attempts++;


    try {

      const response =
        await fetch(
          `/api/generate?provider=${encodeURIComponent(provider)}&id=${encodeURIComponent(id)}`
        );


      const data =
        await response.json();


      if (
        !response.ok ||
        !data.success
      ) {

        throw new Error(
          data.error ||
          "Gagal membaca status."
        );

      }


      if (
        data.status ===
        "completed"
      ) {

        showVideo(
          data.videoUrl
        );

        return;

      }


      if (
        data.status ===
        "failed"
      ) {

        throw new Error(
          data.error ||
          "Video gagal dibuat."
        );

      }


      setStatus(
        `Membuat video... ${attempts}`,
        "loading"
      );


      if (
        attempts >= maxAttempts
      ) {

        throw new Error(
          "Proses video terlalu lama."
        );

      }


      state.pollTimer =
        setTimeout(
          check,
          5000
        );


    } catch (error) {

      state.generating =
        false;

      videoButton.disabled =
        false;

      setStatus(
        error.message,
        "error"
      );

    }

  }


  check();

}


/* =========================================================
   SHOW VIDEO
========================================================= */

function showVideo(
  videoUrl
) {

  if (!videoUrl) {

    throw new Error(
      "URL video tidak ditemukan."
    );

  }


  if (videoElement) {

    videoElement.src =
      videoUrl;

    videoElement.style.display =
      "block";

    videoElement.load();

  }


  if (downloadElement) {

    downloadElement.href =
      videoUrl;

    downloadElement.download =
      `gen-z-ai-${Date.now()}.mp4`;

    downloadElement.style.display =
      "block";

  }


  state.generating =
    false;

  videoButton.disabled =
    false;


  setStatus(
    "Video berhasil dibuat.",
    "success"
  );

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
    type
      ? `status ${type}`
      : "status";

}


/* =========================================================
   HELPERS
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
    bytes /
    Math.pow(
      1024,
      index
    )
  ).toFixed(1)
    + " " +
    units[index];

}


function escapeHtml(
  value
) {

  return String(value)
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
