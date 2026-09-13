/*
 * ============================================================
 * GEN-Z.AI
 * ADMIN PROVIDER MANAGEMENT
 * ============================================================
 *
 * Adapter dibuat fleksibel.
 * Admin dapat memasukkan adapter secara manual.
 *
 * Contoh:
 * veo
 * minimax
 * luma
 * kling
 * runway
 * seedance
 * adapter-provider-baru
 *
 * Implementasi adapter tetap berada di file masing-masing.
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
   * DOM HELPER
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
    el.className = "status";

    if (type) {
      el.classList.add(type);
    }
  }


  /* ============================================================
   * AUTH READY
   *
   * Jangan bergantung pada GENZ_AUTH_INITIALIZED karena flag
   * tersebut tidak dijamin tersedia.
   *
   * Provider page menggunakan window.GENZ.auth secara langsung.
   * ============================================================ */

  function authIsReady() {
    return !!(
      window.GENZ &&
      window.GENZ.auth &&
      (
        typeof window.GENZ.auth.token === "function" ||
        typeof window.GENZ.auth.getSession === "function"
      )
    );
  }


  async function waitForAuth() {
    if (authIsReady()) {
      return true;
    }

    const started = Date.now();

    while (Date.now() - started < AUTH_TIMEOUT) {
      if (authIsReady()) {
        return true;
      }

      await new Promise(function (resolve) {
        setTimeout(resolve, 100);
      });
    }

    return authIsReady();
  }


  async function getAuthToken() {
    if (!authIsReady()) {
      throw new Error(
        "Sistem autentikasi belum tersedia."
      );
    }

    if (
      typeof window.GENZ.auth.token ===
      "function"
    ) {
      const token =
        await window.GENZ.auth.token();

      if (token) {
        return token;
      }
    }

    if (
      typeof window.GENZ.auth.getSession ===
      "function"
    ) {
      const sessionResult =
        await window.GENZ.auth.getSession();

      const session =
        sessionResult &&
        sessionResult.data &&
        sessionResult.data.session
          ? sessionResult.data.session
          : sessionResult &&
              sessionResult.session
            ? sessionResult.session
            : null;

      if (
        session &&
        session.access_token
      ) {
        return session.access_token;
      }
    }

    throw new Error(
      "Sesi login tidak ditemukan."
    );
  }


  /* ============================================================
   * API
   * ============================================================ */

  async function api(path, options) {
    const opts = options || {};

    const token =
      await getAuthToken();

    const headers = Object.assign(
      {
        Accept: "application/json",
        Authorization: "Bearer " + token
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

    const timeout =
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
              controller.signal
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
        } catch {
          data = null;
        }
      } else {
        try {
          const text =
            await response.text();

          data =
            text
              ? {
                  message: text
                }
              : null;
        } catch {
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
            "Permintaan terlalu lama. Server tidak merespons."
          );

        timeoutError.status =
          408;

        throw timeoutError;
      }

      throw error;

    } finally {
      clearTimeout(timeout);
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

    const roleValidated =
      data &&
      (
        data.roleValidated === true ||
        data.role_validated === true
      );

    const isAdmin =
      data &&
      (
        data.isAdmin === true ||
        data.is_admin === true ||
        role === "admin" ||
        role === "owner"
      );

    if (
      !isAdmin ||
      roleValidated !== true
    ) {
      const error =
        new Error(
          "Akses admin diperlukan."
        );

      error.status =
        403;

      throw error;
    }

    return true;
  }


  /* ============================================================
   * UI STATE
   * ============================================================ */

  function showApp() {
    const denied =
      $("providerDenied");

    const loading =
      $("providerLoading");

    const app =
      $("providerApp");

    if (denied) {
      denied.hidden = true;
    }

    if (loading) {
      loading.hidden = true;
    }

    if (app) {
      app.hidden = false;
    }
  }


  function showDenied(message) {
    const denied =
      $("providerDenied");

    const loading =
      $("providerLoading");

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

      const messageEl =
        denied.querySelector(
          "[data-provider-denied-message]"
        );

      if (messageEl) {
        messageEl.textContent =
          message ||
          "Anda tidak memiliki akses ke halaman ini.";
      }
    }

    setStatus(
      message ||
      "Akses ditolak.",
      "error"
    );
  }


  /* ============================================================
   * NORMALIZE PROVIDER
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
        String(
          providers.length
        );
    }

    if (!providers.length) {
      list.innerHTML =
        '<div class="empty-state">' +
          "<strong>Belum ada provider.</strong>" +
          "<span>Tambahkan provider pertama untuk mulai menggunakan sistem.</span>" +
        "</div>";

      return;
    }

    list.innerHTML =
      providers
        .map(function (provider) {
          const statusClass =
            provider.enabled
              ? "enabled"
              : "disabled";

          const statusText =
            provider.enabled
              ? "Aktif"
              : "Nonaktif";

          return (
            '<div class="provider-card" data-provider-id="' +
              escapeHtml(provider.id) +
            '">' +

              '<div class="provider-info">' +

                '<div class="provider-name">' +
                  escapeHtml(
                    provider.name ||
                    provider.id
                  ) +
                "</div>" +

                '<div class="provider-meta">' +

                  "<span>ID: " +
                    escapeHtml(
                      provider.id
                    ) +
                  "</span>" +

                  "<span>Adapter: " +
                    escapeHtml(
                      provider.adapter ||
                      "-"
                    ) +
                  "</span>" +

                  '<span class="provider-status ' +
                    statusClass +
                  '">' +
                    statusText +
                  "</span>" +

                "</div>" +

              "</div>" +

              '<div class="provider-actions">' +

                '<button type="button" class="btn btn-secondary" data-action="edit" data-id="' +
                  escapeHtml(provider.id) +
                '">Edit</button>' +

                '<button type="button" class="btn btn-secondary" data-action="toggle" data-id="' +
                  escapeHtml(provider.id) +
                '">' +
                  (
                    provider.enabled
                      ? "Deactivate"
                      : "Activate"
                  ) +
                "</button>" +

                '<button type="button" class="btn btn-danger" data-action="delete" data-id="' +
                  escapeHtml(provider.id) +
                '">Delete</button>' +

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

    if (
      list &&
      !state.providers.length
    ) {
      list.innerHTML =
        '<div class="loading-state">Memuat provider...</div>';
    }

    try {
      const data =
        await api(
          "/api/admin/providers"
        );

      const providers =
        Array.isArray(data)
          ? data
          : data &&
              Array.isArray(
                data.providers
              )
            ? data.providers
            : data &&
                Array.isArray(
                  data.data
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
        "GEN-Z.AI provider load error:",
        error
      );

      if (error.status === 401) {
        showDenied(
          "Sesi login tidak valid. Silakan login kembali."
        );

      } else if (error.status === 403) {
        showDenied(
          "Akses admin ditolak."
        );

      } else {
        setStatus(
          error.message ||
          "Gagal memuat provider.",
          "error"
        );

        if (list) {
          list.innerHTML =
            '<div class="empty-state error-state">' +
              "<strong>Gagal memuat provider.</strong>" +
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
   * EDITOR
   * ============================================================ */

  function renderEditor(provider) {
    const editor =
      $("providerEditor");

    const title =
      $("providerEditorTitle");

    if (!editor) {
      return;
    }

    const isEdit =
      !!provider;

    state.editingId =
      isEdit
        ? provider.id
        : null;

    if (title) {
      title.textContent =
        isEdit
          ? "Edit Provider"
          : "Tambah Provider";
    }

    const normalized =
      normalizeProvider(
        provider || {}
      );

    editor.hidden = false;

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

    if (idInput) {
      idInput.value =
        normalized.id || "";

      idInput.disabled =
        isEdit;
    }

    if (nameInput) {
      nameInput.value =
        normalized.name || "";
    }

    /*
     * Adapter sengaja menggunakan INPUT TEXT.
     * Tidak ada daftar adapter yang dikunci di frontend.
     */
    if (adapterInput) {
      adapterInput.value =
        normalized.adapter || "";

      adapterInput.placeholder =
        "contoh: veo, minimax, luma, kling, runway, seedance";
    }

    if (apiKeyInput) {
      apiKeyInput.value =
        normalized.apiKey || "";
    }

    if (configInput) {
      try {
        configInput.value =
          JSON.stringify(
            normalized.config || {},
            null,
            2
          );
      } catch {
        configInput.value =
          "{}";
      }
    }

    if (enabledInput) {
      enabledInput.checked =
        normalized.enabled !== false;
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
      editor.hidden = true;
    }

    state.editingId = null;
  }


  /* ============================================================
   * FORM VALUE
   * ============================================================ */

  function readConfig(input) {
    const raw =
      input
        ? input.value.trim()
        : "";

    if (!raw) {
      return {};
    }

    try {
      const parsed =
        JSON.parse(raw);

      if (
        parsed === null ||
        typeof parsed !== "object" ||
        Array.isArray(parsed)
      ) {
        throw new Error(
          "Config harus berupa object JSON."
        );
      }

      return parsed;

    } catch (error) {
      throw new Error(
        "Config JSON tidak valid."
      );
    }
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

    const configInput =
      $("providerConfigInput");

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
        readConfig(
          configInput
        );
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
      adapter,
      api_key: apiKey,
      config,
      enabled
    };

    const isEdit =
      !!state.editingId;

    const path =
      isEdit
        ? "/api/admin/providers/" +
          encodeURIComponent(
            state.editingId
          )
        : "/api/admin/providers";

    const method =
      isEdit
        ? "PUT"
        : "POST";

    const saveButton =
      $("providerSaveButton");

    if (saveButton) {
      saveButton.disabled = true;
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

      setStatus(
        isEdit
          ? "Provider berhasil diperbarui."
          : "Provider berhasil ditambahkan.",
        "success"
      );

      closeEditor();

      await loadProviders();

    } catch (error) {
      console.error(
        "GEN-Z.AI provider save error:",
        error
      );

      setStatus(
        error.message ||
        "Gagal menyimpan provider.",
        "error"
      );

    } finally {
      if (saveButton) {
        saveButton.disabled = false;
      }
    }
  }


  /* ============================================================
   * TOGGLE PROVIDER
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

    const nextEnabled =
      !provider.enabled;

    try {
      await api(
        "/api/admin/providers/" +
        encodeURIComponent(id) +
        "/toggle",
        {
          method: "POST",
          body:
            JSON.stringify({
              enabled:
                nextEnabled
            })
        }
      );

      setStatus(
        nextEnabled
          ? "Provider berhasil diaktifkan."
          : "Provider berhasil dinonaktifkan.",
        "success"
      );

      await loadProviders();

    } catch (error) {
      console.error(
        "GEN-Z.AI provider toggle error:",
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
   * DELETE PROVIDER
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

    const confirmed =
      window.confirm(
        'Hapus provider "' +
        name +
        '"? Tindakan ini tidak dapat dibatalkan.'
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

      if (
        String(state.editingId) ===
        String(id)
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
        "GEN-Z.AI provider delete error:",
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
    return state.providers.find(
      function (provider) {
        return String(
          provider.id
        ) === String(id);
      }
    ) || null;
  }


  /* ============================================================
   * EVENTS
   * ============================================================ */

  function bindEvents() {
    const addButton =
      $("addProviderButton") ||
      $("addProviderBtn");

    const refreshButton =
      $("refreshProviderButton") ||
      $("refreshProvidersButton") ||
      $("refreshProviderBtn");

    const saveButton =
      $("providerSaveButton");

    const cancelButton =
      $("providerCancelButton") ||
      $("providerCancelBtn");

    if (addButton) {
      addButton.addEventListener(
        "click",
        function () {
          renderEditor(null);
        }
      );
    }

    if (refreshButton) {
      refreshButton.addEventListener(
        "click",
        function () {
          loadProviders();
        }
      );
    }

    if (saveButton) {
      saveButton.addEventListener(
        "click",
        function () {
          saveProvider();
        }
      );
    }

    if (cancelButton) {
      cancelButton.addEventListener(
        "click",
        function () {
          closeEditor();
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

    state.initialized = true;

    const loading =
      $("providerLoading");

    if (loading) {
      loading.hidden = false;
    }

    try {
      /*
       * Tunggu object auth yang benar-benar digunakan.
       * Tidak lagi menunggu GENZ_AUTH_INITIALIZED.
       */
      const authReady =
        await waitForAuth();

      if (!authReady) {
        throw new Error(
          "Sistem autentikasi belum siap."
        );
      }

      await verifyAdmin();

      bindEvents();

      showApp();

      await loadProviders();

    } catch (error) {
      console.error(
        "GEN-Z.AI provider initialization error:",
        error
      );

      if (error.status === 401) {
        showDenied(
          "Sesi login tidak valid. Silakan login kembali."
        );

      } else if (error.status === 403) {
        showDenied(
          "Akses admin ditolak."
        );

      } else {
        showDenied(
          error.message ||
          "Gagal memuat halaman Provider."
        );
      }
    }
  }


  /* ============================================================
   * PUBLIC BRIDGE
   * ============================================================ */

  window.GENZ_ADMIN_PROVIDERS = {
    init,
    load: loadProviders,
    refresh: loadProviders,
    getState: function () {
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
   * START
   * ============================================================ */

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
