/*
 * ============================================================
 * GEN-Z.AI
 * ADMIN PROVIDER MANAGEMENT
 * ============================================================
 */

(function () {
  "use strict";

  const API_TIMEOUT = 15000;
  const AUTH_TIMEOUT = 10000;

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


  /* ============================================================
   * TIMEOUT
   * ============================================================ */

  function timeoutPromise(ms, message) {
    return new Promise(function (_, reject) {
      setTimeout(function () {
        const error = new Error(message);
        error.status = 408;
        reject(error);
      }, ms);
    });
  }


  async function raceTimeout(promise, ms, message) {
    return Promise.race([
      promise,
      timeoutPromise(ms, message)
    ]);
  }


  /* ============================================================
   * GET SUPABASE CLIENT
   * ============================================================ */

  async function getSupabaseClient() {

    /*
     * PRIORITAS 1
     *
     * auth.js menyimpan client di sini.
     */
    if (
      window.GENZ_AUTH_CLIENT &&
      window.GENZ_AUTH_CLIENT.auth
    ) {
      return window.GENZ_AUTH_CLIENT;
    }


    /*
     * PRIORITAS 2
     *
     * Ambil dari GENZ.auth.getClient()
     */
    if (
      window.GENZ &&
      window.GENZ.auth &&
      typeof window.GENZ.auth.getClient ===
        "function"
    ) {
      try {
        const client =
          await raceTimeout(
            window.GENZ.auth.getClient(),
            AUTH_TIMEOUT,
            "Supabase client tidak merespons."
          );

        if (
          client &&
          client.auth
        ) {
          return client;
        }
      } catch (error) {
        console.warn(
          "[GEN-Z.AI Provider] GENZ.auth.getClient gagal:",
          error
        );
      }
    }


    /*
     * PRIORITAS 3
     *
     * Tunggu sebentar apabila auth.js sedang
     * membuat client.
     */
    const started =
      Date.now();

    while (
      Date.now() - started <
      AUTH_TIMEOUT
    ) {

      if (
        window.GENZ_AUTH_CLIENT &&
        window.GENZ_AUTH_CLIENT.auth
      ) {
        return window.GENZ_AUTH_CLIENT;
      }

      await new Promise(function (resolve) {
        setTimeout(resolve, 100);
      });
    }


    /*
     * Tidak ada client.
     */
    const error =
      new Error(
        "Supabase client belum tersedia."
      );

    error.status =
      503;

    throw error;
  }


  /* ============================================================
   * GET SESSION
   * ============================================================ */

  async function getSessionDirect() {

    const client =
      await getSupabaseClient();

    const result =
      await raceTimeout(
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

    return (
      result &&
      result.data &&
      result.data.session
    ) || null;
  }


  /* ============================================================
   * GET TOKEN
   * ============================================================ */

  async function getAuthToken() {

    /*
     * Cara langsung.
     *
     * Tidak bergantung kepada:
     * window.GENZ_AUTH_INITIALIZED
     */
    try {

      const session =
        await getSessionDirect();

      if (
        session &&
        session.access_token
      ) {
        return session.access_token;
      }

    } catch (error) {

      console.warn(
        "[GEN-Z.AI Provider] Direct session gagal:",
        error
      );
    }


    /*
     * Fallback ke API auth.
     */
    if (
      window.GENZ &&
      window.GENZ.auth &&
      typeof window.GENZ.auth.token ===
        "function"
    ) {

      try {

        const token =
          await raceTimeout(
            window.GENZ.auth.token(),
            AUTH_TIMEOUT,
            "Token autentikasi tidak merespons."
          );

        if (token) {
          return token;
        }

      } catch (error) {

        console.warn(
          "[GEN-Z.AI Provider] auth.token gagal:",
          error
        );
      }
    }


    const error =
      new Error(
        "Sesi login tidak ditemukan."
      );

    error.status =
      401;

    throw error;
  }


  /* ============================================================
   * API
   * ============================================================ */

  async function api(path, options) {

    const opts =
      options || {};

    const token =
      await getAuthToken();

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
        error.name ===
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

      clearTimeout(timer);
    }
  }


  /* ============================================================
   * VERIFY ADMIN
   * ============================================================ */

  async function verifyAdmin() {

    const data =
      await api(
        "/api/account/credits"
      );

    const role =
      data &&
      (
        data.role ||
        (
          data.account &&
          data.account.role
        ) ||
        (
          data.user &&
          data.user.role
        )
      );

    const isAdmin =
      data &&
      (
        data.isAdmin === true ||
        data.is_admin === true ||
        role === "admin" ||
        role === "owner"
      );

    if (!isAdmin) {

      const error =
        new Error(
          "Akses administrator ditolak."
        );

      error.status =
        403;

      throw error;
    }

    return true;
  }


  /* ============================================================
   * SHOW / HIDE
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


  function showDenied(message) {

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

      if (
        paragraphs.length
      ) {

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
   * NORMALIZE
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
        item.config ??
        {},

      enabled:
        item.enabled !== undefined
          ? !!item.enabled
          : item.active !== undefined
            ? !!item.active
            : true,

      apiKey:
        item.api_key ??
        item.apiKey ??
        "",

      createdAt:
        item.created_at ??
        item.createdAt ??
        null,

      updatedAt:
        item.updated_at ??
        item.updatedAt ??
        null
    };
  }


  /* ============================================================
   * RENDER PROVIDERS
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
        " provider";
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
                  escapeHtml(
                    provider.id
                  ) +
                '">' +
                  "Edit" +
                "</button>" +

                '<button type="button" data-action="toggle" data-id="' +
                  escapeHtml(
                    provider.id
                  ) +
                '">' +

                  (
                    active
                      ? "Deactivate"
                      : "Activate"
                  ) +

                "</button>" +

                '<button type="button" data-action="delete" data-id="' +
                  escapeHtml(
                    provider.id
                  ) +
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

    state.loading =
      true;

    const list =
      $("providerList");

    if (list) {

      list.innerHTML =
        '<div class="admin-loading">' +
          "Memuat provider..." +
        "</div>";
    }

    try {

      const data =
        await api(
          "/api/admin/providers"
        );

      let providers = [];

      if (
        Array.isArray(data)
      ) {

        providers =
          data;

      } else if (
        data &&
        Array.isArray(
          data.providers
        )
      ) {

        providers =
          data.providers;

      } else if (
        data &&
        Array.isArray(
          data.data
        )
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

    } catch (error) {

      console.error(
        "[GEN-Z.AI Provider] Load error:",
        error
      );

      if (
        error.status ===
        401
      ) {

        showDenied(
          "Sesi login tidak valid."
        );

      } else if (
        error.status ===
        403
      ) {

        showDenied(
          "Akses administrator ditolak."
        );

      } else {

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

      state.loading =
        false;
    }
  }


  /* ============================================================
   * EDITOR
   * ============================================================ */

  function createEditor() {

    const editor =
      $("providerEditor");

    if (!editor) {
      return;
    }

    editor.innerHTML =

      '<div class="admin-card">' +

        '<div class="admin-card-header">' +

          "<div>" +

            '<h2 id="providerEditorTitle">' +
              "Tambah Provider" +
            "</h2>" +

            "<p>" +
              "Masukkan konfigurasi provider AI." +
            "</p>" +

          "</div>" +

        "</div>" +

        '<div class="admin-form-grid">' +

          "<label>" +

            "<span>Provider ID</span>" +

            '<input id="providerIdInput" type="text" autocomplete="off" spellcheck="false" placeholder="contoh: veo-v8">' +

            "<small>ID unik provider.</small>" +

          "</label>" +


          "<label>" +

            "<span>Nama Provider</span>" +

            '<input id="providerNameInput" type="text" autocomplete="off" placeholder="contoh: Google Veo">' +

            "<small>Nama provider.</small>" +

          "</label>" +


          "<label>" +

            "<span>Adapter</span>" +

            '<input id="providerAdapterInput" type="text" autocomplete="off" spellcheck="false" placeholder="contoh: veo, kling, runway, seedance">' +

            "<small>Adapter berupa input bebas.</small>" +

          "</label>" +


          "<label>" +

            "<span>API Key</span>" +

            '<input id="providerApiKeyInput" type="password" autocomplete="new-password" placeholder="Masukkan API key provider">' +

            "<small>API key provider.</small>" +

          "</label>" +


          '<label style="grid-column:1 / -1;">' +

            "<span>Config</span>" +

            '<textarea id="providerConfigInput" rows="10" spellcheck="false" placeholder="{\n  \"model\": \"...\"\n}"></textarea>' +

            "<small>Harus berupa JSON object.</small>" +

          "</label>" +


          '<label style="display:flex;align-items:center;gap:10px;">' +

            '<input id="providerEnabledInput" type="checkbox" checked>' +

            "<span>Provider Aktif</span>" +

          "</label>" +


          '<div style="display:flex;gap:10px;justify-content:flex-end;">' +

            '<button type="button" id="providerCancelButton">' +
              "Batal" +
            "</button>" +

            '<button type="button" id="providerSaveButton" class="admin-primary-btn">' +
              "Simpan Provider" +
            "</button>" +

          "</div>" +

        "</div>" +

      "</div>";
  }


  function renderEditor(provider) {

    const editor =
      $("providerEditor");

    if (!editor) {
      return;
    }

    const item =
      normalizeProvider(
        provider || {}
      );

    const editing =
      !!provider;

    state.editingId =
      editing
        ? item.id
        : null;

    createEditor();

    const title =
      $("providerEditorTitle");

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


    if (title) {

      title.textContent =
        editing
          ? "Edit Provider"
          : "Tambah Provider";
    }


    if (idInput) {

      idInput.value =
        item.id || "";

      idInput.disabled =
        editing;
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
        item.apiKey || "";
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


    editor.hidden =
      false;

    editor.scrollIntoView({
      behavior:
        "smooth",
      block:
        "start"
    });

    bindEditorEvents();
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
   * SAVE
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
        ? adapterInput.value.trim()
        : "";

    const apiKey =
      apiKeyInput
        ? apiKeyInput.value.trim()
        : "";

    const enabled =
      enabledInput
        ? !!enabledInput.checked
        : true;


    if (!id) {

      setStatus(
        "Provider ID wajib diisi.",
        "error"
      );

      return;
    }


    if (
      !/^[a-zA-Z0-9][a-zA-Z0-9_-]{1,63}$/.test(
        id
      )
    ) {

      setStatus(
        "Provider ID tidak valid.",
        "error"
      );

      return;
    }


    if (!name) {

      setStatus(
        "Nama provider wajib diisi.",
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


    const payload = {

      id,

      name,

      adapter:
        adapter.toLowerCase(),

      api_key:
        apiKey,

      config,

      enabled
    };


    const editing =
      !!state.editingId;

    const path =
      editing
        ? "/api/admin/providers/" +
          encodeURIComponent(
            state.editingId
          )
        : "/api/admin/providers";


    const method =
      editing
        ? "PUT"
        : "POST";


    const button =
      $("providerSaveButton");

    if (button) {

      button.disabled =
        true;

      button.textContent =
        "Menyimpan...";
    }


    try {

      await api(
        path,
        {
          method,

          body:
            JSON.stringify(
              payload
            )
        }
      );


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

        button.disabled =
          false;

        button.textContent =
          "Simpan Provider";
      }
    }
  }


  /* ============================================================
   * TOGGLE
   * ============================================================ */

  async function toggleProvider(id) {

    if (!id) {
      return;
    }

    const provider =
      state.providers.find(
        function (item) {

          return String(
            item.id
          ) === String(id);

        }
      );


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
          method:
            "POST",

          body:
            JSON.stringify({
              enabled
            })
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

    if (!id) {
      return;
    }


    const provider =
      state.providers.find(
        function (item) {

          return String(
            item.id
          ) === String(id);

        }
      );


    const name =
      provider &&
      provider.name
        ? provider.name
        : id;


    if (
      !window.confirm(
        'Hapus provider "' +
        name +
        '"?\n\nTindakan ini tidak dapat dibatalkan.'
      )
    ) {
      return;
    }


    try {

      await api(
        "/api/admin/providers/" +
        encodeURIComponent(id),
        {
          method:
            "DELETE"
        }
      );


      if (
        String(
          state.editingId
        ) === String(id)
      ) {

        closeEditor();
      }


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
   * FIND PROVIDER
   * ============================================================ */

  function findProvider(id) {

    return (
      state.providers.find(
        function (provider) {

          return String(
            provider.id
          ) === String(id);

        }
      ) ||
      null
    );
  }


  /* ============================================================
   * EDITOR EVENTS
   * ============================================================ */

  function bindEditorEvents() {

    const save =
      $("providerSaveButton");

    const cancel =
      $("providerCancelButton");


    if (
      save &&
      !save.dataset.bound
    ) {

      save.dataset.bound =
        "true";

      save.addEventListener(
        "click",
        function () {
          saveProvider();
        }
      );
    }


    if (
      cancel &&
      !cancel.dataset.bound
    ) {

      cancel.dataset.bound =
        "true";

      cancel.addEventListener(
        "click",
        function () {
          closeEditor();
        }
      );
    }
  }


  /* ============================================================
   * MAIN EVENTS
   * ============================================================ */

  function bindEvents() {

    const add =
      $("addProviderBtn");

    const refresh =
      $("refreshProvidersBtn");

    const back =
      $("providerBackBtn");


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


    const list =
      $("providerList");


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


          if (
            action ===
            "edit"
          ) {

            const provider =
              findProvider(id);

            if (provider) {
              renderEditor(
                provider
              );
            }

            return;
          }


          if (
            action ===
            "toggle"
          ) {

            toggleProvider(id);

            return;
          }


          if (
            action ===
            "delete"
          ) {

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


    try {

      /*
       * Tampilkan loading hanya selama proses
       * autentikasi awal.
       */
      const loading =
        $("providerLoading");

      if (loading) {
        loading.hidden =
          false;
      }


      /*
       * Ambil token secara langsung.
       */
      await getAuthToken();


      /*
       * Verifikasi admin.
       */
      await verifyAdmin();


      /*
       * Setelah lolos, tampilkan aplikasi.
       */
      bindEvents();

      showApp();


      /*
       * Muat provider.
       */
      await loadProviders();

    } catch (error) {

      console.error(
        "[GEN-Z.AI Provider] Init error:",
        error
      );


      if (
        error.status ===
        401
      ) {

        showDenied(
          "Sesi login tidak ditemukan atau sudah berakhir."
        );

      } else if (
        error.status ===
        403
      ) {

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

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      function () {
        init();
      },
      {
        once: true
      }
    );

  } else {

    init();
  }

})();
