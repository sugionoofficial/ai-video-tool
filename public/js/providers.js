/* =========================================================
   GEN-Z.AI
   DYNAMIC PROVIDER UI

   File:
   public/js/providers.js

   Fungsi:
   - Memuat provider dari backend
   - Tidak menyimpan API key
   - Tidak menentukan adapter
   - Tidak hardcode provider instance
   - Menampilkan provider aktif dari database
   - Mengambil capability dari backend bila tersedia
========================================================= */

(function () {

  'use strict';

  window.GENZ = window.GENZ || {};

  const GENZ = window.GENZ;

  GENZ.state = GENZ.state || {};
  GENZ.videoProviders = GENZ.videoProviders || {};

  /* =======================================================
     DEFAULT CAPABILITIES
     
     Dipakai sebagai fallback apabila backend belum
     mengirim capability provider.
  ======================================================= */

  const FALLBACK = {

    veo: {
      name: 'Gemini / Veo',

      models: [
        'veo-3.1-fast-generate-preview',
        'veo-3.1-generate-preview',
        'veo-3.1-lite-generate-preview'
      ],

      durations: [
        4,
        6,
        8
      ],

      aspects: [
        '16:9',
        '9:16'
      ],

      resolutions: [
        '720p',
        '1080p',
        '4k'
      ]
    },

    minimax: {
      name: 'MiniMax',

      models: [
        'MiniMax-Hailuo-2.3',
        'MiniMax-Hailuo-2.3-Fast',
        'MiniMax-Hailuo-02'
      ],

      durations: [
        6,
        10
      ],

      aspects: [
        '16:9',
        '9:16'
      ],

      resolutions: [
        '512P',
        '768P',
        '1080P'
      ]
    },

    luma: {
      name: 'Luma',

      models: [
        'ray-2',
        'ray-flash-2'
      ],

      durations: [
        '5s',
        '9s'
      ],

      aspects: [
        '1:1',
        '16:9',
        '9:16',
        '4:3',
        '3:4',
        '21:9',
        '9:21'
      ],

      resolutions: [
        '720p',
        '1080p',
        '4k'
      ]
    }

  };

  /* =======================================================
     HELPERS
  ======================================================= */

  function get(id) {
    return document.getElementById(id);
  }

  function normalizeText(value) {

    return String(value || '')
      .trim()
      .toLowerCase();

  }

  function normalizeProviderId(value) {

    return normalizeText(value)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

  }

  /* =======================================================
     PROVIDER TYPE DETECTION
     
     Hanya untuk mengetahui capability fallback.
     Adapter generation tetap ditentukan Worker.
  ======================================================= */

  function detectType(provider) {

    const values = [

      provider?.adapter,

      provider?.id,

      provider?.name

    ];

    const text =
      values
        .filter(Boolean)
        .map(normalizeText)
        .join(' ');

    if (
      text.includes('gemini') ||
      text.includes('veo')
    ) {
      return 'veo';
    }

    if (
      text.includes('minimax') ||
      text.includes('mini max')
    ) {
      return 'minimax';
    }

    if (
      text.includes('luma')
    ) {
      return 'luma';
    }

    return null;
  }

  /* =======================================================
     CAPABILITY NORMALIZER
  ======================================================= */

  function normalizeCapabilities(
    provider
  ) {

    const type =
      detectType(provider);

    const fallback =
      type
        ? FALLBACK[type]
        : null;

    const source =
      provider?.capabilities ||
      provider?.config?.capabilities ||
      {};

    return {

      name:
        provider?.name ||
        fallback?.name ||
        provider?.id ||
        'Provider',

      models:
        Array.isArray(source.models) &&
        source.models.length
          ? source.models
          : (
              Array.isArray(provider?.models) &&
              provider.models.length
                ? provider.models
                : (
                    fallback?.models || []
                  )
            ),

      durations:
        Array.isArray(source.durations) &&
        source.durations.length
          ? source.durations
          : (
              Array.isArray(provider?.durations) &&
              provider.durations.length
                ? provider.durations
                : (
                    fallback?.durations || []
                  )
            ),

      aspects:
        Array.isArray(source.aspects) &&
        source.aspects.length
          ? source.aspects
          : (
              Array.isArray(provider?.aspects) &&
              provider.aspects.length
                ? provider.aspects
                : (
                    fallback?.aspects || []
                  )
            ),

      resolutions:
        Array.isArray(source.resolutions) &&
        source.resolutions.length
          ? source.resolutions
          : (
              Array.isArray(provider?.resolutions) &&
              provider.resolutions.length
                ? provider.resolutions
                : (
                    fallback?.resolutions || []
                  )
            )

    };

  }

  /* =======================================================
     PROVIDER COLLECTION
  ======================================================= */

  function normalizeProviderList(
    providers
  ) {

    if (!Array.isArray(providers)) {
      return [];
    }

    return providers
      .filter(provider => {

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

      })
      .map(provider => {

        const id =
          String(
            provider.id ||
            provider.name ||
            ''
          ).trim();

        const capabilities =
          normalizeCapabilities(
            provider
          );

        return {

          ...provider,

          id,

          name:
            provider.name ||
            capabilities.name,

          capabilities

        };

      });

  }

  /* =======================================================
     OPTIONS
  ======================================================= */

  function setOptions(
    id,
    values
  ) {

    const element =
      get(id);

    if (!element) {
      return;
    }

    const current =
      String(
        element.value || ''
      );

    element.innerHTML = '';

    (
      Array.isArray(values)
        ? values
        : []
    ).forEach(value => {

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

    });

    if (
      current &&
      values
        .map(value => String(value))
        .includes(current)
    ) {

      element.value =
        current;

    }

  }

  function setValue(
    id,
    value
  ) {

    const element =
      get(id);

    if (element) {
      element.value =
        String(value ?? '');
    }

  }

  /* =======================================================
     GENERATE BUTTON
  ======================================================= */

  function updateGenerateButton(
    provider
  ) {

    const button =
      get('generateVideo') ||
      get('generateBtn');

    if (!button) {
      return;
    }

    const config =
      provider?.capabilities;

    const name =
      provider?.name ||
      config?.name ||
      provider?.id ||
      'Provider';

    button.textContent =
      `Generate Video • ${name}`;

  }

  /* =======================================================
     IMAGE INPUT
  ======================================================= */

  function updateImageAvailability(
    provider
  ) {

    const imageInput =
      get('image');

    if (!imageInput) {
      return;
    }

    /*
      Jangan mengunci upload berdasarkan nama provider.

      Validasi final dilakukan di provider adapter.
    */

    imageInput.disabled =
      false;

  }

  /* =======================================================
     PROVIDER UI
  ======================================================= */

  function updateProviderUI(
    provider
  ) {

    if (!provider) {
      return;
    }

    const capabilities =
      provider.capabilities ||
      normalizeCapabilities(
        provider
      );

    /*
      Provider ID database.
    */

    setValue(
      'provider',
      provider.id
    );

    /*
      Model.
    */

    setOptions(
      'model',
      capabilities.models
    );

    /*
      Duration.
    */

    setOptions(
      'duration',
      capabilities.durations
    );

    /*
      Ratio.
    */

    setOptions(
      'ratio',
      capabilities.aspects
    );

    /*
      Compatibility dengan UI lama.
    */

    setOptions(
      'aspect',
      capabilities.aspects
    );

    /*
      Resolution.
    */

    setOptions(
      'resolution',
      capabilities.resolutions
    );

    /*
      State.
    */

    GENZ.state.provider =
      provider.id;

    GENZ.providers =
      GENZ.providers || {};

    GENZ.providers.current =
      provider.id;

    GENZ.providers.currentProvider =
      provider;

    /*
      Button.
    */

    updateGenerateButton(
      provider
    );

    /*
      Image.
    */

    updateImageAvailability(
      provider
    );

    /*
      Active state.
    */

    updateActiveButton(
      provider.id
    );

    /*
      Event.
    */

    document.dispatchEvent(
      new CustomEvent(
        'genz-provider-change',
        {
          detail: {
            provider,
            id: provider.id,
            name: provider.name,
            adapter: provider.adapter || null,
            capabilities
          }
        }
      )
    );

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
      .forEach(button => {

        button.classList.toggle(
          'active',
          String(
            button.dataset.provider
          ) ===
          String(providerId)
        );

      });

  }

  /* =======================================================
     RENDER PROVIDER BUTTONS
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
      container.dataset.listenerAttached ===
      'true'
    ) {
      return;
    }

    container.dataset.listenerAttached =
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

        const providerId =
          button.dataset.provider;

        selectProvider(
          providerId
        );

      }
    );

  }

  /* =======================================================
     PROVIDER LOOKUP
  ======================================================= */

  function findProvider(
    providerId
  ) {

    const providers =
      GENZ.providers?.list ||
      [];

    const normalized =
      normalizeProviderId(
        providerId
      );

    return providers.find(
      provider => {

        return (
          normalizeProviderId(
            provider.id
          ) ===
          normalized
        );

      }
    ) || null;

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

    return provider;

  }

  /* =======================================================
     LOAD PROVIDERS FROM BACKEND
     
     Endpoint utama:
       GET /api/providers

     Fallback:
       GET /api/admin/providers
     
     Fallback kedua:
       provider yang sudah ada di state.
  ======================================================= */

  async function fetchProviderData() {

    /*
      Endpoint publik.
    */

    try {

      const response =
        await fetch(
          '/api/providers',
          {
            method: 'GET',
            credentials: 'include',
            headers: {
              Accept:
                'application/json'
            }
          }
        );

      if (response.ok) {

        const data =
          await response.json();

        if (
          Array.isArray(
            data?.providers
          )
        ) {
          return data.providers;
        }

      }

    } catch (error) {

      console.warn(
        '[GEN-Z.AI] Public provider endpoint error:',
        error
      );

    }

    /*
      Endpoint admin.
      Dipakai hanya sebagai fallback.
    */

    try {

      const token =
        GENZ.auth &&
        typeof GENZ.auth.token ===
        'function'
          ? await GENZ.auth.token()
          : null;

      const headers = {
        Accept:
          'application/json'
      };

      if (token) {
        headers.Authorization =
          `Bearer ${token}`;
      }

      const response =
        await fetch(
          '/api/admin/providers',
          {
            method: 'GET',
            credentials: 'include',
            headers
          }
        );

      if (response.ok) {

        const data =
          await response.json();

        if (
          Array.isArray(
            data?.providers
          )
        ) {
          return data.providers;
        }

      }

    } catch (error) {

      console.warn(
        '[GEN-Z.AI] Admin provider endpoint error:',
        error
      );

    }

    return [];

  }

  /* =======================================================
     LOAD PROVIDERS
  ======================================================= */

  async function loadProviders() {

    const rawProviders =
      await fetchProviderData();

    let providers =
      normalizeProviderList(
        rawProviders
      );

    /*
      Jika backend belum mempunyai
      endpoint public provider,
      jangan langsung membuat provider
      palsu di database.

      Fallback hanya untuk menjaga UI
      tetap dapat digunakan ketika backend
      belum mengirim data.
    */

    if (!providers.length) {

      providers =
        Object.entries(
          FALLBACK
        ).map(
          ([id, config]) => {

            return {
              id,

              name:
                config.name,

              enabled:
                true,

              adapter:
                id,

              capabilities:
                config

            };

          }
        );

    }

    /*
      Simpan list provider.
    */

    GENZ.providers =
      GENZ.providers || {};

    GENZ.providers.list =
      providers;

    /*
      Render button.
    */

    renderButtons(
      providers
    );

    /*
      Tentukan provider aktif.
    */

    const requested =
      GENZ.state.provider ||
      get('provider')?.value ||
      '';

    let selected =
      providers.find(
        provider =>
          String(provider.id) ===
          String(requested)
      );

    /*
      Kalau provider lama tidak ditemukan,
      pilih provider pertama yang aktif.
    */

    if (!selected) {
      selected =
        providers[0] ||
        null;
    }

    if (selected) {

      updateProviderUI(
        selected
      );

    }

    /*
      Beri tahu komponen lain.
    */

    document.dispatchEvent(
      new CustomEvent(
        'genz-providers-loaded',
        {
          detail: {
            providers,
            current:
              selected?.id ||
              null
          }
        }
      )
    );

    return providers;

  }

  /* =======================================================
     PUBLIC API
  ======================================================= */

  GENZ.videoProviders = {

    fallback:
      FALLBACK,

    list:
      GENZ.providers?.list ||
      [],

    current:
      GENZ.state.provider ||
      null,

    load:
      loadProviders,

    loadProviders,

    select:
      selectProvider,

    selectProvider,

    find:
      findProvider,

    normalize:
      normalizeProviderList,

    detectType,

    normalizeCapabilities

  };

  GENZ.providers =
    GENZ.providers || {};

  GENZ.providers.config =
    FALLBACK;

  GENZ.providers.load =
    loadProviders;

  GENZ.providers.loadProviders =
    loadProviders;

  GENZ.providers.select =
    selectProvider;

  GENZ.providers.selectProvider =
    selectProvider;

  /*
    Compatibility global functions.
  */

  window.selectProvider =
    selectProvider;

  window.loadProviders =
    loadProviders;

  /* =======================================================
     INITIALIZE
  ======================================================= */

  function initialize() {

    loadProviders()
      .catch(error => {

        console.error(
          '[GEN-Z.AI] Provider initialization error:',
          error
        );

      });

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
