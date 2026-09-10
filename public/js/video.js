/* =========================================================
   GEN-Z.AI VIDEO
   public/js/video.js
========================================================= */

(function () {
  "use strict";

  const GENZ =
    window.GENZ ||
    (window.GENZ = {});

  GENZ.video = {
    poll: null,
    objectUrl: null,

    stopPolling() {
      if (this.poll) {
        clearTimeout(this.poll);
        this.poll = null;
      }
    },

    clear() {
      this.stopPolling();

      const video =
        document.getElementById(
          "video"
        );

      const download =
        document.getElementById(
          "downloadVideo"
        ) ||
        document.getElementById(
          "download"
        );

      if (video) {
        video.pause();

        video.removeAttribute(
          "src"
        );

        video.load();

        video.classList.add(
          "hidden"
        );
      }

      if (download) {
        download.removeAttribute(
          "href"
        );

        download.classList.add(
          "hidden"
        );
      }

      if (this.objectUrl) {
        try {
          URL.revokeObjectURL(
            this.objectUrl
          );
        } catch (_) {}

        this.objectUrl = null;
      }

      if (
        GENZ.state
      ) {
        GENZ.state.currentVideoObjectUrl =
          null;
      }
    },

    show(url) {
      if (!url) {
        throw new Error(
          "URL video tidak ditemukan."
        );
      }

      const video =
        document.getElementById(
          "video"
        );

      const download =
        document.getElementById(
          "downloadVideo"
        ) ||
        document.getElementById(
          "download"
        );

      const result =
        document.getElementById(
          "videoResult"
        );

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

      video.classList.remove(
        "hidden"
      );

      if (result) {
        result.classList.remove(
          "hidden"
        );
      }

      if (download) {
        download.href = url;

        download.download =
          "gen-z-ai-video.mp4";

        download.classList.remove(
          "hidden"
        );
      }

      video.load();
    },

    async fetchProtected(url) {
      if (
        !GENZ.auth ||
        typeof GENZ.auth.token !==
          "function"
      ) {
        throw new Error(
          "Auth client belum siap."
        );
      }

      const token =
        await GENZ.auth.token();

      if (!token) {
        throw new Error(
          "Sesi login tidak valid."
        );
      }

      const response =
        await fetch(
          url,
          {
            method: "GET",

            headers: {
              Authorization:
                `Bearer ${token}`
            },

            credentials: "include"
          }
        );

      if (!response.ok) {
        let message =
          "Gagal mengambil file video.";

        try {
          const data =
            await response.json();

          message =
            data.error ||
            data.message ||
            message;
        } catch (_) {}

        throw new Error(
          message
        );
      }

      const blob =
        await response.blob();

      if (!blob.size) {
        throw new Error(
          "File video kosong."
        );
      }

      /*
       * Hanya buat object URL
       * SATU KALI.
       */
      const objectUrl =
        URL.createObjectURL(
          blob
        );

      if (this.objectUrl) {
        try {
          URL.revokeObjectURL(
            this.objectUrl
          );
        } catch (_) {}
      }

      this.objectUrl =
        objectUrl;

      if (
        GENZ.state
      ) {
        GENZ.state.currentVideoObjectUrl =
          objectUrl;
      }

      return objectUrl;
    }
  };

})();
