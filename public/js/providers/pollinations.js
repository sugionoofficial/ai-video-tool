"use strict";

GENZApp.registerProvider(
  "pollinations",
  {

    description:
      "Pollinations aktif.",


    settingsHTML: `

      <label for="pollinationsApiKey">
        Pollinations API Key
      </label>

      <input
        id="pollinationsApiKey"
        type="password"
        placeholder="Masukkan API Key"
        autocomplete="off"
      >

      <label for="pollinationsModel">
        Model Video
      </label>

      <select id="pollinationsModel">

        <option value="seedance-2.5">
          Seedance 2.5
        </option>

        <option value="seedance-2.0">
          Seedance 2.0
        </option>

        <option value="veo">
          Veo
        </option>

        <option value="wan">
          Wan
        </option>

        <option value="wan-fast">
          Wan Fast
        </option>

        <option value="grok-video-pro">
          Grok Video Pro
        </option>

        <option value="nova-reel">
          Nova Reel
        </option>

      </select>

      <div class="info">
        API Key disimpan hanya pada sesi browser.
      </div>

    `,


    init() {

      const input =
        document.getElementById(
          "pollinationsApiKey"
        );


      if (!input) {
        return;
      }


      input.value =
        sessionStorage.getItem(
          "genz_pollinations_api_key"
        ) || "";


      input.addEventListener(
        "input",
        () => {

          const value =
            input.value.trim();

          if (value) {

            sessionStorage.setItem(
              "genz_pollinations_api_key",
              value
            );

          } else {

            sessionStorage.removeItem(
              "genz_pollinations_api_key"
            );

          }

        }
      );

    },


    async generate() {

      const apiKey =
        sessionStorage.getItem(
          "genz_pollinations_api_key"
        );


      if (!apiKey) {

        throw new Error(
          "Masukkan Pollinations API Key terlebih dahulu."
        );

      }


      const file =
        document.getElementById(
          "characterFile"
        )?.files?.[0];


      const prompt =
        document.getElementById(
          "prompt"
        )?.value?.trim();


      const duration =
        Number(
          document.getElementById(
            "duration"
          )?.value || 6
        );


      const aspect =
        document.getElementById(
          "aspect"
        )?.value ||
        "16:9";


      const seed =
        document.getElementById(
          "seed"
        )?.value?.trim();


      const model =
        document.getElementById(
          "pollinationsModel"
        )?.value ||
        "seedance-2.5";


      if (!file) {

        throw new Error(
          "Upload foto karakter terlebih dahulu."
        );

      }


      if (!prompt) {

        throw new Error(
          "Masukkan prompt video."
        );

      }


      GENZApp.setStatus(
        "Mengunggah foto karakter..."
      );


      const form =
        new FormData();

      form.append(
        "file",
        file
      );


      const config =
        window.AIVideoConfig || {};


      if (!config.UPLOAD_API) {

        throw new Error(
          "UPLOAD_API belum dikonfigurasi."
        );

      }


      const upload =
        await fetch(
          config.UPLOAD_API,
          {

            method: "POST",

            headers: {

              Authorization:
                "Bearer " +
                apiKey

            },

            body: form

          }
        );


      if (!upload.ok) {

        throw new Error(
          "Upload karakter gagal: HTTP " +
          upload.status
        );

      }


      const uploadData =
        await upload.json();


      const imageURL =
        uploadData?.url ||
        uploadData?.imageUrl ||
        uploadData?.image_url ||
        uploadData?.location;


      if (!imageURL) {

        throw new Error(
          "URL karakter tidak diterima."
        );

      }


      const params =
        new URLSearchParams();


      params.set(
        "model",
        model
      );


      params.set(
        "duration",
        String(duration)
      );


      params.set(
        "aspectRatio",
        aspect
      );


      params.set(
        "image",
        imageURL
      );


      if (seed) {

        params.set(
          "seed",
          seed
        );

      }


      const url =
        config.VIDEO_API +
        encodeURIComponent(
          prompt
        ) +
        "?" +
        params.toString();


      GENZApp.setStatus(
        "Pollinations sedang membuat video..."
      );


      const response =
        await fetch(
          url,
          {

            method: "GET",

            headers: {

              Authorization:
                "Bearer " +
                apiKey,

              Accept:
                "video/mp4"

            }

          }
        );


      if (response.status === 401) {

        throw new Error(
          "Pollinations API Key tidak valid."
        );

      }


      if (response.status === 402) {

        throw new Error(
          "Saldo/kredit Pollinations tidak mencukupi."
        );

      }


      if (response.status === 429) {

        throw new Error(
          "Pollinations sedang membatasi permintaan."
        );

      }


      if (!response.ok) {

        throw new Error(
          "Generate gagal: HTTP " +
          response.status
        );

      }


      const blob =
        await response.blob();


      const videoURL =
        URL.createObjectURL(
          blob
        );


      GENZApp.showVideo(
        videoURL
      );


      GENZApp.setStatus(
        "Video berhasil dibuat dengan Pollinations.",
        "ok"
      );

    }

  }
);
