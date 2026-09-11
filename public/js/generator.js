/* GEN-Z.AI - Generator Dispatcher */

(function () {
  'use strict';

  window.GENZ = window.GENZ || {};

  GENZ.generator =
    GENZ.generator || {};

  GENZ.generator.busy = false;

  const MODULES = {

    veo:
      '/js/providers/veo.js',

    minimax:
      '/js/providers/minimax.js',

    luma:
      '/js/providers/luma.js'

  };

  function getValue(
    id,
    fallback = ''
  ) {

    const element =
      document.getElementById(id);

    if (!element) {
      return fallback;
    }

    return element.value;
  }

  function getImageData() {

    if (
      GENZ.state &&
      GENZ.state.imageData
    ) {
      return GENZ.state.imageData;
    }

    if (
      GENZ.upload &&
      GENZ.upload.imageData
    ) {
      return GENZ.upload.imageData;
    }

    return null;
  }

  function collectInput() {

    const provider =
      getValue(
        'provider',
        GENZ.state.provider || 'veo'
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
        getValue('prompt')
          .trim(),

      model:
        getValue('model'),

      duration:
        getValue('duration'),

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
      MODULES[provider];

    if (!modulePath) {

      throw new Error(
        'Provider tidak didukung: ' +
        provider
      );
    }

    /*
     * Jangan load ulang module
     * yang sudah tersedia.
     */
    if (
      !GENZ.videoProviders ||
      !GENZ.videoProviders[provider]
    ) {

      await import(
        modulePath
      );
    }

    const adapter =
      GENZ.videoProviders &&
      GENZ.videoProviders[provider];

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
      !GENZ.auth.token
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
        .catch(() => ({}));

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

    const token =
      await getToken();

    const started =
      Date.now();

    const timeout =
      10 * 60 * 1000;

    while (
      Date.now() - started <
      timeout
    ) {

      await new Promise(
        resolve =>
          setTimeout(
            resolve,
            2500
          )
      );

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
          .catch(() => ({}));

      if (!response.ok) {

        throw new Error(
          data.error ||
          'Gagal memeriksa status video.'
        );
      }

      const status =
        String(
          data.status || ''
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

        const videoResponse =
          await fetch(
            '/api/video?jobId=' +
            encodeURIComponent(jobId),
            {

              headers: {

                Authorization:
                  'Bearer ' + token

              }

            }
          );

        if (videoResponse.ok) {

          const contentType =
            videoResponse
              .headers
              .get(
                'content-type'
              ) || '';

          if (
            contentType.includes(
              'video/'
            )
          ) {

            const blob =
              await videoResponse
                .blob();

            return URL.createObjectURL(
              blob
            );
          }

          const body =
            await videoResponse
              .json()
              .catch(
                () => ({})
              );

          if (
            body.url ||
            body.videoUrl
          ) {

            return (
              body.url ||
              body.videoUrl
            );
          }
        }

        throw new Error(
          'Video selesai tetapi hasil tidak ditemukan.'
        );
      }
    }

    throw new Error(
      'Proses generate video melebihi batas waktu.'
    );
  }

  async function showVideo(
    url
  ) {

    /*
     * Protected video endpoint.
     */
    if (
      GENZ.video &&
      GENZ.video.fetchProtected &&
      /^\\//.test(url)
    ) {

      await GENZ.video
        .fetchProtected(url);

      return url;
    }

    /*
     * Direct URL.
     */
    if (
      GENZ.video &&
      GENZ.video.show
    ) {

      GENZ.video.show(url);
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

      throw new Error(
        'Prompt wajib diisi.'
      );
    }

    GENZ.generator.busy =
      true;

    try {

      /*
       * 1. Load adapter provider.
       */
      const adapter =
        await loadProvider(
          input.provider
        );

      /*
       * 2. Provider sendiri
       * menentukan payload.
       */
      const payload =
        await adapter.generate(
          input
        );

      /*
       * 3. Kirim ke Worker.
       */
      const result =
        await requestGenerate(
          payload
        );

      /*
       * 4. Jika Worker langsung
       * mengembalikan URL video.
       */
      const directUrl =
        result.videoUrl ||
        result.url ||
        result.outputUrl;

      if (directUrl) {

        return showVideo(
          directUrl
        );
      }

      /*
       * 5. Ambil Job ID.
       */
      const jobId =
        result.jobId ||
        result.id ||
        result.job?.id;

      if (!jobId) {

        throw new Error(
          'Server tidak mengembalikan job ID atau URL video.'
        );
      }

      /*
       * 6. Poll sampai selesai.
       */
      const videoUrl =
        await pollJob(
          jobId
        );

      /*
       * 7. Tampilkan video.
       */
      return showVideo(
        videoUrl
      );

    } finally {

      GENZ.generator.busy =
        false;
    }
  }

  /*
   * Event delegation.
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

      generate()
        .catch(error => {

          console.error(
            'GEN-Z.AI generate error:',
            error
          );

          alert(
            error.message ||
            'Generate video gagal.'
          );
        });

    }
  );

  /*
   * Compatibility API lama.
   */
  window.generateVideo =
    generate;

  /*
   * GEN-Z event bus.
   */
  if (GENZ.on) {

    GENZ.on(
      'generate-video',
      () => {

        generate()
          .catch(
            console.error
          );

      }
    );
  }

  GENZ.generator.generate =
    generate;

  GENZ.generator.collectInput =
    collectInput;

  GENZ.generator.loadProvider =
    loadProvider;

})();
