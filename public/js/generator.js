/* =========================================================
   GEN-Z.AI
   generator.js
   Main generator dispatcher

   Arsitektur:
   Browser
      ↓
   /api/generate
      ↓
   worker.js
      ↓
   provider adapter
      ↓
   Gemini / MiniMax / Luma

   Provider adapter TIDAK dimuat di browser.
   API key tetap server-side.
   ========================================================= */

(function () {
  'use strict';

  const POLL_INTERVAL = 2500;
  const MAX_POLL_TIME = 10 * 60 * 1000;

  let pollTimer = null;
  let pollStartedAt = 0;

  function $(selector) {
    return document.querySelector(selector);
  }

  function getGenerateButton() {
    return (
      $('#generateVideo') ||
      $('#generateBtn') ||
      document.querySelector(
        '[data-action="generate-video"]'
      )
    );
  }

  function getStatusElement() {
    return $('#status');
  }

  function setStatus(message, type) {
    const el = getStatusElement();

    if (!el) return;

    el.textContent = message || '';

    el.classList.remove(
      'success',
      'error',
      'loading',
      'warning'
    );

    if (type) {
      el.classList.add(type);
    }
  }

  function setButtonLoading(loading) {
    const button = getGenerateButton();

    if (!button) return;

    if (loading) {
      if (!button.dataset.originalText) {
        button.dataset.originalText =
          button.textContent || 'Generate Video';
      }

      button.disabled = true;
      button.textContent = 'Generating...';

      button.setAttribute(
        'aria-busy',
        'true'
      );

    } else {
      button.disabled = false;

      if (button.dataset.originalText) {
        button.textContent =
          button.dataset.originalText;

        delete button.dataset.originalText;
      }

      button.removeAttribute(
        'aria-busy'
      );
    }
  }

  function stopPolling() {
    if (pollTimer) {
      clearTimeout(pollTimer);
      pollTimer = null;
    }

    if (
      window.GENZ &&
      GENZ.video
    ) {
      GENZ.video.poll = null;
    }
  }

  function getValue(
    selectors,
    fallback
  ) {
    for (const selector of selectors) {
      const el = $(selector);

      if (
        el &&
        el.value !== undefined
      ) {
        return el.value;
      }
    }

    return fallback;
  }

  /*
   * =========================================================
   * COLLECT INPUT
   * =========================================================
   *
   * Provider TIDAK boleh memiliki fallback "veo".
   *
   * Provider harus berasal dari:
   *
   * /api/providers
   *
   * dan dipilih oleh user.
   *
   * Jika kosong:
   * generate() akan menolak request.
   */

  function collectInput() {
    const provider = String(
      getValue(
        ['#provider'],
        ''
      )
    ).trim();

    const prompt = String(
      getValue(
        ['#prompt'],
        ''
      )
    ).trim();

    const model = String(
      getValue(
        ['#model'],
        ''
      )
    ).trim();

    const duration =
      getValue(
        ['#duration'],
        ''
      );

    const aspectRatio = String(
      getValue(
        ['#ratio', '#aspect'],
        ''
      )
    ).trim();

    const resolution = String(
      getValue(
        ['#resolution'],
        ''
      )
    ).trim();

    let imageData = null;

    if (
      window.GENZ &&
      GENZ.state &&
      GENZ.state.imageData
    ) {
      imageData =
        GENZ.state.imageData;
    }

    if (
      !imageData &&
      window.GENZ &&
      GENZ.upload &&
      GENZ.upload.imageData
    ) {
      imageData =
        GENZ.upload.imageData;
    }

    return {
      provider,
      prompt,
      model,
      duration,
      aspectRatio,
      resolution,
      imageData
    };
  }

  async function getToken() {
    if (
      window.GENZ &&
      GENZ.auth &&
      typeof GENZ.auth.token ===
        'function'
    ) {
      return await GENZ.auth.token();
    }

    if (
      window.GENZ_AUTH &&
      typeof GENZ_AUTH.token ===
        'function'
    ) {
      return await GENZ_AUTH.token();
    }

    return null;
  }

  async function postGenerate(
    payload
  ) {
    const token =
      await getToken();

    const headers = {
      'Content-Type':
        'application/json'
    };

    if (token) {
      headers.Authorization =
        `Bearer ${token}`;
    }

    const response =
      await fetch(
        '/api/generate',
        {
          method: 'POST',
          headers,
          credentials: 'include',
          body:
            JSON.stringify(payload)
        }
      );

    let data = null;

    try {
      data =
        await response.json();
    } catch (_) {
      data = null;
    }

    if (!response.ok) {
      const message =
        data?.error ||
        data?.message ||
        `HTTP ${response.status}`;

      throw new Error(
        message
      );
    }

    if (!data) {
      throw new Error(
        'Server tidak mengembalikan respons yang valid.'
      );
    }

    return data;
  }

  async function getJobStatus(
    jobId
  ) {
    const token =
      await getToken();

    const headers = {};

    if (token) {
      headers.Authorization =
        `Bearer ${token}`;
    }

    const url =
      `/api/generate/status?jobId=${encodeURIComponent(
        jobId
      )}`;

    const response =
      await fetch(
        url,
        {
          method: 'GET',
          headers,
          credentials: 'include'
        }
      );

    let data = null;

    try {
      data =
        await response.json();
    } catch (_) {
      data = null;
    }

    if (!response.ok) {
      const message =
        data?.error ||
        data?.message ||
        `HTTP ${response.status}`;

      throw new Error(
        message
      );
    }

    return data;
  }

  async function getVideo(
    jobId
  ) {
    const token =
      await getToken();

    const headers = {};

    if (token) {
      headers.Authorization =
        `Bearer ${token}`;
    }

    const url =
      `/api/video?jobId=${encodeURIComponent(
        jobId
      )}`;

    const response =
      await fetch(
        url,
        {
          method: 'GET',
          headers,
          credentials: 'include'
        }
      );

    if (!response.ok) {
      let message =
        `HTTP ${response.status}`;

      try {
        const data =
          await response.json();

        message =
          data?.error ||
          data?.message ||
          message;
      } catch (_) {}

      throw new Error(
        message
      );
    }

    const contentType =
      response.headers.get(
        'content-type'
      ) || '';

    if (
      contentType.includes(
        'application/json'
      )
    ) {
      return await response.json();
    }

    const blob =
      await response.blob();

    return {
      blob
    };
  }

  function findJobId(
    data
  ) {
    if (!data) {
      return null;
    }

    return (
      data.jobId ||
      data.job_id ||
      data.id ||
      data.job?.jobId ||
      data.job?.job_id ||
      data.job?.id ||
      data.data?.jobId ||
      data.data?.job_id ||
      data.data?.id ||
      null
    );
  }

  function findVideoUrl(
    data
  ) {
    if (!data) {
      return null;
    }

    return (
      data.videoUrl ||
      data.video_url ||
      data.url ||
      data.outputUrl ||
      data.output_url ||
      data.video?.url ||
      data.video?.uri ||
      data.data?.videoUrl ||
      data.data?.video_url ||
      data.data?.url ||
      data.data?.video?.url ||
      data.result?.videoUrl ||
      data.result?.video_url ||
      data.result?.url ||
      data.result?.video?.url ||
      null
    );
  }

  function normalizeStatus(
    data
  ) {
    if (!data) {
      return '';
    }

    return String(
      data.status ||
      data.state ||
      data.jobStatus ||
      data.job?.status ||
      data.data?.status ||
      data.data?.state ||
      data.data?.jobStatus ||
      ''
    ).toLowerCase();
  }

  function isCompleted(
    status
  ) {
    return [
      'completed',
      'complete',
      'succeeded',
      'success',
      'successful',
      'done',
      'finished',
      'ready'
    ].includes(status);
  }

  function isFailed(
    status
  ) {
    return [
      'failed',
      'failure',
      'error',
      'cancelled',
      'canceled',
      'rejected'
    ].includes(status);
  }

  async function displayVideo(
    data,
    jobId
  ) {
    let videoUrl =
      findVideoUrl(data);

    if (videoUrl) {
      if (
        GENZ.video &&
        typeof GENZ.video
          .fetchProtected ===
          'function'
      ) {
        try {
          await GENZ.video
            .fetchProtected(
              videoUrl
            );

          return;

        } catch (error) {
          console.warn(
            '[GEN-Z.AI] Protected video gagal:',
            error
          );
        }
      }

      if (
        GENZ.video &&
        typeof GENZ.video.show ===
          'function'
      ) {
        GENZ.video.show(
          videoUrl
        );

        return;
      }

      const video =
        $('#video');

      if (video) {
        video.src =
          videoUrl;

        video.load();
      }

      return;
    }

    if (!jobId) {
      throw new Error(
        'Video selesai tetapi Job ID tidak ditemukan.'
      );
    }

    const result =
      await getVideo(jobId);

    if (!result) {
      throw new Error(
        'Video selesai tetapi hasil video tidak ditemukan.'
      );
    }

    if (result.blob) {
      const objectUrl =
        URL.createObjectURL(
          result.blob
        );

      if (
        GENZ.video &&
        typeof GENZ.video.show ===
          'function'
      ) {
        GENZ.video.show(
          objectUrl
        );

      } else {
        const video =
          $('#video');

        if (video) {
          video.src =
            objectUrl;

          video.load();
        }
      }

      if (GENZ.state) {
        GENZ.state
          .currentVideoObjectUrl =
          objectUrl;
      }

      return;
    }

    const finalUrl =
      findVideoUrl(result);

    if (!finalUrl) {
      throw new Error(
        'Hasil video tidak memiliki URL.'
      );
    }

    if (
      GENZ.video &&
      typeof GENZ.video
        .fetchProtected ===
        'function'
    ) {
      try {
        await GENZ.video
          .fetchProtected(
            finalUrl
          );

        return;

      } catch (_) {}
    }

    if (
      GENZ.video &&
      typeof GENZ.video.show ===
        'function'
    ) {
      GENZ.video.show(
        finalUrl
      );

      return;
    }

    const video =
      $('#video');

    if (video) {
      video.src =
        finalUrl;

      video.load();
    }
  }

  async function pollJob(
    jobId
  ) {
    stopPolling();

    pollStartedAt =
      Date.now();

    if (
      GENZ &&
      GENZ.video
    ) {
      GENZ.video.poll =
        true;
    }

    return new Promise(
      (
        resolve,
        reject
      ) => {

        const check =
          async () => {
            try {
              if (
                Date.now() -
                  pollStartedAt >
                MAX_POLL_TIME
              ) {
                stopPolling();

                reject(
                  new Error(
                    'Proses generate video terlalu lama dan melewati batas waktu.'
                  )
                );

                return;
              }

              const data =
                await getJobStatus(
                  jobId
                );

              const status =
                normalizeStatus(
                  data
                );

              console.log(
                '[GEN-Z.AI] Job status:',
                status,
                data
              );

              if (status) {
                setStatus(
                  `Status: ${status}`,
                  'loading'
                );
              }

              const directUrl =
                findVideoUrl(
                  data
                );

              if (
                directUrl &&
                (
                  isCompleted(
                    status
                  ) ||
                  !status
                )
              ) {
                stopPolling();

                await displayVideo(
                  data,
                  jobId
                );

                resolve(
                  data
                );

                return;
              }

              if (
                isFailed(
                  status
                )
              ) {
                stopPolling();

                const message =
                  data?.error ||
                  data?.message ||
                  data?.job?.error ||
                  data?.data?.error ||
                  'Generate video gagal.';

                reject(
                  new Error(
                    message
                  )
                );

                return;
              }

              if (
                isCompleted(
                  status
                )
              ) {
                stopPolling();

                await displayVideo(
                  data,
                  jobId
                );

                resolve(
                  data
                );

                return;
              }

              pollTimer =
                setTimeout(
                  check,
                  POLL_INTERVAL
                );

              if (
                GENZ &&
                GENZ.video
              ) {
                GENZ.video.poll =
                  pollTimer;
              }

            } catch (error) {
              stopPolling();

              reject(
                error
              );
            }
          };

        check();
      }
    );
  }

  async function generate() {
    if (!window.GENZ) {
      throw new Error(
        'GENZ belum diinisialisasi.'
      );
    }

    stopPolling();

    const input =
      collectInput();

    /*
     * Provider wajib dipilih dari
     * provider yang dikirim backend.
     *
     * Tidak ada fallback ke "veo".
     */
    if (!input.provider) {
      setStatus(
        'Provider video belum dipilih.',
        'error'
      );

      throw new Error(
        'Provider video belum dipilih.'
      );
    }

    if (!input.prompt) {
      setStatus(
        'Prompt video wajib diisi.',
        'error'
      );

      throw new Error(
        'Prompt video wajib diisi.'
      );
    }

    setButtonLoading(
      true
    );

    setStatus(
      'Menyiapkan engine video...',
      'loading'
    );

    try {
      /*
       * =====================================================
       * PROVIDER DISPATCHER
       * =====================================================
       *
       * Browser TIDAK:
       *
       * - memuat provider adapter
       * - membaca API key
       * - memanggil API Gemini
       * - memanggil API MiniMax
       * - memanggil API Luma
       *
       * Browser hanya mengirim parameter.
       *
       * Worker yang menentukan:
       *
       * 1. Provider
       * 2. Database provider
       * 3. API key
       * 4. Adapter
       * 5. Generate job
       */

      setStatus(
        `Menyiapkan ${input.provider.toUpperCase()}...`,
        'loading'
      );

      const payload = {
        provider:
          input.provider,

        prompt:
          input.prompt,

        model:
          input.model,

        duration:
          input.duration,

        aspectRatio:
          input.aspectRatio,

        resolution:
          input.resolution,

        imageData:
          input.imageData || null
      };

      /*
       * Request tunggal ke Worker.
       */
      const response =
        await postGenerate(
          payload
        );

      console.log(
        '[GEN-Z.AI] Generate response:',
        response
      );

      /*
       * Jika backend langsung
       * memberikan URL video.
       */
      const directUrl =
        findVideoUrl(
          response
        );

      if (directUrl) {
        setStatus(
          'Video berhasil dibuat.',
          'success'
        );

        await displayVideo(
          response,
          findJobId(
            response
          )
        );

        return response;
      }

      /*
       * Normal flow:
       *
       * Worker mengembalikan Job ID.
       */
      const jobId =
        findJobId(
          response
        );

      if (!jobId) {
        throw new Error(
          response?.error ||
          response?.message ||
          'Server tidak mengembalikan Job ID.'
        );
      }

      /*
       * Simpan Job ID.
       */
      if (GENZ.state) {
        GENZ.state.currentJobId =
          jobId;
      }

      if (GENZ.video) {
        GENZ.video.currentJobId =
          jobId;
      }

      setStatus(
        'Video sedang diproses...',
        'loading'
      );

      const result =
        await pollJob(
          jobId
        );

      setStatus(
        'Video berhasil dibuat.',
        'success'
      );

      return result;

    } catch (error) {
      console.error(
        '[GEN-Z.AI] Generate video error:',
        error
      );

      stopPolling();

      setStatus(
        error?.message ||
        'Generate video gagal.',
        'error'
      );

      throw error;

    } finally {
      setButtonLoading(
        false
      );
    }
  }

  function handleGenerateClick(
    event
  ) {
    if (event) {
      event.preventDefault();
    }

    generate().catch(
      () => {}
    );
  }

  function initialize() {
    /*
     * Hindari listener ganda.
     */
    if (
      window.GENZ &&
      GENZ.generator &&
      GENZ.generator
        ._initialized
    ) {
      return;
    }

    document.addEventListener(
      'click',
      function (event) {
        const target =
          event.target.closest(
            '#generateVideo, #generateBtn, [data-action="generate-video"]'
          );

        if (!target) {
          return;
        }

        handleGenerateClick(
          event
        );
      }
    );

    if (!window.GENZ) {
      window.GENZ = {};
    }

    if (!GENZ.generator) {
      GENZ.generator = {};
    }

    GENZ.generator.generate =
      generate;

    GENZ.generator.initialize =
      initialize;

    GENZ.generator.stopPolling =
      stopPolling;

    GENZ.generator._initialized =
      true;
  }

  /*
   * =========================================================
   * PUBLIC API
   * =========================================================
   */

  window.generateVideo =
    generate;

  if (!window.GENZ) {
    window.GENZ = {};
  }

  GENZ.generator =
    GENZ.generator || {};

  GENZ.generator.generate =
    generate;

  GENZ.generator.initialize =
    initialize;

  GENZ.generator.stopPolling =
    stopPolling;

  /*
   * =========================================================
   * INITIALIZATION
   * =========================================================
   */

  if (
    document.readyState ===
    'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      initialize,
      {
        once: true
      }
    );
  } else {
    initialize();
  }

})();
