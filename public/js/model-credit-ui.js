(function () {
  'use strict';

  const state = {
    bound: false,
    providerElement: null,
    modelElement: null,
    updateTimer: null,
    retryTimer: null,
    appObserver: null
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

  function getCurrentProvider() {
    const providers =
      window.GENZ &&
      window.GENZ.providers;

    if (
      providers &&
      providers.currentProvider
    ) {
      return providers.currentProvider;
    }

    if (
      window.GENZ &&
      window.GENZ.state &&
      window.GENZ.state.currentProvider
    ) {
      return window.GENZ.state.currentProvider;
    }

    return null;
  }

  function getProviderFromList(providerId) {
    const providers =
      window.GENZ &&
      window.GENZ.providers;

    if (!providers) {
      return null;
    }

    const list =
      Array.isArray(providers.list)
        ? providers.list
        : [];

    const normalized =
      normalizeId(providerId);

    return list.find(function (provider) {
      if (!provider) {
        return false;
      }

      return normalizeId(
        provider.id ||
        provider.provider ||
        provider.name ||
        provider.slug
      ) === normalized;
    }) || null;
  }

  function getProvider() {
    const providerId =
      getProviderId();

    const current =
      getCurrentProvider();

    if (current) {
      const currentId =
        normalizeId(
          current.id ||
          current.provider ||
          current.name ||
          current.slug
        );

      if (
        !providerId ||
        currentId === normalizeId(providerId)
      ) {
        return current;
      }
    }

    return getProviderFromList(
      providerId
    );
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
      Object.keys(map).find(
        function (item) {
          return (
            normalizeId(item) ===
            normalized
          );
        }
      );

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

    const candidates = [
      provider.models,
      provider.capabilities &&
      provider.capabilities.models
    ];

    for (const models of candidates) {
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
              normalizeId(modelId)
            );
          }

          return normalizeId(
            model.id ||
            model.model ||
            model.modelId ||
            model.slug ||
            model.name
          ) === normalizeId(modelId);
        });

      if (found) {
        return found;
      }
    }

    return null;
  }

  function getBaseCredit(provider, modelId) {
    const stateCredit =
      window.GENZ &&
      window.GENZ.state
        ? window.GENZ.state.modelCredit
        : undefined;

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

    return 1;
  }

  function getDiscount(provider, modelId) {
    const stateDiscount =
      window.GENZ &&
      window.GENZ.state
        ? window.GENZ.state.modelDiscount
        : undefined;

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
      getProvider();

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

    if (
      state.providerElement
    ) {
      state.providerElement.removeEventListener(
        'change',
        scheduleUpdate
      );
    }

    if (
      state.modelElement
    ) {
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
      attempt >= 20
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

  function observeApp() {
    if (
      state.appObserver ||
      !window.MutationObserver
    ) {
      return;
    }

    const app =
      get('app');

    if (!app) {
      return;
    }

    state.appObserver =
      new MutationObserver(
        function () {
          const provider =
            get('provider');

          const model =
            get('model');

          if (
            provider !==
              state.providerElement ||
            model !==
              state.modelElement
          ) {
            state.bound = false;
            retryBind(0);
          }
        }
      );

    state.appObserver.observe(
      app,
      {
        childList: true
      }
    );
  }

  function start() {
    observeApp();
    retryBind(0);
  }

  function destroy() {
    stopRetry();

    if (state.updateTimer) {
      window.clearTimeout(
        state.updateTimer
      );

      state.updateTimer = null;
    }

    if (
      state.providerElement
    ) {
      state.providerElement.removeEventListener(
        'change',
        scheduleUpdate
      );
    }

    if (
      state.modelElement
    ) {
      state.modelElement.removeEventListener(
        'change',
        scheduleUpdate
      );
    }

    if (
      state.appObserver
    ) {
      state.appObserver.disconnect();
      state.appObserver = null;
    }

    state.providerElement =
      null;

    state.modelElement =
      null;

    state.bound =
      false;
  }

  window.GENZ =
    window.GENZ || {};

  window.GENZ.modelCreditUI = {
    update,
    start,
    destroy
  };

  if (
    document.readyState ===
    'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      start,
      {
        once: true
      }
    );
  } else {
    start();
  }
})();
