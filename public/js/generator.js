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

    async generate() {
      if (this.busy) return;

      const promptEl = GENZ.$("prompt");
      const providerEl = GENZ.$("provider");
      const ratioEl = GENZ.$("ratio");
      const durationEl = GENZ.$("duration");
      const imageEl = GENZ.$("image");

      const prompt = promptEl ? promptEl.value.trim() : "";
      const provider = providerEl ? providerEl.value : GENZ.state.provider;
      const ratio = ratioEl ? ratioEl.value : "9:16";
      const duration = durationEl ? durationEl.value : "8";

      if (!prompt) {
        alert("Masukkan prompt terlebih dahulu.");
        return;
      }

      this.busy = true;
      GENZ.state.provider = provider;

      const generateBtn =
        GENZ.$("generateBtn") ||
        GENZ.$("generate") ||
        document.querySelector("[data-action='generate']");

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

          generateBtn.textContent = "Generating...";
        }

        if (statusEl) {
          statusEl.textContent = "Menyiapkan generator...";
          statusEl.classList.remove("error");
        }

        if (resultEl) {
          resultEl.classList.add("hidden");
        }

        if (GENZ.video && GENZ.video.clear) {
          GENZ.video.clear();
        }

        const payload = {
          provider,
          prompt,
          ratio,
          duration
        };

        /*
         * Jika ada gambar referensi, kirim data URL-nya.
         * Upload module menyimpan hasilnya di GENZ.state.imageData.
         */
        if (GENZ.state.imageData) {
          payload.image = GENZ.state.imageData;
          payload.imageData = GENZ.state.imageData;
        }

        /*
         * Fallback jika imageData belum tersedia,
         * tetapi input file masih mempunyai file.
         */
        if (
          !payload.image &&
          imageEl &&
          imageEl.files &&
          imageEl.files[0]
        ) {
          if (
            GENZ.upload &&
            GENZ.upload.imageData
          ) {
            payload.image = GENZ.upload.imageData;
            payload.imageData = GENZ.upload.imageData;
          }
        }

        if (statusEl) {
          statusEl.textContent = "Mengirim permintaan...";
        }

        const response = await GENZ.fetchJSON(
          "/api/generate",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${GENZ.auth.token()}`
            },
            body: JSON.stringify(payload)
          }
        );

        if (!response) {
          throw new Error(
            "Tidak ada respons dari server."
          );
        }

        /*
         * Backend dapat mengembalikan beberapa nama
         * untuk ID job. Kita dukung semuanya supaya
         * frontend tidak rapuh.
         */
        const jobId =
          response.jobId ||
          response.job_id ||
          response.id ||
          response.taskId ||
          response.task_id;

        /*
         * Jika backend langsung memberikan video,
         * tampilkan tanpa polling.
         */
        const directVideo =
          response.videoUrl ||
          response.video_url ||
          response.url;

        if (directVideo) {
          if (statusEl) {
            statusEl.textContent =
              "Video berhasil dibuat.";
          }

          await this.showVideo(directVideo);
          return;
        }

        if (!jobId) {
          throw new Error(
            response.error ||
            response.message ||
            "Server tidak mengembalikan ID proses video."
          );
        }

        if (statusEl) {
          statusEl.textContent =
            "Video sedang diproses...";
        }

        await this.pollStatus(jobId, statusEl);

      } catch (error) {
        console.error(
          "[GEN-Z.AI] Generate video error:",
          error
        );

        if (statusEl) {
          statusEl.textContent =
            error.message ||
            "Gagal membuat video.";

          statusEl.classList.add("error");
        }

        alert(
          error.message ||
          "Gagal membuat video."
        );

      } finally {
        this.busy = false;

        if (generateBtn) {
          generateBtn.disabled = false;

          if (generateBtn.dataset.originalText) {
            generateBtn.textContent =
              generateBtn.dataset.originalText;

            delete generateBtn.dataset.originalText;
          }
        }
      }
    },

    async pollStatus(jobId, statusEl) {
      /*
       * Pastikan polling lama dihentikan.
       */
      if (GENZ.video && GENZ.video.stopPolling) {
        GENZ.video.stopPolling();
      }

      const maxAttempts = 180;
      const interval = 3000;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {

        if (statusEl) {
          statusEl.textContent =
            `Memproses video... ${attempt + 1}/${maxAttempts}`;
        }

        let response;

        try {
          response = await GENZ.fetchJSON(
            "/api/generate/status",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization:
                  `Bearer ${GENZ.auth.token()}`
              },
              body: JSON.stringify({
                jobId,
                job_id: jobId,
                id: jobId
              })
            }
          );
        } catch (error) {
          console.error(
            "[GEN-Z.AI] Status polling error:",
            error
          );

          /*
           * Jangan langsung menghentikan proses hanya
           * karena satu request gagal.
           */
          await this.sleep(interval);
          continue;
        }

        if (!response) {
          await this.sleep(interval);
          continue;
        }

        const status = String(
          response.status ||
          response.state ||
          response.jobStatus ||
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
         * Video sudah tersedia.
         */
        if (
          videoUrl ||
          status === "completed" ||
          status === "complete" ||
          status === "success" ||
          status === "succeeded" ||
          status === "done"
        ) {
          if (videoUrl) {
            if (statusEl) {
              statusEl.textContent =
                "Video berhasil dibuat.";
            }

            await this.showVideo(videoUrl);
            return;
          }

          /*
           * Jika status selesai tetapi URL tidak diberikan,
           * coba ambil video melalui endpoint protected.
           */
          try {
            const protectedUrl =
              `/api/video?jobId=${encodeURIComponent(jobId)}`;

            if (statusEl) {
              statusEl.textContent =
                "Mengambil hasil video...";
            }

            await this.showVideo(protectedUrl);
            return;

          } catch (error) {
            throw new Error(
              "Proses selesai, tetapi hasil video tidak dapat diambil."
            );
          }
        }

        /*
         * Proses gagal.
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
         * Jika response mengandung error walaupun
         * status belum jelas.
         */
        if (
          response.error &&
          typeof response.error === "string"
        ) {
          throw new Error(response.error);
        }

        await this.sleep(interval);
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
       * Jika endpoint /api/video membutuhkan token,
       * gunakan modul video.
       */
      if (
        url.startsWith("/api/video") &&
        GENZ.video &&
        GENZ.video.fetchProtected
      ) {
        const blob = await GENZ.video.fetchProtected(url);

        const objectUrl =
          URL.createObjectURL(blob);

        GENZ.video.show(objectUrl);
        return;
      }

      /*
       * URL biasa.
       */
      if (
        GENZ.video &&
        GENZ.video.show
      ) {
        GENZ.video.show(url);
        return;
      }

      /*
       * Fallback apabila video.js belum tersedia.
       */
      const video =
        GENZ.$("video") ||
        document.querySelector("video");

      if (!video) {
        throw new Error(
          "Elemen video tidak ditemukan."
        );
      }

      video.src = url;
      video.controls = true;
      video.autoplay = false;
      video.loop = false;
      video.playsInline = true;

      video.classList.remove("hidden");

      try {
        await video.play();
      } catch (_) {
        /*
         * Browser dapat menolak autoplay.
         * Video tetap tersedia dengan kontrol manual.
         */
      }
    },

    sleep(ms) {
      return new Promise(resolve =>
        setTimeout(resolve, ms)
      );
    }
  };

  /*
   * Compatibility function.
   * Supaya kode lama yang masih memanggil
   * generateVideo() tidak langsung rusak.
   */
  window.generateVideo = function () {
    return GENZ.generator.generate();
  };

  /*
   * Event compatibility.
   */
  GENZ.on("generate-video", function () {
    GENZ.generator.generate();
  });

})();
