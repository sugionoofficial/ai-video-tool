// ============================================================
// GEN-Z.AI
// CHINAAPI MODEL CONFIG
// DOUBAO SEEDANCE 2.0 MINI
// ============================================================

const MODEL_ID =
  "doubao-seedance-2-0-mini-260615";

const MODEL_CONFIG = {

  id:
    MODEL_ID,

  name:
    "Doubao Seedance 2.0 Mini",

  provider:
    "chinaapi",

  active:
    true,


  // ==========================================================
  // CREDIT
  // ==========================================================

  credits: {

    default:
      2,

    duration: {

      4: 2,
      5: 2,
      6: 2,
      7: 2,
      8: 2,
      9: 2,
      10: 2,
      11: 2,
      12: 2,
      13: 2,
      14: 2,
      15: 2

    },

    mode: {

      reference:
        2

    },

    resolution: {

      "480P":
        1,

      "720P":
        2

    }

  },


  // ==========================================================
  // MODE
  // ==========================================================

  // Seedance 2.0 Mini menggunakan reference input.
  // Text-only generation tidak diaktifkan di konfigurasi ini.

  modes: [

    "reference"

  ],


  // ==========================================================
  // DURASI
  // ==========================================================

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


  // ==========================================================
  // ASPECT RATIO
  // ==========================================================

  aspects: [

    "21:9",
    "16:9",
    "4:3",
    "1:1",
    "3:4",
    "9:16"

  ],


  // ==========================================================
  // RESOLUSI
  // ==========================================================

  resolutions: [

    "480P",
    "720P"

  ],


  // ==========================================================
  // REFERENCE
  // ==========================================================

  reference: {

    imageSupported:
      true,

    maxImages:
      9,

    videoSupported:
      true,

    maxVideos:
      3,

    maxTotalVideoSeconds:
      15

  },


  // ==========================================================
  // FEATURES
  // ==========================================================

  features: {

    textToVideo:
      false,

    imageToVideo:
      true,

    firstFrame:
      true,

    firstAndLastFrame:
      true,

    referenceToVideo:
      true,

    videoReference:
      true,

    videoEditing:
      true,

    videoExtension:
      true,

    audioGeneration:
      true,

    webSearch:
      true

  },


  // ==========================================================
  // CONSTRAINTS
  // ==========================================================

  constraints: {

    // Text-only generation sengaja tidak diaktifkan.
    textToVideo: {},


    referenceToVideo: {

      4: [
        "480P",
        "720P"
      ],

      5: [
        "480P",
        "720P"
      ],

      6: [
        "480P",
        "720P"
      ],

      7: [
        "480P",
        "720P"
      ],

      8: [
        "480P",
        "720P"
      ],

      9: [
        "480P",
        "720P"
      ],

      10: [
        "480P",
        "720P"
      ],

      11: [
        "480P",
        "720P"
      ],

      12: [
        "480P",
        "720P"
      ],

      13: [
        "480P",
        "720P"
      ],

      14: [
        "480P",
        "720P"
      ],

      15: [
        "480P",
        "720P"
      ]

    }

  },


  // ==========================================================
  // API
  // ==========================================================

  api: {

    endpoint:
      "/video/generations",

    method:
      "POST",

    statusEndpoint:
      "/video/generations/{task_id}"

  },


  // ==========================================================
  // PAYLOAD DEFAULT
  // ==========================================================

  payload: {

    model:
      MODEL_ID,

    resolution:
      "720P",

    duration:
      5,

    aspectRatio:
      "16:9",

    mode:
      "reference"

  }

};


// ============================================================
// CREDIT CALCULATOR
// ============================================================

function calculateCredits(
  options = {}
) {

  const duration =
    Number(
      options.duration
    ) || 5;

  const resolution =
    String(
      options.resolution ||
      "720P"
    ).trim();

  const mode =
    String(
      options.mode ||
      "reference"
    ).trim();


  const durationCredit =
    Number(
      MODEL_CONFIG
        .credits
        .duration[duration]
    );


  const resolutionCredit =
    Number(
      MODEL_CONFIG
        .credits
        .resolution[resolution]
    );


  const modeCredit =
    Number(
      MODEL_CONFIG
        .credits
        .mode[mode]
    );


  const validCredits = [

    durationCredit,
    resolutionCredit,
    modeCredit

  ].filter(
    value =>
      Number.isFinite(value) &&
      value > 0
  );


  if (
    validCredits.length === 0
  ) {

    return Number(
      MODEL_CONFIG.credits.default
    );

  }


  return Math.max(
    MODEL_CONFIG.credits.default,
    ...validCredits
  );

}


// ============================================================
// VALIDATION
// ============================================================

