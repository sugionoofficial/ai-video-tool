/* =========================================================
   GEN-Z.AI
   REFERENCE MEDIA + GENERATOR UI FIX

   File:
   public/js/upload-fix.js

   Fungsi:
   - Menjaga preview reference image
   - Menjaga preview reference video
   - Tombol X untuk menghapus reference
   - Tidak mengambil alih proses upload
   - Memperbaiki capability Aspect Ratio
   - Memperbaiki Duration
   - Memperbaiki Resolution
   - Mendukung langsung registry model ChinaAPI
   - Tidak memakai polling 1 detik
========================================================= */

(function () {

  'use strict';

  window.GENZ = window.GENZ || {};

  const GENZ = window.GENZ;

  GENZ.upload = GENZ.upload || {};
  GENZ.state = GENZ.state || {};

  let refreshFrame = null;
  let refreshRunning = false;


  /* =======================================================
     DOM
  ======================================================= */

  function get(id) {
    return document.getElementById(id);
  }


  /* =======================================================
     NORMALIZE
  ======================================================= */

  function normalizeProvider(value) {

    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[_\s]+/g, '-')
      .replace(/-+/g, '-');

  }


  function normalizeModel(value) {

    return String(value || '')
      .trim()
      .toLowerCase();

  }


  function normalizeArray(value) {

    if (!Array.isArray(value)) {
      return [];
    }

    return [
      ...new Set(
        value
          .map(function (item) {

            if (
              item === null ||
              item === undefined
            ) {
              return '';
            }

            if (
              typeof item === 'object'
            ) {

              return String(
                item.id ||
                item.value ||
                item.name ||
                item.label ||
                item.model ||
                item.duration ||
                ''
              ).trim();

            }

            return String(item).trim();

          })
          .filter(Boolean)
      )
    ];

  }


  /* =======================================================
     CURRENT PROVIDER
  ======================================================= */

  function getCurrentProvider() {

    const element = get('provider');

    if (
      element &&
      element.value
    ) {

      return normalizeProvider(
        element.value
      );

    }

    return normalizeProvider(
      GENZ.state.provider ||
      GENZ.state.providerId ||
      ''
    );

  }


  /* =======================================================
     CURRENT MODEL
  ======================================================= */

  function getCurrentModel() {

    const element = get('model');

    if (
      element &&
      element.value
    ) {

      return String(
        element.value
      ).trim();

    }

    return String(
      GENZ.state.model ||
      GENZ.state.modelId ||
      ''
    ).trim();

  }


  /* =======================================================
     CHINAAPI DIRECT MODEL INFO
  ======================================================= */

  function getChinaApiModelInfo() {

    const provider =
      getCurrentProvider();

    const model =
      getCurrentModel();

    if (
      provider !== 'chinaapi' ||
      !model
    ) {

      return null;

    }


    const registry =
      window.GENZ_CHINAAPI_MODELS;

    if (
      !registry ||
      typeof registry.getModelInfo !==
        'function'
    ) {

      return null;

    }


    try {

      const info =
        registry.getModelInfo(
          model
        );

      if (
        info &&
        typeof info === 'object' &&
        info.supported !== false
      ) {

        return info;

      }

    } catch (_) {}

    return null;

  }


  /* =======================================================
     GENERIC ADAPTER INFO
  ======================================================= */

  function getAdapterInfo() {

    const provider =
      getCurrentProvider();

    if (!provider) {
      return null;
    }


    const registry =
      window.GENZ_PROVIDERS;

    if (
      !registry ||
      typeof registry.getAdapterInfo !==
        'function'
    ) {

      return null;

    }


    try {

      const info =
        registry.getAdapterInfo(
          provider
        );

      if (
        info &&
        typeof info === 'object'
      ) {

        return info;

      }

    } catch (_) {}

    return null;

  }


  /* =======================================================
     GENERIC MODEL INFO
  ======================================================= */

  function getGenericModelInfo(
    adapterInfo
  ) {

    const model =
      normalizeModel(
        getCurrentModel()
      );

    if (
      !adapterInfo ||
      !model
    ) {

      return null;

    }


    const models =
      Array.isArray(
        adapterInfo.models
      )
        ? adapterInfo.models
        : [];


    for (
      const item of models
    ) {

      if (
        typeof item === 'string'
      ) {

        if (
          normalizeModel(item) ===
          model
        ) {

          return {
            id: item
          };

        }

        continue;

      }


      if (
        !item ||
        typeof item !== 'object'
      ) {

        continue;

      }


      const id =
        normalizeModel(
          item.id ||
          item.model ||
          item.modelId ||
          item.slug ||
          ''
        );


      if (
        id === model
      ) {

        return item;

      }

    }


    return null;

  }


  /* =======================================================
     CAPABILITY EXTRACTION
  ======================================================= */

  function getCapabilities() {

    const provider =
      getCurrentProvider();

    const model =
      getCurrentModel();


    if (
      !provider ||
      !model
    ) {

      return {
        durations: [],
        aspects: [],
        resolutions: []
      };

    }


    /*
     * =====================================================
     * CHINAAPI
     *
     * Ambil langsung dari registry model.
     * Ini adalah sumber capability yang sebenarnya.
     * =====================================================
     */

    if (
      provider === 'chinaapi'
    ) {

      const modelInfo =
        getChinaApiModelInfo();


      if (modelInfo) {

        const info =
          modelInfo.info &&
          typeof modelInfo.info ===
            'object'
            ? modelInfo.info
            : {};


        const capabilities =
          modelInfo.capabilities &&
          typeof modelInfo.capabilities ===
            'object'
            ? modelInfo.capabilities
            : {};


        return {

          durations:
            normalizeArray(
              capabilities.durations
            ).length
              ? normalizeArray(
                  capabilities.durations
                )
              : normalizeArray(
                  info.durations
                ),

          aspects:
            normalizeArray(
              capabilities.aspects
            ).length
              ? normalizeArray(
                  capabilities.aspects
                )
              : normalizeArray(
                  info.aspects
                ),

          resolutions:
            normalizeArray(
              capabilities.resolutions
            ).length
              ? normalizeArray(
                  capabilities.resolutions
                )
              : normalizeArray(
                  info.resolutions
                )

        };

      }

    }


    /*
     * =====================================================
     * PROVIDER LAIN
     * =====================================================
     */

    const adapterInfo =
      getAdapterInfo();


    if (!adapterInfo) {

      return {
        durations: [],
        aspects: [],
        resolutions: []
      };

    }


    const modelInfo =
      getGenericModelInfo(
        adapterInfo
      );


    const providerCapabilities =
      adapterInfo.capabilities &&
      typeof adapterInfo.capabilities ===
        'object'
        ? adapterInfo.capabilities
        : {};


    const modelCapabilities =
      modelInfo &&
      modelInfo.capabilities &&
      typeof modelInfo.capabilities ===
        'object'
        ? modelInfo.capabilities
        : {};


    return {

      durations:
        normalizeArray(
          modelCapabilities.durations
        ).length
          ? normalizeArray(
              modelCapabilities.durations
            )
          : normalizeArray(
              adapterInfo.durations
            ).length
            ? normalizeArray(
                adapterInfo.durations
              )
            : normalizeArray(
                providerCapabilities.durations
              ),

      aspects:
        normalizeArray(
          modelCapabilities.aspects
        ).length
          ? normalizeArray(
              modelCapabilities.aspects
            )
          : normalizeArray(
              adapterInfo.aspects
            ).length
            ? normalizeArray(
                adapterInfo.aspects
              )
            : normalizeArray(
                providerCapabilities.aspects
              ),

      resolutions:
        normalizeArray(
          modelCapabilities.resolutions
        ).length
          ? normalizeArray(
              modelCapabilities.resolutions
            )
          : normalizeArray(
              adapterInfo.resolutions
            ).length
            ? normalizeArray(
                adapterInfo.resolutions
              )
            : normalizeArray(
                providerCapabilities.resolutions
              )

    };

  }


  /* =======================================================
     OPTIONS
  ======================================================= */

  function getExistingValues(select) {

    if (!select) {
      return [];
    }

    return Array.from(
      select.options
    ).map(function (option) {

      return String(
        option.value
      );

    });

  }


  function sameValues(
    current,
    next
  ) {

    if (
      current.length !==
      next.length
    ) {

      return false;

    }


    return current.every(
      function (value, index) {

        return (
          String(value) ===
          String(next[index])
        );

      }
    );

  }


  function setOptions(
    select,
    values,
    placeholder
  ) {

    if (!select) {
      return;
    }


    const list =
      normalizeArray(
        values
      );


    if (!list.length) {
      return;
    }


    const currentValues =
      getExistingValues(
        select
      );


    /*
     * Jika provider.js sudah mempunyai
     * option yang sama, jangan rebuild.
     */

    const expectedValues = [
      '',
      ...list.map(function (value) {

        return String(value);

      })
    ];


    if (
      sameValues(
        currentValues,
        expectedValues
      )
    ) {

      select.dataset.capabilityReady =
        'true';

      return;

    }


    const previous =
      String(
        select.value || ''
      ).trim();


    select.replaceChildren();


    const placeholderOption =
      document.createElement(
        'option'
      );

    placeholderOption.value =
      '';

    placeholderOption.textContent =
      placeholder;

    placeholderOption.disabled =
      false;

    select.appendChild(
      placeholderOption
    );


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

        select.appendChild(
          option
        );

      }
    );


    if (
      previous &&
      list.some(
        function (value) {

          return (
            String(value) ===
            previous
          );

        }
      )
    ) {

      select.value =
        previous;

    } else if (
      list.length === 1
    ) {

      select.value =
        String(
          list[0]
        );

    } else {

      select.value =
        '';

    }


    select.dataset.capabilityReady =
      'true';

  }


  /* =======================================================
     DURATION SORT
  ======================================================= */

  function sortDurations(
    values
  ) {

    return normalizeArray(
      values
    ).sort(
      function (a, b) {

        const numberA =
          Number(a);

        const numberB =
          Number(b);


        if (
          Number.isFinite(
            numberA
          ) &&
          Number.isFinite(
            numberB
          )
        ) {

          return (
            numberA -
            numberB
          );

        }


        return String(a)
          .localeCompare(
            String(b)
          );

      }
    );

  }


  /* =======================================================
     FIX GENERATOR CAPABILITIES
  ======================================================= */

  function fixGeneratorCapabilities() {

    if (refreshRunning) {
      return;
    }


    refreshRunning =
      true;


    try {

      const provider =
        getCurrentProvider();

      const model =
        getCurrentModel();


      if (
        !provider ||
        !model
      ) {

        return;

      }


      const capabilities =
        getCapabilities();


      const ratio =
        get('ratio');

      const duration =
        get('duration');

      const resolution =
        get('resolution');


      /*
       * Aspect Ratio
       */

      if (
        ratio &&
        capabilities.aspects.length
      ) {

        setOptions(
          ratio,
          capabilities.aspects,
          'Pilih aspect ratio'
        );

      }


      /*
       * Duration
       */

      if (
        duration &&
        capabilities.durations.length
      ) {

        setOptions(
          duration,
          sortDurations(
            capabilities.durations
          ),
          'Pilih durasi'
        );

      }


      /*
       * Resolution
       */

      if (
        resolution &&
        capabilities.resolutions.length
      ) {

        setOptions(
          resolution,
          capabilities.resolutions,
          'Pilih resolusi'
        );

      }


      /*
       * Simpan capability di state
       * supaya generator lain dapat
       * membaca data yang sama.
       */

      GENZ.state.capabilities =
        GENZ.state.capabilities ||
        {};

      GENZ.state.capabilities.provider =
        provider;

      GENZ.state.capabilities.model =
        model;

      GENZ.state.capabilities.durations =
        capabilities.durations;

      GENZ.state.capabilities.aspects =
        capabilities.aspects;

      GENZ.state.capabilities.resolutions =
        capabilities.resolutions;

    } finally {

      refreshRunning =
        false;

    }

  }


  /* =======================================================
     REMOVE IMAGE
  ======================================================= */

  function removeImage() {

    if (
      typeof GENZ.upload.clearImage ===
      'function'
    ) {

      GENZ.upload.clearImage();

      return;

    }


    GENZ.upload.images = [];
    GENZ.upload.imageFiles = [];
    GENZ.upload.imageData = null;

    GENZ.state.images = [];
    GENZ.state.imageData = null;


    const input =
      get('image');

    if (input) {

      try {
        input.value = '';
      } catch (_) {}

    }


    const preview =
      get('imagePreview');

    if (preview) {

      preview.innerHTML = '';

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
      typeof GENZ.upload.clearVideo ===
      'function'
    ) {

      GENZ.upload.clearVideo();

      return;

    }


    GENZ.upload.videoFiles = [];
    GENZ.upload.videoData = null;
    GENZ.upload.videoObjectUrls = [];


    GENZ.state.videoFiles = [];
    GENZ.state.videoData = null;


    const input =
      get('referenceVideo');

    if (input) {

      try {
        input.value = '';
      } catch (_) {}

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
    label,
    handler
  ) {

    const button =
      document.createElement(
        'button'
      );

    button.type =
      'button';

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

    button.dataset.genzRemove =
      'true';


    button.style.position =
      'absolute';

    button.style.top =
      '6px';

    button.style.right =
      '6px';

    button.style.zIndex =
      '1000';

    button.style.width =
      '32px';

    button.style.height =
      '32px';

    button.style.minWidth =
      '32px';

    button.style.minHeight =
      '32px';

    button.style.padding =
      '0';

    button.style.margin =
      '0';

    button.style.border =
      '0';

    button.style.borderRadius =
      '50%';

    button.style.background =
      'rgba(0,0,0,.8)';

    button.style.color =
      '#fff';

    button.style.fontSize =
      '22px';

    button.style.fontWeight =
      '700';

    button.style.lineHeight =
      '32px';

    button.style.cursor =
      'pointer';

    button.style.display =
      'flex';

    button.style.alignItems =
      'center';

    button.style.justifyContent =
      'center';


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
     IMAGE PREVIEW
  ======================================================= */

  function fixImagePreview() {

    const preview =
      get('imagePreview');

    if (!preview) {
      return;
    }


    const hasImage =
      (
        Array.isArray(
          GENZ.upload.images
        ) &&
        GENZ.upload.images.length > 0
      ) ||
      Boolean(
        GENZ.upload.imageData
      ) ||
      Boolean(
        GENZ.state.imageData
      );


    if (!hasImage) {
      return;
    }


    preview.classList.remove(
      'hidden'
    );

    preview.style.display =
      '';


    const parent =
      preview.parentElement;

    if (
      parent &&
      getComputedStyle(parent)
        .position === 'static'
    ) {

      parent.style.position =
        'relative';

    }


    if (
      !preview.querySelector(
        '[data-genz-remove="image"]'
      )
    ) {

      const button =
        createRemoveButton(
          'Hapus reference image',
          removeImage
        );

      button.dataset.genzRemove =
        'image';

      preview.style.position =
        'relative';

      preview.appendChild(
        button
      );

    }

  }


  /* =======================================================
     VIDEO PREVIEW
  ======================================================= */

  function fixVideoPreview() {

    const preview =
      get('videoPreview');

    if (!preview) {
      return;
    }


    const hasVideo =
      (
        Array.isArray(
          GENZ.upload.videoFiles
        ) &&
        GENZ.upload.videoFiles.length > 0
      ) ||
      Boolean(
        GENZ.upload.videoData
      ) ||
      Boolean(
        GENZ.state.videoData
      );


    if (!hasVideo) {
      return;
    }


    preview.classList.remove(
      'hidden'
    );

    preview.style.display =
      '';


    preview.style.position =
      'relative';


    if (
      !preview.querySelector(
        '[data-genz-remove="video"]'
      )
    ) {

      const button =
        createRemoveButton(
          'Hapus reference video',
          removeVideo
        );

      button.dataset.genzRemove =
        'video';

      preview.appendChild(
        button
      );

    }

  }


  /* =======================================================
     PROVIDER PLACEHOLDER
  ======================================================= */

  function fixProviderPlaceholder() {

    const provider =
      get('provider');

    if (!provider) {
      return;
    }


    const first =
      provider.options &&
      provider.options.length
        ? provider.options[0]
        : null;


    if (
      first &&
      String(
        first.value || ''
      ) === ''
    ) {

      first.disabled =
        true;

      first.hidden =
        false;

    }

  }


  /* =======================================================
     GENERATE BUTTON
  ======================================================= */

  function fixGenerateButton() {

    const button =
      get('generateBtn');

    if (!button) {
      return;
    }


    button.style.width =
      '220px';

    button.style.minWidth =
      '220px';

    button.style.maxWidth =
      '220px';

    button.style.height =
      '48px';

    button.style.minHeight =
      '48px';

    button.style.borderRadius =
      '999px';

    button.style.background =
      '#198754';

    button.style.color =
      '#fff';

    button.style.border =
      '0';

    button.style.fontWeight =
      '700';

    button.style.cursor =
      button.disabled
        ? 'not-allowed'
        : 'pointer';

    button.style.opacity =
      button.disabled
        ? '.55'
        : '1';

  }


  /* =======================================================
     REFRESH
  ======================================================= */

  function refresh() {

    fixGeneratorCapabilities();

    fixImagePreview();

    fixVideoPreview();

    fixProviderPlaceholder();

    fixGenerateButton();

  }


  function scheduleRefresh() {

    if (
      refreshFrame !== null
    ) {

      return;

    }


    refreshFrame =
      window.requestAnimationFrame(
        function () {

          refreshFrame =
            null;

          refresh();

        }
      );

  }


  /* =======================================================
     CHANGE EVENTS
  ======================================================= */

  document.addEventListener(
    'change',
    function (event) {

      const target =
        event.target;

      if (!target) {
        return;
      }


      if (
        target.id ===
        'provider' ||
        target.id ===
        'model' ||
        target.id ===
        'duration' ||
        target.id ===
        'ratio' ||
        target.id ===
        'resolution'
      ) {

        scheduleRefresh();

      }

    },
    true
  );


  /* =======================================================
     DOM OBSERVER
  ======================================================= */

  function observeGenerator() {

    if (
      typeof MutationObserver !==
      'function'
    ) {

      return;

    }


    const root =
      document.body;

    if (!root) {
      return;
    }


    const observer =
      new MutationObserver(
        function (mutations) {

          let relevant =
            false;


          for (
            const mutation of mutations
          ) {

            if (
              mutation.type ===
              'childList'
            ) {

              relevant =
                true;

              break;

            }

          }


          if (relevant) {
            scheduleRefresh();
          }

        }
      );


    observer.observe(
      root,
      {
        childList: true,
        subtree: true
      }
    );

  }


  /* =======================================================
     INIT
  ======================================================= */

  function init() {

    refresh();

    observeGenerator();

    setTimeout(
      scheduleRefresh,
      100
    );

    setTimeout(
      scheduleRefresh,
      500
    );

    setTimeout(
      scheduleRefresh,
      1200
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
