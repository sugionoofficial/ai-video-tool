/* =========================================================
   GEN-Z.AI
   GENERATOR UI FIX

   File:
   public/js/upload-fix.js

   Fungsi:
   - Memperbaiki Aspect Ratio
   - Memperbaiki Duration
   - Memperbaiki Resolution
   - Menampilkan Reference Image sesuai kemampuan model
   - Menampilkan Reference Video sesuai kemampuan model
   - Menambahkan tombol X pada preview
   - Tidak mengambil alih proses upload
   - Tidak mengganti FileReader
   - Tidak mengintercept input file
   - Tidak menggunakan polling setInterval
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


  function normalize(value) {

    return String(
      value || ''
    )
      .trim()
      .toLowerCase();

  }


  function normalizeProvider(value) {

    return normalize(value)
      .replace(/[_\s]+/g, '-')
      .replace(/-+/g, '-');

  }


  function unique(values) {

    return [
      ...new Set(
        (Array.isArray(values)
          ? values
          : []
        )
          .map(function (value) {

            return String(
              value
            ).trim();

          })
          .filter(Boolean)
      )
    ];

  }


  /* =======================================================
     CURRENT PROVIDER
  ======================================================= */

  function getProvider() {

    const element =
      get('provider');

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

  function getModel() {

    const element =
      get('model');

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
     MODEL TEXT
  ======================================================= */

  function getModelText() {

    const element =
      get('model');

    if (!element) {

      return '';

    }


    const option =
      element.options[
        element.selectedIndex
      ];

    if (!option) {

      return '';

    }


    return String(
      option.textContent ||
      option.label ||
      ''
    ).trim();

  }


  /* =======================================================
     BUILT-IN MODEL CAPABILITIES
     -------------------------------------------------------
     Ini mengikuti konfigurasi model yang ada di repository.
  ======================================================= */

  const MODEL_CAPABILITIES = {

    'agnes-video-2.5-flash': {

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

      aspects: [
        '16:9',
        '9:16',
        '4:3',
        '3:4',
        '1:1',
        '21:9'
      ],

      resolutions: [
        '720P'
      ],

      imageSupported: true,

      maxImages: 5,

      videoSupported: false,

      maxVideos: 0

    },


    'doubao-seedance-2-0-mini-260615': {

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

      aspects: [
        '21:9',
        '16:9',
        '4:3',
        '1:1',
        '3:4',
        '9:16'
      ],

      resolutions: [
        '480P',
        '720P'
      ],

      imageSupported: true,

      maxImages: 9,

      videoSupported: true,

      maxVideos: 3

    }

  };


  /* =======================================================
     GET MODEL CAPABILITY
  ======================================================= */

  function getModelCapabilities() {

    const provider =
      getProvider();

    const model =
      normalize(
        getModel()
      );


    if (
      provider === 'chinaapi'
    ) {

      if (
        MODEL_CAPABILITIES[
          model
        ]
      ) {

        return MODEL_CAPABILITIES[
          model
        ];

      }


      const modelText =
        normalize(
          getModelText()
        );


      if (
        modelText.includes(
          'agnes'
        )
      ) {

        return MODEL_CAPABILITIES[
          'agnes-video-2.5-flash'
        ];

      }


      if (
        modelText.includes(
          'doubao'
        ) ||
        modelText.includes(
          'seedance'
        )
      ) {

        return MODEL_CAPABILITIES[
          'doubao-seedance-2-0-mini-260615'
        ];

      }

    }


    /*
     * Coba ambil capability dari
     * registry yang tersedia jika provider
     * lain memang mengeksposnya.
     */

    const registry =
      window.GENZ_PROVIDERS;


    if (
      registry &&
      typeof registry.getCapabilities ===
        'function'
    ) {

      try {

        const result =
          registry.getCapabilities(
            provider,
            model
          );


        if (
          result &&
          typeof result === 'object'
        ) {

          return {

            durations:
              unique(
                result.durations
              ),

            aspects:
              unique(
                result.aspects
              ),

            resolutions:
              unique(
                result.resolutions
              ),

            imageSupported:
              Boolean(
                result.imageSupported ||
                result.imageReferenceSupported
              ),

            maxImages:
              Number(
                result.maxImages ||
                result.maxReferenceImages ||
                0
              ),

            videoSupported:
              Boolean(
                result.videoSupported ||
                result.videoReferenceSupported
              ),

            maxVideos:
              Number(
                result.maxVideos ||
                result.maxReferenceVideos ||
                0
              )

          };

        }

      } catch (_) {}

    }


    return {

      durations: [],

      aspects: [],

      resolutions: [],

      imageSupported: false,

      maxImages: 0,

      videoSupported: false,

      maxVideos: 0

    };

  }


  /* =======================================================
     SORT DURATION
  ======================================================= */

  function sortDurations(
    values
  ) {

    return unique(
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
     SELECT OPTIONS
  ======================================================= */

  function currentOptions(
    select
  ) {

    if (!select) {

      return [];

    }


    return Array.from(
      select.options || []
    ).map(
      function (option) {

        return String(
          option.value
        );

      }
    );

  }


  function setOptions(
    select,
    values,
    placeholder
  ) {

    if (
      !select ||
      !Array.isArray(values) ||
      !values.length
    ) {

      return;

    }


    const list =
      values.map(
        function (value) {

          return String(
            value
          );

        }
      );


    const expected = [
      '',
      ...list
    ];


    const existing =
      currentOptions(
        select
      );


    /*
     * Jangan rebuild jika sudah benar.
     * Ini mencegah select berkedip/reset.
     */

    if (
      existing.length ===
      expected.length &&
      existing.every(
        function (value, index) {

          return (
            value ===
            expected[index]
          );

        }
      )
    ) {

      return;

    }


    const previous =
      String(
        select.value || ''
      );


    select.replaceChildren();


    const placeholderOption =
      document.createElement(
        'option'
      );

    placeholderOption.value =
      '';

    placeholderOption.textContent =
      placeholder;

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
          value;

        option.textContent =
          value;

        select.appendChild(
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

      select.value =
        previous;

    }


    select.dispatchEvent(
      new Event(
        'change',
        {
          bubbles: true
        }
      )
    );

  }


  /* =======================================================
     FIX CAPABILITY
  ======================================================= */

  function fixCapabilities() {

    const provider =
      getProvider();

    const model =
      getModel();


    if (
      !provider ||
      !model
    ) {

      return;

    }


    const capabilities =
      getModelCapabilities();


    if (
      !capabilities
    ) {

      return;

    }


    const ratio =
      get('ratio');

    const duration =
      get('duration');

    const resolution =
      get('resolution');


    /*
     * Aspect ratio
     */

    if (
      ratio &&
      capabilities.aspects &&
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
      capabilities.durations &&
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
      capabilities.resolutions &&
      capabilities.resolutions.length
    ) {

      setOptions(
        resolution,
        capabilities.resolutions,
        'Pilih resolusi'
      );

    }


    /*
     * Simpan capability ke state.
     */

    GENZ.state.capabilities =
      GENZ.state.capabilities ||
      {};

    GENZ.state.capabilities.provider =
      provider;

    GENZ.state.capabilities.model =
      model;

    GENZ.state.capabilities.durations =
      capabilities.durations || [];

    GENZ.state.capabilities.aspects =
      capabilities.aspects || [];

    GENZ.state.capabilities.resolutions =
      capabilities.resolutions || [];

  }


  /* =======================================================
     REFERENCE IMAGE UI
  ======================================================= */

  function fixImageReference() {

    const group =
      get('imageReferenceGroup');

    const addTile =
      get('imageAddTile');

    const input =
      get('image');

    const hint =
      get('imageReferenceHint');


    if (!group) {

      return;

    }


    const provider =
      getProvider();

    const model =
      getModel();


    if (
      !provider ||
      !model
    ) {

      return;

    }


    const capabilities =
      getModelCapabilities();


    if (
      capabilities &&
      capabilities.imageSupported
    ) {

      /*
       * Tampilkan seluruh blok reference image.
       */

      group.classList.remove(
        'hidden'
      );

      group.style.display =
        'block';

      group.removeAttribute(
        'aria-hidden'
      );


      /*
       * Tampilkan tile +.
       */

      if (addTile) {

        addTile.style.display =
          'flex';

        addTile.classList.remove(
          'hidden'
        );

      }


      /*
       * Input tetap aktif.
       * Tidak diubah event-nya.
       */

      if (input) {

        input.disabled =
          false;

      }


      /*
       * Update keterangan.
       */

      if (hint) {

        const max =
          Number(
            capabilities.maxImages ||
            0
          );


        if (max > 0) {

          hint.textContent =
            'Maksimal ' +
            max +
            ' reference image.';

        } else {

          hint.textContent =
            'Reference image tersedia.';

        }

      }


      return;

    }


    /*
     * Jika model tidak mendukung image,
     * sembunyikan blok.
     */

    group.classList.add(
      'hidden'
    );

    group.style.display =
      'none';


    if (addTile) {

      addTile.style.display =
        'none';

    }

  }


  /* =======================================================
     REFERENCE VIDEO UI
  ======================================================= */

  function fixVideoReference() {

    const group =
      get('videoReferenceGroup');

    const addTile =
      get('videoAddTile');

    const input =
      get('referenceVideo');

    const hint =
      get('videoReferenceHint');


    if (!group) {

      return;

    }


    const provider =
      getProvider();

    const model =
      getModel();


    if (
      !provider ||
      !model
    ) {

      return;

    }


    const capabilities =
      getModelCapabilities();


    if (
      capabilities &&
      capabilities.videoSupported
    ) {

      group.classList.remove(
        'hidden'
      );

      group.style.display =
        'block';

      group.removeAttribute(
        'aria-hidden'
      );


      if (addTile) {

        addTile.style.display =
          'flex';

        addTile.classList.remove(
          'hidden'
        );

      }


      if (input) {

        input.disabled =
          false;

      }


      if (hint) {

        const max =
          Number(
            capabilities.maxVideos ||
            0
          );


        if (max > 0) {

          hint.textContent =
            'Maksimal ' +
            max +
            ' reference video.';

        } else {

          hint.textContent =
            'Reference video tersedia.';

        }

      }


      return;

    }


    group.classList.add(
      'hidden'
    );

    group.style.display =
      'none';


    if (addTile) {

      addTile.style.display =
        'none';

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

      try {

        input.value =
          '';

      } catch (_) {}

    }


    const preview =
      get('imagePreview');

    if (preview) {

      preview.innerHTML =
        '';

      preview.classList.add(
        'hidden'
      );

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

      try {

        input.value =
          '';

      } catch (_) {}

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
     IMAGE PREVIEW BUTTON
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
      !preview.querySelector(
        '.reference-image-remove-all'
      )
    ) {

      preview.appendChild(
        createRemoveButton(
          'reference-image-remove-all',
          'Hapus reference image',
          removeImage
        )
      );

    }

  }


  /* =======================================================
     VIDEO PREVIEW BUTTON
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
      !preview.querySelector(
        '.reference-video-remove-all'
      )
    ) {

      preview.appendChild(
        createRemoveButton(
          'reference-video-remove-all',
          'Hapus reference video',
          removeVideo
        )
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


    const placeholder =
      Array.from(
        provider.options || []
      ).find(
        function (option) {

          return (
            String(
              option.value || ''
            ) === ''
          );

        }
      );


    if (placeholder) {

      placeholder.disabled =
        true;

    }

  }


  /* =======================================================
     GENERATE BUTTON
  ======================================================= */

  function fixGenerateButton() {

    const buttons =
      document.querySelectorAll(
        '#generateBtn, [data-generate-button]'
      );


    buttons.forEach(
      function (button) {

        button.style.setProperty(
          'width',
          '220px',
          'important'
        );

        button.style.setProperty(
          'min-width',
          '220px',
          'important'
        );

        button.style.setProperty(
          'max-width',
          '220px',
          'important'
        );

        button.style.setProperty(
          'height',
          '48px',
          'important'
        );

        button.style.setProperty(
          'min-height',
          '48px',
          'important'
        );

        button.style.setProperty(
          'max-height',
          '48px',
          'important'
        );

        button.style.setProperty(
          'padding',
          '0 24px',
          'important'
        );

        button.style.setProperty(
          'margin',
          '18px auto 0',
          'important'
        );

        button.style.setProperty(
          'display',
          'block',
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
          '#fff',
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
          'font-weight',
          '700',
          'important'
        );

        button.style.setProperty(
          'cursor',
          button.disabled
            ? 'not-allowed'
            : 'pointer',
          'important'
        );

        button.style.setProperty(
          'opacity',
          button.disabled
            ? '.55'
            : '1',
          'important'
        );

      }
    );

  }


  /* =======================================================
     REFRESH
  ======================================================= */

  function refresh() {

    fixCapabilities();

    fixImageReference();

    fixVideoReference();

    fixImagePreview();

    fixVideoPreview();

    fixProviderPlaceholder();

    fixGenerateButton();

  }


  /* =======================================================
     EVENT LISTENER
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
        target.id === 'provider' ||
        target.id === 'model'
      ) {

        setTimeout(
          refresh,
          0
        );

      }

    },
    true
  );


  /* =======================================================
     MUTATION OBSERVER
  ======================================================= */

  function observe() {

    if (
      typeof MutationObserver !==
      'function'
    ) {

      return;

    }


    const observer =
      new MutationObserver(
        function () {

          refresh();

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


  /* =======================================================
     INIT
  ======================================================= */

  function init() {

    refresh();

    observe();


    setTimeout(
      refresh,
      100
    );


    setTimeout(
      refresh,
      500
    );


    setTimeout(
      refresh,
      1000
    );


    setTimeout(
      refresh,
      2000
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
