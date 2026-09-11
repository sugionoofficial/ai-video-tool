(function () {
  'use strict';

  window.GENZ = window.GENZ || {};
  GENZ.state = GENZ.state || {};
  GENZ.videoProviders = GENZ.videoProviders || {};

  const CONFIG = {

    veo: {
      name: 'Gemini / Veo',

      models: [
        'veo-3.1-fast-generate-preview',
        'veo-3.1-generate-preview',
        'veo-3.1-lite-generate-preview'
      ],

      durations: [4, 6, 8],

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

      durations: [6, 10],

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

  function get(id) {
    return document.getElementById(id);
  }

  function setOptions(id, values) {

    const element = get(id);

    if (!element) {
      return;
    }

    element.innerHTML = '';

    values.forEach(value => {

      const option =
        document.createElement('option');

      option.value = value;
      option.textContent = value;

      element.appendChild(option);

    });
  }

  function setValue(id, value) {

    const element = get(id);

    if (element) {
      element.value = value;
    }
  }

  function updateGenerateButton(provider) {

    const button =
      get('generateVideo') ||
      get('generateBtn');

    if (!button) {
      return;
    }

    const config = CONFIG[provider];

    button.textContent =
      'Generate Video • ' +
      config.name;
  }

  function updateImageAvailability(provider) {

    const imageInput = get('image');

    if (!imageInput) {
      return;
    }

    /*
     * Semua provider tetap menggunakan
     * input gambar yang sama.
     *
     * Validasi khusus provider dilakukan
     * oleh file provider masing-masing.
     */

    imageInput.disabled = false;
  }

  function updateProviderUI(provider) {

    const config = CONFIG[provider];

    if (!config) {
      return;
    }

    /*
     * Provider
     */
    setValue(
      'provider',
      provider
    );

    /*
     * Model
     */
    setOptions(
      'model',
      config.models
    );

    /*
     * Durasi
     */
    setOptions(
      'duration',
      config.durations
    );

    /*
     * Ratio.
     *
     * generator.html menggunakan #ratio,
     * bukan #aspect.
     */
    setOptions(
      'ratio',
      config.aspects
    );

    /*
     * Kompatibilitas apabila nanti
     * #aspect ditambahkan.
     */
    setOptions(
      'aspect',
      config.aspects
    );

    /*
     * Resolusi
     */
    setOptions(
      'resolution',
      config.resolutions
    );

    /*
     * Simpan provider aktif.
     */
    GENZ.state.provider =
      provider;

    GENZ.providers =
      GENZ.providers || {};

    GENZ.providers.current =
      provider;

    updateGenerateButton(
      provider
    );

    updateImageAvailability(
      provider
    );

    updateActiveButton(
      provider
    );

    /*
     * Beri event agar komponen lain
     * dapat mengetahui provider berubah.
     */
    document.dispatchEvent(
      new CustomEvent(
        'genz-provider-change',
        {
          detail: {
            provider,
            config
          }
        }
      )
    );
  }

  function updateActiveButton(provider) {

    document
      .querySelectorAll(
        '[data-providers] [data-provider]'
      )
      .forEach(button => {

        button.classList.toggle(
          'active',
          button.dataset.provider === provider
        );

      });
  }

  function renderButtons() {

    const container =
      document.querySelector(
        '[data-providers]'
      );

    if (!container) {
      return;
    }

    container.innerHTML = '';

    Object.entries(CONFIG)
      .forEach(
        ([provider, config]) => {

          const button =
            document.createElement(
              'button'
            );

          button.type = 'button';

          button.className =
            'provider-button';

          button.dataset.provider =
            provider;

          button.textContent =
            config.name;

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

        updateProviderUI(
          button.dataset.provider
        );

      }
    );
  }

  function selectProvider(provider) {

    if (!CONFIG[provider]) {

      console.warn(
        'GEN-Z.AI: provider tidak dikenal:',
        provider
      );

      provider = 'veo';
    }

    updateProviderUI(
      provider
    );

    return CONFIG[provider];
  }

  async function loadProviders() {

    renderButtons();

    const current =
      GENZ.state.provider ||
      get('provider')?.value ||
      'veo';

    const provider =
      CONFIG[current]
        ? current
        : 'veo';

    selectProvider(
      provider
    );

    return CONFIG;
  }

  GENZ.providers = {

    config: CONFIG,

    current:
      GENZ.state.provider ||
      'veo',

    selectProvider,

    loadProviders

  };

  window.selectProvider =
    selectProvider;

  window.loadProviders =
    loadProviders;

})();
