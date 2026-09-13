/* =========================================================
   GEN-Z.AI
   DYNAMIC PROVIDER UI

   File:
   public/js/providers.js

   Arsitektur:
   Provider
      ↓
   Model
      ↓
   Reference Image
      ↓
   Duration
      ↕
   Resolution

   Semua aturan kombinasi berasal dari:
   provider.capabilities.constraints

   Sinkronisasi UI bersifat realtime.
   Tidak membutuhkan refresh halaman.
   ========================================================= */

(function () {

  'use strict';


  /* =======================================================
     GLOBAL
  ======================================================= */

  window.GENZ =
    window.GENZ || {};

  const GENZ =
    window.GENZ;

  GENZ.state =
    GENZ.state || {};

  GENZ.providers =
    GENZ.providers || {};

  GENZ.videoProviders =
    GENZ.videoProviders || {};


  /* =======================================================
     HELPERS
  ======================================================= */

  function $(id) {

    return document.getElementById(id);

  }


  function text(value) {

    return String(
      value ?? ''
    ).trim();

  }


  function normalizeId(value) {

    return text(value)
      .toLowerCase()
      .replace(
        /[^a-z0-9_-]+/g,
        '-'
      )
      .replace(
        /^[-_]+|[-_]+$/g,
        '');

  }


  function cloneArray(value) {

    return Array.isArray(value)
      ? [...value]
      : [];

  }


  function uniqueArray(value) {

    return [
      ...new Set(
        cloneArray(value)
          .map(
            item => String(item)
          )
      )
    ];

  }


  function scheduleRefresh(
    changedField = ''
  ) {

    refreshCurrentOptions(
      changedField
    );

    if (
      typeof queueMicrotask ===
      'function'
    ) {

      queueMicrotask(
        () => {

          refreshCurrentOptions(
            changedField
          );

        }
      );

    }

    setTimeout(
      () => {

        refreshCurrentOptions(
          changedField
        );

      },
      0
    );

  }


  /* =======================================================
     CAPABILITY SOURCE
  ======================================================= */

  function normalizeCapabilities(
    provider
  ) {

    if (!provider) {

      return {

        models: [],

        durations: [],

        aspects: [],

        resolutions: [],

        constraints: {}

      };

    }


    const source =
      provider.capabilities &&
      typeof provider.capabilities ===
      'object'

        ? provider.capabilities

        : (
            provider.config?.capabilities &&
            typeof provider.config.capabilities ===
            'object'

              ? provider.config.capabilities

              : {}
          );


    const models =
      Array.isArray(
        source.models
      )

        ? source.models

        : (
            Array.isArray(
              provider.models
            )

              ? provider.models

              : []
          );


    const durations =
      Array.isArray(
        source.durations
      )

        ? source.durations

        : (
            Array.isArray(
              provider.durations
            )

              ? provider.durations

              : []
          );


    const aspects =
      Array.isArray(
        source.aspects
      )

        ? source.aspects

        : (
            Array.isArray(
              provider.aspects
            )

              ? provider.aspects

              : []
          );


    const resolutions =
      Array.isArray(
        source.resolutions
      )

        ? source.resolutions

        : (
            Array.isArray(
              provider.resolutions
            )

              ? provider.resolutions

              : []
          );


    const constraints =
      source.constraints &&
      typeof source.constraints ===
      'object'

        ? source.constraints

        : {};


    return {

      models:
        cloneArray(
          models
        ),

      durations:
        cloneArray(
          durations
        ),

      aspects:
        cloneArray(
          aspects
        ),

      resolutions:
        cloneArray(
          resolutions
        ),

      constraints

    };

  }


  function getEffectiveCapabilities(
    provider
  ) {

    return normalizeCapabilities(
      provider
    );

  }


  /* =======================================================
     IMAGE REFERENCE DETECTION
  ======================================================= */

  function hasImageReference() {

    if (
      GENZ.state &&
      GENZ.state.imageData
    ) {

      return true;

    }


    if (
      GENZ.upload &&
      GENZ.upload.imageData
    ) {

      return true;

    }


    const input =
      $('image');


    if (
      input &&
      input.files &&
      input.files.length
    ) {

      return true;

    }


    return false;

  }


  /* =======================================================
     CLEAR IMAGE REFERENCE
  ======================================================= */

  function clearImageReference() {

    if (
      GENZ.state
    ) {

      GENZ.state.imageData =
        null;

    }


    if (
      GENZ.upload
    ) {

      GENZ.upload.imageData =
        null;

    }


    const imageInput =
      $('image');


    if (imageInput) {

      try {

        imageInput.value =
          '';

      } catch {

        /* ignore */

      }

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
        'none';

    }


    const fileStatus =
      $('imageFileStatus');


    if (fileStatus) {

      fileStatus.textContent =
        'Tidak ada file dipilih';

    }


    if (
      GENZ.upload &&
      typeof GENZ.upload.clear ===
      'function'
    ) {

      try {

        GENZ.upload.clear();

      } catch {

        /* ignore */

      }

    }

  }


  /* =======================================================
     MODEL RULES
  ======================================================= */

  function getModelRules(
    provider,
    model
  ) {

    const capabilities =
      getEffectiveCapabilities(
        provider
      );


    const constraints =
      capabilities.constraints || {};


    return (
      constraints[model] ||
      null
    );

  }


  /* =======================================================
     MODEL IMAGE CAPABILITY
  ======================================================= */

  function modelSupportsImage(
    provider,
    model
  ) {

    const rules =
      getModelRules(
        provider,
        model
      );


    /*
     * Tidak ada rule model.
     *
     * Provider lama tetap dianggap
     * mendukung image agar kompatibel.
     */

    if (!rules) {

      return true;

    }


    /*
     * Capability eksplisit memiliki
     * prioritas paling tinggi.
     */

    if (
      typeof rules.imageReferenceSupported ===
      'boolean'
    ) {

      return rules.imageReferenceSupported;

    }


    /*
     * =====================================================
     * AUTO-DETECT DARI TYPE MODEL
     * =====================================================
     *
     * ChinaAPI saat ini mendefinisikan:
     *
     * t2v       = Text To Video
     * i2v       = Image To Video
     * r2v       = Reference To Video
     * videoedit = Video Editing
     *
     * Jadi kita tidak bergantung pada flag
     * imageReferenceSupported yang mungkin belum
     * tersedia pada model lama.
     */

    const type =
      text(
        rules.type
      ).toLowerCase();


    /*
     * Text To Video
     * tidak menggunakan reference image.
     */

    if (
      type === 't2v' ||
      type === 'text-to-video' ||
      type === 'text2video'
    ) {

      return false;

    }


    /*
     * Video editing menggunakan video,
     * bukan reference image biasa.
     */

    if (
      type === 'videoedit' ||
      type === 'video-edit' ||
      type === 'v2v' ||
      type === 'video-to-video'
    ) {

      return false;

    }


    /*
     * Image To Video.
     */

    if (
      type === 'i2v' ||
      type === 'image-to-video' ||
      type === 'image2video'
    ) {

      return true;

    }


    /*
     * Reference To Video.
     */

    if (
      type === 'r2v' ||
      type === 'reference-to-video' ||
      type === 'reference2video'
    ) {

      return true;

    }


    /*
     * Model yang secara eksplisit
     * membutuhkan image otomatis
     * mendukung image.
     */

    if (
      rules.requiresImage === true
    ) {

      return true;

    }


    /*
     * Provider lama yang belum
     * mendefinisikan type tetap
     * menggunakan perilaku legacy.
     */

    return true;

  }


  /* =======================================================
     MODE RULES
  ======================================================= */

  function getModeRules(
    provider,
    model,
    hasImage
  ) {

    const rules =
      getModelRules(
        provider,
        model
      );


    if (!rules) {

      return null;

    }


    /*
     * Jangan memakai imageToVideo jika
     * model tidak mendukung image.
     */

    const imageSupported =
      modelSupportsImage(
        provider,
        model
      );


    if (
      hasImage &&
      imageSupported
    ) {

      return (
        rules.imageToVideo ||
        null
      );

    }


    return (
      rules.textToVideo ||
      null
    );

  }


  /* =======================================================
     ALLOWED DURATIONS
  ======================================================= */

  function getAllowedDurations(
    provider,
    model,
    hasImage
  ) {

    const capabilities =
      getEffectiveCapabilities(
        provider
      );


    const modeRules =
      getModeRules(
        provider,
        model,
        hasImage
      );


    if (!modeRules) {

      return cloneArray(
        capabilities.durations
      );

    }


    const values =
      Object.keys(
        modeRules
      )
        .map(
          value =>
            Number(value)
        )
        .filter(
          value =>
            Number.isFinite(value)
        );


    return uniqueArray(
      values
    );

  }


  /* =======================================================
     ALLOWED RESOLUTIONS
  ======================================================= */

  function getAllowedResolutions(
    provider,
    model,
    duration,
    hasImage
  ) {

    const capabilities =
      getEffectiveCapabilities(
        provider
      );


    const modeRules =
      getModeRules(
        provider,
        model,
        hasImage
      );


    if (!modeRules) {

      return cloneArray(
        capabilities.resolutions
      );

    }


    const key =
      String(
        Number(duration)
      );


    const allowed =
      modeRules[key];


    if (
      !Array.isArray(
        allowed
      )
    ) {

      return [];

    }


    return uniqueArray(
      allowed
    );

  }


  /* =======================================================
     SET OPTIONS
  ======================================================= */

  function setOptions(
    id,
    values,
    preferredValue = ''
  ) {

    const element =
      $(id);


    if (!element) {

      return '';

    }


    const list =
      uniqueArray(
        values
      );


    const previous =
      text(
        preferredValue ||
        element.value
      );


    element.innerHTML =
      '';


    if (!list.length) {

      const option =
        document.createElement(
          'option'
        );


      option.value =
        '';

      option.textContent =
        'Tidak tersedia';


      element.appendChild(
        option
      );


      return '';

    }


    list.forEach(
      value => {

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
      list.includes(
        previous
      )
    ) {

      element.value =
        previous;

      return previous;

    }


    element.value =
      list[0];


    return list[0];

  }


  /* =======================================================
     SET VALUE
  ======================================================= */

  function setValue(
    id,
    value
  ) {

    const element =
      $(id);


    if (!element) {

      return;

    }


    element.value =
      String(
        value ?? ''
      );

  }


  /* =======================================================
     VALID MODEL
  ======================================================= */

  function ensureValidModel(
    provider
  ) {

    const model =
      $('model');


    if (!model) {

      return '';

    }


    const capabilities =
      getEffectiveCapabilities(
        provider
      );


    const allowed =
      capabilities.models.map(
        value =>
          String(value)
      );


    if (!allowed.length) {

      model.value =
        '';

      return '';

    }


    const current =
      text(
        model.value
      );


    if (
      allowed.includes(
        current
      )
    ) {

      return current;

    }


    model.value =
      allowed[0];


    return allowed[0];

  }


  /* =======================================================
     VALID ASPECT
  ======================================================= */

  function ensureValidAspect(
    provider
  ) {

    const capabilities =
      getEffectiveCapabilities(
        provider
      );


    const allowed =
      capabilities.aspects.map(
        value =>
          String(value)
      );


    [
      $('ratio'),
      $('aspect')
    ].forEach(
      element => {

        if (!element) {

          return;

        }


        if (!allowed.length) {

          element.value =
            '';

          return;

        }


        if (
          allowed.includes(
            text(
              element.value
            )
          )
        ) {

          return;

        }


        element.value =
          allowed[0];

      }
    );

  }


  /* =======================================================
     FIND REFERENCE IMAGE GROUP
  ======================================================= */

  function findReferenceImageGroup(
    imageInput
  ) {

    if (!imageInput) {

      return null;

    }


    /*
     * Struktur utama GEN-Z.AI:
     *
     * .reference-group
     */

    const directGroup =
      imageInput.closest(
        '.reference-group'
      );


    if (directGroup) {

      return directGroup;

    }


    /*
     * Fallback apabila komponen upload
     * dibuat ulang oleh frontend.
     */

    const preview =
      $('imagePreview');


    if (preview) {

      const previewGroup =
        preview.closest(
          '.reference-group'
        );


      if (previewGroup) {

        return previewGroup;

      }

    }


    /*
     * Fallback berdasarkan label
     * input image.
     */

    const label =
      document.querySelector(
        'label[for="image"]'
      );


    if (label) {

      const labelGroup =
        label.closest(
          '.reference-group'
        );


      if (labelGroup) {

        return labelGroup;

      }

    }


    return null;

  }


  /* =======================================================
     UPDATE IMAGE AVAILABILITY
  ======================================================= */

  function updateImageAvailability(
    provider
  ) {

    const imageInput =
      $('image');


    if (!imageInput) {

      return;

    }


    const model =
      text(
        $('model')?.value
      );


    const imageGroup =
      findReferenceImageGroup(
        imageInput
      );


    /*
     * Model belum dipilih.
     */

    if (!model) {

      imageInput.disabled =
        false;


      if (imageGroup) {

        imageGroup.classList.remove(
          'hidden'
        );

        imageGroup.style.display =
          '';

        imageGroup.removeAttribute(
          'aria-hidden'
        );

      }

      return;

    }


    const supported =
      modelSupportsImage(
        provider,
        model
      );


    /*
     * =====================================================
     * MODEL TIDAK MENDUKUNG REFERENCE IMAGE
     * =====================================================
     */

    if (!supported) {

      /*
       * Sembunyikan seluruh group.
       */

      if (imageGroup) {

        imageGroup.classList.add(
          'hidden'
        );

        imageGroup.style.display =
          'none';

        imageGroup.setAttribute(
          'aria-hidden',
          'true'
        );

      }


      /*
       * Disable input sebagai
       * lapisan pengaman kedua.
       */

      imageInput.disabled =
        true;


      imageInput.setAttribute(
        'aria-disabled',
        'true'
      );


      /*
       * Bersihkan image lama.
       */

      clearImageReference();


      return;

    }


    /*
     * =====================================================
     * MODEL MENDUKUNG REFERENCE IMAGE
     * =====================================================
     */

    if (imageGroup) {

      imageGroup.classList.remove(
        'hidden'
      );

      imageGroup.style.display =
        '';

      imageGroup.removeAttribute(
        'aria-hidden'
      );

    }


    imageInput.disabled =
      false;


    imageInput.removeAttribute(
      'aria-disabled'
    );

  }


  /* =======================================================
     APPLY MODEL RULES
  ======================================================= */

  function applyModelRules(
    provider
  ) {

    const model =
      ensureValidModel(
        provider
      );


    if (!model) {

      return '';

    }


    const imageSupported =
      modelSupportsImage(
        provider,
        model
      );


    /*
     * Model berubah ke model
     * yang tidak mendukung image.
     */

    if (!imageSupported) {

      clearImageReference();

    }


    /*
     * Sinkronkan tampilan.
     */

    updateImageAvailability(
      provider
    );


    return model;

  }


  /* =======================================================
     APPLY DURATION RULES
  ======================================================= */

  function applyDurationRules(
    provider,
    preferredDuration
  ) {

    const model =
      text(
        $('model')?.value
      );


    if (!model) {

      return '';

    }


    const allowed =
      getAllowedDurations(
        provider,
        model,
        hasImageReference()
      );


    if (!allowed.length) {

      setOptions(
        'duration',
        []
      );

      return '';

    }


    return setOptions(
      'duration',
      allowed,
      preferredDuration
    );

  }


  /* =======================================================
     APPLY RESOLUTION RULES
  ======================================================= */

  function applyResolutionRules(
    provider,
    preferredResolution
  ) {

    const model =
      text(
        $('model')?.value
      );


    if (!model) {

      return '';

    }


    const duration =
      Number(
        $('duration')?.value
      );


    if (
      !Number.isFinite(
        duration
      )
    ) {

      setOptions(
        'resolution',
        []
      );

      return '';

    }


    const allowed =
      getAllowedResolutions(
        provider,
        model,
        duration,
        hasImageReference()
      );


    if (!allowed.length) {

      setOptions(
        'resolution',
        []
      );

      return '';

    }


    return setOptions(
      'resolution',
      allowed,
      preferredResolution
    );

  }


  /* =======================================================
     FULL REALTIME SYNCHRONIZATION
  ======================================================= */

  function refreshCurrentOptions(
    changedField = ''
  ) {

    const provider =
      GENZ.providers.currentProvider;


    if (!provider) {

      return;

    }


    const previousModel =
      text(
        $('model')?.value
      );


    const previousDuration =
      text(
        $('duration')?.value
      );


    const previousResolution =
      text(
        $('resolution')?.value
      );


    const previousRatio =
      text(
        $('ratio')?.value
      );


    const previousAspect =
      text(
        $('aspect')?.value
      );


    /*
     * MODEL
     */

    setOptions(
      'model',
      getEffectiveCapabilities(
        provider
      ).models,
      previousModel
    );


    const model =
      applyModelRules(
        provider
      );


    if (!model) {

      return;

    }


    /*
     * IMAGE
     */

    updateImageAvailability(
      provider
    );


    /*
     * ASPECT / RATIO
     */

    const aspects =
      getEffectiveCapabilities(
        provider
      ).aspects;


    setOptions(
      'ratio',
      aspects,
      previousRatio
    );


    setOptions(
      'aspect',
      aspects,
      previousAspect
    );


    ensureValidAspect(
      provider
    );


    /*
     * Ambil image state terbaru.
     */

    const hasImage =
      hasImageReference();


    /*
     * DURASI
     */

    let duration =
      applyDurationRules(
        provider,
        previousDuration
      );


    if (
      changedField === 'image' &&
      hasImage
    ) {

      duration =
        applyDurationRules(
          provider,
          '8'
        );

    }


    if (!duration) {

      duration =
        text(
          $('duration')?.value
        );

    }


    /*
     * RESOLUTION
     */

    let resolution =
      applyResolutionRules(
        provider,
        previousResolution
      );


    if (!resolution) {

      resolution =
        applyResolutionRules(
          provider
        );

    }


    /*
     * Resolution → Duration
     */

    if (
      changedField ===
      'resolution'
    ) {

      const selectedResolution =
        text(
          $('resolution')?.value
        );


      const allowedDurations =
        getAllowedDurations(
          provider,
          model,
          hasImageReference()
        );


      const compatibleDuration =
        allowedDurations.find(
          value => {

            const resolutions =
              getAllowedResolutions(
                provider,
                model,
                value,
                hasImageReference()
              );


            return resolutions.includes(
              selectedResolution
            );

          }
        );


      if (
        compatibleDuration !==
        undefined
      ) {

        duration =
          setOptions(
            'duration',
            allowedDurations,
            compatibleDuration
          );

      }

    }


    /*
     * Hitung ulang resolution.
     */

    resolution =
      applyResolutionRules(
        provider,
        text(
          $('resolution')?.value
        )
      );


    /*
     * IMAGE FINAL SYNC
     */

    updateImageAvailability(
      provider
    );


    /*
     * MODEL OPTIONS
     */

    const modelElement =
      $('model');


    if (modelElement) {

      const rules =
        getModelRules(
          provider,
          text(
            modelElement.value
          )
        );


      Array.from(
        modelElement.options
      ).forEach(
        option => {

          option.disabled =
            false;

          if (
            rules &&
            option.value
          ) {

            option.disabled =
              !getEffectiveCapabilities(
                provider
              ).models.includes(
                option.value
              );

          }

        }
      );

    }


    /*
     * STATE
     */

    GENZ.state.provider =
      provider.id;

    GENZ.state.model =
      text(
        $('model')?.value
      );

    GENZ.state.duration =
      Number(
        $('duration')?.value
      );

    GENZ.state.resolution =
      text(
        $('resolution')?.value
      );

    GENZ.state.aspect =
      text(
        $('aspect')?.value ||
        $('ratio')?.value
      );

  }


  /* =======================================================
     UPDATE PROVIDER UI
  ======================================================= */

  function updateProviderUI(
    provider
  ) {

    if (!provider) {

      return;

    }


    GENZ.state.provider =
      provider.id;

    GENZ.providers.current =
      provider.id;

    GENZ.providers.currentProvider =
      provider;


    setValue(
      'provider',
      provider.id
    );


    refreshCurrentOptions(
      'provider'
    );


    updateGenerateButton(
      provider
    );


    updateActiveButton(
      provider.id
    );

  }


  /* =======================================================
     DISPATCH PROVIDER EVENT
  ======================================================= */

  function dispatchProviderChange(
    provider
  ) {

    const capabilities =
      getEffectiveCapabilities(
        provider
      );


    document.dispatchEvent(
      new CustomEvent(
        'genz-provider-change',
        {

          detail: {

            provider,

            id:
              provider.id,

            name:
              provider.name,

            adapter:
              provider.adapter ||
              null,

            capabilities

          }

        }
      )
    );

  }


  /* =======================================================
     PROVIDER BUTTONS
  ======================================================= */

  function renderButtons(
    providers
  ) {

    const container =
      document.querySelector(
        '[data-providers]'
      );


    if (!container) {

      return;

    }


    container.innerHTML =
      '';


    providers.forEach(
      provider => {

        const button =
          document.createElement(
            'button'
          );


        button.type =
          'button';

        button.className =
          'provider-button';

        button.dataset.provider =
          provider.id;

        button.textContent =
          provider.name ||
          provider.id;


        container.appendChild(
          button
        );

      }
    );


    if (
      container.dataset
        .listenerAttached ===
      'true'
    ) {

      return;

    }


    container.dataset
      .listenerAttached =
      'true';


    container.addEventListener(
      'click',
      event => {

        const button =
          event.target.closest(
            '[data-provider]'
          );


        if (!button) {

          return;

        }


        selectProvider(
          button.dataset.provider
        );

      }
    );

  }


  /* =======================================================
     PROVIDER DROPDOWN
  ======================================================= */

  function renderProviderSelect(
    providers
  ) {

    const element =
      $('provider');


    if (!element) {

      return;

    }


    const previous =
      text(
        element.value
      );


    element.innerHTML =
      '';


    const placeholder =
      document.createElement(
        'option'
      );


    placeholder.value =
      '';


    placeholder.textContent =
      providers.length
        ? 'Pilih AI Engine'
        : 'Tidak ada AI Engine';


    element.appendChild(
      placeholder
    );


    providers.forEach(
      provider => {

        const option =
          document.createElement(
            'option'
          );


        option.value =
          provider.id;

        option.textContent =
          provider.name ||
          provider.id;


        element.appendChild(
          option
        );

      }
    );


    if (
      previous &&
      providers.some(
        provider =>
          String(
            provider.id
          ) === previous
      )
    ) {

      element.value =
        previous;

    }

  }


  /* =======================================================
     NORMALIZE PROVIDER LIST
  ======================================================= */

  function normalizeProviderList(
    list
  ) {

    if (
      !Array.isArray(list)
    ) {

      return [];

    }


    return list

      .filter(
        provider => {

          if (!provider) {

            return false;

          }


          if (
            provider.enabled === false
          ) {

            return false;

          }


          return Boolean(
            provider.id ||
            provider.name
          );

        }
      )

      .map(
        provider => {

          const id =
            text(
              provider.id ||
              provider.name
            );


          const name =
            text(
              provider.name ||
              id
            );


          return {

            ...provider,

            id,

            name,

            capabilities:
              normalizeCapabilities(
                provider
              )

          };

        }
      );

  }


  /* =======================================================
     FIND PROVIDER
  ======================================================= */

  function findProvider(
    providerId
  ) {

    const providers =
      GENZ.providers.list ||
      [];


    const normalized =
      normalizeId(
        providerId
      );


    return (
      providers.find(
        provider =>
          normalizeId(
            provider.id
          ) === normalized
      ) ||
      null
    );

  }


  /* =======================================================
     SELECT PROVIDER
  ======================================================= */

  function selectProvider(
    providerId
  ) {

    const provider =
      findProvider(
        providerId
      );


    if (!provider) {

      console.warn(
        '[GEN-Z.AI] Provider tidak ditemukan:',
        providerId
      );


      return null;

    }


    updateProviderUI(
      provider
    );


    dispatchProviderChange(
      provider
    );


    scheduleRefresh(
      'provider'
    );


    return provider;

  }


  /* =======================================================
     FETCH PROVIDERS
  ======================================================= */

  async function fetchProviderData() {

    try {

      const response =
        await fetch(
          '/api/providers',
          {

            method:
              'GET',

            credentials:
              'include',

            headers: {

              Accept:
                'application/json'

            }

          }
        );


      if (!response.ok) {

        throw new Error(
          `HTTP ${response.status}`
        );

      }


      const data =
        await response.json();


      if (
        !Array.isArray(
          data?.providers
        )
      ) {

        throw new Error(
          'Format response provider tidak valid.'
        );

      }


      return data.providers;

    } catch (error) {

      console.error(
        '[GEN-Z.AI] Gagal mengambil provider:',
        error
      );


      return [];

    }

  }


  /* =======================================================
     LOAD PROVIDERS
  ======================================================= */

  async function loadProviders() {

    const rawProviders =
      await fetchProviderData();


    const providers =
      normalizeProviderList(
        rawProviders
      );


    GENZ.providers.list =
      providers;

    GENZ.videoProviders.list =
      providers;


    renderProviderSelect(
      providers
    );

    renderButtons(
      providers
    );


    const requested =
      text(
        GENZ.state.provider ||
        $('provider')?.value
      );


    let selected =
      providers.find(
        provider =>
          String(
            provider.id
          ) === requested
      );


    if (!selected) {

      selected =
        providers[0] ||
        null;

    }


    if (selected) {

      updateProviderUI(
        selected
      );


      dispatchProviderChange(
        selected
      );


      scheduleRefresh(
        'provider'
      );

    } else {

      GENZ.state.provider =
        null;

      GENZ.providers.current =
        null;

      GENZ.providers.currentProvider =
        null;


      setValue(
        'provider',
        ''
      );


      setOptions(
        'model',
        []
      );


      setOptions(
        'duration',
        []
      );


      setOptions(
        'ratio',
        []
      );


      setOptions(
        'aspect',
        []
      );


      setOptions(
        'resolution',
        []
      );


      updateGenerateButton(
        null
      );


      document.dispatchEvent(
        new CustomEvent(
          'genz-provider-empty'
        )
      );

    }


    document.dispatchEvent(
      new CustomEvent(
        'genz-providers-loaded',
        {

          detail: {

            providers,

            count:
              providers.length

          }

        }
      )
    );


    return providers;

  }


  /* =======================================================
     PROVIDER SELECT CHANGE
  ======================================================= */

  function bindProviderSelect() {

    const element =
      $('provider');


    if (!element) {

      return;

    }


    if (
      element.dataset
        .providerListenerAttached ===
      'true'
    ) {

      return;

    }


    element.dataset
      .providerListenerAttached =
      'true';


    element.addEventListener(
      'change',
      () => {

        const providerId =
          element.value;


        if (!providerId) {

          GENZ.state.provider =
            null;

          GENZ.providers.current =
            null;

          GENZ.providers.currentProvider =
            null;


          updateGenerateButton(
            null
          );


          return;

        }


        selectProvider(
          providerId
        );

      }
    );

  }


  /* =======================================================
     REALTIME CAPABILITY LISTENERS
  ======================================================= */

  function bindCapabilityListeners() {

    if (
      document.documentElement
        .dataset
        .providerCapabilityListenersAttached ===
      'true'
    ) {

      return;

    }


    document.documentElement
      .dataset
      .providerCapabilityListenersAttached =
      'true';


    document.addEventListener(
      'change',
      event => {

        const target =
          event.target;


        if (!target) {

          return;

        }


        const supportedFields = [

          'model',

          'duration',

          'resolution',

          'ratio',

          'aspect',

          'image'

        ];


        if (
          supportedFields.includes(
            target.id
          )
        ) {

          scheduleRefresh(
            target.id
          );

        }

      },
      true
    );


    document.addEventListener(
      'input',
      event => {

        const target =
          event.target;


        if (
          target &&
          target.id ===
          'image'
        ) {

          scheduleRefresh(
            'image'
          );

        }

      },
      true
    );


    [
      'genz-image-change',
      'genz-upload-change',
      'genz-image-upload',
      'genz-upload-complete',
      'genz-image-removed'
    ].forEach(
      eventName => {

        document.addEventListener(
          eventName,
          () => {

            scheduleRefresh(
              'image'
            );

          }
        );

      }
    );

  }


  /* =======================================================
     PUBLIC API
  ======================================================= */

  GENZ.providers.load =
    loadProviders;


  GENZ.providers.reload =
    loadProviders;


  GENZ.providers.select =
    selectProvider;


  GENZ.providers.find =
    findProvider;


  GENZ.providers.getCapabilities =
    function (
      providerId
    ) {

      const provider =
        providerId
          ? findProvider(
              providerId
            )
          : GENZ.providers.currentProvider;


      return getEffectiveCapabilities(
        provider
      );

    };


  GENZ.providers.refresh =
    refreshCurrentOptions;


  GENZ.videoProviders.load =
    loadProviders;


  GENZ.videoProviders.select =
    selectProvider;


  window.selectProvider =
    selectProvider;


  window.loadProviders =
    loadProviders;


  /* =======================================================
     INITIALIZATION
  ======================================================= */

  async function initialize() {

    bindProviderSelect();

    bindCapabilityListeners();


    await loadProviders();


    setTimeout(
      () => {

        bindProviderSelect();

        bindCapabilityListeners();


        if (
          GENZ.providers.list &&
          GENZ.providers.list.length
        ) {

          renderProviderSelect(
            GENZ.providers.list
          );


          renderButtons(
            GENZ.providers.list
          );


          const current =
            findProvider(
              GENZ.state.provider
            );


          if (current) {

            updateProviderUI(
              current
            );


            dispatchProviderChange(
              current
            );


            scheduleRefresh(
              'provider'
            );

          }

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
      initialize,
      {
        once: true
      }
    );

  } else {

    initialize();

  }

})();
