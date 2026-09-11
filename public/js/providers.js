/* =========================================================
   GEN-Z.AI
   DYNAMIC PROVIDER UI

   File:
   public/js/providers.js

   Prinsip:
   - Provider berasal dari database/backend
   - Tidak ada provider instance palsu
   - Tidak ada API key di browser
   - Worker menentukan adapter
   - Fallback hanya untuk capability
   - Provider disabled tidak ditampilkan
   ========================================================= */

(function () {

  'use strict';

  window.GENZ = window.GENZ || {};

  const GENZ = window.GENZ;

  GENZ.state = GENZ.state || {};
  GENZ.providers = GENZ.providers || {};
  GENZ.videoProviders =
    GENZ.videoProviders || {};

  /* =======================================================
     CAPABILITY FALLBACK

     Ini BUKAN daftar provider.
     Hanya digunakan jika backend belum
     mengirim capability.
  ======================================================= */

  const CAPABILITY_FALLBACK = {

    veo: {

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

  function $(id) {
    return document.getElementById(id);
  }

  function text(value) {

    return String(
      value || ''
    )
      .trim()
      .toLowerCase();

  }

  function normalizeId(value) {

    return text(value)
      .replace(
        /[^a-z0-9]+/g,
        '-'
      )
      .replace(
        /^-+|-+$/g,
        '');

  }

  /* =======================================================
     DETECT ADAPTER TYPE

     Hanya untuk capability fallback.
  ======================================================= */

  function detectType(provider) {

    if (!provider) {
      return null;
    }

    const values = [

      provider.adapter,

      provider.id,

      provider.name

    ];

    const value = values
      .filter(Boolean)
      .map(text)
      .join(' ');

    if (
      value.includes('gemini') ||
      value.includes('veo')
    ) {

      return 'veo';

    }

    if (
      value.includes('minimax') ||
      value.includes('mini max')
    ) {

      return 'minimax';

    }

    if (
      value.includes('luma')
    ) {

      return 'luma';

    }

    return null;

  }

  /* =======================================================
     NORMALIZE CAPABILITIES
  ======================================================= */

  function normalizeCapabilities(
    provider
  ) {

    const type =
      detectType(provider);

    const fallback =
      type
        ? CAPABILITY_FALLBACK[type]
        : null;

    const source =
      provider?.capabilities ||
      provider?.config?.capabilities ||
      {};

    const models =
      Array.isArray(
        source.models
      ) &&
      source.models.length

        ? source.models

        : (
            Array.isArray(
              provider?.models
            ) &&
            provider.models.length

              ? provider.models

              : (
                  fallback?.models ||
                  []
                )
          );

    const durations =
      Array.isArray(
        source.durations
      ) &&
      source.durations.length

        ? source.durations

        : (
            Array.isArray(
              provider?.durations
            ) &&
            provider.durations.length

              ? provider.durations

              : (
                  fallback?.durations ||
                  []
                )
          );

    const aspects =
      Array.isArray(
        source.aspects
      ) &&
      source.aspects.length

        ? source.aspects

        : (
            Array.isArray(
              provider?.aspects
            ) &&
            provider.aspects.length

              ? provider.aspects

              : (
                  fallback?.aspects ||
                  []
                )
          );

    const resolutions =
      Array.isArray(
        source.resolutions
      ) &&
      source.resolutions.length

        ? source.resolutions

        : (
            Array.isArray(
              provider?.resolutions
            ) &&
            provider.resolutions.length

              ? provider.resolutions

              : (
                  fallback?.resolutions ||
                  []
                )
          );

    return {

      models,

      durations,

      aspects,

      resolutions

    };

  }

  /* =======================================================
     NORMALIZE PROVIDER LIST
  ======================================================= */

  function normalizeProviderList(
    list
  ) {

    if (!Array.isArray(list)) {
      return [];
    }

    return list

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

        const name =
          String(
            provider.name ||
            id
          ).trim();

        return {

          ...provider,

          id,

          name,

          capabilities:
            normalizeCapabilities(
              provider
            )

        };

      });

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
      String(
        element.value || ''
      ).trim();

    element.innerHTML = '';

    const placeholder =
      document.createElement(
        'option'
      );

    placeholder.value = '';

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
     DOM OPTION HELPERS
  ======================================================= */

  function setOptions(
    id,
    values
  ) {

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
      String(
        element.value || ''
      );

    element.innerHTML = '';

    if (!list.length) {

      const option =
        document.createElement(
          'option'
        );

      option.value = '';

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

    if (
      previous &&
      list
        .map(
          value =>
            String(value)
        )
        .includes(
          previous
        )
    ) {

      element.value =
        previous;

    }

  }

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
     IMAGE INPUT
  ======================================================= */

  function updateImageAvailability() {

    const imageInput =
      $('image');

    if (!imageInput) {
      return;
    }

    /*
      Validasi final dilakukan
      oleh adapter backend.
    */

    imageInput.disabled =
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
     UPDATE PROVIDER UI
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
      Provider dropdown
    */

    setValue(
      'provider',
      provider.id
    );

    /*
      Model
    */

    setOptions(
      'model',
      capabilities.models
    );

    /*
      Durasi
    */

    setOptions(
      'duration',
      capabilities.durations
    );

    /*
      Rasio
    */

    setOptions(
      'ratio',
      capabilities.aspects
    );

    setOptions(
      'aspect',
      capabilities.aspects
    );

    /*
      Resolusi
    */

    setOptions(
      'resolution',
      capabilities.resolutions
    );

    /*
      State
    */

    GENZ.state.provider =
      provider.id;

    GENZ.providers.current =
      provider.id;

    GENZ.providers.currentProvider =
      provider;

    /*
      Tombol
    */

    updateGenerateButton(
      provider
    );

    updateImageAvailability();

    updateActiveButton(
      provider.id
    );

    /*
      Event
    */

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

    /*
      Sinkronkan dropdown.
    */

    renderProviderSelect(
      providers
    );

    /*
      Sinkronkan tombol provider.
    */

    renderButtons(
      providers
    );

    /*
      Provider sebelumnya.
    */

    const requested =
      String(
        GENZ.state.provider ||
        $('provider')?.value ||
        ''
      ).trim();

    let selected =
      providers.find(
        provider =>
          String(
            provider.id
          ) === requested
      );

    /*
      Jika provider sebelumnya
      sudah tidak tersedia,
      gunakan provider aktif pertama.
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

    await loadProviders();

    /*
      Generator component bisa dimuat
      secara dinamis setelah file JS ini
      sudah dieksekusi.

      Karena itu kita cek ulang DOM
      setelah halaman siap.
    */

    setTimeout(
      () => {

        bindProviderSelect();

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
