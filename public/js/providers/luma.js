"use strict";

window.GENZProviders = window.GENZProviders || {};

window.GENZProviders.luma = {
  id: "luma",
  name: "Luma Dream Machine",
  keyName: "genz_luma_api_key",

  models: [
    {
      id: "ray-2",
      name: "Ray 2"
    },
    {
      id: "ray-flash-2",
      name: "Ray 2 Flash"
    }
  ],

  renderSettings(container) {

    container.innerHTML = `
      <div class="provider-settings">

        <label>Luma API Key</label>

        <input
          id="lumaApiKey"
          type="password"
          placeholder="Masukkan Luma API Key"
          autocomplete="off"
        />

        <label>Model</label>

        <select id="lumaModel">
          <option value="ray-2">
            Ray 2
          </option>

          <option value="ray-flash-2">
            Ray 2 Flash
          </option>
        </select>

        <label>Resolusi</label>

        <select id="lumaResolution">
          <option value="720p">720p</option>
          <option value="1080p">1080p</option>
          <option value="4k">4K</option>
        </select>

        <p class="provider-note">
          Luma membutuhkan URL publik untuk gambar
          karakter saat menggunakan Image-to-Video.
        </p>

      </div>
    `;

    const saved =
      sessionStorage.getItem(this.keyName);

    if (saved) {
      document.getElementById(
        "lumaApiKey"
      ).value = saved;
    }

    document
      .getElementById("lumaApiKey")
      .addEventListener("input", e => {

        sessionStorage.setItem(
          this.keyName,
          e.target.value.trim()
        );

      });
  },

  async generate({
    prompt,
    image,
    imageUrl,
    aspectRatio,
    duration
  }) {

    const apiKey =
      sessionStorage.getItem(this.keyName) ||
      document.getElementById(
        "lumaApiKey"
      )?.value?.trim();

    if (!apiKey) {
      throw new Error(
        "Masukkan Luma API Key terlebih dahulu."
      );
    }

    /*
     * Luma memerlukan URL publik.
     */
    const publicImageUrl =
      imageUrl ||
      (
        image &&
        /^https?:\/\//i.test(image)
          ? image
          : null
      );

    if (!publicImageUrl) {
      throw new Error(
        "Luma membutuhkan URL publik untuk gambar karakter. Upload/CDN proxy akan ditambahkan pada tahap Cloudflare Worker."
      );
    }

    const model =
      document.getElementById(
        "lumaModel"
      )?.value ||
      "ray-2";

    const resolution =
      document.getElementById(
        "lumaResolution"
      )?.value ||
      "720p";

    const body = {
      prompt,
      model,
      resolution,

      aspect_ratio:
        aspectRatio === "9:16"
          ? "9:16"
          : aspectRatio || "16:9",

      duration:
        `${Number(duration || 5)}s`,

      keyframes: {
        frame0: {
          type: "image",
          url: publicImageUrl
        }
      }
    };

    const response = await fetch(
      "https://api.lumalabs.ai/dream-machine/v1/generations",
      {
        method: "POST",

        headers: {
          "accept": "application/json",
          "authorization": `Bearer ${apiKey}`,
          "content-type": "application/json"
        },

        body: JSON.stringify(body)
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.failure_reason ||
        data?.message ||
        "Gagal membuat video Luma."
      );
    }

    if (!data.id) {
      throw new Error(
        "Luma tidak mengembalikan generation ID."
      );
    }

    return await this.pollGeneration(
      apiKey,
      data.id
    );
  },

  async pollGeneration(
    apiKey,
    generationId
  ) {

    const url =
      `https://api.lumalabs.ai/dream-machine/v1/generations/${generationId}`;

    for (let i = 0; i < 120; i++) {

      await new Promise(resolve =>
        setTimeout(resolve, 8000)
      );

      const response = await fetch(url, {
        headers: {
          "accept": "application/json",
          "authorization": `Bearer ${apiKey}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.failure_reason ||
          "Gagal mengecek status Luma."
        );
      }

      if (data.state === "completed") {

        const videoUrl =
          data?.assets?.video;

        if (!videoUrl) {
          throw new Error(
            "Luma selesai tetapi URL video tidak ditemukan."
          );
        }

        return {
          videoUrl,
          provider: "luma"
        };
      }

      if (data.state === "failed") {
        throw new Error(
          data.failure_reason ||
          "Luma gagal membuat video."
        );
      }
    }

    throw new Error(
      "Luma terlalu lama memproses video."
    );
  }
};
