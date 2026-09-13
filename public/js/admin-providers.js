/* ============================================================
 * GEN-Z.AI
 * ADMIN PROVIDER MANAGEMENT
 * ============================================================ */

(function () {

  "use strict";

  const API_TIMEOUT = 15000;
  const AUTH_TIMEOUT = 10000;
  const CONFIG_TIMEOUT = 10000;

  const state = {
    providers: [],
    editingId: null,
    loading: false,
    initialized: false
  };


  /* ============================================================
   * DOM
   * ============================================================ */

  function $(id) {
    return document.getElementById(id);
  }


  /* ============================================================
   * HTML ESCAPE
   * ============================================================ */

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }


  /* ============================================================
   * STATUS
   * ============================================================ */

  function setStatus(message, type) {

    const el = $("providerStatus");

    if (!el) {
      return;
    }

    el.textContent = message || "";
    el.className = "admin-status-message";

    if (type) {
      el.classList.add(type);
    }

  }


  function setLoadingMessage(message) {

    const loading = $("providerLoading");

    if (!loading) {
      return;
    }

    const paragraph =
      loading.querySelector("p");

    if (paragraph) {
      paragraph.textContent =
        message ||
        "Memeriksa akses administrator...";
    }

  }


  /* ============================================================
   * TIMEOUT
   * ============================================================ */

  function withTimeout(promise, ms, message) {

    let timer;

    const timeout =
      new Promise(function (_, reject) {

        timer = setTimeout(function () {

          const error =
            new Error(message);

          error.status = 408;

          reject(error);

        }, ms);

      });

    return Promise.race([
      promise,
      timeout
    ]).finally(function () {

      clearTimeout(timer);

    });

  }


  /* ============================================================
   * SUPABASE
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

      error.status = 503;

      throw error;

    }


    setLoadingMessage(
      "Memuat konfigurasi autentikasi..."
    );


    const response =
      await withTimeout(
        fetch("/api/config", {
          method: "GET",
          headers: {
            Accept: "application/json"
          },
          cache: "no-store"
        }),
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

      error.status = response.status;

      throw error;

    }


    const config =
      await response.json();


    const supabaseUrl =
      String(
        config?.supabaseUrl || ""
      ).trim();


    const publishableKey =
      String(
        config?.supabasePublishableKey || ""
      ).trim();


    if (
      !supabaseUrl ||
      !publishableKey
    ) {

      const error =
        new Error(
          "Konfigurasi Supabase belum tersedia."
        );

      error.status = 503;

      throw error;

    }


    /*
     * Samakan konfigurasi session dengan auth.js.
     */
    const client =
      window.supabase.createClient(
        supabaseUrl,
        publishableKey,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            storage: window.localStorage
          }
        }
      );


    if (
      !client ||
      !client.auth
    ) {

      const error =
        new Error(
          "Supabase authentication client tidak tersedia."
        );

      error.status = 503;

      throw error;

    }


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


  /* ============================================================
   * SESSION
   * ============================================================ */

  async function getAccessToken() {

    setLoadingMessage(
      "Memeriksa sesi login..."
    );


    const client =
      await getSupabaseClient();


    const result =
      await withTimeout(
        client.auth.getSession(),
        AUTH_TIMEOUT,
        "Session Supabase tidak merespons."
      );


    if (
      result &&
      result.error
    ) {

      throw result.error;

    }


    const session =
      result?.data?.session;


    const token =
      session?.access_token;


    if (!token) {

      const error =
        new Error(
          "Sesi login tidak ditemukan."
        );

      error.status = 401;

      throw error;

    }


    return token;

  }


  /* ============================================================
   * API
   * ============================================================ */

  async function api(path, options) {

    const opts =
      options || {};


    const token =
      await getAccessToken();


    const headers =
      Object.assign(
        {
          Accept:
            "application/json",

          Authorization:
            "Bearer " + token
        },
        opts.headers || {}
      );


    if (
      opts.body !== undefined &&
      !headers["Content-Type"]
    ) {

      headers["Content-Type"] =
        "application/json";

    }


    const controller =
      new AbortController();


    const timer =
      setTimeout(function () {

        controller.abort();

      }, API_TIMEOUT);


    try {

      const response =
        await fetch(
          path,
          {
            method:
              opts.method || "GET",

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
              message: text
            };

          }

        } catch (_) {

          data = null;

        }

      }


      if (!response.ok) {

        const error =
          new Error(
            (
              data &&
              (
                data.error ||
                data.message
              )
            ) ||
            (
              "Permintaan API gagal (" +
              response.status +
              ")."
            )
          );

        error.status =
          response.status;

        error.data =
          data;

        throw error;

      }


      return data;

    } catch (error) {

      if (
        error &&
        error.name === "AbortError"
      ) {

        const timeoutError =
          new Error(
            "Server terlalu lama merespons."
          );

        timeoutError.status = 408;

        throw timeoutError;

      }

      throw error;

    } finally {

      clearTimeout(timer);

    }

  }


  /* ============================================================
   * NORMALIZER
   * ============================================================ */

  function normalizeProvider(provider) {

    const item =
      provider || {};


    return {

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
        item.config &&
        typeof item.config === "object" &&
        !Array.isArray(item.config)
          ? item.config
          : {},

      enabled:
        item.enabled !== undefined
          ? Boolean(item.enabled)
          : item.active !== undefined
            ? Boolean(item.active)
            : true,

      apiKey:
        item.api_key ??
        item.apiKey ??
        "",

      apiKeySet:
        Boolean(
          item.apiKeySet ||
          item.api_key
        ),

      createdAt:
        item.created_at ??
        null,

      updatedAt:
        item.updated_at ??
        null

    };

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
      loading.hidden = true;
    }

    if (denied) {
      denied.hidden = true;
    }

    if (app) {
      app.hidden = false;
    }

  }


  function showDenied(message) {

    const loading =
      $("providerLoading");

    const denied =
      $("providerDenied");

    const app =
      $("providerApp");


    if (loading) {
      loading.hidden = true;
    }

    if (app) {
      app.hidden = true;
    }


    if (denied) {

      denied.hidden = false;

      const paragraphs =
        denied.querySelectorAll("p");


      if (paragraphs.length) {

        paragraphs[
          paragraphs.length - 1
        ].textContent =
          message ||
          "Akses ditolak.";

      }

    }


    setStatus(
      message ||
      "Akses ditolak.",
      "error"
    );

  }


  /* ============================================================
   * PROVIDER LIST
   * ============================================================ */

  function renderProviders() {

    const list =
      $("providerList");

    const count =
      $("providerCount");


    if (!list) {
      return;
    }


    const providers =
      state.providers.map(
        normalizeProvider
      );


    if (count) {

      count.textContent =
        providers.length +
        (
          providers.length === 1
            ? " provider"
            : " providers"
        );

    }


    if (!providers.length) {

      list.innerHTML =
        '<div class="admin-empty">' +
          "<strong>Belum ada provider.</strong>" +
          "<br>" +
          "<span>Tambahkan provider pertama untuk mulai menggunakan sistem.</span>" +
        "</div>";

      return;

    }


    list.innerHTML =
      providers
        .map(function (provider) {

          const active =
            provider.enabled;


          return (
            '<div class="admin-list-item" data-provider-id="' +
              escapeHtml(provider.id) +
            '">' +

              '<div class="admin-list-main">' +

                "<h3>" +
                  escapeHtml(
                    provider.name ||
                    provider.id
                  ) +
                "</h3>" +

                "<p>" +
                  "ID: " +
                  escapeHtml(
                    provider.id
                  ) +
                "</p>" +

                "<p>" +
                  "Adapter: " +
                  escapeHtml(
                    provider.adapter ||
                    "-"
                  ) +
                "</p>" +

                "<p>" +
                  "API Key: " +
                  (
                    provider.apiKeySet
                      ? "Tersedia"
                      : "Belum diatur"
                  ) +
                "</p>" +

                '<span class="status-badge ' +
                  (
                    active
                      ? "active"
                      : "inactive"
                  ) +
                '">' +

                  (
                    active
                      ? "Aktif"
                      : "Nonaktif"
                  ) +

                "</span>" +

              "</div>" +

              '<div class="admin-actions">' +

                '<button type="button" data-action="edit" data-id="' +
                  escapeHtml(provider.id) +
                '">' +
                  "Edit" +
                "</button>" +

                '<button type="button" data-action="toggle" data-id="' +
                  escapeHtml(provider.id) +
                '">' +

                  (
                    active
                      ? "Deactivate"
                      : "Activate"
                  ) +

                "</button>" +

                '<button type="button" data-action="delete" data-id="' +
                  escapeHtml(provider.id) +
                '">' +
                  "Delete" +
                "</button>" +

              "</div>" +

            "</div>"
          );

        })
        .join("");

  }


  /* ============================================================
   * LOAD PROVIDERS
   * ============================================================ */

  async function loadProviders() {

    if (state.loading) {
      return;
    }


    state.loading = true;


    const list =
      $("providerList");


    if (list) {

      list.innerHTML =
        '<div class="admin-loading">' +
          "Memuat provider..." +
        "</div>";

    }


    try {

      setLoadingMessage(
        "Mengambil daftar provider..."
      );


      const data =
        await api(
          "/api/admin/providers"
        );


      let providers = [];


      if (
        data &&
        Array.isArray(data.providers)
      ) {

        providers =
          data.providers;

      } else if (
        Array.isArray(data)
      ) {

        providers =
          data;

      } else if (
        data &&
        Array.isArray(data.data)
      ) {

        providers =
          data.data;

      }


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


      showApp();


    } catch (error) {

      console.error(
        "[GEN-Z.AI Provider] Load error:",
        error
      );


      if (error.status === 401) {

        showDenied(
          "Sesi login tidak valid atau sudah berakhir."
        );

      } else if (error.status === 403) {

        showDenied(
          "Akses administrator ditolak."
        );

      } else {

        showApp();


        setStatus(
          error.message ||
          "Gagal memuat provider.",
          "error"
        );


        if (list) {

          list.innerHTML =
            '<div class="admin-empty">' +
              "<strong>Gagal memuat provider.</strong>" +
              "<br>" +
              "<span>" +
                escapeHtml(
                  error.message ||
                  "Terjadi kesalahan pada server."
                ) +
              "</span>" +
            "</div>";

        }

      }

    } finally {

      state.loading = false;

    }

  }


  /* ============================================================
   * FIND PROVIDER
   * ============================================================ */

  function findProvider(id) {

    return (
      state.providers.find(
        function (provider) {

          return String(provider.id) ===
            String(id);

        }
      ) || null
    );

  }


  /* ============================================================
   * EDITOR
   * ============================================================ */

  function renderEditor(provider) {

    const editor =
      $("providerEditor");


    if (!editor) {

      setStatus(
        "Editor provider tidak ditemukan.",
        "error"
      );

      return;

    }


    const editing =
      Boolean(provider);


    const item =
      normalizeProvider(
        provider || {}
      );


    state.editingId =
      editing
        ? item.id
        : null;


    editor.innerHTML =

      '<div class="admin-card">' +

        '<div class="admin-card-header">' +

          "<div>" +

            "<h3>" +
              (
                editing
                  ? "Edit Provider"
                  : "Tambah Provider"
              ) +
            "</h3>" +

            "<p>" +
              (
                editing
                  ? "Perbarui konfigurasi provider."
                  : "Tambahkan provider baru."
              ) +
            "</p>" +

          "</div>" +

        "</div>" +

        '<div class="admin-form">' +

          '<div class="form-group">' +
            '<label for="providerIdInput">' +
              "Provider ID" +
            "</label>" +

            '<input id="providerIdInput" type="text" maxlength="64" autocomplete="off" placeholder="contoh: gemini">' +
          "</div>" +

          '<div class="form-group">' +
            '<label for="providerNameInput">' +
              "Provider Name" +
            "</label>" +

            '<input id="providerNameInput" type="text" maxlength="100" autocomplete="off" placeholder="Nama provider">' +
          "</div>" +

          '<div class="form-group">' +
            '<label for="providerAdapterInput">' +
              "Adapter" +
            "</label>" +

            '<input id="providerAdapterInput" type="text" maxlength="64" autocomplete="off" placeholder="contoh: gemini, openrouter, veo, minimax">' +

            "<small>" +
              "Isi ID adapter secara bebas." +
            "</small>" +
          "</div>" +

          '<div class="form-group">' +
            '<label for="providerApiKeyInput">' +
              "API Key" +
            "</label>" +

            '<input id="providerApiKeyInput" type="password" autocomplete="new-password" placeholder="Masukkan API key">' +
          "</div>" +

          '<div class="form-group">' +
            '<label for="providerConfigInput">' +
              "Config" +
            "</label>" +

            '<textarea id="providerConfigInput" rows="8" spellcheck="false" placeholder=\'{"model":"...","base_url":"..."}\'></textarea>' +
          "</div>" +

          '<div class="form-group">' +

            '<label class="admin-checkbox">' +

              '<input id="providerEnabledInput" type="checkbox">' +

              "<span>" +
                "Provider aktif" +
              "</span>" +

            "</label>" +

          "</div>" +

          '<div class="admin-actions">' +

            '<button type="button" id="providerCancelBtn">' +
              "Batal" +
            "</button>" +

            '<button type="button" id="providerSaveBtn">' +
              "Simpan Provider" +
            "</button>" +

          "</div>" +

        "</div>" +

      "</div>";


    const idInput =
      $("providerIdInput");

    const nameInput =
      $("providerNameInput");

    const adapterInput =
      $("providerAdapterInput");

    const apiKeyInput =
      $("providerApiKeyInput");

    const configInput =
      $("providerConfigInput");

    const enabledInput =
      $("providerEnabledInput");

    const cancelButton =
      $("providerCancelBtn");

    const saveButton =
      $("providerSaveBtn");


    if (idInput) {

      idInput.value =
        item.id || "";


      if (editing) {
        idInput.readOnly = true;
      }

    }


    if (nameInput) {
      nameInput.value =
        item.name || "";
    }


    if (adapterInput) {
      adapterInput.value =
        item.adapter || "";
    }


    if (apiKeyInput) {

      apiKeyInput.value =
        item.apiKey &&
        !/^•+$/.test(item.apiKey)
          ? item.apiKey
          : "";


      apiKeyInput.placeholder =
        item.apiKeySet
          ? "Kosongkan jika tidak ingin mengganti API key"
          : "Masukkan API key";

    }


    if (configInput) {

      try {

        configInput.value =
          JSON.stringify(
            item.config || {},
            null,
            2
          );

      } catch (_) {

        configInput.value =
          "{}";

      }

    }


    if (enabledInput) {

      enabledInput.checked =
        item.enabled !== false;

    }


    /*
     * FIX UTAMA:
     * Tombol dibuat secara dinamis di atas.
     * Karena itu listener harus dipasang setelah
     * tombol tersebut dibuat.
     */
    if (saveButton) {

      saveButton.addEventListener(
        "click",
        saveProvider
      );

    }


    if (cancelButton) {

      cancelButton.addEventListener(
        "click",
        closeEditor,
        {
          once: true
        }
      );

    }


    editor.hidden = false;


    editor.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  }


  /* ============================================================
   * CLOSE EDITOR
   * ============================================================ */

  function closeEditor() {

    const editor =
      $("providerEditor");


    if (editor) {

      editor.hidden = true;
      editor.innerHTML = "";

    }


    state.editingId =
      null;

  }


  /* ============================================================
   * CONFIG
   * ============================================================ */

  function readConfig() {

    const input =
      $("providerConfigInput");


    const raw =
      input
        ? input.value.trim()
        : "";


    if (!raw) {
      return {};
    }


    let parsed;


    try {

      parsed =
        JSON.parse(raw);

    } catch (_) {

      throw new Error(
        "Config JSON tidak valid."
      );

    }


    if (
      parsed === null ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {

      throw new Error(
        "Config harus berupa JSON object."
      );

    }


    return parsed;

  }


  /* ============================================================
   * SAVE PROVIDER
   * ============================================================ */

  async function saveProvider() {

    const idInput =
      $("providerIdInput");

    const nameInput =
      $("providerNameInput");

    const adapterInput =
      $("providerAdapterInput");

    const apiKeyInput =
      $("providerApiKeyInput");

    const enabledInput =
      $("providerEnabledInput");


    const id =
      idInput
        ? idInput.value.trim()
        : "";


    const name =
      nameInput
        ? nameInput.value.trim()
        : "";


    const adapter =
      adapterInput
        ? adapterInput.value.trim().toLowerCase()
        : "";


    const apiKey =
      apiKeyInput
        ? apiKeyInput.value.trim()
        : "";


    const enabled =
      enabledInput
        ? Boolean(enabledInput.checked)
        : true;


    if (!id) {

      setStatus(
        "Provider ID wajib diisi.",
        "error"
      );

      return;

    }


    if (
      !/^[a-z0-9][a-z0-9_-]{1,63}$/i.test(id)
    ) {

      setStatus(
        "Provider ID tidak valid.",
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


    if (
      !/^[a-z0-9][a-z0-9_-]{1,63}$/.test(adapter)
    ) {

      setStatus(
        "Adapter harus 2-64 karakter berupa huruf kecil, angka, underscore, atau tanda minus.",
        "error"
      );

      return;

    }


    let config;


    try {

      config =
        readConfig();

    } catch (error) {

      setStatus(
        error.message,
        "error"
      );

      return;

    }


    const button =
      $("providerSaveBtn");


    if (button) {

      button.disabled = true;
      button.textContent =
        "Menyimpan...";

    }


    const editing =
      Boolean(state.editingId);


    try {

      const body = {

        name:
          name || id,

        adapter,

        config,

        enabled

      };


      if (apiKey) {

        body.api_key =
          apiKey;

      }


      if (editing) {

        await api(
          "/api/admin/providers/" +
          encodeURIComponent(
            state.editingId
          ),
          {
            method: "PUT",
            body:
              JSON.stringify(body)
          }
        );

      } else {

        if (!apiKey) {

          throw new Error(
            "API key wajib diisi untuk provider baru."
          );

        }


        body.id =
          id;


        await api(
          "/api/admin/providers",
          {
            method: "POST",
            body:
              JSON.stringify(body)
          }
        );

      }


      closeEditor();


      setStatus(
        editing
          ? "Provider berhasil diperbarui."
          : "Provider berhasil ditambahkan.",
        "success"
      );


      await loadProviders();


    } catch (error) {

      console.error(
        "[GEN-Z.AI Provider] Save error:",
        error
      );


      setStatus(
        error.message ||
        "Gagal menyimpan provider.",
        "error"
      );

    } finally {

      if (button) {

        button.disabled = false;

        button.textContent =
          "Simpan Provider";

      }

    }

  }


  /* ============================================================
   * TOGGLE
   * ============================================================ */

  async function toggleProvider(id) {

    const provider =
      findProvider(id);


    if (!provider) {
      return;
    }


    const enabled =
      !provider.enabled;


    try {

      await api(
        "/api/admin/providers/" +
        encodeURIComponent(id) +
        "/toggle",
        {
          method: "POST",
          headers: {
            "x-enable":
              enabled
                ? "true"
                : "false"
          }
        }
      );


      setStatus(
        enabled
          ? "Provider berhasil diaktifkan."
          : "Provider berhasil dinonaktifkan.",
        "success"
      );


      await loadProviders();


    } catch (error) {

      console.error(
        "[GEN-Z.AI Provider] Toggle error:",
        error
      );


      setStatus(
        error.message ||
        "Gagal mengubah status provider.",
        "error"
      );

    }

  }


  /* ============================================================
   * DELETE
   * ============================================================ */

  async function deleteProvider(id) {

    const provider =
      findProvider(id);


    if (!provider) {
      return;
    }


    const confirmed =
      window.confirm(
        "Hapus provider \"" +
        (
          provider.name ||
          provider.id
        ) +
        "\"?\n\n" +
        "Tindakan ini tidak dapat dibatalkan."
      );


    if (!confirmed) {
      return;
    }


    try {

      await api(
        "/api/admin/providers/" +
        encodeURIComponent(id),
        {
          method: "DELETE"
        }
      );


      setStatus(
        "Provider berhasil dihapus.",
        "success"
      );


      await loadProviders();


    } catch (error) {

      console.error(
        "[GEN-Z.AI Provider] Delete error:",
        error
      );


      setStatus(
        error.message ||
        "Gagal menghapus provider.",
        "error"
      );

    }

  }


  /* ============================================================
   * EVENTS
   * ============================================================ */

  function bindEvents() {

    const add =
      $("addProviderBtn");

    const refresh =
      $("refreshProvidersBtn");

    const back =
      $("providerBackBtn");

    const list =
      $("providerList");


    if (
      add &&
      !add.dataset.bound
    ) {

      add.dataset.bound =
        "true";


      add.addEventListener(
        "click",
        function () {

          renderEditor(null);

        }
      );

    }


    if (
      refresh &&
      !refresh.dataset.bound
    ) {

      refresh.dataset.bound =
        "true";


      refresh.addEventListener(
        "click",
        function () {

          loadProviders();

        }
      );

    }


    if (
      back &&
      !back.dataset.bound
    ) {

      back.dataset.bound =
        "true";


      back.addEventListener(
        "click",
        function () {

          window.location.href =
            "/admin.html";

        }
      );

    }


    if (
      list &&
      !list.dataset.bound
    ) {

      list.dataset.bound =
        "true";


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


          if (action === "edit") {

            const provider =
              findProvider(id);


            if (provider) {

              renderEditor(
                provider
              );

            }

            return;

          }


          if (action === "toggle") {

            toggleProvider(id);
            return;

          }


          if (action === "delete") {

            deleteProvider(id);

          }

        }
      );

    }

  }


  /* ============================================================
   * INIT
   * ============================================================ */

  async function init() {

    if (state.initialized) {
      return;
    }


    state.initialized =
      true;


    const loading =
      $("providerLoading");


    if (loading) {
      loading.hidden = false;
    }


    try {

      setLoadingMessage(
        "Memulai Provider Management..."
      );


      await getAccessToken();


      bindEvents();


      await loadProviders();


    } catch (error) {

      console.error(
        "[GEN-Z.AI Provider] Init error:",
        error
      );


      if (error.status === 401) {

        showDenied(
          "Sesi login tidak ditemukan atau sudah berakhir."
        );

      } else if (error.status === 403) {

        showDenied(
          "Akses administrator ditolak."
        );

      } else {

        showDenied(
          error.message ||
          "Gagal membuka Provider Management."
        );

      }

    }

  }


  /* ============================================================
   * PUBLIC BRIDGE
   * ============================================================ */

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


  /* ============================================================
   * AUTO INIT
   * ============================================================ */

  function start() {

    init().catch(function (error) {

      console.error(
        "[GEN-Z.AI Provider] Start error:",
        error
      );

      showDenied(
        error.message ||
        "Provider Management gagal dimulai."
      );

    });

  }


  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      start,
      {
        once: true
      }
    );

  } else {

    start();

  }


})();
