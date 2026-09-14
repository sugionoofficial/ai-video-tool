/* ============================================================
 * GEN-Z.AI
 * ADMIN PROVIDER MANAGEMENT
 * ============================================================ */

(function () {
  "use strict";

  const API_TIMEOUT = 15000;
  const AUTH_TIMEOUT = 10000;
  const CONFIG_TIMEOUT = 10000;

  const CHINAAPI_MODELS = [
    {
      id: "agnes-video-2.5-flash",
      name: "Agnes Video 2.5 Flash",
      defaultCredit: 1
    },
    {
      id: "doubao-seedance-2-0-mini-260615",
      name: "Doubao Seedance 2.0 Mini",
      defaultCredit: 2
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

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalizeObject(value) {
    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value)
    ) {
      return {};
    }

    return value;
  }

  function normalizeInteger(
    value,
    fallback = 1,
    min = 1,
    max = 1000
  ) {
    const number = Number.parseInt(value, 10);

    if (!Number.isFinite(number)) {
      return fallback;
    }

    return Math.min(
      max,
      Math.max(min, number)
    );
  }

  function normalizeDiscount(value) {
    const number = Number.parseInt(value, 10);

    if (!Number.isFinite(number)) {
      return 0;
    }

    return Math.min(
      100,
      Math.max(0, number)
    );
  }

  function getEffectiveCredit(
    credit,
    discount
  ) {
    const base =
      normalizeInteger(
        credit,
        1,
        1,
        1000
      );

    const percentage =
      normalizeDiscount(
        discount
      );

    return Math.max(
      1,
      Math.min(
        1000,
        Math.round(
          base *
          (1 - percentage / 100)
        )
      )
    );
  }

  function safeModelKey(modelId) {
    return String(modelId || "")
      .replace(
        /[^a-zA-Z0-9_-]/g,
        "_"
      );
  }

  function getValue(
    object,
    key,
    fallback
  ) {
    const source =
      normalizeObject(
        object
      );

    return source[key] !== undefined &&
      source[key] !== null
      ? source[key]
      : fallback;
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

  function setLoadingMessage(
    message
  ) {
    const loading =
      $("providerLoading");

    if (!loading) {
      return;
    }

    const paragraph =
      loading.querySelector(
        "p"
      );

    if (paragraph) {
      paragraph.textContent =
        message ||
        "Memeriksa akses administrator...";
    }
  }

  function withTimeout(
    promise,
    ms,
    message
  ) {
    let timer;

    const timeout =
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
      timeout
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

  async function createSupabaseClient() {
    if (
      !window.supabase ||
      typeof window.supabase.createClient !==
        "function"
    ) {
      const error =
        new Error(
          "Supabase client tidak tersedia."
        );

      error.status =
        503;

      throw error;
    }

    setLoadingMessage(
      "Memuat konfigurasi autentikasi..."
    );

    const response =
      await withTimeout(
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

    const supabaseUrl =
      String(
        config?.supabaseUrl ||
        ""
      ).trim();

    const publishableKey =
      String(
        config?.supabasePublishableKey ||
        ""
      ).trim();

    if (
      !supabaseUrl ||
      !publishableKey
    ) {
      const error =
        new Error(
          "Konfigurasi Supabase belum tersedia."
        );

      error.status =
        503;

      throw error;
    }

    const client =
      window.supabase.createClient(
        supabaseUrl,
        publishableKey,
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

  async function getSupabaseClient() {
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
          await withTimeout(
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
          "[GEN-Z.AI Provider] Auth client gagal:",
          error
        );
      }
    }

    return createSupabaseClient();
  }

  async function getAccessToken() {
    const client =
      await getSupabaseClient();

    const result =
      await withTimeout(
        client.auth.getSession(),
        AUTH_TIMEOUT,
        "Session Supabase tidak merespons."
      );

    if (result?.error) {
      throw result.error;
    }

    const token =
      result?.data?.session?.access_token;

    if (!token) {
      const error =
        new Error(
          "Sesi login tidak ditemukan."
        );

      error.status =
        401;

      throw error;
    }

    return token;
  }

  /* ============================================================
   * API
   * ============================================================ */

  async function api(
    path,
    options = {}
  ) {
    const token =
      await getAccessToken();

    const headers =
      new Headers();

    headers.set(
      "Accept",
      "application/json"
    );

    headers.set(
      "Authorization",
      "Bearer " +
        token
    );

    if (
      options.body !==
      undefined &&
      options.body !== null
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
              options.method ||
              "GET",

            headers,

            body:
              options.body,

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
   * NORMALIZE PROVIDER
   * ============================================================ */

  function normalizeProvider(
    provider
  ) {
    const item =
      provider || {};

    const config =
      normalizeObject(
        item.config
      );

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

      config,

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

      apiKey:
        item.api_key ??
        item.apiKey ??
        "",

      apiKeySet:
        Boolean(
          item.apiKeySet ||
          item.api_key
        )
    };
  }

  /* ============================================================
   * MODEL SOURCE MERGER
   *
   * Penting:
   * Backend dapat mengirim:
   *
   * provider.models
   * provider.capabilities.models
   * provider.modelCredits
   * provider.modelDiscounts
   * provider.modelEnabled
   *
   * bukan hanya provider.config.*
   * ============================================================ */

  function getModelSource(
    provider
  ) {
    const item =
      normalizeProvider(
        provider
      );

    const config =
      normalizeObject(
        item.config
      );

    const sources = [
      item,
      config,
      item.capabilities,
      config.capabilities
    ];

    return {
      models:
        sources.find(
          function (source) {
            return (
              Array.isArray(
                source?.models
              ) &&
              source.models.length
            );
          }
        )?.models || [],

      modelIds:
        sources.find(
          function (source) {
            return (
              Array.isArray(
                source?.modelIds
              ) &&
              source.modelIds.length
            );
          }
        )?.modelIds || [],

      modelCredits:
        {
          ...normalizeObject(
            config.modelCredits
          ),
          ...normalizeObject(
            item.modelCredits
          )
        },

      modelDiscounts:
        {
          ...normalizeObject(
            config.modelDiscounts
          ),
          ...normalizeObject(
            item.modelDiscounts
          )
        },

      modelEnabled:
        {
          ...normalizeObject(
            config.modelEnabled
          ),
          ...normalizeObject(
            item.modelEnabled
          )
        }
    };
  }

  function getModelDefinitions(
    provider
  ) {
    const item =
      normalizeProvider(
        provider
      );

    const source =
      getModelSource(
        item
      );

    const definitions =
      [];

    const seen =
      new Set();

    function addModel(
      id,
      name,
      credit
    ) {
      const modelId =
        String(
          id || ""
        ).trim();

      if (
        !modelId ||
        seen.has(
          modelId
        )
      ) {
        return;
      }

      seen.add(
        modelId
      );

      definitions.push({
        id:
          modelId,

        name:
          String(
            name ||
            modelId
          ),

        defaultCredit:
          normalizeInteger(
            credit,
            1,
            1,
            1000
          )
      });
    }

    /*
     * Model yang benar-benar dikirim
     * oleh backend.
     */
    source.models.forEach(
      function (model) {
        if (
          typeof model ===
          "string"
        ) {
          addModel(
            model,
            model,
            source.modelCredits[
              model
            ] ??
            1
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

          const name =
            model.name ||
            model.label ||
            model.title ||
            id;

          const credit =
            model.credit ??
            model.credits ??
            model.defaultCredit ??
            source.modelCredits[
              id
            ] ??
            1;

          addModel(
            id,
            name,
            credit
          );
        }
      }
    );

    /*
     * modelIds dari backend.
     */
    source.modelIds.forEach(
      function (id) {
        addModel(
          id,
          id,
          source.modelCredits[
            id
          ] ??
          1
        );
      }
    );

    /*
     * Model yang sudah memiliki
     * credit / diskon / enabled.
     *
     * Ini penting supaya model tetap
     * muncul walaupun endpoint hanya
     * mengirim mapping konfigurasi.
     */
    [
      ...Object.keys(
        source.modelCredits
      ),
      ...Object.keys(
        source.modelDiscounts
      ),
      ...Object.keys(
        source.modelEnabled
      )
    ].forEach(
      function (id) {
        addModel(
          id,
          id,
          source.modelCredits[
            id
          ] ??
          1
        );
      }
    );

    /*
     * ChinaAPI fallback.
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
          addModel(
            model.id,
            model.name,
            source.modelCredits[
              model.id
            ] ??
            model.defaultCredit
          );
        }
      );
    }

    return definitions;
  }

  function getModelSettings(
    provider,
    model
  ) {
    const source =
      getModelSource(
        provider
      );

    return {
      enabled:
        source.modelEnabled[
          model.id
        ] !== undefined
          ? Boolean(
              source.modelEnabled[
                model.id
              ]
            )
          : true,

      credit:
        normalizeInteger(
          source.modelCredits[
            model.id
          ],
          model.defaultCredit,
          1,
          1000
        ),

      discount:
        normalizeDiscount(
          source.modelDiscounts[
            model.id
          ] ??
          0
        )
    };
  }

  /* ============================================================
   * MODEL UI
   * ============================================================ */

  function renderModelSettings(
    provider
  ) {
    const models =
      getModelDefinitions(
        provider
      );

    if (!models.length) {
      return (
        '<div class="provider-model-settings" ' +
        'style="' +
        "margin-top:18px;" +
        "padding:16px;" +
        "border:1px solid rgba(127,127,127,.22);" +
        "border-radius:12px;" +
        "background:rgba(127,127,127,.05);" +
        '">' +

        "<h4 style=\"margin:0 0 6px;\">" +
        "Credit & Diskon Model" +
        "</h4>" +

        "<p style=\"margin:0;opacity:.7;\">" +
        "Model belum tersedia dari konfigurasi provider." +
        "</p>" +

        "</div>"
      );
    }

    let html =
      '<div class="provider-model-settings" ' +
      'style="' +
      "margin-top:18px;" +
      "padding:16px;" +
      "border:1px solid rgba(127,127,127,.22);" +
      "border-radius:12px;" +
      "background:rgba(127,127,127,.05);" +
      '">' +

      "<h4 style=\"margin:0 0 6px;\">" +
      "Credit & Diskon Model" +
      "</h4>" +

      "<p style=\"margin:0 0 14px;opacity:.7;\">" +
      "Atur credit dasar dan diskon untuk setiap model." +
      "</p>" +

      '<div style="display:grid;gap:12px;">';

    models.forEach(
      function (model) {
        const settings =
          getModelSettings(
            provider,
            model
          );

        const key =
          safeModelKey(
            model.id
          );

        const effective =
          getEffectiveCredit(
            settings.credit,
            settings.discount
          );

        html +=
          '<div class="provider-model-row" ' +
          'style="' +
          "padding:14px;" +
          "border:1px solid rgba(127,127,127,.18);" +
          "border-radius:10px;" +
          "background:rgba(127,127,127,.04);" +
          '">' +

          '<div style="' +
          "display:flex;" +
          "justify-content:space-between;" +
          "align-items:flex-start;" +
          "gap:12px;" +
          "flex-wrap:wrap;" +
          '">' +

          "<div>" +

          '<strong style="display:block;">' +
          escapeHtml(
            model.name
          ) +
          "</strong>" +

          '<small style="opacity:.65;">' +
          escapeHtml(
            model.id
          ) +
          "</small>" +

          "</div>" +

          '<label style="' +
          "display:flex;" +
          "align-items:center;" +
          "gap:8px;" +
          "cursor:pointer;" +
          '">' +

          '<input type="checkbox" ' +
          'class="provider-model-enabled" ' +
          'data-model-id="' +
          escapeHtml(
            model.id
          ) +
          '" ' +
          (
            settings.enabled
              ? "checked"
              : ""
          ) +
          ">" +

          "<span>Model aktif</span>" +

          "</label>" +

          "</div>" +

          '<div style="' +
          "display:grid;" +
          "grid-template-columns:repeat(auto-fit,minmax(160px,1fr));" +
          "gap:10px;" +
          "margin-top:12px;" +
          '">' +

          "<div>" +

          '<label for="provider-credit-' +
          key +
          '">Credit</label>' +

          '<input type="number" ' +
          'id="provider-credit-' +
          key +
          '" ' +
          'class="provider-model-credit" ' +
          'data-model-id="' +
          escapeHtml(
            model.id
          ) +
          '" ' +
          'min="1" ' +
          'max="1000" ' +
          'step="1" ' +
          'value="' +
          escapeHtml(
            settings.credit
          ) +
          '">' +

          "</div>" +

          "<div>" +

          '<label for="provider-discount-' +
          key +
          '">Diskon (%)</label>' +

          '<input type="number" ' +
          'id="provider-discount-' +
          key +
          '" ' +
          'class="provider-model-discount" ' +
          'data-model-id="' +
          escapeHtml(
            model.id
          ) +
          '" ' +
          'min="0" ' +
          'max="100" ' +
          'step="1" ' +
          'value="' +
          escapeHtml(
            settings.discount
          ) +
          '">' +

          "</div>" +

          "<div>" +

          '<div class="provider-effective-credit" ' +
          'data-model-id="' +
          escapeHtml(
            model.id
          ) +
          '" ' +
          'style="' +
          "padding:10px 12px;" +
          "border-radius:8px;" +
          "background:rgba(25,135,84,.10);" +
          '">' +

          '<small style="display:block;opacity:.65;">' +
          "Credit efektif" +
          "</small>" +

          '<strong style="font-size:18px;color:#198754;">' +
          effective +
          "</strong>" +

          "</div>" +

          "</div>" +

          "</div>" +

          "</div>";
      }
    );

    html +=
      "</div>" +
      "</div>";

    return html;
  }

  function bindModelSettings() {
    const editor =
      $("providerEditor");

    if (!editor) {
      return;
    }

    function updateEffective(
      modelId
    ) {
      const selector =
        CSS.escape(
          String(
            modelId
          )
        );

      const creditInput =
        editor.querySelector(
          '.provider-model-credit[data-model-id="' +
          selector +
          '"]'
        );

      const discountInput =
        editor.querySelector(
          '.provider-model-discount[data-model-id="' +
          selector +
          '"]'
        );

      const output =
        editor.querySelector(
          '.provider-effective-credit[data-model-id="' +
          selector +
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
        getEffectiveCredit(
          creditInput.value,
          discountInput.value
        );
    }

    editor
      .querySelectorAll(
        ".provider-model-credit, .provider-model-discount"
      )
      .forEach(
        function (input) {
          input.addEventListener(
            "input",
            function () {
              updateEffective(
                input.dataset.modelId
              );
            }
          );
        }
      );
  }

  function collectModelSettings(
    provider
  ) {
    const item =
      normalizeProvider(
        provider
      );

    const config = {
      ...normalizeObject(
        item.config
      )
    };

    const source =
      getModelSource(
        item
      );

    const modelCredits = {
      ...source.modelCredits
    };

    const modelDiscounts = {
      ...source.modelDiscounts
    };

    const modelEnabled = {
      ...source.modelEnabled
    };

    const editor =
      $("providerEditor");

    if (!editor) {
      return config;
    }

    editor
      .querySelectorAll(
        ".provider-model-credit"
      )
      .forEach(
        function (input) {
          const id =
            input.dataset.modelId;

          if (!id) {
            return;
          }

          modelCredits[id] =
            normalizeInteger(
              input.value,
              1,
              1,
              1000
            );
        }
      );

    editor
      .querySelectorAll(
        ".provider-model-discount"
      )
      .forEach(
        function (input) {
          const id =
            input.dataset.modelId;

          if (!id) {
            return;
          }

          modelDiscounts[id] =
            normalizeDiscount(
              input.value
            );
        }
      );

    editor
      .querySelectorAll(
        ".provider-model-enabled"
      )
      .forEach(
        function (input) {
          const id =
            input.dataset.modelId;

          if (!id) {
            return;
          }

          modelEnabled[id] =
            Boolean(
              input.checked
            );
        }
      );

    /*
     * Simpan di config juga agar tetap
     * kompatibel dengan konfigurasi lama.
     */
    config.modelCredits =
      modelCredits;

    config.modelDiscounts =
      modelDiscounts;

    config.modelEnabled =
      modelEnabled;

    return config;
  }

  /* ============================================================
   * EDITOR
   * ============================================================ */

  function renderEditor(
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
      normalizeObject(
        item?.config
      );

    editor.hidden =
      false;

    editor.innerHTML =
      '<form id="providerForm" autocomplete="off">' +

      '<div class="admin-form">' +

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
          ? "Ubah konfigurasi provider dan pengaturan credit model."
          : "Tambahkan provider baru."
      ) +
      "</p>" +

      '<label for="providerId">' +
      "Provider ID" +
      "</label>" +

      '<input type="text" ' +
      'id="providerId" ' +
      'name="providerId" ' +
      'maxlength="64" ' +
      'required ' +
      (
        item
          ? 'value="' +
            escapeHtml(
              item.id
            ) +
            '" readonly'
          : ""
      ) +
      ">" +

      '<label for="providerName">' +
      "Provider Name" +
      "</label>" +

      '<input type="text" ' +
      'id="providerName" ' +
      'name="providerName" ' +
      'maxlength="100" ' +
      'required ' +
      'value="' +
      escapeHtml(
        item?.name ||
        ""
      ) +
      '">' +

      '<label for="providerAdapter">' +
      "Adapter" +
      "</label>" +

      '<input type="text" ' +
      'id="providerAdapter" ' +
      'name="providerAdapter" ' +
      'maxlength="64" ' +
      'required ' +
      'value="' +
      escapeHtml(
        item?.adapter ||
        ""
      ) +
      '">' +

      '<label for="providerApiKey">' +
      "API Key" +
      "</label>" +

      '<input type="password" ' +
      'id="providerApiKey" ' +
      'name="providerApiKey" ' +
      'autocomplete="new-password" ' +
      (
        item
          ? 'placeholder="Kosongkan jika tidak ingin mengubah API key"'
          : "required"
      ) +
      ">" +

      (
        item
          ? renderModelSettings(
              item
            )
          : ""
      ) +

      '<label for="providerConfig">' +
      "Config" +
      "</label>" +

      '<textarea id="providerConfig" ' +
      'name="providerConfig" ' +
      'rows="10" ' +
      'spellcheck="false">' +
      escapeHtml(
        JSON.stringify(
          config,
          null,
          2
        )
      ) +
      "</textarea>" +

      '<label class="provider-checkbox">' +

      '<input type="checkbox" ' +
      'id="providerEnabled" ' +
      (
        !item ||
        item.enabled
          ? " checked"
          : ""
      ) +
      ">" +

      "<span>Provider aktif</span>" +

      "</label>" +

      '<div class="admin-actions">' +

      '<button type="button" id="providerCancelBtn">' +
      "Batal" +
      "</button>" +

      '<button type="submit" id="providerSaveBtn">' +
      (
        item
          ? "Simpan Perubahan"
          : "Simpan Provider"
      ) +
      "</button>" +

      "</div>" +

      "</div>" +

      "</form>";

    bindModelSettings();

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
  }

  function openAddEditor() {
    renderEditor(
      null
    );
  }

  function openEditEditor(
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
      setStatus(
        "Provider tidak ditemukan.",
        "error"
      );

      return;
    }

    renderEditor(
      provider
    );
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
      ).trim()
      .toLowerCase();

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

    const currentProvider =
      state.providers.find(
        function (item) {
          return String(
            normalizeProvider(
              item
            ).id
          ) ===
          String(
            state.editingId
          );
        }
      );

    if (currentProvider) {
      config =
        collectModelSettings(
          currentProvider
        );
    }

    const editing =
      Boolean(
        state.editingId
      );

    if (
      !editing &&
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

    const endpoint =
      editing
        ? "/api/admin/providers/" +
          encodeURIComponent(
            state.editingId
          )
        : "/api/admin/providers";

    const saveButton =
      $("providerSaveBtn");

    if (saveButton) {
      saveButton.disabled =
        true;

      saveButton.textContent =
        "Menyimpan...";
    }

    try {
      const result =
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
        result?.message ||
        (
          editing
            ? "Provider berhasil diperbarui."
            : "Provider berhasil ditambahkan."
        ),
        "success"
      );

      await loadProviders();
    } catch (error) {
      console.error(
        "[GEN-Z.AI Provider] Save error:",
        error
      );

      setStatus(
        error?.message ||
        "Gagal menyimpan provider.",
        "error"
      );
    } finally {
      const button =
        $("providerSaveBtn");

      if (button) {
        button.disabled =
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
          state.providers.length === 1
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
              '<div class="admin-list-item" ' +
              'data-provider-id="' +
              escapeHtml(
                provider.id
              ) +
              '">' +

              '<div class="admin-list-main">' +

              "<h3>" +
              escapeHtml(
                provider.name ||
                provider.id
              ) +
              "</h3>" +

              "<p>ID: " +
              escapeHtml(
                provider.id
              ) +
              "</p>" +

              "<p>Adapter: " +
              escapeHtml(
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

              '<button type="button" ' +
              'data-action="edit" ' +
              'data-id="' +
              escapeHtml(
                provider.id
              ) +
              '">' +
              "Edit" +
              "</button>" +

              '<button type="button" ' +
              'data-action="toggle" ' +
              'data-id="' +
              escapeHtml(
                provider.id
              ) +
              '">' +
              (
                provider.enabled
                  ? "Deactivate"
                  : "Activate"
              ) +
              "</button>" +

              '<button type="button" ' +
              'data-action="delete" ' +
              'data-id="' +
              escapeHtml(
                provider.id
              ) +
              '">' +
              "Delete" +
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
      const data =
        await api(
          "/api/admin/providers",
          {
            method: "GET"
          }
        );

      const providers =
        Array.isArray(
          data?.providers
        )
          ? data.providers
          : Array.isArray(
              data
            )
            ? data
            : Array.isArray(
                data?.data
              )
              ? data.data
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
        "[GEN-Z.AI Provider] Load error:",
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

    const normalized =
      normalizeProvider(
        provider
      );

    const enabled =
      !normalized.enabled;

    try {
      await api(
        "/api/admin/providers/" +
        encodeURIComponent(
          normalized.id
        ) +
        "/toggle",
        {
          method:
            "POST",

          headers: {
            "x-enable":
              String(
                enabled
              )
          }
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

    const normalized =
      normalizeProvider(
        provider
      );

    const confirmed =
      window.confirm(
        "Hapus provider \"" +
        (
          normalized.name ||
          normalized.id
        ) +
        "\"?"
      );

    if (!confirmed) {
      return;
    }

    try {
      await api(
        "/api/admin/providers/" +
        encodeURIComponent(
          normalized.id
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

      const paragraphs =
        denied.querySelectorAll(
          "p"
        );

      if (paragraphs.length) {
        paragraphs[
          paragraphs.length - 1
        ].textContent =
          message ||
          "Akses ditolak.";
      }
    }
  }

  /* ============================================================
   * EVENTS
   * ============================================================ */

  function bindEvents() {
    const addButton =
      $("addProviderBtn");

    if (addButton) {
      addButton.addEventListener(
        "click",
        openAddEditor
      );
    }

    const refreshButton =
      $("refreshProvidersBtn");

    if (refreshButton) {
      refreshButton.addEventListener(
        "click",
        loadProviders
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

          const action =
            button.dataset.action;

          const id =
            button.dataset.id;

          if (
            action ===
            "edit"
          ) {
            openEditEditor(
              id
            );
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
      setLoadingMessage(
        "Memeriksa sesi login..."
      );

      await getAccessToken();

      showApp();

      bindEvents();

      await loadProviders();
    } catch (error) {
      console.error(
        "[GEN-Z.AI Provider] Init error:",
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
