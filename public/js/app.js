"use strict";

(function () {

  const providers = {};

  let currentProvider = null;


  // ==========================================
  // PROVIDER REGISTRY
  // ==========================================

  function registerProvider(name, provider) {

    if (!name || !provider) {
      return;
    }

    providers[name] = provider;

    console.log(
      "GEN-Z.AI provider registered:",
      name
    );

  }


  // ==========================================
  // STATUS
  // ==========================================

  function setStatus(message, type = "") {

    const status =
      document.getElementById("status");

    if (!status) {
      return;
    }

    status.textContent = message;

    status.className =
      "status " + type;

  }


  // ==========================================
  // PROVIDER SETTINGS
  // ==========================================

  function loadProvider(name) {

    const provider =
      providers[name];

    const settings =
      document.getElementById(
        "providerSettings"
      );

    if (!provider) {

      setStatus(
        "Provider belum tersedia.",
        "err"
      );

      return;

    }

    currentProvider =
      provider;


    if (settings) {

      settings.innerHTML =
        provider.settingsHTML || "";

    }


    if (
      typeof provider.init ===
      "function"
    ) {

      provider.init();

    }


    setStatus(
      provider.description ||
      "Provider " + name + " aktif."
    );

  }


  // ==========================================
  // GENERATE
  // ==========================================

  async function generate() {

    if (!currentProvider) {

      throw new Error(
        "Provider belum dipilih."
      );

    }

    if (
      typeof currentProvider.generate !==
      "function"
    ) {

      throw new Error(
        "Provider tidak memiliki fungsi generate."
      );

    }

    return currentProvider.generate();

  }


  // ==========================================
  // RESULT
  // ==========================================

  function showVideo(url) {

    const video =
      document.getElementById(
        "videoPreview"
      );

    const download =
      document.getElementById(
        "download"
      );

    if (!url) {

      throw new Error(
        "URL video tidak tersedia."
      );

    }


    if (video) {

      video.src = url;

      video.style.display =
        "block";

      video.load();

    }


    if (download) {

      download.href = url;

      download.style.display =
        "block";

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

    if (!input || !preview) {
      return;
    }


    input.addEventListener(
      "change",
      () => {

        const file =
          input.files?.[0];

        if (!file) {

          preview.style.display =
            "none";

          return;

        }


        const allowed = [
          "image/jpeg",
          "image/png",
          "image/webp"
        ];


        if (
          !allowed.includes(
            file.type
          )
        ) {

          input.value = "";

          setStatus(
            "Format foto harus JPG, PNG, atau WEBP.",
            "err"
          );

          return;

        }


        if (
          file.size >
          20 * 1024 * 1024
        ) {

          input.value = "";

          setStatus(
            "Ukuran foto maksimal 20 MB.",
            "err"
          );

          return;

        }


        preview.src =
          URL.createObjectURL(
            file
          );

        preview.style.display =
          "block";


        if (info) {

          info.textContent =
            file.name +
            " • " +
            (
              file.size /
              1024 /
              1024
            ).toFixed(2) +
            " MB";

        }

      }
    );

  }


  // ==========================================
  // INIT
  // ==========================================

  function init() {

    const providerSelect =
      document.getElementById(
        "providerSelect"
      );

    const button =
      document.getElementById(
        "videoBtn"
      );

    const prompt =
      document.getElementById(
        "prompt"
      );

    const counter =
      document.getElementById(
        "promptCounter"
      );


    if (providerSelect) {

      providerSelect.addEventListener(
        "change",
        () => {

          loadProvider(
            providerSelect.value
          );

        }
      );

    }


    if (button) {

      button.addEventListener(
        "click",
        async () => {

          try {

            button.disabled =
              true;

            button.textContent =
              "MEMBUAT VIDEO...";


            await generate();


          } catch (error) {

            console.error(
              "GEN-Z.AI:",
              error
            );

            setStatus(
              error?.message ||
              "Gagal membuat video.",
              "err"
            );


          } finally {

            button.disabled =
              false;

            button.textContent =
              "GENERATE VIDEO";

          }

        }
      );

    }


    if (prompt && counter) {

      prompt.addEventListener(
        "input",
        () => {

          counter.textContent =
            prompt.value.length +
            " / 512";

        }
      );

    }


    setupCharacterPreview();


    loadProvider(
      providerSelect?.value ||
      "pollinations"
    );

  }


  window.GENZApp = {

    registerProvider,

    loadProvider,

    generate,

    setStatus,

    showVideo,

    providers

  };


  // Load provider modules
  // setelah GENZApp tersedia.

  const providerFiles = [

    "/js/providers/pollinations.js",
    "/js/providers/fal.js",
    "/js/providers/runway.js",
    "/js/providers/veo.js",
    "/js/providers/luma.js",
    "/js/providers/minimax.js"

  ];


  async function loadProviders() {

    for (
      const src of providerFiles
    ) {

      await new Promise(
        resolve => {

          const script =
            document.createElement(
              "script"
            );

          script.src =
            src;

          script.onload =
            resolve;

          script.onerror =
            () => {

              console.warn(
                "Provider gagal dimuat:",
                src
              );

              resolve();

            };

          document.body.appendChild(
            script
          );

        }
      );

    }


    init();

  }


  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      loadProviders
    );

  } else {

    loadProviders();

  }

})();
