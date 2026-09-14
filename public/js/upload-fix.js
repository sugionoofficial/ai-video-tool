/* =========================================================
   GEN-Z.AI
   REFERENCE MEDIA + GENERATOR UI FIX

   File:
   public/js/upload-fix.js

   Fungsi:
   - Menjaga reference image tetap terlihat
   - Menjaga reference video tetap terlihat
   - Tombol hapus reference
   - Mengunci placeholder provider
   - Memperbaiki fallback capability:
     aspect ratio
     duration
     resolution
   - Menjaga tombol Generate tetap oval dan hijau
   - Tidak mengambil alih proses upload
   - Tidak mengganti proses generate
   - Tidak menggunakan interval permanen
========================================================= */

(function () {

  'use strict';

  window.GENZ =
    window.GENZ ||
    {};

  const GENZ =
    window.GENZ;

  GENZ.upload =
    GENZ.upload ||
    {};

  GENZ.state =
    GENZ.state ||
    {};


  /* =======================================================
     HELPER
  ======================================================= */

  function get(id) {

    return document.getElementById(id);

  }


  function text(value) {

    return String(
      value ?? ''
    ).trim();

  }


  function unique(values) {

    return [
      ...new Set(
        (Array.isArray(values)
          ? values
          : []
        ).map(function (value) {

          return String(value);

        })
      )
    ];

  }


  function hasImages() {

    return (
      Array.isArray(
        GENZ.upload.images
      ) &&
      GENZ.upload.images.length > 0
    );

  }


  function hasVideos() {

    return (
      Array.isArray(
        GENZ.upload.videoFiles
      ) &&
      GENZ.upload.videoFiles.length > 0
    );

  }


  /* =======================================================
     PROVIDER PLACEHOLDER
  ======================================================= */

  function lockProviderPlaceholder() {

    const provider =
      get('provider');

    if (!provider) {
      return;
    }

    Array.from(
      provider.options || []
    ).forEach(function (option) {

      const value =
        text(option.value);

      const label =
        text(option.textContent)
          .toLowerCase();

      const placeholder =
        value === '' ||
        label === 'pilih provider' ||
        label === 'pilih ai engine' ||
        label === '-- pilih provider --' ||
        label === '-- pilih ai engine --';

      if (placeholder) {

        option.disabled = true;

        option.setAttribute(
          'aria-disabled',
          'true'
        );

      }

    });

  }


  /* =======================================================
     MODEL CAPABILITY FALLBACK
  ======================================================= */

  const BUILTIN_CAPABILITIES = {

    'agnes-video-2.5-flash': {

      aspects: [
        '16:9',
        '9:16',
        '4:3',
        '3:4',
        '1:1',
        '21:9'
      ],

      durations: [
        4,
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12
      ],

      resolutions: [
        '720P'
      ],

      imageSupported: true,

      maxImages: 5

    },


    'doubao-seedance-2-0-mini-260615': {

      aspects: [
        '21:9',
        '16:9',
        '4:3',
        '1:1',
        '3:4',
        '9:16'
      ],

      durations: [
        4,
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12,
        13,
        14,
        15
      ],

      resolutions: [
        '480P',
        '720P'
      ],

      imageSupported: true,

      maxImages: 9

    }

  };


  function getRegistryModel(
    modelId
  ) {

    const normalized =
      text(modelId)
        .toLowerCase();

    if (!normalized) {
      return null;
    }


    try {

      if (
        GENZ_CHINAAPI_MODELS &&
        typeof GENZ_CHINAAPI_MODELS
          .getModelInfo ===
          'function'
      ) {

        const info =
          GENZ_CHINAAPI_MODELS
            .getModelInfo(
              normalized
            );

        if (
          info &&
          info.capabilities
        ) {

          return info;

        }

      }

    } catch (_) {
      /* fallback di bawah */
    }


    try {

      if (
        window.GENZ_CHINAAPI_MODELS &&
        typeof window
          .GENZ_CHINAAPI_MODELS
          .getModelInfo ===
          'function'
      ) {

        const info =
          window
            .GENZ_CHINAAPI_MODELS
            .getModelInfo(
              normalized
            );

        if (
          info &&
          info.capabilities
        ) {

          return info;

        }

      }

    } catch (_) {
      /* fallback di bawah */
    }


    return null;

  }


  function getModelCapabilities() {

    const model =
      get('model');

    if (!model) {
      return null;
    }

    const modelId =
      text(model.value)
        .toLowerCase();

    if (!modelId) {
      return null;
    }


    /*
     * Prioritas pertama:
     * registry ChinaAPI.
     */

    const registry =
      getRegistryModel(
        modelId
      );

    if (
      registry &&
      registry.capabilities
    ) {

      const capabilities =
        registry.capabilities;

      return {

        aspects:
          unique(
            capabilities.aspects ||
            capabilities.aspectRatios ||
            []
          ),

        durations:
          unique(
            capabilities.durations ||
            []
          ).map(function (value) {

            return Number(value);

          }).filter(function (value) {

            return Number.isFinite(value);

          }),

        resolutions:
          unique(
            capabilities.resolutions ||
            []
          ),

        imageSupported:
          capabilities.reference?.imageSupported === true ||
          capabilities.imageReferenceSupported === true,

        maxImages:
          Number(
            capabilities.reference?.maxImages ||
            capabilities.maxImages ||
            1
          )

      };

    }


    /*
     * Fallback built-in.
     */

    if (
      BUILTIN_CAPABILITIES[
        modelId
      ]
    ) {

      return (
        BUILTIN_CAPABILITIES[
          modelId
        ]
      );

    }


    /*
     * Coba baca capability dari
     * GENZ.providers jika tersedia.
     */

    try {

      const currentModel =
        GENZ.providers?.currentModel;

      if (
        currentModel &&
        typeof currentModel ===
          'object'
      ) {

        const capabilities =
          currentModel.capabilities ||
          currentModel.config?.capabilities ||
          {};

        if (
          Object.keys(
            capabilities
          ).length
        ) {

          return {

            aspects:
              unique(
                capabilities.aspects ||
                capabilities.aspectRatios ||
                []
              ),

            durations:
              unique(
                capabilities.durations ||
                []
              ).map(function (value) {

                return Number(value);

              }).filter(function (value) {

                return Number.isFinite(value);

              }),

            resolutions:
              unique(
                capabilities.resolutions ||
                []
              ),

            imageSupported:
              capabilities.reference?.imageSupported === true ||
              capabilities.imageReferenceSupported === true,

            maxImages:
              Number(
                capabilities.reference?.maxImages ||
                capabilities.maxImages ||
                1
              )

          };

        }

      }

    } catch (_) {
      /* ignore */
    }


    return null;

  }


  /* =======================================================
     SELECT HELPER
  ======================================================= */

  function replaceOptions(
    element,
    values,
    placeholder
  ) {

    if (!element) {
      return;
    }

    const list =
      unique(values);

    if (!list.length) {
      return;
    }


    const current =
      Array.from(
        element.options || []
      ).map(function (option) {

        return String(
          option.value
        );

      });


    const same =
      current.length === list.length &&
      current.every(
        function (value, index) {

          return (
            value ===
            String(list[index])
          );

        }
      );


    if (same) {

      if (
        !list.includes(
          text(element.value)
        )
      ) {

        element.value =
          String(list[0]);

      }

      return;

    }


    const previous =
      text(element.value);


    element.innerHTML =
      '';


    list.forEach(
      function (value) {

        const option =
          document.createElement(
            'option'
          );

        option.value =
          String(value);

        option.textContent =
          String(value);

        element.appendChild(
          option
        );

      }
    );


    if (
      previous &&
      list.includes(
        previous
      )
    ) {

      element.value =
        previous;

    } else {

      element.value =
        String(list[0]);

    }

  }


  /* =======================================================
     REPAIR CAPABILITY SELECT
  ======================================================= */

  function repairCapabilities() {

    const capabilities =
      getModelCapabilities();

    if (!capabilities) {
      return;
    }


    const ratio =
      get('ratio');

    const duration =
      get('duration');

    const resolution =
      get('resolution');


    /*
     * ASPECT RATIO
     */

    if (
      ratio &&
      capabilities.aspects.length
    ) {

      replaceOptions(
        ratio,
        capabilities.aspects,
        'Pilih aspect ratio'
      );

    }


    /*
     * DURATION
     */

    if (
      duration &&
      capabilities.durations.length
    ) {

      replaceOptions(
        duration,
        capabilities.durations,
        'Pilih durasi'
      );

    }


    /*
     * RESOLUTION
     */

    if (
      resolution &&
      capabilities.resolutions.length
    ) {

      replaceOptions(
        resolution,
        capabilities.resolutions,
        'Pilih resolusi'
      );

    }


    /*
     * Reference image.
     */

    updateReferenceImageUI(
      capabilities
    );

  }


  /* =======================================================
     REFERENCE IMAGE
  ======================================================= */

  function updateReferenceImageUI(
    capabilities
  ) {

    const input =
      get('image');

    const group =
      get(
        'imageReferenceGroup'
      );

    const hint =
      get(
        'imageReferenceHint'
      );


    if (!input) {
      return;
    }


    /*
     * Model belum diketahui.
     */

    if (!capabilities) {

      input.disabled =
        false;

      if (group) {

        group.classList.remove(
          'hidden'
        );

        group.style.setProperty(
          'display',
          '',
          'important'
        );

      }

      return;

    }


    /*
     * Model mendukung image.
     */

    if (
      capabilities.imageSupported
    ) {

      input.disabled =
        false;

      input.removeAttribute(
        'aria-disabled'
      );


      if (group) {

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

      }


      if (hint) {

        const max =
          Number(
            capabilities.maxImages ||
            1
          );

        hint.textContent =
          max > 1
            ? `Maksimal ${max} gambar reference.`
            : 'Maksimal 1 gambar reference.';

      }

      return;

    }


    /*
     * Model tidak mendukung image.
     */

    if (group) {

      group.classList.add(
        'hidden'
      );

      group.style.setProperty(
        'display',
        'none',
        'important'
      );

    }

  }


  /* =======================================================
     GENERATE BUTTON
  ======================================================= */

  function styleGenerateButton() {

    const button =
      get(
        'generateBtn'
      );

    if (!button) {
      return;
    }


    button.style.setProperty(
      'display',
      'inline-flex',
      'important'
    );

    button.style.setProperty(
      'align-items',
      'center',
      'important'
    );

    button.style.setProperty(
      'justify-content',
      'center',
      'important'
    );

    button.style.setProperty(
      'width',
      '100%',
      'important'
    );

    button.style.setProperty(
      'min-height',
      '48px',
      'important'
    );

    button.style.setProperty(
      'height',
      '48px',
      'important'
    );

    button.style.setProperty(
      'padding',
      '0 24px',
      'important'
    );

    button.style.setProperty(
      'margin-top',
      '12px',
      'important'
    );

    button.style.setProperty(
      'border',
      '0',
      'important'
    );

    button.style.setProperty(
      'border-radius',
      '999px',
      'important'
    );

    button.style.setProperty(
      'background',
      '#198754',
      'important'
    );

    button.style.setProperty(
      'background-color',
      '#198754',
      'important'
    );

    button.style.setProperty(
      'color',
      '#ffffff',
      'important'
    );

    button.style.setProperty(
      'font-size',
      '15px',
      'important'
    );

    button.style.setProperty(
      'font-weight',
      '700',
      'important'
    );

    button.style.setProperty(
      'line-height',
      '1',
      'important'
    );

    button.style.setProperty(
      'box-sizing',
      'border-box',
      'important'
    );

    button.style.setProperty(
      'cursor',
      button.disabled
        ? 'not-allowed'
        : 'pointer',
      'important'
    );

    /*
     * Jangan membuat tombol kembali abu-abu
     * hanya karena attribute disabled.
     */
    button.style.setProperty(
      'opacity',
      '1',
      'important'
    );

    button.style.setProperty(
      'filter',
      'none',
      'important'
    );

  }


  /* =======================================================
     REMOVE IMAGE
  ======================================================= */

  function removeImage() {

    if (
      typeof GENZ.upload
        .clearImage ===
      'function'
    ) {

      GENZ.upload.clearImage();

      return;

    }


    GENZ.upload.images =
      [];

    GENZ.upload.imageFiles =
      [];

    GENZ.upload.imageData =
      null;

    GENZ.state.images =
      [];

    GENZ.state.imageData =
      null;


    const input =
      get('image');

    if (input) {
      input.value = '';
    }


    const preview =
      get('imagePreview');

    if (preview) {

      preview.innerHTML =
        '';

      preview.classList.add(
        'hidden'
      );

      preview.style.display =
        'none';

    }

  }


  /* =======================================================
     REMOVE VIDEO
  ======================================================= */

  function removeVideo() {

    if (
      typeof GENZ.upload
        .clearVideo ===
      'function'
    ) {

      GENZ.upload.clearVideo();

      return;

    }


    GENZ.upload.videoFiles =
      [];

    GENZ.upload.videoData =
      null;

    GENZ.state.videoFiles =
      [];

    GENZ.state.videoData =
      null;


    const input =
      get('referenceVideo');

    if (input) {
      input.value = '';
    }


    const video =
      get(
        'referenceVideoPreview'
      );

    if (video) {

      try {
        video.pause();
      } catch (_) {}

      video.removeAttribute(
        'src'
      );

      try {
        video.load();
      } catch (_) {}

    }


    const preview =
      get('videoPreview');

    if (preview) {

      preview.classList.add(
        'hidden'
      );

      preview.style.display =
        'none';

    }

  }


  /* =======================================================
     REMOVE BUTTON
  ======================================================= */

  function createRemoveButton(
    className,
    label,
    handler
  ) {

    const button =
      document.createElement(
        'button'
      );

    button.type =
      'button';

    button.className =
      className;

    button.textContent =
      '×';

    button.setAttribute(
      'aria-label',
      label
    );

    button.setAttribute(
      'title',
      label
    );


    Object.assign(
      button.style,
      {
        position: 'absolute',
        top: '6px',
        right: '6px',
        zIndex: '1000',
        width: '32px',
        height: '32px',
        minWidth: '32px',
        minHeight: '32px',
        padding: '0',
        margin: '0',
        border: '0',
        borderRadius: '50%',
        background: 'rgba(0,0,0,.8)',
        color: '#fff',
        fontSize: '22px',
        fontWeight: '700',
        lineHeight: '32px',
        textAlign: 'center',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    );


    button.addEventListener(
      'click',
      function (event) {

        event.preventDefault();

        event.stopPropagation();

        handler();

      }
    );


    return button;

  }


  /* =======================================================
     IMAGE REMOVE BUTTON
  ======================================================= */

  function ensureImageButton() {

    const preview =
      get('imagePreview');

    if (
      !preview ||
      !hasImages()
    ) {

      return;

    }


    preview.classList.remove(
      'hidden'
    );

    preview.style.removeProperty(
      'display'
    );


    if (
      getComputedStyle(
        preview
      ).position ===
      'static'
    ) {

      preview.style.position =
        'relative';

    }


    if (
      preview.querySelector(
        '.reference-image-remove-all'
      )
    ) {

      return;

    }


    preview.appendChild(
      createRemoveButton(
        'reference-image-remove-all',
        'Hapus reference image',
        removeImage
      )
    );

  }


  /* =======================================================
     VIDEO REMOVE BUTTON
  ======================================================= */

  function ensureVideoButton() {

    const preview =
      get('videoPreview');

    if (
      !preview ||
      !hasVideos()
    ) {

      return;

    }


    preview.classList.remove(
      'hidden'
    );

    preview.style.removeProperty(
      'display'
    );


    if (
      getComputedStyle(
        preview
      ).position ===
      'static'
    ) {

      preview.style.position =
        'relative';

    }


    if (
      preview.querySelector(
        '.reference-video-remove-all'
      )
    ) {

      return;

    }


    preview.appendChild(
      createRemoveButton(
        'reference-video-remove-all',
        'Hapus reference video',
        removeVideo
      )
    );

  }


  /* =======================================================
     REFRESH
  ======================================================= */

  function refresh() {

    lockProviderPlaceholder();

    repairCapabilities();

    styleGenerateButton();

    ensureImageButton();

    ensureVideoButton();

  }


  /* =======================================================
     OBSERVE SELECT
  ======================================================= */

  function observeSelect(
    id
  ) {

    const element =
      get(id);

    if (!element) {
      return;
    }


    element.addEventListener(
      'change',
      function () {

        setTimeout(
          refresh,
          0
        );

      }
    );


    const observer =
      new MutationObserver(
        function () {

          setTimeout(
            refresh,
            0
          );

        }
      );


    observer.observe(
      element,
      {
        childList: true,
        subtree: true
      }
    );

  }


  /* =======================================================
     OBSERVE PREVIEW
  ======================================================= */

  function observePreview(
    id,
    callback
  ) {

    const element =
      get(id);

    if (!element) {
      return;
    }


    const observer =
      new MutationObserver(
        function () {

          callback();

        }
      );


    observer.observe(
      element,
      {
        childList: true,
        subtree: true
      }
    );

  }


  /* =======================================================
     OBSERVE PROVIDER
  ======================================================= */

  function observeProvider() {

    const provider =
      get('provider');

    if (!provider) {
      return;
    }


    provider.addEventListener(
      'change',
      function () {

        setTimeout(
          refresh,
          0
        );

      }
    );


    const observer =
      new MutationObserver(
        function () {

          lockProviderPlaceholder();

          setTimeout(
            repairCapabilities,
            0
          );

        }
      );


    observer.observe(
      provider,
      {
        childList: true,
        subtree: true
      }
    );

  }


  /* =======================================================
     EVENTS
  ======================================================= */

  function bindEvents() {

    [
      'genz-image-change',
      'genz-image-removed',
      'genz-upload-complete',
      'genz-video-reference-change',
      'genz-video-reference-removed',
      'genz-provider-change',
      'genz-providers-loaded',
      'genz-model-change'
    ].forEach(
      function (eventName) {

        document.addEventListener(
          eventName,
          function () {

            setTimeout(
              refresh,
              0
            );

          }
        );

      }
    );

  }


  /* =======================================================
     INIT
  ======================================================= */

  function init() {

    bindEvents();

    observeProvider();

    observeSelect(
      'model'
    );

    observeSelect(
      'ratio'
    );

    observeSelect(
      'duration'
    );

    observeSelect(
      'resolution'
    );


    observePreview(
      'imagePreview',
      ensureImageButton
    );

    observePreview(
      'videoPreview',
      ensureVideoButton
    );


    refresh();


    /*
     * Provider/model bisa selesai dimuat
     * secara asynchronous.
     *
     * Gunakan beberapa retry ringan saja,
     * bukan interval permanen.
     */

    let retry = 0;

    const retryTimer =
      setInterval(
        function () {

          retry++;

          refresh();

          if (
            retry >= 10
          ) {

            clearInterval(
              retryTimer
            );

          }

        },
        300
      );

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

})();
