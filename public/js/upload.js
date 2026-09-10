/* =========================================================
   GEN-Z.AI IMAGE UPLOAD
========================================================= */

(function () {

  'use strict';

  const GENZ = window.GENZ || (window.GENZ = {});


  GENZ.upload = {

    imageData: null

  };


  /* =======================================================
     SETUP
  ======================================================= */

  GENZ.upload.setup = function () {

    const input =
      document.getElementById(
        'image'
      );


    if (!input) {
      return;
    }


    input.addEventListener(
      'change',
      event => {

        const file =
          event.target.files?.[0];


        if (!file) {

          GENZ.upload.imageData =
            null;

          GENZ.state.imageData =
            null;

          return;

        }


        /* -------------------------------------------------
           SIZE
        ------------------------------------------------- */

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


        /* -------------------------------------------------
           TYPE
        ------------------------------------------------- */

        if (
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


        /* -------------------------------------------------
           READ
        ------------------------------------------------- */

        const reader =
          new FileReader();


        reader.onload =
          () => {

            GENZ.upload.imageData =
              reader.result;


            GENZ.state.imageData =
              reader.result;

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

    };


})();
