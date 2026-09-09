(function () {
  "use strict";

  const C = window.AIVideoConfig || {};

  function getToken() {
    if (typeof window.getPollinationsToken === "function") {
      return window.getPollinationsToken();
    }

    return (
      localStorage.getItem(C.TOKEN_KEY || "polli_access_token") ||
      sessionStorage.getItem(C.TOKEN_KEY || "polli_access_token")
    );
  }

  function setStatus(message) {
    const el = document.getElementById("status");

    if (el) {
      el.textContent = message;
    }

    if (typeof window.setAIStatus === "function") {
      window.setAIStatus(message);
    }
  }

  function getPrompt() {
    return document.getElementById("prompt")?.value.trim() || "";
  }

  function getCharacterFile() {
    return document.getElementById("characterFile")?.files?.[0] || null;
  }

  function validateImage(file) {
    if (!file) {
      throw new Error("Silakan upload foto karakter terlebih dahulu.");
    }

    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp"
    ];

    if (!allowed.includes(file.type)) {
      throw new Error(
        "Format foto harus JPG, PNG, atau WEBP."
      );
    }

    const maxSize = 20 * 1024 * 1024;

    if (file.size > maxSize) {
      throw new Error(
        "Ukuran foto maksimal 20 MB."
      );
    }
  }

  async function uploadCharacter(file, token) {

    setStatus("Mengunggah foto karakter...");

    const formData = new FormData();

    formData.append(
      "file",
      file,
      file.name || "character-reference.jpg"
    );

    const response = await fetch(
      C.UPLOAD_API,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token
        },
        body: formData
      }
    );

    if (!response.ok) {
      const text = await response.text();

      throw new Error(
        "Upload karakter gagal: HTTP " +
        response.status +
        " " +
        text
      );
    }

    const data = await response.json();

    const imageURL =
      data.url ||
      data.imageUrl ||
      data.image_url ||
      data.location;

    if (!imageURL) {
      throw new Error(
        "Server upload tidak mengembalikan URL gambar."
      );
    }

    return imageURL;
  }

  function buildPrompt(userPrompt) {

    return `
Use the uploaded character reference image as the primary identity reference.

Preserve the character's identity, facial structure, hairstyle,
skin tone, body proportions, and overall appearance consistently
throughout the entire video.

Do not replace the character.
Do not create another person.
Do not duplicate the character.
Do not morph the face.
Do not change the identity.

Animate the character naturally according to the user's video
description.

Natural human movement.
Natural facial expressions.
Realistic body motion.
Consistent anatomy.
Stable character appearance.

User video description:
${userPrompt}
`.trim();
  }

  async function generateVideo() {

    const button = document.getElementById("videoBtn");
    const video = document.getElementById("videoPreview");
    const download = document.getElementById("download");

    try {

      const token = getToken();

      if (!token) {
        throw new Error(
          "Hubungkan akun Pollinations terlebih dahulu."
        );
      }

      const file = getCharacterFile();

      validateImage(file);

      const userPrompt = getPrompt();

      if (!userPrompt) {
        throw new Error(
          "Masukkan prompt video terlebih dahulu."
        );
      }

      const duration =
        document.getElementById("duration")?.value || "5";

      const aspect =
        document.getElementById("aspect")?.value || "16:9";

      button.disabled = true;

      if (video) {
        video.style.display = "none";
        video.removeAttribute("src");
        video.load();
      }

      if (download) {
        download.style.display = "none";
        download.removeAttribute("href");
      }

      const imageURL =
        await uploadCharacter(file, token);

      setStatus(
        "Membuat video dengan Nova Reel..."
      );

      const finalPrompt =
        buildPrompt(userPrompt);

      const params = new URLSearchParams();

      params.set(
        "model",
        C.VIDEO_MODEL || "amazon/nova-reel-v1"
      );

      params.set(
        "duration",
        duration
      );

      params.set(
        "aspectRatio",
        aspect
      );

      params.set(
        "image",
        imageURL
      );

      const url =
        C.VIDEO_API +
        encodeURIComponent(finalPrompt) +
        "?" +
        params.toString();

      const response = await fetch(
        url,
        {
          method: "GET",
          headers: {
            Authorization: "Bearer " + token,
            Accept: "video/mp4"
          }
        }
      );

      if (response.status === 401) {

        localStorage.removeItem(
          C.TOKEN_KEY || "polli_access_token"
        );

        sessionStorage.removeItem(
          C.TOKEN_KEY || "polli_access_token"
        );

        throw new Error(
          "Token Pollinations sudah tidak valid. Hubungkan kembali."
        );
      }

      if (response.status === 402) {
        throw new Error(
          "Saldo Pollinations tidak mencukupi untuk membuat video."
        );
      }

      if (!response.ok) {

        const text =
          await response.text();

        throw new Error(
          "Generate video gagal: HTTP " +
          response.status +
          " " +
          text
        );
      }

      setStatus(
        "Video berhasil dibuat. Menyiapkan hasil..."
      );

      const blob =
        await response.blob();

      if (!blob.size) {
        throw new Error(
          "Video kosong atau tidak valid."
        );
      }

      const videoURL =
        URL.createObjectURL(blob);

      if (video) {

        video.src = videoURL;
        video.style.display = "block";
        video.controls = true;

        video.load();
      }

      if (download) {

        download.href = videoURL;
        download.download =
          "gen-z-ai-video-" +
          Date.now() +
          ".mp4";

        download.style.display =
          "block";
      }

      setStatus(
        "Video berhasil dibuat."
      );

    } catch (error) {

      console.error(
        "GEN-Z.AI VIDEO ERROR:",
        error
      );

      setStatus(
        error?.message ||
        "Terjadi kesalahan saat membuat video."
      );

    } finally {

      button.disabled = false;

    }
  }

  function setupCharacterPreview() {

    const input =
      document.getElementById("characterFile");

    const preview =
      document.getElementById("characterPreview");

    const info =
      document.getElementById("characterInfo");

    if (!input) return;

    input.addEventListener(
      "change",
      function () {

        const file =
          input.files?.[0];

        if (!file) {

          preview.style.display =
            "none";

          info.textContent =
            "Pilih foto karakter sebagai referensi.";

          return;
        }

        try {

          validateImage(file);

        } catch (error) {

          input.value = "";

          preview.style.display =
            "none";

          info.textContent =
            error.message;

          return;
        }

        const url =
          URL.createObjectURL(file);

        preview.src = url;
        preview.style.display =
          "block";

        const sizeMB =
          (file.size / 1024 / 1024)
            .toFixed(2);

        info.textContent =
          file.name +
          " • " +
          sizeMB +
          " MB";

      }
    );
  }

  function setup() {

    setupCharacterPreview();

    const button =
      document.getElementById("videoBtn");

    if (button) {

      button.addEventListener(
        "click",
        generateVideo
      );
    }
  }

  window.generateVideoWithNovaReel =
    generateVideo;

  window.__NOVA_REEL_V8_LOADED =
    true;

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      setup
    );

  } else {

    setup();

  }

})();
