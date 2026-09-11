/* GEN-Z.AI - Veo Provider */

(function () {
  'use strict';

  const CONFIG = {
    name: 'Gemini / Veo',

    models: [
      'veo-3.1-fast-generate-preview',
      'veo-3.1-generate-preview',
      'veo-3.1-lite-generate-preview'
    ],

    durations: [4, 6, 8],

    aspects: [
      '16:9',
      '9:16'
    ],

    resolutions: [
      '720p',
      '1080p',
      '4k'
    ]
  };

  function validate(input) {
    const duration = Number(input.duration);

    if (!CONFIG.models.includes(input.model)) {
      throw new Error('Model Veo tidak valid.');
    }

    if (!CONFIG.durations.includes(duration)) {
      throw new Error(
        'Durasi Veo harus 4, 6, atau 8 detik.'
      );
    }

    if (!CONFIG.aspects.includes(input.aspectRatio)) {
      throw new Error(
        'Rasio Veo harus 16:9 atau 9:16.'
      );
    }

    if (!CONFIG.resolutions.includes(input.resolution)) {
      throw new Error(
        'Resolusi Veo tidak valid.'
      );
    }

    /*
     * Veo:
     * - Gambar referensi membutuhkan 8 detik.
     * - Resolusi selain 720p membutuhkan 8 detik.
     */
    if (
      (input.resolution !== '720p' || input.imageData) &&
      duration !== 8
    ) {
      throw new Error(
        'Veo dengan gambar referensi atau resolusi di atas 720p harus menggunakan durasi 8 detik.'
      );
    }

    /*
     * Veo Lite tidak mendukung 4K.
     */
    if (
      input.model === 'veo-3.1-lite-generate-preview' &&
      input.resolution === '4k'
    ) {
      throw new Error(
        'Model Veo Lite tidak mendukung resolusi 4K.'
      );
    }
  }

  async function generate(input) {
    validate(input);

    return {
      provider: 'veo',

      prompt: input.prompt,

      model: input.model,

      duration: Number(input.duration),

      aspectRatio: input.aspectRatio,

      resolution: input.resolution,

      imageData: input.imageData || null
    };
  }

  window.GENZ = window.GENZ || {};

  GENZ.videoProviders =
    GENZ.videoProviders || {};

  GENZ.videoProviders.veo = {
    CONFIG,
    validate,
    generate
  };

})();