function validate(
  options = {}
) {

  const errors = [];


  // ==========================================================
  // BASIC OPTIONS
  // ==========================================================

  const duration =
    Number(
      options.duration
    );


  const aspect =
    String(
      options.aspectRatio ||
      options.aspect ||
      options.ratio ||
      ""
    ).trim();


  const resolution =
    String(
      options.resolution ||
      ""
    ).trim();


  const mode =
    String(
      options.mode ||
      "reference"
    ).trim();


  // ==========================================================
  // REFERENCES
  // ==========================================================

  const referenceImages =
    Array.isArray(
      options.referenceImages
    )
      ? options.referenceImages.filter(
          value =>
            typeof value === "string" &&
            value.trim()
        )
      : [];


  const referenceVideos =
    Array.isArray(
      options.referenceVideos
    )
      ? options.referenceVideos.filter(
          value =>
            typeof value === "string" &&
            value.trim()
        )
      : [];


  const hasReference =
    referenceImages.length > 0 ||
    referenceVideos.length > 0;


  // ==========================================================
  // DURATION
  // ==========================================================

  if (
    !MODEL_CONFIG.durations.includes(
      duration
    )
  ) {

    errors.push(
      `Durasi ${duration} detik tidak didukung oleh ${MODEL_CONFIG.name}.`
    );

  }


  // ==========================================================
  // ASPECT
  // ==========================================================

  if (
    !MODEL_CONFIG.aspects.includes(
      aspect
    )
  ) {

    errors.push(
      `Aspect ratio ${aspect} tidak didukung oleh ${MODEL_CONFIG.name}.`
    );

  }


  // ==========================================================
  // RESOLUTION
  // ==========================================================

  if (
    !MODEL_CONFIG.resolutions.includes(
      resolution
    )
  ) {

    errors.push(
      `Resolusi ${resolution} tidak didukung oleh ${MODEL_CONFIG.name}.`
    );

  }


  // ==========================================================
  // MODE
  // ==========================================================

  if (
    !MODEL_CONFIG.modes.includes(
      mode
    )
  ) {

    errors.push(
      `Mode ${mode} tidak didukung oleh ${MODEL_CONFIG.name}.`
    );

  }


  // ==========================================================
  // REFERENCE REQUIRED
  // ==========================================================

  if (
    !hasReference
  ) {

    errors.push(
      `${MODEL_CONFIG.name} membutuhkan minimal satu gambar atau video reference.`
    );

  }


  // ==========================================================
  // IMAGE REFERENCE LIMIT
  // ==========================================================

  if (
    referenceImages.length >
    MODEL_CONFIG.reference.maxImages
  ) {

    errors.push(
      `Maksimal ${MODEL_CONFIG.reference.maxImages} gambar reference.`
    );

  }


  // ==========================================================
  // VIDEO REFERENCE LIMIT
  // ==========================================================

  if (
    referenceVideos.length >
    MODEL_CONFIG.reference.maxVideos
  ) {

    errors.push(
      `Maksimal ${MODEL_CONFIG.reference.maxVideos} video reference.`
    );

  }


  // ==========================================================
  // VIDEO REFERENCE SUPPORT
  // ==========================================================

  if (
    referenceVideos.length > 0 &&
    !MODEL_CONFIG.reference.videoSupported
  ) {

    errors.push(
      `${MODEL_CONFIG.name} tidak mendukung video reference.`
    );

  }


  // ==========================================================
  // IMAGE REFERENCE SUPPORT
  // ==========================================================

  if (
    referenceImages.length > 0 &&
    !MODEL_CONFIG.reference.imageSupported
  ) {

    errors.push(
      `${MODEL_CONFIG.name} tidak mendukung image reference.`
    );

  }


  // ==========================================================
  // RESULT
  // ==========================================================

  return {

    valid:
      errors.length === 0,

    errors

  };

}


// ============================================================
// PAYLOAD BUILDER
// ============================================================

