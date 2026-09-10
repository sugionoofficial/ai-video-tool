/* =========================================================
   GEN-Z.AI - VIDEO GENERATOR
   public/js/generator.js
========================================================= */

(function () {
  "use strict";

  const GENZ = window.GENZ;

  if (!GENZ) {
    console.error("[GEN-Z.AI] core.js belum dimuat.");
    return;
  }

  GENZ.generator = {
    busy: false,

    async getToken() {
      if (!GENZ.auth || typeof GENZ.auth.token !== "function") {
        throw new Error("Auth client belum siap.");
      }

      const token = await GENZ.auth.token();

      if (!token) {
        throw new Error("Sesi login tidak valid. Silakan login kembali.");
      }

      return token;
    },

    async generate() {
      if (this.busy) return;

      const promptEl = GENZ.$("prompt");
      const providerEl = GENZ.$("provider");
      const ratioEl = GENZ.$("ratio");
      const durationEl = GENZ.$("duration");
      const imageEl = GENZ.$("image");

      const prompt = promptEl
        ? promptEl.value.trim()
        : "";

      const provider = providerEl
        ? providerEl.value
        : GENZ.state.provider || "veo";

      const ratio = ratioEl
        ? ratioEl.value
        : "9:16";

      const duration = durationEl
        ? durationEl.value
        : "8";

      if (!prompt) {
        alert("Masukkan prompt terlebih dahulu.");
        return;
      }

      this.busy = true;
      GENZ.state.provider = provider;

      const generateBtn =
        GENZ.$("generateBtn") ||
        GENZ.$("generate") ||
        document.querySelector(
          "[data-action='generate']"
        );

      const statusEl =
        GENZ.$("status") ||
        GENZ.$("generateStatus") ||
        GENZ.$("videoStatus");

      const resultEl =
        GENZ.$("videoResult") ||
        GENZ.$("result");

      try {
        if (generateBtn) {
          generateBtn.disabled = true;

          generateBtn.dataset.originalText =
            generateBtn.textContent;

          generateBtn.textContent =
            "Generating...";
        }

        if (statusEl) {
          statusEl.classList.remove("error");
          statusEl.textContent =
            "Memeriksa sesi login...";
        }

        if (resultEl) {
          resultEl.classList.add("hidden");
        }

        if (
          GENZ.video &&
          typeof GENZ.video.clear === "function"
        ) {
          GENZ.video.clear();
        }

        /*
         * Pastikan token benar-benar sudah tersedia.
         */
        const token = await this.getToken();

        const payload = {
          provider,
          prompt,
          ratio,
          duration
        };

        /*
         * Image reference.
         *
         * Worker menggunakan imageData.
         */
        let imageData = null;

        if (GENZ.state.imageData) {
          imageData = GENZ.state.imageData;
        }

        if (
          !imageData &&
          GENZ.upload &&
          GENZ.upload.imageData
        ) {
          imageData = GENZ.upload.imageData;
        }

        if (
          !imageData &&
          imageEl &&
          imageEl.files &&
          imageEl.files[0]
        ) {
          throw new Error(
            "Gambar masih diproses. Tunggu sampai preview gambar selesai."
          );
        }

        if (imageData) {
          payload.imageData = imageData;
        }

        if (statusEl) {
          statusEl.textContent =
            "Mengirim permintaan ke AI...";
        }

        const response =
          await GENZ.fetchJSON(
            "/api/generate",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",

                Authorization:
                  `Bearer ${token}`
              },

              body:
                JSON.stringify(payload)
            }
          );

        if (!response) {
          throw new Error(
            "Server tidak memberikan respons."
          );
        }

        /*
         * Worker menghasilkan job.
         */
        const jobId =
          response.jobId ||
          response.job_id ||
          response.id ||
          response.taskId ||
          response.task_id;

        /*
         * Beberapa backend dapat langsung
         * memberikan URL video.
         */
        const directVideo =
          response.videoUrl ||
          response.video_url ||
          response.url;

        if (directVideo) {
          if (statusEl) {
            statusEl.classList.remove("error");

            statusEl.textContent =
              "Video berhasil dibuat.";
          }

          await this.showVideo(
            directVideo
          );

          return;
        }

        if (!jobId) {
          throw new Error(
            response.error ||
            response.message ||
            "Server tidak mengembalikan ID job."
          );
        }

        if (statusEl) {
          statusEl.textContent =
            `Job dibuat: ${jobId}`;
        }

        await this.pollStatus(
          jobId,
          statusEl
        );

      } catch (error) {
        console.error(
          "[GEN-Z.AI] Generate error:",
          error
        );

        if (statusEl) {
          statusEl.textContent =
            error.message ||
            "Gagal membuat video.";

          statusEl.classList.add(
            "error"
          );
        }

        alert(
          error.message ||
          "Gagal membuat video."
        );

      } finally {
        this.busy = false;

        if (generateBtn) {
          generateBtn.disabled = false;

          if (
            generateBtn.dataset.originalText
          ) {
            generateBtn.textContent =
              generateBtn.dataset.originalText;

            delete generateBtn.dataset.originalText;
          }
        }
      }
    },

    async pollStatus(jobId, statusEl) {
      const maxAttempts = 180;
      const interval = 3000;

      for (
        let attempt = 0;
        attempt < maxAttempts;
        attempt++
      ) {
        if (statusEl) {
          statusEl.classList.remove(
            "error"
          );

          statusEl.textContent =
            `Memproses video... ${attempt + 1}/${maxAttempts}`;
        }

        let token;

        try {
          token =
            await this.getToken();
        } catch (error) {
          throw error;
        }

        let response;

        try {
          response =
            await GENZ.fetchJSON(
              "/api/generate/status",
              {
                method: "POST",

                headers: {
                  "Content-Type":
                    "application/json",

                  Authorization:
                    `Bearer ${token}`
                },

                body:
                  JSON.stringify({
                    jobId,
                    job_id: jobId,
                    id: jobId
                  })
              }
            );

        } catch (error) {
          console.warn(
            "[GEN-Z.AI] Polling sementara gagal:",
            error
          );

          await this.sleep(
            interval
          );

          continue;
        }

        if (!response) {
          await this.sleep(
            interval
          );

          continue;
        }

        const status =
          String(
            response.status ||
            response.state ||
            response.jobStatus ||
            response.job_status ||
            ""
          ).toLowerCase();

        const videoUrl =
          response.videoUrl ||
          response.video_url ||
          response.url ||
          response.output?.videoUrl ||
          response.output?.video_url ||
          response.result?.videoUrl ||
          response.result?.video_url;

        /*
         * Video tersedia.
         */
        if (videoUrl) {
          if (statusEl) {
            statusEl.textContent =
              "Video berhasil dibuat.";
          }

          await this.showVideo(
            videoUrl
          );

          return;
        }

        /*
         * Status selesai tetapi URL
         * tidak dikirim.
         */
        if (
          status === "completed" ||
          status === "complete" ||
          status === "success" ||
          status === "succeeded" ||
          status === "done"
        ) {
          if (statusEl) {
            statusEl.textContent =
              "Mengambil hasil video...";
          }

          const protectedUrl =
            `/api/video?jobId=${encodeURIComponent(jobId)}`;

          await this.showVideo(
            protectedUrl
          );

          return;
        }

        /*
         * Job gagal.
         */
        if (
          status === "failed" ||
          status === "failure" ||
          status === "error" ||
          status === "cancelled" ||
          status === "canceled"
        ) {
          throw new Error(
            response.error ||
            response.message ||
            response.errorMessage ||
            "Generator video gagal."
          );
        }

        /*
         * Backend mengirim error
         * tanpa status gagal.
         */
        if (
          response.error &&
          typeof response.error === "string"
        ) {
          throw new Error(
            response.error
          );
        }

        await this.sleep(
          interval
        );
      }

      throw new Error(
        "Waktu proses video habis. Silakan coba lagi."
      );
    },

    async showVideo(url) {
      if (!url) {
        throw new Error(
          "URL video tidak ditemukan."
        );
      }

      /*
       * Endpoint protected.
       *
       * video.fetchProtected()
       * SUDAH mengembalikan object URL.
       *
       * Jangan panggil URL.createObjectURL()
       * untuk kedua kalinya.
       */
      if (
        url.startsWith("/api/video")
      ) {
        if (
          !GENZ.video ||
          typeof GENZ.video.fetchProtected !==
            "function"
        ) {
          throw new Error(
            "Modul video belum siap."
          );
        }

        const objectUrl =
          await GENZ.video.fetchProtected(
            url
          );

        GENZ.video.show(
          objectUrl
        );

        this.prepareDownload(
          objectUrl
        );

        return;
      }

      /*
       * URL video langsung.
       */
      if (
        GENZ.video &&
        typeof GENZ.video.show ===
          "function"
      ) {
        GENZ.video.show(
          url
        );
      }

      this.prepareDownload(
        url
      );
    },

    prepareDownload(url) {
      if (!url) return;

      const download =
        document.getElementById(
          "downloadVideo"
        ) ||
        document.getElementById(
          "download"
        );

      if (!download) {
        return;
      }

      download.href = url;
      download.download =
        "gen-z-ai-video.mp4";

      download.classList.remove(
        "hidden"
      );
    },

    sleep(ms) {
      return new Promise(
        resolve =>
          setTimeout(
            resolve,
            ms
          )
      );
    }
  };

  /*
   * Compatibility function.
   */
  window.generateVideo =
    function () {
      return GENZ.generator.generate();
    };

  /*
   * Tombol Generate.
   *
   * Karena generator.html dimuat
   * secara dinamis oleh app.js,
   * event delegation digunakan.
   */
  document.addEventListener(
    "click",
    function (event) {
      const button =
        event.target.closest(
          "#generateBtn, #generate, [data-action='generate']"
        );

      if (!button) return;

      event.preventDefault();

      GENZ.generator.generate();
    }
  );

  /*
   * Event compatibility.
   */
  GENZ.on(
    "generate-video",
    function () {
      GENZ.generator.generate();
    }
  );

})();
