/* =========================================================
   GEN-Z.AI
   public/js/generator.js

   Generator utama.
   Browser hanya berkomunikasi dengan Worker.
   API key provider tidak pernah berada di browser.
========================================================= */

(function () {
  "use strict";

  const GENZ = window.GENZ || (window.GENZ = {});
  GENZ.state = GENZ.state || {};

  const POLL_INTERVAL = 2500;
  const MAX_POLL_TIME = 10 * 60 * 1000;

  let pollTimer = null;
  let pollStartedAt = 0;
  let generating = false;

  function $(selector) {
    return document.querySelector(selector);
  }

  function generateButton() {
    return (
      $("#generateVideo") ||
      $("#generateBtn") ||
      document.querySelector('[data-action="generate-video"]')
    );
  }

  function setStatus(message, type) {
    const el = $("#status");
    if (!el) return;

    el.textContent = message || "";

    el.classList.remove(
      "success",
      "error",
      "loading",
      "warning"
    );

    if (type) {
      el.classList.add(type);
    }
  }

  function currentProvider() {
    if (GENZ.providers?.currentProvider) {
      return GENZ.providers.currentProvider;
    }

    const el = $("#provider");

    if (!el?.value) {
      return null;
    }

    if (typeof GENZ.providers?.find === "function") {
      return GENZ.providers.find(el.value);
    }

    return null;
  }

  function hasValidProvider() {
    const provider = currentProvider();

    const id = String(
      provider?.id || ""
    ).trim();

    return (
      Boolean(id) &&
      provider?.enabled !== false
    );
  }

  function updateButton() {
    const button = generateButton();

    if (!button || generating) {
      return;
    }

    const provider = currentProvider();

    if (!hasValidProvider()) {
      button.disabled = true;
      button.textContent = "Generate Video";
      return;
    }

    button.disabled = false;

    button.textContent =
      `Generate Video • ${String(
        provider?.name ||
        provider?.id ||
        ""
      ).trim()}`;
  }

  function setButtonLoading(loading) {
    const button = generateButton();

    if (!button) {
      return;
    }

    if (loading) {
      generating = true;

      button.dataset.originalText =
        button.textContent ||
        "Generate Video";

      button.disabled = true;

      button.textContent =
        "Generating...";

      button.setAttribute(
        "aria-busy",
        "true"
      );

      return;
    }

    generating = false;

    button.removeAttribute(
      "aria-busy"
    );

    if (button.dataset.originalText) {
      button.textContent =
        button.dataset.originalText;

      delete button.dataset.originalText;
    }

    updateButton();
  }

  function stopPolling() {
    if (pollTimer) {
      clearTimeout(pollTimer);
      pollTimer = null;
    }

    if (GENZ.video) {
      GENZ.video.poll = null;
    }
  }

  function getValue(
    selectors,
    fallback = ""
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

  function collectInput() {
    let imageData =
      GENZ.state?.imageData ||
      null;

    if (
      !imageData &&
      GENZ.upload?.imageData
    ) {
      imageData =
        GENZ.upload.imageData;
    }

    return {
      provider:
        String(
          getValue(
            ["#provider"],
            ""
          )
        ).trim(),

      prompt:
        String(
          getValue(
            ["#prompt"],
            ""
          )
        ).trim(),

      model:
        String(
          getValue(
            ["#model"],
            ""
          )
        ).trim(),

      duration:
        getValue(
          ["#duration"],
          ""
        ),

      aspectRatio:
        String(
          getValue(
            ["#ratio", "#aspect"],
            ""
          )
        ).trim(),

      resolution:
        String(
          getValue(
            ["#resolution"],
            ""
          )
        ).trim(),

      imageData:
        imageData || null
    };
  }

  async function getToken() {
    if (
      typeof GENZ.auth?.token ===
      "function"
    ) {
      return await GENZ.auth.token();
    }

    if (
      typeof window.GENZ_AUTH?.token ===
      "function"
    ) {
      return await window.GENZ_AUTH.token();
    }

    return null;
  }

  async function postGenerate(payload) {
    const token =
      await getToken();

    const headers = {
      "Content-Type":
        "application/json"
    };

    if (token) {
      headers.Authorization =
        `Bearer ${token}`;
    }

    const response =
      await fetch(
        "/api/generate",
        {
          method: "POST",
          headers,
          credentials: "include",
          body:
            JSON.stringify(payload)
        }
      );

    let data = null;

    try {
      data =
        await response.json();
    } catch (_) {}

    if (!response.ok) {
      throw new Error(
        data?.error ||
        data?.message ||
        `HTTP ${response.status}`
      );
    }

    if (!data) {
      throw new Error(
        "Server tidak mengembalikan respons yang valid."
      );
    }

    return data;
  }

  async function getJobStatus(jobId) {
    const token =
      await getToken();

    const provider =
      String(
        GENZ.state?.provider ||
        ""
      ).trim();

    if (!provider) {
      throw new Error(
        "Provider job tidak ditemukan."
      );
    }

    const headers = {
      "Content-Type":
        "application/json"
    };

    if (token) {
      headers.Authorization =
        `Bearer ${token}`;
    }

    /*
     * Worker menerima status
     * melalui POST.
     */
    const response =
      await fetch(
        "/api/generate/status",
        {
          method: "POST",
          headers,
          credentials: "include",

          body:
            JSON.stringify({
              provider,

              operationName:
                String(
                  GENZ.state?.externalId ||
                  jobId
                )
            })
        }
      );

    let data = null;

    try {
      data =
        await response.json();
    } catch (_) {}

    if (!response.ok) {
      throw new Error(
        data?.error ||
        data?.message ||
        `HTTP ${response.status}`
      );
    }

    return data;
  }

  async function getVideo(jobId) {
    const token =
      await getToken();

    const provider =
      String(
        GENZ.state?.provider ||
        ""
      ).trim();

    if (!provider) {
      throw new Error(
        "Provider video tidak ditemukan."
      );
    }

    const headers = {};

    if (token) {
      headers.Authorization =
        `Bearer ${token}`;
    }

    const url =
      `/api/video?provider=${encodeURIComponent(
        provider
      )}&jobId=${encodeURIComponent(
        jobId
      )}`;

    const response =
      await fetch(
        url,
        {
          method: "GET",
          headers,
          credentials: "include"
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

      throw new Error(message);
    }

    const contentType =
      response.headers.get(
        "content-type"
      ) || "";

    if (
      contentType.includes(
        "application/json"
      )
    ) {
      return await response.json();
    }

    return {
      blob:
        await response.blob()
    };
  }

  function findJobId(data) {
    return (
      data?.jobId ||
      data?.job_id ||
      data?.id ||
      data?.job?.jobId ||
      data?.job?.job_id ||
      data?.job?.id ||
      data?.data?.jobId ||
      data?.data?.job_id ||
      data?.data?.id ||
      data?.result?.jobId ||
      data?.result?.job_id ||
      data?.result?.id ||
      null
    );
  }

  function findVideoUrl(data) {
    return (
      data?.videoUrl ||
      data?.video_url ||
      data?.url ||
      data?.outputUrl ||
      data?.output_url ||
      data?.video?.url ||
      data?.video?.uri ||
      data?.data?.videoUrl ||
      data?.data?.video_url ||
      data?.data?.url ||
      data?.data?.video?.url ||
      data?.result?.videoUrl ||
      data?.result?.video_url ||
      data?.result?.url ||
      data?.result?.video?.url ||
      null
    );
  }

  function normalizeStatus(data) {
    return String(
      data?.status ||
      data?.state ||
      data?.jobStatus ||
      data?.job?.status ||
      data?.data?.status ||
      data?.data?.state ||
      data?.data?.jobStatus ||
      data?.result?.status ||
      ""
    )
      .trim()
      .toLowerCase();
  }

  function isCompleted(status) {
    return [
      "completed",
      "complete",
      "succeeded",
      "success",
      "successful",
      "done",
      "finished",
      "ready"
    ].includes(status);
  }

  function isFailed(status) {
    return [
      "failed",
      "failure",
      "error",
      "cancelled",
      "canceled",
      "rejected"
    ].includes(status);
  }

  async function displayVideo(
    data,
    jobId
  ) {
    const videoUrl =
      findVideoUrl(data);

    if (videoUrl) {
      if (
        typeof GENZ.video?.fetchProtected ===
        "function"
      ) {
        try {
          await GENZ.video.fetchProtected(
            videoUrl
          );

          return;
        } catch (error) {
          console.warn(
            "[GEN-Z.AI] Protected video gagal:",
            error
          );
        }
      }

      if (
        typeof GENZ.video?.show ===
        "function"
      ) {
        GENZ.video.show(
          videoUrl
        );

        return;
      }

      const video =
        $("#video");

      if (video) {
        video.src =
          videoUrl;

        video.load();
      }

      return;
    }

    if (!jobId) {
      throw new Error(
        "Video selesai tetapi Job ID tidak ditemukan."
      );
    }

    const result =
      await getVideo(jobId);

    if (result?.blob) {
      const objectUrl =
        URL.createObjectURL(
          result.blob
        );

      if (
        typeof GENZ.video?.show ===
        "function"
      ) {
        GENZ.video.show(
          objectUrl
        );
      } else {
        const video =
          $("#video");

        if (video) {
          video.src =
            objectUrl;

          video.load();
        }
      }

      GENZ.state.currentVideoObjectUrl =
        objectUrl;

      return;
    }

    const finalUrl =
      findVideoUrl(result);

    if (!finalUrl) {
      throw new Error(
        "Hasil video tidak memiliki URL."
      );
    }

    if (
      typeof GENZ.video?.fetchProtected ===
      "function"
    ) {
      try {
        await GENZ.video.fetchProtected(
          finalUrl
        );

        return;
      } catch (_) {}
    }

    if (
      typeof GENZ.video?.show ===
      "function"
    ) {
      GENZ.video.show(
        finalUrl
      );

      return;
    }

    const video =
      $("#video");

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
                    "Proses generate video terlalu lama dan melewati batas waktu."
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
                "[GEN-Z.AI] Job status:",
                status,
                data
              );

              if (status) {
                setStatus(
                  `Status: ${status}`,
                  "loading"
                );
              }

              if (
                isFailed(status)
              ) {
                stopPolling();

                const message =
                  data?.error ||
                  data?.message ||
                  data?.job?.error ||
                  data?.data?.error ||
                  data?.result?.error ||
                  "Generate video gagal.";

                reject(
                  new Error(
                    message
                  )
                );

                return;
              }

              if (
                isCompleted(status)
              ) {
                stopPolling();

                await displayVideo(
                  data,
                  jobId
                );

                resolve(data);

                return;
              }

              const directUrl =
                findVideoUrl(
                  data
                );

              if (
                directUrl &&
                !status
              ) {
                stopPolling();

                await displayVideo(
                  data,
                  jobId
                );

                resolve(data);

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
              reject(error);
            }
          };

        check();
      }
    );
  }

  function makeIdempotencyKey() {
    if (
      globalThis.crypto &&
      typeof globalThis.crypto.randomUUID ===
        "function"
    ) {
      return globalThis.crypto.randomUUID();
    }

    return (
      `${Date.now()}-` +
      Math.random()
        .toString(36)
        .slice(2)
    );
  }

  async function generate() {
    if (generating) {
      return;
    }

    if (!hasValidProvider()) {
      setStatus(
        "Pilih AI Engine terlebih dahulu.",
        "warning"
      );

      updateButton();
      return;
    }

    const input =
      collectInput();

    if (!input.provider) {
      setStatus(
        "AI Engine belum dipilih.",
        "warning"
      );

      updateButton();
      return;
    }

    if (!input.prompt) {
      setStatus(
        "Prompt belum diisi.",
        "warning"
      );

      updateButton();
      return;
    }

    stopPolling();

    if (
      typeof GENZ.video?.clear ===
      "function"
    ) {
      GENZ.video.clear();
    }

    setButtonLoading(true);

    setStatus(
      "Menyiapkan generate video...",
      "loading"
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
        "[GEN-Z.AI] Generate payload:",
        {
          ...payload,
          imageData:
            payload.imageData
              ? "[IMAGE DATA]"
              : null
        }
      );

      /*
       * Worker mewajibkan Idempotency-Key.
       * Header ini mencegah satu klik menghasilkan
       * beberapa job ketika request diulang.
       */
      const token =
        await getToken();

      const headers = {
        "Content-Type":
          "application/json",

        "Idempotency-Key":
          makeIdempotencyKey()
      };

      if (token) {
        headers.Authorization =
          `Bearer ${token}`;
      }

      const response =
        await fetch(
          "/api/generate",
          {
            method: "POST",
            headers,
            credentials: "include",
            body:
              JSON.stringify(
                payload
              )
          }
        );

      let responseData =
        null;

      try {
        responseData =
          await response.json();
      } catch (_) {}

      if (!response.ok) {
        throw new Error(
          responseData?.error ||
          responseData?.message ||
          `HTTP ${response.status}`
        );
      }

      if (!responseData) {
        throw new Error(
          "Server tidak mengembalikan respons yang valid."
        );
      }

      const jobId =
        findJobId(
          responseData
        );

      if (!jobId) {
        const immediateVideo =
          findVideoUrl(
            responseData
          );

        if (immediateVideo) {
          await displayVideo(
            responseData,
            null
          );

          setStatus(
            "Video berhasil dibuat.",
            "success"
          );

          return;
        }

        throw new Error(
          "Server tidak mengembalikan Job ID."
        );
      }

      GENZ.state.jobId =
        jobId;

      GENZ.state.provider =
        input.provider;

      GENZ.state.externalId =
        responseData.externalId ||
        responseData.external_id ||
        responseData.operationName ||
        responseData.taskId ||
        responseData.id ||
        null;

      setStatus(
        "Video sedang diproses...",
        "loading"
      );

      await pollJob(
        jobId
      );

      setStatus(
        "Video berhasil dibuat.",
        "success"
      );

      if (
        typeof GENZ.account?.refresh ===
        "function"
      ) {
        try {
          await GENZ.account.refresh();
        } catch (_) {}
      }
    } catch (error) {
      console.error(
        "[GEN-Z.AI] Generate error:",
        error
      );

      setStatus(
        error?.message ||
        "Generate video gagal.",
        "error"
      );
    } finally {
      setButtonLoading(false);
    }
  }

  function bindGenerateButton() {
    const button =
      generateButton();

    if (!button) {
      return false;
    }

    if (
      button.dataset
        .generatorListenerAttached ===
      "true"
    ) {
      updateButton();
      return true;
    }

    button.dataset
      .generatorListenerAttached =
      "true";

    button.addEventListener(
      "click",
      event => {
        event.preventDefault();
        generate();
      }
    );

    updateButton();

    return true;
  }

  function bindProviderChange() {
    if (
      document.documentElement
        .dataset
        .generatorProviderListenerAttached ===
      "true"
    ) {
      return;
    }

    document.documentElement
      .dataset
      .generatorProviderListenerAttached =
      "true";

    document.addEventListener(
      "genz-provider-change",
      () => {
        if (!generating) {
          updateButton();
        }
      }
    );
  }

  function bindNativeProviderSelect() {
    const select =
      $("#provider");

    if (!select) {
      return false;
    }

    if (
      select.dataset
        .generatorProviderSelectAttached ===
      "true"
    ) {
      return true;
    }

    select.dataset
      .generatorProviderSelectAttached =
      "true";

    select.addEventListener(
      "change",
      () => {
        setTimeout(
          () => {
            if (!generating) {
              updateButton();
            }
          },
          0
        );
      }
    );

    return true;
  }

  function init() {
    bindProviderChange();
    bindNativeProviderSelect();

    let attempts = 0;

    const timer =
      setInterval(
        () => {
          attempts++;

          const ready =
            bindGenerateButton();

          if (
            ready ||
            attempts >= 40
          ) {
            clearInterval(
              timer
            );
          }
        },
        250
      );
  }

  GENZ.generator = {
    init,
    generate,
    stopPolling,
    collectInput,
    updateButtonState:
      updateButton
  };

  GENZ.generateVideo =
    generate;

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      init,
      { once: true }
    );
  } else {
    init();
  }
})();
