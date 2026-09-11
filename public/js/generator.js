(function () {
  'use strict';

  window.GENZ = window.GENZ || {};

  GENZ.generator =
    GENZ.generator || {};

  GENZ.generator.busy =
    false;

  GENZ.videoProviders =
    GENZ.videoProviders || {};

  const PROVIDER_MODULES = {
    veo:
      '/js/providers/veo.js',

    minimax:
      '/js/providers/minimax.js',

    luma:
      '/js/providers/luma.js'
  };

  function getElement(id) {
    return document.getElementById(id);
  }

  function getValue(
    id,
    fallback = ''
  ) {
    const element =
      getElement(id);

    if (!element) {
      return fallback;
    }

    return element.value;
  }

  function getImageData() {
    return (
      GENZ.state?.imageData ||
      GENZ.upload?.imageData ||
      null
    );
  }

  function collectInput() {
    const provider =
      getValue(
        'provider',
        GENZ.state?.provider ||
        'veo'
      );

    const aspect =
      getValue(
        'aspect',
        getValue(
          'ratio',
          '16:9'
        )
      );

    return {
      provider,

      prompt:
        getValue(
          'prompt'
        ).trim(),

      model:
        getValue(
          'model'
        ),

      duration:
        getValue(
          'duration'
        ),

      aspectRatio:
        aspect,

      resolution:
        getValue(
          'resolution',
          '720p'
        ),

      imageData:
        getImageData()
    };
  }

  async function loadProvider(
    provider
  ) {
    const modulePath =
      PROVIDER_MODULES[
        provider
      ];

    if (!modulePath) {
      throw new Error(
        'Provider tidak didukung: ' +
        provider
      );
    }

    if (
      !GENZ.videoProviders[
        provider
      ]
    ) {
      await import(
        modulePath
      );
    }

    const adapter =
      GENZ.videoProviders[
        provider
      ];

    if (!adapter) {
      throw new Error(
        'Provider ' +
        provider +
        ' belum termuat.'
      );
    }

    return adapter;
  }

  async function getToken() {
    if (
      !GENZ.auth ||
      typeof GENZ.auth.token !==
      'function'
    ) {
      throw new Error(
        'Sistem autentikasi belum siap.'
      );
    }

    const token =
      await GENZ.auth.token();

    if (!token) {
      throw new Error(
        'Sesi login tidak valid.'
      );
    }

    return token;
  }

  async function requestGenerate(
    payload
  ) {
    const token =
      await getToken();

    const response =
      await fetch(
        '/api/generate',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',

            Authorization:
              'Bearer ' + token
          },

          body:
            JSON.stringify(
              payload
            )
        }
      );

    const data =
      await response
        .json()
        .catch(
          () => ({})
        );

    if (!response.ok) {
      throw new Error(
        data.error ||
        data.message ||
        'Gagal memulai generate video.'
      );
    }

    return data;
  }

  async function pollJob(
    jobId
  ) {
    const started =
      Date.now();

    const timeout =
      10 * 60 * 1000;

    while (
      Date.now() -
      started <
      timeout
    ) {
      await new Promise(
        resolve =>
          setTimeout(
            resolve,
            2500
          )
      );

      const token =
        await getToken();

      const response =
        await fetch(
          '/api/generate/status',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',

              Authorization:
                'Bearer ' + token
            },

            body:
              JSON.stringify({
                jobId
              })
          }
        );

      const data =
        await response
          .json()
          .catch(
            () => ({})
          );

      if (!response.ok) {
        throw new Error(
          data.error ||
          data.message ||
          'Gagal memeriksa status video.'
        );
      }

      const status =
        String(
          data.status ||
          ''
        ).toLowerCase();

      if (
        status === 'failed' ||
        status === 'error'
      ) {
        throw new Error(
          data.error ||
          data.message ||
          'Generate video gagal.'
        );
      }

      const directUrl =
        data.videoUrl ||
        data.url ||
        data.outputUrl;

      if (directUrl) {
        return directUrl;
      }

      if (
        status === 'completed' ||
        status === 'succeeded' ||
        status === 'success'
      ) {
        return await fetchVideoResult(
          jobId
        );
      }
    }

    throw new Error(
      'Proses generate video melebihi batas waktu.'
    );
  }

  async function fetchVideoResult(
    jobId
  ) {
    const token =
      await getToken();

    const response =
      await fetch(
        '/api/video?jobId=' +
        encodeURIComponent(
          jobId
        ),
        {
          headers: {
            Authorization:
              'Bearer ' + token
          }
        }
      );

    if (!response.ok) {
      throw new Error(
        'Video selesai tetapi hasil tidak dapat diambil.'
      );
    }

    const contentType =
      response.headers.get(
        'content-type'
      ) || '';

    if (
      contentType.includes(
        'video/'
      )
    ) {
      const blob =
        await response.blob();

      return URL.createObjectURL(
        blob
      );
    }

    const data =
      await response
        .json()
        .catch(
          () => ({})
        );

    const url =
      data.videoUrl ||
      data.url ||
      data.outputUrl;

    if (!url) {
      throw new Error(
        'Video selesai tetapi URL hasil tidak ditemukan.'
      );
    }

    return url;
  }

  async function showVideo(
    url
  ) {
    if (!url) {
      throw new Error(
        'URL video kosong.'
      );
    }

    /*
     * URL internal/protected.
     */
    if (
      typeof url === 'string' &&
      url.startsWith('/') &&
      GENZ.video &&
      typeof GENZ.video.fetchProtected ===
      'function'
    ) {
      await GENZ.video.fetchProtected(
        url
      );

      return url;
    }

    /*
     * Blob URL atau URL publik.
     */
    if (
      GENZ.video &&
      typeof GENZ.video.show ===
      'function'
    ) {
      GENZ.video.show(
        url
      );
    }

    return url;
  }

  async function generate() {
    if (
      GENZ.generator.busy
    ) {
      return;
    }

    const input =
      collectInput();

    if (!input.prompt) {
      alert(
        'Prompt wajib diisi.'
      );
      return;
    }

    GENZ.generator.busy =
      true;

    try {
      const adapter =
        await loadProvider(
          input.provider
        );

      const payload =
        await adapter.generate(
          input
        );

      const result =
        await requestGenerate(
          payload
        );

      const directUrl =
        result.videoUrl ||
        result.url ||
        result.outputUrl;

      if (directUrl) {
        return await showVideo(
          directUrl
        );
      }

      const jobId =
        result.jobId ||
        result.id ||
        result.job?.id;

      if (!jobId) {
        throw new Error(
          'Server tidak mengembalikan job ID atau URL video.'
        );
      }

      const videoUrl =
        await pollJob(
          jobId
        );

      return await showVideo(
        videoUrl
      );

    } catch (error) {
      console.error(
        'GEN-Z.AI generate:',
        error
      );

      alert(
        error.message ||
        'Generate video gagal.'
      );

      throw error;

    } finally {
      GENZ.generator.busy =
        false;
    }
  }

  /*
   * Tombol Generate.
   */
  document.addEventListener(
    'click',
    event => {
      const button =
        event.target.closest(
          '#generateVideo, [data-action="generate-video"]'
        );

      if (!button) {
        return;
      }

      generate().catch(
        () => {}
      );
    }
  );

  /*
   * API kompatibilitas.
   */
  window.generateVideo =
    generate;

  GENZ.generator.generate =
    generate;

  GENZ.generator.collectInput =
    collectInput;

  GENZ.generator.loadProvider =
    loadProvider;

})();
