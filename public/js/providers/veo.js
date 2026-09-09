"use strict";

window.GENZProviders = window.GENZProviders || {};

window.GENZProviders.veo = {
  id: "veo",
  name: "Google Veo",
  keyName: "genz_veo_api_key",

  models: [
    {
      id: "veo-3.1-generate-preview",
      name: "Veo 3.1"
    },
    {
      id: "veo-3.1-fast-generate-preview",
      name: "Veo 3.1 Fast"
    },
    {
      id: "veo-3.1-lite-generate-preview",
      name: "Veo 3.1 Lite"
    }
  ],

  renderSettings(container) {
    container.innerHTML = `
      <div class="provider-settings">

        <label>Google Gemini API Key</label>
        <input
          id="veoApiKey"
          type="password"
          placeholder="Masukkan Gemini API Key"
          autocomplete="off"
        />

        <label>Model Veo</label>
        <select id="veoModel">
          ${this.models.map(m =>
            `<option value="${m.id}">${m.name}</option>`
          ).join("")}
        </select>

        <label>Resolusi</label>
        <select id="veoResolution">
          <option value="720p">720p</option>
          <option value="1080p">1080p</option>
          <option value="4k">4K</option>
        </select>

        <label>Durasi</label>
        <select id="veoDuration">
          <option value="4">4 detik</option>
          <option value="6">6 detik</option>
          <option value="8" selected>8 detik</option>
        </select>

        <p class="provider-note">
          Veo 3.1 dapat menghasilkan video dengan audio native.
        </p>

      </div>
    `;

    const saved = sessionStorage.getItem(this.keyName);

    if (saved) {
      document.getElementById("veoApiKey").value = saved;
    }

    document
      .getElementById("veoApiKey")
      .addEventListener("input", e => {
        sessionStorage.setItem(this.keyName, e.target.value.trim());
      });

    document
      .getElementById("veoResolution")
      .addEventListener("change", this.validateSettings);

    document
      .getElementById("veoDuration")
      .addEventListener("change", this.validateSettings);
  },

  validateSettings() {
    const resolution =
      document.getElementById("veoResolution").value;

    const duration =
      document.getElementById("veoDuration").value;

    const select =
      document.getElementById("veoDuration");

    if (resolution !== "720p") {
      select.value = "8";
    }

    if (
      resolution === "4k" ||
      resolution === "1080p"
    ) {
      select.value = "8";
    }
  },

  async generate({
    prompt,
    image,
    aspectRatio,
    duration
  }) {

    const apiKey =
      sessionStorage.getItem(this.keyName) ||
      document.getElementById("veoApiKey")?.value?.trim();

    if (!apiKey) {
      throw new Error("Masukkan Google Gemini API Key terlebih dahulu.");
    }

    const model =
      document.getElementById("veoModel")?.value ||
      "veo-3.1-generate-preview";

    let resolution =
      document.getElementById("veoResolution")?.value ||
      "720p";

    let finalDuration =
      Number(
        document.getElementById("veoDuration")?.value ||
        duration ||
        8
      );

    if (resolution !== "720p") {
      finalDuration = 8;
    }

    if (resolution === "4k") {
      finalDuration = 8;
    }

    const cleanImage = await this.prepareImage(image);

    const body = {
      instances: [
        {
          prompt: prompt,
          image: cleanImage
            ? {
                inlineData: {
                  mimeType: cleanImage.mimeType,
                  data: cleanImage.base64
                }
              }
            : undefined
        }
      ],
      parameters: {
        aspectRatio:
          aspectRatio === "9:16" ? "9:16" : "16:9",

        durationSeconds: String(finalDuration),

        resolution: resolution,

        numberOfVideos: 1
      }
    };

    if (!cleanImage) {
      delete body.instances[0].image;
    }

    const endpoint =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:predictLongRunning`;

    const response = await fetch(endpoint, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },

      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.error?.message ||
        "Gagal mengirim permintaan ke Veo."
      );
    }

    if (!data.name) {
      throw new Error("Veo tidak mengembalikan operation ID.");
    }

    return await this.pollOperation(
      data.name,
      apiKey
    );
  },

  async pollOperation(operationName, apiKey) {

    const url =
      `https://generativelanguage.googleapis.com/v1beta/${operationName}`;

    for (let i = 0; i < 120; i++) {

      await new Promise(resolve =>
        setTimeout(resolve, 10000)
      );

      const response = await fetch(url, {
        headers: {
          "x-goog-api-key": apiKey
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error?.message ||
          "Gagal mengecek status Veo."
        );
      }

      if (data.done) {

        if (data.error) {
          throw new Error(
            data.error.message ||
            "Veo gagal membuat video."
          );
        }

        const video =
          data?.response
            ?.generateVideoResponse
            ?.generatedSamples?.[0]
            ?.video;

        if (!video) {
          throw new Error(
            "Veo selesai tetapi URL video tidak ditemukan."
          );
        }

        return {
          videoUrl: video.uri,
          provider: "veo"
        };
      }
    }

    throw new Error(
      "Veo terlalu lama memproses video."
    );
  },

  async prepareImage(image) {

    if (!image) return null;

    if (image.startsWith("data:")) {

      const match =
        image.match(/^data:(.*?);base64,(.*)$/);

      if (!match) return null;

      return {
        mimeType: match[1],
        base64: match[2]
      };
    }

    const response = await fetch(image);

    if (!response.ok) {
      throw new Error(
        "Gagal membaca gambar karakter."
      );
    }

    const blob = await response.blob();

    const base64 =
      await new Promise((resolve, reject) => {

        const reader = new FileReader();

        reader.onloadend = () => {
          const result = reader.result;

          resolve(
            result.split(",")[1]
          );
        };

        reader.onerror = reject;

        reader.readAsDataURL(blob);
      });

    return {
      mimeType: blob.type || "image/png",
      base64
    };
  }
};
