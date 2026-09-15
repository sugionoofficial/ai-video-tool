/* =========================================================
   GEN-Z.AI
   GENERATE PAYLOAD NORMALIZER

   Mencegah imageData stale/duplikat membengkakkan request.
   Tidak mengganti provider, model, adapter, atau safety filter.
========================================================= */

(function () {
  "use strict";

  window.GENZ = window.GENZ || {};
  const GENZ = window.GENZ;


  function text(value) {
    return String(
      value == null ? "" : value
    ).trim();
  }


  function isDataImage(value) {
    return (
      typeof value === "string" &&
      /^data:image\//i.test(
        value.trim()
      )
    );
  }


  function base64Bytes(value) {

    if (!isDataImage(value)) {
      return 0;
    }

    const comma =
      value.indexOf(",");

    if (comma < 0) {
      return 0;
    }

    const base64 =
      value
        .slice(comma + 1)
        .replace(/\s/g, "");

    if (!base64) {
      return 0;
    }

    let padding = 0;

    if (base64.endsWith("=")) {
      padding++;
    }

    if (base64.endsWith("==")) {
      padding++;
    }

    return Math.max(
      0,
      Math.floor(
        base64.length * 3 / 4
      ) - padding
    );
  }


  function getMaxImages() {

    const modelId =
      text(
        document.getElementById(
          "model"
        )?.value
      ).toLowerCase();


    try {

      const model =
        GENZ.providers?.currentModel;

      const value =
        Number(
          model?.capabilities?.reference?.maxImages ||
          model?.reference?.maxImages ||
          model?.capabilities?.maxImages ||
          model?.maxImages ||
          0
        );


      if (
        Number.isFinite(value) &&
        value > 0
      ) {

        return Math.max(
          1,
          Math.floor(value)
        );

      }

    } catch (_) {}


    return {
      "agnes-video-2.5-flash": 5,
      "doubao-seedance-2-0-mini-260615": 9
    }[modelId] || 1;

  }


  function normalizeImageData() {

    const upload =
      GENZ.upload ||
      (GENZ.upload = {});


    const files =
      Array.isArray(
        upload.imageFiles
      )
        ? upload.imageFiles
        : [];


    const raw =
      upload.imageData;


    if (!raw) {
      return;
    }


    const maxImages =
      getMaxImages();


    const limit =
      Math.min(
        maxImages,
        files.length > 0
          ? files.length
          : maxImages
      );


    const values =
      Array.isArray(raw)
        ? raw
        : [raw];


    const unique = [];
    const seen = new Set();


    for (
      const value of values
    ) {

      if (
        !isDataImage(value)
      ) {
        continue;
      }


      const normalized =
        value.trim();


      if (
        seen.has(
          normalized
        )
      ) {
        continue;
      }


      seen.add(
        normalized
      );


      unique.push(
        normalized
      );


      if (
        unique.length >=
        limit
      ) {
        break;
      }

    }


    /*
     * Tidak ada reference image valid.
     */
    if (!unique.length) {

      upload.imageData =
        null;

      upload.images =
        [];

      if (GENZ.state) {

        GENZ.state.imageData =
          null;

        GENZ.state.images =
          [];

      }

      return;

    }


    /*
     * Satu image tetap string.
     * Banyak image menjadi array.
     */
    upload.imageData =
      unique.length === 1
        ? unique[0]
        : unique;


    /*
     * Sinkronkan daftar image.
     */
    if (
      Array.isArray(
        upload.images
      )
    ) {

      upload.images =
        upload.images.slice(
          0,
          unique.length
        );

    }


    /*
     * Sinkronkan GENZ.state.
     */
    if (GENZ.state) {

      GENZ.state.imageData =
        upload.imageData;

      GENZ.state.images =
        upload.images;

    }


    /*
     * Debug ukuran payload reference.
     */
    const totalBytes =
      unique.reduce(
        function (
          sum,
          value
        ) {

          return (
            sum +
            base64Bytes(value)
          );

        },
        0
      );


    console.log(
      "[GEN-Z.AI] Reference payload normalized:",
      {
        model:
          text(
            document.getElementById(
              "model"
            )?.value
          ),

        fileCount:
          files.length,

        maxImages:
          maxImages,

        imageCount:
          unique.length,

        bytes:
          totalBytes,

        megabytes:
          (
            totalBytes /
            1024 /
            1024
          ).toFixed(2) +
          " MB"
      }
    );

  }


  /*
   * PENTING:
   *
   * video.js menggunakan document click
   * capture. File ini harus dimuat SEBELUM
   * video.js agar normalisasi dilakukan lebih dulu.
   */
  document.addEventListener(
    "click",
    function (event) {

      const target =
        event.target;


      const button =
        target?.closest
          ? target.closest(
              "#generateVideo"
            )
          : null;


      if (!button) {
        return;
      }


      try {

        normalizeImageData();

      } catch (error) {

        console.error(
          "[GEN-Z.AI] Reference payload normalization failed:",
          error
        );

      }

    },
    true
  );

})();
