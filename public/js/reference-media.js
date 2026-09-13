/* =========================================================
   GEN-Z.AI REFERENCE MEDIA
   public/js/reference-media.js

   Fungsi:
   - Dynamic Reference Image
   - Dynamic Reference Video
   - Model-specific reference limits
   - Model-specific video duration limits
   - Multiple image reference
   - Multiple video reference
   - Preview image/video
   - Sinkronisasi dengan GENZ.upload
   - Tidak menaruh capability provider di sini

   Capability wajib berasal dari:
   provider.capabilities.constraints[model]
========================================================= */

(function () {

  'use strict';


  /* =======================================================
     GLOBAL
  ======================================================= */

  const GENZ =
    window.GENZ ||
    (window.GENZ = {});


  GENZ.state =
    GENZ.state ||
    {};


  GENZ.upload =
    GENZ.upload ||
    {};


  GENZ.upload.referenceImages =
    Array.isArray(
      GENZ.upload.referenceImages
    )
      ? GENZ.upload.referenceImages
      : [];


  GENZ.upload.referenceVideos =
    Array.isArray(
      GENZ.upload.referenceVideos
    )
      ? GENZ.upload.referenceVideos
      : [];


  GENZ.upload.videoData =
    GENZ.upload.videoData ||
    null;


  GENZ.upload.videoMeta =
    GENZ.upload.videoMeta ||
    null;


  /* =======================================================
     CONSTANTS
  ======================================================= */

  const MAX_IMAGE_FILE_SIZE =
    20 * 1024 * 1024;


  /*
   * Request GEN-Z.AI dibatasi backend.
   *
   * Video tidak boleh dibuat terlalu besar
   * karena Data URL akan memperbesar payload.
   *
   * 8 MB memberi ruang untuk JSON,
   * prompt dan metadata.
   */
  const MAX_VIDEO_FILE_SIZE =
    8 * 1024 * 1024;


  const IMAGE_TYPES = [
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/jpg'
  ];


  const VIDEO_TYPES = [
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'video/x-m4v'
  ];


  /* =======================================================
     HELPERS
  ======================================================= */

  function $(id) {

    return document.getElementById(
      id
    );

  }


  function text(value) {

    return String(
      value ?? ''
    ).trim();

  }


  function getProvider() {

    return (
      GENZ.providers &&
      GENZ.providers.currentProvider
    ) || null;

  }


  function getModel() {

    return text(
      $('model')?.value
    );

  }


  function getRule() {

    const provider =
      getProvider();

    const model =
      getModel();

    if (
      !provider ||
      !model
    ) {

      return null;

    }


    const constraints =
      provider.capabilities &&
      provider.capabilities.constraints;


    if (
      !constraints ||
      typeof constraints !==
        'object'
    ) {

      return null;

    }


    return (
      constraints[model] ||
      null
    );

  }


  function getImageLimit(rule) {

    if (
      !rule
    ) {

      return 0;

    }


    if (
      Number.isInteger(
        rule.maxReferenceImages
      )
    ) {

      return Math.max(
        0,
        rule.maxReferenceImages
      );

    }


    return rule.imageReferenceSupported
      ? 1
      : 0;

  }


  function getVideoLimit(rule) {

    if (
      !rule
    ) {

      return 0;

    }


    if (
      Number.isInteger(
        rule.maxReferenceVideos
      )
    ) {

      return Math.max(
        0,
        rule.maxReferenceVideos
      );

    }


    return rule.videoReferenceSupported
      ? 1
      : 0;

  }


  function imageSupported(rule) {

    return (
      rule &&
      rule.imageReferenceSupported ===
        true
    );

  }


  function videoSupported(rule) {

    return (
      rule &&
      rule.videoReferenceSupported ===
        true
    );

  }


  /* =======================================================
     REFERENCE GROUP
  ======================================================= */

  function getImageGroup() {

    const input =
      $('image');

    if (!input) {

      return null;

    }


    return (
      input.closest(
        '.reference-group'
      ) || null
    );

  }


  function getVideoGroup() {

    return $(
      'videoReferenceGroup'
    );

  }


  /* =======================================================
     CREATE VIDEO GROUP
  ======================================================= */

  function createVideoGroup() {

    if (
      $('videoReferenceGroup')
    ) {

      return $(
        'videoReferenceGroup'
      );

    }


    const imageGroup =
      getImageGroup();


    if (!imageGroup) {

      return null;

    }


    const group =
      document.createElement(
        'div'
      );


    group.id =
      'videoReferenceGroup';


    group.className =
      'reference-group video-reference-group';


    group.innerHTML = `

      <label
        for="videoReference"
        class="reference-label">

        Reference Video

      </label>

      <div
        id="videoReferencePreview"
        class="reference-media-preview hidden">
      </div>

      <input
        id="videoReference"
        class="video-file-input"
        type="file"
        accept="video/mp4,video/quicktime,video/webm,video/x-m4v">

      <div
        id="videoReferenceStatus"
        class="image-file-status"
        aria-live="polite">

        Tidak ada video dipilih

      </div>

    `;


    imageGroup.insertAdjacentElement(
      'afterend',
      group
    );


    return group;

  }


  /* =======================================================
     VIDEO GROUP STATE
  ======================================================= */

  function setVideoGroupVisible(
    visible
  ) {

    const group =
      getVideoGroup();


    if (!group) {

      return;

    }


    if (visible) {

      group.classList.remove(
        'hidden'
      );

      group.style.setProperty(
        'display',
        '',
        'important'
      );

      group.removeAttribute(
        'aria-hidden'
      );

    } else {

      group.classList.add(
        'hidden'
      );

      group.style.setProperty(
        'display',
        'none',
        'important'
      );

      group.setAttribute(
        'aria-hidden',
        'true'
      );

    }

  }


  /* =======================================================
     FILE STATUS
  ======================================================= */

  function setVideoStatus(
    message,
    hasFile = false
  ) {

    const status =
      $('videoReferenceStatus');


    if (!status) {

      return;

    }


    status.textContent =
      message;


    status.classList.toggle(
      'has-file',
      Boolean(
        hasFile
      )
    );

  }


  function setImageStatus(
    message,
    hasFile = false
  ) {

    const status =
      $('imageFileStatus');


    if (!status) {

      return;

    }


    status.textContent =
      message;


    status.classList.toggle(
      'has-file',
      Boolean(
        hasFile
      )
    );

  }


  /* =======================================================
     CLEAR IMAGE REFERENCES
  ======================================================= */

  function clearImages() {

    GENZ.upload.referenceImages =
      [];


    GENZ.upload.imageData =
      null;


    GENZ.state.imageData =
      null;


    GENZ.state.referenceImages =
      [];


    const input =
      $('image');


    if (input) {

      try {

        input.value =
          '';

      } catch (_) {}

    }


    const preview =
      $('imagePreview');


    if (preview) {

      preview.innerHTML =
        '';

      preview.classList.add(
        'hidden'
      );

      preview.style.display =
        '';

    }


    setImageStatus(
      'Tidak ada file dipilih',
      false
    );

  }


  /* =======================================================
     CLEAR VIDEO REFERENCES
  ======================================================= */

  function clearVideos() {

    GENZ.upload.referenceVideos =
      [];


    GENZ.upload.videoData =
      null;


    GENZ.upload.videoMeta =
      null;


    GENZ.state.videoData =
      null;


    GENZ.state.referenceVideos =
      [];


    const input =
      $('videoReference');


    if (input) {

      try {

        input.value =
          '';

      } catch (_) {}

    }


    const preview =
      $('videoReferencePreview');


    if (preview) {

      preview.innerHTML =
        '';

      preview.classList.add(
        'hidden'
      );

    }


    setVideoStatus(
      'Tidak ada video dipilih',
      false
    );

  }


  /* =======================================================
     REMOVE IMAGE ITEM
  ======================================================= */

  function removeImageAt(
    index
  ) {

    const images =
      Array.isArray(
        GENZ.upload.referenceImages
      )
        ? GENZ.upload.referenceImages
        : [];


    if (
      index < 0 ||
      index >= images.length
    ) {

      return;

    }


    images.splice(
      index,
      1
    );


    GENZ.upload.referenceImages =
      images;


    GENZ.upload.imageData =
      images[0]?.data ||
      null;


    GENZ.state.imageData =
      GENZ.upload.imageData;


    GENZ.state.referenceImages =
      images.map(
        item =>
          item.data
      );


    renderImagePreview();

  }


  /* =======================================================
     IMAGE PREVIEW
  ======================================================= */

  function renderImagePreview() {

    const preview =
      $('imagePreview');


    if (!preview) {

      return;

    }


    const images =
      Array.isArray(
        GENZ.upload.referenceImages
      )
        ? GENZ.upload.referenceImages
        : [];


    preview.innerHTML =
      '';


    if (!images.length) {

      preview.classList.add(
        'hidden'
      );

      setImageStatus(
        'Tidak ada file dipilih',
        false
      );

      return;

    }


    preview.style.display =
      '';


    preview.classList.remove(
      'hidden'
    );


    images.forEach(
      (
        item,
        index
      ) => {

        const wrapper =
          document.createElement(
            'div'
          );


        wrapper.className =
          'reference-media-item';


        const image =
          document.createElement(
            'img'
          );


        image.src =
          item.data;


        image.alt =
          item.name ||
          `Reference image ${index + 1}`;


        image.style.width =
          '100%';


        image.style.height =
          '100%';


        image.style.objectFit =
          'cover';


        image.style.display =
          'block';


        const remove =
          document.createElement(
            'button'
          );


        remove.type =
          'button';


        remove.className =
          'image-remove-btn';


        remove.textContent =
          '×';


        remove.setAttribute(
          'aria-label',
          `Hapus ${item.name || 'gambar'}`
        );


        remove.addEventListener(
          'click',
          function (
            event
          ) {

            event.preventDefault();

            event.stopPropagation();

            removeImageAt(
              index
            );

          }
        );


        wrapper.appendChild(
          image
        );


        wrapper.appendChild(
          remove
        );


        preview.appendChild(
          wrapper
        );

      }
    );


    setImageStatus(
      `${images.length} gambar referensi dipilih`,
      true
    );

  }


  /* =======================================================
     VIDEO PREVIEW
  ======================================================= */

  function renderVideoPreview() {

    const preview =
      $('videoReferencePreview');


    if (!preview) {

      return;

    }


    const videos =
      Array.isArray(
        GENZ.upload.referenceVideos
      )
        ? GENZ.upload.referenceVideos
        : [];


    preview.innerHTML =
      '';


    if (!videos.length) {

      preview.classList.add(
        'hidden'
      );

      setVideoStatus(
        'Tidak ada video dipilih',
        false
      );

      return;

    }


    preview.classList.remove(
      'hidden'
    );


    videos.forEach(
      (
        item,
        index
      ) => {

        const wrapper =
          document.createElement(
            'div'
          );


        wrapper.className =
          'reference-media-item';


        const video =
          document.createElement(
            'video'
          );


        video.src =
          item.data;


        video.controls =
          true;


        video.muted =
          true;


        video.playsInline =
          true;


        video.preload =
          'metadata';


        video.style.width =
          '100%';


        video.style.height =
          '100%';


        video.style.objectFit =
          'cover';


        const remove =
          document.createElement(
            'button'
          );


        remove.type =
          'button';


        remove.className =
          'image-remove-btn';


        remove.textContent =
          '×';


        remove.setAttribute(
          'aria-label',
          `Hapus ${item.name || 'video'}`
        );


        remove.addEventListener(
          'click',
          function (
            event
          ) {

            event.preventDefault();

            event.stopPropagation();

            removeVideoAt(
              index
            );

          }
        );


        wrapper.appendChild(
          video
        );


        wrapper.appendChild(
          remove
        );


        preview.appendChild(
          wrapper
        );

      }
    );


    setVideoStatus(
      `${videos.length} video referensi dipilih`,
      true
    );

  }


  /* =======================================================
     REMOVE VIDEO
  ======================================================= */

  function removeVideoAt(
    index
  ) {

    const videos =
      Array.isArray(
        GENZ.upload.referenceVideos
      )
        ? GENZ.upload.referenceVideos
        : [];


    if (
      index < 0 ||
      index >= videos.length
    ) {

      return;

    }


    videos.splice(
      index,
      1
    );


    GENZ.upload.referenceVideos =
      videos;


    GENZ.upload.videoData =
      videos[0]?.data ||
      null;


    GENZ.upload.videoMeta =
      videos[0]
        ? {
            name:
              videos[0].name,

            size:
              videos[0].size,

            type:
              videos[0].type,

            duration:
              videos[0].duration
          }
        : null;


    GENZ.state.videoData =
      GENZ.upload.videoData;


    GENZ.state.referenceVideos =
      videos;


    renderVideoPreview();

  }


  /* =======================================================
     IMAGE FILE VALIDATION
  ======================================================= */

  function validateImageFile(
    file
  ) {

    if (!file) {

      return 'File gambar tidak ditemukan.';

    }


    if (
      !IMAGE_TYPES.includes(
        file.type
      )
    ) {

      return (
        'Format gambar harus PNG, JPG, JPEG, atau WEBP.'
      );

    }


    if (
      file.size >
      MAX_IMAGE_FILE_SIZE
    ) {

      return (
        'Ukuran gambar maksimal 20 MB.'
      );

    }


    return '';

  }


  /* =======================================================
     VIDEO FILE VALIDATION
  ======================================================= */

  function validateVideoFile(
    file,
    rule
  ) {

    if (!file) {

      return 'File video tidak ditemukan.';

    }


    if (
      !VIDEO_TYPES.includes(
        file.type
      )
    ) {

      return (
        'Format video harus MP4, MOV, WEBM, atau M4V.'
      );

    }


    if (
      file.size >
      MAX_VIDEO_FILE_SIZE
    ) {

      return (
        'Ukuran video maksimal 8 MB.'
      );

    }


    if (
      !videoSupported(
        rule
      )
    ) {

      return (
        'Model ini tidak mendukung video reference.'
      );

    }


    return '';

  }


  /* =======================================================
     VIDEO DURATION
  ======================================================= */

  function readVideoDuration(
    file
  ) {

    return new Promise(
      function (
        resolve,
        reject
      ) {

        const video =
          document.createElement(
            'video'
          );


        const objectUrl =
          URL.createObjectURL(
            file
          );


        video.preload =
          'metadata';


        video.onloadedmetadata =
          function () {

            const duration =
              Number(
                video.duration
              );


            try {

              URL.revokeObjectURL(
                objectUrl
              );

            } catch (_) {}


            if (
              !Number.isFinite(
                duration
              )
            ) {

              reject(
                new Error(
                  'Durasi video tidak dapat dibaca.'
                )
              );

              return;

            }


            resolve(
              duration
            );

          };


        video.onerror =
          function () {

            try {

              URL.revokeObjectURL(
                objectUrl
              );

            } catch (_) {}


            reject(
              new Error(
                'Video tidak dapat dibaca oleh browser.'
              )
            );

          };


        video.src =
          objectUrl;

      }
    );

  }


  /* =======================================================
     VIDEO FILE READER
  ======================================================= */

  function readFile(
    file
  ) {

    return new Promise(
      function (
        resolve,
        reject
      ) {

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
                'File gagal dibaca.'
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
     IMAGE INPUT
  ======================================================= */

  function setupImageInput() {

    const input =
      $('image');


    if (!input) {

      return;

    }


    input.dataset.referenceMediaManaged =
      'true';


    input.addEventListener(
      'change',
      async function (
        event
      ) {

        /*
         * Ambil alih listener upload.js
         * yang sebelumnya hanya mendukung satu
         * gambar.
         */
        event.stopImmediatePropagation();


        const rule =
          getRule();


        if (
          !imageSupported(
            rule
          )
        ) {

          clearImages();

          return;

        }


        const limit =
          getImageLimit(
            rule
          );


        const files =
          Array.from(
            event.target.files ||
            []
          );


        if (
          !files.length
        ) {

          clearImages();

          return;

        }


        if (
          limit > 0 &&
          files.length >
            limit
        ) {

          setImageStatus(
            `Model ini maksimal ${limit} gambar referensi.`,
            false
          );


          input.value =
            '';


          return;

        }


        const result =
          [];


        try {

          for (
            const file
            of files
          ) {

            const error =
              validateImageFile(
                file
              );


            if (error) {

              throw new Error(
                error
              );

            }


            const data =
              await readFile(
                file
              );


            result.push({
              name:
                file.name,

              size:
                file.size,

              type:
                file.type,

              data
            });

          }


          GENZ.upload.referenceImages =
            result;


          GENZ.upload.imageData =
            result[0]?.data ||
            null;


          GENZ.state.imageData =
            GENZ.upload.imageData;


          GENZ.state.referenceImages =
            result.map(
              item =>
                item.data
            );


          renderImagePreview();


          document.dispatchEvent(
            new CustomEvent(
              'genz-reference-change'
            )
          );

        } catch (
          error
        ) {

          clearImages();


          const status =
            $('status');


          if (status) {

            status.textContent =
              error.message;

          }

        }

      },
      true
    );

  }


  /* =======================================================
     VIDEO INPUT
  ======================================================= */

  function setupVideoInput() {

    const input =
      $('videoReference');


    if (!input) {

      return;

    }


    input.addEventListener(
      'change',
      async function (
        event
      ) {

        event.stopImmediatePropagation();


        const rule =
          getRule();


        if (
          !videoSupported(
            rule
          )
        ) {

          clearVideos();

          return;

        }


        const limit =
          getVideoLimit(
            rule
          );


        const files =
          Array.from(
            event.target.files ||
            []
          );


        if (
          !files.length
        ) {

          clearVideos();

          return;

        }


        if (
          limit > 0 &&
          files.length >
            limit
        ) {

          setVideoStatus(
            `Model ini maksimal ${limit} video referensi.`,
            false
          );


          input.value =
            '';


          return;

        }


        const videos =
          [];


        try {

          for (
            const file
            of files
          ) {

            const error =
              validateVideoFile(
                file,
                rule
              );


            if (error) {

              throw new Error(
                error
              );

            }


            const duration =
              await readVideoDuration(
                file
              );


            const min =
              Number(
                rule.videoMinDuration
              );


            const max =
              Number(
                rule.videoMaxDuration ||
                rule.maxVideoReferenceDuration
              );


            if (
              Number.isFinite(
                min
              ) &&
              duration < min
            ) {

              throw new Error(
                `Video reference minimal ${min} detik.`
              );

            }


            if (
              Number.isFinite(
                max
              ) &&
              duration > max
            ) {

              throw new Error(
                `Video reference maksimal ${max} detik.`
              );

            }


            const data =
              await readFile(
                file
              );


            videos.push({
              name:
                file.name,

              size:
                file.size,

              type:
                file.type,

              duration,

              data
            });

          }


          GENZ.upload.referenceVideos =
            videos;


          GENZ.upload.videoData =
            videos[0]?.data ||
            null;


          GENZ.upload.videoMeta =
            videos[0]
              ? {
                  name:
                    videos[0].name,

                  size:
                    videos[0].size,

                  type:
                    videos[0].type,

                  duration:
                    videos[0].duration
                }
              : null;


          GENZ.state.videoData =
            GENZ.upload.videoData;


          GENZ.state.referenceVideos =
            videos;


          renderVideoPreview();


          document.dispatchEvent(
            new CustomEvent(
              'genz-reference-change'
            )
          );

        } catch (
          error
        ) {

          clearVideos();


          const status =
            $('status');


          if (status) {

            status.textContent =
              error.message;

          }

        }

      },
      true
    );

  }


  /* =======================================================
     APPLY LIMITS
  ======================================================= */

  function applyLimits() {

    const rule =
      getRule();


    const imageInput =
      $('image');


    if (imageInput) {

      const imageEnabled =
        imageSupported(
          rule
        );


      imageInput.disabled =
        !imageEnabled;


      if (
        imageEnabled
      ) {

        const imageLimit =
          getImageLimit(
            rule
          );


        imageInput.multiple =
          imageLimit >
          1;


        imageInput.dataset.maxReferences =
          String(
            imageLimit
          );

      } else {

        imageInput.multiple =
          false;

        clearImages();

      }

    }


    const videoGroup =
      createVideoGroup();


    const videoInput =
      $('videoReference');


    if (
      !videoInput
    ) {

      return;

    }


    const videoEnabled =
      videoSupported(
        rule
      );


    setVideoGroupVisible(
      videoEnabled
    );


    videoInput.disabled =
      !videoEnabled;


    if (
      videoEnabled
    ) {

      const videoLimit =
        getVideoLimit(
          rule
        );


      videoInput.multiple =
        videoLimit >
        1;


      videoInput.dataset.maxReferences =
        String(
          videoLimit
        );


      if (
        Number.isFinite(
          rule.videoMinDuration
        )
      ) {

        videoInput.dataset.minDuration =
          String(
            rule.videoMinDuration
          );

      } else {

        delete videoInput.dataset.minDuration;

      }


      const maxDuration =
        Number(
          rule.maxVideoReferenceDuration ||
          rule.videoMaxDuration
        );


      if (
        Number.isFinite(
          maxDuration
        )
      ) {

        videoInput.dataset.maxDuration =
          String(
            maxDuration
          );

      } else {

        delete videoInput.dataset.maxDuration;

      }

    } else {

      clearVideos();

    }

  }


  /* =======================================================
     PROVIDER / MODEL CHANGES
  ======================================================= */

  function refresh() {

    createVideoGroup();

    applyLimits();

  }


  document.addEventListener(
    'genz-provider-change',
    refresh
  );


  document.addEventListener(
    'change',
    function (
      event
    ) {

      if (
        event.target?.id ===
          'model' ||
        event.target?.id ===
          'provider'
      ) {

        setTimeout(
          refresh,
          0
        );

      }

    }
  );


  /* =======================================================
     INIT
  ======================================================= */

  function init() {

    createVideoGroup();

    setupImageInput();

    setupVideoInput();

    refresh();

  }


  if (
    document.readyState ===
    'loading'
  ) {

    document.addEventListener(
      'DOMContentLoaded',
      init,
      {
        once: true
      }
    );

  } else {

    init();

  }


  /* =======================================================
     PUBLIC API
  ======================================================= */

  GENZ.referenceMedia = {

    refresh,

    clearImages,

    clearVideos,

    getRule,

    getImageLimit,

    getVideoLimit

  };


})();
