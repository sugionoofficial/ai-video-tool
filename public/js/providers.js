/* =========================================================
   GEN-Z.AI
   DYNAMIC PROVIDER UI

   File:
   public/js/providers.js

   Provider Identity Rule:
   - provider.id     = IDENTITAS TETAP / BACKEND ID
   - provider.name   = NAMA TAMPILAN
   - provider.adapter = ADAPTER BACKEND
   - Provider Name TIDAK PERNAH menjadi Provider ID
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
      .replace(/[^a-z0-9_.-]+/g, '-')
      .replace(/^[-_.]+|[-_.]+$/g, '');
  }


  function getProviderId(provider) {

    if (!provider) {
      return '';
    }

    return text(
      provider.id ||
      provider.providerId ||
      ''
    );

  }


  function getProviderName(provider) {

    if (!provider) {
      return '';
    }

    const id =
      getProviderId(provider);

    return text(
      provider.name ||
      provider.displayName ||
      id
    );

  }


  function cloneArray(value) {
    return Array.isArray(value) ? [...value] : [];
  }


  function uniqueArray(value) {
    return [
      ...new Set(
        cloneArray(value)
          .map(function (item) {
            return String(item);
          })
          .filter(function (item) {
            return item !== '';
          })
      )
    ];
  }


  function normalizeNumberArray(value) {
    return uniqueArray(value)
      .map(function (item) {
        return Number(item);
      })
      .filter(function (item) {
        return Number.isFinite(item);
      })
      .sort(function (a, b) {
        return a - b;
      });
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
     BUILT-IN MODEL FALLBACK
  ======================================================= */

  const BUILTIN_MODEL_CAPABILITIES = {

    'agnes-video-2.5-flash': {

      aspects: [
        '16:9',
        '9:16',
        '4:3',
        '3:4',
        '1:1',
        '21:9'
      ],

      durations: [
        4,
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12
      ],

      resolutions: [
        '720P'
      ],

      reference: {
        imageSupported: true,
        maxImages: 5,
        videoSupported: false
      },

      constraints: {

        textToVideo: {
          4: ['720P'],
          5: ['720P'],
          6: ['720P'],
          7: ['720P'],
          8: ['720P'],
          9: ['720P'],
          10: ['720P'],
          11: ['720P'],
          12: ['720P']
        },

        referenceToVideo: {
          4: ['720P'],
          5: ['720P'],
          6: ['720P'],
          7: ['720P'],
          8: ['720P'],
          9: ['720P'],
          10: ['720P'],
          11: ['720P'],
          12: ['720P']
        }

      }

    },


    'doubao-seedance-2-0-mini-260615': {

      aspects: [
        '21:9',
        '16:9',
        '4:3',
        '1:1',
        '3:4',
        '9:16'
      ],

      durations: [
        4,
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12,
        13,
        14,
        15
      ],

      resolutions: [
        '480P',
        '720P'
      ],

      reference: {
        imageSupported: true,
        maxImages: 9,
        videoSupported: true,
        maxVideos: 3
      }

    }

  };


  /* =======================================================
     CAPABILITY NORMALIZER
  ======================================================= */

  function normalizeCapabilities(provider) {

    if (!provider) {

      return {
        models: [],
        durations: [],
        aspects: [],
        resolutions: [],
        constraints: {},
        modelCapabilities: {}
      };

    }


    const providerConfig =
      provider.config &&
      typeof provider.config === 'object'
        ? provider.config
        : {};


    const source =
      provider.capabilities &&
      typeof provider.capabilities === 'object'
        ? provider.capabilities
        : (
            providerConfig.capabilities &&
            typeof providerConfig.capabilities === 'object'
              ? providerConfig.capabilities
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
            Array.isArray(source.aspectRatios)
              ? source.aspectRatios
              : (
                  Array.isArray(provider.aspects)
                    ? provider.aspects
                    : (
                        Array.isArray(provider.aspectRatios)
                          ? provider.aspectRatios
                          : []
                      )
                )
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
        : (
            provider.constraints &&
            typeof provider.constraints === 'object'
              ? provider.constraints
              : {}
          );


    const modelCapabilities =
      source.modelCapabilities &&
      typeof source.modelCapabilities === 'object'
        ? source.modelCapabilities
        : (
            provider.modelCapabilities &&
            typeof provider.modelCapabilities === 'object'
              ? provider.modelCapabilities
              : {}
          );


    return {

      models:
        cloneArray(models),

      durations:
        normalizeNumberArray(durations),

      aspects:
        uniqueArray(aspects),

      resolutions:
        uniqueArray(resolutions),

      constraints:
        constraints,

      modelCapabilities:
        modelCapabilities

    };

  }


  function getEffectiveCapabilities(provider) {

    return normalizeCapabilities(provider);

  }


  /* =======================================================
     FIND MODEL DATA
  ======================================================= */

  function findModelData(
    provider,
    modelId
  ) {

    const normalized =
      normalizeId(modelId);

    if (!normalized) {
      return null;
    }


    const capabilities =
      getEffectiveCapabilities(provider);


    const modelCapabilities =
      capabilities.modelCapabilities || {};


    const direct =
      modelCapabilities[modelId] ||
      modelCapabilities[normalized];


    if (
      direct &&
      typeof direct === 'object'
    ) {

      return direct;

    }


    const providerModels =
      Array.isArray(provider?.models)
        ? provider.models
        : [];


    for (
      let index = 0;
      index < providerModels.length;
      index += 1
    ) {

      const item =
        providerModels[index];


      if (
        typeof item === 'string'
      ) {

        if (
          normalizeId(item) ===
          normalized
        ) {

          return null;

        }

        continue;

      }


      if (
        item &&
        typeof item === 'object'
      ) {

        const itemId =
          text(
            item.id ||
            item.model ||
            item.modelId ||
            item.name
          );


        if (
          normalizeId(itemId) ===
          normalized
        ) {

          return item;

        }

      }

    }


    const providerModelRules =
      capabilities.constraints &&
      (
        capabilities.constraints[modelId] ||
        capabilities.constraints[normalized]
      );


    if (
      providerModelRules &&
      typeof providerModelRules === 'object'
    ) {

      return {
        constraints:
          providerModelRules
      };

    }


    const builtin =
      BUILTIN_MODEL_CAPABILITIES[
        normalized
      ];


    if (builtin) {
      return builtin;
    }


    return null;

  }


  /* =======================================================
     MODEL RULES
  ======================================================= */

  function getModelRules(
    provider,
    model
  ) {

    const capabilities =
      getEffectiveCapabilities(provider);

    const normalized =
      normalizeId(model);


    const direct =
      capabilities.constraints?.[model] ||
      capabilities.constraints?.[normalized];


    if (
      direct &&
      typeof direct === 'object'
    ) {

      return direct;

    }


    const modelData =
      findModelData(
        provider,
        model
      );


    if (
      modelData?.constraints &&
      typeof modelData.constraints === 'object'
    ) {

      return modelData.constraints;

    }


    if (
      modelData?.rules &&
      typeof modelData.rules === 'object'
    ) {

      return modelData.rules;

    }


    if (
      BUILTIN_MODEL_CAPABILITIES[
        normalized
      ]?.constraints
    ) {

      return BUILTIN_MODEL_CAPABILITIES[
        normalized
      ].constraints;

    }


    return null;

  }


  /* =======================================================
     MODEL CAPABILITIES
  ======================================================= */

  function getModelCapabilities(
    provider,
    model
  ) {

    const capabilities =
      getEffectiveCapabilities(provider);


    const normalized =
      normalizeId(model);


    const modelData =
      findModelData(
        provider,
        model
      );


    const builtin =
      BUILTIN_MODEL_CAPABILITIES[
        normalized
      ] || {};


    const modelSource =
      modelData &&
      typeof modelData === 'object'
        ? modelData
        : {};


    const modelCaps =
      modelSource.capabilities &&
      typeof modelSource.capabilities === 'object'
        ? modelSource.capabilities
        : modelSource;


    const aspects =
      uniqueArray(
        modelCaps.aspects ||
        modelCaps.aspectRatios ||
        modelCaps.ratios ||
        builtin.aspects ||
        []
      );


    const durations =
      normalizeNumberArray(
        modelCaps.durations ||
        builtin.durations ||
        []
      );


    const resolutions =
      uniqueArray(
        modelCaps.resolutions ||
        builtin.resolutions ||
        []
      );


    const reference =
      modelCaps.reference &&
      typeof modelCaps.reference === 'object'
        ? modelCaps.reference
        : (
            builtin.reference || {}
          );


    const imageSupported =
      reference.imageSupported === true ||
      modelCaps.imageSupported === true ||
      modelCaps.imageReferenceSupported === true;


    const maxImages =
      Number(
        reference.maxImages ||
        modelCaps.maxImages ||
        builtin.reference?.maxImages ||
        1
      );


    return {

      aspects:
        aspects.length
          ? aspects
          : cloneArray(
              capabilities.aspects
            ),

      durations:
        durations.length
          ? durations
          : cloneArray(
              capabilities.durations
            ),

      resolutions:
        resolutions.length
          ? resolutions
          : cloneArray(
              capabilities.resolutions
            ),

      imageSupported:
        imageSupported,

      maxImages:
        Number.isFinite(maxImages)
          ? maxImages
          : 1

    };

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


    if (
      GENZ.upload &&
      Array.isArray(
        GENZ.upload.images
      ) &&
      GENZ.upload.images.length
    ) {
      return true;
    }


    const input =
      $('image');


    return Boolean(
      input &&
      input.files &&
      input.files.length
    );

  }


  /* =======================================================
     IMAGE AVAILABILITY
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


  function modelSupportsImage(
    provider,
    model
  ) {

    const rules =
      getModelRules(
        provider,
        model
      );


    if (
      rules &&
      rules.imageReferenceSupported !== undefined
    ) {

      return (
        rules.imageReferenceSupported === true
      );

    }


    const modelCapabilities =
      getModelCapabilities(
        provider,
        model
      );


    if (
      modelCapabilities.imageSupported === true
    ) {

      return true;

    }


    const builtin =
      BUILTIN_MODEL_CAPABILITIES[
        normalizeId(model)
      ];


    if (
      builtin?.reference?.imageSupported === true
    ) {

      return true;

    }


    return null;

  }


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

      imageInput.disabled = false;

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


      imageInput.disabled = true;

      imageInput.setAttribute(
        'aria-disabled',
        'true'
      );


      return;

    }


    imageInput.disabled = false;

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
        rules.referenceToVideo ||
        rules.imageToVideo ||
        rules.image2video ||
        null
      );

    }


    return (
      rules.textToVideo ||
      rules.text2video ||
      null
    );

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


    const modelCapabilities =
      getModelCapabilities(
        provider,
        model
      );


    const modeRules =
      getModeRules(
        provider,
        model,
        hasImage
      );


    if (modeRules) {

      const values =
        normalizeNumberArray(
          Object.keys(
            modeRules
          )
        );


      if (values.length) {
        return values;
      }

    }


    if (
      modelCapabilities.durations.length
    ) {

      return cloneArray(
        modelCapabilities.durations
      );

    }


    if (
      capabilities.durations.length
    ) {

      return cloneArray(
        capabilities.durations
      );

    }


    return [];

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


    const modelCapabilities =
      getModelCapabilities(
        provider,
        model
      );


    const modeRules =
      getModeRules(
        provider,
        model,
        hasImage
      );


    const numericDuration =
      Number(duration);


    if (
      modeRules &&
      Number.isFinite(
        numericDuration
      )
    ) {

      const key =
        String(
          numericDuration
        );


      const allowed =
        modeRules[key];


      if (
        Array.isArray(
          allowed
        ) &&
        allowed.length
      ) {

        return uniqueArray(
          allowed
        );

      }

    }


    if (
      modelCapabilities.resolutions.length
    ) {

      return cloneArray(
        modelCapabilities.resolutions
      );

    }


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

    const element =
      $(id);


    if (!element) {
      return '';
    }


    const list =
      uniqueArray(
        values
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
      current.length === list.length &&
      current.every(
        function (value, index) {
          return (
            value ===
            String(
              list[index]
            )
          );
        }
      );


    if (same) {

      if (
        previous &&
        list.includes(
          previous
        )
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


    element.innerHTML =
      '';


    if (!list.length) {

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
      list.includes(
        previous
      )
    ) {

      element.value =
        previous;

      return previous;

    }


    element.value =
      String(
        list[0]
      );


    return String(
      list[0]
    );

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
      getEffectiveCapabilities(
        provider
      )
        .models
        .map(
          function (value) {
            return String(value);
          }
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
    provider,
    model
  ) {

    const modelCapabilities =
      getModelCapabilities(
        provider,
        model
      );


    const allowed =
      modelCapabilities.aspects.length
        ? modelCapabilities.aspects
        : getEffectiveCapabilities(
            provider
          ).aspects;


    [
      $('ratio'),
      $('aspect')
    ].forEach(
      function (element) {

        if (!element) {
          return;
        }


        if (!allowed.length) {
          return;
        }


        if (
          !allowed.includes(
            text(
              element.value
            )
          )
        ) {

          element.value =
            allowed[0];

        }

      }
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
        '#generateBtn, [data-generate-button]'
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


    const providerReady =
      Boolean(
        getProviderId(provider)
      );


    const enabled =
      Boolean(
        providerReady &&
        model &&
        duration &&
        resolution &&
        resolution !== ''
      );


    buttons.forEach(
      function (button) {

        button.disabled =
          !enabled;


        button.style.setProperty(
          'display',
          'inline-flex',
          'important'
        );


        button.style.setProperty(
          'align-items',
          'center',
          'important'
        );


        button.style.setProperty(
          'justify-content',
          'center',
          'important'
        );


        button.style.setProperty(
          'width',
          '100%',
          'important'
        );


        button.style.setProperty(
          'min-height',
          '48px',
          'important'
        );


        button.style.setProperty(
          'height',
          '48px',
          'important'
        );


        button.style.setProperty(
          'padding',
          '0 24px',
          'important'
        );


        button.style.setProperty(
          'border',
          '0',
          'important'
        );


        button.style.setProperty(
          'border-radius',
          '999px',
          'important'
        );


        button.style.setProperty(
          'background-color',
          '#198754',
          'important'
        );


        button.style.setProperty(
          'color',
          '#ffffff',
          'important'
        );


        button.style.setProperty(
          'font-weight',
          '700',
          'important'
        );


        button.style.setProperty(
          'font-size',
          '15px',
          'important'
        );


        button.style.setProperty(
          'cursor',
          enabled
            ? 'pointer'
            : 'not-allowed',
          'important'
        );


        button.style.setProperty(
          'opacity',
          '1',
          'important'
        );

      }
    );

  }


  /* =======================================================
     ACTIVE PROVIDER BUTTON
  ======================================================= */

  function updateActiveButton(
    providerId
  ) {

    const normalizedProviderId =
      normalizeId(
        providerId
      );


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
            normalizedProviderId;


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


      setOptions(
        'model',
        getEffectiveCapabilities(
          provider
        ).models,
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


      const modelCapabilities =
        getModelCapabilities(
          provider,
          model
        );


      const aspects =
        modelCapabilities.aspects.length
          ? modelCapabilities.aspects
          : getEffectiveCapabilities(
              provider
            ).aspects;


      if (aspects.length) {

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
          provider,
          model
        );

      }


      const hasImage =
        hasImageReference();


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


        const preferred =
          allowedDurations.includes(8)
            ? '8'
            : (
                allowedDurations.length
                  ? String(
                      allowedDurations[0]
                    )
                  : ''
              );


        duration =
          applyDurationRules(
            provider,
            preferred
          );

      }


      if (!duration) {

        duration =
          text(
            $('duration')?.value
          );

      }


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
              String(
                compatibleDuration
              )
            );

        }

      }


      resolution =
        applyResolutionRules(
          provider,
          text(
            $('resolution')?.value
          )
        );


      GENZ.state.provider =
        getProviderId(provider);


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
          $('ratio')?.value ||
          $('aspect')?.value
        );


      updateGenerateButton(
        provider
      );


      updateActiveButton(
        getProviderId(provider)
      );

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


    const providerId =
      getProviderId(provider);


    if (!providerId) {

      console.error(
        '[GEN-Z.AI] Provider tidak memiliki ID:',
        provider
      );

      return;

    }


    GENZ.state.provider =
      providerId;


    GENZ.providers.current =
      providerId;


    GENZ.providers.currentProvider =
      provider;


    setValue(
      'provider',
      providerId
    );


    refreshCurrentOptions(
      'provider'
    );


    updateGenerateButton(
      provider
    );


    updateActiveButton(
      providerId
    );

  }


  /* =======================================================
     PROVIDER EVENT
  ======================================================= */

  function dispatchProviderChange(
    provider
  ) {

    const providerId =
      getProviderId(provider);


    if (!providerId) {
      return;
    }


    document.dispatchEvent(
      new CustomEvent(
        'genz-provider-change',
        {
          detail: {

            provider:
              provider,

            id:
              providerId,

            name:
              getProviderName(provider),

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

        const providerId =
          getProviderId(provider);


        if (!providerId) {
          return;
        }


        const button =
          document.createElement(
            'button'
          );


        button.type =
          'button';


        button.className =
          'provider-button';


        button.dataset.provider =
          providerId;


        button.dataset.providerId =
          providerId;


        button.textContent =
          getProviderName(provider);


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
          button.dataset.providerId ||
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
      true;


    placeholder.setAttribute(
      'aria-disabled',
      'true'
    );


    fragment.appendChild(
      placeholder
    );


    providers.forEach(
      function (provider) {

        const providerId =
          getProviderId(provider);


        const providerName =
          getProviderName(provider);


        if (!providerId) {
          return;
        }


        const option =
          document.createElement(
            'option'
          );


        /*
         * PENTING:
         *
         * value = Provider ID
         * text  = Provider Name
         *
         * Nama provider tidak pernah
         * digunakan sebagai identity.
         */

        option.value =
          providerId;


        option.dataset.providerId =
          providerId;


        option.dataset.providerName =
          providerName;


        option.textContent =
          providerName;


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


    const selected =
      providers.find(
        function (provider) {

          return (
            normalizeId(
              getProviderId(provider)
            ) ===
            normalizeId(
              previous
            )
          );

        }
      );


    if (selected) {

      element.value =
        getProviderId(selected);

    } else if (providers.length) {

      element.value =
        getProviderId(
          providers[0]
        );

    } else {

      element.value =
        '';

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


    const result = [];


    list.forEach(
      function (provider) {

        if (!provider) {
          return;
        }


        if (
          provider.enabled ===
          false
        ) {

          return;

        }


        /*
         * Provider ID WAJIB berasal
         * dari provider.id/providerId.
         *
         * Jangan pernah menggunakan
         * provider.name sebagai ID.
         */

        const id =
          getProviderId(
            provider
          );


        if (!id) {

          console.warn(
            '[GEN-Z.AI] Provider diabaikan karena tidak memiliki ID:',
            provider
          );

          return;

        }


        const name =
          getProviderName(
            provider
          );


        const normalizedProvider = {

          ...provider,

          id:
            id,

          name:
            name,

          adapter:
            text(
              provider.adapter ||
              ''
            ),

          capabilities:
            normalizeCapabilities(
              provider
            )

        };


        result.push(
          normalizedProvider
        );

      }
    );


    return result;

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


    if (!normalized) {
      return null;
    }


    return (
      providers.find(
        function (provider) {

          return (
            normalizeId(
              getProviderId(
                provider
              )
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

    /*
     * providerId harus berupa ID.
     * Nama provider tidak diterima
     * sebagai identity.
     */

    const provider =
      findProvider(
        providerId
      );


    if (!provider) {

      console.warn(
        '[GEN-Z.AI] Provider ID tidak ditemukan:',
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
                normalizeId(
                  getProviderId(provider)
                ) ===
                normalizeId(
                  requested
                )
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

        /*
         * element.value = PROVIDER ID
         */

        const providerId =
          text(
            element.value
          );


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
      document.documentElement.dataset
        .providerCapabilityListenersAttached ===
      'true'
    ) {

      return;

    }


    document.documentElement.dataset
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
    function (
      providerId
    ) {

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
