/* =========================================================
   GEN-Z.AI
   REFERENCE MEDIA UPLOAD

   File:
   public/js/upload.js

   Fungsi:
   - Upload reference image
   - Preview reference image
   - Mendukung beberapa image
   - Menyimpan imageData untuk proses generate
   - Upload reference video
   - Preview reference video
   - Menyimpan videoData
   - Clear image
   - Clear video
   - Menjaga kompatibilitas GENZ.state
   - Tidak mengubah provider/model/capability
========================================================= */

(function () {

  "use strict";


  const GENZ =
    window.GENZ ||
    (window.GENZ = {});


  GENZ.upload =
    GENZ.upload ||
    {};


  GENZ.state =
    GENZ.state ||
    {};


  /* =======================================================
     STATE
  ======================================================= */

  GENZ.upload.images =
    Array.isArray(GENZ.upload.images)
      ? GENZ.upload.images
      : [];

  GENZ.upload.imageFiles =
    Array.isArray(GENZ.upload.imageFiles)
      ? GENZ.upload.imageFiles
      : [];

  GENZ.upload.imageData =
    GENZ.upload.imageData ||
    null;

  GENZ.upload.imageObjectUrls =
    Array.isArray(GENZ.upload.imageObjectUrls)
      ? GENZ.upload.imageObjectUrls
      : [];

  GENZ.upload.videoFiles =
    Array.isArray(GENZ.upload.videoFiles)
      ? GENZ.upload.videoFiles
      : [];

  GENZ.upload.videoData =
    GENZ.upload.videoData ||
    null;

  GENZ.upload.videoObjectUrls =
    Array.isArray(GENZ.upload.videoObjectUrls)
      ? GENZ.upload.videoObjectUrls
      : [];


  /* =======================================================
     HELPER
  ======================================================= */

  function get(id) {

    return document.getElementById(id);

  }


  function text(value) {

    return String(
      value == null
        ? ""
        : value
    ).trim();

  }


  function isImage(file) {

    if (!file) {
      return false;
    }

    if (
      typeof file.type === "string" &&
      file.type.startsWith("image/")
    ) {

      return true;

    }

    return /\.(png|jpe?g|webp|heic|heif)$/i
      .test(
        file.name || ""
      );

  }


  function isVideo(file) {

    if (!file) {
      return false;
    }

    if (
      typeof file.type === "string" &&
      file.type.startsWith("video/")
    ) {

      return true;

    }

    return /\.(mp4|mov|webm)$/i
      .test(
        file.name || ""
      );

  }


  function formatFileSize(bytes) {

    const size =
      Number(bytes) || 0;

    if (size < 1024) {
      return size + " B";
    }

    if (size < 1024 * 1024) {
      return (
        (size / 1024).toFixed(1) +
        " KB"
      );
    }

    if (size < 1024 * 1024 * 1024) {
      return (
        (size / (1024 * 1024)).toFixed(1) +
        " MB"
      );
    }

    return (
      (size / (1024 * 1024 * 1024)).toFixed(1) +
      " GB"
    );

  }


  function getImageLimit() {

    const providers =
      GENZ.providers;

    if (
      !providers ||
      !providers.currentProvider
    ) {

      return 1;

    }

    const provider =
      providers.currentProvider;

    const modelId =
      text(
        get("model")?.value
      );

    let model = null;


    if (
      Array.isArray(
        provider.models
      )
    ) {

      model =
        provider.models.find(
          function (item) {

            return (
              text(item?.id) ===
              modelId
            );

          }
        );

    }


    if (
      !model &&
      providers.currentModel
    ) {

      model =
        providers.currentModel;

    }


    const candidates = [

      model?.reference?.maxImages,

      model?.capabilities?.reference?.maxImages,

      model?.features?.reference?.maxImages,

      model?.maxImages,

      provider?.reference?.maxImages,

      provider?.capabilities?.reference?.maxImages

    ];


    for (
      const value of candidates
    ) {

      const number =
        Number(value);

      if (
        Number.isFinite(number) &&
        number > 0
      ) {

        return Math.max(
          1,
          Math.floor(number)
        );

      }

    }


    return 1;

  }


  /* =======================================================
     SYNC STATE
  ======================================================= */

  function syncImageState() {

    GENZ.state.images =
      GENZ.upload.images;

    GENZ.state.imageFiles =
      GENZ.upload.imageFiles;

    GENZ.state.imageData =
      GENZ.upload.imageData;

  }


  function syncVideoState() {

    GENZ.state.videoFiles =
      GENZ.upload.videoFiles;

    GENZ.state.videoData =
      GENZ.upload.videoData;

  }


  /* =======================================================
     REVOKE IMAGE OBJECT URL
  ======================================================= */

  function revokeImageUrls() {

    if (
      !Array.isArray(
        GENZ.upload.imageObjectUrls
      )
    ) {

      GENZ.upload.imageObjectUrls = [];

      return;

    }


    GENZ.upload.imageObjectUrls
      .forEach(
        function (url) {

          if (!url) {
            return;
          }

          try {

            URL.revokeObjectURL(
              url
            );

          } catch (_) {}

        }
      );


    GENZ.upload.imageObjectUrls = [];

  }


  /* =======================================================
     REVOKE VIDEO OBJECT URL
  ======================================================= */

  function revokeVideoUrls() {

    if (
      !Array.isArray(
        GENZ.upload.videoObjectUrls
      )
    ) {

      GENZ.upload.videoObjectUrls = [];

      return;

    }


    GENZ.upload.videoObjectUrls
      .forEach(
        function (url) {

          if (!url) {
            return;
          }

          try {

            URL.revokeObjectURL(
              url
            );

          } catch (_) {}

        }
      );


    GENZ.upload.videoObjectUrls = [];

  }


  /* =======================================================
     IMAGE PREVIEW
  ======================================================= */

  function renderImagePreview() {

    const preview =
      get("imagePreview");

    const group =
      get("imageReferenceGroup");

    const status =
      get("imageFileStatus");

    if (!preview) {
      return;
    }


    revokeImageUrls();


    preview.innerHTML =
      "";


    const files =
      Array.isArray(
        GENZ.upload.imageFiles
      )
        ? GENZ.upload.imageFiles
        : [];


    if (!files.length) {

      preview.classList.add(
        "hidden"
      );

      preview.style.display =
        "none";


      if (group) {

        group.classList.remove(
          "has-reference-image"
        );

      }


      if (status) {

        status.textContent =
          "Tidak ada file dipilih";

      }


      return;

    }


    preview.classList.remove(
      "hidden"
    );

    preview.style.display =
      "";


    if (group) {

      group.classList.add(
        "has-reference-image"
      );

    }


    const fragment =
      document.createDocumentFragment();


    files.forEach(
      function (file, index) {

        if (!isImage(file)) {
          return;
        }


        let objectUrl = null;


        try {

          objectUrl =
            URL.createObjectURL(
              file
            );

          GENZ.upload.imageObjectUrls
            .push(
              objectUrl
            );

        } catch (_) {

          objectUrl =
            null;

        }


        const item =
          document.createElement(
            "div"
          );

        item.className =
          "reference-image-item";


        item.style.position =
          "relative";

        item.style.width =
          "100%";

        item.style.height =
          "100%";

        item.style.overflow =
          "hidden";

        item.style.borderRadius =
          "12px";


        const image =
          document.createElement(
            "img"
          );


        image.alt =
          file.name ||
          "Reference image";


        image.title =
          file.name ||
          "Reference image";


        image.loading =
          "eager";


        image.decoding =
          "async";


        image.style.width =
          "100%";

        image.style.height =
          "100%";

        image.style.display =
          "block";

        image.style.objectFit =
          "cover";


        if (objectUrl) {

          image.src =
            objectUrl;

        }


        item.appendChild(
          image
        );


        const remove =
          document.createElement(
            "button"
          );


        remove.type =
          "button";


        remove.className =
          "reference-image-remove";


        remove.textContent =
          "×";


        remove.setAttribute(
          "aria-label",
          "Hapus " +
            (
              file.name ||
              "reference image"
            )
        );


        remove.title =
          "Hapus reference image";


        remove.style.position =
          "absolute";

        remove.style.top =
          "6px";

        remove.style.right =
          "6px";

        remove.style.zIndex =
          "20";

        remove.style.width =
          "30px";

        remove.style.height =
          "30px";

        remove.style.minWidth =
          "30px";

        remove.style.padding =
          "0";

        remove.style.border =
          "0";

        remove.style.borderRadius =
          "50%";

        remove.style.background =
          "rgba(0,0,0,.78)";

        remove.style.color =
          "#fff";

        remove.style.fontSize =
          "20px";

        remove.style.fontWeight =
          "700";

        remove.style.lineHeight =
          "30px";

        remove.style.textAlign =
          "center";

        remove.style.cursor =
          "pointer";


        remove.addEventListener(
          "click",
          function (event) {

            event.preventDefault();

            event.stopPropagation();

            GENZ.upload.removeImage(
              index
            );

          }
        );


        item.appendChild(
          remove
        );


        fragment.appendChild(
          item
        );

      }
    );


    preview.appendChild(
      fragment
    );


    if (status) {

      if (files.length === 1) {

        status.textContent =
          files[0].name +
          " (" +
          formatFileSize(
            files[0].size
          ) +
          ")";

      } else {

        status.textContent =
          files.length +
          " gambar dipilih";

      }

    }

  }


  /* =======================================================
     IMAGE DATA
  ======================================================= */

  function readImageFiles(
    files
  ) {

    return new Promise(
      function (resolve, reject) {

        const list =
          Array.from(
            files || []
          ).filter(
            isImage
          );


        if (!list.length) {

          resolve([]);

          return;

        }


        const results =
          new Array(
            list.length
          );


        let completed =
          0;


        list.forEach(
          function (file, index) {

            const reader =
              new FileReader();


            reader.onload =
              function () {

                results[index] =
                  reader.result;

                completed++;


                if (
                  completed ===
                  list.length
                ) {

                  resolve(
                    results
                  );

                }

              };


            reader.onerror =
              function () {

                reject(
                  new Error(
                    "Gagal membaca file gambar: " +
                    (
                      file.name ||
                      "file"
                    )
                  )
                );

              };


            reader.onabort =
              function () {

                reject(
                  new Error(
                    "Pembacaan file gambar dibatalkan."
                  )
                );

              };


            reader.readAsDataURL(
              file
            );

          }
        );

      }
    );

  }


  /* =======================================================
     SET IMAGE
  ======================================================= */

  GENZ.upload.setImages =
    async function (
      files
    ) {

      const inputFiles =
        Array.from(
          files || []
        ).filter(
          isImage
        );


      if (!inputFiles.length) {

        return [];

      }


      const limit =
        getImageLimit();


      const existing =
        Array.isArray(
          GENZ.upload.imageFiles
        )
          ? GENZ.upload.imageFiles
          : [];


      const merged =
        existing.concat(
          inputFiles
        );


      const unique =
        [];


      const seen =
        new Set();


      merged.forEach(
        function (file) {

          const key =
            [
              file.name,
              file.size,
              file.lastModified,
              file.type
            ].join(
              "::"
            );


          if (
            seen.has(key)
          ) {

            return;

          }


          seen.add(key);

          unique.push(
            file
          );

        }
      );


      const selected =
        unique.slice(
          0,
          limit
        );


      GENZ.upload.imageFiles =
        selected;


      GENZ.upload.images =
        selected;


      try {

        const data =
          await readImageFiles(
            selected
          );


        GENZ.upload.imageData =
          data.length === 1
            ? data[0]
            : data;


        syncImageState();

        renderImagePreview();

        updateImageHint();

        return selected;

      } catch (error) {

        GENZ.upload.imageFiles =
          [];

        GENZ.upload.images =
          [];

        GENZ.upload.imageData =
          null;


        syncImageState();

        renderImagePreview();


        throw error;

      }

    };


  /* =======================================================
     IMAGE CHANGE
  ======================================================= */

  function handleImageChange(
    event
  ) {

    const input =
      event?.target ||
      get("image");


    if (!input) {
      return;
    }


    const files =
      Array.from(
        input.files || []
      );


    if (!files.length) {
      return;
    }


    const invalid =
      files.find(
        function (file) {

          return !isImage(
            file
          );

        }
      );


    if (invalid) {

      const status =
        get(
          "imageFileStatus"
        );

      if (status) {

        status.textContent =
          "Format gambar tidak didukung.";

      }

      input.value =
        "";

      return;

    }


    const limit =
      getImageLimit();


    const existing =
      Array.isArray(
        GENZ.upload.imageFiles
      )
        ? GENZ.upload.imageFiles
        : [];


    const remaining =
      Math.max(
        0,
        limit -
          existing.length
      );


    if (
      remaining === 0
    ) {

      updateImageHint();

      input.value =
        "";

      return;

    }


    GENZ.upload
      .setImages(
        files.slice(
          0,
          remaining
        )
      )
      .catch(
        function (error) {

          console.error(
            "GEN-Z.AI image upload error:",
            error
          );

          const status =
            get(
              "imageFileStatus"
            );

          if (status) {

            status.textContent =
              error?.message ||
              "Gagal membaca gambar.";

          }

        }
      );


    /*
     * Reset value setelah pemrosesan.
     * Ini memungkinkan user memilih file
     * yang sama lagi.
     */

    window.setTimeout(
      function () {

        try {

          input.value =
            "";

        } catch (_) {}

      },
      0
    );

  }


  /* =======================================================
     REMOVE IMAGE
  ======================================================= */

  GENZ.upload.removeImage =
    function (
      index
    ) {

      const files =
        Array.isArray(
          GENZ.upload.imageFiles
        )
          ? GENZ.upload.imageFiles
          : [];


      if (
        index == null ||
        index < 0 ||
        index >= files.length
      ) {

        return;

      }


      files.splice(
        index,
        1
      );


      GENZ.upload.imageFiles =
        files;

      GENZ.upload.images =
        files;


      if (!files.length) {

        GENZ.upload.imageData =
          null;

        syncImageState();

        renderImagePreview();

        updateImageHint();

        return;

      }


      readImageFiles(
        files
      )
        .then(
          function (data) {

            GENZ.upload.imageData =
              data.length === 1
                ? data[0]
                : data;

            syncImageState();

            renderImagePreview();

            updateImageHint();

          }
        )
        .catch(
          function (error) {

            console.error(
              "GEN-Z.AI image rebuild error:",
              error
            );

          }
        );

    };


  /* =======================================================
     CLEAR IMAGE
  ======================================================= */

  GENZ.upload.clearImage =
    function () {

      revokeImageUrls();


      GENZ.upload.images =
        [];

      GENZ.upload.imageFiles =
        [];

      GENZ.upload.imageData =
        null;


      syncImageState();


      const input =
        get("image");


      if (input) {

        try {

          input.value =
            "";

        } catch (_) {}

      }


      renderImagePreview();

      updateImageHint();

    };


  /* =======================================================
     IMAGE HINT
  ======================================================= */

  function updateImageHint() {

    const hint =
      get(
        "imageReferenceHint"
      );


    if (!hint) {
      return;
    }


    const limit =
      getImageLimit();


    const count =
      Array.isArray(
        GENZ.upload.imageFiles
      )
        ? GENZ.upload.imageFiles.length
        : 0;


    if (!count) {

      hint.textContent =
        "Pilih gambar reference.";

      return;

    }


    if (
      limit <= 1
    ) {

      hint.textContent =
        "1 gambar reference dipilih.";

      return;

    }


    if (
      count >= limit
    ) {

      hint.textContent =
        "Maksimal " +
        limit +
        " gambar reference.";

      return;

    }


    hint.textContent =
      count +
      "/" +
      limit +
      " gambar reference dipilih.";

  }


  /* =======================================================
     VIDEO PREVIEW
  ======================================================= */

  function renderVideoPreview() {

    const preview =
      get(
        "videoPreview"
      );

    const video =
      get(
        "referenceVideoPreview"
      );

    const status =
      get(
        "videoFileStatus"
      );


    if (!preview) {
      return;
    }


    revokeVideoUrls();


    const file =
      GENZ.upload.videoFiles?.[0] ||
      null;


    if (!file) {

      preview.classList.add(
        "hidden"
      );

      preview.style.display =
        "none";


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

      }


      if (status) {

        status.textContent =
          "Tidak ada video dipilih";

      }


      return;

    }


    preview.classList.remove(
      "hidden"
    );

    preview.style.display =
      "";


    if (video) {

      let objectUrl =
        null;


      try {

        objectUrl =
          URL.createObjectURL(
            file
          );

        GENZ.upload.videoObjectUrls
          .push(
            objectUrl
          );

      } catch (_) {}


      if (objectUrl) {

        video.src =
          objectUrl;

        video.controls =
          true;

        video.muted =
          true;

        video.playsInline =
          true;

        try {

          video.load();

        } catch (_) {}

      }

    }


    if (status) {

      status.textContent =
        file.name +
        " (" +
        formatFileSize(
          file.size
        ) +
        ")";

    }

  }


  /* =======================================================
     VIDEO DATA
  ======================================================= */

  function readVideoFile(
    file
  ) {

    return new Promise(
      function (
        resolve,
        reject
      ) {

        if (!file) {

          resolve(
            null
          );

          return;

        }


        const reader =
          new FileReader();


        reader.onload =
          function () {

            resolve(
              reader.result
            );

          };


        reader.onerror =
          function () {

            reject(
              new Error(
                "Gagal membaca file video."
              )
            );

          };


        reader.onabort =
          function () {

            reject(
              new Error(
                "Pembacaan video dibatalkan."
              )
            );

          };


        reader.readAsDataURL(
          file
        );

      }
    );

  }


  /* =======================================================
     SET VIDEO
  ======================================================= */

  GENZ.upload.setVideo =
    async function (
      file
    ) {

      if (
        !file ||
        !isVideo(file)
      ) {

        throw new Error(
          "File video tidak didukung."
        );

      }


      GENZ.upload.videoFiles =
        [file];


      GENZ.upload.videoData =
        await readVideoFile(
          file
        );


      syncVideoState();

      renderVideoPreview();


      return file;

    };


  /* =======================================================
     VIDEO CHANGE
  ======================================================= */

  function handleVideoChange(
    event
  ) {

    const input =
      event?.target ||
      get(
        "referenceVideo"
      );


    if (!input) {
      return;
    }


    const file =
      input.files?.[0] ||
      null;


    if (!file) {
      return;
    }


    if (!isVideo(file)) {

      const status =
        get(
          "videoFileStatus"
        );

      if (status) {

        status.textContent =
          "Format video tidak didukung.";

      }

      input.value =
        "";

      return;

    }


    GENZ.upload
      .setVideo(
        file
      )
      .catch(
        function (error) {

          console.error(
            "GEN-Z.AI video upload error:",
            error
          );

          const status =
            get(
              "videoFileStatus"
            );

          if (status) {

            status.textContent =
              error?.message ||
              "Gagal membaca video.";

          }

        }
      );


    window.setTimeout(
      function () {

        try {

          input.value =
            "";

        } catch (_) {}

      },
      0
    );

  }


  /* =======================================================
     CLEAR VIDEO
  ======================================================= */

  GENZ.upload.clearVideo =
    function () {

      revokeVideoUrls();


      GENZ.upload.videoFiles =
        [];

      GENZ.upload.videoData =
        null;


      syncVideoState();


      const input =
        get(
          "referenceVideo"
        );


      if (input) {

        try {

          input.value =
            "";

        } catch (_) {}

      }


      renderVideoPreview();

    };


  /* =======================================================
     BIND IMAGE INPUT
  ======================================================= */

  function bindImageInput() {

    const input =
      get("image");


    if (!input) {
      return;
    }


    if (
      input.dataset
        .genzUploadBound ===
      "true"
    ) {

      return;

    }


    input.addEventListener(
      "change",
      handleImageChange
    );


    input.dataset
      .genzUploadBound =
      "true";


    input.addEventListener(
      "cancel",
      function () {

        updateImageHint();

      }
    );

  }


  /* =======================================================
     BIND VIDEO INPUT
  ======================================================= */

  function bindVideoInput() {

    const input =
      get(
        "referenceVideo"
      );


    if (!input) {
      return;
    }


    if (
      input.dataset
        .genzUploadBound ===
      "true"
    ) {

      return;

    }


    input.addEventListener(
      "change",
      handleVideoChange
    );


    input.dataset
      .genzUploadBound =
      "true";


    input.addEventListener(
      "cancel",
      function () {

        return;

      }
    );

  }


  /* =======================================================
     BIND ADD TILE
  ======================================================= */

  function bindAddTiles() {

    const imageTile =
      get(
        "imageAddTile"
      );

    const imageInput =
      get(
        "image"
      );


    if (
      imageTile &&
      imageInput &&
      imageTile.dataset
        .genzUploadTileBound !==
        "true"
    ) {

      imageTile.addEventListener(
        "click",
        function (event) {

          event.preventDefault();

          event.stopPropagation();

          imageInput.click();

        }
      );


      imageTile.dataset
        .genzUploadTileBound =
        "true";

    }


    const videoTile =
      get(
        "videoAddTile"
      );

    const videoInput =
      get(
        "referenceVideo"
      );


    if (
      videoTile &&
      videoInput &&
      videoTile.dataset
        .genzUploadTileBound !==
        "true"
    ) {

      videoTile.addEventListener(
        "click",
        function (event) {

          event.preventDefault();

          event.stopPropagation();

          videoInput.click();

        }
      );


      videoTile.dataset
        .genzUploadTileBound =
        "true";

    }

  }


  /* =======================================================
     INIT
  ======================================================= */

  function init() {

    bindImageInput();

    bindVideoInput();

    bindAddTiles();

    updateImageHint();

    renderImagePreview();

    renderVideoPreview();

    syncImageState();

    syncVideoState();

  }


  /* =======================================================
     PUBLIC INIT
  ======================================================= */

  GENZ.upload.init =
    init;


  /* =======================================================
     DOM READY
  ======================================================= */

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


  /* =======================================================
     DYNAMIC COMPONENT SUPPORT
  ======================================================= */

  let observerStarted =
    false;


  function startObserver() {

    if (
      observerStarted ||
      !document.body ||
      typeof MutationObserver ===
        "undefined"
    ) {

      return;

    }


    observerStarted =
      true;


    const observer =
      new MutationObserver(
        function () {

          bindImageInput();

          bindVideoInput();

          bindAddTiles();

        }
      );


    observer.observe(
      document.body,
      {
        childList: true,
        subtree: true
      }
    );

  }


  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      startObserver,
      {
        once: true
      }
    );

  } else {

    startObserver();

  }


  /* =======================================================
     WINDOW EVENTS
  ======================================================= */

  window.addEventListener(
    "beforeunload",
    function () {

      revokeImageUrls();

      revokeVideoUrls();

    }
  );


})();
