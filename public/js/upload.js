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
     FILE STATUS
  ======================================================= */

  function updateFileStatus(hasFile, text) {

    const status =
      document.getElementById(
        'imageFileStatus'
      );

    if (!status) {
      return;
    }

    status.textContent =
      text ||
      (
        hasFile
          ? 'File berhasil dipilih'
          : 'Tidak ada File yang di pilih'
      );

    status.classList.toggle(
      'has-file',
      Boolean(hasFile)
    );

  }


  /* =======================================================
     CREATE REMOVE BUTTON
  ======================================================= */

  function createRemoveButton() {

    const button =
      document.createElement(
        'button'
      );

    button.type =
      'button';

    button.className =
      'image-remove-btn';

    button.setAttribute(
      'aria-label',
      'Hapus gambar referensi'
    );

    button.setAttribute(
      'title',
      'Hapus gambar'
    );

    button.innerHTML =
      '&times;';


    button.addEventListener(
      'click',
      event => {

        event.preventDefault();
        event.stopPropagation();

        GENZ.upload.clear();

        const status =
          document.getElementById(
            'status'
          );

        if (status) {
          status.textContent =
            '';
        }

      }
    );


    return button;

  }


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


      updateFileStatus(
        Boolean(input.files?.length),
        input.files?.[0]
          ? input.files[0].name
          : 'Tidak ada File yang di pilih'
      );


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

            updateFileStatus(
              false,
              'Tidak ada File yang di pilih'
            );

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


            updateFileStatus(
              false,
              'Tidak ada File yang di pilih'
            );


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


            updateFileStatus(
              false,
              'Tidak ada File yang di pilih'
            );


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
             FILE SELECTED
          ----------------------------------------------- */

          updateFileStatus(
            true,
            file.name
          );


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

                updateFileStatus(
                  false,
                  'Tidak ada File yang di pilih'
                );

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
                 * Bersihkan preview lama
                 * supaya tombol × tidak menumpuk.
                 */
                preview.innerHTML =
                  '';


                /*
                 * Pastikan preview menjadi
                 * container untuk gambar + tombol.
                 */
                preview.classList.remove(
                  'hidden'
                );


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

                image.style.width =
                  '100%';

                image.style.height =
                  '100%';

                image.style.objectFit =
                  'cover';

                image.style.display =
                  'block';


                preview.appendChild(
                  image
                );


                /* -----------------------------------------
                   REMOVE BUTTON
                ----------------------------------------- */

                const removeButton =
                  createRemoveButton();


                preview.appendChild(
                  removeButton
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


          /* -----------------------------------------------
             READER ERROR
          ----------------------------------------------- */

          reader.onerror =
            () => {

              GENZ.upload.imageData =
                null;

              GENZ.state.imageData =
                null;


              updateFileStatus(
                false,
                'Tidak ada File yang di pilih'
              );


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


      updateFileStatus(
        false,
        'Tidak ada File yang di pilih'
      );

    };


  /* =======================================================
     AUTO SETUP
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
