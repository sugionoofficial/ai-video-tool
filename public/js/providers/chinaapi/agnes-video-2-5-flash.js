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

  credits: {
    default: 1,

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

    mode: {
      text: 1,
      reference: 1
    },

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

    size: "720P",

    n: 1
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

  const referenceImages =
    Array.isArray(
      options.referenceImages
    )
      ? options.referenceImages.filter(
          Boolean
        )
      : Array.isArray(options.images)
        ? options.images.filter(
            Boolean
          )
        : [];

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

  if (
    referenceImages.length >
    MODEL_CONFIG.reference.maxImages
  ) {
    errors.push(
      `Maksimal ${MODEL_CONFIG.reference.maxImages} gambar referensi untuk ${MODEL_CONFIG.name}.`
    );
  }

  if (
    mode === "reference" &&
    referenceImages.length === 0
  ) {
    errors.push(
      "Mode reference membutuhkan minimal satu gambar referensi."
    );
  }

  return {
    valid:
      errors.length === 0,

    errors
  };
}


// ============================================================
// REFERENCE PROMPT
// ============================================================

function buildReferencePrompt(
  prompt,
  referenceImages
) {
  const cleanPrompt =
    String(
      prompt || ""
    ).trim();

  const images =
    Array.isArray(
      referenceImages
    )
      ? referenceImages.filter(
          Boolean
        )
      : [];

  if (
    !images.length
  ) {
    return cleanPrompt;
  }

  /*
   * Agnes reference mode mendukung referensi
   * dengan penanda <Picture N>.
   *
   * Jangan hanya mengirim images tanpa menyebutkannya
   * di prompt karena model dapat memperlakukannya sebagai
   * referensi lemah.
   */

  const pictureReferences =
    images.map(
      (_, index) =>
        `<Picture ${index + 1}>`
    );

  const referenceInstruction =
    images.length === 1
      ? [
          "Use <Picture 1> as the primary visual reference.",
          "Preserve the same person, face identity, hairstyle, clothing, body appearance, and important visual characteristics from the reference image.",
          "Do not replace the person with a different person.",
          "Keep the identity consistent throughout the entire video."
        ].join(" ")
      : [
          `Use ${pictureReferences.join(" and ")} as the primary visual references.`,
          "Preserve the identity, appearance, clothing, and important visual characteristics from the reference images.",
          "Do not replace the referenced person or subject with a different person.",
          "Keep the referenced identity consistent throughout the entire video."
        ].join(" ");

  if (
    !cleanPrompt
  ) {
    return referenceInstruction;
  }

  return (
    `${referenceInstruction} ` +
    `Create the video according to this instruction: ${cleanPrompt}`
  );
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

  const rawPrompt =
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
      : Array.isArray(options.images)
        ? options.images.filter(
            Boolean
          )
        : [];

  const mode =
    referenceImages.length > 0
      ? "reference"
      : "text";

  const prompt =
    buildReferencePrompt(
      rawPrompt,
      referenceImages
    );

  const payload = {
    model: MODEL_ID,

    prompt,

    mode,

    seconds:
      String(duration),

    size:
      resolution,

    aspect_ratio:
      aspectRatio,

    n: 1
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
