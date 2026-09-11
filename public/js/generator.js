(function () {
  'use strict';

  window.GENZ = window.GENZ || {};
  GENZ.generator = GENZ.generator || {};
  GENZ.videoProviders = GENZ.videoProviders || {};

  const PROVIDER_MODULES = {
    veo: '/js/providers/veo.js',
    minimax: '/js/providers/minimax.js',
    luma: '/js/providers/luma.js'
  };

  GENZ.generator.busy = false;

  function $(id) {
    return document.getElementById(id);
  }

  function value(id, fallback = '') {
    const el = $(id);
    return el ? String(el.value || fallback) : fallback;
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
      value(
        'provider',
        GENZ.state?.provider || 'veo'
      ).toLowerCase();

    const aspectRatio =
      value(
        'ratio',
        value('aspect', '16:9')
      );

    return {
      provider,

      prompt:
        value('prompt').trim(),

      model:
        value('model'),

      duration:
        value('duration'),

      aspectRatio,

      resolution:
        value('resolution', '720p'),

      imageData:
        getImageData()
    };
  }

  async function loadProvider(provider) {
    const modulePath =
      PROVIDER_MODULES[provider];

    if (!modulePath) {
      throw new Error(
        'Provider tidak didukung: ' + provider
      );
    }

    if (!GENZ.videoProviders[provider]) {
      await import(modulePath);
    }

    const adapter =
      GENZ.videoProviders[provider];

    if (!adapter) {
      throw new Error(
        'Provider ' +
        provider +
        ' belum berhasil dimuat.'
      );
    }

    if (
      typeof adapter.generate !== 'function'
    ) {
      throw new Error(
        'Adapter provider ' +
        provider +
        ' tidak memiliki fungsi generate().'
      );
    }

    return adapter;
  }

  async function getToken() {
    if (
      !GENZ.auth ||
      typeof GENZ.auth.token !== 'function'
    ) {
      throw new Error(
        'Sistem autentikasi belum siap.'
      );
    }

    const token =
      await GENZ.auth.token();

    if (!token) {
      throw new Error(
        'Sesi login tidak valid. Silakan login kembali.'
      );
    }

    return token;
  }

  async function fetchJSON(
    url,
    options = {}
  ) {
    const response =
      await fetch(url, options);

    const data =
      await response
        .json()
        .catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.error ||
        data.message ||
        'Request gagal.'
      );
    }

    return data;
  }

  async function requestGenerate(payload) {
    const token =
      await getToken();

    return fetchJSON(
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
          JSON.stringify(payload)
      }
    );
  }

  async function checkStatus(jobId) {
    const token =
      await getToken();

    return fetchJSON(
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
  }

  async function pollJob(jobId) {
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

      const data =
        await checkStatus(jobId);

      const status =
        String(
          data.status || ''
        ).toLowerCase();

      if (
        status === 'failed' ||
        status === 'error' ||
        status === 'cancelled'
      ) {
        throw new Error(
          data.error ||
          data.message ||
          'Generate video gagal.'
        );
      }

      const directUrl =
        data.videoUrl ||
        data.video_url ||
        data.url ||
        data.outputUrl ||
        data.output_url;

      if (directUrl) {
        return directUrl;
      }

      if (
        status === 'completed' ||
        status === 'complete' ||
        status === 'succeeded' ||
        status === 'success' ||
        status === 'done'
      ) {
        return fetchVideoResult(jobId);
      }

      updateStatus(
        'Video sedang diproses... ' +
        (data.progress != null
          ? data.progress + '%'
          : '')
      );
    }

    throw new Error(
      'Proses generate video melebihi batas waktu 10 menit.'
    );
  }

  async function fetchVideoResult(jobId) {
    const token =
      await getToken();

    const response =
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

    if (!response.ok) {
      const data =
        await response
          .json()
          .catch(() => ({}));

      throw new Error(
        data.error ||
        data.message ||
        'Video selesai tetapi hasil tidak dapat diambil.'
      );
    }

    const contentType =
      response.headers.get(
        'content-type'
      ) || '';

    if (
      contentType.includes('video/')
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
        .catch(() => ({}));

    const url =
      data.videoUrl ||
      data.video_url ||
      data.url ||
      data.outputUrl ||
      data.output_url;

    if (!url) {
      throw new Error(
        'Video selesai tetapi URL hasil tidak ditemukan.'
      );
    }

    return url;
  }

  async function showVideo(url) {
    if (!url) {
      throw new Error(
        'URL video kosong.'
      );
    }

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

      showResult();

      return url;
    }

    if (
      GENZ.video &&
      typeof GENZ.video.show ===
        'function'
    ) {
      GENZ.video.show(url);
    } else {
      const video =
        $('video');

      if (video) {
        video.src = url;
        video.load();
      }

      const download =
        $('downloadVideo');

      if (download) {
        download.href = url;
      }
    }

    showResult();

    return url;
  }

  function updateStatus(message) {
    const status =
      $('status');

    if (status) {
      status.textContent =
        message || '';
    }
  }

  function showResult() {
    const result =
      $('videoResult');

    if (result) {
      result.classList.remove(
        'hidden'
      );
    }
  }

  function setBusy(busy) {
    const button =
      $('generateVideo') ||
      $('generateBtn');

    if (!button) {
      return;
    }

    button.disabled =
      busy;

    button.dataset.busy =
      busy ? 'true' : 'false';

    button.textContent =
      busy
        ? 'Generating...'
        : 'Generate Video';
  }

  async function generate() {
    if (GENZ.generator.busy) {
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

    setBusy(true);

    updateStatus(
      'Menyiapkan generator...'
    );

    try {
      const adapter =
        await loadProvider(
          input.provider
        );

      updateStatus(
        'Memvalidasi pengaturan ' +
        input.provider +
        '...'
      );

      /*
       * Validasi dan aturan khusus
       * sepenuhnya ditangani provider.
       */
      const payload =
        await adapter.generate(
          input
        );

      updateStatus(
        'Mengirim permintaan ke server...'
      );

      const result =
        await requestGenerate(
          payload
        );

      const directUrl =
        result.videoUrl ||
        result.video_url ||
        result.url ||
        result.outputUrl ||
        result.output_url;

      if (directUrl) {
        updateStatus(
          'Video berhasil dibuat.'
        );

        return await showVideo(
          directUrl
        );
      }

      const jobId =
        result.jobId ||
        result.job_id ||
        result.id ||
        result.job?.id;

      if (!jobId) {
        throw new Error(
          'Server tidak mengembalikan job ID atau URL video.'
        );
      }

      updateStatus(
        'Video sedang diproses...'
      );

      const videoUrl =
        await pollJob(jobId);

      updateStatus(
        'Video berhasil dibuat.'
      );

      return await showVideo(
        videoUrl
      );

    } catch (error) {
      console.error(
        'GEN-Z.AI generate error:',
        error
      );

      updateStatus(
        error.message ||
        'Generate video gagal.'
      );

      alert(
        error.message ||
        'Generate video gagal.'
      );

      throw error;

    } finally {
      GENZ.generator.busy =
        false;

      setBusy(false);
    }
  }

  /*
   * Event delegation.
   * Mendukung kedua ID agar kompatibel
   * dengan versi UI lama dan baru.
   */
  document.addEventListener(
    'click',
    event => {
      const button =
        event.target.closest(
          '#generateVideo, #generateBtn, [data-action="generate-video"]'
        );

      if (!button) {
        return;
      }

      if (
        button.disabled ||
        GENZ.generator.busy
      ) {
        return;
      }

      generate().catch(
        () => {}
      );
    }
  );

  /*
   * API publik.
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
