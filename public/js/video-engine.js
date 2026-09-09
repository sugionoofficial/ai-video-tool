(function () {
  "use strict";

  const C = window.AIVideoConfig || {};

  // ==============================
  // TOKEN
  // ==============================

  function getToken() {
    if (typeof window.getPollinationsToken === "function") {
      return window.getPollinationsToken();
    }

    return (
      localStorage.getItem(
        C.TOKEN_KEY || "polli_access_token"
      ) ||
      sessionStorage.getItem(
        C.TOKEN_KEY || "polli_access_token"
      )
    );
  }

  // ==============================
  // STATUS
  // ==============================

  function setStatus(message) {
    const el = document.getElementById("status");

    if (el) {
      el.textContent = message;
    }

    if (typeof window.setAIStatus === "function") {
      window.setAIStatus(message);
    }
  }

  // ==============================
  // PROMPT
  // ==============================

  function getPrompt() {
    return (
      document.getElementById("prompt")?.value.trim() ||
      ""
    );
  }

  /*
   * Nova Reel memiliki batas prompt 512 karakter.
   *
   * Prompt pengguna dikirim langsung.
   * Tidak lagi ditambahkan instruksi panjang
   * yang menyebabkan error HTTP 400.
   */

  function buildPrompt(userPrompt) {
    const prompt = userPrompt.trim();

    if (!prompt) {
      throw new Error(
        "Masukkan prompt video terlebih dahulu."
      );
    }

    if (prompt.length > 512) {
      throw new Error(
        "Prompt terlalu panjang. Maksimal 512 karakter. " +
        "Prompt kamu saat ini " +
        prompt.length +
        " karakter."
      );
    }

    return prompt;
  }

  // ==============================
  // CHARACTER FILE
  // ==============================

  function getCharacterFile() {
    return (
      document.getElementById(
        "characterFile"
      )?.files?.[0] || null
    );
  }

  // ==============================
  // VALIDASI GAMBAR
  // ==============================

  function validateImage(file) {
    if (!file) {
      throw new Error(
        "Silakan upload foto karakter terlebih dahulu."
      );
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp"
    ];

    if (!allowedTypes.includes(file.type)) {
      throw new Error(
        "Format foto harus JPG, PNG, atau WEBP."
      );
    }

    const maxSize =
      20 * 1024 * 1024;

    if (file.size > maxSize) {
      throw new Error(
        "Ukuran foto maksimal 20 MB."
      );
    }
  }

  // ==============================
  // UPLOAD CHARACTER
  // ==============================

  async function uploadCharacter(
    file,
    token
  ) {

    setStatus(
      "Mengunggah foto karakter..."
    );

    const formData =
      new FormData();

    formData.append(
      "file",
      file,
      file.name ||
        "character-reference.jpg"
    );

    const response =
      await fetch(
        C.UPLOAD_API,
        {
          method: "POST",

          headers: {
            Authorization:
              "Bearer " + token
          },

          body: formData
        }
      );

    if (!response.ok) {

      const text =
        await response.text();

      throw new Error(
        "Upload karakter gagal: HTTP " +
        response.status +
        " " +
        text
      );
    }

    const data =
      await response.json();

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

  // ==============================
  // GENERATE VIDEO
  // ==============================

  async function generateVideo() {

    const button =
      document.getElementById(
        "videoBtn"
      );

    const video =
      document.getElementById(
        "videoPreview"
      );

    const download =
      document.getElementById(
        "download"
      );

    try {

      // ------------------------------
      // TOKEN
      // ------------------------------

      const token =
        getToken();

      if (!token) {
        throw new Error(
          "Hubungkan akun Pollinations terlebih dahulu."
        );
      }

      // ------------------------------
      // CHARACTER
      // ------------------------------

      const file =
        getCharacterFile();

      validateImage(file);

      // ------------------------------
      // PROMPT
      // ------------------------------

      const userPrompt =
        getPrompt();

      const finalPrompt =
        buildPrompt(
          userPrompt
        );

      // ------------------------------
      // SETTINGS
      // ------------------------------

      const duration =
        document.getElementById(
          "duration"
        )?.value || "5";

      const aspect =
        document.getElementById(
          "aspect"
        )?.value || "16:9";

      // ------------------------------
      // DISABLE BUTTON
      // ------------------------------

      if (button) {
        button.disabled = true;
        button.textContent =
          "MEMBUAT VIDEO...";
      }

      // ------------------------------
      // RESET RESULT
      // ------------------------------

      if (video) {

        video.pause();

        video.removeAttribute(
          "src"
        );

        video.style.display =
          "none";

        video.load();
      }

      if (download) {

        download.removeAttribute(
          "href"
        );

        download.style.display =
          "none";
      }

      // ------------------------------
      // UPLOAD CHARACTER
      // ------------------------------

      const imageURL =
        await uploadCharacter(
          file,
          token
        );

      // ------------------------------
      // STATUS
      // ------------------------------

      setStatus(
        "Foto berhasil diunggah. Membuat video..."
      );

      // ------------------------------
      // QUERY PARAMETER
      // ------------------------------

      const params =
        new URLSearchParams();

      params.set(
        "model",
        C.VIDEO_MODEL ||
          "amazon/nova-reel-v1"
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

      // ------------------------------
      // VIDEO URL
      // ------------------------------

      const url =
        C.VIDEO_API +
        encodeURIComponent(
          finalPrompt
        ) +
        "?" +
        params.toString();

      console.log(
        "GEN-Z.AI VIDEO REQUEST:",
        {
          prompt:
            finalPrompt,

          promptLength:
            finalPrompt.length,

          duration:
            duration,

          aspect:
            aspect,

          image:
            imageURL
        }
      );

      // ------------------------------
      // REQUEST
      // ------------------------------

      const response =
        await fetch(
          url,
          {
            method: "GET",

            headers: {
              Authorization:
                "Bearer " + token,

              Accept:
                "video/mp4"
            }
          }
        );

      // ------------------------------
      // AUTH ERROR
      // ------------------------------

      if (
        response.status === 401
      ) {

        localStorage.removeItem(
          C.TOKEN_KEY ||
            "polli_access_token"
        );

        sessionStorage.removeItem(
          C.TOKEN_KEY ||
            "polli_access_token"
        );

        throw new Error(
          "Token Pollinations sudah tidak valid. Hubungkan kembali."
        );
      }

      // ------------------------------
      // BALANCE ERROR
      // ------------------------------

      if (
        response.status === 402
      ) {

        throw new Error(
          "Saldo Pollinations tidak mencukupi untuk membuat video."
        );
      }

      // ------------------------------
      // OTHER ERROR
      // ------------------------------

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

      // ------------------------------
      // DOWNLOAD RESPONSE
      // ------------------------------

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

      // ------------------------------
      // CREATE VIDEO URL
      // ------------------------------

      const videoURL =
        URL.createObjectURL(
          blob
        );

      // ------------------------------
      // DISPLAY VIDEO
      // ------------------------------

      if (video) {

        video.src =
          videoURL;

        video.style.display =
          "block";

        video.controls =
          true;

        video.playsInline =
          true;

        video.load();
      }

      // ------------------------------
      // DOWNLOAD BUTTON
      // ------------------------------

      if (download) {

        download.href =
          videoURL;

        download.download =
          "gen-z-ai-video-" +
          Date.now() +
          ".mp4";

        download.style.display =
          "block";
      }

      // ------------------------------
      // SUCCESS
      // ------------------------------

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

      if (button) {

        button.disabled =
          false;

        button.textContent =
          "GENERATE VIDEO";
      }
    }
  }

  // ==============================
  // CHARACTER PREVIEW
  // ==============================

  function setupCharacterPreview() {

    const input =
      document.getElementById(
        "characterFile"
      );

    const preview =
      document.getElementById(
        "characterPreview"
      );

    const info =
      document.getElementById(
        "characterInfo"
      );

    if (!input) {
      return;
    }

    input.addEventListener(
      "change",
      function () {

        const file =
          input.files?.[0];

        if (!file) {

          if (preview) {
            preview.style.display =
              "none";

            preview.removeAttribute(
              "src"
            );
          }

          if (info) {
            info.textContent =
              "Pilih foto karakter sebagai referensi.";
          }

          return;
        }

        try {

          validateImage(
            file
          );

        } catch (error) {

          input.value =
            "";

          if (preview) {
            preview.style.display =
              "none";

            preview.removeAttribute(
              "src"
            );
          }

          if (info) {
            info.textContent =
              error.message;
          }

          return;
        }

        const url =
          URL.createObjectURL(
            file
          );

        if (preview) {

          preview.src =
            url;

          preview.style.display =
            "block";
        }

        const sizeMB =
          (
            file.size /
            1024 /
            1024
          ).toFixed(2);

        if (info) {

          info.textContent =
            file.name +
            " • " +
            sizeMB +
            " MB";
        }

      }
    );
  }

  // ==============================
  // SETUP
  // ==============================

  function setup() {

    setupCharacterPreview();

    const button =
      document.getElementById(
        "videoBtn"
      );

    if (button) {

      button.addEventListener(
        "click",
        generateVideo
      );
    }
  }

  // ==============================
  // GLOBAL API
  // ==============================

  window.generateVideoWithNovaReel =
    generateVideo;

  window.__NOVA_REEL_V8_LOADED =
    true;

  // ==============================
  // INIT
  // ==============================

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
