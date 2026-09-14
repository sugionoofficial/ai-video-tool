(function () {
  'use strict';

  const state = {
    bound: false,
    providerElement: null,
    modelElement: null,
    updateTimer: null,
    retryTimer: null,
    providers: []
  };

  function get(id) {
    return document.getElementById(id);
  }

  function text(value) {
    return String(value ?? '').trim();
  }

  function normalizeId(value) {
    return text(value).toLowerCase();
  }

  function toNumber(value, fallback) {
    const number = Number(value);

    return Number.isFinite(number)
      ? number
      : fallback;
  }

  function getProviderId() {
    const element = get('provider');

    return element
      ? text(element.value)
      : '';
  }

  function getModelId() {
    const element = get('model');

    return element
      ? text(element.value)
      : '';
  }

  function normalizeProviderList(list) {
    if (!Array.isArray(list)) {
      return [];
    }

    return list.filter(function (provider) {
      return Boolean(
        provider &&
        (
          provider.id ||
          provider.name ||
          provider.slug
        )
      );
    });
  }

  function findProvider(providerId) {
    const normalized = normalizeId(providerId);

    if (!normalized) {
      return null;
    }

    const providers =
      Array.isArray(state.providers)
        ? state.providers
        : [];

    const found = providers.find(function (provider) {
      return normalizeId(
        provider?.id ||
        provider?.provider ||
        provider?.name ||
        provider?.slug
      ) === normalized;
    });

    if (found) {
      return found;
    }

    const genzProviders =
      window.GENZ &&
      window.GENZ.providers;

    const list =
      Array.isArray(genzProviders?.list)
        ? genzProviders.list
        : [];

    return list.find(function (provider) {
      return normalizeId(
        provider?.id ||
        provider?.provider ||
        provider?.name ||
        provider?.slug
      ) === normalized;
    }) || null;
  }

  function getCurrentProvider() {
    const providerId = getProviderId();

    const direct =
      findProvider(providerId);

    if (direct) {
      return direct;
    }

    const providers =
      window.GENZ &&
      window.GENZ.providers;

    if (providers?.currentProvider) {
      return providers.currentProvider;
    }

    if (
      window.GENZ?.state?.currentProvider
    ) {
      return window.GENZ.state.currentProvider;
    }

    return null;
  }

  function getMap(provider, name) {
    if (!provider) {
      return {};
    }

    const config =
      provider.config &&
      typeof provider.config === 'object'
        ? provider.config
        : {};

    const candidates = [
      provider[name],
      config[name]
    ];

    for (const value of candidates) {
      if (
        value &&
        typeof value === 'object' &&
        !Array.isArray(value)
      ) {
        return value;
      }
    }

    return {};
  }

  function findMapValue(map, modelId) {
    if (
      !map ||
      typeof map !== 'object'
    ) {
      return undefined;
    }

    const direct =
      text(modelId);

    if (
      direct &&
      Object.prototype.hasOwnProperty.call(
        map,
        direct
      )
    ) {
      return map[direct];
    }

    const normalized =
      normalizeId(modelId);

    const key =
      Object.keys(map).find(function (item) {
        return (
          normalizeId(item) ===
          normalized
        );
      });

    return key !== undefined
      ? map[key]
      : undefined;
  }

  function getModel(provider, modelId) {
    if (
      !provider ||
      !modelId
    ) {
      return null;
    }

    const sources = [
      provider.models,
      provider.capabilities?.models,
      provider.config?.models,
      provider.config?.capabilities?.models
    ];

    const normalized =
      normalizeId(modelId);

    for (const models of sources) {
      if (!Array.isArray(models)) {
        continue;
      }

      const found =
        models.find(function (model) {
          if (
            model === null ||
            model === undefined
          ) {
            return false;
          }

          if (
            typeof model === 'string' ||
            typeof model === 'number'
          ) {
            return (
              normalizeId(model) ===
              normalized
            );
          }

          return normalizeId(
            model.id ||
            model.model ||
            model.modelId ||
            model.slug ||
            model.name
          ) === normalized;
        });

      if (found) {
        return found;
      }
    }

    return null;
  }

  function getBaseCredit(provider, modelId) {
    /*
     * PENTING:
     * Nilai dari Admin Provider harus menjadi
     * sumber utama.
     *
     * Jangan menggunakan GENZ.state.modelCredit
     * terlebih dahulu karena state tersebut dapat
     * berisi nilai lama/default.
     */

    const modelCredits =
      getMap(
        provider,
        'modelCredits'
      );

    const configured =
      findMapValue(
        modelCredits,
        modelId
      );

    if (
      configured !== undefined &&
      configured !== null &&
      configured !== ''
    ) {
      return Math.max(
        1,
        toNumber(
          configured,
          1
        )
      );
    }

    const model =
      getModel(
        provider,
        modelId
      );

    if (model) {
      const candidates = [
        model.credit,
        model.creditCost,
        model.credits,
        model.cost
      ];

      for (const value of candidates) {
        if (
          value !== undefined &&
          value !== null &&
          value !== ''
        ) {
          return Math.max(
            1,
            toNumber(
              value,
              1
            )
          );
        }
      }
    }

    /*
     * Fallback terakhir hanya jika provider
     * memang belum memiliki konfigurasi credit.
     */
    const stateCredit =
      window.GENZ?.state?.modelCredit;

    if (
      stateCredit !== undefined &&
      stateCredit !== null &&
      stateCredit !== ''
    ) {
      const value =
        toNumber(
          stateCredit,
          0
        );

      if (value > 0) {
        return value;
      }
    }

    return 1;
  }

  function getDiscount(provider, modelId) {
    /*
     * Sama seperti credit:
     * Admin Provider menjadi sumber utama.
     */

    const discounts =
      getMap(
        provider,
        'modelDiscounts'
      );

    const configured =
      findMapValue(
        discounts,
        modelId
      );

    if (
      configured !== undefined &&
      configured !== null &&
      configured !== ''
    ) {
      return Math.min(
        100,
        Math.max(
          0,
          toNumber(
            configured,
            0
          )
        )
      );
    }

    const model =
      getModel(
        provider,
        modelId
      );

    if (model) {
      const candidates = [
        model.discount,
        model.creditDiscount,
        model.discountPercent
      ];

      for (const value of candidates) {
        if (
          value !== undefined &&
          value !== null &&
          value !== ''
        ) {
          return Math.min(
            100,
            Math.max(
              0,
              toNumber(
                value,
                0
              )
            )
          );
        }
      }
    }

    const stateDiscount =
      window.GENZ?.state?.modelDiscount;

    if (
      stateDiscount !== undefined &&
      stateDiscount !== null &&
      stateDiscount !== ''
    ) {
      return Math.min(
        100,
        Math.max(
          0,
          toNumber(
            stateDiscount,
            0
          )
        )
      );
    }

    return 0;
  }

  function calculateFinalCredit(
    baseCredit,
    discount
  ) {
    return Math.max(
      1,
      Math.ceil(
        baseCredit *
        (100 - discount) /
        100
      )
    );
  }

  function formatNumber(value) {
    if (
      Number.isInteger(value)
    ) {
      return String(value);
    }

    return String(
      Number(
        value.toFixed(2)
      )
    );
  }

  function hide() {
    const info =
      get('modelCreditInfo');

    if (!info) {
      return;
    }

    info.style.display =
      'none';
  }

  function show(
    baseCredit,
    discount,
    finalCredit
  ) {
    const info =
      get('modelCreditInfo');

    const base =
      get('modelCreditBase');

    const discountElement =
      get('modelCreditDiscount');

    const final =
      get('modelCreditFinal');

    if (!info) {
      return;
    }

    if (base) {
      base.textContent =
        'Credit normal: ' +
        formatNumber(
          baseCredit
        );
    }

    if (discountElement) {
      discountElement.textContent =
        'Diskon: ' +
        formatNumber(
          discount
        ) +
        '%';

      discountElement.style.setProperty(
        'color',
        '#198754',
        'important'
      );

      discountElement.style.setProperty(
        'font-weight',
        '700',
        'important'
      );

      discountElement.style.setProperty(
        'opacity',
        '1',
        'important'
      );
    }

    if (final) {
      final.textContent =
        'Credit digunakan: ' +
        formatNumber(
          finalCredit
        );
    }

    info.style.display =
      'block';
  }

  function update() {
    const providerId =
      getProviderId();

    const modelId =
      getModelId();

    if (
      !providerId ||
      !modelId
    ) {
      hide();
      return;
    }

    const provider =
      getCurrentProvider();

    if (!provider) {
      hide();
      return;
    }

    const baseCredit =
      getBaseCredit(
        provider,
        modelId
      );

    const discount =
      getDiscount(
        provider,
        modelId
      );

    const finalCredit =
      calculateFinalCredit(
        baseCredit,
        discount
      );

    show(
      baseCredit,
      discount,
      finalCredit
    );
  }

  function scheduleUpdate() {
    if (state.updateTimer) {
      window.clearTimeout(
        state.updateTimer
      );
    }

    state.updateTimer =
      window.setTimeout(
        function () {
          state.updateTimer = null;
          update();
        },
        30
      );
  }

  async function loadProvidersDirectly() {
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

      if (!response.ok) {
        return;
      }

      const data =
        await response.json();

      if (
        Array.isArray(
          data?.providers
        )
      ) {
        state.providers =
          normalizeProviderList(
            data.providers
          );

        scheduleUpdate();
      }
    } catch (error) {
      console.warn(
        '[GEN-Z.AI] Gagal sinkronisasi credit provider:',
        error
      );
    }
  }

  function bindElements() {
    const provider =
      get('provider');

    const model =
      get('model');

    if (
      !provider ||
      !model
    ) {
      return false;
    }

    if (
      state.providerElement === provider &&
      state.modelElement === model &&
      state.bound
    ) {
      scheduleUpdate();
      return true;
    }

    if (state.providerElement) {
      state.providerElement.removeEventListener(
        'change',
        scheduleUpdate
      );
    }

    if (state.modelElement) {
      state.modelElement.removeEventListener(
        'change',
        scheduleUpdate
      );
    }

    state.providerElement =
      provider;

    state.modelElement =
      model;

    state.bound =
      true;

    provider.addEventListener(
      'change',
      scheduleUpdate
    );

    model.addEventListener(
      'change',
      scheduleUpdate
    );

    scheduleUpdate();

    return true;
  }

  function stopRetry() {
    if (state.retryTimer) {
      window.clearTimeout(
        state.retryTimer
      );

      state.retryTimer = null;
    }
  }

  function retryBind(attempt) {
    if (
      bindElements()
    ) {
      stopRetry();
      return;
    }

    if (
      attempt >= 30
    ) {
      stopRetry();
      return;
    }

    state.retryTimer =
      window.setTimeout(
        function () {
          state.retryTimer = null;

          retryBind(
            attempt + 1
          );
        },
        250
      );
  }

  function bindProviderEvents() {
    document.addEventListener(
      'genz-providers-loaded',
      function (event) {
        const providers =
          event?.detail?.providers;

        if (
          Array.isArray(providers)
        ) {
          state.providers =
            normalizeProviderList(
              providers
            );
        }

        scheduleUpdate();
      }
    );

    document.addEventListener(
      'genz-provider-change',
      function (event) {
        const provider =
          event?.detail?.provider;

        if (provider) {
          const exists =
            state.providers.some(
              function (item) {
                return normalizeId(
                  item?.id
                ) === normalizeId(
                  provider?.id
                );
              }
            );

          if (!exists) {
            state.providers.push(
              provider
            );
          }
        }

        scheduleUpdate();
      }
    );

    document.addEventListener(
      'genz-model-change',
      scheduleUpdate
    );
  }

  function initialize() {
    bindProviderEvents();

    if (
      !bindElements()
    ) {
      retryBind(0);
    }

    loadProvidersDirectly();

    window.setTimeout(
      function () {
        loadProvidersDirectly();
        scheduleUpdate();
      },
      1000
    );

    window.setTimeout(
      function () {
        loadProvidersDirectly();
        scheduleUpdate();
      },
      3000
    );
  }

  window.GENZ_MODEL_CREDIT_UI = {
    update,
    refresh: loadProvidersDirectly
  };

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