function buildPayload(
  options = {}
) {

  const duration =
    Number(
      options.duration
    ) || 5;


  const aspectRatio =
    String(
      options.aspectRatio ||
      options.aspect ||
      options.ratio ||
      "16:9"
    ).trim();


  const resolutionInput =
    String(
      options.resolution ||
      "720P"
    ).trim();


  const resolution =
    resolutionInput.toLowerCase();


  const prompt =
    String(
      options.prompt ||
      ""
    ).trim();


  const referenceImages =
    Array.isArray(
      options.referenceImages
    )
      ? options.referenceImages
          .filter(
            value =>
              typeof value === "string" &&
              value.trim()
          )
          .map(
            value =>
              value.trim()
          )
      : [];


  const referenceVideos =
    Array.isArray(
      options.referenceVideos
    )
      ? options.referenceVideos
          .filter(
            value =>
              typeof value === "string" &&
              value.trim()
          )
          .map(
            value =>
              value.trim()
          )
      : [];


  const hasReferences =
    referenceImages.length > 0 ||
    referenceVideos.length > 0;


  // ==========================================================
  // BASE PAYLOAD
  // ==========================================================

  const payload = {

    model:
      MODEL_ID,

    prompt,

    seconds:
      String(
        duration
      ),

    metadata: {

      resolution,

      ratio:
        aspectRatio

    }

  };


  // ==========================================================
  // REFERENCE CONTENT
  // ==========================================================

  if (
    hasReferences
  ) {

    const content = [];


    // ========================================================
    // IMAGE REFERENCES
    // ========================================================

    referenceImages
      .slice(
        0,
        MODEL_CONFIG.reference.maxImages
      )
      .forEach(
        image => {

          content.push({

            type:
              "image_url",

            image_url: {

              url:
                image

            },

            role:
              "reference_image"

          });

        }
      );


    // ========================================================
    // VIDEO REFERENCES
    // ========================================================

    referenceVideos
      .slice(
        0,
        MODEL_CONFIG.reference.maxVideos
      )
      .forEach(
        video => {

          content.push({

            type:
              "video_url",

            video_url: {

              url:
                video

            },

            role:
              "reference_video"

          });

        }
      );


    // ========================================================
    // CONTENT
    // ========================================================

    if (
      content.length > 0
    ) {

      payload.metadata.content =
        content;

    }

  }


  // ==========================================================
  // IMAGE FALLBACK
  // ==========================================================

  if (
    referenceImages.length > 0
  ) {

    payload.images =
      referenceImages.slice(
        0,
        MODEL_CONFIG.reference.maxImages
      );

  }


  // ==========================================================
  // VIDEO FALLBACK
  // ==========================================================

  if (
    referenceVideos.length > 0
  ) {

    payload.video_urls =
      referenceVideos.slice(
        0,
        MODEL_CONFIG.reference.maxVideos
      );

  }


  // ==========================================================
  // HARD FORCE MODEL
  // ==========================================================

  payload.model =
    MODEL_ID;


  // ==========================================================
  // HARD FORCE METADATA
  // ==========================================================

  payload.metadata =
    payload.metadata || {};


  payload.metadata.ratio =
    aspectRatio;


  payload.metadata.resolution =
    resolution;


  // ==========================================================
  // RETURN
  // ==========================================================

  return payload;

}


// ============================================================
// PUBLIC MODEL API
// ============================================================

const DoubaoSeedance20Mini = {

  id:
    MODEL_CONFIG.id,

  name:
    MODEL_CONFIG.name,

  provider:
    MODEL_CONFIG.provider,

  active:
    MODEL_CONFIG.active,

  capabilities:
    MODEL_CONFIG,

  getCredits:
    calculateCredits,

  calculateCredits,

  validate,

  buildPayload,


  // ==========================================================
  // MODEL INFO
  // ==========================================================

  info() {

    return {

      id:
        MODEL_CONFIG.id,

      name:
        MODEL_CONFIG.name,

      provider:
        MODEL_CONFIG.provider,

      active:
        MODEL_CONFIG.active,

      models: [
        MODEL_CONFIG.id
      ],

      durations:
        MODEL_CONFIG.durations,

      aspects:
        MODEL_CONFIG.aspects,

      resolutions:
        MODEL_CONFIG.resolutions,

      modes:
        MODEL_CONFIG.modes,

      constraints: {

        [MODEL_CONFIG.id]: {

          imageReferenceSupported:
            MODEL_CONFIG.reference.imageSupported,

          maxReferenceImages:
            MODEL_CONFIG.reference.maxImages,

          maxReferenceVideos:
            MODEL_CONFIG.reference.maxVideos,

          maxReferenceVideoSeconds:
            MODEL_CONFIG.reference.maxTotalVideoSeconds,

          modes:
            MODEL_CONFIG.modes,

          textToVideo:
            MODEL_CONFIG.features.textToVideo,

          referenceToVideo:
            MODEL_CONFIG.features.referenceToVideo

        }

      }

    };

  }

};


// ============================================================
// EXPORT
// ============================================================

if (
  typeof module !== "undefined" &&
  module.exports
) {

  module.exports =
    DoubaoSeedance20Mini;

}


if (
  typeof globalThis !== "undefined"
) {

  globalThis.GENZ_CHINAAPI_DOUBAO_SEEDANCE_20_MINI =
    DoubaoSeedance20Mini;

}
