"use strict";

(() => {

  const C =
    window.AIVideoConfig;

  const $ =
    id => document.getElementById(id);


  $("generateImage").onclick =
    async function () {

      const prompt =
        $("prompt").value.trim();


      if (!prompt) {

        window.setAIStatus(
          "Masukkan prompt terlebih dahulu.",
          "err"
        );

        return;

      }


      const token =
        window.getPollinationsToken();


      if (!token) {

        window.setAIStatus(
          "Hubungkan Pollinations terlebih dahulu.",
          "err"
        );

        return;

      }


      const button =
        $("generateImage");


      button.disabled =
        true;


      try {

        window.setAIStatus(
          "Sedang membuat gambar AI..."
        );


        const aspect =
          $("aspect").value;


        let width =
          1024;

        let height =
          1024;


        if (aspect === "16:9") {

          width =
            1280;

          height =
            720;

        }


        if (aspect === "9:16") {

          width =
            720;

          height =
            1280;

        }


        const imageURL =
          C.IMAGE_API +
          encodeURIComponent(prompt) +
          "?model=" +
          encodeURIComponent(
            C.IMAGE_MODEL
          ) +
          "&width=" +
          width +
          "&height=" +
          height +
          "&nologo=true";


        const response =
          await fetch(
            imageURL,
            {
              headers: {
                Authorization:
                  "Bearer " +
                  token
              }
            }
          );


        if (!response.ok) {

          if (
            response.status === 401
          ) {

            localStorage.removeItem(
              C.TOKEN_KEY
            );

            sessionStorage.removeItem(
              C.TOKEN_KEY
            );

          }


          throw new Error(
            "Gagal membuat gambar. HTTP " +
            response.status
          );

        }


        const blob =
          await response.blob();


        if (!blob.size) {

          throw new Error(
            "Gambar yang diterima kosong."
          );

        }


        if (
          window.__AI_VIDEO_IMAGE_URL
        ) {

          URL.revokeObjectURL(
            window.__AI_VIDEO_IMAGE_URL
          );

        }


        const imageObjectURL =
          URL.createObjectURL(
            blob
          );


        window.__AI_VIDEO_IMAGE_URL =
          imageObjectURL;


        window.__AI_VIDEO_SOURCE =
          imageObjectURL;


        window.__AI_VIDEO_PROMPT =
          prompt;


        window.__AI_VIDEO_DURATION =
          $("duration").value;


        window.__AI_VIDEO_ASPECT =
          aspect;


        const preview =
          $("imagePreview");


        preview.src =
          imageObjectURL;


        preview.classList.remove(
          "hidden"
        );


        $("videoBtn").disabled =
          false;


        window.setAIStatus(
          "Gambar berhasil dibuat. Siap dijadikan video.",
          "ok"
        );


      } catch (error) {

        console.error(
          "IMAGE ENGINE ERROR:",
          error
        );


        window.setAIStatus(
          "Gagal membuat gambar: " +
          error.message,
          "err"
        );

      } finally {

        button.disabled =
          false;

      }

    };

})();
