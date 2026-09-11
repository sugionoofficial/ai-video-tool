/* GEN-Z.AI - MiniMax Provider */

(function () {
  'use strict';

  const CONFIG = {
    name: 'MiniMax',

    models: [
      'MiniMax-Hailuo-2.3',
      'MiniMax-Hailuo-2.3-Fast',
      'MiniMax-Hailuo-02'
    ],

    durations: [
      6,
      10
    ],

    aspects: [
      '16:9',
      '9:16'
    ],

    resolutions: [
      '512P',
      '768P',
      '1080P'
    ]
  };

  function validate(input) {
    const duration = Number(input.duration);

    if (!CONFIG.models.includes(input.model)) {
      throw new Error(
        'Model MiniMax tidak valid.'
      );
    }

    if (!CONFIG.durations.includes(duration)) {
      throw new Error(
        'Durasi MiniMax harus 6 atau 10 detik.'
      );
    }

    if (!CONFIG.resolutions.includes(input.resolution)) {
      throw new Error(
        'Resolusi MiniMax tidak valid.'
      );
    }

    /*
     * MiniMax 1080P hanya 6 detik.
     */
    if (
      input.resolution === '1080P' &&
      duration !== 6
    ) {
      throw new Error(
        'MiniMax 1080P hanya dapat digunakan dengan durasi 6 detik.'
      );
    }

    /*
     * MiniMax Fast membutuhkan gambar referensi.
     */
    if (
      input.model === 'MiniMax-Hailuo-2.3-Fast' &&
      !input.imageData
    ) {
      throw new Error(
        'MiniMax Fast membutuhkan gambar referensi.'
      );
    }
  }

  async function generate(input) {
    validate(input);

    return {
      provider: 'minimax',

      prompt: input.prompt,

      model: input.model,

      duration: Number(input.duration),

      resolution: input.resolution,

      imageData: input.imageData || null
    };
  }

  window.GENZ = window.GENZ || {};

  GENZ.videoProviders =
    GENZ.videoProviders || {};

  GENZ.videoProviders.minimax = {
    CONFIG,
    validate,
    generate
  };

})();
