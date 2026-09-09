"use strict";

GENZApp.registerProvider(
  "runway",
  {

    description:
      "Runway aktif.",

    settingsHTML: `

      <label for="runwayApiKey">
        Runway API Key
      </label>

      <input
        id="runwayApiKey"
        type="password"
        placeholder="Masukkan Runway API Key"
      >

      <label for="runwayModel">
        Model Runway
      </label>

      <select id="runwayModel">

        <option value="gen4.5">
          Gen-4.5
        </option>

      </select>

    `,

    init() {

      const input =
        document.getElementById(
          "runwayApiKey"
        );

      if (input) {

        input.value =
          sessionStorage.getItem(
            "genz_runway_api_key"
          ) || "";

        input.addEventListener(
          "input",
          () => {

            sessionStorage.setItem(
              "genz_runway_api_key",
              input.value.trim()
            );

          }
        );

      }

    },

    async generate() {

      throw new Error(
        "Runway adapter sudah disiapkan, tetapi endpoint API belum diaktifkan."
      );

    }

  }
);
