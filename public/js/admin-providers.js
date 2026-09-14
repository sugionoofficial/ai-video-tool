(function () {
  "use strict";

  const API_TIMEOUT = 15000;
  const AUTH_TIMEOUT = 10000;
  const CONFIG_TIMEOUT = 10000;

  const CHINAAPI_MODELS = [
    {
      id: "agnes-video-2.5-flash",
      name: "Agnes Video 2.5 Flash",
      credit: 1
    },
    {
      id: "doubao-seedance-2-0-mini-260615",
      name: "Doubao Seedance 2.0 Mini",
      credit: 2
    }
  ];

  const state = {
    providers: [],
    editingId: null,
    loading: false,
    initialized: false
  };

  function $(id) {
    return document.getElementById(id);
  }

  function object(value) {
    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value)
    ) {
      return {};
    }

    return value;
  }

  function html(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function number(value, fallback, min, max) {
    const n = Number.parseInt(value, 10);

    if (!Number.isFinite(n)) {
      return fallback;
    }

    return Math.min(
      max,
      Math.max(min, n)
    );
  }

  function discount(value) {
    return number(
      value,
      0,
      0,
      100
    );
  }

  function effectiveCredit(
    credit,
    percent
  ) {
    const base =
      number(
        credit,
        1,
        1,
        1000
      );

    const off =
      discount(
        percent
      );

    return Math.max(
      1,
      Math.round(
        base *
        (1 - off / 100)
      )
    );
  }

  function setStatus(
    message,
    type
  ) {
    const el =
      $("providerStatus");

    if (!el) {
      return;
    }

    el.textContent =
      message || "";

    el.className =
      "admin-status-message";

    if (type) {
      el.classList.add(
        type
      );
    }
  }

  function loadingMessage(
    message
  ) {
    const el =
      $("providerLoadingText");

    if (el) {
      el.textContent =
        message ||
        "Memuat...";
    }
  }

  function timeout(
    promise,
    ms,
    message
  ) {
    let timer;

    const wait =
      new Promise(
        function (_, reject) {
          timer =
            setTimeout(
              function () {
                const error =
                  new Error(
                    message
                  );

                error.status =
                  408;

                reject(
                  error
                );
              },
              ms
            );
        }
      );

    return Promise.race([
      promise,
      wait
    ]).finally(
      function () {
        clearTimeout(
          timer
        );
      }
    );
  }

  /* ============================================================
   * AUTH
   * ============================================================ */

  async function getClient() {
    if (
      window.GENZ_AUTH_CLIENT &&
      window.GENZ_AUTH_CLIENT.auth
    ) {
      return window.GENZ_AUTH_CLIENT;
    }

    if (
      window.GENZ &&
      window.GENZ.auth &&
      typeof window.GENZ.auth.getClient ===
        "function"
    ) {
      try {
        const client =
          await timeout(
            window.GENZ.auth.getClient(),
            AUTH_TIMEOUT,
            "Supabase client tidak merespons."
          );

        if (
          client &&
          client.auth
        ) {
          window.GENZ_AUTH_CLIENT =
            client;

          return client;
        }
      } catch (error) {
        console.warn(
          "[GEN-Z.AI] Auth client:",
          error
        );
      }
    }

    if (
      !window.supabase ||
      typeof window.supabase.createClient !==
        "function"
    ) {
      throw new Error(
        "Supabase client tidak tersedia."
      );
    }

    loadingMessage(
      "Memuat konfigurasi autentikasi..."
    );

    const response =
      await timeout(
        fetch(
          "/api/config",
          {
            method: "GET",
            headers: {
              Accept:
                "application/json"
            },
            cache:
              "no-store"
          }
        ),
        CONFIG_TIMEOUT,
        "Konfigurasi autentikasi tidak merespons."
      );

    if (!response.ok) {
      const error =
        new Error(
          "Gagal mengambil konfigurasi autentikasi (" +
          response.status +
          ")."
        );

      error.status =
        response.status;

      throw error;
    }

    const config =
      await response.json();

    const url =
      String(
        config?.supabaseUrl ||
        ""
      ).trim();

    const key =
      String(
        config?.supabasePublishableKey ||
        ""
      ).trim();

    if (!url || !key) {
      throw new Error(
        "Konfigurasi Supabase belum tersedia."
      );
    }

    const client =
      window.supabase.createClient(
        url,
        key,
        {
          auth: {
            persistSession:
              true,
            autoRefreshToken:
              true,
            detectSessionInUrl:
              true,
            storage:
              window.localStorage
          }
        }
      );

    window.GENZ_AUTH_CLIENT =
      client;

    return client;
  }

  async function token() {
    const client =
      await getClient();

    const result =
      await timeout(
        client.auth.getSession(),
        AUTH_TIMEOUT,
        "Session Supabase tidak merespons."
      );

    if (result?.error) {
      throw result.error;
    }

    const accessToken =
      result?.data?.session?.access_token;

    if (!accessToken) {
      const error =
        new Error(
          "Sesi login tidak ditemukan."
        );

      error.status =
        401;

      throw error;
    }

    return accessToken;
  }

  /* ============================================================
   * API
   * ============================================================ */

  async function api(
    path,
    options
  ) {
    const opts =
      options || {};

    const accessToken =
      await token();

    const headers =
      new Headers();

    headers.set(
      "Accept",
      "application/json"
    );

    headers.set(
      "Authorization",
      "Bearer " +
      accessToken
    );

    if (
      opts.body !==
      undefined
    ) {
      headers.set(
        "Content-Type",
        "application/json; charset=utf-8"
      );
    }

    const controller =
      new AbortController();

    const timer =
      setTimeout(
        function () {
          controller.abort();
        },
        API_TIMEOUT
      );

    try {
      const response =
        await fetch(
          path,
          {
            method:
              opts.method ||
              "GET",

            headers,

            body:
              opts.body,

            signal:
              controller.signal,

            cache:
              "no-store"
          }
        );

      let data = null;

      const contentType =
        response.headers.get(
          "content-type"
        ) || "";

      if (
        contentType.includes(
          "application/json"
        )
      ) {
        try {
          data =
            await response.json();
        } catch (_) {
          data = null;
        }
      } else {
        try {
          const text =
            await response.text();

          if (text) {
            data = {
              message:
                text
            };
          }
        } catch (_) {
          data = null;
        }
      }

      if (!response.ok) {
        const error =
          new Error(
            data?.error ||
            data?.message ||
            "Permintaan API gagal (" +
            response.status +
            ")."
          );

        error.status =
          response.status;

        throw error;
      }

      return data;
    } catch (error) {
      if (
        error?.name ===
        "AbortError"
      ) {
        const timeoutError =
          new Error(
            "Server terlalu lama merespons."
          );

        timeoutError.status =
          408;

        throw timeoutError;
      }

      throw error;
    } finally {
      clearTimeout(
        timer
      );
    }
  }

  /* ============================================================
   * PROVIDER NORMALIZER
   * ============================================================ */

  function normalizeProvider(
    raw
  ) {
    const item =
      raw || {};

    return {
      ...item,

      id:
        item.id ??
        item.provider_id ??
        "",

      name:
        item.name ??
        item.provider_name ??
        "",

      adapter:
        item.adapter ??
        "",

      config:
        object(
          item.config
        ),

      enabled:
        item.enabled !==
        undefined
          ? Boolean(
              item.enabled
            )
          : item.active !==
            undefined
            ? Boolean(
                item.active
              )
            : true,

      apiKeySet:
        Boolean(
          item.apiKeySet ||
          item.api_key
        )
    };
  }

  /* ============================================================
   * MODEL DATA
   * ============================================================ */

  function modelData(
    provider
  ) {
    const item =
      normalizeProvider(
        provider
      );

    const config =
      object(
        item.config
      );

    const capabilities =
      object(
        item.capabilities
      );

    const configCapabilities =
      object(
        config.capabilities
      );

    const credits = {
      ...object(
        config.modelCredits
      ),
      ...object(
        item.modelCredits
      )
    };

    const discounts = {
      ...object(
        config.modelDiscounts
      ),
      ...object(
        item.modelDiscounts
      )
    };

    const enabled = {
      ...object(
        config.modelEnabled
      ),
      ...object(
        item.modelEnabled
      )
    };

    const models = [];

    function add(
      id,
      name,
      credit
    ) {
      const modelId =
        String(
          id || ""
        ).trim();

      if (!modelId) {
        return;
      }

      if (
        models.some(
          function (model) {
            return (
              model.id ===
              modelId
            );
          }
        )
      ) {
        return;
      }

      models.push({
        id:
          modelId,

        name:
          String(
            name ||
            modelId
          ),

        credit:
          number(
            credit ??
            credits[modelId] ??
            1,
            1,
            1,
            1000
          ),

        discount:
          discount(
            discounts[
              modelId
            ] ??
            0
          ),

        active:
          enabled[
            modelId
          ] !== undefined
            ? Boolean(
                enabled[
                  modelId
                ]
              )
            : true
      });
    }

    function readModels(
      value
    ) {
      if (
        !Array.isArray(
          value
        )
      ) {
        return;
      }

      value.forEach(
        function (model) {
          if (
            typeof model ===
            "string"
          ) {
            add(
              model,
              model,
              credits[model]
            );

            return;
          }

          if (
            model &&
            typeof model ===
              "object"
          ) {
            const id =
              model.id ||
              model.model ||
              model.modelId ||
              model.value;

            add(
              id,
              model.name ||
              model.label ||
              model.title ||
              id,
              model.credit ??
              model.credits ??
              model.defaultCredit ??
              credits[id]
            );
          }
        }
      );
    }

    readModels(
      item.models
    );

    readModels(
      capabilities.models
    );

    readModels(
      config.models
    );

    readModels(
      configCapabilities.models
    );

    Object.keys(
      credits
    ).forEach(
      function (id) {
        add(
          id,
          id,
          credits[id]
        );
      }
    );

    Object.keys(
      discounts
    ).forEach(
      function (id) {
        add(
          id,
          id,
          credits[id]
        );
      }
    );

    Object.keys(
      enabled
    ).forEach(
      function (id) {
        add(
          id,
          id,
          credits[id]
        );
      }
    );

    /*
     * Fallback khusus ChinaAPI.
     */
    if (
      String(
        item.adapter ||
        ""
      ).toLowerCase() ===
      "chinaapi"
    ) {
      CHINAAPI_MODELS.forEach(
        function (model) {
          add(
            model.id,
            model.name,
            credits[
              model.id
            ] ??
            model.credit
          );
        }
      );
    }

    return {
      models,
      credits,
      discounts,
      enabled
    };
  }

  /* ============================================================
   * MODEL EDITOR
   * ============================================================ */

  function renderModelEditor(
    provider
  ) {
    const data =
      modelData(
        provider
      );

    if (
      !data.models.length
    ) {
      return (
        '<div style="' +
        "margin-top:18px;" +
        "padding:16px;" +
        "border:1px solid rgba(255,255,255,.08);" +
        "border-radius:12px;" +
        "background:rgba(255,255,255,.02);" +
        '">' +

        "<strong>Credit & Diskon Model</strong>" +

        '<p style="margin:8px 0 0;color:#8d96a8;font-size:12px;">' +
        "Tidak ada model yang dikirim oleh provider." +
        "</p>" +

        "</div>"
      );
    }

    let output =
      '<div style="' +
      "margin-top:18px;" +
      "padding:16px;" +
      "border:1px solid rgba(255,255,255,.08);" +
      "border-radius:12px;" +
      "background:rgba(255,255,255,.02);" +
      '">' +

      "<h3 style=\"margin:0 0 6px;color:#fff;\">" +
      "Credit & Diskon Model" +
      "</h3>" +

      '<p style="margin:0 0 16px;color:#8d96a8;font-size:12px;">' +
      "Atur credit dasar dan diskon untuk setiap model." +
      "</p>" +

      '<div style="display:grid;gap:12px;">';

    data.models.forEach(
      function (model) {
        const key =
          String(
            model.id
          ).replace(
            /[^a-zA-Z0-9_-]/g,
            "_"
          );

        output +=
          '<div style="' +
          "padding:14px;" +
          "border:1px solid rgba(255,255,255,.07);" +
          "border-radius:10px;" +
          "background:rgba(255,255,255,.015);" +
          '">' +

          '<div style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap;">' +

          "<div>" +

          '<strong style="display:block;color:#fff;">' +
          html(
            model.name
          ) +
          "</strong>" +

          '<small style="color:#8d96a8;">' +
          html(
            model.id
          ) +
          "</small>" +

          "</div>" +

          '<label style="display:flex;align-items:center;gap:7px;color:#dce1ea;font-size:12px;">' +

          '<input ' +
          'type="checkbox" ' +
          'class="provider-model-active" ' +
          'data-model="' +
          html(
            model.id
          ) +
          '" ' +
          (
            model.active
              ? "checked"
              : ""
          ) +
          ">" +

          "Model aktif" +

          "</label>" +

          "</div>" +

          '<div style="' +
          "display:grid;" +
          "grid-template-columns:repeat(3,minmax(0,1fr));" +
          "gap:10px;" +
          "margin-top:12px;" +
          '">' +

          "<div>" +

          '<label style="display:block;margin-bottom:6px;color:#dce1ea;font-size:12px;">' +
          "Credit" +
          "</label>" +

          '<input ' +
          'type="number" ' +
          'class="provider-model-credit" ' +
          'data-model="' +
          html(
            model.id
          ) +
          '" ' +
          'min="1" max="1000" step="1" ' +
          'value="' +
          model.credit +
          '">' +

          "</div>" +

          "<div>" +

          '<label style="display:block;margin-bottom:6px;color:#dce1ea;font-size:12px;">' +
          "Diskon (%)" +
          "</label>" +

          '<input ' +
          'type="number" ' +
          'class="provider-model-discount" ' +
          'data-model="' +
          html(
            model.id
          ) +
          '" ' +
          'min="0" max="100" step="1" ' +
          'value="' +
          model.discount +
          '">' +

          "</div>" +

          "<div>" +

          '<div class="provider-effective-credit" ' +
          'data-model="' +
          html(
            model.id
          ) +
          '" ' +
          'style="' +
          "padding:10px 12px;" +
          "border-radius:8px;" +
          "background:rgba(39,214,154,.08);" +
          '">' +

          '<small style="display:block;color:#8d96a8;">' +
          "Credit efektif" +
          "</small>" +

          '<strong style="display:block;margin-top:4px;color:#27d69a;font-size:18px;">' +
          effectiveCredit(
            model.credit,
            model.discount
          ) +
          "</strong>" +

          "</div>" +

          "</div>" +

          "</div>" +

          "</div>";
      }
    );

    output +=
      "</div>" +
      "</div>";

    return output;
  }

  function bindModelInputs() {
    const editor =
      $("providerEditor");

    if (!editor) {
      return;
    }

    editor.addEventListener(
      "input",
      function (event) {
        const input =
          event.target;

        if (
          !input.classList.contains(
            "provider-model-credit"
          ) &&
          !input.classList.contains(
            "provider-model-discount"
          )
        ) {
          return;
        }

        const id =
          input.dataset.model;

        const creditInput =
          editor.querySelector(
            '.provider-model-credit[data-model="' +
            id +
            '"]'
          );

        const discountInput =
          editor.querySelector(
            '.provider-model-discount[data-model="' +
            id +
            '"]'
          );

        const output =
          editor.querySelector(
            '.provider-effective-credit[data-model="' +
            id +
            '"] strong'
          );

        if (
          !creditInput ||
          !discountInput ||
          !output
        ) {
          return;
        }

        output.textContent =
          effectiveCredit(
            creditInput.value,
            discountInput.value
          );
      }
    );
  }

  function collectModelConfig(
    provider,
    config
  ) {
    const data =
      modelData(
        provider
      );

    const editor =
      $("providerEditor");

    const credits = {
      ...data.credits
    };

    const discounts = {
      ...data.discounts
    };

    const enabled = {
      ...data.enabled
    };

    if (editor) {
      editor
        .querySelectorAll(
          ".provider-model-credit"
        )
        .forEach(
          function (input) {
            const id =
              input.dataset.model;

            if (id) {
              credits[id] =
                number(
                  input.value,
                  1,
                  1,
                  1000
                );
            }
          }
        );

      editor
        .querySelectorAll(
          ".provider-model-discount"
        )
        .forEach(
          function (input) {
            const id =
              input.dataset.model;

            if (id) {
              discounts[id] =
                discount(
                  input.value
                );
            }
          }
        );

      editor
        .querySelectorAll(
          ".provider-model-active"
        )
        .forEach(
          function (input) {
            const id =
              input.dataset.model;

            if (id) {
              enabled[id] =
                Boolean(
                  input.checked
                );
            }
          }
        );
    }

    config.modelCredits =
      credits;

    config.modelDiscounts =
      discounts;

    config.modelEnabled =
      enabled;

    return config;
  }

  /* ============================================================
   * EDITOR
   * ============================================================ */

  function openEditor(
    provider
  ) {
    const editor =
      $("providerEditor");

    if (!editor) {
      return;
    }

    const item =
      provider
        ? normalizeProvider(
            provider
          )
        : null;

    state.editingId =
      item?.id ||
      null;

    const config =
      {
        ...object(
          item?.config
        )
      };

    editor.hidden =
      false;

    editor.innerHTML =
      '<div class="admin-card">' +

      '<div class="admin-card-header">' +

      "<div>" +

      "<h3>" +
      (
        item
          ? "Edit Provider"
          : "Tambah Provider"
      ) +
      "</h3>" +

      "<p>" +
      (
        item
          ? "Atur konfigurasi dan harga model."
          : "Tambahkan provider baru."
      ) +
      "</p>" +

      "</div>" +

      "</div>" +

      '<form id="providerForm" class="admin-form" novalidate>' +

      '<div class="form-group">' +
      "<label>Provider ID</label>" +
      '<input id="providerId" type="text" required ' +
      (
        item
          ? 'value="' +
            html(
              item.id
            ) +
            '" readonly'
          : ""
      ) +
      ">" +
      "</div>" +

      '<div class="form-group">' +
      "<label>Provider Name</label>" +
      '<input id="providerName" type="text" required value="' +
      html(
        item?.name ||
        ""
      ) +
      '">' +
      "</div>" +

      '<div class="form-group">' +
      "<label>Adapter</label>" +
      '<input id="providerAdapter" type="text" required value="' +
      html(
        item?.adapter ||
        ""
      ) +
      '">' +
      "</div>" +

      '<div class="form-group">' +
      "<label>API Key</label>" +
      '<input id="providerApiKey" type="password" autocomplete="new-password" ' +
      'placeholder="' +
      (
        item
          ? "Kosongkan jika tidak ingin mengubah API key"
          : "Masukkan API key"
      ) +
      '">' +
      "</div>" +

      (
        item
          ? renderModelEditor(
              item
            )
          : ""
      ) +

      '<div class="form-group">' +
      "<label>Config JSON</label>" +
      '<textarea id="providerConfig" spellcheck="false">' +
      html(
        JSON.stringify(
          config,
          null,
          2
        )
      ) +
      "</textarea>" +
      "</div>" +

      '<label class="admin-checkbox">' +
      '<input id="providerEnabled" type="checkbox" ' +
      (
        !item ||
        item.enabled
          ? "checked"
          : ""
      ) +
      ">" +
      "<span>Provider aktif</span>" +
      "</label>" +

      '<div class="admin-actions">' +

      '<button type="button" id="providerCancelBtn">' +
      "Batal" +
      "</button>" +

      '<button type="submit" class="admin-primary-btn" id="providerSaveBtn">' +
      (
        item
          ? "Simpan Perubahan"
          : "Simpan Provider"
      ) +
      "</button>" +

      "</div>" +

      "</form>" +

      "</div>";

    bindModelInputs();

    const form =
      $("providerForm");

    if (form) {
      form.addEventListener(
        "submit",
        function (event) {
          event.preventDefault();
          saveProvider();
        }
      );
    }

    const cancel =
      $("providerCancelBtn");

    if (cancel) {
      cancel.addEventListener(
        "click",
        closeEditor
      );
    }

    editor.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  function closeEditor() {
    const editor =
      $("providerEditor");

    if (editor) {
      editor.hidden =
        true;

      editor.innerHTML =
        "";
    }

    state.editingId =
      null;
  }

  /* ============================================================
   * SAVE
   * ============================================================ */

  async function saveProvider() {
    const id =
      String(
        $("providerId")?.value ||
        ""
      ).trim();

    const name =
      String(
        $("providerName")?.value ||
        ""
      ).trim();

    const adapter =
      String(
        $("providerAdapter")?.value ||
        ""
      ).trim();

    const apiKey =
      String(
        $("providerApiKey")?.value ||
        ""
      ).trim();

    const enabled =
      Boolean(
        $("providerEnabled")?.checked
      );

    if (!id) {
      setStatus(
        "Provider ID wajib diisi.",
        "error"
      );
      return;
    }

    if (!name) {
      setStatus(
        "Provider Name wajib diisi.",
        "error"
      );
      return;
    }

    if (!adapter) {
      setStatus(
        "Adapter wajib diisi.",
        "error"
      );
      return;
    }

    let config = {};

    const configText =
      String(
        $("providerConfig")?.value ||
        ""
      ).trim();

    if (configText) {
      try {
        config =
          JSON.parse(
            configText
          );
      } catch (_) {
        setStatus(
          "Config JSON tidak valid.",
          "error"
        );
        return;
      }
    }

    const current =
      state.providers.find(
        function (provider) {
          return String(
            normalizeProvider(
              provider
            ).id
          ) ===
          String(
            state.editingId
          );
        }
      );

    if (current) {
      config =
        collectModelConfig(
          current,
          config
        );
    }

    if (
      !state.editingId &&
      !apiKey
    ) {
      setStatus(
        "API Key wajib diisi.",
        "error"
      );
      return;
    }

    const payload = {
      id,
      name,
      adapter,
      enabled,
      config
    };

    if (apiKey) {
      payload.api_key =
        apiKey;
    }

    const editing =
      Boolean(
        state.editingId
      );

    const endpoint =
      editing
        ? "/api/admin/providers/" +
          encodeURIComponent(
            state.editingId
          )
        : "/api/admin/providers";

    const button =
      $("providerSaveBtn");

    if (button) {
      button.disabled =
        true;

      button.textContent =
        "Menyimpan...";
    }

    try {
      await api(
        endpoint,
        {
          method:
            editing
              ? "PUT"
              : "POST",

          body:
            JSON.stringify(
              payload
            )
        }
      );

      closeEditor();

      setStatus(
        "Provider berhasil disimpan.",
        "success"
      );

      await loadProviders();
    } catch (error) {
      console.error(
        "[GEN-Z.AI] Save provider:",
        error
      );

      setStatus(
        error?.message ||
        "Gagal menyimpan provider.",
        "error"
      );
    } finally {
      const currentButton =
        $("providerSaveBtn");

      if (currentButton) {
        currentButton.disabled =
          false;
      }
    }
  }

  /* ============================================================
   * LIST
   * ============================================================ */

  function renderProviders() {
    const list =
      $("providerList");

    const count =
      $("providerCount");

    if (!list) {
      return;
    }

    if (count) {
      count.textContent =
        state.providers.length +
        (
          state.providers.length ===
          1
            ? " provider"
            : " providers"
        );
    }

    if (!state.providers.length) {
      list.innerHTML =
        '<div class="admin-empty">' +
        "<strong>Belum ada provider.</strong>" +
        "</div>";

      return;
    }

    list.innerHTML =
      state.providers
        .map(
          function (raw) {
            const provider =
              normalizeProvider(
                raw
              );

            return (
              '<div class="admin-list-item">' +

              '<div class="admin-list-main">' +

              "<h3>" +
              html(
                provider.name ||
                provider.id
              ) +
              "</h3>" +

              "<p>ID: " +
              html(
                provider.id
              ) +
              "</p>" +

              "<p>Adapter: " +
              html(
                provider.adapter ||
                "-"
              ) +
              "</p>" +

              "<p>API Key: " +
              (
                provider.apiKeySet
                  ? "Tersedia"
                  : "Belum diatur"
              ) +
              "</p>" +

              '<span class="status-badge ' +
              (
                provider.enabled
                  ? "active"
                  : "inactive"
              ) +
              '">' +
              (
                provider.enabled
                  ? "Aktif"
                  : "Nonaktif"
              ) +
              "</span>" +

              "</div>" +

              '<div class="admin-actions">' +

              '<button type="button" data-action="edit" data-id="' +
              html(
                provider.id
              ) +
              '">' +
              "Edit" +
              "</button>" +

              '<button type="button" data-action="toggle" data-id="' +
              html(
                provider.id
              ) +
              '">' +
              (
                provider.enabled
                  ? "Nonaktifkan"
                  : "Aktifkan"
              ) +
              "</button>" +

              '<button type="button" data-action="delete" data-id="' +
              html(
                provider.id
              ) +
              '">' +
              "Hapus" +
              "</button>" +

              "</div>" +

              "</div>"
            );
          }
        )
        .join("");
  }

  async function loadProviders() {
    if (state.loading) {
      return;
    }

    state.loading =
      true;

    try {
      setStatus(
        "Memuat provider...",
        ""
      );

      const data =
        await api(
          "/api/admin/providers",
          {
            method:
              "GET"
          }
        );

      const providers =
        Array.isArray(
          data?.providers
        )
          ? data.providers
          : Array.isArray(
              data?.data
            )
            ? data.data
            : Array.isArray(
                data
              )
              ? data
              : [];

      state.providers =
        providers.map(
          normalizeProvider
        );

      renderProviders();

      setStatus(
        state.providers.length +
        " provider berhasil dimuat.",
        "success"
      );
    } catch (error) {
      console.error(
        "[GEN-Z.AI] Load providers:",
        error
      );

      if (
        error?.status ===
        401
      ) {
        showDenied(
          "Sesi login tidak ditemukan."
        );
        return;
      }

      if (
        error?.status ===
        403
      ) {
        showDenied(
          "Akun ini tidak memiliki akses administrator."
        );
        return;
      }

      setStatus(
        error?.message ||
        "Gagal memuat provider.",
        "error"
      );
    } finally {
      state.loading =
        false;
    }
  }

  async function toggleProvider(
    id
  ) {
    const provider =
      state.providers.find(
        function (item) {
          return String(
            normalizeProvider(
              item
            ).id
          ) ===
          String(id);
        }
      );

    if (!provider) {
      return;
    }

    const item =
      normalizeProvider(
        provider
      );

    try {
      await api(
        "/api/admin/providers/" +
        encodeURIComponent(
          item.id
        ) +
        "/toggle",
        {
          method:
            "POST"
        }
      );

      await loadProviders();
    } catch (error) {
      setStatus(
        error?.message ||
        "Gagal mengubah status provider.",
        "error"
      );
    }
  }

  async function deleteProvider(
    id
  ) {
    const provider =
      state.providers.find(
        function (item) {
          return String(
            normalizeProvider(
              item
            ).id
          ) ===
          String(id);
        }
      );

    if (!provider) {
      return;
    }

    const item =
      normalizeProvider(
        provider
      );

    if (
      !window.confirm(
        "Hapus provider \"" +
        (
          item.name ||
          item.id
        ) +
        "\"?"
      )
    ) {
      return;
    }

    try {
      await api(
        "/api/admin/providers/" +
        encodeURIComponent(
          item.id
        ),
        {
          method:
            "DELETE"
        }
      );

      await loadProviders();
    } catch (error) {
      setStatus(
        error?.message ||
        "Gagal menghapus provider.",
        "error"
      );
    }
  }

  /* ============================================================
   * NAVIGATION
   * ============================================================ */

  function goBack() {
    if (
      window.history.length >
      1
    ) {
      window.history.back();
      return;
    }

    window.location.href =
      "/";
  }

  /* ============================================================
   * EVENTS
   * ============================================================ */

  function bindEvents() {
    const back =
      $("providerBackBtn");

    if (back) {
      back.type =
        "button";

      back.addEventListener(
        "click",
        function (event) {
          event.preventDefault();
          goBack();
        }
      );
    }

    const refresh =
      $("refreshProvidersBtn");

    if (refresh) {
      refresh.type =
        "button";

      refresh.addEventListener(
        "click",
        function (event) {
          event.preventDefault();

          if (!state.loading) {
            loadProviders();
          }
        }
      );
    }

    const add =
      $("addProviderBtn");

    if (add) {
      add.type =
        "button";

      add.addEventListener(
        "click",
        function (event) {
          event.preventDefault();
          openEditor(
            null
          );
        }
      );
    }

    const list =
      $("providerList");

    if (list) {
      list.addEventListener(
        "click",
        function (event) {
          const button =
            event.target.closest(
              "[data-action]"
            );

          if (!button) {
            return;
          }

          event.preventDefault();

          const action =
            button.dataset.action;

          const id =
            button.dataset.id;

          if (
            action ===
            "edit"
          ) {
            const provider =
              state.providers.find(
                function (item) {
                  return String(
                    normalizeProvider(
                      item
                    ).id
                  ) ===
                  String(id);
                }
              );

            if (provider) {
              openEditor(
                provider
              );
            }

            return;
          }

          if (
            action ===
            "toggle"
          ) {
            toggleProvider(
              id
            );

            return;
          }

          if (
            action ===
            "delete"
          ) {
            deleteProvider(
              id
            );
          }
        }
      );
    }
  }

  /* ============================================================
   * VIEW
   * ============================================================ */

  function showApp() {
    const loading =
      $("providerLoading");

    const denied =
      $("providerDenied");

    const app =
      $("providerApp");

    if (loading) {
      loading.hidden =
        true;
    }

    if (denied) {
      denied.hidden =
        true;
    }

    if (app) {
      app.hidden =
        false;
    }
  }

  function showDenied(
    message
  ) {
    const loading =
      $("providerLoading");

    const denied =
      $("providerDenied");

    const app =
      $("providerApp");

    if (loading) {
      loading.hidden =
        true;
    }

    if (app) {
      app.hidden =
        true;
    }

    if (denied) {
      denied.hidden =
        false;
    }

    const messageEl =
      $("providerDeniedMessage");

    if (messageEl) {
      messageEl.textContent =
        message ||
        "Akses ditolak.";
    }

    setStatus(
      message ||
      "Akses ditolak.",
      "error"
    );
  }

  /* ============================================================
   * INIT
   * ============================================================ */

  async function init() {
    if (
      state.initialized
    ) {
      return;
    }

    state.initialized =
      true;

    try {
      loadingMessage(
        "Memeriksa sesi administrator..."
      );

      await token();

      showApp();

      /*
       * Event dipasang SEBELUM load API.
       * Jadi Refresh/Kembali tetap aktif
       * walaupun API mengalami error.
       */
      bindEvents();

      await loadProviders();
    } catch (error) {
      console.error(
        "[GEN-Z.AI] Provider init:",
        error
      );

      if (
        error?.status ===
        401
      ) {
        showDenied(
          "Sesi login tidak ditemukan."
        );
        return;
      }

      if (
        error?.status ===
        403
      ) {
        showDenied(
          "Akun ini tidak memiliki akses administrator."
        );
        return;
      }

      showDenied(
        error?.message ||
        "Gagal memuat Provider Management."
      );
    }
  }

  window.GENZ_ADMIN_PROVIDERS = {
    init:
      init,

    load:
      loadProviders,

    refresh:
      loadProviders,

    getState:
      function () {
        return {
          providers:
            state.providers.slice(),

          editingId:
            state.editingId,

          loading:
            state.loading,

          initialized:
            state.initialized
        };
      }
  };

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      init,
      {
        once: true
      }
    );
  } else {
    init();
  }
})();
