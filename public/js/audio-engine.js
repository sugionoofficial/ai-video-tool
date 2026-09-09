"use strict";

(() => {

  const C =
    window.AIVideoConfig;

  const $ =
    id => document.getElementById(id);


  async function generateAudio() {

    const token =
      window.getPollinationsToken();


    if (!token) {

      window.setAIStatus(
        "Hubungkan Pollinations terlebih dahulu.",
        "err"
      );

      return;

    }


    const text =
      $("audioText")
        .value
        .trim();


    const voice =
      $("voiceSelect")
        .value;


    if (!text) {

      window.setAIStatus(
        "Masukkan teks audio terlebih dahulu.",
        "err"
      );

      return;

    }


    const button =
      $("generateAudio");


    button.disabled =
      true;


    try {

      window.setAIStatus(
        "Membuat audio AI..."
      );


      const endpoint =
        C.AUDIO_API +
        encodeURIComponent(text) +
        "?voice=" +
        encodeURIComponent(
          voice
        );


      const response =
        await fetch(
          endpoint,
          {
            headers: {
              Authorization:
                "Bearer " +
                token
            }
          }
        );


      if (!response.ok) {

        const errorText =
          await response.text()
            .catch(() => "");


        throw new Error(
          "Audio gagal: HTTP " +
          response.status +
          (
            errorText
              ? " - " +
                errorText.slice(0, 500)
              : ""
          )
        );

      }


      const contentType =
        response.headers.get(
          "content-type"
        ) || "";


      let audioURL;


      if (
        contentType.includes(
          "application/json"
        )
      ) {

        const data =
          await response.json();


        audioURL =
          data.url ||
          data.audioUrl ||
          data.location ||
          data.src;

      } else {

        const blob =
          await response.blob();


        audioURL =
          URL.createObjectURL(
            blob
          );


        window.__AI_AUDIO_RESULT =
          blob;

      }


      if (!audioURL) {

        throw new Error(
          "URL audio tidak ditemukan."
        );

      }


      window.__AI_AUDIO_RESULT_URL =
        audioURL;


      const audio =
        $("audioPreview");


      audio.src =
        audioURL;

      audio.controls =
        true;

      audio.style.display =
        "block";


      const download =
        $("audioDownload");


      download.href =
        audioURL;

      download.download =
        "ai-audio-pollinations.mp3";

      download.style.display =
        "inline-block";


      window.setAIStatus(
        "Audio AI berhasil dibuat.",
        "ok"
      );


    } catch (error) {

      console.error(
        "AUDIO ENGINE ERROR:",
        error
      );


      window.setAIStatus(
        "Gagal membuat audio: " +
        error.message,
        "err"
      );

    } finally {

      button.disabled =
        false;

    }

  }


  $("generateAudio").onclick =
    generateAudio;


  window.generateAIAudio =
    generateAudio;


  console.log(
    "Audio Engine loaded."
  );

})();
