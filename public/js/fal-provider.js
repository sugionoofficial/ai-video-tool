(function () {

  "use strict";

  const FAL_KEY_STORAGE = "genz_fal_api_key";

  const DEFAULT_MODEL =
    "fal-ai/kling-video/v3/standard/image-to-video";


  // ==========================================
  // STATUS
  // ==========================================

  function setStatus(message, type = "") {

    const el =
      document.getElementById("status");

    if (!el) return;

    el.textContent = message;
    el.className = "status " + type;

  }


  // ==========================================
  // API KEY
  // ==========================================

  function getFalKey() {

    return (
      sessionStorage.getItem(
        FAL_KEY_STORAGE
      ) || ""
    );

  }


  function saveFalKey(value) {

    value =
      String(value || "").trim();

    if (value) {

      sessionStorage.setItem(
        FAL_KEY_STORAGE,
        value
      );

    } else {

      sessionStorage.removeItem(
        FAL_KEY_STORAGE
      );

    }

  }


  // ==========================================
  // UI
  // ==========================================

  function createProviderUI() {

    const modelSelect =
      document.getElementById(
        "videoModel"
      );

    if (!modelSelect) return;

    if (
      document.getElementById(
        "genzProvider"
      )
    ) {
      return;
    }


    const card =
      modelSelect.closest(".card");

    if (!card) return;


    const wrapper =
      document.createElement("div");

    wrapper.id =
      "genzProvider";


    wrapper.innerHTML = `

      <label for="providerSelect">
        Provider Video
      </label>

      <select id="providerSelect">

        <option value="pollinations">
          Pollinations
        </option>

        <option value="fal">
          fal.ai
        </option>

      </select>


      <div
        id="falSettings"
        style="display:none;"
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


        <label for="falApiKey">
          FAL API Key
        </label>

        <input
          id="falApiKey"
          type="password"
          placeholder="Tempel FAL API Key"
          autocomplete="off"
        >

        <div class="info">

          API Key hanya disimpan selama
          sesi browser ini.

          Untuk deployment publik,
          sebaiknya gunakan Cloudflare Worker
          sebagai server-side proxy.

        </div>

      </div>

    `;


    const firstLabel =
      modelSelect
        .closest("label");

    if (
      firstLabel &&
      firstLabel.parentElement === card
    ) {

      card.insertBefore(
        wrapper,
        firstLabel
      );

    } else {

      card.insertBefore(
        wrapper,
        modelSelect
      );

    }


    const provider =
      document.getElementById(
        "providerSelect"
      );

    const falSettings =
      document.getElementById(
        "falSettings"
      );

    const falKey =
      document.getElementById(
        "falApiKey"
      );


    falKey.value =
      getFalKey();


    provider.addEventListener(
      "change",
      function () {

        const isFal =
          provider.value === "fal";


        falSettings.style.display =
          isFal
            ? "block"
            : "none";


        if (isFal) {

          setStatus(
            "Provider fal.ai aktif. Masukkan API Key."
          );

        } else {

          setStatus(
            "Provider Pollinations aktif."
          );

        }

      }
    );


    falKey.addEventListener(
      "input",
      function () {

        saveFalKey(
          falKey.value
        );

      }
    );

  }


  // ==========================================
  // FILE → DATA URL
  // ==========================================

  function fileToDataURL(file) {

    return new Promise(
      function (resolve, reject) {

        const reader =
          new FileReader();


        reader.onload =
          function () {

            resolve(
              String(
                reader.result
              )
            );

          };


        reader.onerror =
          function () {

            reject(
              new Error(
                "Gagal membaca foto karakter."
              )
            );

          };


        reader.readAsDataURL(
          file
        );

      }
    );

  }


  // ==========================================
  // REQUEST FAL
  // ==========================================

  async function falRequest(
    url,
    options = {}
  ) {

    const key =
      getFalKey();


    if (!key) {

      throw new Error(
        "Masukkan FAL API Key terlebih dahulu."
      );

    }


    const response =
      await fetch(
        url,
        {

          ...options,

          headers: {

            Authorization:
              "Key " + key,

            "Content-Type":
              "application/json",

            Accept:
              "application/json",

            ...(options.headers || {})

          }

        }
      );


    let data = null;


    try {

      data =
        await response.json();

    } catch (_) {

      data = null;

    }


    if (
      response.status === 401 ||
      response.status === 403
    ) {

      throw new Error(
        "FAL API Key tidak valid atau tidak memiliki akses."
      );

    }


    if (
      response.status === 402
    ) {

      throw new Error(
        "Saldo atau kredit fal.ai tidak mencukupi."
      );

    }


    if (
      response.status === 429
    ) {

      throw new Error(
        "fal.ai sedang membatasi permintaan. Coba lagi nanti."
      );

    }


    if (!response.ok) {

      throw new Error(
        "fal.ai HTTP " +
        response.status +
        (
          data?.detail
            ? ": " + data.detail
            : ""
        )
      );

    }


    return data;

  }


  // ==========================================
  // INPUT
  // ==========================================

  function getInput() {

    const file =
      document
        .getElementById(
          "characterFile"
        )
        ?.files?.[0];


    if (!file) {

      throw new Error(
        "Upload foto karakter terlebih dahulu."
      );

    }


    const allowed = [

      "image/jpeg",
      "image/png",
      "image/webp"

    ];


    if (
      !allowed.includes(
        file.type
      )
    ) {

      throw new Error(
        "Format foto harus JPG, PNG, atau WEBP."
      );

    }


    if (
      file.size >
      20 * 1024 * 1024
    ) {

      throw new Error(
        "Ukuran foto maksimal 20 MB."
      );

    }


    const prompt =
      document
        .getElementById(
          "prompt"
        )
        ?.value
        ?.trim() || "";


    if (!prompt) {

      throw new Error(
        "Masukkan prompt video terlebih dahulu."
      );

    }


    if (
      prompt.length > 512
    ) {

      throw new Error(
        "Prompt maksimal 512 karakter."
      );

    }


    const duration =
      Number(
        document
          .getElementById(
            "duration"
          )
          ?.value || 5
      );


    const aspect =
      document
        .getElementById(
          "aspect"
        )
        ?.value || "16:9";


    const seedValue =
      document
        .getElementById(
          "seed"
        )
        ?.value
        ?.trim() || "";


    const seed =
      seedValue
        ? Number(seedValue)
        : null;


    return {

      file,
      prompt,
      duration,
      aspect,
      seed

    };

  }


  // ==========================================
  // MODEL INPUT
  // ==========================================

  function buildModelInput(
    model,
    values,
    image
  ) {

    const input = {

      prompt:
        values.prompt

    };


    // KLING

    if (
      model.includes(
        "kling-video"
      )
    ) {

      input.start_image_url =
        image;

      input.aspect_ratio =
        (
          values.aspect === "9:16" ||
          values.aspect === "1:1" ||
          values.aspect === "16:9"
        )
          ? values.aspect
          : "16:9";


      input.duration =
        String(
          Math.max(
            3,
            Math.min(
              values.duration,
              15
            )
          )
        );

    }


    // WAN

    else if (
      model.includes(
        "wan/v2.7"
      )
    ) {

      input.image_url =
        image;

      input.aspect_ratio =
        values.aspect === "9:16"
          ? "9:16"
          : "16:9";


      input.duration =
        Math.max(
          5,
          Math.min(
            values.duration,
            10
          )
        );

    }


    // VIDU

    else if (
      model.includes(
        "vidu"
      )
    ) {

      input.image_url =
        image;

      input.aspect_ratio =
        values.aspect === "9:16"
          ? "9:16"
          : "16:9";


      input.duration =
        Math.max(
          4,
          Math.min(
            values.duration,
            8
          )
        );

    }


    else {

      input.image_url =
        image;

    }


    if (
      values.seed !== null &&
      Number.isInteger(
        values.seed
      )
    ) {

      input.seed =
        values.seed;

    }


    return input;

  }


  // ==========================================
  // GENERATE
  // ==========================================

  async function generateFalVideo() {

    const button =
      document.getElementById(
        "videoBtn"
      );

    const video =
      document.getElementById(
        "videoPreview"
      );

    const download =
      document.getElementById(
        "download"
      );


    try {

      const values =
        getInput();


      const apiKey =
        getFalKey();


      if (!apiKey) {

        throw new Error(
          "Masukkan FAL API Key terlebih dahulu."
        );

      }


      const model =
        document
          .getElementById(
            "falModel"
          )
          ?.value ||
        DEFAULT_MODEL;


      if (button) {

        button.disabled =
          true;

        button.textContent =
          "MEMBUAT VIDEO...";

      }


      if (video) {

        video.pause();

        video.removeAttribute(
          "src"
        );

        video.style.display =
          "none";

      }


      if (download) {

        download.removeAttribute(
          "href"
        );

        download.style.display =
          "none";

      }


      setStatus(
        "Menyiapkan foto karakter..."
      );


      const image =
        await fileToDataURL(
          values.file
        );


      const input =
        buildModelInput(
          model,
          values,
          image
        );


      setStatus(
        "Mengirim request ke fal.ai..."
      );


      const job =
        await falRequest(
          "https://queue.fal.run/" +
          model,
          {

            method: "POST",

            body:
              JSON.stringify(
                input
              )

          }
        );


      if (
        !job?.request_id
      ) {

        throw new Error(
          "fal.ai tidak memberikan request ID."
        );

      }


      let completed =
        false;


      for (
        let i = 0;
        i < 240;
        i++
      ) {

        await new Promise(
          resolve =>
            setTimeout(
              resolve,
              3000
            )
        );


        const statusData =
          await falRequest(
            job.status_url,
            {
              method: "GET"
            }
          );


        const state =
          statusData?.status ||
          "UNKNOWN";


        if (
          state ===
          "COMPLETED"
        ) {

          completed =
            true;

          break;

        }


        if (
          state !==
            "IN_QUEUE" &&
          state !==
            "IN_PROGRESS"
        ) {

          throw new Error(
            "fal.ai menghentikan proses: " +
            state
          );

        }


        let message =
          "fal.ai sedang membuat video...";


        if (
          Number.isInteger(
            statusData?.queue_position
          )
        ) {

          message +=
            " Posisi antrean: " +
            statusData.queue_position;

        }


        setStatus(
          message
        );

      }


      if (!completed) {

        throw new Error(
          "Waktu tunggu habis. Proses belum selesai."
        );

      }


      setStatus(
        "Mengambil hasil video..."
      );


      const result =
        await falRequest(
          job.response_url,
          {
            method: "GET"
          }
        );


      const videoURL =

        result?.video?.url ||

        result?.data?.video?.url ||

        result?.output?.video?.url ||

        result?.videos?.[0]?.url;


      if (!videoURL) {

        console.error(
          "FAL RESULT:",
          result
        );

        throw new Error(
          "Video selesai tetapi URL video tidak ditemukan."
        );

      }


      if (video) {

        video.src =
          videoURL;

        video.style.display =
          "block";

        video.load();

      }


      if (download) {

        download.href =
          videoURL;

        download.download =
          "gen-z-ai-fal-video.mp4";

        download.style.display =
          "block";

      }


      setStatus(
        "Video berhasil dibuat dengan fal.ai.",
        "ok"
      );

    }

    catch (error) {

      console.error(
        "GEN-Z.AI FAL ERROR:",
        error
      );


      setStatus(
        error?.message ||
        "Gagal membuat video dengan fal.ai.",
        "err"
      );

    }

    finally {

      if (button) {

        button.disabled =
          false;

        button.textContent =
          "GENERATE VIDEO";

      }

    }

  }


  // ==========================================
  // INTERCEPT GENERATE BUTTON
  // ==========================================

  function install() {

    createProviderUI();


    const button =
      document.getElementById(
        "videoBtn"
      );


    if (!button) return;


    button.addEventListener(
      "click",
      function (event) {

        const provider =
          document
            .getElementById(
              "providerSelect"
            )
            ?.value;


        if (
          provider !== "fal"
        ) {

          return;

        }


        event.preventDefault();
        event.stopImmediatePropagation();


        generateFalVideo();

      },
      true
    );

  }


  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      install
    );

  } else {

    install();

  }


  window.GENZFal = {

    getKey:
      getFalKey,

    saveKey:
      saveFalKey,

    generate:
      generateFalVideo

  };


})();
