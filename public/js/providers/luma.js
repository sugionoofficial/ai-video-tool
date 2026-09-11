(function () {
  'use strict';

  window.GENZ = window.GENZ || {};
  GENZ.videoProviders = GENZ.videoProviders || {};

  const CONFIG = {
    name: 'Luma',

    models: [
      'ray-2',
      'ray-flash-2'
    ],

    durations: [
      '5s',
      '9s'
    ],

    aspects: [
      '1:1',
      '16:9',
      '9:16',
      '4:3',
      '3:4',
      '21:9',
      '9:21'
    ],

    resolutions: [
      '720p',
      '1080p',
      '4k'
    ]
  };

  function validate(input) {
    if (!input.prompt) {
      throw new Error(
        'Prompt wajib diisi.'
      );
    }

    if (!CONFIG.models.includes(input.model)) {
      throw new Error(
        'Model Luma tidak valid.'
      );
    }

    if (!CONFIG.durations.includes(input.duration)) {
      throw new Error(
        'Durasi Luma harus 5s atau 9s.'
      );
    }

    if (!CONFIG.aspects.includes(input.aspectRatio)) {
      throw new Error(
        'Rasio Luma tidak valid.'
      );
    }

    if (input.imageData) {
      throw new Error(
        'Luma tidak menggunakan gambar referensi pada mode ini.'
      );
    }
  }

  async function generate(input) {
    validate(input);

    return {
      provider: 'luma',
      prompt: input.prompt,
      model: input.model,
      duration: input.duration,
      aspectRatio: input.aspectRatio,
      resolution: input.resolution,
      imageData: null
    };
  }

  GENZ.videoProviders.luma = {
    CONFIG,
    validate,
    generate
  };

})();
