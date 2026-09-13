/* =========================================================
   GEN-Z.AI
   DYNAMIC PROVIDER UI

   File:
   public/js/providers.js

   Arsitektur:
   - Provider berasal dari backend/database
   - Adapter ditentukan oleh backend
   - Capability berasal dari adapter
   - Tidak ada daftar provider hard-coded
   - Tidak ada API key di browser
   - Tidak ada aturan khusus Veo/MiniMax/Luma di UI
   - Provider baru cukup memiliki adapter + capability
   - UI otomatis mengikuti capability provider
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
    )
      .trim();

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


  /* =======================================================
     CAPABILITY SOURCE
  =======================================================

     Capability TIDAK lagi disimpan di frontend.

     Sumber utama:

       provider.capabilities

     Fallback hanya membaca property provider langsung
     jika backend mengirim format tersebut.

     Tidak ada fallback provider-specific.
  ======================================================= */

  function normalizeCapabilities(provider) {

    if (!provider) {

      return {
        models: [],
        durations: [],
        aspects: [],
        resolutions: []
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


    return {

      models:
        cloneArray(models),

      durations:
        cloneArray(durations),

      aspects:
        cloneArray(aspects),

      resolutions:
        cloneArray(resolutions)

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
  =======================================================

     Semua aturan kombinasi provider sekarang harus
     berasal dari adapter/backend.

     UI hanya menggunakan capability yang diberikan.

     Tidak ada:
       - if veo
       - if minimax
       - if luma
       - model khusus
       - resolution khusus
       - duration khusus
  ======================================================= */

  function getEffectiveCapabilities(provider) {

    return normalizeCapabilities(
      provider
    );

  }


  /* =======================================================
     NORMALIZE PROVIDER LIST
  ======================================================= */

  function normalizeProviderList(list) {

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


          const capabilities =
            normalizeCapabilities(
              provider
            );


          return {

            ...provider,

            id,

            name,

            capabilities

          };

        }
      );

  }


  /* =======================================================
     PROVIDER DROPDOWN
  ======================================================= */

  function renderProviderSelect(providers) {

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
     OPTION HELPERS
  ======================================================= */

  function setOptions(id, values) {

    const element =
      $(id);


    if (!element) {

      return;

    }


    const list =
      Array.isArray(values)
        ? values
        : [];


    const previous =
      text(
        element.value
      );


    element.innerHTML =
      '';


    if (
      !list.length
    ) {

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


      return;

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


    const normalizedPrevious =
      String(previous);


    const exists =
      list.some(
        value =>
          String(value) ===
          normalizedPrevious
      );


    if (exists) {

      element.value =
        normalizedPrevious;

    }

  }


  function setValue(id, value) {

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
     SAFE DURATION SELECTION
  ======================================================= */

  function ensureValidDuration(provider) {

    const duration =
      $('duration');


    if (!duration) {

      return;

    }


    const capabilities =
      getEffectiveCapabilities(
        provider
      );


    const allowed =
      capabilities.durations.map(
        value =>
          String(value)
      );


    if (
      !allowed.length
    ) {

      duration.value =
        '';

      return;

    }


    const current =
      String(
        duration.value || ''
      );


    if (
      !allowed.includes(
        current
      )
    ) {

      duration.value =
        allowed[0];

    }

  }


  /* =======================================================
     SAFE RESOLUTION SELECTION
  ======================================================= */

  function ensureValidResolution(provider) {

    const resolution =
      $('resolution');


    if (!resolution) {

      return;

    }


    const capabilities =
      getEffectiveCapabilities(
        provider
      );


    const allowed =
      capabilities.resolutions.map(
        value =>
          String(value)
      );


    if (
      !allowed.length
    ) {

      resolution.value =
        '';

      return;

    }


    const current =
      String(
        resolution.value || ''
      );


    if (
      !allowed.includes(
        current
      )
    ) {

      resolution.value =
        allowed[0];

    }

  }


  /* =======================================================
     SAFE MODEL SELECTION
  ======================================================= */

  function ensureValidModel(provider) {

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


    if (
      !allowed.length
    ) {

      model.value =
        '';

      return;

    }


    const current =
      String(
        model.value || ''
      );


    if (
      !allowed.includes(
        current
      )
    ) {

      model.value =
        allowed[0];

    }

  }


  /* =======================================================
     SAFE ASPECT SELECTION
  ======================================================= */

  function ensureValidAspect(provider) {

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


        if (
          !allowed.length
        ) {

          element.value =
            '';

          return;

        }


        const current =
          String(
            element.value || ''
          );


        if (
          !allowed.includes(
            current
          )
        ) {

          element.value =
            allowed[0];

        }

      }
    );

  }


  /* =======================================================
     UPDATE GENERATE BUTTON
  ======================================================= */

  function updateGenerateButton(provider) {

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


    const name =
      provider.name ||
      provider.id ||
      'Provider';


    button.textContent =
      `Generate Video • ${name}`;


    button.disabled =
      false;

  }


  /* =======================================================
     UPDATE IMAGE AVAILABILITY
  ======================================================= */

  function updateImageAvailability() {

    const imageInput =
      $('image');


    if (!imageInput) {

      return;

    }


    /*
     * Provider menentukan sendiri apakah image reference
     * didukung melalui adapter.
     *
     * UI tidak lagi memblokir image input berdasarkan
     * nama provider.
     */

    imageInput.disabled =
      false;

  }


  /* =======================================================
     ACTIVE BUTTON
  ======================================================= */

  function updateActiveButton(providerId) {

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
  =======================================================

     Tidak ada lagi hard-coded model compatibility.

     Adapter/backend bertanggung jawab terhadap validasi
     kombinasi model, image, duration, resolution, dll.

     Browser hanya memastikan pilihan masih berada dalam
     capability yang diterima.
  ======================================================= */

  function updateModelCompatibility(provider) {

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


        option.title =
          available
            ? ''
            : 'Model tidak tersedia untuk provider ini.';

      }
    );


    ensureValidModel(
      provider
    );

  }


  /* =======================================================
     UPDATE PROVIDER UI
  ======================================================= */

  function updateProviderUI(provider) {

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
      'duration',
      capabilities.durations
    );


    setOptions(
      'ratio',
      capabilities.aspects
    );


    setOptions(
      'aspect',
      capabilities.aspects
    );


    setOptions(
      'resolution',
      capabilities.resolutions
    );


    GENZ.state.provider =
      provider.id;


    GENZ.providers.current =
      provider.id;


    GENZ.providers.currentProvider =
      provider;


    ensureValidModel(
      provider
    );


    ensureValidAspect(
      provider
    );


    ensureValidResolution(
      provider
    );


    ensureValidDuration(
      provider
    );


    updateGenerateButton(
      provider
    );


    updateImageAvailability();


    updateActiveButton(
      provider.id
    );


    updateModelCompatibility(
      provider
    );


    dispatchProviderChange(
      provider
    );

  }


  /* =======================================================
     DISPATCH PROVIDER EVENT
  ======================================================= */

  function dispatchProviderChange(provider) {

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
     REFRESH CURRENT OPTIONS
  ======================================================= */

  function refreshCurrentOptions() {

    const provider =
      GENZ.providers.currentProvider;


    if (!provider) {

      return;

    }


    /*
     * Jangan menerapkan aturan provider-specific
     * di browser.
     *
     * Capability sudah berasal dari adapter.
     */

    const capabilities =
      getEffectiveCapabilities(
        provider
      );


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


    setOptions(
      'model',
      capabilities.models
    );


    setOptions(
      'duration',
      capabilities.durations
    );


    setOptions(
      'resolution',
      capabilities.resolutions
    );


    setOptions(
      'ratio',
      capabilities.aspects
    );


    setOptions(
      'aspect',
      capabilities.aspects
    );


    if (
      capabilities.models.some(
        value =>
          String(value) ===
          currentModel
      )
    ) {

      setValue(
        'model',
        currentModel
      );

    }


    if (
      capabilities.durations.some(
        value =>
          String(value) ===
          currentDuration
      )
    ) {

      setValue(
        'duration',
        currentDuration
      );

    }


    if (
      capabilities.resolutions.some(
        value =>
          String(value) ===
          currentResolution
      )
    ) {

      setValue(
        'resolution',
        currentResolution
      );

    }


    if (
      capabilities.aspects.some(
        value =>
          String(value) ===
          currentAspect
      )
    ) {

      setValue(
        'aspect',
        currentAspect
      );


      setValue(
        'ratio',
        currentAspect
      );

    }


    ensureValidModel(
      provider
    );


    ensureValidAspect(
      provider
    );


    ensureValidResolution(
      provider
    );


    ensureValidDuration(
      provider
    );


    updateModelCompatibility(
      provider
    );

  }


  /* =======================================================
     PROVIDER BUTTONS
  ======================================================= */

  function renderButtons(providers) {

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
     FIND PROVIDER
  ======================================================= */

  function findProvider(providerId) {

    const providers =
      GENZ.providers.list ||
      [];


    const normalized =
      normalizeId(
        providerId
      );


    return (
      providers.find(
        provider => {

          return (
            normalizeId(
              provider.id
            ) ===
            normalized
          );

        }
      ) ||
      null
    );

  }


  /* =======================================================
     SELECT PROVIDER
  ======================================================= */

  function selectProvider(providerId) {

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


    return provider;

  }


  /* =======================================================
     LOAD PROVIDER DATA
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
          ) ===
          requested
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
     FIELD CHANGE LISTENERS
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


        if (
          target.id === 'resolution' ||
          target.id === 'model' ||
          target.id === 'duration' ||
          target.id === 'ratio' ||
          target.id === 'aspect' ||
          target.id === 'image'
        ) {

          refreshCurrentOptions();

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
