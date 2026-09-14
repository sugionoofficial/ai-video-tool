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

    // Default credit.
    //
    // Nilai ini nantinya dapat diubah
    // melalui Admin > Providers.

    default:
      2,

    // Credit berdasarkan durasi.
    //
    // Untuk sementara seluruh durasi menggunakan
    // nilai default model.
    //
    // Struktur ini sengaja dipisahkan agar nantinya
    // admin dapat menentukan harga berbeda per durasi.

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

    // Credit berdasarkan mode.

    mode: {

      text:
        2,

      reference:
        2

    },

    // Credit berdasarkan resolusi.

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

  modes: [

    "text",

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
      true,

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

    textToVideo: {

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

    },


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
      "16:9"

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
      "text"
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


  if (
    Number.isFinite(
      resolutionCredit
    ) &&
    resolutionCredit > 0
  ) {

    return Math.max(
      MODEL_CONFIG.credits.default,
      resolutionCredit
    );

  }


  if (
    Number.isFinite(
      durationCredit
    ) &&
    durationCredit > 0
  ) {

    return Math.max(
      MODEL_CONFIG.credits.default,
      durationCredit
    );

  }


  if (
    Number.isFinite(
      modeCredit
    ) &&
    modeCredit > 0
  ) {

    return Math.max(
      MODEL_CONFIG.credits.default,
      modeCredit
    );

  }


  return Number(
    MODEL_CONFIG.credits.default
  );

}


// ============================================================
// VALIDATION
// ============================================================

function validate(
  options = {}
) {

  const errors = [];


  const duration =
    Number(
      options.duration
    );


  const aspect =
    String(
      options.aspectRatio ||
      options.aspect ||
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
      "text"
    ).trim();


  if (
    !MODEL_CONFIG.durations.includes(
      duration
    )
  ) {

    errors.push(
      `Durasi ${duration} detik tidak didukung oleh ${MODEL_CONFIG.name}.`
    );

  }


  if (
    !MODEL_CONFIG.aspects.includes(
      aspect
    )
  ) {

    errors.push(
      `Aspect ratio ${aspect} tidak didukung oleh ${MODEL_CONFIG.name}.`
    );

  }


  if (
    !MODEL_CONFIG.resolutions.includes(
      resolution
    )
  ) {

    errors.push(
      `Resolusi ${resolution} tidak didukung oleh ${MODEL_CONFIG.name}.`
    );

  }


  if (
    !MODEL_CONFIG.modes.includes(
      mode
    )
  ) {

    errors.push(
      `Mode ${mode} tidak didukung oleh ${MODEL_CONFIG.name}.`
    );

  }


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
      "16:9"
    ).trim();


  const resolution =
    String(
      options.resolution ||
      "720P"
    ).trim();


  const prompt =
    String(
      options.prompt ||
      ""
    ).trim();


  const referenceImages =
    Array.isArray(
      options.referenceImages
    )
      ? options.referenceImages.filter(
          Boolean
        )
      : [];


  const referenceVideos =
    Array.isArray(
      options.referenceVideos
    )
      ? options.referenceVideos.filter(
          Boolean
        )
      : [];


  const mode =
    (
      referenceImages.length ||
      referenceVideos.length
    )
      ? "reference"
      : "text";


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
  // IMAGE REFERENCES
  // ==========================================================

  if (
    referenceImages.length
  ) {

    payload.images =
      referenceImages.slice(
        0,
        MODEL_CONFIG.reference.maxImages
      );

  }


  // ==========================================================
  // VIDEO REFERENCES
  // ==========================================================

  if (
    referenceVideos.length
  ) {

    payload.video_urls =
      referenceVideos.slice(
        0,
        MODEL_CONFIG.reference.maxVideos
      );

  }


  return {

    payload,

    mode

  };

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
            MODEL_CONFIG.constraints.textToVideo,

          referenceToVideo:
            MODEL_CONFIG.constraints.referenceToVideo

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
