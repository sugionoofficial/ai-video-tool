/* =========================================================
   GEN-Z.AI
   public/js/generator.js

   MAIN GENERATOR DISPATCHER

   Arsitektur:

   Browser
      ↓
   /api/generate
      ↓
   worker.js
      ↓
   Provider Adapter
      ↓
   Gemini / MiniMax / Luma

   Prinsip:
   - Tidak ada API key di browser
   - Tidak ada provider fallback palsu
   - Provider berasal dari /api/providers
   - Worker menentukan adapter
   - Generator hanya mengirim payload
   - Event listener tidak boleh terpasang ganda
   - Generate tidak aktif tanpa provider valid
========================================================= */

(function () {

  'use strict';


  const GENZ =
    window.GENZ ||
    (window.GENZ = {});


  GENZ.state =
    GENZ.state || {};


  const POLL_INTERVAL =
    2500;


  const MAX_POLL_TIME =
    10 * 60 * 1000;


  let pollTimer =
    null;


  let pollStartedAt =
    0;


  let generating =
    false;


  /* =======================================================
     DOM
  ======================================================= */

  function $(selector) {

    return document.querySelector(
      selector
    );

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


  /* =======================================================
     STATUS
  ======================================================= */

  function setStatus(
    message,
    type
  ) {

    const element =
      getStatusElement();


    if (!element) {

      return;

    }


    element.textContent =
      message || '';


    element.classList.remove(
      'success',
      'error',
      'loading',
      'warning'
    );


    if (type) {

      element.classList.add(
        type
      );

    }

  }


  /* =======================================================
     PROVIDER READINESS
  ======================================================= */

  function getCurrentProvider() {

    if (
      GENZ.providers &&
      GENZ.providers.currentProvider
    ) {

      return (
        GENZ.providers.currentProvider
      );

    }


    const providerElement =
      $('#provider');


    if (
      providerElement &&
      providerElement.value
    ) {

      if (
        GENZ.providers &&
        typeof GENZ.providers.find ===
          'function'
      ) {

        return GENZ.providers.find(
          providerElement.value
        );

      }

    }


    return null;

  }


  function hasValidProvider() {

    const provider =
      getCurrentProvider();


    if (!provider) {

      return false;

    }


    const id =
      String(
        provider.id || ''
      ).trim();


    if (!id) {

      return false;

    }


    const enabled =
      provider.enabled;


    if (
      enabled === false
    ) {

      return false;

    }


    return true;

  }


  /* =======================================================
     GENERATE BUTTON STATE
  ======================================================= */

  function updateGenerateButtonState() {

    const button =
      getGenerateButton();


    if (!button) {

      return;

    }


    /*
     * Selama proses generate,
     * generator sendiri yang mengontrol tombol.
     */

    if (generating) {

      return;

    }


    /*
     * Provider harus valid.
     */

    const ready =
      hasValidProvider();


    if (!ready) {

      button.disabled =
        true;

      button.textContent =
        'Generate Video';

      return;

    }


    const provider =
      getCurrentProvider();


    const name =
      String(
        provider?.name ||
        provider?.id ||
        ''
      ).trim();


    button.disabled =
      false;


    button.textContent =
      name
        ? `Generate Video • ${name}`
        : 'Generate Video';

  }


  function setButtonLoading(
    loading
  ) {

    const button =
      getGenerateButton();


    if (!button) {

      return;

    }


    if (loading) {

      generating =
        true;


      if (
        !button.dataset.originalText
      ) {

        button.dataset.originalText =
          button.textContent ||
          'Generate Video';

      }


      button.disabled =
        true;


      button.textContent =
        'Generating...';


      button.setAttribute(
        'aria-busy',
        'true'
      );


      return;

    }


    generating =
      false;


    if (
      button.dataset.originalText
    ) {

      button.textContent =
        button.dataset.originalText;


      delete button.dataset.originalText;

    }


    button.removeAttribute(
      'aria-busy'
    );


    /*
     * Jangan langsung:
     *
     * button.disabled = false
     *
     * karena provider.js juga
     * mengatur readiness.
     */

    updateGenerateButtonState();

  }


  /* =======================================================
     STOP POLLING
  ======================================================= */

  function stopPolling() {

    if (pollTimer) {

      clearTimeout(
        pollTimer
      );

      pollTimer =
        null;

    }


    if (
      GENZ.video
    ) {

      GENZ.video.poll =
        null;

    }

  }


  /* =======================================================
     GET VALUE
  ======================================================= */

  function getValue(
    selectors,
    fallback
  ) {

    for (
      const selector of selectors
    ) {

      const element =
        $(selector);


      if (
        element &&
        element.value !== undefined
      ) {

        return element.value;

      }

    }


    return fallback;

  }


  /* =======================================================
     COLLECT INPUT
  ======================================================= */

  function collectInput() {

    const provider =
      String(
        getValue(
          ['#provider'],
          ''
        )
      ).trim();


    const prompt =
      String(
        getValue(
          ['#prompt'],
          ''
        )
      ).trim();


    const model =
      String(
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


    const aspectRatio =
      String(
        getValue(
          ['#ratio', '#aspect'],
          ''
        )
      ).trim();


    const resolution =
      String(
        getValue(
          ['#resolution'],
          ''
        )
      ).trim();


    let imageData =
      null;


    if (
      GENZ.state &&
      GENZ.state.imageData
    ) {

      imageData =
        GENZ.state.imageData;

    }


    if (
      !imageData &&
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


  /* =======================================================
     AUTH TOKEN
  ======================================================= */

  async function getToken() {

    if (
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


  /* =======================================================
     POST GENERATE
  ======================================================= */

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

          method:
            'POST',

          headers,

          credentials:
            'include',

          body:
            JSON.stringify(
              payload
            )

        }
      );


    let data =
      null;


    try {

      data =
        await response.json();

    } catch (_) {

      data =
        null;

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


  /* =======================================================
     GET JOB STATUS
  ======================================================= */

  async function getJobStatus(
    jobId
  ) {

    const token =
      await getToken();


    const headers =
      {};


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

          method:
            'GET',

          headers,

          credentials:
            'include'

        }
      );


    let data =
      null;


    try {

      data =
        await response.json();

    } catch (_) {

      data =
        null;

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


  /* =======================================================
     GET VIDEO
  ======================================================= */

  async function getVideo(
    jobId
  ) {

    const token =
      await getToken();


    const headers =
      {};


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

          method:
            'GET',

          headers,

          credentials:
            'include'

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


  /* =======================================================
     FIND JOB ID
  ======================================================= */

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

      data.result?.jobId ||

      data.result?.job_id ||

      data.result?.id ||

      null

    );

  }


  /* =======================================================
     FIND VIDEO URL
  ======================================================= */

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


  /* =======================================================
     NORMALIZE STATUS
  ======================================================= */

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

      data.result?.status ||

      ''

    )
      .trim()
      .toLowerCase();

  }


  /* =======================================================
     COMPLETED
  ======================================================= */

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

    ].includes(
      status
    );

  }


  /* =======================================================
     FAILED
  ======================================================= */

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

    ].includes(
      status
    );

  }


  /* =======================================================
     DISPLAY VIDEO
  ======================================================= */

  async function displayVideo(
    data,
    jobId
  ) {

    const videoUrl =
      findVideoUrl(
        data
      );


    /*
     * Jika worker sudah mengembalikan
     * URL video, gunakan sistem protected
     * terlebih dahulu.
     */

    if (videoUrl) {

      if (
        GENZ.video &&
        typeof GENZ.video.fetchProtected ===
          'function'
      ) {

        try {

          await GENZ.video.fetchProtected(
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


    /*
     * Tidak ada URL.
     * Ambil video dari /api/video.
     */

    if (!jobId) {

      throw new Error(
        'Video selesai tetapi Job ID tidak ditemukan.'
      );

    }


    const result =
      await getVideo(
        jobId
      );


    if (!result) {

      throw new Error(
        'Video selesai tetapi hasil video tidak ditemukan.'
      );

    }


    /*
     * Backend mengembalikan blob.
     */

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


      GENZ.state
        .currentVideoObjectUrl =
        objectUrl;


      return;

    }


    /*
     * Backend mengembalikan URL
     * dalam JSON.
     */

    const finalUrl =
      findVideoUrl(
        result
      );


    if (!finalUrl) {

      throw new Error(
        'Hasil video tidak memiliki URL.'
      );

    }


    if (
      GENZ.video &&
      typeof GENZ.video.fetchProtected ===
        'function'
    ) {

      try {

        await GENZ.video.fetchProtected(
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


  /* =======================================================
     POLL JOB
  ======================================================= */

  async function pollJob(
    jobId
  ) {

    stopPolling();


    pollStartedAt =
      Date.now();


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
                  data?.result?.error ||
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


  /* =======================================================
     GENERATE
  ======================================================= */

  async function generate() {

    if (generating) {

      return;

    }


    /*
     * Provider wajib valid.
     */

    if (
      !hasValidProvider()
    ) {

      setStatus(
        'Pilih AI Engine terlebih dahulu.',
        'warning'
      );


      updateGenerateButtonState();


      return;

    }


    const input =
      collectInput();


    if (!input.provider) {

      setStatus(
        'AI Engine belum dipilih.',
        'warning'
      );


      updateGenerateButtonState();


      return;

    }


    if (!input.prompt) {

      setStatus(
        'Prompt belum diisi.',
        'warning'
      );


      updateGenerateButtonState();


      return;

    }


    /*
     * Stop polling lama.
     */

    stopPolling();


    /*
     * Bersihkan video lama.
     */

    if (
      GENZ.video &&
      typeof GENZ.video.clear ===
        'function'
    ) {

      GENZ.video.clear();

    }


    setButtonLoading(
      true
    );


    setStatus(
      'Menyiapkan generate video...',
      'loading'
    );


    try {

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
          input.imageData ||
          null

      };


      console.log(
        '[GEN-Z.AI] Generate payload:',
        {
          ...payload,
          imageData:
            payload.imageData
              ? '[IMAGE DATA]'
              : null
        }
      );


      const response =
        await postGenerate(
          payload
        );


      const jobId =
        findJobId(
          response
        );


      if (!jobId) {

        const immediateVideo =
          findVideoUrl(
            response
          );


        if (immediateVideo) {

          await displayVideo(
            response,
            null
          );


          setStatus(
            'Video berhasil dibuat.',
            'success'
          );


          return;

        }


        throw new Error(
          'Server tidak mengembalikan Job ID.'
        );

      }


      GENZ.state.jobId =
        jobId;


      GENZ.state.provider =
        input.provider;


      setStatus(
        'Video sedang diproses...',
        'loading'
      );


      await pollJob(
        jobId
      );


      setStatus(
        'Video berhasil dibuat.',
        'success'
      );


      /*
       * Refresh credit setelah
       * proses berhasil.
       */

      if (
        GENZ.account &&
        typeof GENZ.account.refresh ===
          'function'
      ) {

        try {

          await GENZ.account.refresh();

        } catch (_) {}

      }


    } catch (error) {

      console.error(
        '[GEN-Z.AI] Generate error:',
        error
      );


      setStatus(
        error?.message ||
          'Generate video gagal.',
        'error'
      );


    } finally {

      setButtonLoading(
        false
      );

    }

  }


  /* =======================================================
     EVENT BINDING
  ======================================================= */

  function bindGenerateButton() {

    const button =
      getGenerateButton();


    if (!button) {

      return false;

    }


    /*
     * Jangan pasang listener dua kali.
     */

    if (
      button.dataset
        .generatorListenerAttached ===
      'true'
    ) {

      updateGenerateButtonState();


      return true;

    }


    button.dataset
      .generatorListenerAttached =
      'true';


    button.addEventListener(
      'click',
      event => {

        event.preventDefault();


        generate();

      }
    );


    updateGenerateButtonState();


    return true;

  }


  /* =======================================================
     PROVIDER CHANGE EVENT
  ======================================================= */

  function bindProviderChange() {

    if (
      document.documentElement.dataset
        .generatorProviderListenerAttached ===
      'true'
    ) {

      return;

    }


    document.documentElement.dataset
      .generatorProviderListenerAttached =
      'true';


    document.addEventListener(
      'genz-provider-change',
      event => {

        console.log(
          '[GEN-Z.AI] Provider changed:',
          event.detail
        );


        if (!generating) {

          updateGenerateButtonState();

        }

      }
    );

  }


  /* =======================================================
     NATIVE PROVIDER SELECT
  ======================================================= */

  function bindNativeProviderSelect() {

    const select =
      $('#provider');


    if (!select) {

      return false;

    }


    if (
      select.dataset
        .generatorProviderSelectAttached ===
      'true'
    ) {

      return true;

    }


    select.dataset
      .generatorProviderSelectAttached =
      'true';


    select.addEventListener(
      'change',
      () => {

        /*
         * providers.js biasanya
         * sudah menangani perubahan.
         * Di sini kita hanya sinkronkan
         * tombol.
         */

        setTimeout(
          () => {

            if (!generating) {

              updateGenerateButtonState();

            }

          },
          0
        );

      }
    );


    return true;

  }


  /* =======================================================
     INITIALIZE
  ======================================================= */

  function init() {

    GENZ.generator =
      GENZ.generator || {};


    bindProviderChange();


    /*
     * Generator component dimuat
     * secara dinamis.
     *
     * Karena itu lakukan beberapa
     * kali pengecekan ringan.
     */

    const attempt =
      () => {

        bindGenerateButton();

        bindNativeProviderSelect();

        updateGenerateButtonState();

      };


    attempt();


    setTimeout(
      attempt,
      100
    );


    setTimeout(
      attempt,
      300
    );


    setTimeout(
      attempt,
      700
    );


    setTimeout(
      attempt,
      1200
    );


    return true;

  }


  /* =======================================================
     PUBLIC API
  ======================================================= */

  GENZ.generator =
    GENZ.generator || {};


  GENZ.generator.init =
    init;


  GENZ.generator.generate =
    generate;


  GENZ.generator.collectInput =
    collectInput;


  GENZ.generator.stopPolling =
    stopPolling;


  GENZ.generator.updateButton =
    updateGenerateButtonState;


  /*
   * Alias kompatibilitas.
   */

  GENZ.generateVideo =
    generate;


  window.generateVideo =
    generate;


  /* =======================================================
     DOM READY
  ======================================================= */

  if (
    document.readyState ===
    'loading'
  ) {

    document.addEventListener(
      'DOMContentLoaded',
      init,
      {
        once: true
      }
    );

  } else {

    init();

  }

})();
