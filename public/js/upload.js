/* =========================================================
   GEN-Z.AI IMAGE UPLOAD
   public/js/upload.js
========================================================= */

(function () {

  'use strict';

  const GENZ =
    window.GENZ ||
    (window.GENZ = {});

  GENZ.state =
    GENZ.state ||
    {};

  GENZ.upload =
    GENZ.upload ||
    {};

  GENZ.upload.imageData =
    GENZ.upload.imageData ||
    null;


  /* =======================================================
     SETUP
  ======================================================= */

  GENZ.upload.setup =
    function () {

      const input =
        document.getElementById(
          'image'
        );

      if (!input) {
        return false;
      }

      /*
       * Hindari memasang listener
       * berulang kali.
       */

      if (
        input.dataset
          .uploadListenerAttached ===
        'true'
      ) {
        return true;
      }

      input.dataset
        .uploadListenerAttached =
        'true';


      input.addEventListener(
        'change',
        event => {

          const file =
            event.target.files?.[0];


          /* -----------------------------------------------
             CLEAR
          ----------------------------------------------- */

          if (!file) {

            GENZ.upload.imageData =
              null;

            GENZ.state.imageData =
              null;

            return;

          }


          /* -----------------------------------------------
             SIZE
          ----------------------------------------------- */

          if (
            file.size >
            12 * 1024 * 1024
          ) {

            GENZ.upload.imageData =
              null;

            GENZ.state.imageData =
              null;


            const status =
              document.getElementById(
                'status'
              );

            if (status) {

              status.textContent =
                'Gambar maksimal 12 MB.';

            }


            input.value =
              '';

            return;

          }


          /* -----------------------------------------------
             TYPE
          ----------------------------------------------- */

          if (
            !file.type ||
            !file.type.startsWith(
              'image/'
            )
          ) {

            GENZ.upload.imageData =
              null;

            GENZ.state.imageData =
              null;


            const status =
              document.getElementById(
                'status'
              );

            if (status) {

              status.textContent =
                'File harus berupa gambar.';

            }


            input.value =
              '';

            return;

          }


          /* -----------------------------------------------
             READ FILE
          ----------------------------------------------- */

          const reader =
            new FileReader();


          reader.onload =
            () => {

              const result =
                reader.result;


              if (!result) {

                GENZ.upload.imageData =
                  null;

                GENZ.state.imageData =
                  null;

                return;

              }


              GENZ.upload.imageData =
                result;

              GENZ.state.imageData =
                result;


              /* -------------------------------------------
                 PREVIEW
              ------------------------------------------- */

              const preview =
                document.getElementById(
                  'imagePreview'
                );


              if (preview) {

                /*
                 * Mendukung <img>,
                 * container biasa,
                 * maupun elemen yang
                 * sudah tersedia.
                 */

                if (
                  preview.tagName
                    .toLowerCase() ===
                  'img'
                ) {

                  preview.src =
                    result;

                } else {

                  preview.innerHTML =
                    '';

                  const image =
                    document.createElement(
                      'img'
                    );

                  image.src =
                    result;

                  image.alt =
                    'Preview gambar referensi';

                  image.style.maxWidth =
                    '100%';

                  image.style.display =
                    'block';

                  preview.appendChild(
                    image
                  );

                }

                preview.classList.remove(
                  'hidden'
                );

              }


              const status =
                document.getElementById(
                  'status'
                );

              if (status) {

                status.textContent =
                  'Gambar referensi siap digunakan.';

              }

            };


          reader.onerror =
            () => {

              GENZ.upload.imageData =
                null;

              GENZ.state.imageData =
                null;


              const status =
                document.getElementById(
                  'status'
                );

              if (status) {

                status.textContent =
                  'Gagal membaca gambar.';

              }

            };


          reader.readAsDataURL(
            file
          );

        }
      );


      return true;

    };


  /* =======================================================
     INIT
     
     app.js memanggil GENZ.upload.init()
     setelah generator.html selesai dimuat.
  ======================================================= */

  GENZ.upload.init =
    function () {

      return GENZ.upload.setup();

    };


  /* =======================================================
     CLEAR
  ======================================================= */

  GENZ.upload.clear =
    function () {

      GENZ.upload.imageData =
        null;

      GENZ.state.imageData =
        null;


      const input =
        document.getElementById(
          'image'
        );


      if (input) {

        input.value =
          '';

        input.dataset
          .uploadListenerAttached =
          'false';

      }


      const preview =
        document.getElementById(
          'imagePreview'
        );


      if (preview) {

        preview.innerHTML =
          '';

        preview.classList.add(
          'hidden'
        );

      }

    };


  /* =======================================================
     AUTO SETUP
     
     Jika komponen generator sudah
     tersedia, langsung pasang.
     
     Jika belum tersedia, app.js
     akan memanggil init() setelah
     komponen dimuat.
  ======================================================= */

  if (
    document.readyState ===
    'loading'
  ) {

    document.addEventListener(
      'DOMContentLoaded',
      () => {

        GENZ.upload.setup();

      },
      {
        once: true
      }
    );

  } else {

    GENZ.upload.setup();

  }


})();
