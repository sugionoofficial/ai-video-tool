/* =========================================================
   GEN-Z.AI
   DYNAMIC PROVIDER UI

   File:
   public/js/providers.js

   Optimized:
   - Tidak membuat refresh/event loop
   - Tidak memanggil GENZ.upload.clear() dari refresh
   - Refresh realtime tetapi dijadwalkan satu kali
   - Provider/model/duration/resolution tetap sinkron
   - imageReferenceSupported tetap eksplisit
   - Reference image tidak dihapus saat refresh/sinkronisasi
   - Model object dinormalisasi menjadi model ID
   - Model credit/discount/enabled tetap tersedia
   ========================================================= */

(function () {

  'use strict';

  window.GENZ = window.GENZ || {};

  const GENZ = window.GENZ;

  GENZ.state = GENZ.state || {};
  GENZ.providers = GENZ.providers || {};
  GENZ.videoProviders = GENZ.videoProviders || {};

  let refreshTimer = null;
  let refreshRunning = false;
  let refreshQueued = false;
  let providersLoading = null;


  /* =======================================================
     HELPERS
  ======================================================= */

  function $(id) {
    return document.getElementById(id);
  }


  function text(value) {
    return String(value ?? '').trim();
  }


  function normalizeId(value) {
    return text(value)
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^[-_]+|[-_]+$/g, '');
  }


  function cloneArray(value) {
    return Array.isArray(value) ? [...value] : [];
  }


  function uniqueArray(value) {
    return [
      ...new Set(
        cloneArray(value).map(function (item) {
          return String(item);
        })
      )
    ];
  }


  /*
   * =====================================================
   * MODEL NORMALIZER
   * =====================================================
   *
   * Adapter dapat mengembalikan:
   *
   * [
   *   "model-a",
   *   "model-b"
   * ]
   *
   * atau:
   *
   * [
   *   {
   *     id: "model-a",
   *     name: "Model A"
   *   }
   * ]
   *
   * UI membutuhkan ID string.
   */

  function getModelId(model) {

    if (
      model === null ||
      model === undefined
    ) {
      return '';
    }

    if (
      typeof model === 'string' ||
      typeof model === 'number'
    ) {
      return text(model);
    }

    if (
      typeof model === 'object'
    ) {

      return text(
        model.id ||
        model.model ||
        model.modelId ||
        model.slug ||
        model.name
      );

    }

    return '';
  }


  function getModelName(model) {

    if (
      model === null ||
      model === undefined
    ) {
      return '';
    }

    if (
      typeof model === 'string' ||
      typeof model === 'number'
    ) {
      return text(model);
    }

    if (
      typeof model === 'object'
    ) {

      return text(
        model.name ||
        model.label ||
        model.displayName ||
        model.id ||
        model.model ||
        model.modelId ||
        model.slug
      );

    }

    return '';
  }


  function normalizeModels(value) {

    if (!Array.isArray(value)) {
      return [];
    }

    const result = [];
    const seen = new Set();

    value.forEach(function (model) {

      const id =
        getModelId(model);

      if (!id) {
        return;
      }

      const normalized =
        normalizeId(id);

      if (!normalized) {
        return;
      }

      if (seen.has(id)) {
        return;
      }

      seen.add(id);

      result.push(id);

    });

    return result;
  }


  function getModelMetadataMap(value) {

    if (!Array.isArray(value)) {
      return {};
    }

    const result = {};

    value.forEach(function (model) {

      const id =
        getModelId(model);

      if (!id) {
        return;
      }

      if (
        typeof model === 'object' &&
        model !== null
      ) {

        result[id] = {
          id: id,
          name:
            getModelName(model),
          ...model
        };

      } else {

        result[id] = {
          id: id,
          name: id
        };

      }

    });

    return result;
  }


  function normalizeModelMap(value) {

    if (
      !value ||
      typeof value !== 'object' ||
      Array.isArray(value)
    ) {
      return {};
    }

    const result = {};

    Object.keys(value).forEach(function (key) {

      const normalizedKey =
        text(key);

      if (!normalizedKey) {
        return;
      }

      result[normalizedKey] =
        value[key];

    });

    return result;
  }


  function scheduleRefresh(changedField) {

    if (refreshTimer !== null) {
      clearTimeout(refreshTimer);
    }

    refreshTimer = setTimeout(function () {

      refreshTimer = null;

      if (refreshRunning) {
        refreshQueued = true;
        return;
      }

      refreshCurrentOptions(
        changedField || ''
      );

    }, 0);
  }


  /* =======================================================
     CAPABILITIES
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
            provider.config &&
            provider.config.capabilities &&
            typeof provider.config.capabilities === 'object'
              ? provider.config.capabilities
              : {}
          );

    const rawModels =
      Array.isArray(source.models)
        ? source.models
        : (
            Array.isArray(provider.models)
              ? provider.models
              : []
          );

    const models =
      normalizeModels(
        rawModels
      );

    const modelMetadata =
      getModelMetadataMap(
        rawModels
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

    const constraints =
      source.constraints &&
      typeof source.constraints === 'object'
        ? source.constraints
        : {};

    return {
      models: cloneArray(models),
      modelMetadata: modelMetadata,
      durations: cloneArray(durations),
      aspects: cloneArray(aspects),
      resolutions: cloneArray(resolutions),
      constraints: constraints
    };
  }


  function getEffectiveCapabilities(provider) {
    return normalizeCapabilities(provider);
  }


  /* =======================================================
     MODEL PRICING
  ======================================================= */

  function getModelCredits(provider) {

    if (!provider) {
      return {};
    }

    return normalizeModelMap(
      provider.modelCredits ||
      provider.config?.modelCredits ||
      {}
    );
  }


  function getModelDiscounts(provider) {

    if (!provider) {
      return {};
    }

    return normalizeModelMap(
      provider.modelDiscounts ||
      provider.config?.modelDiscounts ||
      {}
    );
  }


  function getModelEnabled(provider) {

    if (!provider) {
      return {};
    }

    return normalizeModelMap(
      provider.modelEnabled ||
      provider.config?.modelEnabled ||
      {}
    );
  }


  function getMapValue(
    map,
    modelId
  ) {

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
          return normalizeId(item) === normalized;
        }
      );

    return key !== undefined
      ? map[key]
      : undefined;
  }


  function isModelEnabled(
    provider,
    modelId
  ) {

    const configured =
      getMapValue(
        getModelEnabled(provider),
        modelId
      );

    if (
      configured === undefined ||
      configured === null
    ) {
      return true;
    }

    if (
      configured === false ||
      configured === 0 ||
      configured === 'false'
    ) {
      return false;
    }

    return true;
  }


  function getVisibleModels(provider) {

    const capabilities =
      getEffectiveCapabilities(
        provider
      );

    return capabilities.models.filter(
      function (modelId) {

        return isModelEnabled(
          provider,
          modelId
        );

      }
    );
  }


  /* =======================================================
     IMAGE
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

    const input = $('image');

    return Boolean(
      input &&
      input.files &&
      input.files.length
    );
  }


  function clearImageReference() {

    if (GENZ.state) {
      GENZ.state.imageData = null;
    }

    if (GENZ.upload) {
      GENZ.upload.imageData = null;
    }

    const imageInput = $('image');

    if (imageInput) {
      try {
        imageInput.value = '';
      } catch (error) {
        /* ignore */
      }
    }

    const preview = $('imagePreview');

    if (preview) {
      preview.innerHTML = '';
      preview.classList.add('hidden');
      preview.style.display = 'none';
    }

    const fileStatus = $('imageFileStatus');

    if (fileStatus) {
      fileStatus.textContent =
        'Tidak ada file dipilih';
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
      constraints[
        normalizeId(model)
      ] ||
      null
    );
  }


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
      return null;
    }

    return (
      rules.imageReferenceSupported === true
    );
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

    if (
      hasImage &&
      modelSupportsImage(
        provider,
        model
      ) === true
    ) {
      return rules.imageToVideo || null;
    }

    return rules.textToVideo || null;
  }


  /* =======================================================
     DURATIONS
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

    return uniqueArray(
      Object.keys(modeRules)
        .map(function (value) {
          return Number(value);
        })
        .filter(function (value) {
          return Number.isFinite(value);
        })
    );
  }


  /* =======================================================
     RESOLUTIONS
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
      String(Number(duration));

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
     SELECT OPTIONS
  ======================================================= */

  function setOptions(
    id,
    values,
    preferredValue
  ) {

    const element = $(id);

    if (!element) {
      return '';
    }

    const list =
      uniqueArray(values);

    const previous =
      text(
        preferredValue !== undefined
          ? preferredValue
          : element.value
      );

    const current =
      Array.from(
        element.options
      ).map(
        function (option) {
          return option.value;
        }
      );

    const same =
      current.length === list.length &&
      current.every(
        function (value, index) {
          return value === list[index];
        }
      );

    if (same) {

      if (
        previous &&
        list.includes(previous)
      ) {
        element.value =
          previous;

        return previous;
      }

      if (
        list.length &&
        !list.includes(
          element.value
        )
      ) {
        element.value =
          list[0];
      }

      return text(
        element.value
      );
    }

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

      return '';
    }

    const fragment =
      document.createDocumentFragment();

    list.forEach(
      function (value) {

        const option =
          document.createElement(
            'option'
          );

        option.value =
          String(value);

        option.textContent =
          String(value);

        fragment.appendChild(
          option
        );

      }
    );

    element.appendChild(
      fragment
    );

    if (
      previous &&
      list.includes(previous)
    ) {

      element.value =
        previous;

      return previous;
    }

    element.value =
      list[0];

    return list[0];
  }


  function setModelOptions(
    provider,
    preferredValue
  ) {

    const element =
      $('model');

    if (!element) {
      return '';
    }

    const capabilities =
      getEffectiveCapabilities(
        provider
      );

    const models =
      getVisibleModels(
        provider
      );

    const previous =
      text(
        preferredValue !== undefined
          ? preferredValue
          : element.value
      );

    const current =
      Array.from(
        element.options
      ).map(
        function (option) {
          return option.value;
        }
      );

    const same =
      current.length === models.length &&
      current.every(
        function (value, index) {
          return value === models[index];
        }
      );

    if (!same) {

      element.innerHTML = '';

      if (!models.length) {

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

      } else {

        const fragment =
          document.createDocumentFragment();

        models.forEach(
          function (modelId) {

            const option =
              document.createElement(
                'option'
              );

            const metadata =
              capabilities.modelMetadata?.[
                modelId
              ] || {};

            option.value =
              modelId;

            option.textContent =
              text(
                metadata.name ||
                metadata.label ||
                metadata.displayName ||
                modelId
              );

            fragment.appendChild(
              option
            );

          }
        );

        element.appendChild(
          fragment
        );
      }
    }

    if (
      previous &&
      models.includes(previous)
    ) {

      element.value =
        previous;

      return previous;
    }

    if (models.length) {

      element.value =
        models[0];

      return models[0];
    }

    element.value = '';

    return '';
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

    const next =
      String(
        value ?? ''
      );

    if (
      element.value !==
      next
    ) {
      element.value =
        next;
    }
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

    const allowed =
      getVisibleModels(
        provider
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

    const allowed =
      getEffectiveCapabilities(
        provider
      )
        .aspects
        .map(
          function (value) {
            return String(value);
          }
        );

    [
      $('ratio'),
      $('aspect')
    ].forEach(
      function (element) {

        if (!element) {
          return;
        }

        if (!allowed.length) {

          element.value =
            '';

          return;
        }

        if (
          !allowed.includes(
            text(element.value)
          )
        ) {

          element.value =
            allowed[0];
        }

      }
    );
  }


  /* =======================================================
     IMAGE GROUP
  ======================================================= */

  function findReferenceImageGroup(
    imageInput
  ) {

    if (!imageInput) {
      return null;
    }

    const directGroup =
      imageInput.closest(
        '.reference-group'
      );

    if (directGroup) {
      return directGroup;
    }

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
     IMAGE AVAILABILITY
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

    if (!model) {

      imageInput.disabled =
        false;

      imageInput.removeAttribute(
        'aria-disabled'
      );

      if (imageGroup) {

        imageGroup.classList.remove(
          'hidden'
        );

        imageGroup.style.setProperty(
          'display',
          '',
          'important'
        );

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
     * UNKNOWN
     */

    if (supported === null) {

      imageInput.disabled =
        false;

      imageInput.removeAttribute(
        'aria-disabled'
      );

      if (imageGroup) {

        imageGroup.classList.remove(
          'hidden'
        );

        imageGroup.style.setProperty(
          'display',
          '',
          'important'
        );

        imageGroup.removeAttribute(
          'aria-hidden'
        );
      }

      return;
    }


    /*
     * NOT SUPPORTED
     */

    if (supported === false) {

      if (imageGroup) {

        imageGroup.classList.add(
          'hidden'
        );

        imageGroup.style.setProperty(
          'display',
          'none',
          'important'
        );

        imageGroup.setAttribute(
          'aria-hidden',
          'true'
        );
      }

      imageInput.disabled =
        true;

      imageInput.setAttribute(
        'aria-disabled',
        'true'
      );

      return;
    }


    /*
     * SUPPORTED
     */

    if (imageGroup) {

      imageGroup.classList.remove(
        'hidden'
      );

      imageGroup.style.setProperty(
        'display',
        '',
        'important'
      );

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
     MODEL RULES
  ======================================================= */

  function applyModelRules(
    provider
  ) {

    const model =
      ensureValidModel(
        provider
      );

    if (!model) {

      updateImageAvailability(
        provider
      );

      return '';
    }

    updateImageAvailability(
      provider
    );

    return model;
  }


  /* =======================================================
     DURATION RULES
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

    return setOptions(
      'duration',
      allowed,
      preferredDuration
    );
  }


  /* =======================================================
     RESOLUTION RULES
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

      return setOptions(
        'resolution',
        []
      );
    }

    const allowed =
      getAllowedResolutions(
        provider,
        model,
        duration,
        hasImageReference()
      );

    return setOptions(
      'resolution',
      allowed,
      preferredResolution
    );
  }


  /* =======================================================
     BUTTON STATE
  ======================================================= */

  function updateGenerateButton(
    provider
  ) {

    const buttons =
      document.querySelectorAll(
        '#generateBtn, [data-generate-button], button[type="submit"]'
      );

    const model =
      text(
        $('model')?.value
      );

    const duration =
      text(
        $('duration')?.value
      );

    const resolution =
      text(
        $('resolution')?.value
      );

    const enabled =
      Boolean(
        provider &&
        model &&
        duration &&
        resolution
      );

    buttons.forEach(
      function (button) {

        if (
          button.id ===
            'generateBtn' ||
          button.hasAttribute(
            'data-generate-button'
          )
        ) {

          button.disabled =
            !enabled;
        }

      }
    );
  }


  function updateActiveButton(
    providerId
  ) {

    document
      .querySelectorAll(
        '[data-provider]'
      )
      .forEach(
        function (button) {

          const active =
            normalizeId(
              button.dataset.provider
            ) ===
            normalizeId(
              providerId
            );

          button.classList.toggle(
            'active',
            active
          );

          button.setAttribute(
            'aria-selected',
            active
              ? 'true'
              : 'false'
          );

        }
      );
  }


  /* =======================================================
     FULL REFRESH
  ======================================================= */

  function refreshCurrentOptions(
    changedField
  ) {

    if (refreshRunning) {

      refreshQueued =
        true;

      return;
    }

    const provider =
      GENZ.providers.currentProvider;

    if (!provider) {
      return;
    }

    refreshRunning =
      true;

    try {

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


      /* ===================================================
         MODEL
      =================================================== */

      setModelOptions(
        provider,
        previousModel
      );

      const model =
        applyModelRules(
          provider
        );

      if (!model) {

        updateGenerateButton(
          provider
        );

        return;
      }


      /* ===================================================
         IMAGE
      =================================================== */

      updateImageAvailability(
        provider
      );


      /* ===================================================
         ASPECT
      =================================================== */

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


      /* ===================================================
         IMAGE STATE
      =================================================== */

      const hasImage =
        hasImageReference();


      /* ===================================================
         DURATION
      =================================================== */

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


      /* ===================================================
         RESOLUTION
      =================================================== */

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


      /* ===================================================
         RESOLUTION → DURATION
      =================================================== */

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
            function (value) {

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


      /* ===================================================
         FINAL RESOLUTION
      =================================================== */

      resolution =
        applyResolutionRules(
          provider,
          text(
            $('resolution')?.value
          )
        );


      /* ===================================================
         STATE
      =================================================== */

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


      /* ===================================================
         PRICING STATE
      =================================================== */

      const selectedModel =
        text(
          $('model')?.value
        );

      const modelCredits =
        getModelCredits(
          provider
        );

      const modelDiscounts =
        getModelDiscounts(
          provider
        );

      GENZ.state.modelCredit =
        getMapValue(
          modelCredits,
          selectedModel
        );

      GENZ.state.modelDiscount =
        getMapValue(
          modelDiscounts,
          selectedModel
        );


      /* ===================================================
         BUTTONS
      =================================================== */

      updateGenerateButton(
        provider
      );

      updateActiveButton(
        provider.id
      );


      /*
       * Beri tahu UI credit bahwa provider/model
       * sudah berubah.
       */

      if (
        GENZ.modelCreditUI &&
        typeof GENZ.modelCreditUI.update ===
          'function'
      ) {

        GENZ.modelCreditUI.update();

      }

    } finally {

      refreshRunning =
        false;

      if (refreshQueued) {

        refreshQueued =
          false;

        scheduleRefresh(
          changedField || ''
        );
      }
    }
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
     PROVIDER EVENT
  ======================================================= */

  function dispatchProviderChange(
    provider
  ) {

    document.dispatchEvent(
      new CustomEvent(
        'genz-provider-change',
        {
          detail: {
            provider: provider,
            id: provider.id,
            name: provider.name,
            adapter:
              provider.adapter ||
              null,
            capabilities:
              getEffectiveCapabilities(
                provider
              )
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

    const fragment =
      document.createDocumentFragment();

    providers.forEach(
      function (provider) {

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

        fragment.appendChild(
          button
        );
      }
    );

    container.innerHTML =
      '';

    container.appendChild(
      fragment
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
      function (event) {

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
     PROVIDER SELECT
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

    const fragment =
      document.createDocumentFragment();

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

    fragment.appendChild(
      placeholder
    );

    providers.forEach(
      function (provider) {

        const option =
          document.createElement(
            'option'
          );

        option.value =
          provider.id;

        option.textContent =
          provider.name ||
          provider.id;

        fragment.appendChild(
          option
        );
      }
    );

    element.innerHTML =
      '';

    element.appendChild(
      fragment
    );

    if (
      previous &&
      providers.some(
        function (provider) {
          return (
            String(
              provider.id
            ) === previous
          );
        }
      )
    ) {

      element.value =
        previous;
    }
  }


  /* =======================================================
     NORMALIZE PROVIDERS
  ======================================================= */

  function normalizeProviderList(
    list
  ) {

    if (!Array.isArray(list)) {
      return [];
    }

    return list
      .filter(
        function (provider) {

          if (!provider) {
            return false;
          }

          if (
            provider.enabled ===
            false
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
        function (provider) {

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

            id:
              id,

            name:
              name,

            capabilities:
              capabilities,

            models:
              capabilities.models,

            modelCredits:
              normalizeModelMap(
                provider.modelCredits ||
                provider.config?.modelCredits ||
                {}
              ),

            modelDiscounts:
              normalizeModelMap(
                provider.modelDiscounts ||
                provider.config?.modelDiscounts ||
                {}
              ),

            modelEnabled:
              normalizeModelMap(
                provider.modelEnabled ||
                provider.config?.modelEnabled ||
                {}
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
        function (provider) {

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
          'HTTP ' +
          response.status
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

    if (providersLoading) {
      return providersLoading;
    }

    providersLoading =
      (async function () {

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
            function (provider) {

              return (
                String(
                  provider.id
                ) === requested
              );
            }
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
                providers:
                  providers,

                count:
                  providers.length
              }
            }
          )
        );

        return providers;

      })();

    try {

      return await providersLoading;

    } finally {

      providersLoading =
        null;
    }
  }


  /* =======================================================
     PROVIDER SELECT LISTENER
  ======================================================= */

  function bindProviderSelect() {

    const element =
      $('provider');

    if (!element) {
      return;
    }

    if (
      element.dataset.providerListenerAttached ===
      'true'
    ) {
      return;
    }

    element.dataset.providerListenerAttached =
      'true';

    element.addEventListener(
      'change',
      function () {

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
      function (event) {

        const target =
          event.target;

        if (!target) {
          return;
        }

        switch (
          target.id
        ) {

          case 'model':
            scheduleRefresh(
              'model'
            );
            break;

          case 'duration':
            scheduleRefresh(
              'duration'
            );
            break;

          case 'resolution':
            scheduleRefresh(
              'resolution'
            );
            break;

          case 'ratio':
            scheduleRefresh(
              'ratio'
            );
            break;

          case 'aspect':
            scheduleRefresh(
              'aspect'
            );
            break;

          case 'image':
            scheduleRefresh(
              'image'
            );
            break;

          default:
            break;
        }
      },
      true
    );


    document.addEventListener(
      'input',
      function (event) {

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
      function (eventName) {

        document.addEventListener(
          eventName,
          function () {

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

  GENZ.providers.getModelCredits =
    function (providerId) {

      const provider =
        providerId
          ? findProvider(
              providerId
            )
          : GENZ.providers.currentProvider;

      return getModelCredits(
        provider
      );
    };

  GENZ.providers.getModelDiscounts =
    function (providerId) {

      const provider =
        providerId
          ? findProvider(
              providerId
            )
          : GENZ.providers.currentProvider;

      return getModelDiscounts(
        provider
      );
    };

  GENZ.providers.getModelEnabled =
    function (providerId) {

      const provider =
        providerId
          ? findProvider(
              providerId
            )
          : GENZ.providers.currentProvider;

      return getModelEnabled(
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
