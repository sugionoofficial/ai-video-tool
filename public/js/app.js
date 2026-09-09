"use strict";

const state = {
  provider: "veo",
  imageData: null,
  generating: false,
  pollTimer: null
};

const PROVIDERS = {
  veo: {
    name: "Google Veo",
    models: [
      {
        id: "veo-3.1-fast-generate-preview",
        name: "Veo 3.1 Fast"
      },
      {
        id: "veo-3.1-generate-preview",
        name: "Veo 3.1"
      }
    ],
    durations: [4, 6, 8],
    aspectRatios: ["16:9", "9:16"],
    resolutions: ["720p", "1080p", "4k"]
  },

  minimax: {
    name: "MiniMax / Hailuo",
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
    aspectRatios: ["16:9", "9:16"],
    resolutions: ["768P", "1080P"]
  },

  luma: {
    name: "Luma",
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
    aspectRatios: [
      "16:9",
      "9:16",
      "1:1",
      "4:3",
      "3:4"
    ],
    resolutions: []
  },

  pollinations: {
    name: "Pollinations",
    models: [
      {
        id: "seedance-2.5",
        name: "Seedance 2.5"
      }
    ],
    durations: [5, 10],
    aspectRatios: ["16:9", "9:16", "1:1"],
    resolutions: []
  },

  fal: {
    name: "fal.ai",
    models: [],
    durations: [5, 10],
    aspectRatios: ["16:9", "9:16"],
    resolutions: []
  },

  runway: {
    name: "Runway",
    models: [],
    durations: [5, 10],
    aspectRatios: ["16:9", "9:16"],
    resolutions: []
  }
};

/* =========================================================
   DOM
========================================================= */

const $ = id => document.getElementById(id);

const providerSelect =
  $("provider");

const providerSettings =
  $("providerSettings");

const characterFile =
  $("characterFile");

const characterPreview =
  $("characterPreview");

const characterInfo =
  $("characterInfo");

const prompt =
  $("prompt");

const promptCounter =
  $("promptCounter");

const duration =
  $("duration");

const aspect =
  $("aspect");

const seed =
  $("seed");

const videoBtn =
  $("videoBtn");

const status =
  $("status");

const videoPreview =
  $("videoPreview");

const download =
  $("download");

/* =========================================================
   INIT
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  init
);

function init() {
  setupProviderSelector();
  setupCharacterUpload();
  setupPromptCounter();
  setupGenerate();

  renderProvider();
}

/* =========================================================
   PROVIDER
========================================================= */

function setupProviderSelector() {
  if (!providerSelect) return;

  providerSelect.addEventListener(
    "change",
    () => {
      state.provider =
        providerSelect.value;

      renderProvider();
    }
  );
}

function renderProvider() {
  const provider =
    PROVIDERS[state.provider];

  if (!provider) return;

  if (providerSettings) {
    providerSettings.innerHTML = `
      <div class="provider-box">
        <strong>${escapeHtml(provider.name)}</strong>
        <div class="provider-note">
          API key disimpan di Cloudflare Worker.
        </div>
      </div>
    `;
  }

  renderSelect(
    duration,
    provider.durations,
    value =>
      `${value} detik`
  );

  renderSelect(
    aspect,
    provider.aspectRatios,
    value =>
      value
  );

  if (
    provider.resolutions &&
    provider.resolutions.length
  ) {
    addResolutionControl(
      provider.resolutions
    );
  }

  renderModelControl(
    provider.models
  );

  updateProviderNotice();
}

/* =========================================================
   MODEL
========================================================= */

function renderModelControl(models) {
  let modelSelect =
    $("model");

  if (!models.length) {
    if (modelSelect) {
      modelSelect.remove();
    }

    return;
  }

  if (!modelSelect) {
    modelSelect =
      document.createElement("select");

    modelSelect.id = "model";
    modelSelect.className = "control";

    const label =
      document.createElement("label");

    label.textContent =
      "Model";

    label.htmlFor =
      "model";

    if (providerSettings) {
      providerSettings.appendChild(label);
      providerSettings.appendChild(
        modelSelect
      );
    }
  }

  modelSelect.innerHTML =
    models.map(model => `
      <option value="${escapeHtml(model.id)}">
        ${escapeHtml(model.name)}
      </option>
    `).join("");
}

/* =========================================================
   RESOLUTION
========================================================= */

function addResolutionControl(resolutions) {
  let select =
    $("resolution");

  if (!select) {
    select =
      document.createElement("select");

    select.id =
      "resolution";

    select.className =
      "control";

    const label =
      document.createElement("label");

    label.textContent =
      "Resolusi";

    label.htmlFor =
      "resolution";

    if (providerSettings) {
      providerSettings.appendChild(label);
      providerSettings.appendChild(select);
    }
  }

  select.innerHTML =
    resolutions.map(
      value =>
        `<option value="${value}">
          ${value}
        </option>`
    ).join("");
}

/* =========================================================
   SELECT
========================================================= */

function renderSelect(
  element,
  values,
  formatter
) {
  if (!element) return;

  element.innerHTML =
    values.map(
      value =>
        `<option value="${value}">
          ${formatter(value)}
        </option>`
    ).join("");
}

/* =========================================================
   CHARACTER
========================================================= */

