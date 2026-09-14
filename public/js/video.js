/* =========================================================
   GEN-Z.AI VIDEO
   public/js/video.js

   Fungsi:
   - Menampilkan video hasil generate
   - Mengambil video protected dari backend
   - Membuat Object URL
   - Tombol download
   - Generate Video frontend
   - Polling status job
========================================================= */

(function () {

  "use strict";


  const GENZ =
    window.GENZ ||
    (window.GENZ = {});


  GENZ.video =
    GENZ.video ||
    {};


  GENZ.video.poll =
    null;


  GENZ.video.objectUrl =
    GENZ.video.objectUrl ||
    null;


  let generateBound = false;
  let generateRunning = false;


  /* =====================================================
     HELPER
  ===================================================== */

  function $(id) {

    return document.getElementById(
      id
    );

  }


  function text(value) {

    return String(
      value == null
        ? ""
        : value
    ).trim();

  }


  function setStatus(
    message,
    type
  ) {

    const status =
      $("status");

    if (!status) {
      return;
    }

    status.textContent =
      text(message);

    if (type) {

      status.dataset.type =
        type;

    } else {

      delete status.dataset.type;

    }

  }


  function getProvider() {

    if (
      GENZ.providers &&
      GENZ.providers.currentProvider
    ) {

      return GENZ.providers.currentProvider;

    }

    const providerSelect =
      $("provider");

    const providerId =
      text(
        providerSelect?.value
      );

    if (
      providerId &&
      GENZ.providers &&
      Array.isArray(
        GENZ.providers.providers
      )
    ) {

      return (
        GENZ.providers.providers.find(
          provider =>
            text(provider?.id) ===
            providerId
        ) ||
        null
      );

    }

    return null;

  }


  function getAuthToken() {

    if (
      GENZ.auth &&
      typeof GENZ.auth.token ===
        "function"
    ) {

      return GENZ.auth.token();

    }

    return Promise.resolve(
      null
    );

  }


  function createIdempotencyKey() {

    if (
      window.crypto &&
      typeof window.crypto.randomUUID ===
        "function"
    ) {

      return window.crypto.randomUUID();

    }

    return (
      "genz-" +
      Date.now() +
      "-" +
      Math.random()
        .toString(36)
        .slice(2, 12)
    );

  }


  function getImageData() {

    if (
      GENZ.upload &&
      GENZ.upload.imageData
    ) {

      return GENZ.upload.imageData;

    }

    if (
      GENZ.state &&
      GENZ.state.imageData
    ) {

      return GENZ.state.imageData;

    }

    return null;

  }


  /* =====================================================
     VIDEO CLEAR
  ===================================================== */

  GENZ.video.clear =
    function () {

      this.stopPolling();


      const video =
        $("video");


      const download =
        $("downloadVideo") ||
        $("download");


      const result =
        $("videoResult");


      if (video) {

        try {

          video.pause();

        } catch (_) {}


        video.removeAttribute(
          "src"
        );

        try {

          video.load();

        } catch (_) {}


        video.classList.add(
          "hidden"
        );

      }


      if (result) {

        result.classList.add(
          "hidden"
        );

      }


      if (download) {

        download.removeAttribute(
          "href"
        );

        download.removeAttribute(
          "download"
        );

        download.classList.add(
          "hidden"
        );

      }


      if (this.objectUrl) {

        try {

          URL.revokeObjectURL(
            this.objectUrl
          );

        } catch (_) {}

        this.objectUrl =
          null;

      }


      if (GENZ.state) {

        GENZ.state
          .currentVideoObjectUrl =
          null;

      }

    };


  /* =====================================================
     STOP POLLING
  ===================================================== */

  GENZ.video.stopPolling =
    function () {

      if (this.poll) {

        clearTimeout(
          this.poll
        );

        this.poll =
          null;

      }

    };


  /* =====================================================
     SHOW VIDEO
  ===================================================== */

  GENZ.video.show =
    function (url) {

      if (!url) {

        throw new Error(
          "URL video tidak ditemukan."
        );

      }


      const video =
        $("video");


      const download =
        $("downloadVideo") ||
        $("download");


      const result =
        $("videoResult");


      if (!video) {

        throw new Error(
          "Elemen video tidak ditemukan."
        );

      }


      video.pause();

      video.src =
        url;

      video.controls =
        true;

      video.autoplay =
        false;

      video.loop =
        false;

      video.playsInline =
        true;


      video.classList.remove(
        "hidden"
      );


      if (result) {

        result.classList.remove(
          "hidden"
        );

      }


      if (download) {

        download.href =
          url;

        download.download =
          "gen-z-ai-video.mp4";

        download.classList.remove(
          "hidden"
        );

      }


      try {

        video.load();

      } catch (_) {}


      if (
        String(url).startsWith(
          "blob:"
        )
      ) {

        this.objectUrl =
          url;

        if (GENZ.state) {

          GENZ.state
            .currentVideoObjectUrl =
            url;

        }

      }


      return url;

    };


  /* =====================================================
     FETCH PROTECTED VIDEO
  ===================================================== */

  GENZ.video.fetchProtected =
    async function (url) {

      if (!url) {

        throw new Error(
          "URL video protected tidak ditemukan."
        );

      }


      const token =
        await getAuthToken();


      if (!token) {

        throw new Error(
          "Sesi login tidak valid."
        );

      }


      const response =
        await fetch(
          url,
          {
            method:
              "GET",

            headers: {
              Authorization:
                "Bearer " +
                token
            },

            credentials:
              "include"
          }
        );


      if (!response.ok) {

        let message =
          "Gagal mengambil file video.";

        try {

          const data =
            await response.json();

          message =
            data?.error ||
            data?.message ||
            message;

        } catch (_) {}

        throw new Error(
          message
        );

      }


      const blob =
        await response.blob();


      if (!blob.size) {

        throw new Error(
          "File video kosong."
        );

      }


      const objectUrl =
        URL.createObjectURL(
          blob
        );


      const previousObjectUrl =
        this.objectUrl;


      this.objectUrl =
        objectUrl;


      if (GENZ.state) {

        GENZ.state
          .currentVideoObjectUrl =
          objectUrl;

      }


      const video =
        $("video");


      const download =
        $("downloadVideo") ||
        $("download");


      const result =
        $("videoResult");


      if (!video) {

        try {

          URL.revokeObjectURL(
            objectUrl
          );

        } catch (_) {}

        this.objectUrl =
          null;

        if (GENZ.state) {

          GENZ.state
            .currentVideoObjectUrl =
            null;

        }

        throw new Error(
          "Elemen video tidak ditemukan."
        );

      }


      video.pause();

      video.src =
        objectUrl;

      video.controls =
        true;

      video.autoplay =
        false;

      video.loop =
        false;

      video.playsInline =
        true;


      video.classList.remove(
        "hidden"
      );


      if (result) {

        result.classList.remove(
          "hidden"
        );

      }


      if (download) {

        download.href =
          objectUrl;

        download.download =
          "gen-z-ai-video.mp4";

        download.classList.remove(
          "hidden"
        );

      }


      try {

        video.load();

      } catch (_) {}


      if (
        previousObjectUrl &&
        previousObjectUrl !==
          objectUrl
      ) {

        try {

          URL.revokeObjectURL(
            previousObjectUrl
          );

        } catch (_) {}

      }


      return objectUrl;

    };


  /* =====================================================
     EXTRACT VIDEO URL
  ===================================================== */

  function extractVideoUrl(
    data
  ) {

    if (!data) {
      return null;
    }


    const candidates = [

      data.videoUrl,

      data.video_url,

      data.url,

      data.result_url,

      data.metadata?.url,

      data.metadata?.videoUrl,

      data.metadata?.video_url,

      data.metadata?.result_url,

      data.result?.videoUrl,

      data.result?.video_url,

      data.result?.result_url,

      data.result?.url,

      data.output?.videoUrl,

      data.output?.video_url,

      data.output?.result_url,

      data.output?.url,

      data.data?.videoUrl,

      data.data?.video_url,

      data.data?.result_url,

      data.data?.url,

      data.data?.metadata?.url,

      data.data?.metadata?.videoUrl,

      data.data?.metadata?.video_url,

      data.data?.metadata?.result_url,

      data.data?.result?.videoUrl,

      data.data?.result?.video_url,

      data.data?.result?.result_url,

      data.data?.result?.url,

      data.data?.output?.videoUrl,

      data.data?.output?.video_url,

      data.data?.output?.result_url,

      data.data?.output?.url

    ];


    for (
      const candidate of candidates
    ) {

      if (
        typeof candidate ===
          "string" &&
        candidate.trim()
      ) {

        return candidate.trim();

      }

    }


    return null;

  }


  /* =====================================================
     EXTRACT ERROR
  ===================================================== */

  function extractError(
    data,
    fallback
  ) {

    if (!data) {

      return (
        fallback ||
        "Generation gagal."
      );

    }


    return (
      data.error ||
      data.message ||
      data.details?.message ||
      data.data?.error ||
      data.data?.message ||
      fallback ||
      "Generation gagal."
    );

  }


  /* =====================================================
     BUILD GENERATE REQUEST
  ===================================================== */

  function buildGenerateBody() {

    const providerSelect =
      $("provider");

    const modelSelect =
      $("model");

    const promptInput =
      $("prompt");

    const ratioSelect =
      $("ratio");

    const durationSelect =
      $("duration");

    const resolutionSelect =
      $("resolution");


    const provider =
      text(
        providerSelect?.value
      );


    const model =
      text(
        modelSelect?.value
      );


    const prompt =
      text(
        promptInput?.value
      );


    const ratio =
      text(
        ratioSelect?.value
      );


    const duration =
      text(
        durationSelect?.value
      );


    const resolution =
      text(
        resolutionSelect?.value
      );


    if (!provider) {

      throw new Error(
        "Provider belum dipilih."
      );

    }


    if (!model) {

      throw new Error(
        "Model belum dipilih."
      );

    }


    if (!prompt) {

      throw new Error(
        "Prompt wajib diisi."
      );

    }


    if (
      prompt.length < 3
    ) {

      throw new Error(
        "Prompt minimal 3 karakter."
      );

    }


    if (
      prompt.length > 2000
    ) {

      throw new Error(
        "Prompt maksimal 2000 karakter."
      );

    }


    const body = {

      provider:
        provider,

      model:
        model,

      prompt:
        prompt

    };


    if (duration) {

      body.duration =
        duration;

    }


    if (ratio) {

      body.aspectRatio =
        ratio;

    }


    if (resolution) {

      body.resolution =
        resolution;

    }


    const imageData =
      getImageData();


    if (imageData) {

      body.imageData =
        imageData;

    }


    return body;

  }


  /* =====================================================
     BUTTON STATE
  ===================================================== */

  function setGenerateLoading(
    loading
  ) {

    const button =
      $("generateVideo");


    if (!button) {
      return;
    }


    button.disabled =
      Boolean(
        loading
      );


    button.setAttribute(
      "aria-busy",
      loading
        ? "true"
        : "false"
    );


    if (loading) {

      button.dataset
        .originalText =
        button.textContent;


      button.textContent =
        "Generating...";

    } else {

      button.textContent =
        button.dataset
          .originalText ||
        "Generate Video";

    }

  }


  /* =====================================================
     STATUS POLLING
  ===================================================== */

  async function pollStatus(
    provider,
    externalId,
    attempt
  ) {

    const maxAttempts =
      180;


    const currentAttempt =
      Number(
        attempt || 0
      );


    if (
      currentAttempt >=
      maxAttempts
    ) {

      throw new Error(
        "Generation terlalu lama. Silakan periksa kembali status job."
      );

    }


    const token =
      await getAuthToken();


    if (!token) {

      throw new Error(
        "Sesi login sudah tidak valid."
      );

    }


    const response =
      await fetch(
        "/api/generate/status",
        {
          method:
            "POST",

          headers: {

            "Content-Type":
              "application/json",

            Accept:
              "application/json",

            Authorization:
              "Bearer " +
              token

          },

          credentials:
            "include",

          body:
            JSON.stringify(
              {
                provider:
                  provider,

                operationName:
                  externalId
              }
            )
        }
      );


    let data =
      null;


    try {

      data =
        await response.json();

    } catch (_) {}


    if (!response.ok) {

      throw new Error(
        extractError(
          data,
          "Gagal mengambil status generation."
        )
      );

    }


    const status =
      text(
        data?.status
      ).toLowerCase();


    console.log(
      "[GEN-Z.AI] Generate status:",
      status,
      data
    );


    if (
      status ===
        "completed"
    ) {

      const videoUrl =
        extractVideoUrl(
          data
        );


      if (!videoUrl) {

        throw new Error(
          "Generation selesai tetapi URL video tidak ditemukan."
        );

      }


      if (
        videoUrl.startsWith(
          "/api/video"
        )
      ) {

        await GENZ.video
          .fetchProtected(
            videoUrl
          );

      } else {

        GENZ.video.show(
          videoUrl
        );

      }


      setStatus(
        "Video berhasil dibuat.",
        "success"
      );


      return data;

    }


    if (
      status ===
        "failed"
    ) {

      throw new Error(
        extractError(
          data,
          "Generation gagal diproses oleh provider."
        )
      );

    }


    setStatus(
      "Generation sedang diproses... (" +
      (currentAttempt + 1) +
      ")",
      "info"
    );


    return new Promise(
      function (
        resolve,
        reject
      ) {

        GENZ.video.poll =
          setTimeout(
            function () {

              pollStatus(
                provider,
                externalId,
                currentAttempt + 1
              )
                .then(
                  resolve
                )
                .catch(
                  reject
                );

            },
            3000
          );

      }
    );

  }


  /* =====================================================
     GENERATE
  ===================================================== */

  async function generate() {

    if (generateRunning) {

      return;

    }


    const button =
      $("generateVideo");


    if (!button) {

      console.error(
        "[GEN-Z.AI] #generateVideo tidak ditemukan."
      );

      return;

    }


    generateRunning =
      true;


    setGenerateLoading(
      true
    );


    GENZ.video
      .stopPolling();


    try {

      if (
        GENZ.video &&
        typeof GENZ.video.clear ===
          "function"
      ) {

        GENZ.video.clear();

      }


      setStatus(
        "Menyiapkan generation...",
        "info"
      );


      const body =
        buildGenerateBody();


      const token =
        await getAuthToken();


      if (!token) {

        throw new Error(
          "Sesi login tidak valid. Silakan login kembali."
        );

      }


      const idempotencyKey =
        createIdempotencyKey();


      console.log(
        "[GEN-Z.AI] Generate request:",
        {
          provider:
            body.provider,

          model:
            body.model,

          duration:
            body.duration,

          aspectRatio:
            body.aspectRatio,

          resolution:
            body.resolution
        }
      );


      setStatus(
        "Mengirim request ke provider...",
        "info"
      );


      const response =
        await fetch(
          "/api/generate",
          {
            method:
              "POST",

            headers: {

              "Content-Type":
                "application/json",

              Accept:
                "application/json",

              Authorization:
                "Bearer " +
                token,

              "Idempotency-Key":
                idempotencyKey

            },

            credentials:
              "include",

            body:
              JSON.stringify(
                body
              )
          }
        );


      let data =
        null;


      try {

        data =
          await response.json();

      } catch (_) {}


      if (!response.ok) {

        throw new Error(
          extractError(
            data,
            "Generate request gagal."
          )
        );

      }


      if (
        !data ||
        data.success === false
      ) {

        throw new Error(
          extractError(
            data,
            "Provider tidak menerima request."
          )
        );

      }


      const provider =
        text(
          data.provider ||
          body.provider
        );


      const externalId =
        text(
          data.externalId ||
          data.external_id ||
          data.taskId ||
          data.task_id ||
          data.operationName ||
          data.id
        );


      console.log(
        "[GEN-Z.AI] Generate accepted:",
        {
          jobId:
            data.jobId,

          externalId:
            externalId,

          provider:
            provider,

          status:
            data.status
        }
      );


      if (!externalId) {

        const directVideoUrl =
          extractVideoUrl(
            data
          );


        if (directVideoUrl) {

          if (
            directVideoUrl.startsWith(
              "/api/video"
            )
          ) {

            await GENZ.video
              .fetchProtected(
                directVideoUrl
              );

          } else {

            GENZ.video.show(
              directVideoUrl
            );

          }


          setStatus(
            "Video berhasil dibuat.",
            "success"
          );


          return;

        }


        throw new Error(
          "Provider tidak mengembalikan ID proses generation."
        );

      }


      setStatus(
        "Request diterima. Menunggu hasil video...",
        "info"
      );


      await pollStatus(
        provider,
        externalId,
        0
      );


    } catch (error) {

      console.error(
        "[GEN-Z.AI] Generate error:",
        error
      );


      setStatus(
        error?.message ||
        "Generation gagal.",
        "error"
      );


    } finally {

      generateRunning =
        false;


      setGenerateLoading(
        false
      );

    }

  }


  /* =====================================================
     BIND GENERATE BUTTON
  ===================================================== */

  function bindGenerateButton() {

    const button =
      $("generateVideo");


    if (!button) {

      return false;

    }


    if (button.dataset
      .genzGenerateBound ===
      "true"
    ) {

      generateBound =
        true;

      return true;

    }


    button.addEventListener(
      "click",
      function (event) {

        event.preventDefault();
        event.stopPropagation();

        generate();

      }
    );


    button.dataset
      .genzGenerateBound =
      "true";


    generateBound =
      true;


    console.log(
      "[GEN-Z.AI] Generate button bound."
    );


    return true;

  }


  /* =====================================================
     OBSERVE DYNAMIC GENERATOR
  ===================================================== */

  function startGeneratorObserver() {

    if (
      window.__GENZ_GENERATOR_VIDEO_OBSERVER__
    ) {

      return;

    }


    if (
      typeof MutationObserver ===
        "undefined"
    ) {

      return;

    }


    const observer =
      new MutationObserver(
        function () {

          if (
            !generateBound
          ) {

            bindGenerateButton();

          }

        }
      );


    const target =
      $("main-container") ||
      document.body;


    if (!target) {

      return;

    }


    observer.observe(
      target,
      {
        childList:
          true,

        subtree:
          true
      }
    );


    window.__GENZ_GENERATOR_VIDEO_OBSERVER__ =
      observer;

  }


  /* =====================================================
     INIT
  ===================================================== */

  function init() {

    bindGenerateButton();

    startGeneratorObserver();

  }


  GENZ.video.init =
    init;


  /*
   * Expose generate juga supaya
   * module lain dapat memanggilnya
   * bila diperlukan.
   */

  GENZ.video.generate =
    generate;


  /*
   * Generator module compatibility.
   *
   * app.js saat ini mencoba:
   *
   * GENZ.generator.init()
   *
   * tetapi frontend generator sebelumnya
   * tidak tersedia.
   */

  GENZ.generator =
    GENZ.generator ||
    {};


  GENZ.generator.init =
    function () {

      init();

    };


  /*
   * Jalankan otomatis jika DOM
   * sudah siap.
   */

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      init,
      {
        once: true
      }
    );

  } else {

    init();

  }


})();
