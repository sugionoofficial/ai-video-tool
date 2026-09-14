// ============================================================
// GEN-Z.AI
// CHINAAPI MODEL CONFIG
// AGNES VIDEO 2.5 FLASH
// ============================================================

const MODEL_ID = "agnes-video-2.5-flash";

const MODEL_CONFIG = {
  id: MODEL_ID,

  name: "Agnes Video 2.5 Flash",

  provider: "chinaapi",

  active: true,

  // ==========================================================
  // CREDIT
  // ==========================================================
  //
  // Nilai ini menjadi nilai default.
  // Nantinya dapat diubah melalui halaman Admin > Providers.
  //
  credits: {
    default: 1,

    // Apabila admin mengatur credit berdasarkan durasi,
    // nilai berikut dapat digunakan oleh sistem.
    duration: {
      4: 1,
      5: 1,
      6: 1,
      7: 1,
      8: 1,
      9: 1,
      10: 1,
      11: 1,
      12: 1
    },

    // Credit berdasarkan mode.
    mode: {
      text: 1,
      reference: 1
    },

    // Credit berdasarkan resolusi.
    resolution: {
      "720P": 1
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
    12
  ],

  // ==========================================================
  // ASPECT RATIO
  // ==========================================================

  aspects: [
    "16:9",
    "9:16",
    "4:3",
    "3:4",
    "1:1",
    "21:9"
  ],

  // ==========================================================
  // RESOLUSI
  // ==========================================================

  resolutions: [
    "720P"
  ],

  // ==========================================================
  // REFERENCE
  // ==========================================================

  reference: {
    imageSupported: true,

    maxImages: 5,

    videoSupported: false,

    maxVideos: 0
  },

  // ==========================================================
  // CONSTRAINTS
  // ==========================================================

  constraints: {
    textToVideo: {
      4: ["720P"],
      5: ["720P"],
      6: ["720P"],
      7: ["720P"],
      8: ["720P"],
      9: ["720P"],
      10: ["720P"],
      11: ["720P"],
      12: ["720P"]
    },

    referenceToVideo: {
      4: ["720P"],
      5: ["720P"],
      6: ["720P"],
      7: ["720P"],
      8: ["720P"],
      9: ["720P"],
      10: ["720P"],
      11: ["720P"],
      12: ["720P"]
    }
  },

  // ==========================================================
  // PAYLOAD DEFAULT
  // ==========================================================

  payload: {
    model: MODEL_ID,

    size: "720P"
  }
};


// ============================================================
// CREDIT CALCULATOR
// ============================================================

function calculateCredits(options = {}) {
  const duration =
    Number(options.duration) || 4;

  const mode =
    String(options.mode || "text");

  const resolution =
    String(options.resolution || "720P");

  const durationCredit =
    Number(
      MODEL_CONFIG.credits.duration[duration]
    );

  const modeCredit =
    Number(
      MODEL_CONFIG.credits.mode[mode]
    );

  const resolutionCredit =
    Number(
      MODEL_CONFIG.credits.resolution[resolution]
    );

  const values = [
    durationCredit,
    modeCredit,
    resolutionCredit
  ];

  if (
    values.some(
      value =>
        !Number.isFinite(value) ||
        value <= 0
    )
  ) {
    return Number(
      MODEL_CONFIG.credits.default
    );
  }

  /*
   * Untuk sekarang credit model menggunakan
   * nilai tertinggi dari aturan yang tersedia.
   *
   * Ini mencegah credit terhitung 3x hanya karena
   * duration + mode + resolution sama-sama memiliki
   * nilai default.
   *
   * Nantinya Admin dapat menentukan formula final.
   */
  return Math.max(
    MODEL_CONFIG.credits.default,
    durationCredit,
    modeCredit,
    resolutionCredit
  );
}


// ============================================================
// VALIDATION
// ============================================================

function validate(options = {}) {
  const errors = [];

  const duration =
    Number(options.duration);

  const aspect =
    String(
      options.aspectRatio ||
      options.aspect ||
      ""
    );

  const resolution =
    String(
      options.resolution ||
      ""
    );

  const mode =
    String(
      options.mode ||
      "text"
    );

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

function buildPayload(options = {}) {
  const duration =
    Number(options.duration) || 4;

  const aspectRatio =
    String(
      options.aspectRatio ||
      options.aspect ||
      "16:9"
    );

  const resolution =
    String(
      options.resolution ||
      "720P"
    );

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

  const mode =
    referenceImages.length > 0
      ? "reference"
      : "text";

  const payload = {
    model: MODEL_ID,

    prompt,

    mode,

    seconds:
      String(duration),

    size:
      resolution,

    aspect_ratio:
      aspectRatio
  };

  if (
    referenceImages.length > 0
  ) {
    payload.images =
      referenceImages.slice(
        0,
        MODEL_CONFIG.reference.maxImages
      );
  }

  return payload;
}


// ============================================================
// PUBLIC MODEL API
// ============================================================

const AgnesVideo25Flash = {
  id: MODEL_CONFIG.id,

  name: MODEL_CONFIG.name,

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
    AgnesVideo25Flash;
}

if (
  typeof globalThis !== "undefined"
) {
  globalThis.GENZ_CHINAAPI_AGNES_VIDEO_25 =
    AgnesVideo25Flash;
}
