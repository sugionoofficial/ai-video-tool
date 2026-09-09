"use strict";

(() => {

  const C =
    window.AIVideoConfig;

  const $ =
    id => document.getElementById(id);


  async function uploadImage(
    blob,
    token
  ) {

    const form =
      new FormData();


    form.append(
      "file",
      blob,
      "reference-image.png"
    );


    const response =
      await fetch(
        C.UPLOAD_API,
        {
          method:
            "POST",

          headers: {
            Authorization:
              "Bearer " +
              token
          },

          body:
            form
        }
      );


    const text =
      await response.text()
        .catch(() => "");


    let data =
      {};


    try {
      data =
        JSON.parse(text);
    } catch (_) {}


    if (!response.ok) {

      throw new Error(
        "Upload gambar gagal: HTTP " +
        response.status +
        (
          text
            ? " - " +
              text.slice(0, 500)
            : ""
        )
      );

    }


    const url =
      data.url ||
      data.publicUrl ||
      data.imageUrl ||
      data.data?.url ||
      data.data?.publicUrl ||
      data.data?.imageUrl;


    if (
      !url ||
      !/^https?:\/\//i.test(url)
    ) {

      throw new Error(
        "URL gambar publik HTTPS tidak ditemukan."
      );

    }


    return url;

  }


  function getPrompt() {

    const base =
      ($("prompt")?.value || "")
        .trim();


    return (

      base +

      ". Animate the reference image with clear continuous natural motion. " +

      "Preserve the exact subject, identity, appearance, anatomy, colors, " +

      "clothing or fur, background and environment. " +

      "The subject must visibly move throughout the video. " +

      "Natural realistic physical motion and consistent subject. " +

      "Do not freeze, morph, warp, duplicate or replace the subject. " +

      "No new subjects. No text, logo or watermark."

    ).trim();

  }


  async function generateVideo() {

    const button =
      $("videoBtn");

    const image =
      $("imagePreview");

    const video =
      $("videoPreview");

    const download =
      $("download");


    const token =
      window.getPollinationsToken();


    if (!token) {

      window.setAIStatus(
        "Token OAuth tidak ditemukan. Hubungkan Pollinations terlebih dahulu.",
        "err"
      );

      return;

    }


    if (
      !image ||
      !image.src ||
      !image.src.startsWith("blob:")
    ) {

      window.setAIStatus(
        "Buat gambar AI terlebih dahulu.",
        "err"
      );

      return;

    }


    button.disabled =
      true;


    try {

      window.setAIStatus(
        "Membaca gambar AI..."
      );


      const imageResponse =
        await fetch(
          image.src
        );


      if (!imageResponse.ok) {

        throw new Error(
          "Gagal membaca gambar AI."
        );

      }


      const imageBlob =
        await imageResponse.blob();


      window.setAIStatus(
        "Mengunggah gambar referensi..."
      );


      const imageURL =
        await uploadImage(
          imageBlob,
          token
        );


      const duration =
        Number(
          $("duration").value
        ) === 10
          ? 10
          : 5;


      const aspect =
        [
          "16:9",
          "9:16",
          "1:1"
        ].includes(
          $("aspect").value
        )
          ? $("aspect").value
          : "16:9";


      window.setAIStatus(
        "Meminta Amazon Nova Reel (" +
        duration +
        " detik, " +
        aspect +
        ")..."
      );


      const params =
        new URLSearchParams({

          model:
            C.VIDEO_MODEL,

          duration:
            String(duration),

          aspectRatio:
            aspect,

          image:
            imageURL

        });


      const endpoint =
        C.VIDEO_API +
        encodeURIComponent(
          getPrompt()
        ) +
        "?" +
        params.toString();


      const response =
        await fetch(
          endpoint,
          {
            headers: {
              Authorization:
                "Bearer " +
                token,

              Accept:
                "video/mp4"
            }
          }
        );


      if (!response.ok) {

        const text =
          await response.text()
            .catch(() => "");


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
          "Video gagal: HTTP " +
          response.status +
          (
            text
              ? " - " +
                text.slice(0, 700)
              : ""
          )
        );

      }


      window.setAIStatus(
        "Video diterima. Menyiapkan pemutar..."
      );


      const videoBlob =
        await response.blob();


      if (!videoBlob.size) {

        throw new Error(
          "Server mengembalikan video kosong."
        );

      }


      if (
        window.__novaVideoUrl
      ) {

        URL.revokeObjectURL(
          window.__novaVideoUrl
        );

      }


      window.__novaVideoUrl =
        URL.createObjectURL(
          videoBlob
        );


      video.src =
        window.__novaVideoUrl;


      video.controls =
        true;

      video.playsInline =
        true;

      video.style.display =
        "block";

      video.load();


      download.href =
        window.__novaVideoUrl;

      download.download =
        "ai-video-nova-reel.mp4";

      download.style.display =
        "inline-block";


      window.__AI_VIDEO_RESULT =
        videoBlob;


      window.__AI_VIDEO_RESULT_URL =
        window.__novaVideoUrl;


      window.setAIStatus(
        "Video AI berhasil dibuat dengan Amazon Nova Reel.",
        "ok"
      );


    } catch (error) {

      console.error(
        "VIDEO ENGINE ERROR:",
        error
      );


      window.setAIStatus(
        error.message ||
        String(error),
        "err"
      );

    } finally {

      button.disabled =
        false;

    }

  }


  window.generateVideoWithNovaReel =
    generateVideo;


  $("videoBtn").onclick =
    generateVideo;


  window.__NOVA_REEL_V8_LOADED =
    true;


  console.log(
    "Video Engine V8 loaded."
  );

})();
