/* =========================================================
   GEN-Z.AI
   public/js/profile.js

   Compatibility bridge:
   Route lama "profile" sekarang membuka
   halaman Riwayat Video.
========================================================= */

(function () {

  "use strict";

  const GENZ =
    window.GENZ ||
    (window.GENZ = {});

  let historyLoading =
    null;

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
        (resolve, reject) => {

          const existing =
            document.querySelector(
              'script[data-genz-module="history"]'
            );

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
              () => {

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
              () => {

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

            return;
          }

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
            () => {

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
            () => {

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
      () => {
        historyLoading =
          null;
      }
    );

    return historyLoading;
  }

  GENZ.profile = {

    async load() {

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

      await history.load();
    }

  };

})();
