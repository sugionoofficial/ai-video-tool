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
   - Capability model/provider lebih fleksibel
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


  function getArrayValue(source, keys) {

    if (
      !source ||
      typeof source !== 'object'
    ) {
      return [];
    }

    for (const key of keys) {

      if (
        Array.isArray(source[key]) &&
        source[key].length
      ) {
        return source[key];
      }

    }

    return [];
  }


  function findObjectValue(source, keys) {

    if (
      !source ||
      typeof source !== 'object'
    ) {
      return null;
    }

    for (const key of keys) {

      if (
        source[key] &&
        typeof source[key] === 'object'
      ) {
        return source[key];
      }

    }

    return null;
  }


  /*
   * =====================================================
   * MODEL NORMALIZER
   * =====================================================
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
        modelMetadata: {},
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

    let durations =
      getArrayValue(
        source,
        [
          'durations',
          'duration',
          'supportedDurations',
          'supportedDuration'
        ]
      );

    if (!durations.length) {

      durations =
        getArrayValue(
          provider,
          [
            'durations',
            'duration',
            'supportedDurations',
            'supportedDuration'
          ]
        );

    }

    let aspects =
      getArrayValue(
        source,
        [
          'aspects',
          'aspect',
          'aspectRatios',
          'aspectRatio',
          'ratios',
          'supportedAspects',
          'supportedAspectRatios'
        ]
      );

    if (!aspects.length) {

      aspects =
        getArrayValue(
          provider,
          [
            'aspects',
            'aspect',
            'aspectRatios',
            'aspectRatio',
            'ratios',
            'supportedAspects',
            'supportedAspectRatios'
          ]
        );

    }

    let resolutions =
      getArrayValue(
        source,
        [
          'resolutions',
          'resolution',
          'supportedResolutions',
          'supportedResolution'
        ]
      );

    if (!resolutions.length) {

      resolutions =
        getArrayValue(
          provider,
          [
            'resolutions',
            'resolution',
            'supportedResolutions',
            'supportedResolution'
          ]
        );

    }

    const constraints =
      source.constraints &&
      typeof source.constraints === 'object'
        ? source.constraints
        : (
            provider.constraints &&
            typeof provider.constraints === 'object'
              ? provider.constraints
              : {}
          );

    return {
      models: cloneArray(models),
      modelMetadata: modelMetadata,
      durations: uniqueArray(durations),
      aspects: uniqueArray(aspects),
      resolutions: uniqueArray(resolutions),
      constraints: constraints
    };
  }


  function getEffectiveCapabilities(provider) {
    return normalizeCapabilities(provider);
  }


  /* =======================================================
     MODEL METADATA
  ======================================================= */

  function getModelMetadata(
    provider,
    model
  ) {

    const capabilities =
      getEffectiveCapabilities(
        provider
      );

    const metadata =
      capabilities.modelMetadata || {};

    const direct =
      metadata[model];

    if (
      direct &&
      typeof direct === 'object'
    ) {
      return direct;
    }

    const normalized =
      normalizeId(model);

    const key =
      Object.keys(metadata).find(
        function (item) {
          return (
            normalizeId(item) ===
            normalized
          );
        }
      );

    if (
      key !== undefined &&
      metadata[key] &&
      typeof metadata[key] === 'object'
    ) {
      return metadata[key];
    }

    return {};
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

    const direct =
      constraints[model];

    if (
      direct &&
      typeof direct === 'object'
    ) {
      return direct;
    }

    const normalized =
      normalizeId(model);

    const key =
      Object.keys(constraints).find(
        function (item) {
          return (
            normalizeId(item) ===
            normalized
          );
        }
      );

    if (
      key !== undefined &&
      constraints[key] &&
      typeof constraints[key] === 'object'
    ) {
      return constraints[key];
    }

    const metadata =
      getModelMetadata(
        provider,
        model
      );

    if (
      metadata.constraints &&
      typeof metadata.constraints === 'object'
    ) {
      return metadata.constraints;
    }

    if (
      metadata.capabilities &&
      typeof metadata.capabilities === 'object'
    ) {
      return metadata.capabilities;
    }

    return metadata;
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

    if (
      rules.imageReferenceSupported === true ||
      rules.image_reference_supported === true ||
      rules.supportsImage === true ||
      rules.supports_image === true ||
      rules.imageInput === true ||
      rules.image_input === true
    ) {
      return true;
    }

    if (
      rules.imageReferenceSupported === false ||
      rules.image_reference_supported === false ||
      rules.supportsImage === false ||
      rules.supports_image === false
    ) {
      return false;
    }

    return null;
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

      return (
        rules.imageToVideo ||
        rules.image_to_video ||
        rules.image2video ||
        rules.image ||
        null
      );
    }

    return (
      rules.textToVideo ||
      rules.text_to_video ||
      rules.text2video ||
      rules.text ||
      null
    );
  }


  /* =======================================================
     NORMALIZE MODE DATA
  ======================================================= */

  function extractDurationList(
    modeRules
  ) {

    if (!modeRules) {
      return [];
    }

    if (
      Array.isArray(modeRules)
    ) {

      return uniqueArray(
        modeRules
          .map(function (item) {

            if (
              item &&
              typeof item === 'object'
            ) {

              return (
                item.duration ??
                item.seconds ??
                item.value
              );

            }

            return item;
          })
          .filter(function (item) {
            return (
              item !== undefined &&
              item !== null &&
              text(item) !== ''
            );
          })
      );
    }

    if (
      typeof modeRules !== 'object'
    ) {
      return [];
    }

    const direct =
      getArrayValue(
        modeRules,
        [
          'durations',
          'duration',
          'supportedDurations',
          'supportedDuration'
        ]
      );

    if (direct.length) {
      return uniqueArray(direct);
    }

    return uniqueArray(
      Object.keys(modeRules)
        .filter(function (value) {

          const normalized =
            value
              .toLowerCase()
              .replace(
                /seconds?/g,
                ''
              )
              .trim();

          return (
            /^\d+(?:\.\d+)?$/.test(
              normalized
            )
          );

        })
        .map(function (value) {

          const normalized =
            value
              .toLowerCase()
              .replace(
                /seconds?/g,
                ''
              )
              .trim();

          return Number(
            normalized
          );

        })
        .filter(function (value) {
          return Number.isFinite(value);
        })
    );
  }


  function getDurationRule(
    modeRules,
    duration
  ) {

    if (!modeRules) {
      return null;
    }

    const numeric =
      Number(duration);

    if (
      !Number.isFinite(numeric)
    ) {
      return null;
    }

    const candidates = [
      String(numeric),
      String(numeric) + 's',
      String(numeric) + 'sec',
      String(numeric) + 'secs',
      String(numeric) + 'second',
      String(numeric) + 'seconds'
    ];

    if (
      typeof modeRules !== 'object' ||
      Array.isArray(modeRules)
    ) {

      return null;
    }

    for (
      const key of candidates
    ) {

      if (
        Object.prototype.hasOwnProperty.call(
          modeRules,
          key
        )
      ) {

        return modeRules[key];

      }

    }

    const matchingKey =
      Object.keys(modeRules).find(
        function (key) {

          const normalized =
            key
              .toLowerCase()
              .replace(
                /seconds?/g,
                ''
              )
              .trim();

          return (
            Number(normalized) ===
            numeric
          );

        }
      );

    if (
      matchingKey !== undefined
    ) {
      return modeRules[matchingKey];
    }

    return null;
  }


  function extractResolutions(
    rule
  ) {

    if (!rule) {
      return [];
    }

    if (
      Array.isArray(rule)
    ) {

      return uniqueArray(
        rule
      );
    }

    if (
      typeof rule === 'object'
    ) {

      return uniqueArray(
        getArrayValue(
          rule,
          [
            'resolutions',
            'resolution',
            'supportedResolutions',
            'supportedResolution'
          ]
        )
      );

    }

    return [];
  }


  function extractAspects(
    source
  ) {

    if (!source) {
      return [];
    }

    if (
      Array.isArray(source)
    ) {
      return uniqueArray(
        source
      );
    }

    if (
      typeof source === 'object'
    ) {

      return uniqueArray(
        getArrayValue(
          source,
          [
            'aspects',
            'aspect',
            'aspectRatios',
            'aspectRatio',
            'ratios',
            'supportedAspects',
            'supportedAspectRatios'
          ]
        )
      );

    }

    return [];
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

    const modeDurations =
      extractDurationList(
        modeRules
      );

    if (
      modeDurations.length
    ) {
      return modeDurations;
    }

    const metadata =
      getModelMetadata(
        provider,
        model
      );

    const modelDurations =
      getArrayValue(
        metadata,
        [
          'durations',
          'duration',
          'supportedDurations',
          'supportedDuration'
        ]
      );

    if (
      modelDurations.length
    ) {
      return uniqueArray(
        modelDurations
      );
    }

    return cloneArray(
      capabilities.durations
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

    const durationRule =
      getDurationRule(
        modeRules,
        duration
      );

    const mappedResolutions =
      extractResolutions(
        durationRule
      );

    if (
      mappedResolutions.length
    ) {
      return mappedResolutions;
    }

    const metadata =
      getModelMetadata(
        provider,
        model
      );

    const modelResolutions =
      getArrayValue(
        metadata,
        [
          'resolutions',
          'resolution',
          'supportedResolutions',
          'supportedResolution'
        ]
      );

    if (
      modelResolutions.length
    ) {
      return uniqueArray(
        modelResolutions
      );
    }

    /*
     * PENTING:
     * Jika model memiliki modeRules tetapi
     * duration tertentu tidak mempunyai mapping
     * resolution, jangan langsung mengembalikan [].
     *
     * Gunakan capability resolution provider sebagai
     * fallback supaya dropdown tidak menjadi
     * "Tidak tersedia".
     */

    if (
      capabilities.resolutions.length
    ) {
      return cloneArray(
        capabilities.resolutions
      );
    }

    return [];
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

    const capabilities =
      getEffectiveCapabilities(
        provider
      );

    let allowed =
      capabilities.aspects
        .map(
          function (value) {
            return String(value);
          }
        );

    const model =
      text(
        $('model')?.value
      );

    if (
      !allowed.length &&
      model
    ) {

      const metadata =
        getModelMetadata(
          provider,
          model
        );

      allowed =
        extractAspects(
          metadata
        );

    }

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

      const capabilities =
        getEffectiveCapabilities(
          provider
        );

      const fallback =
        capabilities.resolutions;

      return setOptions(
        'resolution',
        fallback,
        preferredResolution
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
        resolution &&
        duration !== 'Tidak tersedia' &&
        resolution !== 'Tidak tersedia'
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

      const capabilities =
        getEffectiveCapabilities(
          provider
        );

      let aspects =
        capabilities.aspects;

      if (
        !aspects.length
      ) {

        aspects =
          extractAspects(
            getModelMetadata(
              provider,
              model
            )
          );

      }

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

        const allowedDurations =
          getAllowedDurations(
            provider,
            model,
            hasImage
          );

        const preferredImageDuration =
          allowedDurations.includes(
            '8'
          )
            ? '8'
            : (
                allowedDurations.includes(
                  '8.0'
                )
                  ? '8.0'
                  : undefined
              );

        duration =
          applyDurationRules(
            provider,
            preferredImageDuration !== undefined
              ? preferredImageDuration
              : previousDuration
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

    placeholder.disabled =
      providers.length > 0;

    placeholder.selected =
      !previous;

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
