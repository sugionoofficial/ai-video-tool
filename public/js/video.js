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
     IMAGE REQUEST LIMITS
  =====================================================

     Base64/Data URL dapat membuat JSON request
     menjadi sangat besar.

     Gambar reference akan diproses di browser
     sebelum dikirim ke Worker.

  ===================================================== */

  const MAX_IMAGE_DIMENSION =
    1280;


  const INITIAL_IMAGE_QUALITY =
    0.82;


  const MIN_IMAGE_QUALITY =
    0.55;


  /*
   * Target maksimum Base64 untuk satu gambar.
   *
   * Ini sengaja dibuat jauh di bawah batas request
   * Worker 10 MB agar masih tersedia ruang untuk
   * prompt + metadata + beberapa reference image.
   */

  const MAX_SINGLE_IMAGE_BYTES =
    2 * 1024 * 1024;


  /*
   * Batas aman total imageData.
   *
   * Jika ada beberapa reference image, totalnya
   * tidak boleh membengkak menjadi request raksasa.
   */

  const MAX_TOTAL_IMAGE_BYTES =
    6 * 1024 * 1024;


  /*
   * Perkiraan maksimum JSON request.
   *
   * Worker saat ini menggunakan batas 10 MB.
   * Kita gunakan batas client sedikit lebih rendah
   * agar tidak mentok tepat di server.
   */

  const MAX_GENERATE_BODY_BYTES =
    8 * 1024 * 1024;


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


  /* =====================================================
     INLINE STATUS
  ===================================================== */

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


    const cleanMessage =
      text(message);


    status.textContent =
      cleanMessage;


    if (type) {

      status.dataset.type =
        type;

    } else {

      delete status.dataset.type;

    }


    if (cleanMessage) {

      status.style.visibility =
        "visible";

      status.style.display =
        "block";

    } else {

      status.style.visibility =
        "hidden";

    }


    /*
     * Error ditampilkan langsung di bawah
     * tombol Generate Video.
     */

    if (type === "error") {

      status.style.background =
        "rgba(220,53,69,.08)";

      status.style.border =
        "1px solid rgba(220,53,69,.25)";

      status.style.color =
        "#dc3545";

      status.style.textAlign =
        "left";

      status.style.fontWeight =
        "500";

    } else if (type === "success") {

      status.style.background =
        "rgba(25,135,84,.08)";

      status.style.border =
        "1px solid rgba(25,135,84,.20)";

      status.style.color =
        "#198754";

      status.style.textAlign =
        "center";

      status.style.fontWeight =
        "500";

    } else {

      status.style.background =
        "rgba(13,110,253,.08)";

      status.style.border =
        "1px solid rgba(13,110,253,.18)";

      status.style.color =
        "#495057";

      status.style.textAlign =
        "center";

      status.style.fontWeight =
        "400";

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
     IMAGE HELPERS
  ===================================================== */

  function isDataImage(
    value
  ) {

    return (
      typeof value ===
        "string" &&
      /^data:image\//i.test(
        value.trim()
      )
    );

  }


  function getBase64ByteSize(
    dataUrl
  ) {

    const value =
      text(dataUrl);


    if (
      !isDataImage(value)
    ) {

      return 0;

    }


    const comma =
      value.indexOf(",");


    if (
      comma < 0
    ) {

      return 0;

    }


    const base64 =
      value
        .slice(comma + 1)
        .replace(
          /\s/g,
          ""
        );


    if (!base64) {

      return 0;

    }


    /*
     * Base64 byte-size approximation.
     */

    let padding = 0;


    if (
      base64.endsWith("=")
    ) {

      padding++;

    }


    if (
      base64.endsWith("==")
    ) {

      padding++;

    }


    return Math.max(
      0,
      Math.floor(
        (base64.length * 3) / 4
      ) - padding
    );

  }


  function dataUrlToImage(
    dataUrl
  ) {

    return new Promise(
      function (
        resolve,
        reject
      ) {

        const image =
          new Image();


        image.onload =
          function () {

            resolve(image);

          };


        image.onerror =
          function () {

            reject(
              new Error(
                "Reference image tidak dapat dibaca oleh browser."
              )
            );

          };


        image.src =
          dataUrl;

      }
    );

  }


  function canvasToDataUrl(
    canvas,
    quality
  ) {

    /*
     * JPEG dipakai untuk mengecilkan payload.
     *
     * Jika browser gagal menggunakan JPEG,
     * fallback ke kualitas asli canvas.
     */

    try {

      return canvas.toDataURL(
        "image/jpeg",
        quality
      );

    } catch (_) {

      return canvas.toDataURL();

    }

  }


  async function compressDataImage(
    dataUrl,
    index
  ) {

    const original =
      text(dataUrl);


    if (
      !isDataImage(original)
    ) {

      return original;

    }


    const originalBytes =
      getBase64ByteSize(
        original
      );


    /*
     * Jika sudah cukup kecil, tidak perlu
     * memproses ulang. Ini menjaga kualitas.
     */

    if (
      originalBytes > 0 &&
      originalBytes <=
        MAX_SINGLE_IMAGE_BYTES
    ) {

      console.log(
        "[GEN-Z.AI] Reference image already small:",
        {
          index:
            index,

          bytes:
            originalBytes
        }
      );


      return original;

    }


    const image =
      await dataUrlToImage(
        original
      );


    const originalWidth =
      Number(
        image.naturalWidth ||
        image.width ||
        0
      );


    const originalHeight =
      Number(
        image.naturalHeight ||
        image.height ||
        0
      );


    if (
      !originalWidth ||
      !originalHeight
    ) {

      throw new Error(
        "Ukuran reference image tidak dapat dibaca."
      );

    }


    /*
     * Resize dengan mempertahankan aspect ratio.
     */

    const scale =
      Math.min(
        1,
        MAX_IMAGE_DIMENSION /
          Math.max(
            originalWidth,
            originalHeight
          )
      );


    const width =
      Math.max(
        1,
        Math.round(
          originalWidth *
            scale
        )
      );


    const height =
      Math.max(
        1,
        Math.round(
          originalHeight *
            scale
        )
      );


    const canvas =
      document.createElement(
        "canvas"
      );


    canvas.width =
      width;


    canvas.height =
      height;


    const context =
      canvas.getContext(
        "2d",
        {
          alpha:
            false
        }
      );


    if (!context) {

      throw new Error(
        "Browser tidak mendukung pemrosesan reference image."
      );

    }


    /*
     * Kualitas rendering tetap tinggi.
     */

    try {

      context.imageSmoothingEnabled =
        true;

      context.imageSmoothingQuality =
        "high";

    } catch (_) {}


    context.drawImage(
      image,
      0,
      0,
      width,
      height
    );


    /*
     * Coba beberapa tingkat kualitas.
     *
     * Kita tidak langsung menghancurkan kualitas
     * gambar hanya karena ukuran awal besar.
     */

    const qualities = [

      INITIAL_IMAGE_QUALITY,
      0.75,
      0.68,
      0.60,
      MIN_IMAGE_QUALITY

    ];


    let bestResult =
      null;


    let bestBytes =
      Number.MAX_SAFE_INTEGER;


    for (
      const quality of qualities
    ) {

      const result =
        canvasToDataUrl(
          canvas,
          quality
        );


      const bytes =
        getBase64ByteSize(
          result
        );


      if (
        bytes < bestBytes
      ) {

        bestResult =
          result;

        bestBytes =
          bytes;

      }


      if (
        bytes <=
          MAX_SINGLE_IMAGE_BYTES
      ) {

        bestResult =
          result;

        bestBytes =
          bytes;

        break;

      }

    }


    if (!bestResult) {

      throw new Error(
        "Reference image gagal dikompresi."
      );

    }


    console.log(
      "[GEN-Z.AI] Reference image compressed:",
      {
        index:
          index,

        originalWidth:
          originalWidth,

        originalHeight:
          originalHeight,

        outputWidth:
          width,

        outputHeight:
          height,

        originalBytes:
          originalBytes,

        outputBytes:
          bestBytes,

        reduction:
          originalBytes > 0
            ? Math.round(
                (
                  1 -
                  bestBytes /
                    originalBytes
                ) * 100
              ) + "%"
            : "unknown"
      }
    );


    return bestResult;

  }


  async function prepareImageData(
    imageData
  ) {

    if (!imageData) {

      return null;

    }


    /*
     * Format string:
     * imageData: "data:image/..."
     */

    if (
      typeof imageData ===
        "string"
    ) {

      if (
        !isDataImage(imageData)
      ) {

        return imageData;

      }


      return compressDataImage(
        imageData,
        1
      );

    }


    /*
     * Format array:
     * imageData: [
     *   "data:image/...",
     *   "data:image/..."
     * ]
     */

    if (
      Array.isArray(
        imageData
      )
    ) {

      const prepared = [];


      for (
        let i = 0;
        i < imageData.length;
        i++
      ) {

        const item =
          imageData[i];


        if (
          typeof item ===
            "string" &&
          isDataImage(item)
        ) {

          prepared.push(
            await compressDataImage(
              item,
              i + 1
            )
          );

        } else {

          prepared.push(
            item
          );

        }

      }


      return prepared;

    }


    /*
     * Jika bentuk data bukan string/array,
     * jangan rusak struktur data yang sudah
     * digunakan sistem sebelumnya.
     */

    return imageData;

  }


  function estimateJsonBytes(
    value
  ) {

    try {

      const json =
        JSON.stringify(
          value
        );


      /*
       * TextEncoder tersedia pada browser
       * modern. Fallback menggunakan string
       * length jika tidak tersedia.
       */

      if (
        window.TextEncoder
      ) {

        return new TextEncoder()
          .encode(json)
          .length;

      }


      return json.length;

    } catch (_) {

      return 0;

    }

  }


  function getImagePayloadBytes(
    imageData
  ) {

    if (!imageData) {

      return 0;

    }


    if (
      typeof imageData ===
        "string"
    ) {

      return isDataImage(imageData)
        ? getBase64ByteSize(
            imageData
          )
        : 0;

    }


    if (
      Array.isArray(
        imageData
      )
    ) {

      return imageData.reduce(
        function (
          total,
          item
        ) {

          if (
            typeof item ===
              "string" &&
            isDataImage(item)
          ) {

            return (
              total +
              getBase64ByteSize(
                item
              )
            );

          }


          return total;

        },
        0
      );

    }


    return 0;

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
     ERROR EXTRACTION
  ===================================================== */

  function extractError(
    data,
    fallback
  ) {

    const defaultMessage =
      fallback ||
      "Generation gagal.";


    if (!data) {

      return defaultMessage;

    }


    const candidates = [

      data.providerError,
      data.provider_error,

      data.originalError,
      data.original_error,

      data.rawError,
      data.raw_error,

      data.cause?.message,
      data.cause?.error,

      data.details?.providerError,
      data.details?.provider_error,

      data.details?.originalError,
      data.details?.original_error,

      data.details?.rawError,
      data.details?.raw_error,

      data.details?.cause?.message,
      data.details?.cause?.error,

      data.providerResponse?.error,
      data.providerResponse?.message,
      data.providerResponse?.fail_reason,
      data.providerResponse?.failReason,

      data.provider_response?.error,
      data.provider_response?.message,
      data.provider_response?.fail_reason,
      data.provider_response?.failReason,

      data.data?.providerError,
      data.data?.provider_error,

      data.data?.originalError,
      data.data?.original_error,

      data.data?.rawError,
      data.data?.raw_error,

      data.data?.providerResponse?.error,
      data.data?.providerResponse?.message,
      data.data?.providerResponse?.fail_reason,

      data.data?.provider_response?.error,
      data.data?.provider_response?.message,
      data.data?.provider_response?.fail_reason,

      data.error?.message,
      data.error?.error,
      data.error?.details,

      data.message,

      data.details?.message,

      data.details?.error,

      data.data?.error?.message,
      data.data?.error?.error,

      data.data?.message,

      data.data?.details?.message,

      data.data?.details?.error,

      data.error

    ];


    for (
      const candidate of candidates
    ) {

      const value =
        text(candidate);


      if (
        value &&
        value !==
          defaultMessage
      ) {

        return value;

      }

    }


    if (
      text(data.error)
    ) {

      return text(data.error);

    }


    if (
      text(data.message)
    ) {

      return text(data.message);

    }


    return defaultMessage;

  }


  /* =====================================================
     ERROR MESSAGE NORMALIZER
  ===================================================== */

  function getErrorMessage(
    error
  ) {

    if (!error) {

      return "Generation gagal.";

    }


    if (
      typeof error ===
        "string"
    ) {

      return text(error) ||
        "Generation gagal.";

    }


    if (
      error instanceof Error &&
      text(error.message)
    ) {

      return text(
        error.message
      );

    }


    return extractError(
      error,
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

  async function buildGenerateBody() {

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

    const rawImageData =
      getImageData();


    if (rawImageData) {

      setStatus(
        "Menyiapkan reference image...",
        "loading"
      );


      const preparedImageData =
        await prepareImageData(
          rawImageData
        );


      body.imageData =
        preparedImageData;


      const imageBytes =
        getImagePayloadBytes(
          preparedImageData
        );


      console.log(
        "[GEN-Z.AI] Image payload:",
        {
          bytes:
            imageBytes,

          megabytes:
            (
              imageBytes /
              1024 /
              1024
            ).toFixed(2) + " MB"
        }
      );


      /*
       * Reference image terlalu besar.
       */

      if (
        imageBytes >
        MAX_TOTAL_IMAGE_BYTES
      ) {

        throw new Error(
          "Reference image masih terlalu besar setelah dikompresi. Gunakan gambar yang lebih ringan atau kurangi jumlah reference image."
        );

      }

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


    /* ===================================================
       REQUEST SIZE CHECK
    =================================================== */

    const bodyBytes =
      estimateJsonBytes(
        body
      );


    console.log(
      "[GEN-Z.AI] Estimated request size:",
      {
        bytes:
          bodyBytes,

        megabytes:
          (
            bodyBytes /
            1024 /
            1024
          ).toFixed(2) + " MB"
      }
    );


    if (
      bodyBytes >
      MAX_GENERATE_BODY_BYTES
    ) {

      throw new Error(
        "Request generation masih terlalu besar setelah optimasi gambar. Kurangi jumlah reference image atau gunakan gambar yang lebih ringan."
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

      generateRunning =
        true;


      setGenerateLoading(
        true
      );


      GENZ.video.clear();


      setStatus(
        "Menyiapkan request...",
        "loading"
      );


      body =
        await buildGenerateBody();


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

        const actualError =
          extractError(
            data,
            "Generation gagal."
          );


        console.error(
          "[GEN-Z.AI] Backend error:",
          {
            status:
              response.status,

            response:
              data,

            actualError:
              actualError
          }
        );


        throw new Error(
          actualError
        );

      }


      if (
        data &&
        data.success === false
      ) {

        const actualError =
          extractError(
            data,
            "Generation gagal."
          );


        console.error(
          "[GEN-Z.AI] Backend returned success=false:",
          {
            response:
              data,

            actualError:
              actualError
          }
        );


        throw new Error(
          actualError
        );

      }


      console.log(
        "[GEN-Z.AI] Generate accepted:",
        data
      );


      /* =================================================
         PROVIDER ID
      ================================================= */

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


      const errorMessage =
        getErrorMessage(
          error
        );


      setStatus(
        errorMessage,
        "error"
      );


      const status =
        $("status") ||
        $("generatorStatus");


      if (status) {

        status.style.visibility =
          "visible";

        status.style.display =
          "block";


        status.scrollIntoView({
          behavior:
            "smooth",

          block:
            "nearest"
        });

      }

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
