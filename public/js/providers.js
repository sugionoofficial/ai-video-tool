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

   Tidak ada aturan provider-specific di UI.
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
        ''
      );

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
          .map(item => String(item))
      )
    ];

  }


  /* =======================================================
     CAPABILITY SOURCE
  ======================================================= */

  function normalizeCapabilities(provider) {

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
      typeof provider.capabilities === 'object'

        ? provider.capabilities

        : (
            provider.config?.capabilities &&
            typeof provider.config.capabilities === 'object'

              ? provider.config.capabilities

              : {}
          );


    const models =
      Array.isArray(source.models)
        ? source.models
        : (
            Array.isArray(provider.models)
              ? provider.models
              : []
          );


    const durations =
      Array.isArray(source.durations)
        ? source.durations
        : (
            Array.isArray(provider.durations)
              ? provider.durations
              : []
          );


    const aspects =
      Array.isArray(source.aspects)
        ? source.aspects
        : (
            Array.isArray(provider.aspects)
              ? provider.aspects
              : []
          );


    const resolutions =
      Array.isArray(source.resolutions)
        ? source.resolutions
        : (
            Array.isArray(provider.resolutions)
              ? provider.resolutions
              : []
          );


    /*
     * PENTING:
     *
     * constraints sebelumnya hilang di sini.
     *
     * Sekarang constraints diteruskan utuh.
     */

    const constraints =
      source.constraints &&
      typeof source.constraints === 'object'

        ? source.constraints

        : {};


    return {

      models:
        cloneArray(models),

      durations:
        cloneArray(durations),

      aspects:
        cloneArray(aspects),

      resolutions:
        cloneArray(resolutions),

      constraints

    };

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
     EFFECTIVE CAPABILITIES
  ======================================================= */

  function getEffectiveCapabilities(provider) {

    return normalizeCapabilities(
      provider
    );

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
     MODEL IMAGE SUPPORT
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


    if (!rules) {

      return true;

    }


    if (
      typeof rules.imageReferenceSupported ===
      'boolean'
    ) {

      return rules.imageReferenceSupported;

    }


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


    if (hasImage) {

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
        .map(value => Number(value))
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


    if (!Array.isArray(allowed)) {

      return [];

    }


    return uniqueArray(
      allowed
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


    const fields = [

      $('ratio'),

      $('aspect')

    ];


    fields.forEach(
      element => {

        if (!element) {

          return;

        }


        if (!allowed.length) {

          element.value =
            '';

          return;

        }


        const current =
          text(
            element.value
          );


        if (
          allowed.includes(
            current
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


    if (!model) {

      imageInput.disabled =
        false;

      return;

    }


    const supported =
      modelSupportsImage(
        provider,
        model
      );


    imageInput.disabled =
      !supported;


    if (!supported) {

      /*
       * Model yang tidak mendukung
       * reference image tidak boleh
       * membawa image lama.
       */

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


      try {

        imageInput.value =
          '';

      } catch {
        /* ignore */
      }

    }

  }


  /* =======================================================
     UPDATE GENERATE BUTTON
  ======================================================= */

  function updateGenerateButton(
    provider
  ) {

    const button =
      $('generateVideo') ||
      $('generateBtn');


    if (!button) {

      return;

    }


    if (!provider) {

      button.textContent =
        'Generate Video';

      button.disabled =
        true;

      return;

    }


    button.textContent =
      `Generate Video • ${
        provider.name ||
        provider.id ||
        'Provider'
      }`;


    button.disabled =
      false;

  }


  /* =======================================================
     ACTIVE BUTTON
  ======================================================= */

  function updateActiveButton(
    providerId
  ) {

    document
      .querySelectorAll(
        '[data-providers] [data-provider]'
      )
      .forEach(
        button => {

          button.classList.toggle(
            'active',

            String(
              button.dataset.provider
            ) ===
            String(
              providerId
            )

          );

        }
      );

  }


  /* =======================================================
     MODEL COMPATIBILITY
  ======================================================= */

  function updateModelCompatibility(
    provider
  ) {

    const model =
      $('model');


    if (!model) {

      return;

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


    Array.from(
      model.options
    ).forEach(
      option => {

        const available =
          allowed.includes(
            String(
              option.value
            )
          );


        option.disabled =
          !available;

      }
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
     * Jika model tidak mendukung
     * reference image, bersihkan
     * image reference aktif.
     */

    if (
      !imageSupported &&
      hasImageReference()
    ) {

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

    }


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


    const image =
      hasImageReference();


    const allowed =
      getAllowedDurations(
        provider,
        model,
        image
      );


    if (!allowed.length) {

      setOptions(
        'duration',
        []
      );

      return '';

    }


    const preferred =
      text(
        preferredDuration
      );


    /*
     * Jika reference image aktif
     * dan model hanya mengizinkan 8s,
     * otomatis memilih 8s.
     */

    if (
      preferred &&
      allowed.some(
        value =>
          String(value) ===
          preferred
      )
    ) {

      return setOptions(
        'duration',
        allowed,
        preferred
      );

    }


    return setOptions(
      'duration',
      allowed
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

      return '';

    }


    const image =
      hasImageReference();


    const allowed =
      getAllowedResolutions(
        provider,
        model,
        duration,
        image
      );


    if (!allowed.length) {

      setOptions(
        'resolution',
        []
      );

      return '';

    }


    const preferred =
      text(
        preferredResolution
      );


    if (
      preferred &&
      allowed.includes(
        preferred
      )
    ) {

      return setOptions(
        'resolution',
        allowed,
        preferred
      );

    }


    return setOptions(
      'resolution',
      allowed
    );

  }


  /* =======================================================
     REFRESH RULES
  ======================================================= */

  function refreshCurrentOptions(
    changedField = ''
  ) {

    const provider =
      GENZ.providers.currentProvider;


    if (!provider) {

      return;

    }


    const currentModel =
      text(
        $('model')?.value
      );


    const currentDuration =
      text(
        $('duration')?.value
      );


    const currentResolution =
      text(
        $('resolution')?.value
      );


    const currentAspect =
      text(
        $('aspect')?.value ||
        $('ratio')?.value
      );


    /*
     * MODEL
     */

    setOptions(
      'model',
      getEffectiveCapabilities(
        provider
      ).models,
      currentModel
    );


    const model =
      applyModelRules(
        provider
      );


    /*
     * ASPECT
     */

    setOptions(
      'ratio',
      getEffectiveCapabilities(
        provider
      ).aspects,
      currentAspect
    );


    setOptions(
      'aspect',
      getEffectiveCapabilities(
        provider
      ).aspects,
      currentAspect
    );


    ensureValidAspect(
      provider
    );


    /*
     * DURASI
     *
     * Reference image diproses
     * sebelum menentukan resolution.
     */

    const duration =
      applyDurationRules(
        provider,
        currentDuration
      );


    /*
     * RESOLUTION
     *
     * Resolution sekarang dihitung
     * berdasarkan:
     *
     * model
     * + image
     * + duration
     */

    applyResolutionRules(
      provider,
      currentResolution
    );


    /*
     * Jika perubahan resolution
     * memaksa duration menjadi 8s,
     * ulangi sinkronisasi duration.
     */

    if (
      changedField ===
      'resolution'
    ) {

      const resolution =
        text(
          $('resolution')?.value
        );


      const allowedDurations =
        getAllowedDurations(
          provider,
          model,
          hasImageReference()
        );


      /*
       * Jika resolution hanya tersedia
       * pada durasi tertentu, cari durasi
       * yang kompatibel.
       */

      if (
        resolution &&
        allowedDurations.length
      ) {

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
                resolution
              );

            }
          );


        if (
          compatibleDuration !==
          undefined
        ) {

          setOptions(
            'duration',
            allowedDurations,
            compatibleDuration
          );

        }

      }

    }


    /*
     * Setelah duration final,
     * hitung ulang resolution.
     */

    applyResolutionRules(
      provider,
      text(
        $('resolution')?.value
      )
    );


    updateImageAvailability(
      provider
    );


    updateModelCompatibility(
      provider
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


    const capabilities =
      getEffectiveCapabilities(
        provider
      );


    setValue(
      'provider',
      provider.id
    );


    setOptions(
      'model',
      capabilities.models
    );


    setOptions(
      'ratio',
      capabilities.aspects
    );


    setOptions(
      'aspect',
      capabilities.aspects
    );


    GENZ.state.provider =
      provider.id;


    GENZ.providers.current =
      provider.id;


    GENZ.providers.currentProvider =
      provider;


    /*
     * Terapkan model terlebih dahulu.
     */

    applyModelRules(
      provider
    );


    /*
     * Baru duration.
     */

    applyDurationRules(
      provider
    );


    /*
     * Baru resolution.
     */

    applyResolutionRules(
      provider
    );


    ensureValidAspect(
      provider
    );


    updateImageAvailability(
      provider
    );


    updateGenerateButton(
      provider
    );


    updateActiveButton(
      provider.id
    );


    updateModelCompatibility(
      provider
    );


    /*
     * Jalankan satu kali lagi untuk
     * memastikan semua field sinkron.
     */

    refreshCurrentOptions();

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
     CAPABILITY LISTENERS
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

          refreshCurrentOptions(
            target.id
          );

        }

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
    function (providerId) {

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
