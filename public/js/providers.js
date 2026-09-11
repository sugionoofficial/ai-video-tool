/* GEN-Z.AI - Provider UI */

(function () {
  'use strict';

  window.GENZ = window.GENZ || {};

  const CONFIG = {

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

      res: [
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

      res: [
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

      res: [
        '720p',
        '1080p',
        '4k'
      ]
    }

  };

  function setOptions(
    elementId,
    values,
    selected
  ) {

    const element =
      document.getElementById(elementId);

    if (!element) return;

    element.innerHTML = '';

    values.forEach(value => {

      const option =
        document.createElement('option');

      option.value = value;
      option.textContent = value;

      element.appendChild(option);
    });

    if (
      selected !== undefined &&
      values
        .map(String)
        .includes(String(selected))
    ) {
      element.value = selected;
    }
  }

  function selectProvider(provider) {

    if (!CONFIG[provider]) {
      console.warn(
        'Provider tidak dikenal:',
        provider
      );

      return;
    }

    const config =
      CONFIG[provider];

    const providerElement =
      document.getElementById('provider');

    if (providerElement) {
      providerElement.value = provider;
    }

    setOptions(
      'model',
      config.models
    );

    setOptions(
      'duration',
      config.durations
    );

    setOptions(
      'aspect',
      config.aspects
    );

    /*
     * Compatibility dengan UI lama
     * yang masih memakai #ratio.
     */
    setOptions(
      'ratio',
      config.aspects
    );

    setOptions(
      'resolution',
      config.res
    );

    GENZ.state.provider =
      provider;
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
      .forEach(([key, config]) => {

        const button =
          document.createElement('button');

        button.type = 'button';

        button.dataset.provider =
          key;

        button.textContent =
          config.name;

        container.appendChild(button);
      });

    if (
      container.dataset
        .providerListenerAttached
    ) {
      return;
    }

    container.dataset
      .providerListenerAttached = 'true';

    container.addEventListener(
      'click',
      event => {

        const button =
          event.target.closest(
            '[data-provider]'
          );

        if (!button) return;

        selectProvider(
          button.dataset.provider
        );
      }
    );
  }

  async function loadProviders() {

    renderButtons();

    const current =
      GENZ.state.provider ||
      document.getElementById(
        'provider'
      )?.value ||
      'veo';

    selectProvider(
      CONFIG[current]
        ? current
        : 'veo'
    );

    return CONFIG;
  }

  GENZ.providers = {
    config: CONFIG,
    selectProvider,
    loadProviders
  };

  window.selectProvider =
    selectProvider;

  window.loadProviders =
    loadProviders;

})();
