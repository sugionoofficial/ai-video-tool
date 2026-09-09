"use strict";

GENZApp.registerProvider(
  "fal",
  {

    description:
      "fal.ai aktif.",


    settingsHTML: `

      <label for="falApiKey">
        FAL API Key
      </label>

      <input
        id="falApiKey"
        type="password"
        placeholder="Masukkan FAL API Key"
        autocomplete="off"
      >

      <label for="falModel">
        Model fal.ai
      </label>

      <select id="falModel">

        <option value="fal-ai/kling-video/v3/standard/image-to-video">
          Kling 3 Standard
        </option>

        <option value="fal-ai/wan/v2.7/image-to-video">
          Wan 2.7
        </option>

        <option value="fal-ai/vidu/image-to-video">
          Vidu
        </option>

      </select>

      <div class="info">
        API Key hanya disimpan selama sesi browser.
      </div>

    `,


    init() {

      const input =
        document.getElementById(
          "falApiKey"
        );


      if (!input) {
        return;
      }


      input.value =
        sessionStorage.getItem(
          "genz_fal_api_key"
        ) || "";


      input.addEventListener(
        "input",
        () => {

          const value =
            input.value.trim();


          if (value) {

            sessionStorage.setItem(
              "genz_fal_api_key",
              value
            );

          } else {

            sessionStorage.removeItem(
              "genz_fal_api_key"
            );

          }

        }
      );

    },


    async generate() {

      const apiKey =
        sessionStorage.getItem(
          "genz_fal_api_key"
        );


      if (!apiKey) {

        throw new Error(
          "Masukkan FAL API Key terlebih dahulu."
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


      const seedValue =
        document.getElementById(
          "seed"
        )?.value?.trim();


      const model =
        document.getElementById(
          "falModel"
        )?.value;


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
        "Menyiapkan foto karakter..."
      );


      const image =
        await fileToDataURL(
          file
        );


      let input = {

        prompt

      };


      if (
        model.includes(
          "kling-video"
        )
      ) {

        input.start_image_url =
          image;

        input.aspect_ratio =
          aspect;

        input.duration =
          String(
            Math.max(
              3,
              Math.min(
                duration,
                15
              )
            )
          );

      }


      else if (
        model.includes(
          "wan/v2.7"
        )
      ) {

        input.image_url =
          image;

        input.aspect_ratio =
          aspect === "9:16"
            ? "9:16"
            : "16:9";

        input.duration =
          Math.max(
            5,
            Math.min(
              duration,
              10
            )
          );

      }


      else {

        input.image_url =
          image;

        input.aspect_ratio =
          aspect === "9:16"
            ? "9:16"
            : "16:9";

        input.duration =
          Math.max(
            4,
            Math.min(
              duration,
              8
            )
          );

      }


      if (seedValue) {

        input.seed =
          Number(seedValue);

      }


      GENZApp.setStatus(
        "Mengirim request ke fal.ai..."
      );


      const response =
        await fetch(
          "https://queue.fal.run/" +
          model,
          {

            method: "POST",

            headers: {

              Authorization:
                "Key " +
                apiKey,

              "Content-Type":
                "application/json",

              Accept:
                "application/json"

            },

            body:
              JSON.stringify(
                input
              )

          }
        );


      const data =
        await response.json();


      if (
        response.status === 401 ||
        response.status === 403
      ) {

        throw new Error(
          "FAL API Key tidak valid."
        );

      }


      if (
        response.status === 402
      ) {

        throw new Error(
          "Saldo fal.ai tidak mencukupi."
        );

      }


      if (!response.ok) {

        throw new Error(
          "fal.ai HTTP " +
          response.status
        );

      }


      if (!data?.request_id) {

        throw new Error(
          "fal.ai tidak memberikan request ID."
        );

      }


      for (
        let attempt = 0;
        attempt < 240;
        attempt++
      ) {

        await sleep(
          3000
        );


        const statusResponse =
          await fetch(
            data.status_url,
            {

              headers: {

                Authorization:
                  "Key " +
                  apiKey

              }

            }
          );


        const status =
          await statusResponse.json();


        if (
          status.status ===
          "COMPLETED"
        ) {

          break;

        }


        if (
          status.status !==
            "IN_QUEUE" &&
          status.status !==
            "IN_PROGRESS"
        ) {

          throw new Error(
            "fal.ai gagal: " +
            status.status
          );

        }


        GENZApp.setStatus(
          "fal.ai sedang membuat video..."
        );

      }


      GENZApp.setStatus(
        "Mengambil hasil video..."
      );


      const resultResponse =
        await fetch(
          data.response_url,
          {

            headers: {

              Authorization:
                "Key " +
                apiKey

            }

          }
        );


      const result =
        await resultResponse.json();


      const videoURL =
        result?.video?.url ||
        result?.data?.video?.url ||
        result?.output?.video?.url ||
        result?.videos?.[0]?.url;


      if (!videoURL) {

        throw new Error(
          "URL video fal.ai tidak ditemukan."
        );

      }


      GENZApp.showVideo(
        videoURL
      );


      GENZApp.setStatus(
        "Video berhasil dibuat dengan fal.ai.",
        "ok"
      );

    }

  }
);


function sleep(ms) {

  return new Promise(
    resolve =>
      setTimeout(
        resolve,
        ms
      )
  );

}


function fileToDataURL(file) {

  return new Promise(
    (resolve, reject) => {

      const reader =
        new FileReader();


      reader.onload =
        () =>
          resolve(
            String(
              reader.result
            )
          );


      reader.onerror =
        () =>
          reject(
            new Error(
              "Gagal membaca foto karakter."
            )
          );


      reader.readAsDataURL(
        file
      );

    }
  );

}
