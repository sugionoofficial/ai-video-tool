/* =========================================================
   GEN-Z.AI VIDEO
   public/js/video.js

   Fungsi:
   - Menampilkan video hasil generate
   - Mengambil video protected dari backend
   - Membuat Object URL
   - Menampilkan video secara otomatis
   - Menyediakan tombol download
   - Membersihkan Object URL lama
========================================================= */

(function () {

  "use strict";


  const GENZ =
    window.GENZ ||
    (window.GENZ = {});


  GENZ.video = {

    poll: null,

    objectUrl: null,


    /* =====================================================
       STOP POLLING
    ===================================================== */

    stopPolling() {

      if (this.poll) {

        clearTimeout(
          this.poll
        );

        this.poll = null;

      }

    },


    /* =====================================================
       CLEAR VIDEO
    ===================================================== */

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


      const result =
        document.getElementById(
          "videoResult"
        );


      if (video) {

        try {

          video.pause();

        } catch (_) {}


        video.removeAttribute(
          "src"
        );

        video.load();

        video.classList.add(
          "hidden"
        );

      }


      if (result) {

        result.classList.add(
          "hidden"
        );

      }


      if (download) {

        download.removeAttribute(
          "href"
        );

        download.removeAttribute(
          "download"
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

        GENZ.state
          .currentVideoObjectUrl =
          null;

      }

    },


    /* =====================================================
       SHOW VIDEO
    ===================================================== */

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


      /*
       * Jika URL adalah Object URL
       * milik video sebelumnya,
       * jangan langsung revoke sebelum
       * video baru selesai dipasang.
       */


      video.pause();


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


      /*
       * Simpan URL jika merupakan
       * Object URL yang dibuat
       * oleh sistem.
       */

      if (
        String(url).startsWith(
          "blob:"
        )
      ) {

        this.objectUrl =
          url;

        if (
          GENZ.state
        ) {

          GENZ.state
            .currentVideoObjectUrl =
            url;

        }

      }


      return url;

    },


    /* =====================================================
       FETCH PROTECTED VIDEO
    ===================================================== */

    async fetchProtected(
      url
    ) {

      if (!url) {

        throw new Error(
          "URL video protected tidak ditemukan."
        );

      }


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

            credentials:
              "include"

          }
        );


      if (!response.ok) {

        let message =
          "Gagal mengambil file video.";


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


      const blob =
        await response.blob();


      if (!blob.size) {

        throw new Error(
          "File video kosong."
        );

      }


      /*
       * Buat Object URL baru.
       */

      const objectUrl =
        URL.createObjectURL(
          blob
        );


      /*
       * Simpan Object URL.
       */

      const previousObjectUrl =
        this.objectUrl;


      this.objectUrl =
        objectUrl;


      if (
        GENZ.state
      ) {

        GENZ.state
          .currentVideoObjectUrl =
          objectUrl;

      }


      /*
       * ===================================================
       * PENTING
       *
       * Langsung tampilkan video.
       *
       * generator.js memang akan menerima
       * return value lalu berhenti.
       *
       * Karena itu video HARUS dipasang
       * di sini.
       * ===================================================
       */

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

        try {

          URL.revokeObjectURL(
            objectUrl
          );

        } catch (_) {}


        this.objectUrl =
          null;


        if (
          GENZ.state
        ) {

          GENZ.state
            .currentVideoObjectUrl =
            null;

        }


        throw new Error(
          "Elemen video tidak ditemukan."
        );

      }


      /*
       * Pasang video.
       */

      video.pause();

      video.src =
        objectUrl;

      video.controls =
        true;

      video.autoplay =
        false;

      video.loop =
        false;

      video.playsInline =
        true;


      video.classList.remove(
        "hidden"
      );


      if (result) {

        result.classList.remove(
          "hidden"
        );

      }


      /*
       * Tombol download
       */

      if (download) {

        download.href =
          objectUrl;

        download.download =
          "gen-z-ai-video.mp4";

        download.classList.remove(
          "hidden"
        );

      }


      /*
       * Load video baru.
       */

      video.load();


      /*
       * Object URL lama baru
       * boleh dihapus setelah
       * video baru sudah dipasang.
       */

      if (
        previousObjectUrl &&
        previousObjectUrl !==
          objectUrl
      ) {

        try {

          URL.revokeObjectURL(
            previousObjectUrl
          );

        } catch (_) {}

      }


      return objectUrl;

    }

  };


})();
