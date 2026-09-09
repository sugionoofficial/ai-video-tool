"use strict";

window.GENZProviders = window.GENZProviders || {};

window.GENZProviders.minimax = {
  id: "minimax",
  name: "MiniMax / Hailuo",
  keyName: "genz_minimax_api_key",

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

  renderSettings(container) {

    container.innerHTML = `
      <div class="provider-settings">

        <label>MiniMax API Key</label>

        <input
          id="minimaxApiKey"
          type="password"
          placeholder="Masukkan MiniMax API Key"
          autocomplete="off"
        />

        <label>Model</label>

        <select id="minimaxModel">
          ${this.models.map(model => `
            <option value="${model.id}">
              ${model.name}
            </option>
          `).join("")}
        </select>

        <label>Resolusi</label>

        <select id="minimaxResolution">
          <option value="768P">768P</option>
          <option value="1080P">1080P</option>
        </select>

        <label>Durasi</label>

        <select id="minimaxDuration">
          <option value="6">6 detik</option>
          <option value="10">10 detik</option>
        </select>

        <label>
          <input
            id="minimaxPromptOptimizer"
            type="checkbox"
            checked
          />

          Optimalkan prompt otomatis
        </label>

        <p class="provider-note">
          Mendukung kontrol kamera seperti
          [Pan left], [Push in], [Zoom in],
          [Tracking shot] dan [Static shot].
        </p>

      </div>
    `;

    const saved =
      sessionStorage.getItem(this.keyName);

    if (saved) {
      document.getElementById(
        "minimaxApiKey"
      ).value = saved;
    }

    document
      .getElementById("minimaxApiKey")
      .addEventListener("input", e => {

        sessionStorage.setItem(
          this.keyName,
          e.target.value.trim()
        );

      });

    this.updateResolutionOptions();
  },

  updateResolutionOptions() {

    const model =
      document.getElementById(
        "minimaxModel"
      )?.value;

    const resolution =
      document.getElementById(
        "minimaxResolution"
      );

    const duration =
      document.getElementById(
        "minimaxDuration"
      );

    if (!resolution || !duration) return;

    if (model === "MiniMax-Hailuo-02") {

      resolution.innerHTML = `
        <option value="512P">512P</option>
        <option value="768P" selected>768P</option>
        <option value="1080P">1080P</option>
      `;

    } else {

      resolution.innerHTML = `
        <option value="768P" selected>768P</option>
        <option value="1080P">1080P</option>
      `;

    }
  },

  async generate({
    prompt,
    image
  }) {

    const apiKey =
      sessionStorage.getItem(this.keyName) ||
      document.getElementById(
        "minimaxApiKey"
      )?.value?.trim();

    if (!apiKey) {
      throw new Error(
        "Masukkan MiniMax API Key terlebih dahulu."
      );
    }

    const model =
      document.getElementById(
        "minimaxModel"
      )?.value ||
      "MiniMax-Hailuo-2.3";

    const resolution =
      document.getElementById(
        "minimaxResolution"
      )?.value ||
      "768P";

    let duration =
      Number(
        document.getElementById(
          "minimaxDuration"
        )?.value || 6
      );

    if (
      resolution === "1080P" &&
      duration === 10 &&
      model !== "MiniMax-Hailuo-02"
    ) {
      duration = 6;
    }

    const optimizer =
      document.getElementById(
        "minimaxPromptOptimizer"
      )?.checked ?? true;

    const body = {
      model,
      prompt,
      duration,
      resolution,
      prompt_optimizer: optimizer
    };

    if (image) {
      body.first_frame_image = image;
    }

    const response = await fetch(
      "https://api.minimax.io/v1/video_generation",
      {
        method: "POST",

        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },

        body: JSON.stringify(body)
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.base_resp?.status_msg ||
        data?.error ||
        "Gagal membuat video MiniMax."
      );
    }

    if (
      data?.base_resp &&
      data.base_resp.status_code !== 0
    ) {
      throw new Error(
        data.base_resp.status_msg ||
        "MiniMax menolak permintaan."
      );
    }

    if (!data.task_id) {
      throw new Error(
        "MiniMax tidak mengembalikan task ID."
      );
    }

    return await this.pollTask(
      apiKey,
      data.task_id
    );
  },

  async pollTask(apiKey, taskId) {

    const url =
      `https://api.minimax.io/v1/query/video_generation?task_id=${encodeURIComponent(taskId)}`;

    for (let i = 0; i < 120; i++) {

      await new Promise(resolve =>
        setTimeout(resolve, 8000)
      );

      const response = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${apiKey}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.base_resp?.status_msg ||
          "Gagal mengecek status MiniMax."
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

        return await this.getFile(
          apiKey,
          fileId
        );
      }

      if (
        status === "Failed" ||
        status === "failed"
      ) {
        throw new Error(
          data?.base_resp?.status_msg ||
          "MiniMax gagal membuat video."
        );
      }
    }

    throw new Error(
      "MiniMax terlalu lama memproses video."
    );
  },

  async getFile(apiKey, fileId) {

    const response = await fetch(
      `https://api.minimax.io/v1/files/retrieve?file_id=${encodeURIComponent(fileId)}`,
      {
        headers: {
          "Authorization": `Bearer ${apiKey}`
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.base_resp?.status_msg ||
        "Gagal mendapatkan file video MiniMax."
      );
    }

    const url =
      data?.file?.download_url ||
      data?.download_url;

    if (!url) {
      throw new Error(
        "URL video MiniMax tidak ditemukan."
      );
    }

    return {
      videoUrl: url,
      provider: "minimax"
    };
  }
};
