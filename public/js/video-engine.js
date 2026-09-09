(function () {
  "use strict";

  const C = window.AIVideoConfig || {};

  const DEFAULT_MODEL =
    C.VIDEO_MODEL || "amazon/nova-reel-v1";

  const DEFAULT_DURATION = "6";
  const DEFAULT_ASPECT = "16:9";

  const MIN_SEED = 0;
  const MAX_SEED = 2147483646;

  let characterPreviewURL = null;
  let generatedVideoURL = null;

  // ==========================================
  // TOKEN
  // ==========================================

  function getToken() {
    if (
      typeof window.getPollinationsToken ===
      "function"
    ) {
      return window.getPollinationsToken();
    }

    const key =
      C.TOKEN_KEY ||
      "polli_access_token";

    return (
      localStorage.getItem(key) ||
      sessionStorage.getItem(key) ||
      ""
    );
  }

  function clearToken() {
    const key =
      C.TOKEN_KEY ||
      "polli_access_token";

    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }

  // ==========================================
  // STATUS
  // ==========================================

  function setStatus(message) {
    const el =
      document.getElementById("status");

    if (el) {
      el.textContent = message;
    }

    if (
      typeof window.setAIStatus ===
      "function"
    ) {
      window.setAIStatus(message);
    }
  }

  // ==========================================
  // PROMPT
  // ==========================================

  function getPrompt() {
    return (
      document
        .getElementById("prompt")
        ?.value
        ?.trim() || ""
    );
  }

  function buildPrompt(userPrompt) {
    const prompt =
      String(userPrompt || "").trim();

    if (!prompt) {
      throw new Error(
        "Masukkan prompt video terlebih dahulu."
      );
    }

    if (prompt.length > 512) {
      throw new Error(
        "Prompt terlalu panjang. Maksimal 512 karakter. " +
        "Saat ini: " +
        prompt.length +
        " karakter."
      );
    }

    return prompt;
  }

  // ==========================================
  // CHARACTER FILE
  // ==========================================

  function getCharacterFile() {
    const input =
      document.getElementById(
        "characterFile"
      );

    return (
      input?.files?.[0] ||
      null
    );
  }

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

    if (
      !allowedTypes.includes(
        file.type
      )
    ) {
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

  // ==========================================
  // DURATION
  // ==========================================

  function getDuration() {
    const value =
      document
        .getElementById("duration")
        ?.value ||
      DEFAULT_DURATION;

    const duration =
      Number(value);

    if (
      !Number.isInteger(duration)
    ) {
      throw new Error(
        "Durasi video tidak valid."
      );
    }

    /*
     * Nova Reel menggunakan durasi
     * dalam kelipatan 6 detik.
     */

    if (
      duration < 6 ||
      duration > 120 ||
      duration % 6 !== 0
    ) {
      throw new Error(
        "Durasi Nova Reel harus 6 sampai 120 detik dan kelipatan 6."
      );
    }

    return duration;
  }

  // ==========================================
  // ASPECT RATIO
  // ==========================================

  function getAspectRatio() {
    const value =
      document
        .getElementById("aspect")
        ?.value ||
      DEFAULT_ASPECT;

    const allowed = [
      "16:9",
      "9:16",
      "1:1"
    ];

    if (
      !allowed.includes(value)
    ) {
      return DEFAULT_ASPECT;
    }

    return value;
  }

  // ==========================================
  // SEED
  // ==========================================

  function getSeed() {
    const input =
      document
        .getElementById("seed");

    if (!input) {
      return null;
    }

    const value =
      input.value.trim();

    if (value === "") {
      return null;
    }

    const seed =
      Number(value);

    if (
      !Number.isInteger(seed)
    ) {
      throw new Error(
        "Seed harus berupa angka bulat."
      );
    }

    if (
      seed < MIN_SEED ||
      seed > MAX_SEED
    ) {
      throw new Error(
        "Seed harus berada antara 0 sampai 2147483646."
      );
    }

    return seed;
  }

  // ==========================================
  // UPLOAD CHARACTER
  // ==========================================

  async function uploadCharacter(
    file,
    token
  ) {
    if (!C.UPLOAD_API) {
      throw new Error(
        "UPLOAD_API belum dikonfigurasi."
      );
    }

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

    let response;

    try {
      response =
        await fetch(
          C.UPLOAD_API,
          {
            method: "POST",

            headers: {
              Authorization:
                "Bearer " +
                token
            },

            body: formData
          }
        );
    } catch (error) {
      throw new Error(
        "Tidak dapat terhubung ke server upload."
      );
    }

    if (
      response.status === 401
    ) {
      clearToken();

      throw new Error(
        "Token Pollinations sudah tidak valid. Hubungkan kembali."
      );
    }

    if (
      response.status === 402
    ) {
      throw new Error(
        "Saldo Pollinations tidak mencukupi untuk upload."
      );
    }

    if (!response.ok) {
      const text =
        await response.text();

      throw new Error(
        "Upload karakter gagal: HTTP " +
        response.status +
        (text
          ? " " + text
          : "")
      );
    }

    let data;

    try {
      data =
        await response.json();
    } catch {
      throw new Error(
        "Server upload memberikan respons yang tidak valid."
      );
    }

    const imageURL =
      data?.url ||
      data?.imageUrl ||
      data?.image_url ||
      data?.location;

    if (
      typeof imageURL !==
        "string" ||
      !imageURL.trim()
    ) {
      throw new Error(
        "Server upload tidak mengembalikan URL gambar."
      );
    }

    try {
      new URL(imageURL);
    } catch {
      throw new Error(
        "URL gambar dari server tidak valid."
      );
    }

    return imageURL;
  }

  // ==========================================
  // RESET RESULT
  // ==========================================

  function resetResult() {
    const video =
      document.getElementById(
        "videoPreview"
      );

    const download =
      document.getElementById(
        "download"
      );

    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.load();
      video.style.display = "none";
    }

    if (download) {
      download.removeAttribute(
        "href"
      );

      download.style.display =
        "none";
    }

    if (generatedVideoURL) {
      URL.revokeObjectURL(
        generatedVideoURL
      );

      generatedVideoURL =
        null;
    }
  }

  // ==========================================
  // GENERATE VIDEO
  // ==========================================

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
      // --------------------------------------
      // TOKEN
      // --------------------------------------

      const token =
        getToken();

      if (!token) {
        throw new Error(
          "Hubungkan akun Pollinations terlebih dahulu."
        );
      }

      // --------------------------------------
      // CHARACTER
      // --------------------------------------

      const file =
        getCharacterFile();

      validateImage(file);

      // --------------------------------------
      // PROMPT
      // --------------------------------------

      const finalPrompt =
        buildPrompt(
          getPrompt()
        );

      // --------------------------------------
      // SETTINGS
      // --------------------------------------

      const duration =
        getDuration();

      const aspect =
        getAspectRatio();

      const seed =
        getSeed();

      // --------------------------------------
      // BUTTON
      // --------------------------------------

      if (button) {
        button.disabled = true;

        button.textContent =
          "MEMBUAT VIDEO...";
      }

      // --------------------------------------
      // RESET
      // --------------------------------------

      resetResult();

      // --------------------------------------
      // UPLOAD
      // --------------------------------------

      const imageURL =
        await uploadCharacter(
          file,
          token
        );

      setStatus(
        "Foto berhasil diunggah. Membuat video..."
      );

      // --------------------------------------
      // API URL
      // --------------------------------------

      if (!C.VIDEO_API) {
        throw new Error(
          "VIDEO_API belum dikonfigurasi."
        );
      }

      const params =
        new URLSearchParams();

      params.set(
        "model",
        DEFAULT_MODEL
      );

      params.set(
        "duration",
        String(duration)
      );

      /*
       * Pollinations menerima aspectRatio,
       * tetapi Nova Reel native menghasilkan
       * 1280 × 720 / 16:9.
       *
       * Parameter tetap dikirim agar backend
       * dapat menentukan perilakunya.
       */

      params.set(
        "aspectRatio",
        aspect
      );

      params.set(
        "image",
        imageURL
      );

      // --------------------------------------
      // SEED OPTIONAL
      // --------------------------------------

      if (seed !== null) {
        params.set(
          "seed",
          String(seed)
        );
      }

      // --------------------------------------
      // BUILD URL
      // --------------------------------------

      const url =
        C.VIDEO_API +
        encodeURIComponent(
          finalPrompt
        ) +
        "?" +
        params.toString();

      console.log(
        "GEN-Z.AI VIDEO REQUEST",
        {
          model:
            DEFAULT_MODEL,

          prompt:
            finalPrompt,

          promptLength:
            finalPrompt.length,

          duration:
            duration,

          aspectRatio:
            aspect,

          seed:
            seed,

          image:
            imageURL
        }
      );

      // --------------------------------------
      // REQUEST
      // --------------------------------------

      setStatus(
        "Nova Reel sedang membuat video..."
      );

      let response;

      try {
        response =
          await fetch(
            url,
            {
              method: "GET",

              headers: {
                Authorization:
                  "Bearer " +
                  token,

                Accept:
                  "video/mp4"
              }
            }
          );
      } catch (error) {
        throw new Error(
          "Koneksi ke server video gagal. Periksa internet lalu coba lagi."
        );
      }

      // --------------------------------------
      // AUTH
      // --------------------------------------

      if (
        response.status === 401
      ) {
        clearToken();

        throw new Error(
          "Token Pollinations sudah tidak valid. Hubungkan kembali."
        );
      }

      // --------------------------------------
      // BALANCE
      // --------------------------------------

      if (
        response.status === 402
      ) {
        throw new Error(
          "Saldo Pollinations tidak mencukupi untuk membuat video."
        );
      }

      // --------------------------------------
      // RATE LIMIT
      // --------------------------------------

      if (
        response.status === 429
      ) {
        throw new Error(
          "Permintaan terlalu banyak. Tunggu sebentar sebelum membuat video lagi."
        );
      }

      // --------------------------------------
      // SERVER ERROR
      // --------------------------------------

      if (
        response.status >= 500
      ) {
        throw new Error(
          "Server video sedang mengalami gangguan. Coba lagi beberapa saat."
        );
      }

      // --------------------------------------
      // OTHER ERROR
      // --------------------------------------

      if (!response.ok) {
        const text =
          await response.text();

        throw new Error(
          "Generate video gagal: HTTP " +
          response.status +
          (
            text
              ? " " + text
              : ""
          )
        );
      }

      // --------------------------------------
      // READ VIDEO
      // --------------------------------------

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

      if (
        !blob.type.includes(
          "video"
        ) &&
        blob.type !==
          "application/octet-stream"
      ) {
        console.warn(
          "Respons bukan MIME video:",
          blob.type
        );
      }

      // --------------------------------------
      // CREATE OBJECT URL
      // --------------------------------------

      generatedVideoURL =
        URL.createObjectURL(
          blob
        );

      // --------------------------------------
      // DISPLAY
      // --------------------------------------

      if (video) {
        video.src =
          generatedVideoURL;

        video.style.display =
          "block";

        video.controls =
          true;

        video.playsInline =
          true;

        video.preload =
          "metadata";

        video.load();
      }

      // --------------------------------------
      // DOWNLOAD
      // --------------------------------------

      if (download) {
        download.href =
          generatedVideoURL;

        download.download =
          "gen-z-ai-video-" +
          Date.now() +
          ".mp4";

        download.style.display =
          "block";
      }

      // --------------------------------------
      // SUCCESS
      // --------------------------------------

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

  // ==========================================
  // CHARACTER PREVIEW
  // ==========================================

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
            preview.removeAttribute(
              "src"
            );

            preview.style.display =
              "none";
          }

          if (info) {
            info.textContent =
              "Pilih foto karakter sebagai referensi.";
          }

          return;
        }

        try {
          validateImage(file);

        } catch (error) {
          input.value = "";

          if (preview) {
            preview.removeAttribute(
              "src"
            );

            preview.style.display =
              "none";
          }

          if (info) {
            info.textContent =
              error.message;
          }

          return;
        }

        // ------------------------------------
        // CLEAN OLD PREVIEW URL
        // ------------------------------------

        if (characterPreviewURL) {
          URL.revokeObjectURL(
            characterPreviewURL
          );
        }

        characterPreviewURL =
          URL.createObjectURL(
            file
          );

        if (preview) {
          preview.src =
            characterPreviewURL;

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

  // ==========================================
  // SETUP
  // ==========================================

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

  // ==========================================
  // GLOBAL API
  // ==========================================

  window.generateVideoWithNovaReel =
    generateVideo;

  window.__NOVA_REEL_V8_LOADED =
    true;

  // ==========================================
  // INIT
  // ==========================================

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
