(function () {
  "use strict";

  const state = {
    bound: false,
    observer: null,
    timer: null
  };

  function get(id) {
    return document.getElementById(id);
  }

  function normalizeId(value) {
    return String(value || "")
      .trim()
      .toLowerCase();
  }

  function toNumber(value, fallback) {
    const number = Number(value);

    return Number.isFinite(number)
      ? number
      : fallback;
  }

  function getProviderId() {
    const provider = get("provider");

    return provider
      ? String(provider.value || "").trim()
      : "";
  }

  function getModelId() {
    const model = get("model");

    return model
      ? String(model.value || "").trim()
      : "";
  }

  function getProviders() {
    const candidates = [
      window.GENZ && window.GENZ.state
        ? window.GENZ.state.providers
        : null,

      window.GENZ && window.GENZ.state
        ? window.GENZ.state.videoProviders
        : null,

      window.GENZ
        ? window.GENZ.providers
        : null,

      window.videoProviders
    ];

    for (const value of candidates) {
      if (Array.isArray(value)) {
        return value;
      }

      if (value && typeof value === "object") {
        return Object.values(value);
      }
    }

    return [];
  }

  function getProvider(providerId) {
    const normalized = normalizeId(providerId);

    if (!normalized) {
      return null;
    }

    const providers = getProviders();

    return providers.find(function (provider) {
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

  function getModels(provider) {
    if (!provider) {
      return [];
    }

    const candidates = [
      provider.models,
      provider.config && provider.config.models,
      provider.capabilities && provider.capabilities.models
    ];

    for (const models of candidates) {
      if (Array.isArray(models)) {
        return models;
      }

      if (models && typeof models === "object") {
        return Object.entries(models).map(function (entry) {
          const key = entry[0];
          const value = entry[1];

          if (value && typeof value === "object") {
            return Object.assign(
              {
                id: key
              },
              value
            );
          }

          return {
            id: key,
            credit: value
          };
        });
      }
    }

    return [];
  }

  function getModel(provider, modelId) {
    const normalized = normalizeId(modelId);

    if (!provider || !normalized) {
      return null;
    }

    const models = getModels(provider);

    return models.find(function (model) {
      if (!model) {
        return false;
      }

      return normalizeId(
        model.id ||
        model.model ||
        model.name ||
        model.slug
      ) === normalized;
    }) || null;
  }

  function getModelCredits(provider) {
    if (!provider) {
      return {};
    }

    const config = provider.config || {};

    return (
      config.modelCredits ||
      provider.modelCredits ||
      {}
    );
  }

  function getModelDiscounts(provider) {
    if (!provider) {
      return {};
    }

    const config = provider.config || {};

    return (
      config.modelDiscounts ||
      provider.modelDiscounts ||
      {}
    );
  }

  function getModelEnabled(provider) {
    if (!provider) {
      return {};
    }

    const config = provider.config || {};

    return (
      config.modelEnabled ||
      provider.modelEnabled ||
      {}
    );
  }

  function findMapValue(map, modelId) {
    if (!map || typeof map !== "object") {
      return undefined;
    }

    const normalized = normalizeId(modelId);

    const directKeys = [
      modelId,
      normalized
    ];

    for (const key of directKeys) {
      if (
        key &&
        Object.prototype.hasOwnProperty.call(map, key)
      ) {
        return map[key];
      }
    }

    const foundKey = Object.keys(map).find(function (key) {
      return normalizeId(key) === normalized;
    });

    return foundKey
      ? map[foundKey]
      : undefined;
  }

  function getBaseCredit(provider, model) {
    const modelId = model
      ? (
          model.id ||
          model.model ||
          model.name ||
          model.slug
        )
      : "";

    const credits = getModelCredits(provider);

    const configured = findMapValue(
      credits,
      modelId
    );

    if (
      configured !== undefined &&
      configured !== null &&
      configured !== ""
    ) {
      return Math.max(
        1,
        toNumber(configured, 1)
      );
    }

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
          value !== ""
        ) {
          return Math.max(
            1,
            toNumber(value, 1)
          );
        }
      }
    }

    return 1;
  }

  function getDiscount(provider, model) {
    const modelId = model
      ? (
          model.id ||
          model.model ||
          model.name ||
          model.slug
        )
      : "";

    const discounts = getModelDiscounts(provider);

    const configured = findMapValue(
      discounts,
      modelId
    );

    if (
      configured !== undefined &&
      configured !== null &&
      configured !== ""
    ) {
      return Math.min(
        100,
        Math.max(
          0,
          toNumber(configured, 0)
        )
      );
    }

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
          value !== ""
        ) {
          return Math.min(
            100,
            Math.max(
              0,
              toNumber(value, 0)
            )
          );
        }
      }
    }

    return 0;
  }

  function isModelEnabled(provider, model) {
    if (!model) {
      return false;
    }

    const modelId =
      model.id ||
      model.model ||
      model.name ||
      model.slug ||
      "";

    const enabledMap = getModelEnabled(provider);

    const configured = findMapValue(
      enabledMap,
      modelId
    );

    if (
      configured !== undefined &&
      configured !== null
    ) {
      return configured !== false;
    }

    if (model.enabled !== undefined) {
      return model.enabled !== false;
    }

    return true;
  }

  function calculateFinalCredit(baseCredit, discount) {
    const finalCredit = Math.ceil(
      baseCredit * (100 - discount) / 100
    );

    return Math.max(
      1,
      finalCredit
    );
  }

  function formatNumber(value) {
    if (
      Number.isInteger(value)
    ) {
      return String(value);
    }

    return String(
      Number(value.toFixed(2))
    );
  }

  function hide() {
    const info = get("modelCreditInfo");

    if (!info) {
      return;
    }

    info.style.display = "none";
  }

  function show(baseCredit, discount, finalCredit) {
    const info = get("modelCreditInfo");
    const base = get("modelCreditBase");
    const discountElement = get("modelCreditDiscount");
    const final = get("modelCreditFinal");

    if (!info) {
      return;
    }

    if (base) {
      base.textContent =
        "Credit normal: " +
        formatNumber(baseCredit);
    }

    if (discountElement) {
      if (discount > 0) {
        discountElement.textContent =
          "Diskon: " +
          formatNumber(discount) +
          "%";
      } else {
        discountElement.textContent =
          "Diskon: 0%";
      }
    }

    if (final) {
      final.textContent =
        "Credit digunakan: " +
        formatNumber(finalCredit);
    }

    info.style.display = "block";
  }

  function update() {
    const providerId = getProviderId();
    const modelId = getModelId();

    if (!providerId || !modelId) {
      hide();
      return;
    }

    const provider = getProvider(providerId);

    if (!provider) {
      hide();
      return;
    }

    const model = getModel(
      provider,
      modelId
    );

    if (!model) {
      hide();
      return;
    }

    if (!isModelEnabled(provider, model)) {
      hide();
      return;
    }

    const baseCredit = getBaseCredit(
      provider,
      model
    );

    const discount = getDiscount(
      provider,
      model
    );

    const finalCredit = calculateFinalCredit(
      baseCredit,
      discount
    );

    show(
      baseCredit,
      discount,
      finalCredit
    );
  }

  function bind() {
    if (state.bound) {
      return;
    }

    const provider = get("provider");
    const model = get("model");

    if (!provider || !model) {
      return;
    }

    state.bound = true;

    provider.addEventListener(
      "change",
      function () {
        window.setTimeout(
          update,
          0
        );
      }
    );

    model.addEventListener(
      "change",
      function () {
        window.setTimeout(
          update,
          0
        );
      }
    );

    if (
      window.MutationObserver
    ) {
      state.observer =
        new MutationObserver(
          function () {
            window.setTimeout(
              update,
              0
            );
          }
        );

      state.observer.observe(
        model,
        {
          childList: true,
          subtree: true
        }
      );
    }

    update();
  }

  function start() {
    bind();

    if (state.timer) {
      window.clearInterval(
        state.timer
      );
    }

    state.timer =
      window.setInterval(
        function () {
          bind();
          update();
        },
        1000
      );
  }

  function destroy() {
    if (state.timer) {
      window.clearInterval(
        state.timer
      );

      state.timer = null;
    }

    if (state.observer) {
      state.observer.disconnect();
      state.observer = null;
    }

    state.bound = false;
  }

  window.GENZ =
    window.GENZ || {};

  window.GENZ.modelCreditUI = {
    update,
    start,
    destroy
  };

  if (
    document.readyState === "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      start,
      {
        once: true
      }
    );
  } else {
    start();
  }
})();
