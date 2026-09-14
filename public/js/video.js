/* =========================================================
   GEN-Z.AI VIDEO
   public/js/video.js

   Provider architecture:

   Provider ID   = identitas internal backend
   Provider Name = tampilan UI
   Adapter       = implementasi backend

   Contoh:

   Provider ID   : chinaapi
   Provider Name : ByteDance
   Adapter       : chinaapi

   Request backend:

   provider: "chinaapi"

========================================================= */

(function () {

  "use strict";


  /* =====================================================
     GEN-Z CORE
  ===================================================== */

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


  let generateRunning =
    false;


  let delegatedBound =
    false;


  /* =====================================================
     HELPER
  ===================================================== */

  function $(id) {

    return document.getElementById(id);

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
      $("status") ||
      $("generatorStatus");

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


  function getAuthToken() {

    if (
      GENZ.auth &&
      typeof GENZ.auth.token ===
        "function"
    ) {

      return GENZ.auth.token();

    }


    return Promise.resolve(null);

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
     PROVIDER ID RESOLVER
  ===================================================== */

  function resolveProviderId(
    select
  ) {

    if (!select) {

      return "";

    }


    const option =
      select.selectedOptions?.[0];


    if (!option) {

      return "";

    }


    /*
     * Provider ID HANYA diambil dari
     * metadata provider.
     *
     * Tidak menggunakan:
     *
     * option.textContent
     *
     * sebagai ID.
     *
     * Tidak menggunakan:
     *
     * select.value
     *
     * sebagai fallback.
     */

    const providerId =
      text(
        option.dataset?.providerId
      ) ||
      text(
        option.dataset?.id
      ) ||
      text(
        select.dataset?.providerId
      ) ||
      text(
        select.dataset?.id
      );


    if (!providerId) {

      console.error(
        "[GEN-Z.AI] Provider ID tidak ditemukan.",
        {
          value:
            select.value,

          name:
            option.textContent,

          dataset:
            option.dataset
        }
      );


      return "";

    }


    return providerId
      .trim()
      .toLowerCase();

  }


  /* =====================================================
     SELECTED PROVIDER INFO
  ===================================================== */

  function getSelectedProviderInfo() {

    const select =
      $("provider");


    const option =
      select?.selectedOptions?.[0];


    if (!option) {

      return {
        id: "",
        name: "",
        adapter: ""
      };

    }


    return {

      id:
        text(
          option.dataset?.providerId ||
          option.dataset?.id
        ).toLowerCase(),

      name:
        text(
          option.textContent
        ),

      adapter:
        text(
          option.dataset?.adapter
        ).toLowerCase()

    };

  }


  /* =====================================================
     ERROR
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
      data.data?.details?.message ||
      fallback ||
      "Generation gagal."
    );

  }


  /* =====================================================
     VIDEO URL
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
     EXTRACT JOB ID
  ===================================================== */

  function extractJobId(
    data
  ) {

    if (!data) {

      return "";

    }


    const candidates = [

      data.jobId,
      data.job_id,

      data.data?.jobId,
      data.data?.job_id,

      data.metadata?.jobId,
      data.metadata?.job_id,

      data.result?.jobId,
      data.result?.job_id

    ];


    for (
      const candidate of candidates
    ) {

      const value =
        text(candidate);

      if (value) {

        return value;

      }

    }


    return "";

  }


  /* =====================================================
     EXTRACT EXTERNAL ID
  ===================================================== */

  function extractExternalId(
    data
  ) {

    if (!data) {

      return "";

    }


    const candidates = [

      data.externalId,
      data.external_id,

      data.taskId,
      data.task_id,

      data.operationName,
      data.operation_name,

      data.id,

      data.data?.externalId,
      data.data?.external_id,

      data.data?.taskId,
      data.data?.task_id,

      data.data?.operationName,
      data.data?.operation_name,

      data.data?.id,

      data.result?.externalId,
      data.result?.external_id,

      data.result?.taskId,
      data.result?.task_id,

      data.result?.operationName,
      data.result?.operation_name,

      data.result?.id,

      data.metadata?.externalId,
      data.metadata?.external_id,

      data.metadata?.taskId,
      data.metadata?.task_id

    ];


    for (
      const candidate of candidates
    ) {

      const value =
        text(candidate);

      if (value) {

        return value;

      }

    }


    return "";

  }


  /* =====================================================
     NORMALIZE PROTECTED VIDEO URL
  ===================================================== */

  function normalizeProtectedVideoUrl(
    url,
    provider,
    jobId
  ) {

    const videoUrl =
      text(url);


    if (!videoUrl) {

      return "";

    }


    if (
      !videoUrl.startsWith(
        "/api/video"
      )
    ) {

      return videoUrl;

    }


    try {

      const parsed =
        new URL(
          videoUrl,
          window.location.origin
        );


      const normalizedProvider =
        text(provider)
          .toLowerCase();


      const normalizedJobId =
        text(jobId);


      if (
        normalizedProvider &&
        !parsed.searchParams.has(
          "provider"
        )
      ) {

        parsed.searchParams.set(
          "provider",
          normalizedProvider
        );

      }


      if (
        normalizedJobId &&
        !parsed.searchParams.has(
          "jobId"
        )
      ) {

        parsed.searchParams.set(
          "jobId",
          normalizedJobId
        );

      }


      return (
        parsed.pathname +
        parsed.search
      );

    } catch (_) {

      return videoUrl;

    }

  }


  /* =====================================================
     DISPLAY COMPLETED VIDEO
  ===================================================== */

  async function displayCompletedVideo(
    data,
    provider
  ) {

    let videoUrl =
      extractVideoUrl(data);


    if (!videoUrl) {

      throw new Error(
        "Generation selesai tetapi URL video tidak ditemukan."
      );

    }


    const jobId =
      extractJobId(data);


    videoUrl =
      normalizeProtectedVideoUrl(
        videoUrl,
        provider,
        jobId
      );


    console.log(
      "[GEN-Z.AI] Completed video:",
      {
        provider:
          provider,

        jobId:
          jobId || null,

        videoUrl:
          videoUrl
      }
    );


    if (
      videoUrl.startsWith(
        "/api/video"
      )
    ) {

      await GENZ.video.fetchProtected(
        videoUrl
      );

    } else {

      GENZ.video.show(
        videoUrl
      );

    }


    return videoUrl;

  }


  /* =====================================================
     CLEAR VIDEO
  ===================================================== */

  GENZ.video.clear =
    function () {

      this.stopPolling();


      const video =
        $("resultVideo") ||
        $("video");


      const result =
        $("resultVideoContainer") ||
        $("videoResult");


      const download =
        $("downloadVideo") ||
        $("download");


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

        download.classList.add(
          "hidden"
        );


        download.removeAttribute(
          "href"
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

        GENZ.state.currentVideoObjectUrl =
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

      const videoUrl =
        text(url);


      if (!videoUrl) {

        throw new Error(
          "URL video tidak ditemukan."
        );

      }


      const video =
        $("resultVideo") ||
        $("video");


      const result =
        $("resultVideoContainer") ||
        $("videoResult");


      const download =
        $("downloadVideo") ||
        $("download");


      if (!video) {

        throw new Error(
          "Elemen video hasil tidak ditemukan."
        );

      }


      /*
       * Jika sebelumnya menggunakan
       * object URL yang berbeda,
       * bersihkan terlebih dahulu.
       */

      const previousObjectUrl =
        this.objectUrl;


      if (
        previousObjectUrl &&
        previousObjectUrl !==
          videoUrl
      ) {

        try {

          URL.revokeObjectURL(
            previousObjectUrl
          );

        } catch (_) {}

        this.objectUrl =
          null;

      }


      video.pause();


      video.removeAttribute(
        "src"
      );


      video.src =
        videoUrl;


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
          videoUrl;


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
        videoUrl.startsWith(
          "blob:"
        )
      ) {

        this.objectUrl =
          videoUrl;


        if (GENZ.state) {

          GENZ.state.currentVideoObjectUrl =
            videoUrl;

        }

      }


      return videoUrl;

    };


  /* =====================================================
     FETCH PROTECTED VIDEO
  ===================================================== */

  GENZ.video.fetchProtected =
    async function (url) {

      const protectedUrl =
        text(url);


      if (!protectedUrl) {

        throw new Error(
          "URL video protected tidak ditemukan."
        );

      }


      if (
        !protectedUrl.startsWith(
          "/api/video"
        )
      ) {

        return this.show(
          protectedUrl
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
          protectedUrl,
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
            extractError(
              data,
              message
            );

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

        GENZ.state.currentVideoObjectUrl =
          objectUrl;

      }


      this.show(
        objectUrl
      );


      /*
       * show() menyimpan object URL.
       * Jangan revoke objectUrl yang
       * baru dibuat.
       */

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


    /* ===================================================
       PROVIDER ID
    =================================================== */

    const provider =
      resolveProviderId(
        providerSelect
      );


    /* ===================================================
       OTHER INPUT
    =================================================== */

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


    /* ===================================================
       VALIDATION
    =================================================== */

    if (!provider) {

      throw new Error(
        "Provider belum dipilih atau Provider ID tidak ditemukan."
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
      prompt.length <
      3
    ) {

      throw new Error(
        "Prompt minimal 3 karakter."
      );

    }


    if (
      prompt.length >
      2000
    ) {

      throw new Error(
        "Prompt maksimal 2000 karakter."
      );

    }


    /* ===================================================
       REQUEST BODY
    =================================================== */

    const body = {

      provider:
        provider,

      model:
        model,

      prompt:
        prompt

    };


    if (ratio) {

      body.aspectRatio =
        ratio;

    }


    if (duration) {

      body.duration =
        duration;

    }


    if (resolution) {

      body.resolution =
        resolution;

    }


    /* ===================================================
       IMAGE INPUT
    =================================================== */

    const imageData =
      getImageData();


    if (imageData) {

      body.imageData =
        imageData;

    }


    /* ===================================================
       DEBUG
    =================================================== */

    const providerInfo =
      getSelectedProviderInfo();


    console.log(
      "[GEN-Z.AI] Provider ID:",
      providerInfo.id
    );


    console.log(
      "[GEN-Z.AI] Provider Name:",
      providerInfo.name
    );


    console.log(
      "[GEN-Z.AI] Provider Adapter:",
      providerInfo.adapter
    );


    console.log(
      "[GEN-Z.AI] Generate body:",
      body
    );


    /* ===================================================
       SAFETY CHECK
    =================================================== */

    if (
      providerInfo.name &&
      provider ===
        providerInfo.name
          .trim()
          .toLowerCase()
    ) {

      console.error(
        "[GEN-Z.AI] Provider Name terdeteksi sebagai ID.",
        providerInfo
      );


      throw new Error(
        "Provider ID tidak valid. Provider Name tidak boleh digunakan sebagai ID."
      );

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

      if (
        !button.dataset
          .originalText
      ) {

        button.dataset
          .originalText =
          button.textContent;

      }


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
     POLL DELAY
  ===================================================== */

  function getPollDelay(
    attempt
  ) {

    const current =
      Number(attempt) || 0;


    if (
      current < 20
    ) {

      return 2000;

    }


    if (
      current < 60
    ) {

      return 3000;

    }


    if (
      current < 120
    ) {

      return 5000;

    }


    return 8000;

  }


  /* =====================================================
     WAIT POLL
  ===================================================== */

  function waitForPoll(
    delay
  ) {

    return new Promise(
      resolve => {

        GENZ.video.poll =
          setTimeout(
            function () {

              GENZ.video.poll =
                null;

              resolve();

            },
            delay
          );

      }
    );

  }


  /* =====================================================
     POLL STATUS
  ===================================================== */

  async function pollStatus(
    provider,
    externalId,
    attempt
  ) {

    const maxAttempts =
      180;


    /*
     * Polling SELALU menggunakan
     * Provider ID dari request awal.
     */

    provider =
      text(provider)
        .toLowerCase();


    externalId =
      text(externalId);


    if (!provider) {

      throw new Error(
        "Provider ID tidak ditemukan untuk status generation."
      );

    }


    if (!externalId) {

      throw new Error(
        "Operation ID tidak ditemukan."
      );

    }


    if (
      attempt >=
      maxAttempts
    ) {

      throw new Error(
        "Generation terlalu lama. Silakan cek History."
      );

    }


    const token =
      await getAuthToken();


    if (!token) {

      throw new Error(
        "Sesi login tidak valid."
      );

    }


    console.log(
      "[GEN-Z.AI] Poll status:",
      {
        provider:
          provider,

        operationName:
          externalId,

        attempt:
          attempt
      }
    );


    const response =
      await fetch(
        "/api/generate/status",
        {

          method:
            "POST",

          headers: {

            "Content-Type":
              "application/json",

            Authorization:
              "Bearer " +
              token

          },

          credentials:
            "include",

          body:
            JSON.stringify({

              provider:
                provider,

              operationName:
                externalId

            })

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
        data?.status ||
        data?.data?.status ||
        data?.providerStatus ||
        data?.data?.providerStatus
      ).toLowerCase();


    console.log(
      "[GEN-Z.AI] Generation status:",
      status,
      data
    );


    /* ===================================================
       COMPLETED
    =================================================== */

    if (
      status === "completed" ||
      status === "complete" ||
      status === "success" ||
      status === "succeeded"
    ) {

      await displayCompletedVideo(
        data,
        provider
      );


      setStatus(
        "Video berhasil dibuat.",
        "success"
      );


      return data;

    }


    /* ===================================================
       FAILED
    =================================================== */

    if (
      status === "failed" ||
      status === "error" ||
      status === "cancelled" ||
      status === "canceled"
    ) {

      throw new Error(
        extractError(
          data,
          "Generation gagal."
        )
      );

    }


    /* ===================================================
       UNKNOWN STATUS
    =================================================== */

    if (
      !status
    ) {

      console.warn(
        "[GEN-Z.AI] Status kosong dari backend.",
        data
      );

    }


    /* ===================================================
       PROCESSING
    =================================================== */

    const delay =
      getPollDelay(
        attempt
      );


    setStatus(
      "Video sedang diproses...",
      "loading"
    );


    console.log(
      "[GEN-Z.AI] Next poll:",
      {
        attempt:
          attempt + 1,

        delay:
          delay
      }
    );


    await waitForPoll(
      delay
    );


    return pollStatus(
      provider,
      externalId,
      attempt + 1
    );

  }


  /* =====================================================
     GENERATE
  ===================================================== */

  async function generate() {

    if (generateRunning) {

      console.warn(
        "[GEN-Z.AI] Generate masih berjalan."
      );


      return;

    }


    let body =
      null;


    try {

      /* =================================================
         BUILD REQUEST
      ================================================= */

      body =
        buildGenerateBody();


      generateRunning =
        true;


      setGenerateLoading(
        true
      );


      GENZ.video.clear();


      setStatus(
        "Mengirim request ke provider...",
        "loading"
      );


      /* =================================================
         AUTH
      ================================================= */

      const token =
        await getAuthToken();


      if (!token) {

        throw new Error(
          "Sesi login tidak valid. Silakan login ulang."
        );

      }


      /* =================================================
         DEBUG REQUEST
      ================================================= */

      console.log(
        "[GEN-Z.AI] Sending provider ID:",
        body.provider
      );


      /* =================================================
         GENERATE REQUEST
      ================================================= */

      const response =
        await fetch(
          "/api/generate",
          {

            method:
              "POST",

            headers: {

              "Content-Type":
                "application/json",

              Authorization:
                "Bearer " +
                token,

              "Idempotency-Key":
                createIdempotencyKey()

            },

            credentials:
              "include",

            body:
              JSON.stringify(body)

          }
        );


      let data =
        null;


      try {

        data =
          await response.json();

      } catch (_) {}


      /* =================================================
         RESPONSE ERROR
      ================================================= */

      if (!response.ok) {

        throw new Error(
          extractError(
            data,
            "Generation gagal."
          )
        );

      }


      if (
        data &&
        data.success === false
      ) {

        throw new Error(
          extractError(
            data,
            "Generation gagal."
          )
        );

      }


      console.log(
        "[GEN-Z.AI] Generate accepted:",
        data
      );


      /* =================================================
         PROVIDER ID
      =================================================

         PENTING:

         Provider ID dari request awal
         adalah sumber kebenaran.

         Provider Name dari response
         TIDAK pernah digunakan untuk
         polling.
      */

      const provider =
        body.provider;


      const responseProvider =
        text(
          data?.provider
        ).toLowerCase();


      if (
        responseProvider &&
        responseProvider !==
          provider
      ) {

        console.warn(
          "[GEN-Z.AI] Provider response berbeda dari request.",
          {
            requestProvider:
              provider,

            responseProvider:
              responseProvider
          }
        );

      }


      /* =================================================
         DIRECT VIDEO
      ================================================= */

      let directVideoUrl =
        extractVideoUrl(
          data
        );


      if (
        directVideoUrl
      ) {

        directVideoUrl =
          normalizeProtectedVideoUrl(
            directVideoUrl,
            provider,
            extractJobId(data)
          );


        console.log(
          "[GEN-Z.AI] Direct video detected:",
          {
            provider:
              provider,

            videoUrl:
              directVideoUrl
          }
        );


        if (
          directVideoUrl.startsWith(
            "/api/video"
          )
        ) {

          await GENZ.video.fetchProtected(
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


      /* =================================================
         EXTERNAL ID
      ================================================= */

      const externalId =
        extractExternalId(
          data
        );


      /* =================================================
         COMPLETED WITHOUT URL
      ================================================= */

      const initialStatus =
        text(
          data?.status ||
          data?.data?.status
        ).toLowerCase();


      if (
        initialStatus ===
          "completed" ||
        initialStatus ===
          "complete" ||
        initialStatus ===
          "success" ||
        initialStatus ===
          "succeeded"
      ) {

        throw new Error(
          "Generation selesai tetapi backend tidak memberikan URL video."
        );

      }


      /* =================================================
         VALIDATE EXTERNAL ID
      ================================================= */

      if (!externalId) {

        throw new Error(
          "Provider menerima request tetapi ID generation tidak ditemukan."
        );

      }


      /* =================================================
         POLLING
      ================================================= */

      setStatus(
        "Request diterima. Video sedang diproses...",
        "loading"
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


      GENZ.video.stopPolling();


      setStatus(
        error?.message ||
        "Generation gagal.",
        "error"
      );


      /*
       * Hindari alert jika browser
       * sudah tidak tersedia.
       */

      try {

        alert(
          error?.message ||
          "Generation gagal."
        );

      } catch (_) {}

    } finally {

      generateRunning =
        false;


      setGenerateLoading(
        false
      );

    }

  }


  /* =====================================================
     PUBLIC GENERATE
  ===================================================== */

  GENZ.video.generate =
    generate;


  /* =====================================================
     DELEGATED CLICK
  ===================================================== */

  function bindDelegatedGenerate() {

    if (
      delegatedBound
    ) {

      return;

    }


    delegatedBound =
      true;


    document.addEventListener(
      "click",
      function (event) {

        const target =
          event.target;


        if (!target) {

          return;

        }


        const button =
          target.closest
            ? target.closest(
                "#generateVideo"
              )
            : null;


        if (!button) {

          return;

        }


        event.preventDefault();
        event.stopPropagation();


        console.log(
          "[GEN-Z.AI] Generate button clicked."
        );


        generate();

      },
      true
    );

  }


  /* =====================================================
     INIT
  ===================================================== */

  function init() {

    bindDelegatedGenerate();

  }


  GENZ.video.init =
    init;


  GENZ.generator =
    GENZ.generator ||
    {};


  GENZ.generator.init =
    function () {

      init();

    };


  /* =====================================================
     START
  ===================================================== */

  bindDelegatedGenerate();


  if (
    document.readyState ===
      "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      init,
      {
        once:
          true
      }
    );

  } else {

    init();

  }


})();