function setupCharacterUpload() {
  if (!characterFile) return;

  characterFile.addEventListener(
    "change",
    async event => {

      const file =
        event.target.files?.[0];

      if (!file) return;

      if (!file.type.startsWith("image/")) {
        setStatus(
          "File harus berupa gambar.",
          "error"
        );

        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setStatus(
          "Ukuran gambar maksimal 10 MB.",
          "error"
        );

        return;
      }

      const reader =
        new FileReader();

      reader.onload = () => {
        state.imageData =
          reader.result;

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

      reader.readAsDataURL(file);
    }
  );
}

/* =========================================================
   PROMPT
========================================================= */

function setupPromptCounter() {
  if (!prompt) return;

  const update = () => {
    if (promptCounter) {
      promptCounter.textContent =
        `${prompt.value.length}/512`;
    }
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
  if (!videoBtn) return;

  videoBtn.addEventListener(
    "click",
    generateVideo
  );
}

async function generateVideo() {
  if (state.generating) return;

  const text =
    prompt?.value.trim();

  if (!text) {
    setStatus(
      "Masukkan prompt terlebih dahulu.",
      "error"
    );

    return;
  }

  state.generating = true;

  videoBtn.disabled = true;

  setStatus(
    "Mengirim permintaan ke Worker...",
    "loading"
  );

  if (videoPreview) {
    videoPreview.removeAttribute("src");
    videoPreview.style.display =
      "none";
  }

  if (download) {
    download.style.display =
      "none";
  }

  try {

    const body = {
      provider: state.provider,
      prompt: text,
      imageData: state.imageData,
      duration:
        Number(duration?.value || 6),
      aspectRatio:
        aspect?.value || "16:9",
      seed:
        seed?.value || ""
    };

    const model =
      $("model");

    if (model) {
      body.model =
        model.value;
    }

    const resolution =
      $("resolution");

    if (resolution) {
      body.resolution =
        resolution.value;
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
      await response.json();

    if (!response.ok ||
        !data.success) {

      throw new Error(
        data.error ||
        "Generate gagal."
      );
    }

    setStatus(
      data.message ||
      "Video sedang dibuat...",
      "loading"
    );

    const id =
      data.operationName ||
      data.taskId ||
      data.generationId;

    if (
      data.status === "completed" &&
      data.videoUrl
    ) {
      showVideo(data.videoUrl);
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

    state.generating = false;
    videoBtn.disabled = false;

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

  const poll = async () => {

    attempts++;

    try {

      const response =
        await fetch(
          `/api/generate?provider=${encodeURIComponent(provider)}&id=${encodeURIComponent(id)}`
        );

      const data =
        await response.json();

      if (!response.ok ||
          !data.success) {

        throw new Error(
          data.error ||
          "Gagal mengecek status."
        );
      }

      if (
        data.status ===
        "completed"
      ) {

        state.generating =
          false;

        videoBtn.disabled =
          false;

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

      if (attempts >= maxAttempts) {
        throw new Error(
          "Waktu pembuatan video terlalu lama."
        );
      }

      state.pollTimer =
        setTimeout(
          poll,
          5000
        );

    } catch (error) {

      state.generating =
        false;

      videoBtn.disabled =
        false;

      setStatus(
        error.message,
        "error"
      );
    }
  };

  poll();
}

/* =========================================================
   VIDEO RESULT
========================================================= */

function showVideo(videoUrl) {

  if (!videoUrl) {
    setStatus(
      "Video selesai tetapi URL tidak ditemukan.",
      "error"
    );

    return;
  }

  if (videoPreview) {

    videoPreview.src =
      videoUrl;

    videoPreview.controls =
      true;

    videoPreview.style.display =
      "block";

    videoPreview.load();
  }

  if (download) {
    download.href =
      videoUrl;

    download.download =
      `gen-z-ai-${Date.now()}.mp4`;

    download.style.display =
      "inline-block";
  }

  setStatus(
    "Video berhasil dibuat.",
    "success"
  );

  state.generating =
    false;

  videoBtn.disabled =
    false;
}

/* =========================================================
   STATUS
========================================================= */

function setStatus(
  message,
  type = ""
) {
  if (!status) return;

  status.textContent =
    message;

  status.className =
    `status ${type}`;
}

/* =========================================================
   PROVIDER NOTICE
========================================================= */

function updateProviderNotice() {
  if (!providerSettings) return;

  const existing =
    $("providerNotice");

  if (existing) {
    existing.remove();
  }

  const notice =
    document.createElement("div");

  notice.id =
    "providerNotice";

  notice.className =
    "provider-note";

  if (state.provider === "luma") {
    notice.textContent =
      "Luma image-to-video memerlukan URL gambar publik. Mode karakter upload belum tersedia tanpa storage/CDN publik.";
  } else if (
    state.provider === "veo"
  ) {
    notice.textContent =
      "Veo menggunakan image-to-video langsung melalui Cloudflare Worker.";
  } else if (
    state.provider === "minimax"
  ) {
    notice.textContent =
      "MiniMax dapat menerima karakter sebagai Base64 melalui Worker.";
  } else {
    notice.textContent =
      "Provider ini belum diarahkan ke Worker pada versi ini.";
  }

  providerSettings.appendChild(
    notice
  );
}

/* =========================================================
   HELPERS
========================================================= */

function formatBytes(bytes) {
  if (!bytes) return "0 B";

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

  return `${(
    bytes /
    Math.pow(1024, index)
  ).toFixed(1)} ${units[index]}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
