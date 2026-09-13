/* =========================================================
   GEN-Z.AI
   public/js/profile.js

   ROUTE:
   Account → Riwayat Video

   Tugas:
   1. Memuat component history.html
   2. Memuat history.js
   3. Menjalankan GENZ.history.load()
========================================================= */

(function () {

  "use strict";


  const GENZ =
    window.GENZ ||
    (window.GENZ = {});


  let historyLoading =
    null;


  /* =======================================================
     LOAD HISTORY PAGE
  ======================================================= */

  async function loadHistoryPage() {

    const container =
      document.getElementById(
        "pageContent"
      );


    if (!container) {

      throw new Error(
        "Container #pageContent tidak ditemukan."
      );

    }


    /*
     * Jangan memuat ulang component
     * jika halaman Riwayat sudah ada.
     */

    if (
      container.querySelector(
        ".history-page"
      )
    ) {

      return container;

    }


    /*
     * history.html adalah UI utama
     * halaman Riwayat Video.
     */

    if (
      typeof GENZ.loadComponent !==
      "function"
    ) {

      throw new Error(
        "GENZ.loadComponent belum tersedia."
      );

    }


    await GENZ.loadComponent(
      "#pageContent",
      "/components/history.html"
    );


    /*
     * Pastikan component benar-benar
     * berhasil masuk ke halaman.
     */

    if (
      !container.querySelector(
        ".history-page"
      )
    ) {

      throw new Error(
        "Component history.html berhasil dimuat tetapi elemen .history-page tidak ditemukan."
      );

    }


    return container;

  }


  /* =======================================================
     LOAD HISTORY JAVASCRIPT MODULE
  ======================================================= */

  async function loadHistoryModule() {

    if (
      GENZ.history &&
      typeof GENZ.history.load ===
        "function"
    ) {

      return GENZ.history;

    }


    if (historyLoading) {

      return historyLoading;

    }


    historyLoading =
      new Promise(
        function (
          resolve,
          reject
        ) {

          const existing =
            document.querySelector(
              'script[data-genz-module="history"]'
            );


          /* ===============================================
             SCRIPT SUDAH ADA
          =============================================== */

          if (existing) {

            if (
              GENZ.history &&
              typeof GENZ.history.load ===
                "function"
            ) {

              resolve(
                GENZ.history
              );

              return;

            }


            const onLoad =
              function () {

                if (
                  GENZ.history &&
                  typeof GENZ.history.load ===
                    "function"
                ) {

                  resolve(
                    GENZ.history
                  );

                } else {

                  reject(
                    new Error(
                      "history.js berhasil dimuat tetapi GENZ.history tidak tersedia."
                    )
                  );

                }

              };


            const onError =
              function () {

                reject(
                  new Error(
                    "Gagal memuat /js/history.js"
                  )
                );

              };


            existing.addEventListener(
              "load",
              onLoad,
              {
                once: true
              }
            );


            existing.addEventListener(
              "error",
              onError,
              {
                once: true
              }
            );


            /*
             * Jika script sudah selesai dimuat
             * tetapi event load sudah terlewat.
             */

            setTimeout(
              function () {

                if (
                  GENZ.history &&
                  typeof GENZ.history.load ===
                    "function"
                ) {

                  resolve(
                    GENZ.history
                  );

                }

              },
              0
            );


            return;

          }


          /* ===============================================
             BUAT SCRIPT HISTORY
          =============================================== */

          const script =
            document.createElement(
              "script"
            );


          script.src =
            "/js/history.js";


          script.async =
            true;


          script.dataset.genzModule =
            "history";


          script.onload =
            function () {

              script.dataset.genzLoaded =
                "true";


              if (
                GENZ.history &&
                typeof GENZ.history.load ===
                  "function"
              ) {

                resolve(
                  GENZ.history
                );

              } else {

                reject(
                  new Error(
                    "history.js berhasil dimuat tetapi GENZ.history tidak tersedia."
                  )
                );

              }

            };


          script.onerror =
            function () {

              reject(
                new Error(
                  "Gagal memuat /js/history.js"
                )
              );

            };


          document.head.appendChild(
            script
          );

        }
      );


    historyLoading.finally(
      function () {

        historyLoading =
          null;

      }
    );


    return historyLoading;

  }


  /* =======================================================
     PUBLIC PROFILE MODULE
  ======================================================= */

  GENZ.profile = {

    async load() {

      /*
       * LANGKAH 1
       * Tampilkan UI history.html
       */

      await loadHistoryPage();


      /*
       * LANGKAH 2
       * Muat logic history.js
       */

      const history =
        await loadHistoryModule();


      if (
        !history ||
        typeof history.load !==
          "function"
      ) {

        throw new Error(
          "Modul Riwayat Video belum siap."
        );

      }


      /*
       * LANGKAH 3
       * Ambil data history akun aktif
       */

      await history.load();

    }

  };


})();
